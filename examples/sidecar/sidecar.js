import {merge, core, apps} from '../../src';
const container = core.v1.container,
      depl = apps.v1beta2.deployment,
      pod = core.v1.pod,
      service = core.v1.service;

const frontendDepl = [
    container.make("frontend", "gcr.io/google-samples/gb-frontend:v4", 80),
    container.make("sidecar", "fluentd"),
  ]
  |> container.toPod("frontend")
  |> pod.deploy(3);

for (const r of [frontendDepl]) {
  console.log(JSON.stringify(r, undefined, "  "));
}
