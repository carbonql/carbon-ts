import {Client, query} from "../../src";

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const subjectsWithSecretAccess = c.rbacAuthorization.v1beta1.Role
  .list()
  .filter(role =>
    role.rules
      .filter(rule =>
        (rule.apiGroups.indexOf("") > -1) &&
        (rule.resources.indexOf("secrets") > -1))
      .length > 0)
  .flatMap(role => {
    return c.rbacAuthorization.v1beta1.RoleBinding
      .list()
      .filter(binding =>
        binding.roleRef.kind == "Role" &&
        binding.roleRef.apiGroup == "rbac.authorization.k8s.io" &&
        binding.roleRef.name == role.metadata.name)
      .flatMap(binding => binding.subjects)
  });

// Print subjects.
subjectsWithSecretAccess.forEach(subj => console.log(`${subj.kind}\t${subj.name}`));
