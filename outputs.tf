output "name_servers" {
  value = aws_route53_zone.primary.name_servers
}
output "alb_dns_name" {
  value = aws_lb.main.dns_name
}
output "ecr_backend_url" {
  value = aws_ecr_repository.backend.repository_url
}
output "ecr_frontend_url" {
  value = aws_ecr_repository.frontend.repository_url
}
output "db_endpoint" {
  value = aws_db_instance.postgres.endpoint
}