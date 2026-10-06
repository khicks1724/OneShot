import express from "express";
import helmet from "helmet";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { openStore, one, run } from "./store.js";
import { Engine, GameError } from "./engine.js";
import { AI } from "./ai.js";
import {
  identity,
  issue,
  sessionCookie,
  passwordHash,
  verifyPassword,
  installOAuth,
  hash,
} from "./auth.js";
import { action } from "./actions.js";
import { installMcp } from "./mcp.js";
import { z } from "zod";
import { validatePack, digest } from "./questions.js";
export function createApp({
  db = openStore(),
  engine = new Engine(db),
  ai = new AI(),
  base = process.env.PUBLIC_URL ||
    `http://localhost:${process.env.PORT || 8787}`,
} = {}) {
  base = base.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production" && !base.startsWith("https://"))
    throw new Error("Production requires an HTTPS PUBLIC_URL.");
  const app = express(),
    ctx = { db, engine, ai, base },
    secure = base.startsWith("https:");
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'", "data:"],
          frameAncestors: ["'self'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: false, limit: "16kb" }));
  app.use("/oauth", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  const limits = new Map();
  app.use((req, res, next) => {
    const key = `${req.socket.remoteAddress}:${req.path.startsWith("/oauth") ? "oauth" : req.path.startsWith("/api/auth") ? "auth" : "general"}`,
      now = Date.now(),
      bucket = limits.get(key) || { n: 0, until: now + 60000 };
    if (now > bucket.until) {
      bucket.n = 0;
      bucket.until = now + 60000;
    }
    bucket.n++;
    limits.set(key, bucket);
    if (limits.size > 10000)
      for (const [k, v] of limits) if (v.until < now) limits.delete(k);
    const max = key.endsWith(":auth") ? 20 : key.endsWith(":oauth") ? 60 : 600;
    if (bucket.n > max) {
      res.set("Retry-After", "60");
      return res
        .status(429)
        .json({ error: "Slow down and try again in a minute." });
    }
    next();
  });
  app.use((req, res, next) => {
    if (
      req.headers.host &&
      ![new URL(base).host, "localhost:8787", "127.0.0.1:8787"].includes(
        req.headers.host,
      ) &&
      process.env.NODE_ENV === "production"
    )
      return res.status(403).json({ error: "Invalid host." });
    if (req.headers.origin && req.headers.origin !== base)
      return res.status(403).json({ error: "Origin not allowed." });
    if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
    next();
  });
  const authSchema = z.object({
    email: z
      .string()
      .email()
      .max(254)
      .transform((v) => v.trim().toLowerCase()),
    password: z.string().min(10).max(128),
    name: z.string().trim().min(2).max(24).optional(),
    mode: z.enum(["register", "login"]),
  });
  app.post("/api/auth", async (req, res) => {
    const args = authSchema.parse(req.body);
    let p = one(db, "SELECT * FROM players WHERE email=?", args.email);
    if (args.mode === "register") {
      if (p)
        throw new GameError(
          "An account already uses that email. Sign in instead.",
        );
      if (!args.name) throw new GameError("Choose a display name.");
      const current = identity(db, req);
      if (current && !current.email) {
        await passwordHash(args.password).then((pass) =>
          run(
            db,
            "UPDATE players SET email=?,password=?,name=? WHERE id=?",
            args.email,
            pass,
            args.name,
            current.player,
          ),
        );
        p = { id: current.player };
      } else {
        p = { id: randomUUID() };
        run(
          db,
          "INSERT INTO players(id,email,password,name,created) VALUES(?,?,?,?,?)",
          p.id,
          args.email,
          await passwordHash(args.password),
          args.name,
          Date.now(),
        );
      }
    } else if (!p || !(await verifyPassword(args.password, p.password)))
      throw new GameError("Email or password incorrect.", 401);
    sessionCookie(res, issue(db, p.id), secure);
    res.json({ ok: true });
  });
  app.post("/api/guest", (req, res) => {
    let auth = identity(db, req);
    if (!auth) {
      const id = randomUUID();
      run(
        db,
        "INSERT INTO players(id,name,created) VALUES(?,?,?)",
        id,
        "New Challenger",
        Date.now(),
      );
      sessionCookie(res, issue(db, id), secure);
      auth = { player: id, email: null };
    }
    res.json({ ok: true });
  });
  app.post("/api/logout", (req, res) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("oneshot="))
      ?.slice(8);
    if (token) run(db, "DELETE FROM tokens WHERE hash=?", hash(token));
    res.clearCookie("oneshot", { path: "/" });
    res.json({ ok: true });
  });
  app.post("/api/action/:name", async (req, res) =>
    res.json(await action(ctx, identity(db, req), req.params.name, req.body)),
  );
  function admin(req, res, next) {
    const given = Buffer.from(
        req.headers.authorization?.replace(/^Bearer /, "") || "",
      ),
      expected = Buffer.from(process.env.ADMIN_TOKEN || "");
    if (
      !expected.length ||
      given.length !== expected.length ||
      !timingSafeEqual(given, expected)
    )
      return res.status(403).json({ error: "Admin authentication required." });
    next();
  }
  app.post("/api/admin/draft", admin, async (req, res) => {
    const { theme } = z
        .object({ theme: z.string().min(3).max(200) })
        .parse(req.body),
      questions = await ai.draft(theme),
      id = randomUUID();
    run(
      db,
      "INSERT INTO drafts(id,questions,created) VALUES(?,?,?)",
      id,
      JSON.stringify(questions),
      Date.now(),
    );
    res.json({
      id,
      questions,
      status: "Human source and ambiguity review required.",
    });
  });
  app.post("/api/admin/import", admin, (req, res) => {
    const questions = validatePack(req.body.questions),
      id = randomUUID();
    run(
      db,
      "INSERT INTO drafts(id,questions,created) VALUES(?,?,?)",
      id,
      JSON.stringify(questions),
      Date.now(),
    );
    res.json({ id, questions });
  });
  app.get("/api/admin/drafts/:id", admin, (req, res) => {
    const draft = one(db, "SELECT * FROM drafts WHERE id=?", req.params.id);
    if (!draft) throw new GameError("Draft not found.", 404);
    res.json({ ...draft, questions: JSON.parse(draft.questions) });
  });
  app.put("/api/admin/drafts/:id", admin, (req, res) => {
    const draft = one(db, "SELECT * FROM drafts WHERE id=?", req.params.id);
    if (!draft || draft.published) throw new GameError("Draft unavailable.");
    const questions = validatePack(req.body.questions);
    run(
      db,
      "UPDATE drafts SET questions=? WHERE id=?",
      JSON.stringify(questions),
      req.params.id,
    );
    res.json({ id: req.params.id, questions });
  });
  app.post("/api/admin/publish", admin, (req, res) => {
    const { draftId, start } = z
      .object({
        draftId: z.string(),
        start: z.number().int(),
        reviewed: z.literal(true),
      })
      .parse(req.body);
    if (start < Date.now() + 3600000)
      throw new GameError("Publish at least one hour before the show.");
    const draft = one(db, "SELECT * FROM drafts WHERE id=?", draftId);
    if (!draft || draft.published) throw new GameError("Draft unavailable.");
    const questions = validatePack(JSON.parse(draft.questions)),
      date = new Date(start),
      scheduleHour = Number(process.env.SHOW_HOUR_UTC ?? 2),
      scheduleMinute = Number(process.env.SHOW_MINUTE_UTC ?? 0);
    if (
      date.getUTCHours() !== scheduleHour ||
      date.getUTCMinutes() !== scheduleMinute ||
      date.getUTCSeconds() !== 0 ||
      date.getUTCMilliseconds() !== 0
    )
      throw new GameError("Start must match the configured daily schedule.");
    const id = date.toISOString().slice(0, 10),
      existing = one(db, "SELECT reviewed FROM shows WHERE id=?", id);
    if (
      existing?.reviewed ||
      one(db, "SELECT id FROM games WHERE show=? AND mode='ranked'", id)
    )
      throw new GameError("A canonical pack is already frozen for that date.");
    db.exec("BEGIN IMMEDIATE");
    try {
      run(
        db,
        "INSERT INTO shows(id,starts,questions,digest,reviewed) VALUES(?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET starts=excluded.starts,questions=excluded.questions,digest=excluded.digest,reviewed=1",
        id,
        start,
        JSON.stringify(questions),
        digest(questions),
      );
      run(db, "UPDATE drafts SET published=1 WHERE id=?", draftId);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    res.json({ id, digest: digest(questions) });
  });
  installOAuth(app, db, base);
  installMcp(app, ctx);
  app.get("/health", (_req, res) =>
    res.json({ status: "ok", version: "1.0.0", aiConfigured: !!ai.client }),
  );
  app.get("/privacy", (_req, res) =>
    res
      .type("text/plain")
      .send(
        "One Shot stores your account email, salted password hash, public display name and region, answers, response timings, scores, club memberships and friend relationships. Email and tokens are never included in public leaderboards. AI coaching sends display name and game statistics to OpenAI; credentials are never sent. Ranked answers use canonical accepted variants, not nondeterministic AI judging. Guest practice is unranked. Contact the deployment operator for account export or deletion.",
      ),
  );
  app.delete("/api/account", (req, res) => {
    const auth = identity(db, req);
    if (!auth) throw new GameError("Sign in.", 401);
    db.exec("BEGIN IMMEDIATE");
    try {
      const id = auth.player;
      for (const table of ["answers"])
        run(
          db,
          `DELETE FROM ${table} WHERE game IN (SELECT id FROM games WHERE player=?)`,
          id,
        );
      run(db, "DELETE FROM games WHERE player=?", id);
      run(db, "DELETE FROM friends WHERE player=? OR friend=?", id, id);
      run(
        db,
        "DELETE FROM members WHERE player=? OR club IN (SELECT id FROM clubs WHERE owner=?)",
        id,
        id,
      );
      run(db, "DELETE FROM clubs WHERE owner=?", id);
      for (const table of ["tokens", "codes", "invites"])
        run(db, `DELETE FROM ${table} WHERE player=?`, id);
      run(db, "DELETE FROM players WHERE id=?", id);
      db.exec("COMMIT");
      res.clearCookie("oneshot", { path: "/" });
      res.json({ ok: true });
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  });
  app.use(express.static("dist"));
  app.get("/", (_req, res) =>
    res.sendFile("dist/index.html", { root: process.cwd() }),
  );
  app.use((err, _req, res, _next) => {
    const status = err.status || (err instanceof z.ZodError ? 400 : 500);
    res.status(status).json({
      error:
        status === 500
          ? "Something went wrong. Please try again."
          : err instanceof z.ZodError
            ? err.issues.map((i) => i.message).join(" ")
            : err.message,
    });
  });
  return { app, ctx };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { app, ctx } = createApp();
  const port = Number(process.env.PORT || 8787),
    server = app.listen(port, () =>
      console.log(`One Shot is running at http://localhost:${port}`),
    );
  const timer = setInterval(() => ctx.engine.settle(ctx.engine.show()), 1000);
  timer.unref();
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => {
      clearInterval(timer);
      server.close(() => {
        ctx.db.close();
        process.exit(0);
      });
    });
}
