import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("106.54.211.108", username="ubuntu", password="Zcnhcgd18", timeout=15)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    if out.strip(): print(out.strip())
    if err.strip(): print(err.strip())

# Restore from git - revert timezone changes
run("cd ~/blog && git checkout backend/app/models/post.py backend/app/models/comment.py backend/app/models/digest.py backend/app/models/like.py backend/app/models/score.py backend/app/models/user.py backend/app/models/profile.py backend/app/models/reading_history.py backend/app/routers/auth.py backend/app/services/ai_digest.py backend/app/services/news_fetcher.py 2>&1")
run("rm -f ~/blog/backend/app/timezone_utils.py 2>&1")
run("cd ~/blog && docker compose up -d 2>&1")
run("curl -s -o /dev/null -w '%{http_code}' http://localhost")
ssh.close()
