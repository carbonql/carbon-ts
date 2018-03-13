import {client, query} from "../../src";

const c = client.Client.fromFile(process.env.KUBECONFIG);

const mySqlVersions = c.core.v1.Pod
  // Get all pods, flatten to a list of containers images.
  .list("default")
  .flatMap(pod => pod.spec.containers)
  .map(container => container.image)
  // Filter those that don't include the string `mysql`.
  .filter(imageName => imageName.includes("mysql"))
  .distinct();

// Prints container image names.
mySqlVersions.forEach(console.log);
