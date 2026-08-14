import "dotenv/config";
import type { StringValue } from "ms";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export const config = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  port: Number(process.env.PORT ?? 3000),
  // strict equality — a stray "false" string (or any other value) must never enable this
  demoModeEnabled: process.env.DEMO_MODE_ENABLED === "true",
  demoUserEmail: process.env.DEMO_USER_EMAIL ?? "demo@azubiweg.internal",
  demoTokenExpiresIn: (process.env.DEMO_TOKEN_EXPIRES_IN ?? "24h") as StringValue,
};
