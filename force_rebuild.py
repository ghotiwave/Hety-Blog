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

run("cd ~/blog && docker compose build --no-cache backend 2>&1")
print("=== Starting ===")
run("cd ~/blog && docker compose up -d backend 2>&1")
print("=== Test ===")
run("sleep 4 && curl -s http://localhost:8000/api/posts?page_size=1 | head -c 400")
ssh.close()
