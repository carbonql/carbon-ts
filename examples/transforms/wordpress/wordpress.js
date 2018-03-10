import {merge, core, apps} from '../../src';
const container = core.v1.container,
      depl = apps.v1beta2.deployment,
      pod = core.v1.pod,
      pv = core.v1.persistentVolume,
      service = core.v1.service;

//
// Cluster admin creates PVs and secrets. This would usually be deployed
// out-of-band, since most app writers won't have permission to write them.
//

const pv1 =
  pv.make("wordpress-pv-1", "20Gi")
  |> pv.configureAsGcePersistentDisk("wordpress-1", "ext4");

const pv2 =
  pv.make("wordpress-pv-2", "20Gi")
  |> pv.configureAsGcePersistentDisk("wordpress-2", "ext4");

//
// App writer now writes the core app logic.
//

// First, MySQL:

const mysqlPort = 3306;
const mysqlLabels = {app: "wordpress", tier: "mysql"};

const mysqlDepl =
  container.make("mysql", "mysql:5.6", {containerPort: mysqlPort, name: "mysql"})
  |> container.addEnvFromSecret("MYSQL_ROOT_PASSWORD", "mysql-pass", "password")
  |> container.deploy(1, "wordpress-mysql", mysqlLabels)
  |> depl.setUpdateStrategyRecreate();

const mysqlPvc =
  mysqlDepl
  |> depl.pod.claimPersistentVolume("mysql-pv-claim", "/var/lib/mysql", "20Gi");
mysqlPvc.metadata.labels = mysqlLabels; // Hack, fix later.

const mysqlSvc =
  mysqlDepl
  |> depl.exposeToCluster(mysqlPort);

// Then, WordPress itself:

const wpPort = 80;
const wpLabels = {app: "wordpress", tier: "frontend"};

const wpDepl =
  container.make("wordpress", "wordpress:4.8-apache", {containerPort: wpPort, name: "wordpress"})
  |> container.addEnv("WORDPRESS_DB_HOST", "wordpress-mysql")
  |> container.addEnvFromSecret("WORDPRESS_DB_PASSWORD", "mysql-pass", "password")
  |> container.deploy(1, undefined, wpLabels)
  |> depl.setUpdateStrategyRecreate();

const wpPvc =
  wpDepl
  |> depl.pod.claimPersistentVolume("wp-pv-claim", "/var/www/html", "20Gi");
wpPvc.metadata.labels = wpLabels; // Hack, fix later.

const wpSvc =
  wpDepl
  |> depl.exposeWithLoadBalancer(wpPort);

// Print out.

for (const r of [mysqlDepl, mysqlPvc, mysqlSvc, wpDepl, wpPvc, wpSvc]) {
  console.log(JSON.stringify(r, undefined, "  "));
}
