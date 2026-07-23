import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, setSession } from "../api/client";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

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
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card padding="lg" className="animate-fade-in w-full max-w-sm">
        <form onSubmit={submit}>
          <div className="mb-1 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
              AW
            </span>
            <h1 className="text-xl font-semibold tracking-tight">AzubiWeg</h1>
          </div>
          <p className="mb-5 text-sm text-ink-600">
            {mode === "login" ? "Welcome back. Weiter geht's!" : "Your companion for the journey to Germany."}
          </p>

          <div className="space-y-3">
            {mode === "register" && (
              <Input
                id="name"
                label="Name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-describedby={error ? "auth-error" : undefined}
                required
              />
            )}
            <Input
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "auth-error" : undefined}
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "auth-error" : undefined}
              minLength={8}
              required
            />
          </div>

          {error && (
            <p id="auth-error" role="alert" aria-live="assertive" className="mt-3 text-sm text-danger-600">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" loading={busy} className="mt-4 w-full">
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>

          <p className="mt-4 text-center text-sm text-ink-600">
            {mode === "login" ? (
              <>
                New here?{" "}
                <Link className="font-medium text-brand-700 hover:underline" to="/register">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already registered?{" "}
                <Link className="font-medium text-brand-700 hover:underline" to="/login">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </form>
      </Card>
    </div>
  );
}
