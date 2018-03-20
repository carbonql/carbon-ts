import {Client, query, transform} from "../../src";
const jsondiff = require("jsondiffpatch");

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const history = c.apps.v1beta1.Deployment
  .list()
  .filter(d => d.metadata.name == "nginx")
  .flatMap(d =>
    transform.apps.v1beta1.deployment
      .getRevisionHistory(c, d)
      .takeLast(2)
      .toArray());

history.forEach(rollout => {
  jsondiff.console.log(jsondiff.diff(rollout[0], rollout[1]))
});

// Equivalent to:
//
// const c = Client.fromFile(<string>process.env.KUBECONFIG);
// const history =
//   // For each Deployment...
//   from d in c.apps.v1beta1.Deployment.list()
//   // ...get all ReplicaSets that are owned by it
//   let rss =
//       (from rs in c.extensions.v1beta1.ReplicaSet.list()
//       where
//           (from ownerRef in rs.metadata.ownerReferences
//           where ownerRef.name == d.metadata.name
//           select ownerRef).Count() > 0
//       orderby rs.metadata.annotations["deployment.kubernetes.io/revision"]
//       select rs)
//   // ... and take the two that are last chronologically.
//   from rs in rss.TakeLast(2)
//   select rs;

// history.forEach(rollout => {
//   jsondiff.console.log(jsondiff.diff(rollout[0], rollout[1]))
// });
