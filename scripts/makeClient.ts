import * as fs from "fs";
import * as mustache from "mustache";
import * as linq from "linq";
import * as rx from "rxjs/Rx";

const groupVersionKind = "x-kubernetes-group-version-kind";
const k8sAction = "x-kubernetes-action";
const operationId = "operationId";

function ucfirst(s: string)
{
    return s.charAt(0).toUpperCase() + s.slice(1);
}

const swagger = JSON.parse(fs.readFileSync(process.argv[2]).toString());

interface GroupConfig {
  readonly group: string
  readonly versions: VersionConfig[]
}

interface VersionConfig {
  readonly version: string
  readonly clientName: string
  readonly namespacedLists: ListConfig[]
  readonly nonNamespacedLists: ListConfig[]
}

interface ListConfig {
  readonly kind: string
  readonly operations: string[]
}

const paths = swagger.paths;
const groups: GroupConfig[] = linq
  // Find all GET endpoints that return lists of resources.
  .from(Object.keys(paths))
  .select(path => paths[path]["get"])
  .where(get => get != null && get[k8sAction] == "list")
  .where(get => !(<string>get[groupVersionKind].group).includes(".")) // Temporarily strip out "complex" groups.
  .select(get => {
    // For historical reasons, the group `core` is denoted by the empty string.
    // Add this explicitly.
    const objectGvk = get[groupVersionKind];
    objectGvk.group = objectGvk.group ? objectGvk.group : "core";
    return get;
  })
  // Group endpoints by group so we can create a `GroupConfig[]`.
  .groupBy(endpoint => endpoint[groupVersionKind].group)
  .select<GroupConfig>(endpoints => {
    const group = endpoints.key();

    // Group endpoints by version so we can create a `VersionConfig[]`.
    const versions: VersionConfig[] = endpoints
      .groupBy(endpoint => endpoint[groupVersionKind].version)
      .select(endpoints => {
        const version = endpoints.key();

        // Group endpoints by kind so we can create a `ListConfig[]`.
        const lists: linq.IEnumerable<ListConfig> = endpoints
          .groupBy(endpoint => endpoint[groupVersionKind].kind)
          .select(endpoints => {
            const kind = endpoints.key();
            return {
              kind: kind,
              operations: endpoints.select(e => e[k8sAction]).toArray(),
            }
          });

        return {
          version: version,
          clientName: `k8s.${ucfirst(group)}_${version}Api`,
          namespacedLists: lists.where(l => l.operations.length == 2).toArray(),
          nonNamespacedLists: lists.where(l => l.operations.length == 1).toArray(),
        }
      })
      .toArray();

    return {
      group: group,
      versions: versions,
    };
  })
  .toArray();

const render = mustache.render(
  fs.readFileSync("scripts/template.ts.mustache").toString(),
  {groups: groups});

console.log(render);
