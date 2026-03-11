locals {
  backend_access_key = get_env("BACKEND_ACCESS_KEY", "access_key")
  backend_secret_key = get_env("BACKEND_SECRET_KEY", "secret_key")
  backend_bucket     = get_env("BACKEND_BUCKET", "bucket")
  backend_region     = get_env("BACKEND_REGION", "region")
  backend_endpoint   = get_env("BACKEND_ENDPOINT", "endpoint")
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
terraform {
  backend "s3" {
    access_key                  = "${local.backend_access_key}"
    secret_key                  = "${local.backend_secret_key}"
    key                         = "terraform.tfstate"
    bucket                      = "${local.backend_bucket}"
    region                      = "${local.backend_region}"
    endpoint                    = "${local.backend_endpoint}"
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" { }
EOF
}