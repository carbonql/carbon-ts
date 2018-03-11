import {client, query} from "../../src";
import * as syncQuery from 'linq';

//
// Create a list of services and the pods they target.
//

const c = client.Client.fromFile(<string>process.env.KUBECONFIG);
c.core.v1.Service
  // Get all services.
  .list("default")
  .flatMap(s => {
    const selector = s.spec.selector;
    // Service doesn't target any pods.
    if (selector == null) {
      return [];
    }

    return c.core.v1.Pod
      .list("default")
      .filter(p => syncQuery
        .from(Object.keys(selector))
        .any(label => p.metadata.labels[label] != selector[label]))
      .map(p => p.metadata.name)
      .toArray()
      .map(ps => `Service '${s.metadata.name}' -> [${ps}]`)
  })
  .subscribe(s => console.log(s));

//
//
//
