import {Client, query, rbacAuthorization} from "../../src";
const rbac = rbacAuthorization

const c = Client.fromFile(<string>process.env.KUBECONFIG);
const subjectsWithSecretAccess = c.rbacAuthorization.v1beta1.Role
  .list()
  .filter(role => rbac.v1beta1.role.appliesTo(role, "", "secrets"))
  .flatMap(role => {
    return c.rbacAuthorization.v1beta1.RoleBinding
      .list()
      .filter(binding =>
        rbac.v1beta1.roleBinding.referencesRole(binding, role.metadata.name))
      .flatMap(binding => binding.subjects)
  });

// Print subjects.
subjectsWithSecretAccess.forEach(subj => console.log(`${subj.kind}\t${subj.name}`));
