import * as ast from './ast/ast';
import * as k8s from '@kubernetes/client-node';
import { V1Pod } from '@kubernetes/client-node';
import { List } from 'linqts';
import * as request from 'request';

// //
// // Get client.
// //
// var client = k8s.Config.defaultClient();
// client.listNamespacedPod('default')
//   .then((res) => {
//     const pods = new List<V1Pod>(res.body.items)
//       .Where((pod: V1Pod) => pod.metadata.labels["app"] === "nginx")
//       .ForEach((pod: V1Pod) => {
//         console.log(pod.metadata.name);
//         console.log("  " + pod.status.phase);
//       });
//   })
//   .catch(err => {
//     console.log(JSON.stringify(err, null, "  "));
//   });

const f = x => { "bar"; return "baz"; };
const node = ast.parse(f.toString());

const str = JSON.stringify(node, null, "  ");
console.log(str);

request.post(
    'http://localhost:9090/api/v1.0/query',
    {json: node},
    function (error, response, body) {
      console.log("foo");
      if (error) {
        console.log("ERROR")
        console.log(error);
      } else if (response.statusCode !== 200) {
        console.log(response.statusCode);
      } else {
        console.log(response.body);
      }
    }
);
