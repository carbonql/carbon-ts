import {WatchEvent, query, k8s} from "../../../src";
import * as api from "./api";

// --------------------------------------------------------------------------
// Server implementation.
// --------------------------------------------------------------------------

class ServiceSummary {
  public static readonly header = ["Service name", "Endpoints", "Pods"];
  private _pods: Map<string, k8s.IoK8sApiCoreV1Pod> = new Map();
  private _endpoints: Map<string, k8s.IoK8sApiCoreV1EndpointPort[]> = new Map();

  constructor(private readonly _service: k8s.IoK8sApiCoreV1Service) {}

  public setPods(pods: Map<string, k8s.IoK8sApiCoreV1Pod>) {
    this._pods = pods;
  }

  public setEndpoints(endpoints: Map<string, k8s.IoK8sApiCoreV1EndpointPort[]>) {
    this._endpoints = endpoints;
  }

  public render(): string[][] {
    let rows = [
      [`${this._service.metadata.namespace}/${this._service.metadata.name}`, "", ""],
    ];

    const podNames = new Set([...this._pods].map(([_, pod]) => pod.metadata.name));
    const endpointTargets = new Set([...this._endpoints].map(([podName]) => podName));

    // Break endpoints into three groups: (1) endpoints that refer to a pod that
    // exists, (2) endpoints that refer to a pod that does not exist, and (3)
    // pods with no endpoints that reference it.

    const matchedPods = new Set(
      [...podNames]
        .filter(podName => endpointTargets.has(podName)));

    const danglingPods = new Set(
      [...podNames].filter(podName => !endpointTargets.has(podName)));

    const danglingEndpoints = new Set(
      [...endpointTargets].filter(target => !podNames.has(target)));

    [...matchedPods]
      .sort((name1, name2) => name1.localeCompare(name2))
      .forEach(podName => {
        const eps = (this._endpoints.get(podName) || [])
          .map(ep => ep.port)
          .join(",");
        rows.push(["", `[${eps}]`, podName]);
      });

    [...danglingPods]
      .sort((name1, name2) => name1.localeCompare(name2))
      .forEach(podName => {
        rows.push(["", "", podName]);
      });

    [...danglingEndpoints]
      .sort((name1, name2) => name1.localeCompare(name2))
      .forEach(podName => {
        rows.push(["", `${podName} (does not exist)`, ""]);
      })

    return rows;
  }
}

// --------------------------------------------------------------------------
// Screen implementation.
// --------------------------------------------------------------------------

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
  data: [ServiceSummary.header],
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

// --------------------------------------------------------------------------
// Start server stream.
// --------------------------------------------------------------------------

export const stream = new query.Subject<api.Update>();
const summaries = new Map<string, ServiceSummary>();
stream
  .forEach(update => {
    const key = `${update.service.metadata.namespace}/${update.service.metadata.name}`;
    if (api.isServiceUpdate(update)) {
      switch (update.eventType) {
        case "ADDED":
        case "MODIFIED":
          summaries.set(key, new ServiceSummary(update.service));
          break;
        default:
          summaries.delete(key);
      }
    } else if (api.isTargetedPodsUpdate(update)) {
      const summary = summaries.has(key)
        ? <ServiceSummary>summaries.get(key)
        : new ServiceSummary(update.service);
      summary.setPods(update.pods);
    } else if (api.isEndpointsUpdate(update)) {
      const summary = summaries.has(key)
        ? <ServiceSummary>summaries.get(key)
        : new ServiceSummary(update.service);
      summary.setEndpoints(update.endpoints);
    }

    const rows = [ServiceSummary.header];

    [...summaries]
      .sort(([name1], [name2]) => name1.localeCompare(name2))
      .forEach(([_, summary]) => {
        const sumRows = summary.render();
        if (sumRows.length == 1) {
          sumRows[0][1] = "[NONE]";
          sumRows[0][2] = "[NONE]";
        }
        rows.push(...sumRows);
      })

    table.setRows(rows);
    sc.render();
  })