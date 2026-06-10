import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    if out.strip(): print(out.strip()[:1500])
    if err.strip(): print(err.strip()[:500])

run("docker ps -a --format '{{.Names}} {{.Status}} {{.Ports}}'")
run("docker logs blog-backend-1 --tail 10 2>&1")
ssh.close()
