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

# Force recreate to pick up new env vars
print("=== Restarting backend ===")
run("cd ~/blog && docker compose up -d --force-recreate backend 2>&1")

print("\n=== Check RESEND env ===")
run("docker exec blog-backend-1 env 2>&1 | grep RESEND")

print("\n=== Test send-code ===")
run("curl -s http://localhost:8000/api/auth/send-code -X POST -H 'Content-Type: application/json' -d '{\"email\":\"hety3413@gmail.com\"}'")

ssh.close()
print("\nDone! Check your email at hety3413@gmail.com")
