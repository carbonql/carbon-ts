import * as k8s from '@kubernetes/client-node';
import { List } from 'linqts';
import { V1Pod } from '@kubernetes/client-node';

var client = k8s.Config.defaultClient();

client.listNamespacedPod('default')
    .then((res) => {
      const pods = new List<V1Pod>(res.body.items)
        .Where((pod: V1Pod) => pod.metadata.labels["app"] === "nginx")
        .ForEach((pod: V1Pod) => {
          console.log(pod.metadata.name);
          console.log("  " + pod.status.phase);
        });
      // console.log(JSON.stringify(res.body, null, "  "));
    })
    .catch(err => {
      console.log(JSON.stringify(err, null, "  "));
    });
