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
POST http://{{host}}/ghost/api/admin/media/upload
[Options]
verbose: false
[Cookies]
ghost-admin-api-session: {{session_cookie}}
[MultipartFormData]
file: file,media/test.mp4; video/mp4
HTTP 201
[Captures]
video-url: jsonpath "$.media[0].url"

GET {{video-url}}
HTTP 200
[Asserts]
header "Content-Type" contains "video/mp4"

