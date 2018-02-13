import * as filter from './filter';
import * as defaults from './default';
import * as transform from './transform';
import { DeploymentTypes } from './types';
import * as k8s from '@kubernetes/client-node';
import { List } from 'linqts';

export namespace Deployment {
  export type Bind = <D extends DeploymentTypes>(d: D) => List<any>;

  export const expose = (
    deploymentName: string, port: k8s.V1ServicePort | number, serviceName?: string,
    ...transforms: transform.Service.Transform[]
  ): Bind => {
    return d => {
      if (d.metadata.name !== deploymentName) {
        return new List();
      }

      let svcPort = isFinite(<number>port)
        ? <k8s.V1ServicePort>{port: port, targetPort: port}
        : <k8s.V1ServicePort>port;

      const svc = defaults.service(
        serviceName ? serviceName : deploymentName,
        d.spec.template.metadata.labels,
        svcPort);
      transform.Service.applyTransformations(...transforms);

      return new List([d, svc]);
    }
  }
}
