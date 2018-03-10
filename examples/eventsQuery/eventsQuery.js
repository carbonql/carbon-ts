// import {merge, core, apps} from '../../src';
// const container = core.v1.container,
//       depl = apps.v1beta2.deployment,
//       pod = core.v1.pod,
//       pv = core.v1.persistentVolume,
//       service = core.v1.service;

import {client, query} from "../../src";

//
// Get a snapshot of events in "default" namespace, filter down to warnings.
//

const c = client.Client.fromFile(process.env.KUBECONFIG);
// c.core.v1.event.list("default")
//   // Filter to warnings.
//   .filter(e => e.type === "Warning")
//   .subscribe(console.log);

c.core.v1.Node.list()
  .filter(n => {
    const pressure =
      n.status.conditions.filter(c => c.type === "MemoryPressure" && c.status === "False");
    return pressure.length > 1;
  })
  .flatMap(n => n.metadata.name)
  .subscribe(n => {
  })
