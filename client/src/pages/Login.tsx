import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, setSession } from "../api/client";

export default function Login({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "login"
          ? await api.login({ email, password })
          : await api.register({ email, password, name });
      setSession(res.token, res.user);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-md border border-hairline bg-card px-3 py-2 text-sm outline-none focus:border-brand-400";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-hairline bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">
          <span className="text-brand-500">●</span> Deutschland Companion
        </h1>
        <p className="mt-1 mb-5 text-sm text-ink-600">
          {mode === "login" ? "Welcome back. Weiter geht's!" : "Your companion for the journey to Germany."}
        </p>
        {mode === "register" && (
          <label className="mb-3 block text-sm">
            Name
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label className="mb-3 block text-sm">
          Email
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="mb-4 block text-sm">
          Password
          <input
            className={input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        {error && <p className="mb-3 text-sm text-red-700">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-md bg-ink-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <p className="mt-4 text-center text-sm text-ink-600">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link className="font-medium text-brand-600 hover:underline" to="/register">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already registered?{" "}
              <Link className="font-medium text-brand-600 hover:underline" to="/login">
                Sign in
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
