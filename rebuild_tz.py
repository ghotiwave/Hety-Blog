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

# Remove old image and container, rebuild
run("docker rm -f blog-backend-1 2>/dev/null; docker rmi blog-backend 2>/dev/null; echo cleaned")

# Rebuild (cached layers except the changed app code)
print("=== Building ===")
run("cd ~/blog && docker compose up -d --build backend 2>&1")

# Verify
print("=== Test ===")
run("sleep 5 && curl -s http://localhost:8000/api/posts?page_size=1")

ssh.close()
