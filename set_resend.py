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

env = """SECRET_KEY=tbUK8FWUZ-yE1k8_DAqOjCfUoGjPuH70ydiB8WifVZg
ADMIN_USERNAME=Hety
ADMIN_PASSWORD=zcnhcgd18
SITE_NAME=Hety
AI_API_KEY=sk-c29a7c88b2754f0a954eed82eb4406a7
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-flash
RESEND_API_KEY=re_M8sqLMaF_KebmjRZxH8R69WxWLg81fVga
SITE_DOMAIN=gianniiss.top
SITE_URL=https://gianniiss.top
"""

run("cat > ~/blog/.env << 'ENVEOF'\n" + env + "ENVEOF")
print("=== .env updated ===")
run("grep RESEND ~/blog/.env")

print("\n=== Restarting backend ===")
run("cd ~/blog && docker compose up -d backend 2>&1")

print("\n=== Testing ===")
run("curl -s http://localhost:8000/api/auth/send-code -X POST -H 'Content-Type: application/json' -d '{\"email\":\"test@gmail.com\"}'")

ssh.close()
print("\nDone!")
