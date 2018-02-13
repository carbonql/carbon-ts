import * as ast from './ast/ast';
import * as client from './client/client';
import * as bind from './client/bind';
import * as k8s from '@kubernetes/client-node';
import { V1Pod } from '@kubernetes/client-node';
import { List } from 'linqts';
import * as request from 'request';

const deplName = "nginx-deployment";

const resources =
  new List([
    client.deployment(deplName, "nginx", <k8s.V1ContainerPort>{containerPort: 80})
  ])
  .SelectMany(bind.Deployment.expose(deplName, 80));

// const s = client.service("nginx", {app: "nginx"}, <k8s.V1ServicePort>{
//   "protocol": "TCP",
//   "port": 80,
//   "targetPort": 9376
// });
// console.log(JSON.stringify(s, null, "  "));

// const f = x => { "bar"; return "baz"; };
// const node = ast.parse(f.toString());

// const str = JSON.stringify(node, null, "  ");
// console.log(str);

// request.post(
//     'http://localhost:9090/api/v1.0/query',
//     {json: node},
//     function (error, response, body) {
//       console.log("foo");
//       if (error) {
//         console.log("ERROR")
//         console.log(error);
//       } else if (response.statusCode !== 200) {
//         console.log(response.statusCode);
//       } else {
//         console.log(response.body);
//       }
//     }
// );
