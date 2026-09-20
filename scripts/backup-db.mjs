import { DatabaseSync, backup } from "node:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:"))
  throw new Error("DATABASE_URL must be a SQLite file URL");
const path = resolve("prisma", url.slice(5));
if (existsSync(path)) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const target = `${path}.backup-${new Date().toISOString().replaceAll(":", "-")}`;
    await backup(db, target);
    console.log(`SQLite backup: ${target}`);
  } finally {
    db.close();
  }
} else console.log("New database; no backup needed.");
