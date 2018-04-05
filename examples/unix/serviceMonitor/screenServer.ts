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
    let rows: string[][] = [];

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
        rows.push([`[${eps}]`, podName]);
      });

    [...danglingPods]
      .sort((name1, name2) => name1.localeCompare(name2))
      .forEach(podName => {
        rows.push(["", podName]);
      });

    [...danglingEndpoints]
      .sort((name1, name2) => name1.localeCompare(name2))
      .forEach(podName => {
        rows.push([`${podName} (does not exist)`, ""]);
      })

    return rows;
  }
}

// --------------------------------------------------------------------------
// Screen implementation.
// --------------------------------------------------------------------------

var blessed = require('blessed')
, contrib = require('blessed-contrib')
, screen = blessed.screen();

screen.key(['escape', 'q', 'C-c'], function(/*ch: any, key: any*/) {
  serviceMenu.destroy();
  mainMenu.destroy();
  screen.destroy();
  return process.exit(0);
});

// --------------------------------------------------------------------------
// Main menu.
// --------------------------------------------------------------------------

namespace mainMenu {
  const table = contrib.table(
    { keys: true
    , fg: 'white'
    , selectedFg: 'white'
    , selectedBg: 'blue'
    , interactive: true
    , label: 'Service Monitor'
    , width: 80
    , height: '100%'
    , border: {type: "line", fg: "cyan"}
    , columnSpacing: 3 //in chars
    , columnWidth: [80-"status".length-10, "status".length+3] /*in chars*/

    , vi: true });

  table.rows.on('select', (item: any, /*index: any*/) => {
    const name = (<string>item.getText()).trim();
    serviceMenu.focus(name);
    screen.render();
  });

  export const focus = () => {
    screen.append(table); //must append before setting data

    //allow control the table with the keyboard
    table.focus();
  }

  export const setData = (data: string[][]) => {
    table.setData(
      { headers: ['Service name', 'Status']
      , data: data });

    screen.render();
  }

  export const destroy = () => { table.destroy(); }
}

// --------------------------------------------------------------------------
// Service menu.
// --------------------------------------------------------------------------

namespace serviceMenu {
  const serviceMenus = new Map<string, any>();

  export const getServiceMenu = (key: string) => {
    let table = null;
    if ((table = serviceMenus.get(key)) == null) {
      table = contrib.table(
        { keys: true
        , fg: 'white'
        , selectedFg: 'white'
        , selectedBg: 'blue'
        , interactive: true
        , width: 80
        , height: '100%'
        , border: {type: "line", fg: "cyan"}
        , columnSpacing: 3 //in chars
        , columnWidth: [40, 40] /*in chars*/

        , vi: true });

      serviceMenus.set(key, table);

      table.setLabel(key);
    }

    let summary = summaries.get(key);
    return {table, summary};
  }

  export const focus = (key: string) => {
    const {table, summary} = getServiceMenu(key);

    screen.append(table); //must append before setting data

    const rendered = summary == null
      ? []
      : summary.render();

    setData(key, rendered);

    //allow control the table with the keyboard
    table.focus();
  }

  export const setData = (key: string, data: string[][]) => {
    const {table, summary} = getServiceMenu(key);
    table.setData(
      { headers: ['Endpoints', 'Pod name']
      , data: data });

    screen.render();
  }

  export const destroy = () => {
    serviceMenus.forEach((table,) => table.destroy())
  }
}

// --------------------------------------------------------------------------
// Init main menu.
// --------------------------------------------------------------------------

mainMenu.focus();

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

    // Main menu update.
    {
      const rows: string[][] = [];
      const mainMenuServiceSummaryData = [...summaries]
        .sort(([name1], [name2]) => name1.localeCompare(name2))
        .map(([name]) => [name]);

      mainMenu.setData(mainMenuServiceSummaryData);
    }

    // Service menu update.
    {
      const summary = summaries.get(key);
      if (summary != null) {
        serviceMenu.setData(key, summary.render());
      }
    }

    screen.render();
  })