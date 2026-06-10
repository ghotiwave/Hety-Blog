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

# Check current nginx.conf on server
print("=== Nginx.conf on server ===")
run("head -15 ~/blog/frontend/nginx.conf")
run("grep -c 'listen.*ssl' ~/blog/frontend/nginx.conf 2>&1 || echo 'no ssl'")

# Rebuild with --build
print("\n=== Rebuilding ===")
run("cd ~/blog && docker compose up -d --build frontend 2>&1")

# Test
print("\n=== Tests ===")
run("curl -sk -o /dev/null -w 'local HTTPS: %{http_code}\n' https://localhost")
run("curl -s -o /dev/null -w 'local Notes: %{http_code}\n' http://localhost/notes/")

ssh.close()
