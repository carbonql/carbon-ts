import * as fs from "fs";
import * as mustache from "mustache";
import * as linq from "linq";
import * as rx from "rxjs/Rx";

const groupVersionKind = "x-kubernetes-group-version-kind";
const k8sAction = "x-kubernetes-action";
const operationId = "operationId";

const watchListAction = "watchlist";

// --------------------------------------------------------------------------
// Helper interfaces.
// --------------------------------------------------------------------------

interface GroupConfig {
  readonly group: string
  readonly ourGroupName: string
  readonly upstreamGroupName: string
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
  readonly body: string
}

const ucfirst = (s: string): string => {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const makeOurGroupName = (group: string): string => {
  if (group.includes(".")) {
    let newGroup = group;
    if (newGroup.endsWith(".k8s.io")) {
      newGroup = newGroup.slice(0, -7);
    }

    newGroup = newGroup
      .split(".")
      .map((component, i) => {
        if (i > 0) return ucfirst(component)
        return component;
      })
      .join("");

    return newGroup;
  }

  return group;
}

const makeUpstreamGroupName = (group: string): string => {
  if (group.includes(".")) {
    return group
      .split(".")
      .reverse()
      .map(component => ucfirst(component))
      .join("")
  }

  return group;
}

const makeClientName = (group: string, version: string): string => {
  return `k8s.${ucfirst(makeOurGroupName(group))}${ucfirst(version)}Api`;
}

const addNsList = (
  methods: MethodConfig[], ourGroupName: string, version: string, kind: string,
  operations: linq.IEnumerable<string>,
) => {
  // Find out if we need to create namespaced/non-namespaced list
  // method.
  const isNsList = operations
    .where(op => {
      return op.endsWith(`Namespaced${kind}`) || op.endsWith(`${kind}ForAllNamespaces`)
    })
    .count() == 2;

  if (isNsList) {
    const groupNs = `${ucfirst(ourGroupName)}${ucfirst(version)}`
    methods.push({
      name: "list",
      paramsText: "namespace?: string",
      body: `return listAsObservable(
            namespace
              ? this.${ourGroupName}.${version}.client().list${groupNs}Namespaced${kind}(namespace)
              : this.${ourGroupName}.${version}.client().list${groupNs}${kind}ForAllNamespaces()
          );`
    });
  }
}

const addNonNsList = (
  methods: MethodConfig[], ourGroupName: string, version: string, kind: string,
  operations: linq.IEnumerable<string>,
) => {
  const isNonNsList = operations
    .where(op => op == `list${ucfirst(ourGroupName)}${ucfirst(version)}${ucfirst(kind)}`)
    .count() == 1;

  if (isNonNsList) {
    methods.push({
      name: "list",
      paramsText: "",
      body: `return listAsObservable(this.${ourGroupName}.${version}.client().list${ucfirst(ourGroupName)}${ucfirst(version)}${kind}());`,
    });
  }
}

const addLogsMethods = (
  methods: MethodConfig[], group: string, version: string, kind: string,
) => {
  // Add a method for logs if the GVK is for Pod.
  if (group == "core" && version == "v1" && kind == "Pod") {
    methods.push({
      name: "logs",
      paramsText: "name: string, namespace: string, container?: string",
      body: `return objAsObservable(this.${group}.${version}.client().read${ucfirst(group)}${ucfirst(version)}NamespacedPodLog(name, namespace, container))`,
    });

    methods.push({
      name: "logStream",
      paramsText: "name: string, namespace: string, container?: string",
      body: "return streamPodLogs(name, namespace, this._kc, container);",
    });
  }
}

const addWatchMethods = (
  methods: MethodConfig[], ourGroupName: string, version: string, kind: string,
  endpoints: linq.IEnumerable<any>,
) => {
  const watchEndpoints = endpoints
    .where(endpoint => endpoint[k8sAction] == watchListAction);

  // console.log(watchEndpoints.toArray());

  const nsWatch =
    watchEndpoints
      .where(watchEndpoint => {
        // console.log(watchEndpoint[operationId]);
        // console.log(`Namespaced${kind}`);
        return watchEndpoint[operationId].endsWith(`Namespaced${kind}List`)
      })
      .toArray();
  const nonNsWatch =
    watchEndpoints
      .where(watchEndpoint => {
        // console.log(watchEndpoint[operationId]);
        // console.log(`${kind}ForAllNamespaces`);
        return watchEndpoint[operationId].endsWith(`${kind}ListForAllNamespaces`)
      })
      .toArray();
  const isNsWatchList = nsWatch.length == 1 && nonNsWatch.length == 1;

  // console.log(nsWatch);
  // console.log(nonNsWatch);

  if (isNsWatchList) {
    const nsPath = nsWatch[0].path.split("{namespace}");
    const nonNsPath = nonNsWatch[0].path;
    methods.push({
      name: "watch",
      paramsText: "namespace?: string",
      body: `return namespace
            ? watchListAsObservable("${nsPath[0]}" + namespace + "${nsPath[1]}", this._kc)
            : watchListAsObservable("${nonNsPath}", this._kc);`
    });
  }

  const isNonNsWatchList = watchEndpoints
    .where(watchEndpoint =>
      watchEndpoint[operationId] == `watch${ucfirst(ourGroupName)}${ucfirst(version)}${ucfirst(kind)}List`)
    .toArray();

  if (isNonNsWatchList.length == 1) {
    const watch = isNonNsWatchList[0];
    methods.push({
      name: "watch",
      paramsText: "",
      body: `return watchListAsObservable("${watch.path}", this._kc);`
    });
  }
}

// --------------------------------------------------------------------------
// Fill in Mustache template.
// --------------------------------------------------------------------------

const swagger = JSON.parse(fs.readFileSync(process.argv[2]).toString());

const paths = swagger.paths;
const groups: GroupConfig[] = linq
  // Find all GET endpoints that return lists of resources.
  .from(Object.keys(paths))
  .select(path => {
    const get = paths[path]["get"];
    //
    // NOTE: We're adding the path here for convenience later.
    //
    if (get != null) {
      get.path = path;
    }
    return get;
  })
  .where(get => get != null && (get[k8sAction] == "list" || get[k8sAction] == watchListAction))
  .select(get => {
    // For historical reasons, the group `core` is denoted by the empty string.
    // Add this explicitly.
    const objectGvk = get[groupVersionKind];
    if (objectGvk.group == "") {
      objectGvk.group = "core";
    }

    return get;
  })
  // Group endpoints by group so we can create a `GroupConfig[]`.
  .groupBy(endpoint => endpoint[groupVersionKind].group)
  .select<GroupConfig>(endpoints => {
    const group = endpoints.key();
    const ourGroupName = makeOurGroupName(group);
    const upstreamGroupName = makeUpstreamGroupName(group);

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

            addNsList(methods, ourGroupName, version, kind, operations);
            addNonNsList(methods, ourGroupName, version, kind, operations);
            addWatchMethods(methods, ourGroupName, version, kind, endpoints);
            addLogsMethods(methods, group, version, kind);

            return {
              kind: kind,
              methods: methods,
            }
          });

        return {
          version: version,
          clientName: makeClientName(group, version),
          kinds: lists.toArray(),
        }
      })
      .toArray();

    return {
      group: group,
      ourGroupName: ourGroupName,
      upstreamGroupName: upstreamGroupName,
      versions: versions,
    };
  })
  .toArray();

const render = mustache.render(
  fs.readFileSync("scripts/client.ts.mustache").toString(),
  {groups: groups});

console.log(render);
