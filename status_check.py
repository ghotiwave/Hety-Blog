import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    if out.strip(): print(out.strip()[:2000])
    if err.strip(): print(err.strip()[:500])

run("docker ps -a --format '{{.Names}} {{.Status}}' 2>&1")
print("---")
run("ps aux | grep -E 'docker|compose' | grep -v grep | head -5 2>&1")
print("---")
run("head -7 ~/blog/backend/Dockerfile 2>&1")
ssh.close()
