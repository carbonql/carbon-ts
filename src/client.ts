import * as fs from "fs";
import * as k8s from '@hausdorff/client-node';
import * as path from "path";
import * as http from "http";
import * as rx from "rxjs/Rx";
import * as promise from "bluebird";

export class Client {
  public static fromFile = (filename: string): Client => {
    const kc = kubeconfig.fromFile(filename);
    return new Client(kc);
  }

  private constructor(private _kc: k8s.KubeConfig) { }

  public core = {
    v1: {
      client: () =>
        <k8s.Core_v1Api>fromKubeConfig(this._kc, k8s.Core_v1Api),

      ComponentStatus: {
        list: () => {
          return listAsObservable(this.core.v1.client().listComponentStatus());
        },
      },
      ConfigMap: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedConfigMap(namespace)
              : this.core.v1.client().listConfigMapForAllNamespaces()
          );
        },
      },
      Endpoints: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedEndpoints(namespace)
              : this.core.v1.client().listEndpointsForAllNamespaces()
          );
        },
      },
      Event: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedEvent(namespace)
              : this.core.v1.client().listEventForAllNamespaces()
          );
        },
      },
      LimitRange: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedLimitRange(namespace)
              : this.core.v1.client().listLimitRangeForAllNamespaces()
          );
        },
      },
      Namespace: {
        list: () => {
          return listAsObservable(this.core.v1.client().listNamespace());
        },
      },
      PersistentVolumeClaim: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedPersistentVolumeClaim(namespace)
              : this.core.v1.client().listPersistentVolumeClaimForAllNamespaces()
          );
        },
      },
      Pod: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedPod(namespace)
              : this.core.v1.client().listPodForAllNamespaces()
          );
        },
        logs: (name: string, namespace: string, container?: string) => {
          return objAsObservable(this.core.v1.client().readNamespacedPodLog(name, namespace, container))
        },
      },
      PodTemplate: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedPodTemplate(namespace)
              : this.core.v1.client().listPodTemplateForAllNamespaces()
          );
        },
      },
      ReplicationController: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedReplicationController(namespace)
              : this.core.v1.client().listReplicationControllerForAllNamespaces()
          );
        },
      },
      ResourceQuota: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedResourceQuota(namespace)
              : this.core.v1.client().listResourceQuotaForAllNamespaces()
          );
        },
      },
      Secret: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedSecret(namespace)
              : this.core.v1.client().listSecretForAllNamespaces()
          );
        },
      },
      ServiceAccount: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedServiceAccount(namespace)
              : this.core.v1.client().listServiceAccountForAllNamespaces()
          );
        },
      },
      Service: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedService(namespace)
              : this.core.v1.client().listServiceForAllNamespaces()
          );
        },
      },
      Node: {
        list: () => {
          return listAsObservable(this.core.v1.client().listNode());
        },
      },
      PersistentVolume: {
        list: () => {
          return listAsObservable(this.core.v1.client().listPersistentVolume());
        },
      },

    },

  };
  public apps = {
    v1beta1: {
      client: () =>
        <k8s.Apps_v1beta1Api>fromKubeConfig(this._kc, k8s.Apps_v1beta1Api),

      ControllerRevision: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1beta1.client().listNamespacedControllerRevision(namespace)
              : this.apps.v1beta1.client().listControllerRevisionForAllNamespaces()
          );
        },
      },
      Deployment: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1beta1.client().listNamespacedDeployment(namespace)
              : this.apps.v1beta1.client().listDeploymentForAllNamespaces()
          );
        },
      },
      StatefulSet: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1beta1.client().listNamespacedStatefulSet(namespace)
              : this.apps.v1beta1.client().listStatefulSetForAllNamespaces()
          );
        },
      },

    },

  };
  public autoscaling = {
    v1: {
      client: () =>
        <k8s.Autoscaling_v1Api>fromKubeConfig(this._kc, k8s.Autoscaling_v1Api),

      HorizontalPodAutoscaler: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.autoscaling.v1.client().listNamespacedHorizontalPodAutoscaler(namespace)
              : this.autoscaling.v1.client().listHorizontalPodAutoscalerForAllNamespaces()
          );
        },
      },

    },

  };
  public batch = {
    v1: {
      client: () =>
        <k8s.Batch_v1Api>fromKubeConfig(this._kc, k8s.Batch_v1Api),

      Job: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.batch.v1.client().listNamespacedJob(namespace)
              : this.batch.v1.client().listJobForAllNamespaces()
          );
        },
      },

    },
    v2alpha1: {
      client: () =>
        <k8s.Batch_v2alpha1Api>fromKubeConfig(this._kc, k8s.Batch_v2alpha1Api),

      CronJob: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.batch.v2alpha1.client().listNamespacedCronJob(namespace)
              : this.batch.v2alpha1.client().listCronJobForAllNamespaces()
          );
        },
      },

    },

  };
  public extensions = {
    v1beta1: {
      client: () =>
        <k8s.Extensions_v1beta1Api>fromKubeConfig(this._kc, k8s.Extensions_v1beta1Api),

      DaemonSet: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.extensions.v1beta1.client().listNamespacedDaemonSet(namespace)
              : this.extensions.v1beta1.client().listDaemonSetForAllNamespaces()
          );
        },
      },
      Deployment: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.extensions.v1beta1.client().listNamespacedDeployment(namespace)
              : this.extensions.v1beta1.client().listDeploymentForAllNamespaces()
          );
        },
      },
      Ingress: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.extensions.v1beta1.client().listNamespacedIngress(namespace)
              : this.extensions.v1beta1.client().listIngressForAllNamespaces()
          );
        },
      },
      NetworkPolicy: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.extensions.v1beta1.client().listNamespacedNetworkPolicy(namespace)
              : this.extensions.v1beta1.client().listNetworkPolicyForAllNamespaces()
          );
        },
      },
      ReplicaSet: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.extensions.v1beta1.client().listNamespacedReplicaSet(namespace)
              : this.extensions.v1beta1.client().listReplicaSetForAllNamespaces()
          );
        },
      },
      PodSecurityPolicy: {
        list: () => {
          return listAsObservable(this.extensions.v1beta1.client().listPodSecurityPolicy());
        },
      },

    },

  };
  public policy = {
    v1beta1: {
      client: () =>
        <k8s.Policy_v1beta1Api>fromKubeConfig(this._kc, k8s.Policy_v1beta1Api),

      PodDisruptionBudget: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.policy.v1beta1.client().listNamespacedPodDisruptionBudget(namespace)
              : this.policy.v1beta1.client().listPodDisruptionBudgetForAllNamespaces()
          );
        },
      },

    },

  };
}

type Listable<T> = {items: T[]}
type ApiResponseObj<T> = {response: http.ClientResponse; body: T;};
type ApiResponseList<T> = {response: http.ClientResponse; body: Listable<T>;};

const fromKubeConfig = (
  kc: k8s.KubeConfig, create: any,
): any => {
  const client = new create(kc.getCurrentCluster()['server']);
  client.setDefaultAuthentication(kc);

  return client;
}

const listAsObservable = <T>(
  p: promise<ApiResponseList<T>>
) => {
  return rx.Observable
    .fromPromise(p)
    .flatMap(res => res.body.items);
}

const objAsObservable = <T>(
  p: promise<ApiResponseObj<T>>
) => {
  return rx.Observable
    .fromPromise(p)
    .map(res => {
      return res.body;
    });
}

export namespace kubeconfig {
  // const SERVICEACCOUNT_ROOT =
  //   '/var/run/secrets/kubernetes.io/serviceaccount';
  // const SERVICEACCOUNT_CA_PATH =
  //   SERVICEACCOUNT_ROOT + '/ca.crt';
  // const SERVICEACCOUNT_TOKEN_PATH =
  //   SERVICEACCOUNT_ROOT + '/token';

  export const fromFile = (filename: string): k8s.KubeConfig => {
      let kc = new k8s.KubeConfig();
      kc.loadFromFile(filename);
      return kc;
  }

  // export const fromCluster = (): k8s.KubeConfig => {
  //     let host = process.env.KUBERNETES_SERVICE_HOST
  //     let port = process.env.KUBERNETES_SERVICE_PORT

  //     // TODO: better error checking here.
  //     let caCert = fs.readFileSync(SERVICEACCOUNT_CA_PATH);
  //     let token = fs.readFileSync(SERVICEACCOUNT_TOKEN_PATH);

  //     let k8sApi = new client.Core_v1Api('https://' + host + ':' + port);
  //     k8sApi.setDefaultAuthentication({
  //         'applyToRequest': (opts) => {
  //             opts.ca = caCert;
  //             opts.headers['Authorization'] = 'Bearer ' + token;
  //         }
  //     });

  //     return k8sApi;
  // }

  export const defaultClient = (): k8s.KubeConfig => {
      if (process.env.KUBECONFIG) {
          return fromFile(process.env.KUBECONFIG);
      }

      let config = path.join(<string>process.env.HOME, ".kube", "config");
      if (fs.existsSync(config)) {
          return fromFile(config);
      }

      throw new Error("Could not locate kubeconfig file");

      // if (fs.existsSync(SERVICEACCOUNT_TOKEN_PATH)) {
      //     return fromCluster();
      // }
  }
}

