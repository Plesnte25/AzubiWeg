import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LockSimple } from "@phosphor-icons/react";
import { api, ApiError, setSession } from "../api/client";
import { eyebrow, fieldInput } from "../components/ui/fields";
import { PillButton } from "../components/ui/PillButton";
import { Tile } from "../components/ui/Tile";
import { ThemeToggle } from "../components/chrome/ThemeToggle";

/**
 * Sign in / register — undesigned in the Bento handoff, so it's built from the Sticker primitives: the "Az" logo
 * tile, one plain tilted card with tape, 44px outlined fields and the primary pill. Real email/password auth over a
 * server-backed JWT session, so the copy says the data syncs to the account (never "stays on this device").
 */
export default function Login({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = !!(email.trim() && password.length >= 8 && (mode === "login" || name.trim()));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = mode === "login" ? await api.login({ email, password }) : await api.register({ email, password, name });
      setSession(res.token, res.user);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
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
          {error && (
            <p
              id="auth-error"
              role="alert"
              aria-live="assertive"
              style={{ margin: 0, padding: "8px 12px", border: "2px solid var(--line)", borderRadius: 12, background: "var(--tomato)", color: "var(--onTile)", fontSize: 13, fontWeight: 700 }}
            >
              {error}
            </p>
          )}
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

        <div className="flex items-start justify-center" style={{ gap: 8, fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
          <LockSimple size={14} weight="fill" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          Synced to your account, reachable from any device you sign into.
        </div>
      </div>
    </div>
  );
}
