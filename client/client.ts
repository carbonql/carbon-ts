import * as k8s from '@kubernetes/client-node';
import { List } from 'linqts';

//
// Get client.
//
const client = k8s.Config.defaultClient();
client.listNamespacedPod('default')
  .then((res) => {
    const pods = new List<k8s.V1Pod>(res.body.items)
      .Where((pod: k8s.V1Pod) => pod.metadata.labels["app"] === "nginx")
      .ForEach((pod: k8s.V1Pod) => {
        console.log(pod.metadata.name);
        console.log("  " + pod.status.phase);
      });
  })
  .catch(err => {
    console.log(JSON.stringify(err, null, "  "));
  });

// const client = client.fromKubeConfig();
// const pods =
//   FROM
