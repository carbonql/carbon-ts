// import {merge, core, apps} from '../../src';
// const container = core.v1.container,
//       depl = apps.v1beta2.deployment,
//       pod = core.v1.pod,
//       pv = core.v1.persistentVolume,
//       service = core.v1.service;

import {client} from "../../src";

//
// Get a snapshot of all logs in the `default` namespace, and then group them by
// name of pod they're coming from.
//

const c = client.Client.fromFile(process.env.KUBECONFIG);
c.core.v1.Pod
  // Get all pods.
  .list("default")
  // Retrieve logs for all pods, keeping the name as we do it.
  .flatMap(pod =>
    c.core.v1.Pod
      .logs(pod.metadata.name, pod.metadata.namespace)
      .map(logs => {
        return {name: pod.metadata.name, logs}
      }))
  // Group logs by name, but returns only the `logs` member.
  .groupBy(
    ({name}) => name,
    ({logs}) => logs)
  .subscribe(o => {
    console.log(o.key);
    o.forEach(console.log)
  });

//
// This is equivalent to:
//

// const logs =
//   FROM pod IN c.core.v1.pod.list("default")
//   FROM logs IN c.core.v1.pod.logs(pod.metadata.name, pod.metadata.namespace)
//   GROUP {logs: logs, name: pod.metadata.name} BY pod.metadata.name;

// logs.subscribe(o => {
//   console.log(o.key);
//   o.forEach(console.log)
// });
