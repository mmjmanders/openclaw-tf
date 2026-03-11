include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  env_vars = yamldecode(file(find_in_parent_folders("env.yaml")))
}

inputs = merge(local.env_vars)

terraform {
  source = "${get_path_to_repo_root()}/modules/lightsail"
}
