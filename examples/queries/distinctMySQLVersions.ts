import {Client, query} from "../../src";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const mySqlVersions = c.core.v1.Pod
  .list("default")
  .flatMap(pod => pod.spec.containers)
  .map(container => container.image)
  .filter(imageName => imageName.includes("mysql"))
  .distinct();

mySqlVersions.forEach(console.log);

// Somewhat equivalent to:
//
// const c = Client.fromFile(<string>process.env.KUBECONFIG);
// const mySqlVersions =
//   from pod in c.core.v1.Pod.list("default")
//   where
//       (from container in pod.spec.containers
//       where container.image.Contains("mysql")
//       select container).Count() > 0
//   select pod;

// mySqlVersions.forEach(console.log);
