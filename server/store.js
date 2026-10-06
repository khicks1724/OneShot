import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export function openStore(
  path = process.env.DATABASE_PATH || "data/oneshot.sqlite",
) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, name TEXT NOT NULL, host TEXT DEFAULT 'professor', region TEXT DEFAULT 'Global', created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS tokens(hash TEXT PRIMARY KEY, player TEXT REFERENCES players(id), expires INTEGER NOT NULL, kind TEXT NOT NULL, client TEXT, scope TEXT);
    CREATE TABLE IF NOT EXISTS clients(id TEXT PRIMARY KEY, redirects TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS codes(hash TEXT PRIMARY KEY, player TEXT REFERENCES players(id), client TEXT, redirect TEXT, challenge TEXT, resource TEXT, expires INTEGER);
    CREATE TABLE IF NOT EXISTS shows(id TEXT PRIMARY KEY, starts INTEGER NOT NULL, questions TEXT NOT NULL, digest TEXT NOT NULL, reviewed INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS games(id TEXT PRIMARY KEY, player TEXT REFERENCES players(id), show TEXT REFERENCES shows(id), mode TEXT NOT NULL, started INTEGER NOT NULL, cursor INTEGER DEFAULT 0, question_started INTEGER NOT NULL, score INTEGER DEFAULT 0, streak INTEGER DEFAULT 0, lifeline INTEGER DEFAULT 0, finished INTEGER DEFAULT 0, finalist INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS answers(game TEXT REFERENCES games(id), question INTEGER, answer TEXT, correct INTEGER, points INTEGER, elapsed INTEGER, confidence INTEGER, created INTEGER, score_before INTEGER DEFAULT 0, PRIMARY KEY(game,question));
    CREATE TABLE IF NOT EXISTS clubs(id TEXT PRIMARY KEY, name TEXT NOT NULL, invite TEXT UNIQUE NOT NULL, owner TEXT REFERENCES players(id));
    CREATE TABLE IF NOT EXISTS members(club TEXT REFERENCES clubs(id), player TEXT REFERENCES players(id), PRIMARY KEY(club,player));
    CREATE TABLE IF NOT EXISTS friends(player TEXT REFERENCES players(id), friend TEXT REFERENCES players(id), PRIMARY KEY(player,friend));
    CREATE TABLE IF NOT EXISTS invites(code TEXT PRIMARY KEY, player TEXT REFERENCES players(id));
    CREATE TABLE IF NOT EXISTS drafts(id TEXT PRIMARY KEY, questions TEXT NOT NULL, created INTEGER NOT NULL, published INTEGER DEFAULT 0);
    CREATE INDEX IF NOT EXISTS games_show ON games(show,mode,finished);
    CREATE INDEX IF NOT EXISTS games_player ON games(player,mode);
    CREATE UNIQUE INDEX IF NOT EXISTS ranked_once ON games(player,show) WHERE mode='ranked';
    CREATE INDEX IF NOT EXISTS tokens_player ON tokens(player);`);
  if (
    !db
      .prepare("PRAGMA table_info(answers)")
      .all()
      .some((c) => c.name === "score_before")
  )
    db.exec("ALTER TABLE answers ADD COLUMN score_before INTEGER DEFAULT 0");
  if (
    !db
      .prepare("PRAGMA table_info(shows)")
      .all()
      .some((c) => c.name === "reviewed")
  )
    db.exec("ALTER TABLE shows ADD COLUMN reviewed INTEGER DEFAULT 0");
  return db;
}
export const one = (db, sql, ...args) => db.prepare(sql).get(...args);
export const many = (db, sql, ...args) => db.prepare(sql).all(...args);
export const run = (db, sql, ...args) => db.prepare(sql).run(...args);
export function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
