import * as k8s from '@kubernetes/client-node';
import { DeploymentTypes } from './types';

export namespace Deployment {
  export type Transform = <D extends DeploymentTypes>(d: D) => boolean;

  export const matchesName = (name: string): Transform => {
    return d => d.metadata.name === name;
  }
}