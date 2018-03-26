import * as k8s from '@carbonql/kubernetes-client-node';
import * as client from './client';
import * as query from 'rxjs/Rx';
import * as syncQuery from 'linq';

export type Transform<TIn, TOut=TIn> = (ti: TIn) => TOut;
export type Filter<TIn> = (ti: TIn) => boolean;

export const merge = <TIn>(makeRight: (o: TIn) => any): Transform<TIn> => {
  return left => {
    Object.assign(left, makeRight(left));
    return left;
  }
}

export const doTransform = <TIn>(...doThese: ((o: TIn) => void)[]): Transform<TIn> => {
  return tin => {
    doThese.forEach(doThis => doThis(tin));
    return tin;
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
      ): k8s.IoK8sApiCoreV1ConfigMap => {
        return <k8s.IoK8sApiCoreV1ConfigMap>{
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
        port?: number | k8s.IoK8sApiCoreV1ContainerPort,
      ): k8s.IoK8sApiCoreV1Container => {
        const c = <k8s.IoK8sApiCoreV1Container>{
          name: name,
          image: image,
        };

        if (port) {
          c.ports = util.makeContainerPorts(port);
        }

        return c;
      }

      //
      // Verbs.
      //

      export const addEnv = (
        name: string,
        value: string,
      ): Transform<k8s.IoK8sApiCoreV1Container> =>
        doTransform(c => {
          const envVar = <k8s.IoK8sApiCoreV1EnvVar>{
            name: name,
            value: value,
          };

          if (c.env) {
            c.env.push(envVar);
          } else {
            c.env = [envVar];
          }
        })

      export const addEnvFromSecret = (
        name: string,
        secretKeyName: string,
        secretKey: string,
      ): Transform<k8s.IoK8sApiCoreV1Container> =>
        doTransform(c => {
          const secretRef = <k8s.IoK8sApiCoreV1EnvVar>{
            name: name,
            valueFrom: {
              secretKeyRef: {
                name: secretKeyName,
                key: secretKey,
              }
            }
          };

          if (c.env) {
            c.env.push(secretRef);
          } else {
            c.env = [secretRef];
          }
        });

      export const toPod = (
        name: string,
      ): Transform<k8s.IoK8sApiCoreV1Container | k8s.IoK8sApiCoreV1Container[], k8s.IoK8sApiCoreV1Pod> => {
        return containers => {
          if (!Array.isArray(containers)) {
            containers = [containers];
          }

          return pod.make(name, containers);
        }
      }

      export const deploy = (
        replicas = 1,
        deploymentName?: string,
        appLabels?: Labels,
      ): Transform<k8s.IoK8sApiCoreV1Container, k8s.IoK8sApiAppsV1beta1Deployment> => {
        return c => {
          if (!deploymentName) {
            deploymentName = c.name;
          }

          if (!appLabels) {
            appLabels = {app: deploymentName};
          }

          return apps.v1beta1.deployment.make(deploymentName, appLabels, c, replicas);
        }
      }
    }

    export namespace persistentVolume {
      export type AccessModeTypes = "ReadWriteOnce" | "ReadOnlyMany" | "ReadWriteMany";

      //
      // Constructors.
      //

      export const make = (
        name: string,
        storageCapacity: string,
        accessModes: AccessModeTypes[] = ["ReadWriteOnce"],
        labels?: Labels,
      ): k8s.IoK8sApiCoreV1PersistentVolume => {
        const v = <k8s.IoK8sApiCoreV1PersistentVolume><object>{
          apiVersion: "v1",
          kind: "PersistentVolume",
          metadata: {
            name: name,
          },
          spec: {
            accessModes: accessModes,
            capacity: <{ [key: string]: string; }>{
              storage: storageCapacity,
            },
          }
        };

        if (labels) {
          v.metadata.labels = labels;
        }

        return v;
      }

      // TODO:
      //   * mountOptions
      //   * persistentVolumeReclaimPolicy
      //   * storageClassName

      export const configureAsHostPathVolume = (
        path: string,
      ): Transform<k8s.IoK8sApiCoreV1PersistentVolume> =>
        doTransform(v => {
          v.spec.hostPath = <k8s.IoK8sApiCoreV1HostPathVolumeSource>{path: path};
        });

      export const configureAsAwsElasticBlockStore = (
        blockStoreName: string,
        fsType: string = "ext4",
        readOnly: boolean = false,
        partition?: number,
      ): Transform<k8s.IoK8sApiCoreV1PersistentVolume> =>
        doTransform(v => {
          v.spec.awsElasticBlockStore = <k8s.IoK8sApiCoreV1AWSElasticBlockStoreVolumeSource>{
            fsType: fsType,
            readOnly: readOnly,
            volumeID: blockStoreName,
          };

          if (partition) {
            v.spec.awsElasticBlockStore.partition = partition;
          }
        });

      export const configureAsGcePersistentDisk = (
        diskName: string,
        fsType: string = "ext4",
        partition?: number,
        readOnly: boolean = false,
      ): Transform<k8s.IoK8sApiCoreV1PersistentVolume> =>
        doTransform(v => {
          v.spec.gcePersistentDisk = <k8s.IoK8sApiCoreV1GCEPersistentDiskVolumeSource>{
            fsType: fsType,
            readOnly: readOnly,
            pdName: diskName,
          };

          if (partition) {
            v.spec.gcePersistentDisk.partition = partition;
          }
        });
    }

    export namespace persistentVolumeClaim {
      //
      // Constructors.
      //

      export const make = (
        claimName: string,
        storageRequest: string,
        accessModes: persistentVolume.AccessModeTypes[] = ["ReadWriteOnce"],
        labels: Labels = {app: claimName}
      ): k8s.IoK8sApiCoreV1PersistentVolumeClaim => {
        return <k8s.IoK8sApiCoreV1PersistentVolumeClaim><object>{
          apiVersion: "v1",
          kind: "PersistentVolumeClaim",
          metadata: {
            name: claimName,
            labels: labels
          },
          spec: {
            accessModes: accessModes,
            resources: {
              requests: <{ [key: string]: string; }>{
                storage: storageRequest,
              }
            }
          }
        };
      }
    }

    export namespace pod {
      //
      // Constructors.
      //

      export const make = (
        name: string,
        containers: k8s.IoK8sApiCoreV1Container | k8s.IoK8sApiCoreV1Container[],
        appLabels: Labels = {app: name},
      ): k8s.IoK8sApiCoreV1Pod => {
        if (!Array.isArray(containers)) {
          containers = [containers];
        }

        return <k8s.IoK8sApiCoreV1Pod>{
          apiVersion: "v1",
          kind: "Pod",
          metadata: {
            name: name,
            labels: appLabels,
          },
          spec: {
            containers: containers,
          }
        };
      }

      //
      // Utilities.
      //

      export const transformContainers = (
        t: Transform<k8s.IoK8sApiCoreV1Container>,
        filter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
      ): Transform<k8s.IoK8sApiCoreV1Pod> => {
        return doTransform(p => util.v1.podSpec.transformContainers(t, filter)(p.spec));
      }

      //
      // Verbs.
      //

      export const addVolume = (
        v: k8s.IoK8sApiCoreV1Volume,
        mountPath: string,
        readOnly = false,
        subPath?: string,
        mountFilter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
      ): Transform<k8s.IoK8sApiCoreV1Pod> =>
        doTransform(p =>
          util.v1.podSpec.addVolume(
            v, mountPath, readOnly, subPath, mountFilter
          )(p.spec));

      export const addMount = (
        volumeName: string,
        mountPath: string,
        readOnly = false,
        subPath?: string,
        mountFilter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
      ): Transform<k8s.IoK8sApiCoreV1Pod> =>
        doTransform(p =>
          util.v1.podSpec.addMount(
            volumeName, mountPath, readOnly, subPath, mountFilter
          )(p.spec));

      export const deploy = (
        replicas = 1,
        deploymentName?: string,
        appLabels?: Labels,
      ): Transform<k8s.IoK8sApiCoreV1Pod, k8s.IoK8sApiAppsV1beta1Deployment> => {
        return p => {
          if (!deploymentName) {
            deploymentName = p.metadata.name;
          }

          if (!appLabels) {
            appLabels = {app: deploymentName};
          }

          return apps.v1beta1.deployment.make(deploymentName, appLabels, p, replicas);
        }
      }

      export const addConfigData = (
        data: { [key: string]: string },
        mountPath: string,
        configMapName?: string,
        mountFilter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
      ): Transform<k8s.IoK8sApiCoreV1Pod, k8s.IoK8sApiCoreV1ConfigMap> => {
        return p => {
          if (!configMapName) {
            configMapName = p.metadata.name;
          }
          return util.v1.podSpec.addConfigData(
            data, mountPath, configMapName, undefined, mountFilter,
          )(p.spec);
        }
      }

      export const claimPersistentVolume = (
        pvClaim: string | k8s.IoK8sApiCoreV1PersistentVolume,
        mountPath: string,
        storageRequest: string,
        volumeName?: string,
        readOnly = false,
        subPath?: string,
        accessModes: core.v1.persistentVolume.AccessModeTypes[] = ["ReadWriteOnce"],
        mountFilter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
      ): Transform<k8s.IoK8sApiCoreV1Pod, k8s.IoK8sApiCoreV1PersistentVolumeClaim> =>
        p =>
          util.v1.podSpec.claimPersistentVolume(
            pvClaim, mountPath, storageRequest, volumeName, readOnly,subPath,
            accessModes, mountFilter
          )(p.spec);

      export const getLogs = (
        c: client.Client, pod: k8s.IoK8sApiCoreV1Pod,
      ): query.Observable<{pod: k8s.IoK8sApiCoreV1Pod, logs: string}> =>
        c.core.v1.Pod
          .logs(pod.metadata.name, pod.metadata.namespace)
          .map(logs => logs == null ? {pod, logs: ""} : {pod, logs})
    }

    export namespace service {
      const stub = (
        name: string,
        labels?: Labels,
      ): k8s.IoK8sApiCoreV1Service => {
        const svc = <k8s.IoK8sApiCoreV1Service>{
          "kind": "Service",
          "apiVersion": "v1",
          "metadata": {
            name: name,
          },
          "spec": {}
        };
        if (labels) {
          svc.metadata.labels = labels;
        }

        return svc;
      }

      //
      // Constructors.
      //

      /**
       * Defines a service that uses a cluster-internal IP address. This service
       * will be directly reachable only from inside the cluster.
       *
       * @param  {string} name Name to give the service
       * @param  {number|k8s.IoK8sApiCoreV1ServicePort|k8s.IoK8sApiCoreV1ServicePort[]} ports A port or
       * list of ports for the service to expose. If a list of ports is
       * provided, each requires names to disambiguate the accompanying endpoint
       * objects.
       * @param  {Labels} selector Label selector the service will use to
       * determine which pods to send traffic to
       * @param  {Labels={app:name}} labels Labels to give the service itself
       * @returns The cluster-private service
       */
      export const makeClusterIp = (
        name: string,
        ports: number | k8s.IoK8sApiCoreV1ServicePort | k8s.IoK8sApiCoreV1ServicePort[],
        selector: Labels,
        labels: Labels = {app: name},
      ): k8s.IoK8sApiCoreV1Service => {
        const svc = stub(name, labels);
        return merge<k8s.IoK8sApiCoreV1Service>(_ => ({
          spec: <k8s.IoK8sApiCoreV1ServiceSpec>{
            type: "ClusterIP",
            ports: util.makeServicePorts(ports),
            selector: selector,
          }
        }))(svc);
      }

      /**
       * Defines a service that is exposed externally using a cloud provider's
       * load balancer implementation.
       *
       * This function additionally allows users to customize how kube-proxy
       * routes traffic to pods, using the optional `externalTrafficPolicy`.
       * That is, when the load balancer receives traffic, it distributes it to
       * kube-proxy (exposed at a cluster-assigned port on every node in the
       * cluster), which then passes the traffic to pods that satisfy the
       * service's selector. The `externalTrafficPolicy` setting allows users to
       * specify how this traffic is routed:
       *
       *   - If the value is "Cluster", kube-proxy is allowed to route traffic
       *     to pods matching the service's selector on any node in the cluster,
       *     but the client IP on the requests points at kube-proxy, rather than
       *     the client from which the request originated.
       *   - If the value is "Local", the client IP is retained by the
       *     originator of the request (rather than being rewritten as it is in
       *     the case of "Cluster"), but the traffic can be routed to only one
       *     node with pods that match the service's selector, making it
       *     difficult to keep load balanced. (In this case, the system
       *     automatically sets up a `healthCheckNodePort` to guarantee that the
       *     kube-proxy the load balancer selects will contain at least one pod
       *     that matches the selector; kube-proxy then transparently routes
       *     traffic to those pods.)
       *
       * @param  {string} name Name to give the service
       * @param  {number|k8s.IoK8sApiCoreV1ServicePort|k8s.IoK8sApiCoreV1ServicePort[]} ports A port or
       * list of ports for the service to expose. If a list of ports is
       * provided, each requires names to disambiguate the accompanying endpoint
       * objects.
       * @param  {Labels} selector Label selector the service will use to
       * determine which pods to send traffic to
       * @param  {Labels={app:name}} labels Labels to give the service itself
       * @param  {string[]} loadBalancerSourceRanges? Range of IP addresses
       * allowed to access the load balancer. If the cloud provider does not
       * implement this, these values will be ignored.
       * @param  {"Local"|"Cluster"} externalTrafficPolicy? Allow the kube-proxy
       * daemon (running on every node) to route traffic only to pods on that
       * node ("Local"), or to pods on any node in the cluster ("Cluster"). See
       * above for more details.
       * @param  {string[]} externalIps? List of user-managed IP addresses
       * (i.e., addresses not managed by Kubernetes, including external IPs not
       * managed by Kubernetes) that will also accept traffic for this service.
       * For example, an external load balancer.
       * @returns The load balancer service
       */
      export const makeLoadBalancer = (
        name: string,
        ports: number | k8s.IoK8sApiCoreV1ServicePort | k8s.IoK8sApiCoreV1ServicePort[],
        selector: Labels,
        labels: Labels = {app: name},
        loadBalancerSourceRanges?: string[],
        externalTrafficPolicy?: "Local" | "Cluster",
        externalIps?: string[],
      ): k8s.IoK8sApiCoreV1Service => {
        let svc = stub(name, labels);

        if (externalIps) {
          svc.spec.externalIPs = externalIps;
        }

        svc = merge<k8s.IoK8sApiCoreV1Service>(_ => ({
          spec: <k8s.IoK8sApiCoreV1ServiceSpec>{
            type: "LoadBalancer",
            ports: util.makeServicePorts(ports),
            externalTrafficPolicy: externalTrafficPolicy,
            selector: selector,
          }
        }))(svc);
        svc = configureForExternalTraffic(externalTrafficPolicy, loadBalancerSourceRanges)(svc);

        return svc;
      }

      /**
       * Defines a service that directs traffic to an arbitrary domain that is
       * reachable by DNS (_e.g._, it is allowable to direct traffic to a domain
       * external to the Kubernetes clsuter). For example, if `externalName` is
       * set to `foo.example.com`, when a DNS request is sent to this service,
       * it will return `externalName` in a CNAME record, which the client can
       * then use to look up the IP address to send the traffic to.
       *
       * NOTE: Because it returns CNAME records, this service DOES NOT proxy
       * requests to the `externalName`.
       *
       * @param  {string} serviceName Name to give the service
       * @param  {string} externalName DNS-reachable name to direct traffic to
       * (_e.g._, `foo.example.com`).
       * @param  {Labels={app:name}} labels Labels to give the service itself
       * @returns The external name service
       */
      export const makeExternalName = (
        serviceName: string,
        externalName: string,
        labels: Labels = {app: serviceName},
      ): k8s.IoK8sApiCoreV1Service => {
        let svc = stub(serviceName, labels);
        svc = merge<k8s.IoK8sApiCoreV1Service>(_ => ({
          spec: <k8s.IoK8sApiCoreV1ServiceSpec>{
            type: "ExternalName",
            externalName: externalName,
          }
        }))(svc);

        return svc;
      }

      //
      // TODO:
      //   * Constructor for NodePort type.
      //   * Allow creation of service linked to specific endpoint objects.
      //

      //
      // Transformers.
      //

      /**
       * Set label selector the service uses to determine which pods to direct
       * traffic to.
       *
       * @param  {Labels} labels Labels to be used to select pods
       * @returns Transformer that sets labels in the in a service object
       */
      export const setSelector = (labels: Labels): Transform<k8s.IoK8sApiCoreV1Service> => {
        return doTransform(s => s.spec.selector = labels);
      }

      /**
       * Replace existing ports exposed by the service (if any), and set them
       * with the ports provided as argument.
       *
       * @param  {number|k8s.IoK8sApiCoreV1ServicePort|k8s.IoK8sApiCoreV1ServicePort[]} ports Ports to
       * replace the current service ports with
       * @returns Transformer that replaces the ports in a service object
       */
      export const setPorts = (
        ports: number | k8s.IoK8sApiCoreV1ServicePort | k8s.IoK8sApiCoreV1ServicePort[],
      ): Transform<k8s.IoK8sApiCoreV1Service> => {
        return doTransform(s => s.spec.ports = util.makeServicePorts(ports));
      }

      /**
       * Append some number of ports to the list of ports exposed by a service
       * (if any).
       *
       * @param  {number|k8s.IoK8sApiCoreV1ServicePort|k8s.IoK8sApiCoreV1ServicePort[]} ports Ports to
       * append to the existing ports
       * @returns Transformer that appends some number of ports to the existing
       * ports in a service object
       */
      export const appendPorts = (
        ports: number | k8s.IoK8sApiCoreV1ServicePort | k8s.IoK8sApiCoreV1ServicePort[],
      ): Transform<k8s.IoK8sApiCoreV1Service> => {
        return doTransform(s => {
          if (s.spec.ports) {
            s.spec.ports.concat(util.makeServicePorts(ports));
          } else {
            s.spec.ports = util.makeServicePorts(ports);
          }
        });
      }

      /**
       * Configure a service with type "LoadBalancer" for external traffic. This
       * includes specifying allowable IP source ranges for the load balancer to
       * accept, and a set of external IPs that we will allow the load balancer
       * to direct traffic to.
       *
       * This function additionally allows users to customize how kube-proxy
       * routes traffic to pods, using the optional `externalTrafficPolicy`.
       * That is, when the load balancer receives traffic, it distributes it to
       * kube-proxy (exposed at a cluster-assigned port on every node in the
       * cluster), which then passes the traffic to pods that satisfy the
       * service's selector. The `externalTrafficPolicy` setting allows users to
       * specify how this traffic is routed:
       *
       *   - If the value is "Cluster", kube-proxy is allowed to route traffic
       *     to pods matching the service's selector on any node in the cluster,
       *     but the client IP on the requests points at kube-proxy, rather than
       *     the client from which the request originated.
       *   - If the value is "Local", the client IP is retained by the
       *     originator of the request (rather than being rewritten as it is in
       *     the case of "Cluster"), but the traffic can be routed to only one
       *     node with pods that match the service's selector, making it
       *     difficult to keep load balanced. (In this case, the system
       *     automatically sets up a `healthCheckNodePort` to guarantee that the
       *     kube-proxy the load balancer selects will contain at least one pod
       *     that matches the selector; kube-proxy then transparently routes
       *     traffic to those pods.)
       *
       * @param  {"Local"|"Cluster"="Cluster"} externalTrafficPolicy Allow the
       * kube-proxy daemon (running on every node) to route traffic only to pods
       * on that node ("Local"), or to pods on any node in the cluster
       * ("Cluster"). See above for more details.
       * @param  {string[]} loadBalancerSourceRanges? Range of IP addresses
       * allowed to access the load balancer. If the cloud provider does not
       * implement this, these values will be ignored.
       * @param  {string[]} externalIps? List of user-managed IP addresses
       * (i.e., addresses not managed by Kubernetes, including external IPs not
       * managed by Kubernetes) that will also accept traffic for this service.
       * For example, an external load balancer.
       * @returns Transformer that configures the service for external traffic
       */
      export const configureForExternalTraffic = (
        externalTrafficPolicy: "Local" | "Cluster" = "Cluster",
        loadBalancerSourceRanges?: string[],
        externalIps?: string[],
      ): Transform<k8s.IoK8sApiCoreV1Service> => {
        return doTransform(s => {
          if (s.spec.type !== "LoadBalancer") {
            throw new Error("Can't configure external traffic on service whose type is not `LoadBalancer`");
          }

          s.spec.externalTrafficPolicy = externalTrafficPolicy;

          if (loadBalancerSourceRanges) {
            s.spec.loadBalancerSourceRanges = loadBalancerSourceRanges;
          }

          if (externalIps) {
            s.spec.externalIPs = externalIps;
          }
        });
      }

      export const getTargetedPods = (
        c: client.Client, service: k8s.IoK8sApiCoreV1Service
      ): query.Observable<{service: k8s.IoK8sApiCoreV1Service; pods: k8s.IoK8sApiCoreV1Pod[];}> => {
        const selector = service.spec.selector;
        // Service doesn't target any pods.
        if (selector == null) {
          return query.Observable.empty();
        }

        return c.core.v1.Pod
          .list("default")
          .filter(p => syncQuery
            .from(selector)
            .any(({key, value}) => p.metadata.labels && p.metadata.labels[key] != value))
          .toArray()
          .map(pods => {return {service, pods}})
      }
    }

    export namespace volume {
      export const makeConfigMap = (
        configMapName: string,
        volumeName?: string,
        defaultPermissions = 0o644,
        filesToInclude?: k8s.IoK8sApiCoreV1KeyToPath[],
        optional: boolean = false,
      ): k8s.IoK8sApiCoreV1Volume => {
        const v = <k8s.IoK8sApiCoreV1Volume>{
          name: volumeName ? volumeName : `${configMapName}-volume`,
          configMap: {
            name: configMapName,
            defaultMode: defaultPermissions,
          },
        };

        if (filesToInclude) {
          v.configMap.items = filesToInclude;
        }

        if (optional) {
          v.configMap.optional = optional;
        }

        return v;
      }

      // export const makeDownwardApi = (
      //   volumeName: string,
      //   defaultPermissions = 0o644,
      // ): k8s.IoK8sApiCoreV1Volume => {
      //   return <k8s.IoK8sApiCoreV1Volume>{
      //     name: volumeName,
      //     downwardAPI: {
      //       defaultMode: defaultPermissions,
      //     },
      //   };
      // }

      export const makeEmptyDir = (
        volumeName: string,
        storageMedium?: "" | "Memory",
        sizeLimit?: string,
      ): k8s.IoK8sApiCoreV1Volume => {
        const v = <k8s.IoK8sApiCoreV1Volume>{
          name: volumeName,
          emptyDir: {},
        };
        if (storageMedium) {
          v.emptyDir.medium = storageMedium;
        }

        if (sizeLimit) {
          v.emptyDir.sizeLimit = sizeLimit;
        }

        return v;
      }

      export const makeGitRepo = (
        volumeName: string,
        repository: string,
        revision: string,
        directory?: string,
      ): k8s.IoK8sApiCoreV1Volume => {
        const v = <k8s.IoK8sApiCoreV1Volume>{
          name: volumeName,
          gitRepo: {
            repository: repository,
            revision: revision,
          },
        };
        if (directory) {
          v.gitRepo.directory = directory;
        }

        return v;
      }

      export const makeHostPath = (
        volumeName: string,
        path: string,
      ): k8s.IoK8sApiCoreV1Volume => {
        const v = <k8s.IoK8sApiCoreV1Volume>{
          name: volumeName,
          hostPath: {
            path: path,
          },
        };

        return v;
      }

      export const makePersistentVolumeClaim = (
        claimName: string,
        volumeName?: string,
        readOnly?: boolean
      ): k8s.IoK8sApiCoreV1Volume => {
        const v = <k8s.IoK8sApiCoreV1Volume>{
          name: volumeName ? volumeName : `${claimName}-volume`,
          persistentVolumeClaim: {
            claimName: claimName,
          },
        };

        if (readOnly) {
          v.persistentVolumeClaim.readOnly = readOnly;
        }

        return v;
      }

      // export const makeProjected = (
      //   volumeName: string,
      // ): k8s.IoK8sApiCoreV1Volume => {
      //   return <k8s.IoK8sApiCoreV1Volume>{
      //     name: volumeName,
      //     projected: {},
      //   };
      // }

      export const makeSecret = (
        secretName: string,
        volumeName?: string,
        defaultPermissions = 0o644,
        keysToInclude?: k8s.IoK8sApiCoreV1KeyToPath[],
        optional: boolean = false,
      ): k8s.IoK8sApiCoreV1Volume => {
        const v = <k8s.IoK8sApiCoreV1Volume>{
          name: volumeName ? volumeName : `${secretName}-volume`,
          secret: {
            secretName: secretName,
            defaultMode: defaultPermissions,
          },
        };

        if (keysToInclude) {
          v.configMap.items = keysToInclude;
        }

        if (optional) {
          v.configMap.optional = optional;
        }

        return v;
      }
    }
  }
}

//
//
//

export namespace certificates {
  export namespace v1beta1 {
    export namespace certificateSigningRequest {
      export const getStatus = (
        csr: k8s.IoK8sApiCertificatesV1beta1CertificateSigningRequest,
      ): k8s.IoK8sApiCertificatesV1beta1CertificateSigningRequestCondition => {
        const pending = {
          type: "Pending",
          message: "Pending",
          reason: "Pending",
          lastUpdateTime: {}
        };
        if (csr.status.conditions == null) {
          return pending;
        }

        const conditions = csr.status.conditions
          .filter(cond => cond.type == "Approved" || cond.type == "Denied");

        return conditions.length > 0
          ? conditions[conditions.length-1]
          : pending;
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
      // Constructors.
      //

      export const make = (
        name: string,
        appLabels: Labels,
        app: k8s.IoK8sApiCoreV1Container | k8s.IoK8sApiCoreV1Container[] | k8s.IoK8sApiCoreV1Pod,
        replicas: number = 1,
        revisionHistoryLimit = 10,
      ): k8s.IoK8sApiAppsV1beta1Deployment => {
        let podSpec: k8s.IoK8sApiCoreV1PodSpec | null = null;
        if ((<any>app)["kind"] === "Pod") {
          podSpec = (<k8s.IoK8sApiCoreV1Pod><object>app).spec;
        } else if (Array.isArray(app)) {
          podSpec = <k8s.IoK8sApiCoreV1PodSpec>{containers: app};
        } else {
          podSpec = <k8s.IoK8sApiCoreV1PodSpec>{containers: [app]};
        }

        return <k8s.IoK8sApiAppsV1beta1Deployment>{
          apiVersion: "apps/v1beta2",
          kind: "Deployment",
          metadata: {
            name: name,
            labels: appLabels,
          },
          spec: {
            revisionHistoryLimit: revisionHistoryLimit,
            replicas: replicas,
            selector: {},
            template: {
              metadata: {
                labels: appLabels
              },
              spec: podSpec,
            }
          }
        };
      }

      //
      // Transformers.
      //

      export const configureLifecycle = (
        minReadySeconds?: number,
        progressDeadlineSeconds?: number,
      ): Transform<k8s.IoK8sApiAppsV1beta1Deployment> => {
        return doTransform(d => {
          if (minReadySeconds) {
            d.spec.minReadySeconds = minReadySeconds;
          }

          if (progressDeadlineSeconds) {
            d.spec.progressDeadlineSeconds = progressDeadlineSeconds;
          }
        });
      }

      export const setUpdateStrategyRecreate = (): Transform<k8s.IoK8sApiAppsV1beta1Deployment> => {
        return doTransform(d => {
          d.spec.strategy = <k8s.IoK8sApiAppsV1beta1DeploymentStrategy>{
            type: "Recreate",
          }
        });
      }

      export const setUpdateStrategyRolling = (
        maxSurge?: number | string,
        maxUnavailable?: number | string,
      ): Transform<k8s.IoK8sApiAppsV1beta1Deployment> => {
        return doTransform(d => {
          d.spec.strategy = <k8s.IoK8sApiAppsV1beta1DeploymentStrategy>{
            type: "RollingUpdate",
            rollingUpdate: {
              maxSurge: maxSurge,
              maxUnavailable: maxUnavailable,
            },
          };
        });
      }

      export namespace pod {
        export const transformContainers = (
          f: Transform<k8s.IoK8sApiCoreV1Container>,
          filter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
        ): Transform<DeploymentTypes> => {
          return doTransform(d =>
            util.v1.podSpec.transformContainers(f, filter)(d.spec.template.spec));
        }

        export const addVolume = (
          v: k8s.IoK8sApiCoreV1Volume,
          mountPath: string,
          readOnly = false,
          subPath?: string,
          mountFilter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
        ): Transform<k8s.IoK8sApiAppsV1beta1Deployment> =>
          doTransform(p =>
            util.v1.podSpec.addVolume(
              v, mountPath, readOnly, subPath, mountFilter
            )(p.spec.template.spec));

        export const addMount = (
          volumeName: string,
          mountPath: string,
          readOnly = false,
          subPath?: string,
          mountFilter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
        ): Transform<k8s.IoK8sApiAppsV1beta1Deployment> =>
          doTransform(p =>
            util.v1.podSpec.addMount(
              volumeName, mountPath, readOnly, subPath, mountFilter
            )(p.spec.template.spec));

        export const addConfigData = (
          data: { [key: string]: string },
          mountPath: string,
          configMapName?: string,
          mountFilter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
        ): Transform<DeploymentTypes, k8s.IoK8sApiCoreV1ConfigMap> => {
          return d => {
            if (!configMapName) {
              configMapName = d.metadata.name;
            }
            return util.v1.podSpec.addConfigData(
              data, mountPath, configMapName, undefined, mountFilter,
            )(d.spec.template.spec);
          }
        }

        export const claimPersistentVolume = (
          pvClaim: string | k8s.IoK8sApiCoreV1PersistentVolume,
          mountPath: string,
          storageRequest: string,
          volumeName?: string,
          readOnly = false,
          subPath?: string,
          accessModes: core.v1.persistentVolume.AccessModeTypes[] = ["ReadWriteOnce"],
          mountFilter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
        ): Transform<k8s.IoK8sApiAppsV1beta1Deployment, k8s.IoK8sApiCoreV1PersistentVolumeClaim> =>
          p =>
            util.v1.podSpec.claimPersistentVolume(
              pvClaim, mountPath, storageRequest, volumeName, readOnly, subPath,
              accessModes, mountFilter,
            )(p.spec.template.spec);
      }

      export const setAppLabels = (labels: Labels): Transform<DeploymentTypes> => {
        return doTransform(
          d => util.v1.metadata.setLabels(labels)(d.metadata),
          d => d.spec.template.metadata.labels = labels,
          d => d.spec.selector = <k8s.IoK8sApimachineryPkgApisMetaV1LabelSelector>{matchLabels: labels});
      }

      //
      // Verbs.
      //

      export const pause = (): Transform<k8s.IoK8sApiAppsV1beta1Deployment> => {
        return doTransform(d => d.spec.paused = true);
      }

      export const unpause = (): Transform<k8s.IoK8sApiAppsV1beta1Deployment> => {
        return doTransform(d => d.spec.paused = false);
      }

      export const scale = (replicas: number): Transform<k8s.IoK8sApiAppsV1beta1Deployment> => {
        return doTransform(d => d.spec.replicas = replicas);
      }

      //
      // TODO: autoscale
      //

      export const exposeWithLoadBalancer = (
        port: k8s.IoK8sApiCoreV1ServicePort | number,
        serviceName?: string
      ): Transform<DeploymentTypes, k8s.IoK8sApiCoreV1Service> => {
        return d => {
          const svc = core.v1.service.makeLoadBalancer(
            serviceName ? serviceName : d.metadata.name,
            util.makeServicePorts(port),
            d.spec.template.metadata.labels,
            d.metadata.labels,
          );

          return svc;
        }
      }

      export const exposeToCluster = (
        port: k8s.IoK8sApiCoreV1ServicePort | number,
        serviceName?: string
      ): Transform<DeploymentTypes, k8s.IoK8sApiCoreV1Service> => {
        return d => {
          const svc = core.v1.service.makeClusterIp(
            serviceName ? serviceName : d.metadata.name,
            util.makeServicePorts(port),
            d.spec.template.metadata.labels,
            d.metadata.labels,
          );

          return svc;
        }
      }

      export const getRevisionHistory = (
        c: client.Client, d: k8s.IoK8sApiAppsV1beta1Deployment,
      ): query.Observable<k8s.IoK8sApiExtensionsV1beta1ReplicaSet> => {
        return c.extensions.v1beta1.ReplicaSet
          .list("default")
          .filter(rs =>
            syncQuery
              .from(rs.metadata.ownerReferences)
              .where(oref => oref.name == d.metadata.name)
              .count() > 0)
          .toArray()
          .flatMap(rss => {
            const arr = syncQuery
              .from(rss)
              .orderBy(rs => rs.metadata.annotations["deployment.kubernetes.io/revision"])
              .toArray();
            return query.Observable.from(arr);
          });
      }
    }
  }
}

export namespace rbacAuthorization {
  export namespace v1beta1 {
    export namespace role {
      export const appliesTo = (
        role: k8s.IoK8sApiRbacV1beta1Role, apiGroup: string, resource: string,
      ): boolean =>
        syncQuery
          .from(role.rules)
          .any(rule =>
            syncQuery
              .from(rule.apiGroups)
              .any(currGroup => currGroup == apiGroup) &&
            syncQuery
              .from(rule.resources)
              .any(currRes => currRes == resource));
    }

    export namespace roleBinding {
      export const referencesRole = (
        binding: k8s.IoK8sApiRbacV1beta1RoleBinding, name: string,
      ): boolean =>
        binding.roleRef.kind == "Role" &&
        binding.roleRef.apiGroup == "rbac.authorization.k8s.io" &&
        binding.roleRef.name == name
    }
  }
}

//
// Private helpers.
//

namespace util {
  export const makeContainerPorts = (
    ports: number | k8s.IoK8sApiCoreV1ContainerPort | k8s.IoK8sApiCoreV1ContainerPort[],
  ): k8s.IoK8sApiCoreV1ContainerPort[] => {
    if (Array.isArray(ports)) {
      return ports;
    } else if (isFinite(<number>ports)) {
      return [<k8s.IoK8sApiCoreV1ContainerPort>{containerPort: ports}];
    }
    return [<k8s.IoK8sApiCoreV1ContainerPort>ports];
  }

  export const makeServicePorts = (
    ports: number | k8s.IoK8sApiCoreV1ServicePort | k8s.IoK8sApiCoreV1ServicePort[],
  ): k8s.IoK8sApiCoreV1ServicePort[] => {
    if (Array.isArray(ports)) {
      return ports;
    } else if (isFinite(<number>ports)) {
      return [<k8s.IoK8sApiCoreV1ServicePort><object>{port: ports, targetPort: ports}];
    }
    return [<k8s.IoK8sApiCoreV1ServicePort>ports];
  }

  export namespace v1 {
    export namespace metadata {
      export const setName = (name: string): Transform<k8s.IoK8sApimachineryPkgApisMetaV1ObjectMeta> => {
        return doTransform(m => m.name = name);
      }

      export const setNamespace = (namespace: string): Transform<k8s.IoK8sApimachineryPkgApisMetaV1ObjectMeta> => {
        return doTransform(m => m.namespace = namespace);
      }

      export const setAnnotations = (labels: Labels): Transform<k8s.IoK8sApimachineryPkgApisMetaV1ObjectMeta> => {
        return doTransform(m => m.annotations = labels)
      }

      export const mergeAnnotations = (labels: Labels): Transform<k8s.IoK8sApimachineryPkgApisMetaV1ObjectMeta> => {
        return doTransform(m =>
          m.annotations
            ? Object.assign(m.annotations, labels)
            : m.annotations = labels);
      }

      export const setLabels = (labels: Labels): Transform<k8s.IoK8sApimachineryPkgApisMetaV1ObjectMeta> => {
        return doTransform(m => m.labels = labels);
      }

      export const mergeLabels = (labels: Labels): Transform<k8s.IoK8sApimachineryPkgApisMetaV1ObjectMeta> => {
        return doTransform(m =>
          m.labels
            ? Object.assign(m.labels, labels)
            : m.labels = labels);
      }
    }

    export namespace podSpec {
      //
      // Utilities.
      //

      export const transformContainers = (
        t: Transform<k8s.IoK8sApiCoreV1Container>,
        filter: (c: k8s.IoK8sApiCoreV1Container) => boolean,
      ): Transform<k8s.IoK8sApiCoreV1PodSpec> => {
        return doTransform(spec => {
          const cs = [];
          for (const c of spec.containers) {
            if (filter(c)) {
              cs.push(t(c));
            } else {
              cs.push(c);
            }
          }

          spec.containers = cs;
        });
      }

      //
      // Verbs.
      //

      export const addVolume = (
        v: k8s.IoK8sApiCoreV1Volume,
        mountPath: string,
        readOnly = false,
        subPath?: string,
        mountFilter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
      ): Transform<k8s.IoK8sApiCoreV1PodSpec> => {
        return doTransform(
          doTransform<k8s.IoK8sApiCoreV1PodSpec>(p => {
            p.volumes = p.volumes || [];
            p.volumes.push(v);
          }),
          addMount(v.name, mountPath, readOnly, subPath, mountFilter),
        );
      }

      export const addMount = (
        volumeName: string,
        mountPath: string,
        readOnly = false,
        subPath?: string,
        mountFilter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
      ): Transform<k8s.IoK8sApiCoreV1PodSpec> => {
        const mount = <k8s.IoK8sApiCoreV1VolumeMount>{
          name: volumeName,
          mountPath: mountPath,
          readOnly: readOnly,
        };
        if (subPath) {
          mount.subPath = subPath;
        }
        return transformContainers(
          doTransform(c => {
            c.volumeMounts = c.volumeMounts || [];
            c.volumeMounts.push(mount);
          }),
          mountFilter);
      }

      export const addConfigData = (
        data: { [key: string]: string },
        mountPath: string,
        configMapName: string,
        configMapVolumeName?: string,
        mountFilter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
      ): Transform<k8s.IoK8sApiCoreV1PodSpec, k8s.IoK8sApiCoreV1ConfigMap> => {
        return p => {
          if (!configMapVolumeName) {
            configMapVolumeName = configMapName;
          }

          p = addVolume(
            <k8s.IoK8sApiCoreV1Volume>{
              name: configMapVolumeName,
              configMap: {
                name: configMapName,
              },
            },
            mountPath,
            true,
            undefined,
            mountFilter,
          )(p);

          return core.v1.configMap.make(configMapName, data);
        }
      }

      export const claimPersistentVolume = (
        pvClaim: string | k8s.IoK8sApiCoreV1PersistentVolume,
        mountPath: string,
        storageRequest: string,
        volumeName?: string,
        readOnly = false,
        subPath?: string,
        accessModes: core.v1.persistentVolume.AccessModeTypes[] = ["ReadWriteOnce"],
        mountFilter: Filter<k8s.IoK8sApiCoreV1Container> = (_: k8s.IoK8sApiCoreV1Container) => true,
      ): Transform<k8s.IoK8sApiCoreV1PodSpec, k8s.IoK8sApiCoreV1PersistentVolumeClaim> => {
        return p => {
          const pvClaimName =
            typeof pvClaim === 'string' || pvClaim instanceof String
            ? <string>pvClaim
            : pvClaim.metadata.name;

          if (!volumeName) {
            volumeName = `${pvClaimName}-volume`;
          }

          p = addVolume(
            <k8s.IoK8sApiCoreV1Volume>{
              name: volumeName,
              persistentVolumeClaim: {
                claimName: pvClaimName,
              }
            },
            mountPath,
            readOnly,
            subPath,
            mountFilter,
          )(p);

          return core.v1.persistentVolumeClaim.make(pvClaimName, storageRequest, accessModes);
        }
      }
    }

    export namespace labelSelector {
      export const setMatchExpression = (selectors: k8s.IoK8sApimachineryPkgApisMetaV1LabelSelectorRequirement[]): Transform<k8s.IoK8sApimachineryPkgApisMetaV1LabelSelector> => {
        return doTransform(s => {
          if (s.matchExpressions) {
            throw new Error("Could not add `matchExpressions` selector to deployment: can't have both that and a `matchLabels` selector");
          }
          s.matchExpressions = selectors;
        });
      }

      export const setMatchLabels = (labels: Labels): Transform<k8s.IoK8sApimachineryPkgApisMetaV1LabelSelector> => {
        return doTransform(s => {
          if (s.matchExpressions) {
            throw new Error("Could not add `matchLabels` selector to deployment: can't have both that and a `matchExpression` selector");
          }
          s.matchLabels = labels;
        });
      }
    }
  }
}

//
// Boiler plate types.
//

export type Labels = { [key: string]: string };

export type DeploymentTypes =
    k8s.IoK8sApiAppsV1beta1Deployment
  | k8s.IoK8sApiExtensionsV1beta1Deployment
  | k8s.IoK8sApiAppsV1beta1Deployment;

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
