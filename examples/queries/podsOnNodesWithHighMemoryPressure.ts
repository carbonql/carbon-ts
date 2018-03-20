import {Client, query} from "../../src";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const pressured = c.core.v1.Pod.list()
  // Index pods by node name.
  .groupBy(pod => pod.spec.nodeName)
  .flatMap(group => {
    // Join pods and nodes on node name; filter out everything where mem
    // pressure is not high.
    const nodes = c.core.v1.Node
      .list()
      .filter(node =>
        node.metadata.name == group.key &&
        node.status.conditions
          .filter(c => c.type === "MemoryPressure" && c.status === "True")
          .length >= 1);

    // Return join of {node, pods}
    return group
      .toArray()
      .flatMap(pods => nodes.map(node => {return {node, pods}}))
  })

pressured.forEach(({node, pods}) => {
  console.log(node.metadata.name);
  pods.forEach(pod => console.log(`    ${pod.metadata.name}`));
});

// This is equivalent to:
// const c = Client.fromFile(<string>process.env.KUBECONFIG);
// const pressured =
//   from pod in c.core.v1.Pod.list()
//   group pod by pod.spec.nodeName into podsOnNode
//   join node in c.core.v1.Node.list() on podsOnNode.Key equals node.metadata.name
//   where
//       (from condition in node.status.conditions
//       where condition.type == "MemoryPressure" && condition.status == "True").Count() >= 1
//   select new{node = node, pods = podsOnNode};

// pressured.forEach(({node, pods}) => {
//   console.log(node.metadata.name);
//   pods.forEach(pod => console.log(`    ${pod.metadata.name}`));
// });