import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LockSimple, X } from "@phosphor-icons/react";
import { api, ApiError, setSession } from "../api/client";
import { initials } from "../components/chrome/useProfileSummary";
import { Checkbox } from "../components/ui/Checkbox";
import { eyebrow, fieldInput } from "../components/ui/fields";
import { PillButton } from "../components/ui/PillButton";
import { Tile } from "../components/ui/Tile";
import { ThemeToggle } from "../components/chrome/ThemeToggle";
import { maskEmail, type TrustedAccount, trustedAccounts } from "../lib/trustedAccounts";

/**
 * Sign in / register — undesigned in the Bento handoff, so it's built from the Sticker primitives: the "Az" logo
 * tile, one plain tilted card with tape, 44px outlined fields and the primary pill. Real email/password auth over a
 * server-backed JWT session, so the copy says the data syncs to the account (never "stays on this device").
 *
 * Trusted devices: an account signed in here with "Trust this device" ticked shows as an avatar in "Continue as";
 * one click signs in without the password (lib/trustedAccounts.ts, POST /api/auth/device-login). A device that isn't
 * trusted, or whose trust was revoked or lapsed, gets the password form.
 */
export default function Login({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<TrustedAccount[]>(() => (mode === "login" ? trustedAccounts.list() : []));
  const [showForm, setShowForm] = useState(mode === "register" || accounts.length === 0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [trust, setTrust] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [continuing, setContinuing] = useState<string | null>(null);

  const canSubmit = !!(email.trim() && password.length >= 8 && (mode === "login" || name.trim()));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "login"
          ? await api.login({ email, password, trustDevice: trust })
          : await api.register({ email, password, name, trustDevice: trust });
      setSession(res.token, res.user);
      if (res.deviceToken) trustedAccounts.save(res.user, res.deviceToken);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function continueAs(account: TrustedAccount) {
    setContinuing(account.userId);
    setError(null);
    try {
      const res = await api.deviceLogin(account.deviceToken);
      setSession(res.token, res.user);
      trustedAccounts.save(res.user, res.deviceToken);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // trust revoked or lapsed: fall back to the password, with the email filled in
        trustedAccounts.remove(account.userId);
        setAccounts(trustedAccounts.list());
        setEmail(account.email);
        setShowForm(true);
      }
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setContinuing(null);
    }
  }

  function forget(account: TrustedAccount) {
    // best effort on the server; locally it's gone either way
    api.forgetDevice(account.deviceToken).catch(() => {});
    trustedAccounts.remove(account.userId);
    const rest = trustedAccounts.list();
    setAccounts(rest);
    if (rest.length === 0) setShowForm(true);
  }

  const field = (id: string, label: string, input: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label htmlFor={id} className="flex flex-col" style={{ gap: 6 }}>
      <span style={eyebrow}>{label}</span>
      <input
        id={id}
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "auth-error" : undefined}
        style={{ ...fieldInput, width: "100%" }}
      />
    </label>
  );

  const errorBox = error && (
    <p
      id="auth-error"
      role="alert"
      aria-live="assertive"
      style={{ margin: 0, padding: "8px 12px", border: "2px solid var(--line)", borderRadius: 12, background: "var(--tomato)", color: "var(--onTile)", fontSize: 13, fontWeight: 700 }}
    >
      {error}
    </p>
  );

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-6" style={{ color: "var(--text)" }}>
      <div className="flex w-full max-w-[420px] justify-end">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-[420px] flex-1 flex-col justify-center" style={{ gap: 26 }}>
        <div className="flex items-center justify-center" style={{ gap: 14 }}>
          <span
            className="flex items-center justify-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--lemon)",
              color: "var(--onTile)",
              border: "2.5px solid var(--line)",
              boxShadow: "4px 4px 0 var(--shadow)",
              transform: "rotate(-8deg)",
              fontWeight: 700,
              fontSize: 23,
              boxSizing: "border-box",
            }}
          >
            Az
          </span>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.04em" }}>AzubiWeg</div>
            <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.75 }}>
              {mode === "login" ? "Welcome back. Weiter geht’s." : "Your companion for the road to an Ausbildung."}
            </div>
          </div>
        </div>

        {accounts.length > 0 && (
          <Tile tilt={0.6} tape={{ left: "38%", width: 80 }} className="flex flex-col" style={{ padding: 22, gap: 12 }}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.03em" }}>Continue as</span>
            <ul className="m-0 flex list-none flex-col p-0" style={{ gap: 10 }}>
              {accounts.map((a) => (
                <li key={a.userId} className="flex items-center" style={{ gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => continueAs(a)}
                    disabled={continuing !== null}
                    aria-label={`Continue as ${a.name}`}
                    className="press flex min-w-0 flex-1 cursor-pointer items-center text-left"
                    style={{ gap: 12, padding: "10px 14px 10px 10px", border: "2.5px solid var(--line)", borderRadius: 18, background: "var(--plain)", color: "var(--plainText)", boxShadow: "3px 3px 0 var(--shadow)", boxSizing: "border-box" }}
                  >
                    <span
                      aria-hidden="true"
                      className="flex shrink-0 items-center justify-center"
                      style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--pink)", color: "var(--onTile)", border: "2.5px solid var(--line)", fontWeight: 700, fontSize: 15, boxSizing: "border-box" }}
                    >
                      {initials(a.name)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col" style={{ lineHeight: 1.2 }}>
                      <span className="truncate" style={{ fontSize: 16, fontWeight: 700 }}>{a.name}</span>
                      <span className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "var(--plainMuted)" }}>{maskEmail(a.email)}</span>
                    </span>
                    {continuing === a.userId ? <span style={{ fontWeight: 700 }}>…</span> : <ArrowRight size={18} weight="bold" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => forget(a)}
                    aria-label={`Forget ${a.name} on this device`}
                    title="Forget on this device"
                    className="flex shrink-0 cursor-pointer items-center justify-center p-0"
                    style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid var(--line)", background: "transparent", color: "var(--plainText)" }}
                  >
                    <X size={14} weight="bold" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            {!showForm && errorBox}
            {!showForm && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="cursor-pointer self-center border-0 bg-transparent p-0"
                style={{ fontSize: 13, fontWeight: 700, color: "var(--plainText)", textDecoration: "underline", textDecorationThickness: 2 }}
              >
                Use another account
              </button>
            )}
          </Tile>
        )}

        {showForm && (
          <Tile as="form" tilt={-0.6} tape={{ left: "40%", width: 86 }} className="flex flex-col" style={{ padding: 22, gap: 14 }} onSubmit={submit}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.03em" }}>{mode === "login" ? "Sign in" : "Create an account"}</span>
            {mode === "register" && field("name", "Name", { autoComplete: "name", value: name, onChange: (e) => setName(e.target.value), required: true })}
            {field("email", "Email", { type: "email", autoComplete: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true })}
            {field("password", "Password", {
              type: "password",
              autoComplete: mode === "login" ? "current-password" : "new-password",
              value: password,
              onChange: (e) => setPassword(e.target.value),
              minLength: 8,
              required: true,
              placeholder: mode === "register" ? "At least 8 characters" : undefined,
            })}
            <div className="flex items-start" style={{ gap: 10 }}>
              <Checkbox checked={trust} onChange={setTrust} label="Trust this device" style={{ marginTop: 1 }} />
              <span className="flex cursor-pointer flex-col" onClick={() => setTrust(!trust)} style={{ gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Trust this device</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--plainMuted)" }}>
                  Skip the password here next time, for up to 90 days. Don’t tick this on a shared computer.
                </span>
              </span>
            </div>
            {errorBox}
            <PillButton type="submit" disabled={!canSubmit || busy} icon={busy ? undefined : <ArrowRight size={16} weight="bold" aria-hidden="true" />} style={{ flexDirection: "row-reverse" }}>
              {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
            </PillButton>
            <p className="text-center" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--plainMuted)" }}>
              {mode === "login" ? "New here? " : "Already registered? "}
              <Link to={mode === "login" ? "/register" : "/login"} style={{ fontWeight: 700, color: "var(--plainText)", textDecoration: "underline", textDecorationThickness: 2 }}>
                {mode === "login" ? "Create an account" : "Sign in"}
              </Link>
            </p>
          </Tile>
        )}

        <div className="flex items-start justify-center" style={{ gap: 8, fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
          <LockSimple size={14} weight="fill" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          Synced to your account, reachable from any device you sign into.
        </div>
      </div>
    </div>
  );
}
