import {client, query} from "../../src";
import * as syncQuery from 'linq';

//
// List the history of a deployment called "nginx".
//

const c = client.Client.fromFile(<string>process.env.KUBECONFIG);
c.apps.v1beta1.Deployment
  .list("default")
  .filter(d => d.metadata.name == "nginx")
  .flatMap(d => {
    return c.extensions.v1beta1.ReplicaSet
      .list("default")
      .filter(rs =>
        syncQuery
          .from(rs.metadata.ownerReferences)
          .where(oref => oref.name == d.metadata.name)
          .count() > 0)
      .toArray()
      .map(rss => {
        const arr = syncQuery
          .from(rss)
          .orderBy(rs => rs.metadata.annotations["deployment.kubernetes.io/revision"])
          .select(rs => `  ${rs.metadata.name} ${rs.metadata.creationTimestamp}`)
          .toArray();
        return `Deployment '${d.metadata.name}':\n${arr}]`
      })
  })
  .subscribe(rs => console.log(rs));
