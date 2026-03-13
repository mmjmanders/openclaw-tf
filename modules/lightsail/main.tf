variable "region" {}
variable "stage" {}
variable "lightsail_bundle_id" {}
variable "lightsail_public_key" {}
variable "lightsail_allowed_cidrs" {
  type = set(string)
}
variable "lightsail_open_ports" {
  type = set(string)
}

locals {
  name                    = join("-", ["lightsail", var.stage])
  lightsail_instance_name = "${local.name}-instance"
}

resource "aws_lightsail_key_pair" "key_pair" {
  name       = "${local.name}-key-pair"
  public_key = var.lightsail_public_key
}

resource "aws_lightsail_instance" "openclaw" {
  name              = local.lightsail_instance_name
  availability_zone = "${var.region}a"
  blueprint_id      = "openclaw_ls_1_0"
  bundle_id         = var.lightsail_bundle_id
  key_pair_name     = aws_lightsail_key_pair.key_pair.name
  user_data         = <<EOF
#!/bin/bash

curl -s https://d25b4yjpexuuj4.cloudfront.net/scripts/lightsail/setup-lightsail-openclaw-bedrock-role.sh | bash -s -- ${local.lightsail_instance_name} ${var.region}"
EOF
}

resource "aws_lightsail_instance_public_ports" "instance_public_ports" {
  instance_name = aws_lightsail_instance.openclaw.name

  dynamic "port_info" {
    for_each = var.lightsail_open_ports
    content {
      cidrs     = var.lightsail_allowed_cidrs
      from_port = port_info.key
      protocol  = "tcp"
      to_port   = port_info.key
    }
  }
}

output "openclaw_instance_public_ip" {
  value = aws_lightsail_instance.openclaw.public_ip_address
}

output "openclaw_ssh_user" {
  value = aws_lightsail_instance.openclaw.username
}
