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

# Check current docker-compose.yml
print("=== Current docker-compose ===")
run("cat ~/blog/docker-compose.yml")

print("\n=== Containers ===")
run("docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'")

print("\n=== Test ===")
run("curl -s -o /dev/null -w 'HTTP: %{http_code}\n' http://localhost:80")
run("curl -sk -o /dev/null -w 'HTTPS: %{http_code}\n' https://localhost:443")

ssh.close()
