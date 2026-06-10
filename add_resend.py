import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=15)
print("Connected")

sftp = ssh.open_sftp()
sftp.put("D:/MySite/blog/backend/requirements.txt", "/home/ubuntu/blog/backend/requirements.txt")
sftp.put("D:/MySite/blog/backend/app/services/email_service.py", "/home/ubuntu/blog/backend/app/services/email_service.py")
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

print("=== Testing ===")
run("sleep 5 && curl -s http://localhost:8000/api/auth/send-code -X POST -H 'Content-Type: application/json' -d '{\"email\":\"hety3413@gmail.com\"}'")

print("=== Logs ===")
run("docker logs blog-backend-1 2>&1 | tail -10")
ssh.close()
