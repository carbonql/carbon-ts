import {client, query} from "./index";
import * as k8s from '@hausdorff/client-node';

//
// Retrieve pods running on a node where memory pressure is high.
//

const c = client.Client.fromFile(process.env.KUBECONFIG);
c.core.v1.Pod.list()
  // Make pods a set by name.
  .reduce(
    (podAcc, pod) => {
      podAcc[pod.spec.nodeName] = pod
      return podAcc;
    },
    {})
  .subscribe(pods => {
    // Find nodes with `MemoryPressure` set to "True".
    c.core.v1.Node.list()
      .filter(n => {
        const pressure = n.status.conditions
          .filter(c => c.type === "MemoryPressure" && c.status === "True");
        return pressure.length >= 1;
      })
      // Return pods for which this is true.
      .subscribe(n => {
        console.log(pods[n.metadata.name]);
      });
  });

// FROM pod IN c.core.v1.pod.list()
// JOIN node IN c.core.v1.node.list() ON pod.spec.nodeName EQUALS node.metadata.name
// WHERE node.status.conditions
//   .filter(c => c.type === "MemoryPressure" && c.status === "False").length >= 1
// SELECT pod

