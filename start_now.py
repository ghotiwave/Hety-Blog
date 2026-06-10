import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=10)

stdin, stdout, stderr = ssh.exec_command("cd ~/blog && docker compose up -d --build 2>&1")
out = stdout.read().decode(errors='replace')
err = stderr.read().decode(errors='replace')
print(out[-2000:] if len(out) > 2000 else out)
if err: print("ERR:", err[-500:])

ssh.close()
