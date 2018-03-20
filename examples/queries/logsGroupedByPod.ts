import {Client, transform} from "../../src";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const podLogs = c.core.v1.Pod
  .list("default")
  // Retrieve logs for all pods, filter for logs with `ERROR:`.
  .flatMap(pod =>
    transform.core.v1.pod
      .getLogs(c, pod)
      .filter(({logs}) => logs.toLowerCase().includes("error:")));

podLogs.subscribe(({pod, logs}) => {
  // Print all the name of the pod and its logs.
  console.log(pod.metadata.name);
  console.log(logs);
});

// Equivalent to:
//
// const c = Client.fromFile(<string>process.env.KUBECONFIG);
// const podLogs =
//   // Get pods in `default` namespace.
//   from pod in c.core.v1.Pod.list("default")
//   // Find logs that include the string "error:".
//   let logs = c.core.v1.Pod.logs(pod.metadata.name, pod.metadata.ns)
//   where logs.toLowerCase().includes("error:")
//   select new{pod = pod, logs = logs};

// podLogs.subscribe(({pod, logs}) => {
//   // Print all the name of the pod and its logs.
//   console.log(pod.metadata.name);
//   console.log(logs);
// });