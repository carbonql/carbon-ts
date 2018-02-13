import * as k8s from '@kubernetes/client-node';
import { labeledStatement } from 'babel-types';

namespace Hidden {
  export namespace V1 {
    export namespace Metadata {
      export type Transform = (m: k8s.V1ObjectMeta) => void;

      export const setName = (name: string): Transform => {
        return m => {
          m.name = name;
        };
      }

      export const setLabels = (labels: { [key: string]: string }): Transform => {
        return m => {
          m.labels = labels;
        };
      }
    }

    export namespace LabelSelector {
      export type Transform = (m: k8s.V1LabelSelector) => void;

      export const setMatchLabelsSelector = (labels: { [key: string]: string }): Transform => {
        return s => {
          if (s.matchExpressions) {
            throw new Error("Could not add `matchLabels` selector to deployment: can't have both that and a `matchExpression` selector");
          }
          s.matchLabels = labels;
        };
      }
    }
  }
}

export namespace Deployment {
  export type DeploymentTypes =
      k8s.AppsV1beta1Deployment
    | k8s.ExtensionsV1beta1Deployment
    | k8s.V1beta2Deployment;

  export type Transform = <D extends DeploymentTypes>(d: D) => void;

  export const applyTransformations = (...transforms: Transform[]): Transform => {
    return d => {
      for (const t of transforms) {
        t(d);
      }
    };
  }

  export const setName = (name: string): Transform => {
    return d => {
      Hidden.V1.Metadata.setName(name)(d.metadata);
    };
  }

  export const setLabels = (labels: { [key: string]: string }): Transform => {
    return d => {
      Hidden.V1.Metadata.setLabels(labels)(d.metadata);
    };
  }

  export const setTemplateLabels = (labels: { [key: string]: string }): Transform => {
    return d => {
      Hidden.V1.Metadata.setLabels(labels)(d.spec.template.metadata);
    };
  }

  export const setMatchLabelsSelector = (labels: { [key: string]: string }): Transform => {
    return d => {
      Hidden.V1.LabelSelector.setMatchLabelsSelector(labels)(d.spec.selector);
    };
  }

  export const setReplicas = (replicas: number): Transform => {
    return d => {
      d.spec.replicas = replicas;
    }
  }

  export const setAppLabels = (name: string): Transform => {
    return d => {
      const labels = {app: name};
      applyTransformations(
        setLabels(labels),
        setTemplateLabels(labels),
        setMatchLabelsSelector(labels),
      )(d);
    };
  }

  export const appendContainer = (c: k8s.V1Container): Transform => {
    return d => {
      d.spec.template.spec.containers.push(c);
    };
  }
}
