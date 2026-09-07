# Deploying AzubiWeg to a free Oracle Cloud VPS

This is the runbook for hosting AzubiWeg at **azubiweg.duckdns.org** on Oracle
Cloud's Always Free tier (Ampere ARM), with the Obsidian vault sync bridged
over OneDrive via `rclone bisync` instead of watching a local folder.
Everything here is meant to be run by hand over SSH — there's no CI/auto-deploy
yet, see [docs/ROADMAP.md](ROADMAP.md) V5.

**2026-09-07: migrated here from a GCP e2-micro** (Always Free tier, 1GB RAM).
That box worked but was too resource-constrained for the kaikki.org/DErivBase
enrichment imports (mid-download connection drops on the ~1GB kaikki dump,
and an out-of-memory crash importing DErivBase) — see the two provider-specific
workarounds called out inline below, neither of which turned out to be
necessary on Oracle's ARM shape. The GCP instance is stopped (not deleted) as
a fallback; if reviving it, its runbook is this file's git history before this
commit.

DNS is DuckDNS for now, not is-a.dev — the `is-a-dev/register` PR was denied
three times, so that path is dropped. A parallel application for
**azubiweg.eu.org** is in flight (see step 9b); eu.org review can take weeks
to months, so DuckDNS is the domain actually in use until/unless that's
approved.

Config files referenced below live in [`deploy/`](../deploy).

## 1. Create the VPS

1. Sign up for [Oracle Cloud](https://www.oracle.com/cloud/free/) (Always
   Free tier — no charge as long as usage stays within the free ARM
   allowance below).
2. Create a compute instance on the **Ampere A1** shape (ARM/aarch64) — the
   Always Free tier gives you a pool of up to 4 OCPUs and 24GB RAM to split
   across up to 4 such instances; this deployment uses 2 OCPUs / ~12GB RAM
   on a single instance, comfortably inside the free allowance.
   - Image: Ubuntu 24.04 (aarch64/arm64 build).
   - Boot volume: default is plenty (this deployment uses 45GB).
3. Reserve/assign a public IP for the instance and note it — Oracle's
   console shows this on the instance's detail page.
4. Open ports **80**, **443**, and **22** for inbound TCP in the instance's
   **VCN → Security List** (or Network Security Group if you attached one):
   add ingress rules for each, source `0.0.0.0/0`.
   **Gotcha, unlike GCP**: Oracle's Ubuntu images ship with a second,
   host-level `iptables` firewall on top of the cloud-level Security List —
   both layers need to allow a port, or traffic is dropped. The stock
   ruleset only allows established/related traffic and new SSH (port 22)
   connections; insert explicit accepts for 80/443 before the default
   REJECT rule and persist them:
   ```bash
   sudo iptables -I INPUT 4 -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 5 -p tcp --dport 443 -j ACCEPT
   sudo apt install -y iptables-persistent
   sudo netfilter-persistent save
   ```
   (Check `sudo iptables -L INPUT -n --line-numbers` first — insert your
   accepts immediately before whatever line number the REJECT rule is on,
   adjusting the `-I INPUT N` position accordingly if it differs.)
5. **Swap**: not needed on this shape — with ~12GB RAM, Postgres (Docker) +
   Node + rclone all run comfortably without it (confirmed live: 0% swap
   usage under normal load). If you provision a smaller/lower-RAM shape,
   revisit this — the GCP e2-micro's 1GB RAM needed 2GB of swap for the
   same workload.

## 2. Base packages

Identical regardless of provider — apt resolves the correct arm64 packages
automatically:

```bash
sudo apt update && sudo apt install -y git rclone

# Docker + Compose plugin (official script — works on arm64 too)
curl -fsSL https://get.docker.com | sudo sh

# Node LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# Caddy (reverse proxy + auto-TLS)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
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
and your own SSH login user running the commands below) from even entering
the directory. Everything inside stays protected by its own permissions
(`.env` is `600`).

Always do a `cd` *inside* a `sudo -u azubiweg bash -c '...'` invocation
rather than before it — `sudo -u azubiweg <cmd>` doesn't inherit a `cd` you
ran as your own login user, and the `750`-turned-`751` directory silently
blocks it anyway.

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
ssh -i /path/to/your-instance-key.key -L 53682:localhost:53682 ubuntu@<VPS_IP>
# once connected:
rclone config
# n) New remote -> name it "onedrive" -> type "onedrive" -> leave
# client_id/secret blank -> global region -> auto config yes -> open the
# printed 127.0.0.1:53682 URL in your laptop's browser and sign in with the
# same Microsoft account Remotely Save uses -> OneDrive Personal -> confirm
# the drive found.
```

**Picking the right drive**: rclone lists every drive associated with the
account, several loosely labeled "(personal)". The real OneDrive Personal
drive is the one with a plain hex `drive_id` (e.g. `F2C1E5670BC0B38F`);
GUID-named drives and anything like `ODCMetadataArchive` are other
app-associated or internal drives, not your files. If you pick wrong, the
next step's `rclone lsf` comes back empty — just re-run `rclone config` and
try a different one.

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

## 8. Populate the kaikki.org / DErivBase enrichment data

**Real gap this deployment had for a long time on GCP**: `prisma migrate
deploy` only creates schema, not the reference data behind declension/
conjugation tables and bilingual examples. Without this, every word shows
"No grammar table available" regardless of how well vault sync is working —
easy to mistake for a sync bug when it's actually just missing data.

```bash
cd /opt/azubiweg/repo/server
sudo -u azubiweg bash -c 'set -a && source /opt/azubiweg/.env && set +a && npm run import:kaikki'
sudo -u azubiweg bash -c 'set -a && source /opt/azubiweg/.env && set +a && npm run import:derivbase'
sudo -u azubiweg bash -c 'set -a && source /opt/azubiweg/.env && set +a && npm run backfill:kaikki'
sudo -u azubiweg bash -c 'set -a && source /opt/azubiweg/.env && set +a && npm run backfill:example-translation'
```

`import:kaikki` streams a ~1GB dump; on this box's RAM/network it completes
directly. **On a more resource-constrained box** (like the GCP e2-micro this
deployment used to run on), two issues showed up that don't apply here but
are worth knowing about:

- A live `fetch()` over a flaky connection has no read-timeout, so a
  mid-download stall drops the connection with no retry. Fix: download
  separately with a resumable `curl -C -` first, then point the import at
  it via `KAIKKI_LOCAL_PATH=/path/to/file.jsonl npm run import:kaikki`.
- `import:derivbase` decompresses its zip fully into memory before parsing,
  which OOM'd on a 1GB-RAM box. Fix: raise Node's heap ceiling for that one
  run, e.g. `NODE_OPTIONS=--max-old-space-size=1536 npm run import:derivbase`
  (needs swap to back the extra headroom on a box that tight on RAM).

The two backfill scripts only touch words that already exist in the
database — run (or re-run; both are idempotent) them again after any bulk
vault import if new words got skipped the first time.

## 9. Caddy (reverse proxy + free TLS)

```bash
sudo ln -sf /opt/azubiweg/repo/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy fetches a Let's Encrypt cert automatically the moment
`azubiweg.duckdns.org` resolves to this box (step 10) and ports 80/443 are
reachable (step 1.4) — via the `tls-alpn-01` challenge type in practice, no
extra config needed for that.

**Testing before DNS points here**: `deploy/Caddyfile` keeps a permanent
plain-HTTP block bound to this box's raw IP (`http://<VPS_IP> { import app }`)
specifically so you can verify the whole app end-to-end — registering an
account, linking the vault, running the enrichment backfill — before
cutting DNS over from whatever was live before. Once verified, switch DNS
(step 10) and Caddy will pick up the real domain's cert on the next reload
with no further config change.

## 10. DNS via DuckDNS

No PR review, no waiting — DuckDNS gives you a subdomain and a "current ip"
field per-domain that it publishes as that domain's A record (DuckDNS's UI
never uses the term "A record" itself — "current ip" *is* the A record, it's
just not labeled that way). Do this yourself (it's tied to your own DuckDNS
account, not something to hand off):

1. Go to [duckdns.org](https://www.duckdns.org) and sign in (GitHub, Google,
   Twitter, Reddit, or Persona — pick whichever account you're comfortable
   linking).
2. Under "add domain," enter `azubiweg` and click **add domain** (already
   done — this claims `azubiweg.duckdns.org` once, permanently; re-pointing
   it to a new server later, e.g. a provider migration, only needs step 3).
3. On the row for that domain, there's a text box next to "current ip"
   (separate from the "ipv6 address" box below it — use the IPv4 one).
   Enter the VPS's public IP into it and click that row's **update ip**
   button.
4. Confirm it resolved: `dig +short azubiweg.duckdns.org` should print the
   new IP (may take a minute or two, DuckDNS's TTL is short).

If the instance is ever deleted and recreated with a new IP (or you migrate
to a different VPS/provider entirely, as this deployment already has once),
repeat step 3 with the new address — that's the only DNS-side change a
migration needs.

The Caddyfile (`deploy/Caddyfile`) already points at `azubiweg.duckdns.org`;
nothing else to change here once DNS resolves.

## 10b. DNS via eu.org (parallel, pending)

Apply for **azubiweg.eu.org** at [eu.org](https://eu.org/) in parallel — do
this from your own account, same as DuckDNS. eu.org is manually reviewed and
can take anywhere from a few weeks to several months, so treat DuckDNS
(step 10) as the domain actually in use until this comes through. Once
approved:

1. In the eu.org control panel, set the domain's A record to the VPS's
   public IP.
2. Uncomment the `azubiweg.eu.org` block in `deploy/Caddyfile` and reload
   Caddy: `sudo systemctl reload caddy`. It fetches its own Let's Encrypt
   cert automatically once DNS resolves — the `azubiweg.duckdns.org` block
   keeps working unchanged alongside it.
3. Update the live-demo link (step 11) and this doc to point at
   `azubiweg.eu.org` as the primary domain if you want to retire the DuckDNS
   one, or just leave both resolving to the same box.

## 11. Link it from GitHub

Once `https://azubiweg.duckdns.org` is actually reachable, add a live-demo
line near the top of `README.md`, e.g.:

```markdown
🔗 **Live**: [azubiweg.duckdns.org](https://azubiweg.duckdns.org)
```

Optionally also set it as the repo's website field:
`gh repo edit --homepage https://azubiweg.duckdns.org`.
Swap both to `azubiweg.eu.org` later if/when that's approved (step 10b).

## 12. Verify end to end

- `curl https://azubiweg.duckdns.org/api/health` → `{"ok":true}` over a valid
  TLS cert.
- Log in from two different devices/browsers at once.
- `journalctl -u azubiweg -u rclone-bisync.timer` — clean, no "vault path
  missing" warning (that means `resumeAll()` found the bisync'd directory).
- Edit a vocab word in the app; within a few minutes it should show up in
  Obsidian (OneDrive → Remotely Save pulls the rclone-bisync'd change), and
  editing a card in Obsidian should show up in the app the same way — this
  is the whole point, confirm it actually round-trips.
- Open a word's detail view and confirm the grammar table/declension/
  bilingual example actually render (not "No grammar table available" on
  every word) — that's step 8's enrichment data, easy to forget on a fresh
  deploy since the app runs fine without it, just with degraded content.
- `cd server && npm test` still green.

## 13. Ongoing deploys

After pushing to `main`, SSH in as your own sudo-capable admin user (not
`azubiweg`) and run:

```bash
ssh -i /path/to/your-instance-key.key ubuntu@<VPS_IP> 'sudo /opt/azubiweg/repo/deploy/deploy.sh'
```

See [`deploy/deploy.sh`](../deploy/deploy.sh) — pulls, rebuilds both
workspaces, runs pending Prisma migrations, redeploys the client build, and
restarts the service. If a `git pull` inside it ever fails with "divergent
branches" (e.g. after a force-pushed history rewrite upstream), that's not
something `deploy.sh` handles — stash any local working-tree changes
(step 4's password patch), `git fetch && git reset --hard origin/main`,
restore the stash, then re-run `deploy.sh`.

## 14. Temporary public demo mode (PageSpeed Insights / GTmetrix)

The site is already fully public at the network level (Caddy has no basic
auth/IP allowlist, `robots.txt` allows all crawlers) — the only gate is the
client's own login screen, which an external crawler with no stored token
always hits. Demo mode lets such a crawler transparently get a real session
for one fixed, seeded demo account instead, so it renders the actual
populated app.

**Turn on**, from an SSH session as the sudo-capable admin user:

```bash
ssh -i /path/to/your-instance-key.key ubuntu@<VPS_IP>
sudo -u azubiweg sed -i '/^DEMO_MODE_ENABLED=/d' /opt/azubiweg/.env
echo 'DEMO_MODE_ENABLED=true' | sudo -u azubiweg tee -a /opt/azubiweg/.env
sudo -u azubiweg bash -c 'cd /opt/azubiweg/repo/server && set -a && source /opt/azubiweg/.env && set +a && npm run seed:demo'
sudo systemctl restart azubiweg
```

`seed:demo` is idempotent — safe to run every time, even if the demo account
already exists. Now run PageSpeed Insights / GTmetrix against
`https://azubiweg.duckdns.org/`.

**Turn back off**:

```bash
ssh -i /path/to/your-instance-key.key ubuntu@<VPS_IP>
sudo -u azubiweg sed -i 's/^DEMO_MODE_ENABLED=.*/DEMO_MODE_ENABLED=false/' /opt/azubiweg/.env
sudo systemctl restart azubiweg
```

No rebuild or `deploy.sh` run needed either way — `EnvironmentFile=` is read
fresh on every service start, so this is env-only. Note that any demo token
already handed out before turning it off stays valid for its own lifetime
(`DEMO_TOKEN_EXPIRES_IN`, default 24h) — disabling the flag only stops *new*
tokens being issued, since JWTs here aren't revocable. That's a low-risk
window: the demo account only ever holds synthetic seed data, and the app is
unauthenticated-network-reachable regardless.
