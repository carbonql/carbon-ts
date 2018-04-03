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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiCoreV1ConfigMap>("/api/v1/watch/namespaces/" + namespace + "/configmaps", this._kc)
            : watchListAsObservable<k8s.IoK8sApiCoreV1ConfigMap>("/api/v1/watch/configmaps", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiCoreV1Endpoints>("/api/v1/watch/namespaces/" + namespace + "/endpoints", this._kc)
            : watchListAsObservable<k8s.IoK8sApiCoreV1Endpoints>("/api/v1/watch/endpoints", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiCoreV1Event>("/api/v1/watch/namespaces/" + namespace + "/events", this._kc)
            : watchListAsObservable<k8s.IoK8sApiCoreV1Event>("/api/v1/watch/events", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiCoreV1LimitRange>("/api/v1/watch/namespaces/" + namespace + "/limitranges", this._kc)
            : watchListAsObservable<k8s.IoK8sApiCoreV1LimitRange>("/api/v1/watch/limitranges", this._kc);
        },
      },
      Namespace: {
        list: () => {
          return listAsObservable(this.core.v1.client().listCoreV1Namespace());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiCoreV1Namespace>("/api/v1/watch/namespaces", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiCoreV1PersistentVolumeClaim>("/api/v1/watch/namespaces/" + namespace + "/persistentvolumeclaims", this._kc)
            : watchListAsObservable<k8s.IoK8sApiCoreV1PersistentVolumeClaim>("/api/v1/watch/persistentvolumeclaims", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiCoreV1Pod>("/api/v1/watch/namespaces/" + namespace + "/pods", this._kc)
            : watchListAsObservable<k8s.IoK8sApiCoreV1Pod>("/api/v1/watch/pods", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiCoreV1PodTemplate>("/api/v1/watch/namespaces/" + namespace + "/podtemplates", this._kc)
            : watchListAsObservable<k8s.IoK8sApiCoreV1PodTemplate>("/api/v1/watch/podtemplates", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiCoreV1ReplicationController>("/api/v1/watch/namespaces/" + namespace + "/replicationcontrollers", this._kc)
            : watchListAsObservable<k8s.IoK8sApiCoreV1ReplicationController>("/api/v1/watch/replicationcontrollers", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiCoreV1ResourceQuota>("/api/v1/watch/namespaces/" + namespace + "/resourcequotas", this._kc)
            : watchListAsObservable<k8s.IoK8sApiCoreV1ResourceQuota>("/api/v1/watch/resourcequotas", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiCoreV1Secret>("/api/v1/watch/namespaces/" + namespace + "/secrets", this._kc)
            : watchListAsObservable<k8s.IoK8sApiCoreV1Secret>("/api/v1/watch/secrets", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiCoreV1ServiceAccount>("/api/v1/watch/namespaces/" + namespace + "/serviceaccounts", this._kc)
            : watchListAsObservable<k8s.IoK8sApiCoreV1ServiceAccount>("/api/v1/watch/serviceaccounts", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiCoreV1Service>("/api/v1/watch/namespaces/" + namespace + "/services", this._kc)
            : watchListAsObservable<k8s.IoK8sApiCoreV1Service>("/api/v1/watch/services", this._kc);
        },
      },
      Node: {
        list: () => {
          return listAsObservable(this.core.v1.client().listCoreV1Node());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiCoreV1Node>("/api/v1/watch/nodes", this._kc);
        },
      },
      PersistentVolume: {
        list: () => {
          return listAsObservable(this.core.v1.client().listCoreV1PersistentVolume());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiCoreV1PersistentVolume>("/api/v1/watch/persistentvolumes", this._kc);
        },
      },

    },

  };
  public admissionregistration = {
    v1alpha1: {
      client: () =>
        <k8s.AdmissionregistrationV1alpha1Api>fromKubeConfig(this._kc, k8s.AdmissionregistrationV1alpha1Api),

      InitializerConfiguration: {
        list: () => {
          return listAsObservable(this.admissionregistration.v1alpha1.client().listAdmissionregistrationV1alpha1InitializerConfiguration());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiAdmissionregistrationV1alpha1InitializerConfiguration>("/apis/admissionregistration.k8s.io/v1alpha1/watch/initializerconfigurations", this._kc);
        },
      },

    },
    v1beta1: {
      client: () =>
        <k8s.AdmissionregistrationV1beta1Api>fromKubeConfig(this._kc, k8s.AdmissionregistrationV1beta1Api),

      MutatingWebhookConfiguration: {
        list: () => {
          return listAsObservable(this.admissionregistration.v1beta1.client().listAdmissionregistrationV1beta1MutatingWebhookConfiguration());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiAdmissionregistrationV1beta1MutatingWebhookConfiguration>("/apis/admissionregistration.k8s.io/v1beta1/watch/mutatingwebhookconfigurations", this._kc);
        },
      },
      ValidatingWebhookConfiguration: {
        list: () => {
          return listAsObservable(this.admissionregistration.v1beta1.client().listAdmissionregistrationV1beta1ValidatingWebhookConfiguration());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiAdmissionregistrationV1beta1ValidatingWebhookConfiguration>("/apis/admissionregistration.k8s.io/v1beta1/watch/validatingwebhookconfigurations", this._kc);
        },
      },

    },

  };
  public apiextensions = {
    v1beta1: {
      client: () =>
        <k8s.ApiextensionsV1beta1Api>fromKubeConfig(this._kc, k8s.ApiextensionsV1beta1Api),

      CustomResourceDefinition: {
        list: () => {
          return listAsObservable(this.apiextensions.v1beta1.client().listApiextensionsV1beta1CustomResourceDefinition());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiextensionsApiserverPkgApisApiextensionsV1beta1CustomResourceDefinition>("/apis/apiextensions.k8s.io/v1beta1/watch/customresourcedefinitions", this._kc);
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
        watch: () => {
          return watchListAsObservable<k8s.IoK8sKubeAggregatorPkgApisApiregistrationV1beta1APIService>("/apis/apiregistration.k8s.io/v1beta1/watch/apiservices", this._kc);
        },
      },

    },

  };
  public apps = {
    v1: {
      client: () =>
        <k8s.AppsV1Api>fromKubeConfig(this._kc, k8s.AppsV1Api),

      ControllerRevision: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1.client().listAppsV1NamespacedControllerRevision(namespace)
              : this.apps.v1.client().listAppsV1ControllerRevisionForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAppsV1ControllerRevision>("/apis/apps/v1/watch/namespaces/" + namespace + "/controllerrevisions", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAppsV1ControllerRevision>("/apis/apps/v1/watch/controllerrevisions", this._kc);
        },
      },
      DaemonSet: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1.client().listAppsV1NamespacedDaemonSet(namespace)
              : this.apps.v1.client().listAppsV1DaemonSetForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAppsV1DaemonSet>("/apis/apps/v1/watch/namespaces/" + namespace + "/daemonsets", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAppsV1DaemonSet>("/apis/apps/v1/watch/daemonsets", this._kc);
        },
      },
      Deployment: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1.client().listAppsV1NamespacedDeployment(namespace)
              : this.apps.v1.client().listAppsV1DeploymentForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAppsV1Deployment>("/apis/apps/v1/watch/namespaces/" + namespace + "/deployments", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAppsV1Deployment>("/apis/apps/v1/watch/deployments", this._kc);
        },
      },
      ReplicaSet: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1.client().listAppsV1NamespacedReplicaSet(namespace)
              : this.apps.v1.client().listAppsV1ReplicaSetForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAppsV1ReplicaSet>("/apis/apps/v1/watch/namespaces/" + namespace + "/replicasets", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAppsV1ReplicaSet>("/apis/apps/v1/watch/replicasets", this._kc);
        },
      },
      StatefulSet: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1.client().listAppsV1NamespacedStatefulSet(namespace)
              : this.apps.v1.client().listAppsV1StatefulSetForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAppsV1StatefulSet>("/apis/apps/v1/watch/namespaces/" + namespace + "/statefulsets", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAppsV1StatefulSet>("/apis/apps/v1/watch/statefulsets", this._kc);
        },
      },

    },
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAppsV1beta1ControllerRevision>("/apis/apps/v1beta1/watch/namespaces/" + namespace + "/controllerrevisions", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAppsV1beta1ControllerRevision>("/apis/apps/v1beta1/watch/controllerrevisions", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAppsV1beta1Deployment>("/apis/apps/v1beta1/watch/namespaces/" + namespace + "/deployments", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAppsV1beta1Deployment>("/apis/apps/v1beta1/watch/deployments", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAppsV1beta1StatefulSet>("/apis/apps/v1beta1/watch/namespaces/" + namespace + "/statefulsets", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAppsV1beta1StatefulSet>("/apis/apps/v1beta1/watch/statefulsets", this._kc);
        },
      },

    },
    v1beta2: {
      client: () =>
        <k8s.AppsV1beta2Api>fromKubeConfig(this._kc, k8s.AppsV1beta2Api),

      ControllerRevision: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1beta2.client().listAppsV1beta2NamespacedControllerRevision(namespace)
              : this.apps.v1beta2.client().listAppsV1beta2ControllerRevisionForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAppsV1beta2ControllerRevision>("/apis/apps/v1beta2/watch/namespaces/" + namespace + "/controllerrevisions", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAppsV1beta2ControllerRevision>("/apis/apps/v1beta2/watch/controllerrevisions", this._kc);
        },
      },
      DaemonSet: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1beta2.client().listAppsV1beta2NamespacedDaemonSet(namespace)
              : this.apps.v1beta2.client().listAppsV1beta2DaemonSetForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAppsV1beta2DaemonSet>("/apis/apps/v1beta2/watch/namespaces/" + namespace + "/daemonsets", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAppsV1beta2DaemonSet>("/apis/apps/v1beta2/watch/daemonsets", this._kc);
        },
      },
      Deployment: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1beta2.client().listAppsV1beta2NamespacedDeployment(namespace)
              : this.apps.v1beta2.client().listAppsV1beta2DeploymentForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAppsV1beta2Deployment>("/apis/apps/v1beta2/watch/namespaces/" + namespace + "/deployments", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAppsV1beta2Deployment>("/apis/apps/v1beta2/watch/deployments", this._kc);
        },
      },
      ReplicaSet: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1beta2.client().listAppsV1beta2NamespacedReplicaSet(namespace)
              : this.apps.v1beta2.client().listAppsV1beta2ReplicaSetForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAppsV1beta2ReplicaSet>("/apis/apps/v1beta2/watch/namespaces/" + namespace + "/replicasets", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAppsV1beta2ReplicaSet>("/apis/apps/v1beta2/watch/replicasets", this._kc);
        },
      },
      StatefulSet: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.apps.v1beta2.client().listAppsV1beta2NamespacedStatefulSet(namespace)
              : this.apps.v1beta2.client().listAppsV1beta2StatefulSetForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAppsV1beta2StatefulSet>("/apis/apps/v1beta2/watch/namespaces/" + namespace + "/statefulsets", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAppsV1beta2StatefulSet>("/apis/apps/v1beta2/watch/statefulsets", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAutoscalingV1HorizontalPodAutoscaler>("/apis/autoscaling/v1/watch/namespaces/" + namespace + "/horizontalpodautoscalers", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAutoscalingV1HorizontalPodAutoscaler>("/apis/autoscaling/v1/watch/horizontalpodautoscalers", this._kc);
        },
      },

    },
    v2beta1: {
      client: () =>
        <k8s.AutoscalingV2beta1Api>fromKubeConfig(this._kc, k8s.AutoscalingV2beta1Api),

      HorizontalPodAutoscaler: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.autoscaling.v2beta1.client().listAutoscalingV2beta1NamespacedHorizontalPodAutoscaler(namespace)
              : this.autoscaling.v2beta1.client().listAutoscalingV2beta1HorizontalPodAutoscalerForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiAutoscalingV2beta1HorizontalPodAutoscaler>("/apis/autoscaling/v2beta1/watch/namespaces/" + namespace + "/horizontalpodautoscalers", this._kc)
            : watchListAsObservable<k8s.IoK8sApiAutoscalingV2beta1HorizontalPodAutoscaler>("/apis/autoscaling/v2beta1/watch/horizontalpodautoscalers", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiBatchV1Job>("/apis/batch/v1/watch/namespaces/" + namespace + "/jobs", this._kc)
            : watchListAsObservable<k8s.IoK8sApiBatchV1Job>("/apis/batch/v1/watch/jobs", this._kc);
        },
      },

    },
    v1beta1: {
      client: () =>
        <k8s.BatchV1beta1Api>fromKubeConfig(this._kc, k8s.BatchV1beta1Api),

      CronJob: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.batch.v1beta1.client().listBatchV1beta1NamespacedCronJob(namespace)
              : this.batch.v1beta1.client().listBatchV1beta1CronJobForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiBatchV1beta1CronJob>("/apis/batch/v1beta1/watch/namespaces/" + namespace + "/cronjobs", this._kc)
            : watchListAsObservable<k8s.IoK8sApiBatchV1beta1CronJob>("/apis/batch/v1beta1/watch/cronjobs", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiBatchV2alpha1CronJob>("/apis/batch/v2alpha1/watch/namespaces/" + namespace + "/cronjobs", this._kc)
            : watchListAsObservable<k8s.IoK8sApiBatchV2alpha1CronJob>("/apis/batch/v2alpha1/watch/cronjobs", this._kc);
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
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiCertificatesV1beta1CertificateSigningRequest>("/apis/certificates.k8s.io/v1beta1/watch/certificatesigningrequests", this._kc);
        },
      },

    },

  };
  public events = {
    v1beta1: {
      client: () =>
        <k8s.EventsV1beta1Api>fromKubeConfig(this._kc, k8s.EventsV1beta1Api),

      Event: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.events.v1beta1.client().listEventsV1beta1NamespacedEvent(namespace)
              : this.events.v1beta1.client().listEventsV1beta1EventForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiEventsV1beta1Event>("/apis/events.k8s.io/v1beta1/watch/namespaces/" + namespace + "/events", this._kc)
            : watchListAsObservable<k8s.IoK8sApiEventsV1beta1Event>("/apis/events.k8s.io/v1beta1/watch/events", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiExtensionsV1beta1DaemonSet>("/apis/extensions/v1beta1/watch/namespaces/" + namespace + "/daemonsets", this._kc)
            : watchListAsObservable<k8s.IoK8sApiExtensionsV1beta1DaemonSet>("/apis/extensions/v1beta1/watch/daemonsets", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiExtensionsV1beta1Deployment>("/apis/extensions/v1beta1/watch/namespaces/" + namespace + "/deployments", this._kc)
            : watchListAsObservable<k8s.IoK8sApiExtensionsV1beta1Deployment>("/apis/extensions/v1beta1/watch/deployments", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiExtensionsV1beta1Ingress>("/apis/extensions/v1beta1/watch/namespaces/" + namespace + "/ingresses", this._kc)
            : watchListAsObservable<k8s.IoK8sApiExtensionsV1beta1Ingress>("/apis/extensions/v1beta1/watch/ingresses", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiExtensionsV1beta1NetworkPolicy>("/apis/extensions/v1beta1/watch/namespaces/" + namespace + "/networkpolicies", this._kc)
            : watchListAsObservable<k8s.IoK8sApiExtensionsV1beta1NetworkPolicy>("/apis/extensions/v1beta1/watch/networkpolicies", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiExtensionsV1beta1ReplicaSet>("/apis/extensions/v1beta1/watch/namespaces/" + namespace + "/replicasets", this._kc)
            : watchListAsObservable<k8s.IoK8sApiExtensionsV1beta1ReplicaSet>("/apis/extensions/v1beta1/watch/replicasets", this._kc);
        },
      },
      PodSecurityPolicy: {
        list: () => {
          return listAsObservable(this.extensions.v1beta1.client().listExtensionsV1beta1PodSecurityPolicy());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiExtensionsV1beta1PodSecurityPolicy>("/apis/extensions/v1beta1/watch/podsecuritypolicies", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiNetworkingV1NetworkPolicy>("/apis/networking.k8s.io/v1/watch/namespaces/" + namespace + "/networkpolicies", this._kc)
            : watchListAsObservable<k8s.IoK8sApiNetworkingV1NetworkPolicy>("/apis/networking.k8s.io/v1/watch/networkpolicies", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiPolicyV1beta1PodDisruptionBudget>("/apis/policy/v1beta1/watch/namespaces/" + namespace + "/poddisruptionbudgets", this._kc)
            : watchListAsObservable<k8s.IoK8sApiPolicyV1beta1PodDisruptionBudget>("/apis/policy/v1beta1/watch/poddisruptionbudgets", this._kc);
        },
      },

    },

  };
  public rbacAuthorization = {
    v1: {
      client: () =>
        <k8s.RbacAuthorizationV1Api>fromKubeConfig(this._kc, k8s.RbacAuthorizationV1Api),

      ClusterRoleBinding: {
        list: () => {
          return listAsObservable(this.rbacAuthorization.v1.client().listRbacAuthorizationV1ClusterRoleBinding());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiRbacV1ClusterRoleBinding>("/apis/rbac.authorization.k8s.io/v1/watch/clusterrolebindings", this._kc);
        },
      },
      ClusterRole: {
        list: () => {
          return listAsObservable(this.rbacAuthorization.v1.client().listRbacAuthorizationV1ClusterRole());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiRbacV1ClusterRole>("/apis/rbac.authorization.k8s.io/v1/watch/clusterroles", this._kc);
        },
      },
      RoleBinding: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.rbacAuthorization.v1.client().listRbacAuthorizationV1NamespacedRoleBinding(namespace)
              : this.rbacAuthorization.v1.client().listRbacAuthorizationV1RoleBindingForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiRbacV1RoleBinding>("/apis/rbac.authorization.k8s.io/v1/watch/namespaces/" + namespace + "/rolebindings", this._kc)
            : watchListAsObservable<k8s.IoK8sApiRbacV1RoleBinding>("/apis/rbac.authorization.k8s.io/v1/watch/rolebindings", this._kc);
        },
      },
      Role: {
        list: (namespace?: string) => {
          return listAsObservable(
            namespace
              ? this.rbacAuthorization.v1.client().listRbacAuthorizationV1NamespacedRole(namespace)
              : this.rbacAuthorization.v1.client().listRbacAuthorizationV1RoleForAllNamespaces()
          );
        },
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiRbacV1Role>("/apis/rbac.authorization.k8s.io/v1/watch/namespaces/" + namespace + "/roles", this._kc)
            : watchListAsObservable<k8s.IoK8sApiRbacV1Role>("/apis/rbac.authorization.k8s.io/v1/watch/roles", this._kc);
        },
      },

    },
    v1alpha1: {
      client: () =>
        <k8s.RbacAuthorizationV1alpha1Api>fromKubeConfig(this._kc, k8s.RbacAuthorizationV1alpha1Api),

      ClusterRoleBinding: {
        list: () => {
          return listAsObservable(this.rbacAuthorization.v1alpha1.client().listRbacAuthorizationV1alpha1ClusterRoleBinding());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiRbacV1alpha1ClusterRoleBinding>("/apis/rbac.authorization.k8s.io/v1alpha1/watch/clusterrolebindings", this._kc);
        },
      },
      ClusterRole: {
        list: () => {
          return listAsObservable(this.rbacAuthorization.v1alpha1.client().listRbacAuthorizationV1alpha1ClusterRole());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiRbacV1alpha1ClusterRole>("/apis/rbac.authorization.k8s.io/v1alpha1/watch/clusterroles", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiRbacV1alpha1RoleBinding>("/apis/rbac.authorization.k8s.io/v1alpha1/watch/namespaces/" + namespace + "/rolebindings", this._kc)
            : watchListAsObservable<k8s.IoK8sApiRbacV1alpha1RoleBinding>("/apis/rbac.authorization.k8s.io/v1alpha1/watch/rolebindings", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiRbacV1alpha1Role>("/apis/rbac.authorization.k8s.io/v1alpha1/watch/namespaces/" + namespace + "/roles", this._kc)
            : watchListAsObservable<k8s.IoK8sApiRbacV1alpha1Role>("/apis/rbac.authorization.k8s.io/v1alpha1/watch/roles", this._kc);
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
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiRbacV1beta1ClusterRoleBinding>("/apis/rbac.authorization.k8s.io/v1beta1/watch/clusterrolebindings", this._kc);
        },
      },
      ClusterRole: {
        list: () => {
          return listAsObservable(this.rbacAuthorization.v1beta1.client().listRbacAuthorizationV1beta1ClusterRole());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiRbacV1beta1ClusterRole>("/apis/rbac.authorization.k8s.io/v1beta1/watch/clusterroles", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiRbacV1beta1RoleBinding>("/apis/rbac.authorization.k8s.io/v1beta1/watch/namespaces/" + namespace + "/rolebindings", this._kc)
            : watchListAsObservable<k8s.IoK8sApiRbacV1beta1RoleBinding>("/apis/rbac.authorization.k8s.io/v1beta1/watch/rolebindings", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiRbacV1beta1Role>("/apis/rbac.authorization.k8s.io/v1beta1/watch/namespaces/" + namespace + "/roles", this._kc)
            : watchListAsObservable<k8s.IoK8sApiRbacV1beta1Role>("/apis/rbac.authorization.k8s.io/v1beta1/watch/roles", this._kc);
        },
      },

    },

  };
  public scheduling = {
    v1alpha1: {
      client: () =>
        <k8s.SchedulingV1alpha1Api>fromKubeConfig(this._kc, k8s.SchedulingV1alpha1Api),

      PriorityClass: {
        list: () => {
          return listAsObservable(this.scheduling.v1alpha1.client().listSchedulingV1alpha1PriorityClass());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiSchedulingV1alpha1PriorityClass>("/apis/scheduling.k8s.io/v1alpha1/watch/priorityclasses", this._kc);
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
        watch: (namespace?: string) => {
          return namespace
            ? watchListAsObservable<k8s.IoK8sApiSettingsV1alpha1PodPreset>("/apis/settings.k8s.io/v1alpha1/watch/namespaces/" + namespace + "/podpresets", this._kc)
            : watchListAsObservable<k8s.IoK8sApiSettingsV1alpha1PodPreset>("/apis/settings.k8s.io/v1alpha1/watch/podpresets", this._kc);
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
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiStorageV1StorageClass>("/apis/storage.k8s.io/v1/watch/storageclasses", this._kc);
        },
      },

    },
    v1alpha1: {
      client: () =>
        <k8s.StorageV1alpha1Api>fromKubeConfig(this._kc, k8s.StorageV1alpha1Api),

      VolumeAttachment: {
        list: () => {
          return listAsObservable(this.storage.v1alpha1.client().listStorageV1alpha1VolumeAttachment());
        },
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiStorageV1alpha1VolumeAttachment>("/apis/storage.k8s.io/v1alpha1/watch/volumeattachments", this._kc);
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
        watch: () => {
          return watchListAsObservable<k8s.IoK8sApiStorageV1beta1StorageClass>("/apis/storage.k8s.io/v1beta1/watch/storageclasses", this._kc);
        },
      },

    },

  };
}

type Listable<T> = {items: T[]}
export type WatchEvent<T> = {object: T; type: "ADDED" | "MODIFIED" | "DELETED";};
type ApiResponseObj<T> = {response: http.ClientResponse; body: T;};
type ApiResponseList<T> = {response: http.ClientResponse; body: Listable<T>;};
type ApiResponseWatchList<T> = {response: http.ClientResponse; body: WatchEvent<T>;};

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

const watchListAsObservable = <T>(
  watchPath: string, kc: k8s.KubeConfig,
): rx.Observable<WatchEvent<T>> => {
  const stream = new byline.LineStream();
  const watch = new rx.Subject<WatchEvent<T>>();
  stream.on('data', (data: any) => {
    let obj = null;
    if (data instanceof Buffer) {
      obj = JSON.parse(data.toString());
    } else {
      obj = JSON.parse(data);
    }
    if (obj['type'] && obj['object']) {
      watch.next(obj);
    } else {
      watch.error(`Unexpected object in watch list: ${obj}`);
    }
  });

  //
  // Set up request
  //

  const queryParams = {
    watch: true
  };
  const headerParams: any = {};

  const requestOptions: request.Options = {
    method: 'GET',
    qs: queryParams,
    headers: headerParams,
    uri: kc.getCurrentCluster().server + watchPath,
    useQuerystring: true,
    json: true
  };
  kc.applyToRequest(requestOptions);

  //
  // Send request, pipe results into the Rx subject.
  //

  let req = request(requestOptions, (error, /*response, body*/) => {
    if (error) {
      watch.error(error);
    }
    watch.complete();
  });
  req.pipe(stream);

  // Return Rx subject.
  return watch;
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

