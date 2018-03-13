// import {merge, core, apps} from '../../src';
// const container = core.v1.container,
//       depl = apps.v1beta2.deployment,
//       pod = core.v1.pod,
//       pv = core.v1.persistentVolume,
//       service = core.v1.service;

import {client} from "../../src";
import * as carbon from "../../src";

//
// Get logs in all pods in the `default` namespace, group them according to the
// pod they belong to.
//

const c = client.Client.fromFile(<string>process.env.KUBECONFIG);
const podLogs = c.core.v1.Pod
  .list("default")
  // Retrieve logs for all pods, filter for logs with `ERROR:`.
  .flatMap(pod =>
    carbon.core.v1.pod
      .getLogs(c, pod)
      .filter(({logs}) => logs.includes("ERROR:"))
    )
  // Group logs by name, but returns only the `logs` member.
  .groupBy(
    ({pod}) => pod.metadata.name,
    ({logs}) => logs)

//
// Outputs all logs for pods that contain the string `ERROR:`. Something like:
//
// nginx-6f8cf9fbc4-qnrhb
// ERROR: could not connect to database.
//
// nginx2-687c5bbccd-rzjl5
// ERROR: 500
//

podLogs.subscribe(logs => {
  // Print all the name of the pod and its logs.
  console.log(logs.key);
  logs.forEach(console.log)
});
