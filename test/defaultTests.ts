import { expect } from 'chai';
import { transform } from '../src';
const core = transform.core,
      configMap = core.v1.configMap,
      container = core.v1.container;

const tests: {name: string, actual: any, expected: any}[] = [
  {
    name: "core.v1.configMap.make",
    actual: configMap.make("cm1", {foo: "bar"}),
    expected: {
      "apiVersion": "v1",
      "kind": "ConfigMap",
      "metadata": {
        "name": "cm1"
      },
      "data": {
        "foo": "bar"
      }
    },
  },
  {
    name: "core.v1.container.make",
    actual: container.make("c1", "nginx", 80),
    expected: {
      "name": "c1",
      "image": "nginx",
      "ports": [
        {
          "containerPort": 80
        }
      ]
    },
  },
  {
    name: "core.v1.container.deploy",
    actual: container.deploy(3)(container.make("c1", "nginx", 80)),
    expected: {
      "apiVersion": "apps/v1beta2",
      "kind": "Deployment",
      "metadata": {
        "name": "c1",
        "labels": {
          "app": "c1"
        }
      },
      "spec": {
        "revisionHistoryLimit": 10,
        "replicas": 3,
        "selector": {},
        "template": {
          "metadata": {
            "labels": {
              "app": "c1"
            }
          },
          "spec": {
            "containers": [
              {
                "name": "c1",
                "image": "nginx",
                "ports": [
                  {
                    "containerPort": 80
                  }
                ]
              }
            ]
          }
        }
      }
    },
  },
];



describe('defaults generators', () => {
  for (const test of tests) {
    it(test.name, () => {
      expect(test.actual).to.deep.equal(test.expected);
    });
  }
});
