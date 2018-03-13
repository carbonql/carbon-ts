var src_1 = require("../../src");
var carbon = require("../../src");
//
// List the history of a deployment called "nginx".
//
var c = src_1.client.Client.fromFile(process.env.KUBECONFIG);
var history = c.apps.v1beta1.Deployment
    .list("default")
    .filter(function (d) { return d.metadata.name == "nginx"; })
    .flatMap(function (d) { return carbon.apps.v1beta2.deployment.getRevisionHistory(c, d); });
//
// Outputs a list of deployments and the times they were updated:
//
//   nginx
//       2018-02-28T20:15:32Z
//
history.forEach(function (_a) {
    var deployment = _a.deployment, history = _a.history;
    console.log("" + deployment.metadata.name);
    history.forEach(function (rs) {
        console.log("    " + rs.metadata.creationTimestamp);
    });
});
