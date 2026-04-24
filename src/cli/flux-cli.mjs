import { spawn } from "node:child_process";
import { access, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";

const DATABASE_FILE_NAME = "fluxnote.sqlite3";

function parseArgs(argv) {
  const args = [...argv];
  let shouldOpen = true;
  const contentParts = [];

  for (const arg of args) {
    if (arg === "--") {
      continue;
    }

    if (arg === "--no-open") {
      shouldOpen = false;
      continue;
    }

    contentParts.push(arg);
  }

  return {
    content: contentParts.join(" ").trim(),
    shouldOpen,
  };
}

function usage() {
  console.error("Usage: vp run flux -- [--no-open] <content|file-path>");
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readInputContent(input) {
  const resolved = path.resolve(process.cwd(), input);
  if (await fileExists(resolved)) {
    return await readFile(resolved, "utf8");
  }

  return input;
}

function getDefaultUserDataDir() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "fluxnote");
  }

  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (!appData) {
      throw new Error("APPDATA is not set");
    }
    return path.join(appData, "fluxnote");
  }

  return path.join(os.homedir(), ".config", "fluxnote");
}

function getDatabasePath() {
  const fromEnv = process.env.FLUXNOTE_DB_PATH;
  if (fromEnv && fromEnv.trim().length > 0) {
    return path.resolve(fromEnv);
  }

  return path.join(getDefaultUserDataDir(), DATABASE_FILE_NAME);
}

function applyMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      id INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare("SELECT id FROM app_migrations").all();
  const appliedIds = new Set(appliedRows.map((row) => row.id));

  if (!appliedIds.has(1)) {
    try {
      db.exec("BEGIN IMMEDIATE");
      db.exec(`
        CREATE TABLE IF NOT EXISTS blocks (
          id TEXT PRIMARY KEY,
          position INTEGER NOT NULL,
          content TEXT NOT NULL DEFAULT '',
          archived_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE COLLATE NOCASE,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS block_tags (
          block_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          PRIMARY KEY (block_id, tag_id),
          FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_blocks_archived_at ON blocks(archived_at);
        CREATE INDEX IF NOT EXISTS idx_blocks_position ON blocks(position DESC);
        CREATE INDEX IF NOT EXISTS idx_block_tags_tag_id ON block_tags(tag_id);
        CREATE INDEX IF NOT EXISTS idx_block_tags_block_id ON block_tags(block_id);
      `);

      db.prepare("INSERT INTO app_migrations (id, applied_at) VALUES (?, ?)").run(
        1,
        new Date().toISOString(),
      );
      db.exec("COMMIT");
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // Ignore rollback errors for failed/closed transactions.
      }

      throw error;
    }
  }
}

function createBlock(db, content) {
  const now = new Date().toISOString();
  const blockId = crypto.randomUUID();
  const maxPositionRow = db
    .prepare("SELECT COALESCE(MAX(position), 0) AS max_position FROM blocks")
    .get();
  const nextPosition = (maxPositionRow?.max_position ?? 0) + 1;

  try {
    db.exec("BEGIN IMMEDIATE");
    db.prepare(`
      INSERT INTO blocks (id, position, content, archived_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(blockId, nextPosition, "", null, now, now);

    db.prepare("UPDATE blocks SET content = ?, updated_at = ? WHERE id = ?").run(
      content,
      now,
      blockId,
    );
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Ignore rollback errors for failed/closed transactions.
    }

    throw error;
  }

  return blockId;
}

function openDeepLink(url) {
  if (process.platform === "darwin") {
    const child = spawn("open", [url], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return;
  }

  if (process.platform === "win32") {
    const child = spawn("cmd", ["/c", "start", "", url], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return;
  }

  const child = spawn("xdg-open", [url], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

async function main() {
  const { content, shouldOpen } = parseArgs(process.argv.slice(2));
  if (!content) {
    usage();
    process.exitCode = 1;
    return;
  }

  const parsedContent = await readInputContent(content);
  const databasePath = getDatabasePath();
  await mkdir(path.dirname(databasePath), { recursive: true });

  const db = new DatabaseSync(databasePath);
  try {
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA busy_timeout = 5000");
    applyMigrations(db);

    const blockId = createBlock(db, parsedContent);
    const deepLinkUrl = `fluxnote://block/${blockId}`;

    console.log(`✓ Block created: ${blockId}`);
    console.log(`→ Deep link: ${deepLinkUrl}`);

    const skipOpen = process.env.FLUXNOTE_NO_OPEN === "1" || !shouldOpen;
    if (!skipOpen) {
      openDeepLink(deepLinkUrl);
      console.log("→ Opening FluxNote...");
    }
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
