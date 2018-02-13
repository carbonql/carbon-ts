import * as trans from './transform';
import { Deployment } from './transform';
import * as fs from 'fs';
import * as k8s from '@kubernetes/client-node';
import { DeploymentTypes } from './types';
import { List } from 'linqts';
import { V1Service } from '@kubernetes/client-node';
import { Service } from './client';

// //
// // Get client.
// //
// var client = k8s.Config.defaultClient();
// client.listNamespacedPod('default')
//   .then((res) => {
//     const pods = new List<k8s.V1Pod>(res.body.items)
//       .Where((pod: k8s.V1Pod) => pod.metadata.labels["app"] === "nginx")
//       .ForEach((pod: k8s.V1Pod) => {
//         console.log(pod.metadata.name);
//         console.log("  " + pod.status.phase);
//       });
//   })
//   .catch(err => {
//     console.log(JSON.stringify(err, null, "  "));
//   });

export const deployment = (
  name: string, image: string, port?: k8s.V1ContainerPort
): k8s.AppsV1beta1Deployment => {
  const stub = <k8s.AppsV1beta1Deployment><object>{
    "apiVersion": "apps/v1beta1",
    "kind": "Deployment",
    "metadata": {},
    "spec": {
      "replicas": 1,
      "selector": {},
      "template": {
        "metadata": {},
        "spec": {
          "containers": []
        }
      }
    }
  };

  // This is equivalent to the following with our SQL babel extension:
  //
  // FROM new List(stub)
  // SELECT
  //   Deployment
  //     .transformer()
  //     .withName(name),
  //     .withAppLabels(name),
  //     .withReplicas(1),
  //     .appendContainer(<k8s.V1Container>{
  //       name: name,
  //       image: image,
  //       ports: port ? [port] : [],
  //     })
  new List<DeploymentTypes>([stub])
    .Select(
      Deployment.applyTransformations(
        Deployment.setName(name),
        Deployment.setAppLabels(name),
        Deployment.setReplicas(1),
        Deployment.appendContainer(<k8s.V1Container>{
          name: name,
          image: image,
          ports: port ? [port] : [],
        })));

  // Alternatively:
  //
  //   Deployment.applyTransformations(
  //     Deployment.setName(name),
  //     Deployment.setAppLabels(name),
  //     Deployment.setReplicas(1),
  //     Deployment.appendContainer(<k8s.V1Container>{
  //       name: name,
  //       image: image,
  //       ports: port ? [port] : [],
  //     })
  //   )(stub);

  return stub;
}

export const service = (
  name: string, labels: { [key: string]: string }, port: k8s.V1ServicePort
): k8s.V1Service => {
  const stub = <k8s.V1Service><object>{
    "kind": "Service",
    "apiVersion": "v1",
    "metadata": {},
    "spec": {
      "selector": {},
      "ports": [],
    }
  };

  // This is equivalent to the following with our SQL babel extension:
  //
  // FROM new List(stub)
  // SELECT
  //   Service
  //     .transformer()
  //     .withName(name),
  //     .WithSelector({app: name}),
  //     .appendPort(port)
  new List<k8s.V1Service>([stub])
    .Select(
      Service.applyTransformations(
        Service.setName(name),
        Service.setSelector({app: name}),
        Service.appendPort(port),
      ));

  // Alternatively:
  //
  //   Service.applyTransformations(
  //     Service.setName(name),
  //     Service.setSelector({app: name}),
  //     Service.appendPort(port),
  //   )(stub);

  return stub;
}
