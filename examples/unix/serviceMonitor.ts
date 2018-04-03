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
    public eventType: string,
    public readonly podName: string,
    public readonly ports: k8s.IoK8sApiCoreV1EndpointPort[],

  ) {}
}

const isEndpointsUpdate = (u: Update): u is EndpointsUpdate =>
  u.kind == "EndpointsUpdate";

// --------------------------------------------------------------------------
// Server implementation.
// --------------------------------------------------------------------------

var blessed = require('blessed');
var sc = new blessed.Screen;

// Quit on Escape, q, or Control-C.
sc.key(['escape', 'q', 'C-c'], function() {
  return process.exit(0);
});

class Summary {
  public static readonly header = ["Service name", "Endpoints", "Pods"];
  private _service: k8s.IoK8sApiCoreV1Service | null = null;
  private _pods: k8s.IoK8sApiCoreV1Pod[] = [];
  private _endpoints: string[] = [];

  constructor() {}

  public setService(service: k8s.IoK8sApiCoreV1Service) {
    this._service = service;
  }

  public setPods(pods: k8s.IoK8sApiCoreV1Pod[]) {
    this._pods = pods;
  }

  public render(): string[][] {
    if (this._service == null) {
      return [Summary.header];
    }

    let rows = [
      Summary.header,
      [`${this._service.metadata.namespace}/${this._service.metadata.name}`, ""],
    ];

    this._pods
      .sort((p1, p2) => p1.metadata.name.localeCompare(p2.metadata.name))
      .forEach(pod => {
        rows.push(["", pod.metadata.name]);
      })

    return rows;
  }
}

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
      summary.setPods(Array.from(update.pods.values()));
    } else if (isEndpointsUpdate(update)) {
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
      .do(({currentPodUpdate, pods}) =>
        serverStream.next(new TargetedPodsUpdate(currentPodUpdate, pods)))
  })
  .flatMap(({service}) =>
    // Verify that service endpoint objects were created and target the pods.
    c.core.v1.Endpoints
      .watch(service.metadata.namespace)
      .filter(({object: endpoints}) => endpoints.metadata.name == service.metadata.name)
      .switchMap(({object: endpoints, type}) => {
        const subsets = endpoints.subsets == null ? [] : endpoints.subsets;
        // NOTE: It's very important this query go inside this `switchMap`. If
        // it doesn't, the `reduce` below is unbounded and will never return.
        return query.Observable
          .of(...subsets)
          .flatMap(({addresses, ports}) =>
            query.Observable
              .of(...addresses)
              .flatMap(address => [{address, ports}]))
          .groupBy(({address}) => address.targetRef.name)
          .flatMap(addressGroup =>
            addressGroup
              .reduce((acc: k8s.IoK8sApiCoreV1EndpointPort[], {ports}) => acc.concat(ports), [])
              .flatMap(ports => {
                return [{podName: addressGroup.key, type,ports}];
              }))
      })
      .do(({podName, type, ports}) =>
        serverStream.next(new EndpointsUpdate(type, podName, ports))))
  // Find DNS settings.
  .forEach(_ => {})
