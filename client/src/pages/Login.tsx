import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LockSimple } from "@phosphor-icons/react";
import { api, ApiError, setSession } from "../api/client";

const FIELD_LABEL_STYLE = { color: "rgba(233,233,237,.5)" } as const;

/**
 * Reskin of the handoff's sAuth (German Companion App.dc.html) — the
 * visual style ports directly (centered column, pulsing app-mark circle,
 * rounded dark inputs, disabled-until-filled primary button), but the
 * fields and copy don't: the handoff's passphrase is a fake numeric-PIN
 * keypad with a "Use Face ID instead" fallback and an "everything stays on
 * this device, nothing is uploaded" disclaimer — none of that is true of
 * this app (real bcrypt-hashed passwords over a real server, no local-only
 * vault, no biometric auth), so this keeps the real email/password(/name)
 * form and rewrites the disclaimer, per CLAUDE.md's one deliberate
 * fidelity exception for this screen.
 */
export default function Login({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = email.trim() && password.length >= 8 && (mode === "login" || name.trim());

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "login" ? await api.login({ email, password }) : await api.register({ email, password, name });
      setSession(res.token, res.user);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-[radial-gradient(120%_46%_at_50%_14%,#272a45_0%,#161826_68%)] px-[26px] pt-[calc(env(safe-area-inset-top)+58px)] lg:items-center lg:justify-center lg:bg-[radial-gradient(120%_70%_at_50%_30%,#23263d,#161826_65%)] lg:pt-0"
      style={{ color: "#e9e9ed" }}
    >
      <form onSubmit={submit} className="flex flex-1 flex-col justify-center gap-[26px] lg:max-w-[380px] lg:flex-none">
        <div className="relative grid place-items-center">
          <div
            className="absolute size-[132px] rounded-full animate-pulse-glow lg:hidden"
            style={{ background: "radial-gradient(closest-side, rgba(145,132,217,.26), transparent)" }}
          />
          <div
            className="grid size-[76px] place-items-center rounded-[24px] lg:size-[52px] lg:rounded-[16px]"
            style={{ background: "rgba(145,132,217,.14)", boxShadow: "0 0 0 1px rgba(181,171,252,.45)" }}
          >
            <span className="text-[31px] font-medium lg:text-[22px]" style={{ letterSpacing: "-.03em", color: "#d2cefd" }}>
              A
            </span>
          </div>
        </div>

        <div className="text-center">
          <div className="text-[27px] font-medium" style={{ letterSpacing: "-.025em" }}>
            AzubiWeg
          </div>
          <p className="mt-[5px] text-[13px] leading-[1.5]" style={{ color: "rgba(233,233,237,.5)" }}>
            {mode === "login" ? (
              <>
                Welcome back.
                <br />
                Weiter geht&rsquo;s.
              </>
            ) : (
              <>
                Your companion for the journey
                <br />
                to Germany.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-[11px]">
          {mode === "register" && (
            <div>
              <div className="mb-1.5 text-[11px]" style={FIELD_LABEL_STYLE}>
                Name
              </div>
              <input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="box-border w-full rounded-[11px] px-[13px] text-[15px] outline-none"
                style={{ minHeight: 46, background: "#20222f", color: "#e9e9ed", border: "1px solid rgba(233,233,237,.14)" }}
              />
            </div>
          )}
          <div>
            <div className="mb-1.5 text-[11px]" style={FIELD_LABEL_STYLE}>
              Email
            </div>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "auth-error" : undefined}
              required
              className="box-border w-full rounded-[11px] px-[13px] text-[15px] outline-none"
              style={{ minHeight: 46, background: "#20222f", color: "#e9e9ed", border: "1px solid rgba(233,233,237,.14)" }}
            />
          </div>
          <div>
            <div className="mb-1.5 text-[11px]" style={FIELD_LABEL_STYLE}>
              Password
            </div>
            <input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "auth-error" : undefined}
              minLength={8}
              required
              className="box-border w-full rounded-[11px] px-[13px] text-[15px] outline-none"
              style={{ minHeight: 46, background: "#20222f", color: "#e9e9ed", border: "1px solid rgba(233,233,237,.14)" }}
            />
          </div>
        </div>

        {error && (
          <p id="auth-error" role="alert" aria-live="assertive" className="text-[12.5px]" style={{ color: "#e4c4b6" }}>
            {error}
          </p>
        )}

        <div className="flex flex-col gap-[10px]">
          <button
            type="submit"
            disabled={!canSubmit || busy}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] text-[15px] font-medium text-white transition-opacity disabled:opacity-45"
            style={{ background: "linear-gradient(160deg,#9184d9,#5d5294)" }}
          >
            {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
            <ArrowRight size={16} weight="regular" aria-hidden="true" />
          </button>
          <p className="text-center text-[13px]" style={{ color: "rgba(233,233,237,.55)" }}>
            {mode === "login" ? (
              <>
                New here?{" "}
                <Link className="font-medium" style={{ color: "#b5abfc" }} to="/register">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already registered?{" "}
                <Link className="font-medium" style={{ color: "#b5abfc" }} to="/login">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </form>

      <div className="flex items-start gap-2 pb-[30px] text-[11px] leading-[1.5]" style={{ color: "rgba(233,233,237,.32)" }}>
        <LockSimple size={13} weight="regular" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
        Synced to your account — reachable from any device you sign into.
      </div>
    </div>
  );
}
