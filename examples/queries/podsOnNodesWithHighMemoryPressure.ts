import {Client, query} from "../../src";

//
// List pods running on a node where memory pressure is high.
//
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

//
// Outputs a list of nodes under high memory pressure and the pods scheduled on
// them. Something like:
//
//  your-high-pressure-node-name
//      nginx-6f8cf9fbc4-qnrhb
//      nginx2-687c5bbccd-rzjl5
//      kube-addon-manager-minikube
//      kube-dns-54cccfbdf8-hwgh8
//      kubernetes-dashboard-77d8b98585-gzjgb
//      storage-provisioner
//
pressured.forEach(({node, pods}) => {
  console.log(node.metadata.name);
  pods.forEach(pod => console.log(`    ${pod.metadata.name}`));
});
