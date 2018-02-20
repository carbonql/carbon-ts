import {merge, core, apps} from '../../src';
const container = core.v1.container,
      deployment = apps.v1beta1.deployment,
      service = core.v1.service;

const defaultResources = {cpu: "100m", memory: "100Mi"};
const hostFromDns = {name: "GET_HOSTS_FROM", value: "dns"};
const redisPort = 6379;

const addResourcesAndDiscovery = _ => ({
  resources: defaultResources,
  env: [hostFromDns],
});

const frontendDepl =
  container.make("frontend", "gcr.io/google-samples/gb-frontend:v4", 80)
  |> merge(addResourcesAndDiscovery)
  |> container.deploy(3)
const frontendSvc = frontendDepl |> deployment.expose(80, undefined, "LoadBalancer");

const redisMasterDepl =
  container.make("redis-master", "gcr.io/google_containers/redis:e2e", redisPort)
  |> merge(_ => ({resources: defaultResources}))
  |> container.deploy();
const redisMasterSvc = redisMasterDepl |> deployment.expose(redisPort);

const redisAgentDepl =
  container.make("redis-slave", "gcr.io/google_samples/gb-redisslave:v1", redisPort)
  |> merge(addResourcesAndDiscovery)
  |> container.deploy(2);
const redisAgentSvc = redisAgentDepl |> deployment.expose(redisPort);


for (const r of [frontendDepl, frontendSvc, redisMasterDepl, redisMasterSvc, redisAgentDepl, redisAgentSvc]) {
  console.log(JSON.stringify(r, undefined, "  "));
}
