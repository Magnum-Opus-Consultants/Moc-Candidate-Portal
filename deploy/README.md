# Deploying the MOC Candidate Portal

Live at **https://careers.demo.moc-pty.com**, on **server-one**, alongside
the other MOC projects under `/var/www/Magnum Opus Consultants/`.
`/srv/moc-portal` is a symlink to that checkout, because systemd unit paths
and a directory name with spaces in it do not mix.

Two processes sit behind nginx:

| | | |
|---|---|---|
| Django API | gunicorn on `127.0.0.1:8004` | `moc-portal-api.service` |
| Next.js | `next start` on `127.0.0.1:3001` | `moc-portal-web.service` |

Ports 8000 and 3000 on that box belong to the MOC Emailing System. Do not
reuse them.

**How the 502 happened, so it does not happen again.** The `careers-demo`
vhost was proxying to a NetBird overlay address — a peer machine, not the
server. When that machine went offline nginx had nowhere to send the
request and returned 502, while the certificate and DNS went on looking
perfectly healthy. Both upstreams are now loopback on the server itself,
so the site's fate no longer depends on anyone's laptop being awake.

nginx terminates TLS, serves `/api/`, `/admin/`, `/static/` and `/media/`
from Django and everything else from Next.

Neither process listens on a public interface. Only nginx does.

## First time on the box

```bash
sudo apt install -y nginx python3-venv certbot python3-certbot-nginx
git clone https://github.com/Magnum-Opus-Consultants/Moc-Candidate-Portal.git \n  "/var/www/Magnum Opus Consultants/Moc-Candidate-Portal"
ln -sfn "/var/www/Magnum Opus Consultants/Moc-Candidate-Portal" /srv/moc-portal
```

Write `/srv/moc-portal/backend/.env` — it is git-ignored and never leaves
the server. At minimum:

```ini
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=        # python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
DJANGO_ALLOWED_HOSTS=careers.demo.moc-pty.com,127.0.0.1,localhost  # loopback: SSR calls the API directly
DJANGO_CORS_ALLOWED_ORIGINS=https://careers.demo.moc-pty.com
DJANGO_FRONTEND_URL=https://careers.demo.moc-pty.com
DJANGO_API_BASE_URL=https://careers.demo.moc-pty.com
DJANGO_EMAIL_BACKEND=    # the Graph backend, so mail actually sends
GRAPH_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=https://careers.demo.moc-pty.com/api/auth/linkedin/callback/
```

And `/srv/moc-portal/frontend/.env.production`:

```ini
NEXT_PUBLIC_API_URL=          # empty on purpose
DEV_API_PROXY=http://127.0.0.1:8004
```

Leaving `NEXT_PUBLIC_API_URL` empty makes the browser use relative `/api`
URLs, which nginx already serves from Django on the same origin — so there
is no CORS to configure and cookies just work. Server-side rendering needs
an absolute URL and takes the loopback shortcut instead of going out to the
public name and back.

Then install the units and the site:

```bash
sudo cp deploy/moc-portal-api.service deploy/moc-portal-web.service /etc/systemd/system/
sudo cp deploy/nginx-careers.conf /etc/nginx/sites-available/careers.demo.moc-pty.com
sudo ln -sf /etc/nginx/sites-available/careers.demo.moc-pty.com /etc/nginx/sites-enabled/
sudo systemctl daemon-reload
sudo certbot --nginx -d careers.demo.moc-pty.com     # already done; renews on its own timer
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
- **Mail does not send until `GRAPH_CLIENT_SECRET` is in `backend/.env`.**
  The Graph backend is configured and sign-up works without it — a failed
  send is caught so it can never break registration — but the welcome mail
  is silently dropped. Put the secret in `.env` on the server and
  `systemctl restart moc-portal-api`.
- **The GitHub repository is public.** It clones with no credentials. There
  are no secrets in it, but the client's source being world-readable is
  probably not intended; making it private costs nothing and the server
  would then need a deploy key.
