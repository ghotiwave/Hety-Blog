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

# Check cert in container
print("=== Cert in container ===")
run("docker exec blog-frontend-1 ls /etc/letsencrypt/live/gianniiss.top/ 2>&1")

# Check nginx config
print("\n=== Nginx config ===")
run("docker exec blog-frontend-1 cat /etc/nginx/conf.d/default.conf 2>&1")

# Check nginx error log
print("\n=== Nginx error ===")
run("docker exec blog-frontend-1 cat /var/log/nginx/error.log 2>&1 | tail -10")

ssh.close()
