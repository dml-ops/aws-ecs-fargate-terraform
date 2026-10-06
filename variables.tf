variable "aws_region" {
  type    = string
  default = "eu-north-1"
}
variable "project_name" {
  type    = string
  default = "urlshortener"
}
variable "azs" {
  type    = list(string)
  default = ["eu-north-1a", "eu-north-1b"]
}
variable "domain_name" {
  type = string
}
variable "db_name" {
  type    = string
  default = "shortener"
}
variable "db_username" {
  type    = string
  default = "app_admin"
}
variable "db_password" {
  type      = string
  sensitive = true
}
variable "alert_email" {
  type = string
}
