import paramiko, os, tarfile, io

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
    return out

# 1. Upload updated notes public
print("=== Uploading notes ===")
sftp = ssh.open_sftp()
sftp.put("D:/MySite/notes_public.tar.gz", "/home/ubuntu/notes_public.tar.gz")
sftp.close()
print("Done")

# 2. Extract notes
print("\n=== Extracting notes ===")
run("cd ~/notes-content && rm -rf public && tar xzf ~/notes_public.tar.gz && rm ~/notes_public.tar.gz")
run("ls ~/notes-content/public/ | head -5")

# 3. Test notes links
print("\n=== Testing notes links ===")
out = run("curl -s http://localhost:80/notes/ | grep -o 'back-home[^\"]*\"[^\"]*\"'")
print(out)

# 4. Upload changed frontend files
print("\n=== Uploading frontend changes ===")
sftp = ssh.open_sftp()
sftp.put("D:/MySite/blog/frontend/src/config.ts", "/home/ubuntu/blog/frontend/src/config.ts")
sftp.put("D:/MySite/blog/frontend/src/components/layout/Header.tsx", "/home/ubuntu/blog/frontend/src/components/layout/Header.tsx")
sftp.close()
print("Done")

# 5. Rebuild frontend
print("\n=== Rebuilding frontend ===")
run("cd ~/blog && docker compose up -d --build frontend 2>&1")

# 6. Verify both
print("\n=== Verify ===")
run("curl -s -o /dev/null -w 'Main: HTTP %{http_code}' http://localhost:80/")
print()
run("curl -s -o /dev/null -w 'Notes: HTTP %{http_code}' http://localhost:80/notes/")
print()
run("curl -s http://localhost:80/notes/ | grep -o 'back-home[^<]*'")

ssh.close()
print("\nDone!")
