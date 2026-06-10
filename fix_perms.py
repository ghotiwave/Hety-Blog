import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip(): print(out.strip()[:500])
    if err.strip(): print(err.strip()[:500])

# Fix ownership of all blog files
run("sudo chown -R ubuntu:ubuntu ~/blog/frontend/public/ 2>&1")
run("sudo chown -R ubuntu:ubuntu ~/blog/frontend/scripts/ 2>&1")
run("sudo chown -R ubuntu:ubuntu ~/blog/backend/ 2>&1")
print("Permissions fixed")

# Verify CI/CD worked - check if backend rebuilt
run("docker ps --format '{{.Names}} {{.Status}}'")
run("curl -s -o /dev/null -w '%{http_code}' http://localhost")

ssh.close()
