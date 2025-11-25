output "instance_public_ip" {
  value = aws_instance.nextgame.public_ip
}

output "instance_id" {
  value = aws_instance.nextgame.id
}
