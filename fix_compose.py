import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=15)
print("Connected\n")

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(err)

compose = """services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - blog_data:/app/data
      - blog_uploads:/app/uploads
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - DATABASE_URL=sqlite:///data/blog.db
      - AI_API_KEY=${AI_API_KEY:-}
      - AI_BASE_URL=${AI_BASE_URL:-https://api.deepseek.com}
      - AI_MODEL=${AI_MODEL:-deepseek-v4-flash}
      - UPLOAD_DIR=/app/uploads
      - RESEND_API_KEY=${RESEND_API_KEY:-}
      - SITE_DOMAIN=${SITE_DOMAIN:-gianniiss.top}
      - SITE_URL=${SITE_URL:-https://gianniiss.top}
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /home/ubuntu/notes-content/public:/usr/share/nginx/notes:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  blog_data:
  blog_uploads:
"""

run("cat > ~/blog/docker-compose.yml << 'COMPOSEEOF'\n" + compose + "COMPOSEEOF")

print("=== Restarting ===")
run("cd ~/blog && docker compose up -d --force-recreate backend 2>&1")

print("\n=== Check RESEND env ===")
run("docker exec blog-backend-1 env 2>&1 | grep -E 'RESEND|SITE_'")

print("\n=== Test ===")
run("curl -s http://localhost:8000/api/auth/send-code -X POST -H 'Content-Type: application/json' -d '{\"email\":\"hety3413@gmail.com\"}'")
run("docker logs blog-backend-1 2>&1 | tail -5")

ssh.close()
