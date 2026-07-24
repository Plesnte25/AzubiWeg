# Deploying AzubiWeg to a free Google Cloud VPS

This is the runbook for hosting AzubiWeg at **azubiweg.duckdns.org** on Google
Cloud's Always Free tier, with the Obsidian vault sync bridged over OneDrive
via `rclone bisync` instead of watching a local folder. Everything here is
meant to be run by hand over SSH — there's no CI/auto-deploy yet, see
[docs/ROADMAP.md](ROADMAP.md) V5.

DNS is DuckDNS for now, not is-a.dev — the `is-a-dev/register` PR was denied
three times, so that path is dropped. A parallel application for
**azubiweg.eu.org** is in flight (see step 9b); eu.org review can take weeks
to months, so DuckDNS is the domain actually in use until/unless that's
approved.

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
sudo chmod o+x /opt/azubiweg
```

That last `chmod` only adds *traverse* permission, not read/list — `useradd -m`
defaults to `750`, which blocks every other user (including the `caddy`
system user that needs to follow the `/etc/caddy/Caddyfile` symlink in step 8,
and your own SSH login user running the `cd`-then-`sudo -u azubiweg` commands
below) from even entering the directory. Everything inside stays protected by
its own permissions (`.env` is `600`).

Also, `sudo -u azubiweg <cmd>` on this image does **not** give you a working
CWD if you `cd` first as your own (non-azubiweg) user — that `cd` silently
fails against the `750`-turned-`750+x` directory and leaves the shell wherever
it started, so `sudo -u azubiweg npm ci` etc. then runs from the wrong
directory. Always do the `cd` *inside* the sudo'd shell instead:
`sudo -u azubiweg bash -c 'cd /opt/azubiweg/... && <cmd>'` — every command
below that needs a working directory uses this form.

## 3. Clone the repo and build

```bash
sudo -u azubiweg git clone https://github.com/Plesnte25/AzubiWeg.git /opt/azubiweg/repo

sudo -u azubiweg bash -c 'cd /opt/azubiweg/repo/server && npm ci'
# npm 11's script-allowlist feature blocks Prisma's postinstall hook, so
# `prisma generate` doesn't run automatically here — do it explicitly:
sudo -u azubiweg bash -c 'cd /opt/azubiweg/repo/server && npx prisma generate'
sudo -u azubiweg bash -c 'cd /opt/azubiweg/repo/server && npm run build'

sudo -u azubiweg bash -c 'cd /opt/azubiweg/repo/client && npm ci'
sudo -u azubiweg bash -c 'cd /opt/azubiweg/repo/client && npm run build'
sudo -u azubiweg cp -r /opt/azubiweg/repo/client/dist /opt/azubiweg/client-dist
```

## 4. Postgres

Generate a real password (never use the `azubiweg`/`azubiweg` placeholder
committed in `deploy/docker-compose.yml`) and patch the compose file with it:

```bash
DB_PASS=$(openssl rand -hex 24)
sudo sed -i "s/POSTGRES_PASSWORD: azubiweg/POSTGRES_PASSWORD: $DB_PASS/" /opt/azubiweg/repo/deploy/docker-compose.yml
echo "$DB_PASS" | sudo tee /opt/azubiweg/.dbpass > /dev/null
sudo chown azubiweg:azubiweg /opt/azubiweg/.dbpass
sudo chmod 600 /opt/azubiweg/.dbpass
```

This edits a *tracked* file's working-tree copy only — never commit the real
password. A future `git pull` on this box will conflict on this file; `git
stash`, `pull`, `stash pop` reapplies the password cleanly since it touches a
different line than any upstream change would.

```bash
sudo bash -c 'cd /opt/azubiweg/repo && docker compose -f deploy/docker-compose.yml up -d'
```

## 5. Secrets file

`azubiweg.service`'s env comes from an **untracked** file — never commit
this:

```bash
DB_PASS=$(sudo cat /opt/azubiweg/.dbpass)
JWT_SECRET=$(openssl rand -hex 32)
sudo -u azubiweg tee /opt/azubiweg/.env > /dev/null <<EOF
DATABASE_URL="postgresql://azubiweg:${DB_PASS}@127.0.0.1:5433/azubiweg"
JWT_SECRET="${JWT_SECRET}"
PORT=3000
EOF
sudo chmod 600 /opt/azubiweg/.env

sudo -u azubiweg bash -c 'cd /opt/azubiweg/repo/server && set -a && source /opt/azubiweg/.env && set +a && npx prisma migrate deploy'
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
enabling the timer):** bisync requires both sides to already exist, so create
the local destination first — it's not covered by the `useradd -m` step:

```bash
sudo -u azubiweg mkdir -p /opt/azubiweg/vaults/sharjeel
sudo -u azubiweg rclone bisync onedrive:Apps/remotely-save/German /opt/azubiweg/vaults/sharjeel \
  --resync --filters-file=/opt/azubiweg/repo/deploy/rclone-filter.txt
```

Confirm it worked:

```bash
ls /opt/azubiweg/vaults/sharjeel/Vocab/master.md
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
`/opt/azubiweg/vaults/sharjeel` — same UX as pointing it at a local folder in
dev, it's just backed by the bisync now.

## 8. Caddy (reverse proxy + free TLS)

```bash
sudo ln -sf /opt/azubiweg/repo/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy fetches a Let's Encrypt cert automatically the moment
`azubiweg.duckdns.org` resolves to this box (step 9) and port 80/443 are
reachable (step 1.4).

## 9. DNS via DuckDNS

No PR review, no waiting — DuckDNS gives you a subdomain and a "current ip"
field per-domain that it publishes as that domain's A record (DuckDNS's UI
never uses the term "A record" itself — "current ip" *is* the A record, it's
just not labeled that way). Do this yourself (it's tied to your own DuckDNS
account, not something to hand off):

1. Go to [duckdns.org](https://www.duckdns.org) and sign in (GitHub, Google,
   Twitter, Reddit, or Persona — pick whichever account you're comfortable
   linking).
2. Under "add domain," enter `azubiweg` and click **add domain**. This
   claims `azubiweg.duckdns.org` — already done as of 2026-07-24.
3. On the row for that domain, there's a text box next to "current ip"
   (separate from the "ipv6 address" box below it — use the IPv4 one).
   Enter the VPS's static IP (`34.42.175.158` from step 1.3) into it and
   click that row's **update ip** button.
4. Confirm it resolved: `dig +short azubiweg.duckdns.org` should print
   `34.42.175.158` (may take a minute or two, DuckDNS's TTL is short).

Because the VPS IP is reserved as static (step 1.3), this is a one-time
setup — no dynamic-update script or cron job needed. If the instance is ever
deleted and recreated with a new IP, repeat step 3 with the new address.

The Caddyfile (`deploy/Caddyfile`) already points at `azubiweg.duckdns.org`;
nothing else to change here once DNS resolves.

## 9b. DNS via eu.org (parallel, pending)

Apply for **azubiweg.eu.org** at [eu.org](https://eu.org/) in parallel — do
this from your own account, same as DuckDNS. eu.org is manually reviewed and
can take anywhere from a few weeks to several months, so treat DuckDNS
(step 9) as the domain actually in use until this comes through. Once
approved:

1. In the eu.org control panel, set the domain's A record to the VPS's
   static IP (`34.42.175.158`).
2. Uncomment the `azubiweg.eu.org` block in `deploy/Caddyfile` and reload
   Caddy: `sudo systemctl reload caddy`. It fetches its own Let's Encrypt
   cert automatically once DNS resolves — the `azubiweg.duckdns.org` block
   keeps working unchanged alongside it.
3. Update the live-demo link (step 10) and this doc to point at
   `azubiweg.eu.org` as the primary domain if you want to retire the DuckDNS
   one, or just leave both resolving to the same box.

## 10. Link it from GitHub

Once `https://azubiweg.duckdns.org` is actually reachable, add a live-demo
line near the top of `README.md`, e.g.:

```markdown
🔗 **Live**: [azubiweg.duckdns.org](https://azubiweg.duckdns.org)
```

Optionally also set it as the repo's website field:
`gh repo edit --homepage https://azubiweg.duckdns.org`.
Swap both to `azubiweg.eu.org` later if/when that's approved (step 9b).

## 11. Verify end to end

- `curl https://azubiweg.duckdns.org/api/health` → `{"ok":true}` over a valid
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
