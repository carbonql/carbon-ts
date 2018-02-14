import * as filter from './filter';
import * as defaults from './default';
import * as transform from './transform';
import * as types from './types';
import * as path from 'path';
import * as fs from 'fs';
import { DeploymentTypes } from './types';
import * as k8s from '@kubernetes/client-node';
import { List } from 'linqts';

export namespace Deployment {
  export type Bind = <D extends DeploymentTypes>(d: D) => List<any>;

  export const expose = (
    d: DeploymentTypes, port: k8s.V1ServicePort | number, serviceName?: string,
    ...transforms: transform.Service.Transform[]
  ): k8s.V1Service => {
    let svcPort = isFinite(<number>port)
      ? <k8s.V1ServicePort>{port: port, targetPort: port}
      : <k8s.V1ServicePort>port;

    const svc = defaults.service(
      serviceName ? serviceName : d.metadata.name,
      d.spec.template.metadata.labels,
      svcPort);
    transform.Service.applyTransformations(...transforms)(svc);

    return svc;
  }

  export const addJsonConfigFile = (
    d: DeploymentTypes,
    filePath: string,
    mountPath: string,
    configMapName?: string,
    configMapVolumeMountName?: string,
    containerFilter = (c: k8s.V1Container) => true,
  ): k8s.V1ConfigMap => {
    let data: any = {};
    if (path.extname(filePath) === ".json") {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      throw new Error(`ConfigMap can't be made from non-JSON file '${filePath}'`);
    }

    let configMapVolumeName = configMapName;
    if (!configMapName) {
      const deploymentName = d.metadata.name;
      configMapName = deploymentName;
      configMapVolumeName = `${deploymentName}-configMap`;
    }

    new List([d])
      .Select(
        transform.Deployment.applyTransformations(
          transform.Deployment.mapContainers(
            c => {
              c.volumeMounts = c.volumeMounts || [];
              c.volumeMounts.push(<k8s.V1VolumeMount>{
                name: configMapVolumeName,
                mountPath: mountPath,
              })
            },
            containerFilter
          ),
          transform.Deployment.appendVolume(<k8s.V1Volume>{
            name: configMapVolumeName,
            configMap: {
              name: configMapName,
            },
          })
        )
      );

      return defaults.configMap(configMapName, data);
  }
}
