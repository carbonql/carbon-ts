import {client, query} from "../../src";
import * as carbon from "../../src";
import * as syncQuery from 'linq';
import * as k8s from '@hausdorff/client-node';

//
// List the history of a deployment called "nginx".
//

const c = client.Client.fromFile(<string>process.env.KUBECONFIG);
const history = c.apps.v1beta1.Deployment
  .list("default")
  .filter(d => d.metadata.name == "nginx")
  .flatMap(d => carbon.apps.v1beta2.deployment.getRevisionHistory(c, d));

//
// Outputs a list of deployments and the times they were updated:
//
//   nginx
//       2018-02-28T20:15:32Z
//

history.forEach(({deployment, history}) => {
  console.log(`${deployment.metadata.name}`);
  history.forEach(rs => {
    console.log(`    ${rs.metadata.creationTimestamp}`);
  });
});
