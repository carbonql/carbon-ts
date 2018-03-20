import {Client, transform} from "../../src";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const podsByClaim = c.core.v1.PersistentVolume
  .list()
  .filter(pv => pv.status.phase == "Bound")
  .flatMap(pv =>
    c.core.v1.Pod
      .list()
      .filter(pod =>
        pod.spec
          .volumes
          .filter(vol =>
            vol.persistentVolumeClaim &&
            vol.persistentVolumeClaim.claimName == pv.spec.claimRef.name)
          .length > 0)
      .toArray()
      .map(pods => {return {pv: pv, pods: pods}}));

// Print.
podsByClaim.forEach(({pv, pods}) => {
  console.log(pv.metadata.name);
  pods.forEach(pod => console.log(`  ${pod.metadata.namespace}/${pod.metadata.name}`));
});

// Equivalent to:
//
// const c = Client.fromFile(<string>process.env.KUBECONFIG);
// const podsByClaim =
//   from pv in c.core.v1.PersistentVolume.list()
//   let podsWithPvAccess =
//     (from pod in c.core.v1.Pod.list()
//     where
//       // Filter down to pods where at least one volume
//       // references `pv`.
//       (from volume in pod.spec.volumes
//       where volume.persistentVolumeClaim != null &&
//         volume.persistentVolumeClaim.claimName == pv.spec.claimRef.name
//       select volume).Count() > 0
//     // Return pods satisfying this condition.
//     select pod)
//   // Return object with `secret` and all pods that
//   // access it.
//   select new {secret: secret, pods: podsWithPvAccess};

// // Print.
// podsByClaim.forEach(({pv, pods}) => {
//   console.log(pv.metadata.name);
//   pods.forEach(pod => console.log(`  ${pod.metadata.namespace}/${pod.metadata.name}`));
// });