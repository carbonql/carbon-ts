import * as k8s from '@kubernetes/client-node';

export type DeploymentTypes =
    k8s.AppsV1beta1Deployment
  | k8s.ExtensionsV1beta1Deployment
  | k8s.V1beta2Deployment;

export const isDeployment = (o: any): o is DeploymentTypes => {
  if (!o.kind || !o.apiVersion) {
    return false;
  }

  const nsCheck =
       o.apiVersion === "apps/v1beta1"
    || o.apiVersion === "apps/v1beta2"
    || o.apiVersion === "extensions/v1beta1"
    || o.apiVersion === "apps/v1";

  return o.kind === "Deployment" && nsCheck;
}
