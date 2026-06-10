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

run("docker exec blog-frontend-1 ls /etc/letsencrypt/live/gianniiss.top/ 2>&1")
print("---")
run("docker exec blog-frontend-1 nginx -t 2>&1")
print("---")
run("docker logs blog-frontend-1 2>&1 | tail -5")
ssh.close()
