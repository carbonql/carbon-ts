import {Client, query} from "../../src";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const loadBalancers = c.core.v1.Service
  .list()
  .filter(svc => svc.spec.type == "LoadBalancer");

// Print.
loadBalancers.forEach(
  svc => console.log(`${svc.metadata.namespace}/${svc.metadata.name}`));

// Equivalent to:
//
// const c = Client.fromFile(<string>process.env.KUBECONFIG);
// const loadBalancers =
//   from service in c.core.v1.Service.list()
//   where service.spec.type == "LoadBalancer"
//   select service;

// // Print.
// loadBalancers.forEach(
//   svc => console.log(`${svc.metadata.namespace}/${svc.metadata.name}`));
