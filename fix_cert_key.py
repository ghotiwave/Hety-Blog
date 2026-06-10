import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    if out.strip(): print(out.strip())
    if err.strip(): print(err.strip())

# Fix the key line
run("sed -i 's|# ssl_certificate_key |ssl_certificate_key |' ~/blog/frontend/nginx.conf")
run("grep ssl ~/blog/frontend/nginx.conf")

# Rebuild
run("cd ~/blog && docker compose up -d --build frontend 2>&1")
run("sleep 3 && curl -sk -o /dev/null -w 'HTTPS: %{http_code}\n' https://localhost")

ssh.close()
