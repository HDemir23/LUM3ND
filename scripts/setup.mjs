import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env")) {
  console.log(".env zaten var; değiştirilmedi.");
} else {
  const env = readFileSync(".env.example", "utf8").replace(
    "replace-with-a-different-admin-password",
    randomBytes(24).toString("base64url"),
  );
  writeFileSync(".env", env, { mode: 0o600 });
  console.log(
    ".env oluşturuldu. Yönetici parolası bu dosyada. Testnet demosu için npm run test:testnet çalıştırın.",
  );
}
