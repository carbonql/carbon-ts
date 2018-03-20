import {Client, transform} from "../../src";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const podsByClaim = c.core.v1.Secret
  .list()
  .flatMap(secret =>
    c.core.v1.Pod
      .list()
      .filter(pod =>
        pod.spec
          .volumes
          .filter(vol =>
            vol.secret &&
            vol.secret.secretName == secret.metadata.name)
          .length > 0)
      .toArray()
      .map(pods => {return {secret: secret, pods: pods}}));

// Print.
podsByClaim.forEach(({secret, pods}) => {
  console.log(secret.metadata.name);
  pods.forEach(pod => console.log(`  ${pod.spec.serviceAccountName} ${pod.metadata.namespace}/${pod.metadata.name}`));
});

// Equivalent to:
//
// const c = Client.fromFile(<string>process.env.KUBECONFIG);
// const podsByClaim =
//   from secret in c.core.v1.Secret.list()
//   let podsWithSecretAccess =
//     (from pod in c.core.v1.Pod.list()
//     where
//       // Filter down to pods where at least one volume
//       // references `secret`.
//       (from volume in pod.spec.volumes
//       where volume.secret != null && volume.secret.secretName == secret.metadata.name
//       select volume).Count() > 0
//     // Return pods satisfying this condition.
//     select pod)
//   // Return object with `secret` and all pods that
//   // access it.
//   select new {secret: secret, pods: podsWithSecretAccess};

// // Print.
// podsByClaim.forEach(({secret, pods}) => {
//   console.log(secret.metadata.name);
//   pods.forEach(pod => console.log(`  ${pod.spec.serviceAccountName} ${pod.metadata.namespace}/${pod.metadata.name}`));
// });
