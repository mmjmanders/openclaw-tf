variable "region" {}
variable "stage" {}
variable "lightsail_bundle_id" {}
variable "lightsail_public_key" {}
variable "lightsail_allowed_cidrs" {
  type = set(string)
}

locals {
  name = join("-", ["lightsail", var.stage])
}

resource "aws_lightsail_key_pair" "key_pair" {
  name       = "${local.name}-key-pair"
  public_key = var.lightsail_public_key
}

resource "aws_lightsail_instance" "openclaw" {
  name              = "${local.name}-instance"
  availability_zone = "${var.region}a"
  blueprint_id      = "openclaw_ls_1_0"
  bundle_id         = var.lightsail_bundle_id
  key_pair_name     = aws_lightsail_key_pair.key_pair.name
}

resource "aws_lightsail_instance_public_ports" "instance_public_ports" {
  instance_name = aws_lightsail_instance.openclaw.name

  port_info {
    cidrs     = var.lightsail_allowed_cidrs
    from_port = 22
    protocol  = "tcp"
    to_port   = 22
  }

  port_info {
    cidrs     = var.lightsail_allowed_cidrs
    from_port = 443
    protocol  = "tcp"
    to_port   = 443
  }
}

output "openclaw_instance_public_ip" {
  value = aws_lightsail_instance.openclaw.public_ip_address
}

output "openclaw_ssh_user" {
  value = aws_lightsail_instance.openclaw.username
}
