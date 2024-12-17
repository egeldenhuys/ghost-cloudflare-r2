# Create admin account and setup blog
# Attempts to init the blog until 403 is returned, meaning blog has been configured
POST http://{{host}}/ghost/api/admin/authentication/setup
[Options]
retry: 30
retry-interval: 1000ms
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
HTTP 403
[Asserts]
