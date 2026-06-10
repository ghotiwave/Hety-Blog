import paramiko

resend_key = input("请输入 Resend API Key: ").strip()

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

# Update .env with RESEND_API_KEY
env_content = f"""SECRET_KEY=tbUK8FWUZ-yE1k8_DAqOjCfUoGjPuH70ydiB8WifVZg
ADMIN_USERNAME=Hety
ADMIN_PASSWORD=zcnhcgd18
SITE_NAME=Hety
AI_API_KEY=sk-c29a7c88b2754f0a954eed82eb4406a7
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-flash
RESEND_API_KEY={resend_key}
SITE_DOMAIN=gianniiss.top
SITE_URL=https://gianniiss.top
"""

cmd = f"""cat > ~/blog/.env << 'ENVEOF'
{env_content}
ENVEOF"""
run(cmd)

print("\n=== Updated .env ===")
run("grep -E 'RESEND|SITE_' ~/blog/.env")

# Restart backend to pick up new env
print("\n=== Restarting ===")
run("cd ~/blog && docker compose up -d backend 2>&1")

ssh.close()
print("\nDone! RESEND_API_KEY 已配置")
