variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "public_key" {
  description = "Public key content for the EC2 key pair (ssh-rsa ...)." 
  type = string
}

variable "my_ip_cidr" {
  description = "CIDR allowed for SSH (set to your IP/32)."
  type = string
  default = "0.0.0.0/0"
}
