# Deploying AzubiWeg to a free Google Cloud VPS

This is the runbook for hosting AzubiWeg at **azubiweg.is-a.dev** on Google
Cloud's Always Free tier, with the Obsidian vault sync bridged over OneDrive
via `rclone bisync` instead of watching a local folder. Everything here is
meant to be run by hand over SSH — there's no CI/auto-deploy yet, see
[docs/ROADMAP.md](ROADMAP.md) V5.

Config files referenced below live in [`deploy/`](../deploy).

## 1. Create the VPS

1. Sign up for [Google Cloud](https://cloud.google.com/free) (requires card
   verification even for the Always Free tier — no charge as long as usage
   stays within the free quota below).
2. Create a project, enable the **Compute Engine API**, then create an
   **Always Free** compute instance:
   - Machine type: **e2-micro** — the only shape covered by Always Free.
   - Region: **us-west1**, **us-central1**, or **us-east1** only — any other
     region bills at full price.
   - Boot disk: Debian 12/13 or Ubuntu 24.04, size ≤30GB, disk type
     **Standard Persistent Disk** — the console defaults new VMs to
     "Balanced" (SSD-backed), which is *not* covered by Always Free.
   - The create-instance page's "Monthly estimate" quotes full list price
     regardless of free-tier eligibility (~$6-8/mo for e2-micro); the Always
     Free credit shows up as a $0-net line in **Billing → Reports**, not in
     that estimate. Set a billing budget alert (e.g. $1 threshold) as a
     same-day tripwire instead of trusting the estimate.
3. Reserve the instance's external IP as **static** — GCP's default IP is
   ephemeral and gets reassigned on stop/restart, which would silently break
   the DNS record from step 9:
   ```bash
   gcloud compute addresses create azubiweg-ip \
     --region=<REGION> --addresses=<CURRENT_EPHEMERAL_IP>
   ```
4. Open ports **80** and **443**:
   ```bash
   gcloud compute instances add-tags <INSTANCE_NAME> --zone=<ZONE> --tags=azubiweg
   gcloud compute firewall-rules create azubiweg-http \
     --allow=tcp:80,tcp:443 --target-tags=azubiweg --source-ranges=0.0.0.0/0
   ```
   (Unlike Oracle, GCP's Debian/Ubuntu images don't add a second host-level
   default-deny firewall on top — this one rule is enough.)
5. Add swap — e2-micro's 1GB RAM is tight running Postgres (Docker) + Node +
   rclone all at once:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

## 2. Base packages

```bash
sudo apt update && sudo apt install -y git rclone

# Docker + Compose plugin (official script — same on Debian and Ubuntu)
curl -fsSL https://get.docker.com | sudo sh

# Node LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# Caddy (reverse proxy + auto-TLS) — same repo works on Debian and Ubuntu
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Create a dedicated non-root user to run the app and own its data:

```bash
sudo useradd -r -m -d /opt/azubiweg -s /usr/sbin/nologin azubiweg
sudo mkdir -p /opt/azubiweg/vaults
sudo chown -R azubiweg:azubiweg /opt/azubiweg
```

## 3. Clone the repo and build

```bash
sudo -u azubiweg git clone https://github.com/Plesnte25/AzubiWeg.git /opt/azubiweg/repo

cd /opt/azubiweg/repo/server
sudo -u azubiweg npm ci
sudo -u azubiweg npm run build

cd /opt/azubiweg/repo/client
sudo -u azubiweg npm ci
sudo -u azubiweg npm run build
sudo -u azubiweg cp -r dist /opt/azubiweg/client-dist
```

## 4. Postgres

```bash
cd /opt/azubiweg/repo
sudo docker compose -f deploy/docker-compose.yml up -d
```

Set a real password (not the `azubiweg`/`azubiweg` placeholder in
`deploy/docker-compose.yml`) before this ever sees real data — edit the
compose file's `POSTGRES_PASSWORD` and the `DATABASE_URL` below to match.

## 5. Secrets file

`azubiweg.service`'s env comes from an **untracked** file — never commit
this:

```bash
sudo -u azubiweg tee /opt/azubiweg/.env <<'EOF'
DATABASE_URL="postgresql://azubiweg:<your-real-password>@127.0.0.1:5433/azubiweg"
JWT_SECRET="<32+ random bytes, e.g. `openssl rand -hex 32`>"
PORT=3000
EOF

cd /opt/azubiweg/repo/server
sudo -u azubiweg npx prisma migrate deploy
```

## 6. rclone: bridge the Obsidian vault over OneDrive

The Obsidian "Remotely Save" plugin already syncs your vault to OneDrive
Personal under `Apps/remotely-save/German` (Remotely Save nests everything
under `Apps/remotely-save/<vault>` — confirm yours with `rclone lsd onedrive:
-R --max-depth 3` if it differs). Point rclone at the *same* remote so the
VPS gets a live local copy without touching your laptop's setup.

OAuth needs a real browser, so run this as your own SSH login user (not
`azubiweg`) over a port-forwarded SSH session:

```bash
# from your laptop:
gcloud compute ssh <instance> --zone=<zone> --tunnel-through-iap -- -L 53682:localhost:53682
# once connected:
rclone config
# n) New remote -> name it "onedrive" -> type "onedrive" -> leave
# client_id/secret blank -> global region -> auto config yes -> open the
# printed 127.0.0.1:53682 URL in your laptop's browser and sign in with the
# same Microsoft account Remotely Save uses -> OneDrive Personal -> confirm
# the drive found.
```

Then copy the resulting config to `azubiweg` (the bisync service runs as
that user, and `rclone config` above just wrote to *your* home directory):

```bash
sudo mkdir -p /opt/azubiweg/.config/rclone
sudo cp ~/.config/rclone/rclone.conf /opt/azubiweg/.config/rclone/rclone.conf
sudo chown -R azubiweg:azubiweg /opt/azubiweg/.config
sudo chmod 600 /opt/azubiweg/.config/rclone/rclone.conf
```

Confirm the remote sees your vault:

```bash
sudo -u azubiweg rclone lsf onedrive:Apps/remotely-save/German
```

If `Vocab/master.md` isn't directly under that listing, adjust the remote
path in `deploy/systemd/rclone-bisync.service` (and the one-off command
below) to whatever subfolder actually holds it.

**First run — establishes the bisync baseline (one-time only, do this before
enabling the timer):**

```bash
sudo -u azubiweg rclone bisync onedrive:Apps/remotely-save/German /opt/azubiweg/vaults/tanzeel \
  --resync --filters-file=/opt/azubiweg/repo/deploy/rclone-filter.txt
```

Confirm it worked:

```bash
ls /opt/azubiweg/vaults/tanzeel/Vocab/master.md
```

Now enable the recurring timer (ordinary bisync passes from here on, no
`--resync`):

```bash
sudo ln -s /opt/azubiweg/repo/deploy/systemd/rclone-bisync.service /etc/systemd/system/
sudo ln -s /opt/azubiweg/repo/deploy/systemd/rclone-bisync.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rclone-bisync.timer
```

## 7. Run the app

```bash
sudo ln -s /opt/azubiweg/repo/deploy/systemd/azubiweg.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now azubiweg
sudo journalctl -u azubiweg -f   # watch it come up
```

In the app, sign in and set your vault path (Settings) to
`/opt/azubiweg/vaults/tanzeel` — same UX as pointing it at a local folder in
dev, it's just backed by the bisync now.

## 8. Caddy (reverse proxy + free TLS)

```bash
sudo ln -sf /opt/azubiweg/repo/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy fetches a Let's Encrypt cert automatically the moment
`azubiweg.is-a.dev` resolves to this box (step 9) and port 80/443 are
reachable (step 1.4).

## 9. DNS via is-a.dev

is-a.dev domains are registered by PR against
[`is-a-dev/register`](https://github.com/is-a-dev/register) — do this from
your own GitHub account, not something to hand off. Fork the repo and add
`domains/azubiweg.json`:

```json
{
    "owner": {
        "username": "Plesnte25",
        "email": "tanzeel.zander@gmail.com"
    },
    "records": {
        "A": ["<VPS_PUBLIC_IP>"]
    }
}
```

Check `CONTRIBUTING.md` in that repo first — their required JSON shape
changes occasionally. Open the PR; once merged, DNS propagation is usually
fast (their zone has a short TTL) but can take up to a few hours.

## 10. Link it from GitHub

Once `https://azubiweg.is-a.dev` is actually reachable, add a live-demo line
near the top of `README.md`, e.g.:

```markdown
🔗 **Live**: [azubiweg.is-a.dev](https://azubiweg.is-a.dev)
```

Optionally also set it as the repo's website field:
`gh repo edit --homepage https://azubiweg.is-a.dev`.

## 11. Verify end to end

- `curl https://azubiweg.is-a.dev/api/health` → `{"ok":true}` over a valid
  TLS cert.
- Log in from two different devices/browsers at once.
- `journalctl -u azubiweg -u rclone-bisync.timer` — clean, no "vault path
  missing" warning (that means `resumeAll()` found the bisync'd directory).
- Edit a vocab word in the app; within a few minutes it should show up in
  Obsidian (OneDrive → Remotely Save pulls the rclone-bisync'd change), and
  editing a card in Obsidian should show up in the app the same way — this
  is the whole point, confirm it actually round-trips.
- `cd server && npm test` still green.

## 12. Ongoing deploys

After pushing to `main`, SSH in as your own sudo-capable admin user (not
`azubiweg`) and run:

```bash
ssh <vps> 'sudo /opt/azubiweg/repo/deploy/deploy.sh'
```

See [`deploy/deploy.sh`](../deploy/deploy.sh) — pulls, rebuilds both
workspaces, runs pending Prisma migrations, redeploys the client build, and
restarts the service.
