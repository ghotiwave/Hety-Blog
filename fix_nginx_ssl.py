import paramiko

nginx = """server {
    listen 80;
    listen 443 ssl;
    server_name _;

    ssl_certificate /etc/letsencrypt/live/gianniiss.top/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gianniiss.top/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
        proxy_connect_timeout 30s;
    }

    location /uploads/ {
        proxy_pass http://backend:8000;
    }

    location /notes {
        root /usr/share/nginx;
        index index.html;
        try_files $uri $uri.html $uri/ /notes/index.html;
    }
}
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=15)
print("Connected")

# Write nginx config
cmd = f"""cat > ~/blog/frontend/nginx.conf << 'NGXEOF'
{nginx}
NGXEOF"""
stdin, stdout, stderr = ssh.exec_command(cmd)
print("Config written")

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(err)

# Verify config
print("\n=== Verify config ===")
run("grep -c 'listen.*ssl' ~/blog/frontend/nginx.conf")

# Rebuild frontend
print("\n=== Rebuilding ===")
run("cd ~/blog && docker compose up -d --build frontend 2>&1")

# Test
print("\n=== Tests ===")
run("curl -sk -o /dev/null -w 'HTTPS: %{http_code}\n' https://localhost")
run("curl -s -o /dev/null -w 'Notes: %{http_code}\n' http://localhost/notes/")

ssh.close()
print("\nDone!")
