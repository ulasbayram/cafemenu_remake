import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";

const subject = process.argv[2];
if (!subject || !/^(https:\/\/[^\s]+|mailto:[^\s@]+@[^\s@]+)$/.test(subject))
  throw new Error(
    "Provide the app's production HTTPS address or contact mailto URI as the argument.",
  );
const path = resolve(".env");
const previous = existsSync(path) ? readFileSync(path, "utf8") : "";
if (/^VAPID_(PUBLIC_KEY|PRIVATE_KEY)\s*=/m.test(previous))
  throw new Error(
    "Push keys already exist in .env. Keep them to preserve existing subscriptions.",
  );
const pair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
const publicKey = Buffer.from(
  await crypto.subtle.exportKey("raw", pair.publicKey),
).toString("base64url");
const privateKey = (await crypto.subtle.exportKey("jwk", pair.privateKey)).d;
appendFileSync(
  path,
  `\n# Order Web Push (server-only)\nVAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}\nVAPID_SUBJECT=${subject}\n`,
);
console.log(
  "Push keys saved to .env. Restart the local server; add the same keys to production Worker secrets. Keys were not printed.",
);
