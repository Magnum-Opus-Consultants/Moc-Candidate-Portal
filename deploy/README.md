# Deploying the MOC Candidate Portal

Target, per SOW MOC-CP:0001: **careers.moc-pty.com**, on the existing MOC
DigitalOcean droplet.

Two processes sit behind nginx:

| | | |
|---|---|---|
| Django API | gunicorn on `127.0.0.1:8002` | `moc-portal-api.service` |
| Next.js | `next start` on `127.0.0.1:3001` | `moc-portal-web.service` |

nginx terminates TLS, serves `/api/`, `/admin/`, `/static/` and `/media/`
from Django and everything else from Next.

Neither process listens on a public interface. Only nginx does.

## First time on the box

```bash
sudo apt install -y nginx python3-venv certbot python3-certbot-nginx
sudo mkdir -p /srv/moc-portal && sudo chown "$USER" /srv/moc-portal
git clone <repo> /srv/moc-portal
```

Write `/srv/moc-portal/backend/.env` — it is git-ignored and never leaves
the server. At minimum:

```ini
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=        # python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
DJANGO_ALLOWED_HOSTS=careers.moc-pty.com
DJANGO_CORS_ALLOWED_ORIGINS=https://careers.moc-pty.com
DJANGO_FRONTEND_URL=https://careers.moc-pty.com
DJANGO_API_BASE_URL=https://careers.moc-pty.com
DJANGO_EMAIL_BACKEND=    # the Graph backend, so mail actually sends
GRAPH_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=https://careers.moc-pty.com/api/auth/linkedin/callback/
```

And `/srv/moc-portal/frontend/.env.production`:

```ini
NEXT_PUBLIC_API_URL=https://careers.moc-pty.com
```

Then install the units and the site:

```bash
sudo cp deploy/moc-portal-api.service deploy/moc-portal-web.service /etc/systemd/system/
sudo cp deploy/nginx-careers.conf /etc/nginx/sites-available/careers.moc-pty.com
sudo ln -sf /etc/nginx/sites-available/careers.moc-pty.com /etc/nginx/sites-enabled/
sudo systemctl daemon-reload
sudo certbot --nginx -d careers.moc-pty.com     # issues the certificate and wires TLS
sudo nginx -t && sudo systemctl reload nginx
```

`certbot` installs its own renewal timer. Check it with
`systemctl list-timers | grep certbot`.

## Every deploy after that

```bash
cd /srv/moc-portal && ./deploy/deploy.sh
```

The script refuses to continue if the working tree is dirty, if
`check --deploy` fails, or if the build fails — so a broken build never
replaces a working one.

## Things worth knowing

- **SQLite is the current database.** Fine for the demo; it will not take
  real concurrent use. Moving to Postgres is a settings change plus a
  `dumpdata`/`loaddata`, and should happen before real candidate traffic.
- **`media/` holds uploaded CVs and photos** and is not in git. It must be
  backed up separately, and it must survive a redeploy — which is why it
  lives under `/srv/moc-portal/backend/media` and is never cleaned.
- **LinkedIn redirect URL** must be added to the LinkedIn app as an
  authorised redirect before sign-in works on the domain.
