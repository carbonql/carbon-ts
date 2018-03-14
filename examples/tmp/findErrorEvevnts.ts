import {client, query} from "../../src";

//
// Find all events that are either warnings or errors, grouped by the `kind`
// that caused them.
//

const c = client.Client.fromFile(<string>process.env.KUBECONFIG);

const warningsAndErrors = c.core.v1.Event
  .list()
  .filter(e => e.type == "Warning" || e.type == "Error")
  .groupBy(e => e.involvedObject.kind);

//
// Print the events. Something like:
//
//   kind: Node
//     Warning	(561 times)	minikube	Failed to start node healthz on 0: listen tcp: address 0: missing port in address
//   kind: Pod
//     Warning	(924 times)	mysql-5-66f5b49b8f-5r48g	Back-off restarting failed container
//     Warning	(925 times)	mysql-8-7d4f8d46d7-hrktb	Back-off restarting failed container
//     Warning	(913 times)	mysql-859645bdb9-w29z7	Back-off restarting failed container
//
warningsAndErrors.forEach(events => {
  console.log(`kind: ${events.key}`);
  events.forEach(e =>
    console.log(`  ${e.type}\t(x${e.count})\t${e.involvedObject.name}\n    Message: ${e.message}`));
});
