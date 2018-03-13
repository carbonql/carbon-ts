import {client, query} from "../../src";
import * as carbon from "../../src";
const jsondiff = require("jsondiffpatch");

//
// Diff the last two rollouts in a deployment's history.
//

const c = client.Client.fromFile(<string>process.env.KUBECONFIG);
const history = c.apps.v1beta1.Deployment
  .list()
  .filter(d => d.metadata.name == "nginx")
  .flatMap(d =>
    carbon.apps.v1beta1.deployment
      .getRevisionHistory(c, d)
      .takeLast(2)
      .toArray());

//
// Diffs the last two deployment rollouts.
//

history.forEach(rollout => {
  jsondiff.console.log(jsondiff.diff(rollout[0], rollout[1]))
});
