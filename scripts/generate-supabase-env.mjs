import { createHmac } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

const envPath = resolve(process.cwd(), "apps/web/.env.local");
const supabaseUrl = "http://127.0.0.1:54321";
const jwtSecret =
  process.env.SUPABASE_JWT_SECRET ??
  "super-secret-jwt-token-with-at-least-32-characters-long";

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signJwt(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const unsignedToken = `${base64Url(header)}.${base64Url(payload)}`;
  const signature = createHmac("sha256", secret).update(unsignedToken).digest("base64url");
  return `${unsignedToken}.${signature}`;
}

const now = Math.floor(Date.now() / 1000);
const anonKey = signJwt(
  {
    iss: "supabase",
    ref: "roxbjj-manager",
    role: "anon",
    iat: now,
    exp: now + 60 * 60 * 24 * 365 * 10,
  },
  jwtSecret,
);

mkdirSync(dirname(envPath), { recursive: true });
writeFileSync(
  envPath,
  [
    "# Generated for local Supabase development.",
    `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
    "",
  ].join("\n"),
  "utf8",
);

console.log(`Wrote ${envPath}`);
