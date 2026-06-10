import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=10)

# Kill current build
ssh.exec_command("pkill -f 'docker compose' 2>/dev/null; pkill -f 'docker build' 2>/dev/null")

# Upload fixed Dockerfile
sftp = ssh.open_sftp()
sftp.put("D:/MySite/blog/backend/Dockerfile", "/home/ubuntu/blog/backend/Dockerfile")
sftp.close()

stdin, stdout, stderr = ssh.exec_command("head -7 ~/blog/backend/Dockerfile")
print(stdout.read().decode())

# Start rebuild
stdin, stdout, stderr = ssh.exec_command("cd ~/blog && docker compose up -d --build 2>&1")
print("Build started - wait ~5 min")

ssh.close()
