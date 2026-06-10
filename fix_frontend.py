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

# Force recreate frontend
print("=== Rebuilding frontend ===")
run("cd ~/blog && docker compose up -d --force-recreate frontend 2>&1")

# Check
print("\n=== Containers ===")
run("docker ps --format '{{.Names}} {{.Ports}}'")

# Test
print("\n=== Tests ===")
run("curl -s -o /dev/null -w 'HTTP: %{http_code}\n' http://localhost:80")
run("curl -sk -o /dev/null -w 'HTTPS: %{http_code}\n' https://localhost:443")
run("curl -s -o /dev/null -w 'Notes: %{http_code}\n' http://localhost:80/notes/")

ssh.close()
