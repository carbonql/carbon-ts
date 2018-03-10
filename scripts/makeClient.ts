import * as fs from "fs";
import * as mustache from "mustache";
import * as linq from "linq";
import * as rx from "rxjs/Rx";

const groupVersionKind = "x-kubernetes-group-version-kind";
const k8sAction = "x-kubernetes-action";
const operationId = "operationId";

//
// Helper interfaces.
//

interface GroupConfig {
  readonly group: string
  readonly versions: VersionConfig[]
}

interface VersionConfig {
  readonly version: string
  readonly clientName: string
  readonly kinds: KindConfig[]
}

interface KindConfig {
  readonly kind: string
  readonly methods: MethodConfig[]
}

interface MethodConfig {
  readonly name: string
  readonly paramsText: string
  readonly observableListText: string
}

const ucfirst = (s: string): string => {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

//
// Fill in Mustache template.
//

const swagger = JSON.parse(fs.readFileSync(process.argv[2]).toString());

const paths = swagger.paths;
const groups: GroupConfig[] = linq
  // Find all GET endpoints that return lists of resources.
  .from(Object.keys(paths))
  .select(path => paths[path]["get"])
  .where(get => get != null && get[k8sAction] == "list")

  // Temporarily strip out "complex" groups.
  .where(get => !(<string>get[groupVersionKind].group).includes("."))
  //

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
        const lists: linq.IEnumerable<KindConfig> = endpoints
          .groupBy(endpoint => endpoint[groupVersionKind].kind)
          .select(endpoints => {
            const kind = endpoints.key();

            // Create a list of methods to emit in the mustache template.
            const operations = endpoints.select(e => <string>e[operationId]);
            const methods: MethodConfig[] = [];

            // Find out if we need to create namespaced/non-namespaced list
            // method.
            const isNsList = operations
              .where(op => {
                return op.endsWith(`Namespaced${kind}`) || op.endsWith(`${kind}ForAllNamespaces`)
              })
              .count() == 2;

            if (isNsList) {
              methods.push({
                name: "list",
                paramsText: "namespace?: string",
                observableListText: `
            namespace
              ? this.${group}.${version}.client().listNamespaced${kind}(namespace)
              : this.${group}.${version}.client().list${kind}ForAllNamespaces()
          `
              })
            }

            const isNonNsList = operations
              .where(op => op == `list${ucfirst(group)}${ucfirst(version)}${ucfirst(kind)}`)
              .count() == 1;

            if (isNonNsList) {
              methods.push({
                name: "list",
                paramsText: "",
                observableListText: `this.${group}.${version}.client().list${kind}()`,
              })
            }

            return {
              kind: kind,
              methods: methods,
            }
          });

        return {
          version: version,
          clientName: `k8s.${ucfirst(group)}_${version}Api`,
          kinds: lists.toArray(),
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
