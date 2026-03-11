generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
terraform {
  backend "s3" {
    access_key                  = "${get_env("BACKEND_ACCESS_KEY", "access_key")}"
    secret_key                  = "${get_env("BACKEND_SECRET_KEY", "secret_key")}"
    key                         = "terraform.tfstate"
    bucket                      = "${get_env("BACKEND_BUCKET", "bucket")}"
    region                      = "${get_env("BACKEND_REGION", "region")}"
    endpoint                    = "${get_env("BACKEND_ENDPOINT", "endpoint")}"
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