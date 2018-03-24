#!/usr/bin/env node

import {Client, query, k8s} from "../../src";
import * as syncQuery from 'linq';
const tab = require("tab");


// --------------------------------------------------------------------------
// Helpers.
// --------------------------------------------------------------------------

const getState = (status: k8s.IoK8sKubernetesPkgApiV1ContainerStatus) => {
  let state = "unknown";
  if (status.state.running)         state = "running";
  else if (status.state.terminated) state = "terminated";
  else                              state = status.state.waiting.reason;
  return state;
}

// --------------------------------------------------------------------------
// Get all containers and all conatiner statuses.
// --------------------------------------------------------------------------

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const currNs = c.kubeConfig.getCurrentContextObject().namespace || "default";
const podSummaries = c.core.v1.Pod
  .list(currNs)
  .flatMap(pod => {
    const statuses = syncQuery
      .from(pod.status.containerStatuses)
      .toDictionary(status => status.name, status => status);

    // Join containers and container statuses on the name of the container.
    const joined = syncQuery
      .from(pod.spec.containers)
      .select(container => {
        return {
          container,
          status: statuses.get(container.name),
        };
      });

    // Return summary of Pod.
    return [{
      pod: pod,
      containers: joined.toArray(),
    }];
  })
  // Convert each Pod summary into a row that can be printed with the `tab`
  // library.
  .map(summary => {
    return {
      pod: summary.pod,
      containers: summary.containers.map(({container, status}) => {
        const ports = container.ports
          ? `[${container.ports.map(p => p.containerPort).join(",")}]`
          : "[]";

        return {
          IMAGE: container.image,
          STATE: getState(status),
          RESTARTS: status.restartCount,
          CREATED: status.ready,
          PORTS: ports,
          COMMAND: container.command ? container.command : "",
        };
      }),
    };
  })
  // Aggregate all rows into an array, erroring out if there's more than one
  // table to emit
  .toArray()
  .single();

// --------------------------------------------------------------------------
// Print output.
// --------------------------------------------------------------------------

podSummaries
  // Order by pod name.
  .flatMap(summaries =>
    syncQuery
      .from(summaries)
      .orderBy(summary => `${summary.pod.metadata.namespace}/${summary.pod.metadata.name}`)
      .toArray())
  // Emit table.
  .subscribe(summary => {
    // Declare schema for container output table.
    const containerColumns = [
      {
        width: 4,
      }, {
        label: 'IMAGE',
        width: syncQuery
          .from(summary.containers)
          .max(c => c.IMAGE.length) + 1,
      }, {
        label: 'STATE',
        align: 'left',
        width: "CrashLoopBackOff".length
      }, {
        label: 'RESTARTS',
        align: 'left',
        width: 10,
      }, {
        label: 'CREATED',
        align: 'left',
        width: 12
      }, {
        label: 'PORTS',
        align: 'left',
        width: syncQuery
          .from(summary.containers)
          .max(c => c.PORTS.length) + 1,
      }, {
        label: 'COMMAND'
      }
    ];

    console.log("==========================================================");
    console.log(`Pod ID: ${summary.pod.metadata.namespace}/${summary.pod.metadata.name}`);

    console.log("Containers:");

    tab.emitTable({
      columns: containerColumns,
      rows: summary.containers,
    });
    console.log();
  });
