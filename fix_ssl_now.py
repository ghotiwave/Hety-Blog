import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    if out.strip(): print(out.strip()[:1000])
    if err.strip(): print(err.strip()[:500])

# Upload fixed nginx.conf
sftp = ssh.open_sftp()
sftp.put("D:/MySite/blog/frontend/nginx.conf", "/home/ubuntu/blog/frontend/nginx.conf")
sftp.close()
print("nginx.conf uploaded")

# Enable SSL in nginx.conf on server
run("sed -i 's|# ssl_certificate |ssl_certificate |' ~/blog/frontend/nginx.conf")
run("sed -i 's|# ssl_protocols|ssl_protocols|' ~/blog/frontend/nginx.conf")
run("sed -i 's|# ssl_ciphers|ssl_ciphers|' ~/blog/frontend/nginx.conf")
run("sed -i 's|your-domain|gianniiss.top|g' ~/blog/frontend/nginx.conf")

# Rebuild frontend
run("cd ~/blog && docker compose up -d --build frontend 2>&1")

# Verify
run("curl -sk -o /dev/null -w 'local HTTPS: %{http_code}\n' https://localhost")

ssh.close()
