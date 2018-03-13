import {client, query} from "../../src";
import * as carbon from "../../src";
const jsondiff = require("jsondiffpatch");

//
// List the history of a deployment called "nginx".
//

const c = client.Client.fromFile(<string>process.env.KUBECONFIG);
const history = c.apps.v1beta1.Deployment
  .list("default")
  .filter(d => d.metadata.name == "nginx")
  .flatMap(d =>
    carbon.apps.v1beta2.deployment
      .getRevisionHistory(c, d)
      .takeLast(2)
      .toArray());

//
// Diffs the last two deployment rollouts.
//

history.forEach(history => {
  jsondiff.console.log(jsondiff.diff(history[0], history[1]))
});
