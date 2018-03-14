import {client, query} from "../../../src";
import * as carbon from "../../../src";
const jsondiff = require("jsondiffpatch");

const c = client.Client.fromFile(<string>process.env.KUBECONFIG);
const history = c.apps.v1beta1.Deployment
  .list()
  // Get last two rollouts in the history of the `nginx` deployment.
  .filter(d => d.metadata.name == "nginx")
  .flatMap(d =>
    carbon.apps.v1beta1.deployment
      .getRevisionHistory(c, d)
      .takeLast(2)
      .toArray());

// Diff these rollouts, print.
history.forEach(rollout => {
  jsondiff.console.log(jsondiff.diff(rollout[0], rollout[1]))
});
