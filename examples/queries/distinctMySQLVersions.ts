import {client, query} from "../../src";

const c = client.Client.fromFile(<string>process.env.KUBECONFIG);

//
// Find distinct container images containing the string "mysql".
//

const mySqlVersions = c.core.v1.Pod
  .list("default")
  .flatMap(pod => pod.spec.containers)
  .map(container => container.image)
  .filter(imageName => imageName.includes("mysql"))
  .distinct();

//
// Prints the distinct container image tags. Something like:
//
//   mysql:5.7
//   mysql:8.0.4
//   mysql
//
mySqlVersions.forEach(console.log);
