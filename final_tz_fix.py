import paramiko, os, time

local_tar = "D:/MySite/backend_tz.tar.gz"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=15)
print("Connected")

def run(cmd):
    print(f"$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(err)
    return out

# Upload via SFTP
sftp = ssh.open_sftp()
sftp.put(local_tar, "/tmp/backend_tz.tar.gz")
sftp.close()
print("Uploaded")

# Stop everything
run("docker stop blog-backend-1 blog-frontend-1 2>/dev/null; echo ok")

# Clean everything
run("docker rm blog-backend-1 blog-frontend-1 2>/dev/null; echo ok")
run("docker rmi blog-backend blog-frontend 2>/dev/null; echo ok")
run("docker builder prune -af 2>&1")
run("docker system prune -f 2>&1")

# Extract new code
run("cd ~/blog && tar xzf /tmp/backend_tz.tar.gz --overwrite 2>&1")
run("rm /tmp/backend_tz.tar.gz")

# Verify files
print("\n=== Verify files ===")
if "BEIJING" not in run("grep BEIJING_TZ ~/blog/backend/app/models/post.py 2>&1"):
    print("ERROR: Files not updated!")
    ssh.close()
    exit()

# Rebuild
print("\n=== Rebuilding ===")
run("cd ~/blog && docker compose up -d --build 2>&1")

# Test
time.sleep(5)
print("\n=== Test ===")
run("curl -s http://localhost:8000/api/posts?page_size=1 | head -c 400")

ssh.close()
