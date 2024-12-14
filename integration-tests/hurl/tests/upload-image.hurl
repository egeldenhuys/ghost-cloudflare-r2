# Login as admin
POST http://{{host}}/ghost/api/admin/session/
{
    "username": "{{admin_email}}",
    "password": "{{admin_password}}"
}
HTTP 201
[Captures]
session_cookie: cookie "ghost-admin-api-session"

# https://ghost.org/docs/admin-api/#images
POST http://{{host}}/ghost/api/admin/images/upload
[Options]
verbose: false
[Cookies]
ghost-admin-api-session: {{session_cookie}}
[MultipartFormData]
file: file,images/random.png;
purpose: image
ref: test-ref
HTTP 201
[Captures]
image-url: jsonpath "$.images[0].url"

GET {{image-url}}
HTTP 200
[Asserts]
header "Content-Type" contains "image"
