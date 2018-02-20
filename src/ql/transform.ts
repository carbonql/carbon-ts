import * as fs from 'fs';
import * as k8s from '@kubernetes/client-node';
import * as path from 'path';
import { V1Service } from '@kubernetes/client-node';

export type Transform<TIn, TOut=TIn> = (ti: TIn) => TOut;

export const merge = <TIn>(makeRight: (TIn) => any): Transform<TIn> => {
  return left => {
    Object.assign(left, makeRight(left));
    return left;
  }
}

//
// Core.
//

export namespace core {
  export namespace v1 {
    export namespace configMap {
      //
      // Constructors.
      //

      export const make = (
        name: string, data: { [key: string]: string; }
      ): k8s.V1ConfigMap => {
        return <k8s.V1ConfigMap>{
          "apiVersion": "v1",
          "kind": "ConfigMap",
          "metadata": {
            "name": name,
          },
          "data": data,
        }
      }
    }

    export namespace container {
      //
      // Constructors.
      //

      export const make = (
        name: string,
        image: string,
        port?: number | k8s.V1ContainerPort,
      ): k8s.V1Container => {
        const c = <k8s.V1Container>{
          name: name,
          image: image,
        };

        if (port) {
          c.ports = [
            isFinite(<number>port)
            ? <k8s.V1ContainerPort>{containerPort: port}
            : <k8s.V1ContainerPort>port
          ];
        }

        return c;
      }

      //
      // Verbs.
      //

      export const deploy = (
        replicas = 1,
        deploymentName?: string,
        appLabels?: Labels,
      ): Transform<k8s.V1Container, DeploymentTypes> => {
        return c => {
          if (!deploymentName) {
            deploymentName = c.name;
          }

          if (!appLabels) {
            appLabels = {app: deploymentName};
          }

          const stub = <k8s.AppsV1beta1Deployment><object>{
            "apiVersion": "apps/v1beta1",
            "kind": "Deployment",
            "metadata": {
              name: deploymentName,
              labels: appLabels,
            },
            "spec": {
              "replicas": replicas,
              "selector": {},
              "template": {
                "metadata": {
                  labels: appLabels
                },
                "spec": {
                  "containers": [c]
                }
              }
            }
          };

          return stub;
        }
      }
    }

    export namespace service {
      //
      // Constructors.
      //

      export const make = (
        name: string, port: k8s.V1ServicePort, labels: Labels = {app: name},
      ): k8s.V1Service => {
        return <k8s.V1Service><object>{
          "kind": "Service",
          "apiVersion": "v1",
          "metadata": {
            name: name,
          },
          "spec": {
            "selector": labels,
            "ports": [port],
          }
        }
      }

      //
      // Transformers.
      //

      export const setName = (name: string): Transform<k8s.V1Service> => {
        return s => {
          hidden.v1.metadata.setName(name)(s.metadata);
          return s;
        }
      }

      export const setSelector = (labels: Labels): Transform<k8s.V1Service> => {
        return s => {
          s.spec.selector = labels;
          return s;
        }
      }

      export const appendPort = (p: k8s.V1ServicePort): Transform<k8s.V1Service> => {
        return s => {
          s.spec.ports.push(p);
          return s;
        }
      }
    }
  }
}

//
// Apps.
//

export namespace apps {
  export namespace v1beta1 {
    export namespace deployment {
      //
      // Transformers.
      //

      export const setName = (name: string): Transform<DeploymentTypes> => {
        return d => {
          hidden.v1.metadata.setName(name)(d.metadata);
          return d;
        }
      }

      export const setLabels = (labels: Labels): Transform<DeploymentTypes> => {
        return d => {
          hidden.v1.metadata.setLabels(labels)(d.metadata);
          return d;
        }
      }

      export const setMatchLabelsSelector = (labels: Labels): Transform<DeploymentTypes> => {
        return d => {
          d.spec.selector = <k8s.V1LabelSelector><object>{matchLabels: labels};
          return d;
        }
      }

      export const setReplicas = (replicas: number): Transform<DeploymentTypes> => {
        return d => {
          d.spec.replicas = replicas;
          return d;
        }
      }

      export const setUpdateStrategyRecreate = (): Transform<DeploymentTypes> => {
        return d => {
          d.spec.strategy = <any>{type: "Recreate"};
          return d;
        }
      }

      export const setUpdateStrategyRolling = (
        params: k8s.AppsV1beta1RollingUpdateDeployment
      ): Transform<DeploymentTypes> => {
        return d => {
          d.spec.strategy = {
            type: "RollingUpdate",
            rollingUpdate: params,
          };
          return d;
        }
      }

      export namespace pod {
        export const setLabels = (labels: Labels): Transform<DeploymentTypes> => {
          return d => {
            d.spec.template.metadata.labels = labels;
            return d;
          }
        }

        export const appendContainer = (c: k8s.V1Container): Transform<DeploymentTypes> => {
          return d => {
            d.spec.template.spec.containers.push(c);
            return d;
          }
        }

        export const appendVolume = (v: k8s.V1Volume): Transform<DeploymentTypes> => {
          return d => {
            d.spec.template.spec.volumes = d.spec.template.spec.volumes || [];
            d.spec.template.spec.volumes.push(v);
            return d;
          };
        }

        export const mapContainers = (
          f: (c: k8s.V1Container) => void,
          filter = (c: k8s.V1Container) => true,
        ): Transform<DeploymentTypes> => {
          return d => {
            for (const c of d.spec.template.spec.containers) {
              if (filter(c)) {
                f(c);
              }
            }
            return d;
          };
        }
      }

      export const setAppLabels = (labels: Labels): Transform<DeploymentTypes> => {
        return d => {
          setLabels(labels)(d);
          pod.setLabels(labels)(d);
          setMatchLabelsSelector(labels)(d);
          return d;
        };
      }

      //
      // Verbs.
      //

      export const expose = (
        port: k8s.V1ServicePort | number, serviceName?: string, svcType: string = "ClusterIP",
      ): Transform<DeploymentTypes, k8s.V1Service> => {
        return d => {
          let svcPort = isFinite(<number>port)
            ? <k8s.V1ServicePort>{port: port, targetPort: port}
            : <k8s.V1ServicePort>port;

          const svc = core.v1.service.make(
            serviceName ? serviceName : d.metadata.name,
            svcPort,
            d.spec.template.metadata.labels);

          svc.spec.type = svcType;

          return svc;
        }
      }

      export const addJsonConfigFile = (
        filePath: string,
        mountPath: string,
        configMapName?: string,
        configMapVolumeMountName?: string,
        containerFilter = (c: k8s.V1Container) => true,
      ): Transform<DeploymentTypes, k8s.V1ConfigMap> => {
        return d => {
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

          pod.mapContainers(
            c => {
              c.volumeMounts = c.volumeMounts || [];
              c.volumeMounts.push(<k8s.V1VolumeMount>{
                name: configMapVolumeName,
                mountPath: mountPath,
              })
            },
            containerFilter
          )(d),
          pod.appendVolume(<k8s.V1Volume>{
            name: configMapVolumeName,
            configMap: {
              name: configMapName,
            },
          })(d)

          return core.v1.configMap.make(configMapName, data);
        }
      }
    }
  }
}

//
// Private helpers.
//

namespace hidden {
  export namespace v1 {
    export namespace metadata {
      export const setName = (name: string): Transform<k8s.V1ObjectMeta> => {
        return m => {
          m.name = name;
          return m;
        };
      }

      export const setAnnotations = (labels: Labels): Transform<k8s.V1ObjectMeta> => {
        return m => {
          m.annotations = labels;
          return m;
        };
      }

      export const mergeAnnotations = (labels: Labels): Transform<k8s.V1ObjectMeta> => {
        return m => {
          m.annotations
            ? Object.assign(m.annotations, labels)
            : m.annotations = labels;
          return m;
        };
      }

      export const setLabels = (labels: Labels): Transform<k8s.V1ObjectMeta> => {
        return m => {
          m.labels = labels;
          return m;
        };
      }

      export const mergeLabels = (labels: Labels): Transform<k8s.V1ObjectMeta> => {
        return m => {
          m.labels
            ? Object.assign(m.labels, labels)
            : m.labels = labels;
          return m;
        };
      }
    }

    export namespace labelSelector {
      export const setMatchExpression = (selectors: k8s.V1LabelSelectorRequirement[]): Transform<k8s.V1LabelSelector> => {
        return s => {
          if (s.matchExpressions) {
            throw new Error("Could not add `matchExpressions` selector to deployment: can't have both that and a `matchLabels` selector");
          }
          s.matchExpressions = selectors;
          return s;
        };
      }

      export const setMatchLabels = (labels: Labels): Transform<k8s.V1LabelSelector> => {
        return s => {
          if (s.matchExpressions) {
            throw new Error("Could not add `matchLabels` selector to deployment: can't have both that and a `matchExpression` selector");
          }
          s.matchLabels = labels;
          return s;
        };
      }
    }
  }
}

//
// Boiler plate types.
//

export type Labels = { [key: string]: string };

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
