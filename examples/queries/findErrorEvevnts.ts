import {Client, query} from "../../src";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const warningsAndErrors = c.core.v1.Event
  .list()
  .filter(e => e.type == "Warning" || e.type == "Error")
  .groupBy(e => e.involvedObject.kind);

warningsAndErrors.forEach(events => {
  console.log(`kind: ${events.key}`);
  events.forEach(e =>
    console.log(`  ${e.type}\t(x${e.count})\t${e.involvedObject.name}\n    Message: ${e.message}`));
});

// Equivalent to:
//
// const c = Client.fromFile(<string>process.env.KUBECONFIG);
// const warningsAndErrors =
//   from e in c.core.v1.Event.list()
//   where e.type == "Warning" || e.type == "Error"
//   group e by e.involvedObject.kind;

// warningsAndErrors.forEach(events => {
//   console.log(`kind: ${events.key}`);
//   events.forEach(e =>
//     console.log(`  ${e.type}\t(x${e.count})\t${e.involvedObject.name}\n    Message: ${e.message}`));
// });
