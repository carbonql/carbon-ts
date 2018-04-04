#!/usr/bin/env node

import {Client, WatchEvent, transform, syncQuery, query, k8s} from "../../src";
const certificates = transform.certificates;

// --------------------------------------------------------------------------
// Server API.
// --------------------------------------------------------------------------

type UpdateKind = "ServiceUpdate" | "TargetedPodsUpdate" | "EndpointsUpdate";

interface Update {
  readonly kind: UpdateKind;
}

class ServiceUpdate implements Update {
  readonly kind: UpdateKind = "ServiceUpdate";
  constructor(
    public readonly eventType: string,
    public readonly service: k8s.IoK8sApiCoreV1Service,
  ) {}
}

const isServiceUpdate = (u: Update): u is ServiceUpdate =>
  u.kind == "ServiceUpdate";

class TargetedPodsUpdate implements Update {
  readonly kind: UpdateKind = "TargetedPodsUpdate";
  constructor(
    public readonly update: WatchEvent<k8s.IoK8sApiCoreV1Pod>,
    public readonly pods: Map<string, k8s.IoK8sApiCoreV1Pod>,
  ) {}
}

const isTargetedPodsUpdate = (u: Update): u is TargetedPodsUpdate =>
  u.kind == "TargetedPodsUpdate";

class EndpointsUpdate implements Update {
  readonly kind: UpdateKind = "EndpointsUpdate";
  constructor(
    public readonly endpoints: Map<string, k8s.IoK8sApiCoreV1EndpointPort[]>
  ) {}
}

const isEndpointsUpdate = (u: Update): u is EndpointsUpdate =>
  u.kind == "EndpointsUpdate";

// --------------------------------------------------------------------------
// Server implementation.
// --------------------------------------------------------------------------

class Summary {
  public static readonly header = ["Service name", "Endpoints", "Pods"];
  private _service: k8s.IoK8sApiCoreV1Service | null = null;
  private _pods: Map<string, k8s.IoK8sApiCoreV1Pod> = new Map();
  private _endpoints: Map<string, k8s.IoK8sApiCoreV1EndpointPort[]> = new Map();

  constructor() {}

  public setService(service: k8s.IoK8sApiCoreV1Service) {
    this._service = service;
  }

  public setPods(pods: Map<string, k8s.IoK8sApiCoreV1Pod>) {
    this._pods = pods;
  }

  public setEndpoints(endpoints: Map<string, k8s.IoK8sApiCoreV1EndpointPort[]>) {
    this._endpoints = endpoints;
  }

  public render(): string[][] {
    if (this._service == null) {
      return [Summary.header];
    }

    let rows = [
      Summary.header,
      [`${this._service.metadata.namespace}/${this._service.metadata.name}`, "", ""],
    ];

    const podNames = new Set([...this._pods].map(([_, pod]) => pod.metadata.name));
    const endpointTargets = new Set([...this._endpoints].map(([podName]) => podName));

    // Break endpoints into three groups: (1) endpoints that refer to a pod that
    // exists, (2) endpoints that refer to a pod that does not exist, and (3)
    // pods with no endpoints that reference it.

    const matchedPods = new Set(
      [...podNames].filter(podName => endpointTargets.has(podName)));

    const danglingPods = new Set(
      [...podNames].filter(podName => !endpointTargets.has(podName)));

    const danglingEndpoints = new Set(
      [...endpointTargets].filter(target => !podNames.has(target)));

    matchedPods.forEach(podName => {
      const eps = (this._endpoints.get(podName) || [])
        .map(ep => ep.port)
        .join(",");
      rows.push(["", `[${eps}]`, podName]);
    });

    danglingPods.forEach(podName => {
      rows.push(["", "", podName]);
    });

    danglingEndpoints.forEach(podName => {
      rows.push(["", `${podName} (does not exist)`, ""]);
    })

    return rows;
  }
}

var blessed = require('blessed');
var sc = new blessed.Screen;

// Quit on Escape, q, or Control-C.
sc.key(['escape', 'q', 'C-c'], function() {
  return process.exit(0);
});

// Create a table
var table = blessed.listtable({
  parent: sc,
  left: 0,
  data: [Summary.header],
  border: 'line',
  align: 'center',
  keys: true,
  width: '100%',
  height: '100%',
  vi: false,
  name:'table'
});

// Focus table, and render results to screen
table.focus();
sc.render();

const serverStream = new query.Subject<Update>();
const summary = new Summary()
serverStream
  .forEach(update => {
    if (isServiceUpdate(update)) {
      summary.setService(update.service);
    } else if (isTargetedPodsUpdate(update)) {
      summary.setPods(update.pods);
    } else if (isEndpointsUpdate(update)) {
      summary.setEndpoints(update.endpoints);
    }

    table.setRows(summary.render());
    sc.render();
  })

// --------------------------------------------------------------------------
// Application logic.
// --------------------------------------------------------------------------

const namespace = "default";
const name = "nginx";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
c.core.v1.Service
  .watch(namespace)
  .filter(update => update.object.metadata.name == name)
  .do(({type, object: service}) => serverStream.next(new ServiceUpdate(type, service)))
  .flatMap(({object: service}) => {
    // Find pods that the service targets.
    return transform.core.v1.service
      .watchTargetedPods(c, service)
      .switchMap(update => query.Observable.of({service, ...update}))
      // .do(({pods}) => console.log([...pods].map(([podName]) => podName)))
      .do(({currentPodUpdate, pods}) =>
        serverStream.next(new TargetedPodsUpdate(currentPodUpdate, pods)))
  })
  .flatMap(({service}) => {
    // Verify that service endpoint objects were created and target the pods.
    return transform.core.v1.service
      .watchEndpointsByPod(c, service)
      .switchMap(({endpoints}) => query.Observable.of({service, endpoints}))
      .do(({endpoints}) => serverStream.next(new EndpointsUpdate(endpoints)))
  })
  // Evaluate container status for each pod.
  // Find DNS settings.
  .forEach(_ => {})
