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

# Not documented...
PUT http://{{host}}/ghost/api/admin/media/thumbnail/upload/
# [Options]
# very-verbose: true
# [Cookies]
# ghost-admin-api-session: {{session_cookie}}
[MultipartFormData]
file: file,media/random.png;
url:http://{{host}}/content/media/random.png
HTTP 200
[Captures]
thumb-url: jsonpath "$.media[0].url"

GET {{thumb-url}}
HTTP 200
[Asserts]
header "Content-Type" contains "image"
