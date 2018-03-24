import * as fs from "fs";
import * as k8s from '@carbonql/kubernetes-client-node';
import * as path from "path";
import * as http from "http";
import * as request from "request";
import * as rx from "rxjs/Rx";
import * as promise from "bluebird";
const byline = require("byline");

export class Client {
  public static fromFile = (filename: string): Client => {
    const kc = kubeconfig.fromFile(filename);
    return new Client(kc);
  }

  private constructor(private _kc: k8s.KubeConfig) { }

  get kubeConfig(): k8s.KubeConfig {
    return this._kc;
  }

  public core = {
    v1: {
      client: () =>
        <k8s.CoreV1Api>fromKubeConfig(this._kc, k8s.CoreV1Api),

      ComponentStatus: {
        list: () => {
          return listAsObservable(this.core.v1.client().listCoreV1ComponentStatus());
        },
      },
      ConfigMap: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listCoreV1NamespacedConfigMap(namespace)
              : this.core.v1.client().listCoreV1ConfigMapForAllNamespaces()
          );
        },
      },
      Endpoints: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listCoreV1NamespacedEndpoints(namespace)
              : this.core.v1.client().listCoreV1EndpointsForAllNamespaces()
          );
        },
      },
      Event: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listCoreV1NamespacedEvent(namespace)
              : this.core.v1.client().listCoreV1EventForAllNamespaces()
          );
        },
      },
      LimitRange: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listCoreV1NamespacedLimitRange(namespace)
              : this.core.v1.client().listCoreV1LimitRangeForAllNamespaces()
          );
        },
      },
      Namespace: {
        list: () => {
          return listAsObservable(this.core.v1.client().listCoreV1Namespace());
        },
      },
      PersistentVolumeClaim: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listCoreV1NamespacedPersistentVolumeClaim(namespace)
              : this.core.v1.client().listCoreV1PersistentVolumeClaimForAllNamespaces()
          );
        },
      },
      Pod: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listCoreV1NamespacedPod(namespace)
              : this.core.v1.client().listCoreV1PodForAllNamespaces()
          );
        },
        logs: (name: string, namespace: string, container?: string) => {
          return objAsObservable(this.core.v1.client().readCoreV1NamespacedPodLog(name, namespace, container))
        },
        logStream: (name: string, namespace: string, container?: string) => {
          return streamPodLogs(name, namespace, this._kc, container);
        },
      },
      PodTemplate: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listCoreV1NamespacedPodTemplate(namespace)
              : this.core.v1.client().listCoreV1PodTemplateForAllNamespaces()
          );
        },
      },
      ReplicationController: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listCoreV1NamespacedReplicationController(namespace)
              : this.core.v1.client().listCoreV1ReplicationControllerForAllNamespaces()
          );
        },
      },
      ResourceQuota: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listCoreV1NamespacedResourceQuota(namespace)
              : this.core.v1.client().listCoreV1ResourceQuotaForAllNamespaces()
          );
        },
      },
      Secret: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listCoreV1NamespacedSecret(namespace)
              : this.core.v1.client().listCoreV1SecretForAllNamespaces()
          );
        },
      },
      ServiceAccount: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listCoreV1NamespacedServiceAccount(namespace)
              : this.core.v1.client().listCoreV1ServiceAccountForAllNamespaces()
          );
        },
      },
      Service: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.core.v1.client().listCoreV1NamespacedService(namespace)
              : this.core.v1.client().listCoreV1ServiceForAllNamespaces()
          );
        },
      },
      Node: {
        list: () => {
          return listAsObservable(this.core.v1.client().listCoreV1Node());
        },
      },
      PersistentVolume: {
        list: () => {
          return listAsObservable(this.core.v1.client().listCoreV1PersistentVolume());
        },
      },

    },

  };
  public admissionregistration = {
    v1alpha1: {
      client: () =>
        <k8s.AdmissionregistrationV1alpha1Api>fromKubeConfig(this._kc, k8s.AdmissionregistrationV1alpha1Api),

      ExternalAdmissionHookConfiguration: {
        list: () => {
          return listAsObservable(this.admissionregistration.v1alpha1.client().listAdmissionregistrationV1alpha1ExternalAdmissionHookConfiguration());
        },
      },
      InitializerConfiguration: {
        list: () => {
          return listAsObservable(this.admissionregistration.v1alpha1.client().listAdmissionregistrationV1alpha1InitializerConfiguration());
        },
      },

    },

  };
  public apiregistration = {
    v1beta1: {
      client: () =>
        <k8s.ApiregistrationV1beta1Api>fromKubeConfig(this._kc, k8s.ApiregistrationV1beta1Api),

      APIService: {
        list: () => {
          return listAsObservable(this.apiregistration.v1beta1.client().listApiregistrationV1beta1APIService());
        },
      },

    },

  };
  public apps = {
    v1beta1: {
      client: () =>
        <k8s.AppsV1beta1Api>fromKubeConfig(this._kc, k8s.AppsV1beta1Api),

      ControllerRevision: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1beta1.client().listAppsV1beta1NamespacedControllerRevision(namespace)
              : this.apps.v1beta1.client().listAppsV1beta1ControllerRevisionForAllNamespaces()
          );
        },
      },
      Deployment: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1beta1.client().listAppsV1beta1NamespacedDeployment(namespace)
              : this.apps.v1beta1.client().listAppsV1beta1DeploymentForAllNamespaces()
          );
        },
      },
      StatefulSet: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1beta1.client().listAppsV1beta1NamespacedStatefulSet(namespace)
              : this.apps.v1beta1.client().listAppsV1beta1StatefulSetForAllNamespaces()
          );
        },
      },

    },

  };
  public autoscaling = {
    v1: {
      client: () =>
        <k8s.AutoscalingV1Api>fromKubeConfig(this._kc, k8s.AutoscalingV1Api),

      HorizontalPodAutoscaler: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.autoscaling.v1.client().listAutoscalingV1NamespacedHorizontalPodAutoscaler(namespace)
              : this.autoscaling.v1.client().listAutoscalingV1HorizontalPodAutoscalerForAllNamespaces()
          );
        },
      },

    },
    v2alpha1: {
      client: () =>
        <k8s.AutoscalingV2alpha1Api>fromKubeConfig(this._kc, k8s.AutoscalingV2alpha1Api),

      HorizontalPodAutoscaler: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.autoscaling.v2alpha1.client().listAutoscalingV2alpha1NamespacedHorizontalPodAutoscaler(namespace)
              : this.autoscaling.v2alpha1.client().listAutoscalingV2alpha1HorizontalPodAutoscalerForAllNamespaces()
          );
        },
      },

    },

  };
  public batch = {
    v1: {
      client: () =>
        <k8s.BatchV1Api>fromKubeConfig(this._kc, k8s.BatchV1Api),

      Job: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.batch.v1.client().listBatchV1NamespacedJob(namespace)
              : this.batch.v1.client().listBatchV1JobForAllNamespaces()
          );
        },
      },

    },
    v2alpha1: {
      client: () =>
        <k8s.BatchV2alpha1Api>fromKubeConfig(this._kc, k8s.BatchV2alpha1Api),

      CronJob: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.batch.v2alpha1.client().listBatchV2alpha1NamespacedCronJob(namespace)
              : this.batch.v2alpha1.client().listBatchV2alpha1CronJobForAllNamespaces()
          );
        },
      },
      ScheduledJob: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.batch.v2alpha1.client().listBatchV2alpha1NamespacedScheduledJob(namespace)
              : this.batch.v2alpha1.client().listBatchV2alpha1ScheduledJobForAllNamespaces()
          );
        },
      },

    },

  };
  public certificates = {
    v1beta1: {
      client: () =>
        <k8s.CertificatesV1beta1Api>fromKubeConfig(this._kc, k8s.CertificatesV1beta1Api),

      CertificateSigningRequest: {
        list: () => {
          return listAsObservable(this.certificates.v1beta1.client().listCertificatesV1beta1CertificateSigningRequest());
        },
      },

    },

  };
  public extensions = {
    v1beta1: {
      client: () =>
        <k8s.ExtensionsV1beta1Api>fromKubeConfig(this._kc, k8s.ExtensionsV1beta1Api),

      DaemonSet: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.extensions.v1beta1.client().listExtensionsV1beta1NamespacedDaemonSet(namespace)
              : this.extensions.v1beta1.client().listExtensionsV1beta1DaemonSetForAllNamespaces()
          );
        },
      },
      Deployment: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.extensions.v1beta1.client().listExtensionsV1beta1NamespacedDeployment(namespace)
              : this.extensions.v1beta1.client().listExtensionsV1beta1DeploymentForAllNamespaces()
          );
        },
      },
      Ingress: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.extensions.v1beta1.client().listExtensionsV1beta1NamespacedIngress(namespace)
              : this.extensions.v1beta1.client().listExtensionsV1beta1IngressForAllNamespaces()
          );
        },
      },
      NetworkPolicy: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.extensions.v1beta1.client().listExtensionsV1beta1NamespacedNetworkPolicy(namespace)
              : this.extensions.v1beta1.client().listExtensionsV1beta1NetworkPolicyForAllNamespaces()
          );
        },
      },
      ReplicaSet: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.extensions.v1beta1.client().listExtensionsV1beta1NamespacedReplicaSet(namespace)
              : this.extensions.v1beta1.client().listExtensionsV1beta1ReplicaSetForAllNamespaces()
          );
        },
      },
      PodSecurityPolicy: {
        list: () => {
          return listAsObservable(this.extensions.v1beta1.client().listExtensionsV1beta1PodSecurityPolicy());
        },
      },
      ThirdPartyResource: {
        list: () => {
          return listAsObservable(this.extensions.v1beta1.client().listExtensionsV1beta1ThirdPartyResource());
        },
      },

    },

  };
  public networking = {
    v1: {
      client: () =>
        <k8s.NetworkingV1Api>fromKubeConfig(this._kc, k8s.NetworkingV1Api),

      NetworkPolicy: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.networking.v1.client().listNetworkingV1NamespacedNetworkPolicy(namespace)
              : this.networking.v1.client().listNetworkingV1NetworkPolicyForAllNamespaces()
          );
        },
      },

    },

  };
  public policy = {
    v1beta1: {
      client: () =>
        <k8s.PolicyV1beta1Api>fromKubeConfig(this._kc, k8s.PolicyV1beta1Api),

      PodDisruptionBudget: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.policy.v1beta1.client().listPolicyV1beta1NamespacedPodDisruptionBudget(namespace)
              : this.policy.v1beta1.client().listPolicyV1beta1PodDisruptionBudgetForAllNamespaces()
          );
        },
      },

    },

  };
  public rbacAuthorization = {
    v1alpha1: {
      client: () =>
        <k8s.RbacAuthorizationV1alpha1Api>fromKubeConfig(this._kc, k8s.RbacAuthorizationV1alpha1Api),

      ClusterRoleBinding: {
        list: () => {
          return listAsObservable(this.rbacAuthorization.v1alpha1.client().listRbacAuthorizationV1alpha1ClusterRoleBinding());
        },
      },
      ClusterRole: {
        list: () => {
          return listAsObservable(this.rbacAuthorization.v1alpha1.client().listRbacAuthorizationV1alpha1ClusterRole());
        },
      },
      RoleBinding: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.rbacAuthorization.v1alpha1.client().listRbacAuthorizationV1alpha1NamespacedRoleBinding(namespace)
              : this.rbacAuthorization.v1alpha1.client().listRbacAuthorizationV1alpha1RoleBindingForAllNamespaces()
          );
        },
      },
      Role: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.rbacAuthorization.v1alpha1.client().listRbacAuthorizationV1alpha1NamespacedRole(namespace)
              : this.rbacAuthorization.v1alpha1.client().listRbacAuthorizationV1alpha1RoleForAllNamespaces()
          );
        },
      },

    },
    v1beta1: {
      client: () =>
        <k8s.RbacAuthorizationV1beta1Api>fromKubeConfig(this._kc, k8s.RbacAuthorizationV1beta1Api),

      ClusterRoleBinding: {
        list: () => {
          return listAsObservable(this.rbacAuthorization.v1beta1.client().listRbacAuthorizationV1beta1ClusterRoleBinding());
        },
      },
      ClusterRole: {
        list: () => {
          return listAsObservable(this.rbacAuthorization.v1beta1.client().listRbacAuthorizationV1beta1ClusterRole());
        },
      },
      RoleBinding: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.rbacAuthorization.v1beta1.client().listRbacAuthorizationV1beta1NamespacedRoleBinding(namespace)
              : this.rbacAuthorization.v1beta1.client().listRbacAuthorizationV1beta1RoleBindingForAllNamespaces()
          );
        },
      },
      Role: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.rbacAuthorization.v1beta1.client().listRbacAuthorizationV1beta1NamespacedRole(namespace)
              : this.rbacAuthorization.v1beta1.client().listRbacAuthorizationV1beta1RoleForAllNamespaces()
          );
        },
      },

    },

  };
  public settings = {
    v1alpha1: {
      client: () =>
        <k8s.SettingsV1alpha1Api>fromKubeConfig(this._kc, k8s.SettingsV1alpha1Api),

      PodPreset: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.settings.v1alpha1.client().listSettingsV1alpha1NamespacedPodPreset(namespace)
              : this.settings.v1alpha1.client().listSettingsV1alpha1PodPresetForAllNamespaces()
          );
        },
      },

    },

  };
  public storage = {
    v1: {
      client: () =>
        <k8s.StorageV1Api>fromKubeConfig(this._kc, k8s.StorageV1Api),

      StorageClass: {
        list: () => {
          return listAsObservable(this.storage.v1.client().listStorageV1StorageClass());
        },
      },

    },
    v1beta1: {
      client: () =>
        <k8s.StorageV1beta1Api>fromKubeConfig(this._kc, k8s.StorageV1beta1Api),

      StorageClass: {
        list: () => {
          return listAsObservable(this.storage.v1beta1.client().listStorageV1beta1StorageClass());
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

const streamPodLogs = (
  name: string, namespace: string, kc: k8s.KubeConfig, container?: string
): rx.Observable<string> => {
  const logsPattern = `/api/v1/namespaces/${namespace}/pods/${name}/log`;
  let url = kc.getCurrentCluster().server + logsPattern;

  const queryParams: any = {
    follow: true,
  };
  if (container != null) {
    queryParams["container"] = container;
  }
  let headerParams: any = {};

  let requestOptions: request.Options = {
      method: 'GET',
      qs: queryParams,
      headers: headerParams,
      uri: url,
      useQuerystring: true,
      json: true
  };
  kc.applyToRequest(requestOptions);

  const logs = new rx.Subject<string>();
  const stream = new byline.LineStream();
  stream.on('data', (data: any) => {
    logs.next(data.toString());
  });

  let req = request(requestOptions, (error, /*response, body*/) => {
    if (error) {
      logs.error(error);
    }
    logs.complete();
  });
  req.pipe(stream);

  return logs;
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

