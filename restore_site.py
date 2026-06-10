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

# Check container state
print("=== Current state ===")
run("docker ps -a --format '{{.Names}} {{.Status}}' | head -5")

# Start docker compose
print("\n=== Starting ===")
run("cd ~/blog && docker compose up -d 2>&1")

print("\n=== Verify ===")
run("curl -s -o /dev/null -w '%{http_code}' http://localhost")
ssh.close()
