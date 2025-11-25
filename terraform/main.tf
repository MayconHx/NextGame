provider "aws" {
  region = var.aws_region
  # Se você quiser usar um profile específico, defina a variável de ambiente AWS_PROFILE
  # Exemplo: $env:AWS_PROFILE = 'meuperfil'
}

# Security group para permitir SSH, HTTP e portas do app/monitoring
resource "aws_security_group" "nextgame_sg" {
  name        = "nextgame-sg"
  description = "Security group for NextGame demo"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "App port"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Prometheus"
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Grafana"
    from_port   = 3002
    to_port     = 3002
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Key pair created from provided public key content
resource "aws_key_pair" "deployer_key" {
  key_name   = "nextgame-key"
  public_key = var.public_key
}

# Find latest Amazon Linux 2 AMI (x86_64)
data "aws_ami" "al2" {
  most_recent = true
  owners      = ["137112412989"] # Amazon
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_instance" "nextgame" {
  ami                         = data.aws_ami.al2.id
  instance_type               = var.instance_type
  key_name                    = aws_key_pair.deployer_key.key_name
  vpc_security_group_ids      = [aws_security_group.nextgame_sg.id]
  associate_public_ip_address = true

  tags = {
    Name = "nextgame-server"
  }
}

