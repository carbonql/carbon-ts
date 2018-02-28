import * as fs from "fs";
import * as k8s from '@hausdorff/client-node';
import * as path from "path";
import * as http from "http";
import * as rx from "rxjs/Rx";
import * as promise from "bluebird";

export type ClientTypes =
    k8s.Apps_v1beta1Api
  | k8s.Apps_v1beta2Api
  | k8s.Authentication_v1Api
  | k8s.Authentication_v1beta1Api
  | k8s.Authorization_v1Api
  | k8s.Authorization_v1beta1Api
  | k8s.Autoscaling_v1Api
  | k8s.Autoscaling_v2beta1Api
  | k8s.Batch_v1Api
  | k8s.Batch_v1beta1Api
  | k8s.Batch_v2alpha1Api
  | k8s.Certificates_v1beta1Api
  | k8s.Core_v1Api
  | k8s.Extensions_v1beta1Api
  | k8s.Networking_v1Api
  | k8s.Policy_v1beta1Api
  | k8s.RbacAuthorization_v1Api
  | k8s.RbacAuthorization_v1alpha1Api
  | k8s.Scheduling_v1alpha1Api
  | k8s.Settings_v1alpha1Api
  | k8s.Storage_v1Api
  | k8s.Storage_v1beta1Api
  ;

export class Client {
  public static fromFile = (filename: string): Client => {
    const kc = kubeconfig.fromFile(filename);
    return new Client(kc);
  }

  private constructor(private _kc: k8s.KubeConfig) { }

  public apps = {
    v1beta1: {
      client: () =>
        <k8s.Apps_v1beta1Api>fromKubeConfig(this._kc, k8s.Apps_v1beta1Api),

      deployment: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1beta1.client().listNamespacedDeployment(namespace)
              : this.apps.v1beta1.client().listDeploymentForAllNamespaces()
          );
        },
      },
    },

    v1beta2: {
      client: () =>
        <k8s.Apps_v1beta2Api>fromKubeConfig(this._kc, k8s.Apps_v1beta2Api),

      deployment: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1beta2.client().listNamespacedDeployment(namespace)
              : this.apps.v1beta2.client().listDeploymentForAllNamespaces()
          );
        },
      },
    },
  };

  public core = {
    v1: {
      client: () =>
        <k8s.Core_v1Api>fromKubeConfig(this._kc, k8s.Core_v1Api),

      pod: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedPod(namespace)
              : this.core.v1.client().listPodForAllNamespaces()
          );
        },

        logs: (name: string, namespace: string, container?: string) => {
          return objAsObservable(
            this.core.v1.client().readNamespacedPodLog(name, namespace, container));
        }
      },

      service: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listNamespacedService(namespace)
              : this.core.v1.client().listServiceForAllNamespaces()
          );
        },
      }
    },
  }

  public extensions = {
    v1beta1: {
      client: () =>
        <k8s.Extensions_v1beta1Api>fromKubeConfig(this._kc, k8s.Extensions_v1beta1Api),

      deployment: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.extensions.v1beta1.client().listNamespacedDeployment(namespace)
              : this.extensions.v1beta1.client().listDeploymentForAllNamespaces()
          );
        },
      },
    },
  }
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
