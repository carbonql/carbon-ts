import * as k8s from '@kubernetes/client-node';

export type DeploymentTypes =
    k8s.AppsV1beta1Deployment
  | k8s.ExtensionsV1beta1Deployment
  | k8s.V1beta2Deployment;
