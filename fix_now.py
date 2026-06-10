import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    if out.strip(): print(out.strip()[:1000])
    if err.strip(): print(err.strip()[:500])

# Fix docker-compose.yml on server directly
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

run(f"cat > ~/blog/docker-compose.yml << 'COMPOSEEOF'\n{compose}COMPOSEEOF")
print("Config written")

# Rebuild
run("cd ~/blog && docker compose up -d --build 2>&1")
run("docker ps --format '{{.Names}} {{.Ports}}'")

ssh.close()
