# Create admin account and setup blog
POST http://{{host}}/ghost/api/admin/authentication/setup
{
    "setup": [
        {
            "name": "Admin",
            "email": "{{admin_email}}",
            "password": "{{admin_password}}",
            "blogTitle": "ghost-cloudflare-r2 test blog"
        }
    ]
}
HTTP *
[Asserts]

# Login as admin
POST http://{{host}}/ghost/api/admin/session/
{
    "username": "{{admin_email}}",
    "password": "{{admin_password}}"
}
HTTP 201
[Captures]
session_cookie: cookie "ghost-admin-api-session"

# Create a POST
POST http://{{host}}/ghost/api/admin/posts/
[Cookies]
ghost-admin-api-session: {{session_cookie}}
{
    "posts": [
        {
            "title": "Test Post"
        }
    ]
}
HTTP 201
