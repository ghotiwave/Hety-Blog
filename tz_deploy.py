import paramiko, os
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=15)
print("Connected")
sftp = ssh.open_sftp()

# Upload changed backend files
backends = "D:/MySite/blog/backend/app"
for root, dirs, files in os.walk(backends):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for f in files:
        if f.endswith('.pyc'): continue
        local = os.path.join(root, f)
        remote = "/home/ubuntu/blog/" + os.path.relpath(local, "D:/MySite/blog")
        sftp.put(local, remote)
sftp.close()
print("Uploaded")

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(err)

print("=== Rebuilding ===")
run("cd ~/blog && docker compose up -d --build backend 2>&1")
print("=== Test ===")
run("sleep 4 && curl -s http://localhost:8000/api/posts?page_size=1 | head -c 300")
ssh.close()
