import * as fs from 'fs';
import * as k8s from '@hausdorff/client-node';
import * as path from 'path';

export type Transform<TIn, TOut=TIn> = (ti: TIn) => TOut;

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
          c.ports = util.makeContainerPorts(port);
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

          return apps.v1beta2.deployment.make(deploymentName, appLabels, c, replicas);
        }
      }
    }

    export namespace service {
      //
      // Constructors.
      //

      const stub = (
        name: string,
        labels?: Labels,
      ): k8s.V1Service => {
        const svc = <k8s.V1Service><object>{
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

      /**
       * Defines a service that uses a cluster-internal IP address. This service
       * will be directly reachable only from inside the cluster.
       *
       * @param  {string} name Name to give the service
       * @param  {number|k8s.V1ServicePort|k8s.V1ServicePort[]} ports A port or
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
        ports: number | k8s.V1ServicePort | k8s.V1ServicePort[],
        selector: Labels,
        labels: Labels = {app: name},
      ): k8s.V1Service => {
        const svc = stub(name, labels);
        return merge<k8s.V1Service>(_ => ({
          spec: <k8s.V1ServiceSpec>{
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
       * @param  {number|k8s.V1ServicePort|k8s.V1ServicePort[]} ports A port or
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
        ports: number | k8s.V1ServicePort | k8s.V1ServicePort[],
        selector: Labels,
        labels: Labels = {app: name},
        loadBalancerSourceRanges?: string[],
        externalTrafficPolicy?: "Local" | "Cluster",
        externalIps?: string[],
      ): k8s.V1Service => {
        let svc = stub(name, labels);

        if (externalIps) {
          svc.spec.externalIPs = externalIps;
        }

        svc = merge<k8s.V1Service>(_ => ({
          spec: <k8s.V1ServiceSpec>{
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
      ): k8s.V1Service => {
        let svc = stub(serviceName, labels);
        svc = merge<k8s.V1Service>(_ => ({
          spec: <k8s.V1ServiceSpec>{
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
      export const setSelector = (labels: Labels): Transform<k8s.V1Service> => {
        return doTransform(s => s.spec.selector = labels);
      }

      /**
       * Replace existing ports exposed by the service (if any), and set them
       * with the ports provided as argument.
       *
       * @param  {number|k8s.V1ServicePort|k8s.V1ServicePort[]} ports Ports to
       * replace the current service ports with
       * @returns Transformer that replaces the ports in a service object
       */
      export const setPorts = (
        ports: number | k8s.V1ServicePort | k8s.V1ServicePort[],
      ): Transform<k8s.V1Service> => {
        return doTransform(s => s.spec.ports = util.makeServicePorts(ports));
      }

      /**
       * Append some number of ports to the list of ports exposed by a service
       * (if any).
       *
       * @param  {number|k8s.V1ServicePort|k8s.V1ServicePort[]} ports Ports to
       * append to the existing ports
       * @returns Transformer that appends some number of ports to the existing
       * ports in a service object
       */
      export const appendPorts = (
        ports: number | k8s.V1ServicePort | k8s.V1ServicePort[],
      ): Transform<k8s.V1Service> => {
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
      ): Transform<k8s.V1Service> => {
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
      /**
       * Remove session affinity configuration from service.
       *
       * @returns Transformer that removes session affinity configuration from service
       */
      export const setSessionAffinityNone = (): Transform<k8s.V1Service> => {
        return doTransform(s => {
          s.spec.sessionAffinity = "None";
          delete s.spec.sessionAffinityConfig;
        });
      }


      /**
       * Set session affinity to "stick" for some number of seconds.
       *
       * @param  {number} timeoutSeconds Seconds a session should "stick" to pod
       * @returns Transformer that adds session affinity configuraiton to service
       */
      export const setSessionAffinity = (timeoutSeconds: number): Transform<k8s.V1Service> => {
        return doTransform(s => {
          s.spec.sessionAffinity = "ClientIP";
          s.spec.sessionAffinityConfig = <k8s.V1SessionAffinityConfig>{
            clientIP: <k8s.V1ClientIPConfig>{
              timeoutSeconds: timeoutSeconds,
            }
          };
        });
      }
    }
  }
}

//
// Apps.
//

export namespace apps {
  export namespace v1beta2 {
    export namespace deployment {
      //
      // Constructors.
      //

      export const make = (
        name: string,
        appLabels: Labels,
        container: k8s.V1Container,
        replicas: number = 1,
        revisionHistoryLimit = 10,
      ): DeploymentTypes => {
        return <k8s.V1beta2Deployment>{
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
              spec: {
                containers: [container]
              }
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
      ): Transform<k8s.V1beta2Deployment> => {
        return doTransform(d => {
          if (minReadySeconds) {
            d.spec.minReadySeconds = minReadySeconds;
          }

          if (progressDeadlineSeconds) {
            d.spec.progressDeadlineSeconds = progressDeadlineSeconds;
          }
        });
      }

      export const setUpdateStrategyReplace = (): Transform<k8s.V1beta2Deployment> => {
        return doTransform(d => {
          d.spec.strategy = <k8s.V1beta2DeploymentStrategy>{
            type: "Recreate",
          }
        });
      }

      export const setUpdateStrategyRolling = (
        maxSurge?: number | string,
        maxUnavailable?: number | string,
      ): Transform<k8s.V1beta2Deployment> => {
        return doTransform(d => {
          d.spec.strategy = <k8s.V1beta2DeploymentStrategy>{
            type: "RollingUpdate",
            rollingUpdate: {
              maxSurge: maxSurge,
              maxUnavailable: maxUnavailable,
            },
          };
        });
      }

      export namespace pod {
        export const appendVolume = (v: k8s.V1Volume): Transform<DeploymentTypes> => {
          return doTransform(d => {
            d.spec.template.spec.volumes = d.spec.template.spec.volumes || [];
            d.spec.template.spec.volumes.push(v);
          });
        }

        export const mapContainers = (
          f: (c: k8s.V1Container) => void,
          filter = (_: k8s.V1Container) => true,
        ): Transform<DeploymentTypes> => {
          return doTransform(d => {
            for (const c of d.spec.template.spec.containers) {
              if (filter(c)) {
                f(c);
              }
            }
          });
        }
      }

      export const setAppLabels = (labels: Labels): Transform<DeploymentTypes> => {
        return doTransform(
          d => util.v1.metadata.setLabels(labels)(d.metadata),
          d => d.spec.template.metadata.labels = labels,
          d => d.spec.selector = <k8s.V1LabelSelector><object>{matchLabels: labels});
      }

      //
      // Verbs.
      //

      export const pause = (): Transform<k8s.V1beta2Deployment> => {
        return doTransform(d => d.spec.paused = true);
      }

      export const unpause = (): Transform<k8s.V1beta2Deployment> => {
        return doTransform(d => d.spec.paused = false);
      }

      export const scale = (replicas: number): Transform<k8s.V1beta2Deployment> => {
        return doTransform(d => d.spec.replicas = replicas);
      }

      //
      // TODO: autoscale
      //

      export const exposeWithLoadBalancer = (
        port: k8s.V1ServicePort | number,
        serviceName?: string
      ): Transform<DeploymentTypes, k8s.V1Service> => {
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
        port: k8s.V1ServicePort | number,
        serviceName?: string
      ): Transform<DeploymentTypes, k8s.V1Service> => {
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

      export const addJsonConfigFile = (
        filePath: string,
        mountPath: string,
        configMapName?: string,
        containerFilter = (_: k8s.V1Container) => true,
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
          )(d);
          pod.appendVolume(<k8s.V1Volume>{
            name: configMapVolumeName,
            configMap: {
              name: configMapName,
            },
          })(d);

          return core.v1.configMap.make(configMapName, data);
        }
      }
    }
  }
}

//
// Private helpers.
//

namespace util {
  export const makeContainerPorts = (
    ports: number | k8s.V1ContainerPort | k8s.V1ContainerPort[],
  ): k8s.V1ContainerPort[] => {
    if (Array.isArray(ports)) {
      return ports;
    } else if (isFinite(<number>ports)) {
      return [<k8s.V1ContainerPort>{containerPort: ports}];
    }
    return [<k8s.V1ContainerPort>ports];
  }

  export const makeServicePorts = (
    ports: number | k8s.V1ServicePort | k8s.V1ServicePort[],
  ): k8s.V1ServicePort[] => {
    if (Array.isArray(ports)) {
      return ports;
    } else if (isFinite(<number>ports)) {
      return [<k8s.V1ServicePort>{port: ports, targetPort: ports}];
    }
    return [<k8s.V1ServicePort>ports];
  }

  export namespace v1 {
    export namespace metadata {
      export const setName = (name: string): Transform<k8s.V1ObjectMeta> => {
        return doTransform(m => m.name = name);
      }

      export const setNamespace = (namespace: string): Transform<k8s.V1ObjectMeta> => {
        return doTransform(m => m.namespace = namespace);
      }

      export const setAnnotations = (labels: Labels): Transform<k8s.V1ObjectMeta> => {
        return doTransform(m => m.annotations = labels)
      }

      export const mergeAnnotations = (labels: Labels): Transform<k8s.V1ObjectMeta> => {
        return doTransform(m =>
          m.annotations
            ? Object.assign(m.annotations, labels)
            : m.annotations = labels);
      }

      export const setLabels = (labels: Labels): Transform<k8s.V1ObjectMeta> => {
        return doTransform(m => m.labels = labels);
      }

      export const mergeLabels = (labels: Labels): Transform<k8s.V1ObjectMeta> => {
        return doTransform(m =>
          m.labels
            ? Object.assign(m.labels, labels)
            : m.labels = labels);
      }
    }

    export namespace labelSelector {
      export const setMatchExpression = (selectors: k8s.V1LabelSelectorRequirement[]): Transform<k8s.V1LabelSelector> => {
        return doTransform(s => {
          if (s.matchExpressions) {
            throw new Error("Could not add `matchExpressions` selector to deployment: can't have both that and a `matchLabels` selector");
          }
          s.matchExpressions = selectors;
        });
      }

      export const setMatchLabels = (labels: Labels): Transform<k8s.V1LabelSelector> => {
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
