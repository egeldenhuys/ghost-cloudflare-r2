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
