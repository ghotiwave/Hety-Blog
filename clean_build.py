import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=15)
print("Connected")

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(err)

# Verify files on server
print("=== Check server files ===")
run("ls -la ~/blog/backend/app/timezone_utils.py 2>&1")
run("grep BEIJING_TZ ~/blog/backend/app/models/post.py | head -1")

# Clean Docker cache
print("\n=== Cleaning Docker cache ===")
run("docker builder prune -af 2>&1")
run("docker system prune -f 2>&1")

# Remove old image
run("docker rmi blog-backend 2>/dev/null; echo done")

# Rebuild
print("\n=== Building ===")
run("cd ~/blog && docker compose up -d --build backend 2>&1")

# Verify
print("\n=== Test ===")
run("sleep 4 && curl -s http://localhost:8000/api/posts?page_size=1")

ssh.close()
