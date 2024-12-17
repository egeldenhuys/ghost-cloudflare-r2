# Login as admin
# TODO: template?
POST http://{{host}}/ghost/api/admin/session/
{
    "username": "{{admin_email}}",
    "password": "{{admin_password}}"
}
HTTP 201
[Captures]
session_cookie: cookie "ghost-admin-api-session"

# Undocumented...
POST http://{{host}}/ghost/api/admin/files/upload
[Options]
verbose: false
[Cookies]
ghost-admin-api-session: {{session_cookie}}
[MultipartFormData]
file: file,media/generate.sh; application/x-shellscript
HTTP 201
[Captures]
file-url: jsonpath "$.files[0].url"

GET {{file-url}}
HTTP 200
[Asserts]
header "Content-Type" contains "application/x-sh"

