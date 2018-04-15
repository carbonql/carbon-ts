import * as fs from "fs";
import * as mustache from "mustache";
import * as linq from "linq";
import * as os from "os";

// --------------------------------------------------------------------------
// Helper interfaces.
// --------------------------------------------------------------------------

interface GroupConfig {
  readonly group: string
  readonly versions: VersionConfig[]
}

interface VersionConfig {
  readonly version: string
  readonly kinds: KindConfig[]
}

interface KindConfig {
  readonly kind: string
  readonly comment: string
  readonly properties: Property[]
}

interface Property {
  readonly comment: string
  readonly type: string
  readonly name: string
}

const gvkFromRef = (ref: string): {group: string, version: string, kind: string} => {
  const split = ref.split(".");
  const kind = split[split.length-1];
  const version = split[split.length-2];
  const group = split[split.length-3];
  return {group, version, kind};
}

const stripPrefix = (name: string): string => {
  return name.replace(/^#\/definitions\//, "");
}

const fmtComment = (comment: string, prefix: string): string => {
  return comment != null && comment.length > 0
    ? `// ${comment.split(os.EOL).join(`${os.EOL}${prefix}// `)}`
    : "";
}

const makeTypeLiteral = (prop: any): string => {
  if (prop.type != null) {
    if (prop.type == "array") {
      const atom = makeTypeLiteral(prop.items);
      return `${atom}[]`;
    } else {
      switch (prop.type) {
        case "integer":
          return "number";
        default:
          return prop.type;
      }
    }
  } else {
    const ref = stripPrefix(prop["$ref"]);
    switch (ref) {
      case "io.k8s.apimachinery.pkg.api.resource.Quantity":
        return "string";
      case "io.k8s.apimachinery.pkg.util.intstr.IntOrString":
        return "number | string";
      case "io.k8s.apimachinery.pkg.apis.meta.v1.Time":
      case "io.k8s.apimachinery.pkg.apis.meta.v1.MicroTime":
        // TODO: Automatically deserialized with `DateConstructor`.
        return "string"
      default:
        const gvk = gvkFromRef(ref);
        return `${gvk.group}.${gvk.version}.${gvk.kind}`;
    }
  }
}

const createGroups = (endpoints: linq.IGrouping<string, {
  gvk: {
      group: string;
      version: string;
      kind: string;
  };
  name: string;
  definition: any;
}>) => {
  const group = endpoints.key();

  // Group endpoints by version so we can create a `VersionConfig[]`.
  const versions: VersionConfig[] = endpoints
    .groupBy(endpoint => endpoint.gvk.version)
    .select(endpoints => {
      const version = endpoints.key();

      // Group endpoints by kind so we can create a `ListConfig[]`.
      const lists: linq.IEnumerable<KindConfig> = endpoints
        .selectMany(endpoint => {
          if (endpoint.definition.properties == null) {
            return linq.from([]);
          }

          const properties = linq
            .from(Object.keys(endpoint.definition.properties))
            .select((propName: string) => {
              const prop = endpoint.definition.properties[propName];
              let typeLiteral = makeTypeLiteral(prop);

              return {
                comment: fmtComment(prop.description, "      "),
                type: typeLiteral,
                name: propName,
              };
            })
            .toArray();

          return linq.from([{
            kind: endpoint.gvk.kind,
            // NOTE: This transformation assumes git users on Windows to set
            // the "check in with UNIX line endings" setting.
            comment: fmtComment(endpoint.definition.description, "    "),
            properties,
          }]);
        });

      return {
        version: version,
        kinds: lists.toArray(),
      }
    })
    .toArray();

  return {
    group: group,
    versions: versions,
  };
}

// --------------------------------------------------------------------------
// Fill in Mustache template.
// --------------------------------------------------------------------------

const swagger = JSON.parse(fs.readFileSync(process.argv[2]).toString());

const paths = swagger.paths;
const definitions = swagger.definitions;

// Assemble top-level groups.
const groups: GroupConfig[] = linq
  .from(Object.keys(definitions))
  .where(defName => {
    // Special case. These objects are deprecated.
    return !defName.startsWith("io.k8s.kubernetes.pkg");
  })
  .select(defName => {
    return {
      gvk: gvkFromRef(defName),
      name: defName,
      definition: definitions[defName],
    };
  })
  // Group endpoints by group so we can create a `GroupConfig[]`.
  .groupBy(endpoint => endpoint.gvk.group)
  .select(createGroups)
  .toArray();

const render = mustache.render(
  fs.readFileSync("scripts/api/api.ts.mustache").toString(),
  {groups});

console.log(render);
