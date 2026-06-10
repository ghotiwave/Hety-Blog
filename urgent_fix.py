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

# Check nginx container status and logs
print("=== Container ===")
run("docker ps --format '{{.Names}} {{.Status}} {{.Ports}}' | grep frontend")

print("\n=== Nginx error log ===")
run("docker logs blog-frontend-1 2>&1 | tail -15")

# Check if cert exists on host and in container
print("\n=== Host cert ===")
run("sudo ls /etc/letsencrypt/live/gianniiss.top/ 2>&1")
print("\n=== Container cert ===")
run("docker exec blog-frontend-1 ls /etc/letsencrypt/live/gianniiss.top/ 2>&1")

# Check nginx test
print("\n=== Nginx config test ===")
run("docker exec blog-frontend-1 nginx -t 2>&1")

ssh.close()
