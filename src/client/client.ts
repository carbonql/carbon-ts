import * as k8s from '@kubernetes/client-node';
import { List } from 'linqts';

//
// Get client.
//
const client = k8s.Config.defaultClient();
client.listNamespacedPod('default')
  .then((res) => {
    const pods = new List<k8s.V1Pod>(res.body.items)
      // .Where((pod: k8s.V1Pod) => pod.metadata.labels["app"] === "nginx")
      .ForEach((pod: k8s.V1Pod) => {
        console.log(pod.metadata.name);
        console.log("  " + pod.status.phase);
      });
  })
  .catch(err => {
    console.log(JSON.stringify(err, null, "  "));
  });

let kc = new k8s.KubeConfig();
kc.loadFromFile(process.env.KUBECONFIG);
const apps = new k8s.Apps_v1beta1Api(kc.getCurrentCluster()['server']);
apps.setDefaultAuthentication(kc);

// apps.listNamespacedDeployment("default")
//   .then(res => {
//     res.body.items.forEach(item => {
//       console.log(JSON.stringify(item, undefined, "  "));
//     })
//   })
//   .catch(err => {
//     console.log(JSON.stringify(err, undefined, "  "))
//   });

const exts = new k8s.Extensions_v1beta1Api(kc.getCurrentCluster()['server']);
exts.setDefaultAuthentication(kc);

exts.listNamespacedReplicaSet("default")
  .then(res => {
    res.body.items.forEach(item => {
      console.log(JSON.stringify(item, undefined, "  "));
    });
  })
  .catch(err => {
    console.log(JSON.stringify(err, undefined, "  "))
  });

// const client = client.fromKubeConfig();
// const pods =
//   FROM
