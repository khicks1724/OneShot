import {
  randomBytes,
  createHash,
  timingSafeEqual,
  scrypt as scryptCb,
} from "node:crypto";
import { promisify } from "node:util";
import { one, run } from "./store.js";
import { GameError } from "./engine.js";
const scrypt = promisify(scryptCb);
export const randomToken = () => randomBytes(32).toString("base64url");
export const hash = (v) => createHash("sha256").update(v).digest("hex");
export async function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await scrypt(password, salt, 64)).toString("hex")}`;
}
export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hex] = stored.split(":");
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(hex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
export function issue(
  db,
  player,
  kind = "session",
  client = null,
  scope = "play",
  ttl = 7 * 86400000,
) {
  const token = randomToken();
  run(
    db,
    "INSERT INTO tokens VALUES(?,?,?,?,?,?)",
    hash(token),
    player,
    Date.now() + ttl,
    kind,
    client,
    scope,
  );
  return token;
}
export function identity(db, req) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const cookie = req.headers.cookie
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("oneshot="))
    ?.slice(8);
  const value = bearer || cookie;
  if (!value) return null;
  return (
    one(
      db,
      "SELECT t.player,p.email,t.scope,t.kind FROM tokens t JOIN players p ON p.id=t.player WHERE t.hash=? AND t.expires>? AND t.kind=?",
      hash(value),
      Date.now(),
      bearer ? "access" : "session",
    ) ?? null
  );
}
export function sessionCookie(res, token, secure) {
  res.cookie("oneshot", token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 7 * 86400000,
    path: "/",
  });
}
export const escapeHtml = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function installOAuth(app, db, base) {
  const secure = base.startsWith("https:"),
    resource = `${base}/mcp`;
  app.get("/.well-known/oauth-protected-resource", (_req, res) =>
    res.json({
      resource,
      authorization_servers: [base],
      scopes_supported: ["play"],
      bearer_methods_supported: ["header"],
    }),
  );
  app.get("/.well-known/oauth-protected-resource/mcp", (_req, res) =>
    res.json({
      resource,
      authorization_servers: [base],
      scopes_supported: ["play"],
      bearer_methods_supported: ["header"],
    }),
  );
  app.get("/.well-known/oauth-authorization-server", (_req, res) =>
    res.json({
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      registration_endpoint: `${base}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["play"],
    }),
  );
  app.post("/oauth/register", (req, res) => {
    const redirects = req.body.redirect_uris;
    if (
      !Array.isArray(redirects) ||
      !redirects.length ||
      redirects.length > 10 ||
      redirects.some((u) => {
        try {
          const url = new URL(u);
          return (
            !!url.hash ||
            !!url.username ||
            !(
              url.protocol === "https:" ||
              (!secure &&
                url.hostname === "localhost" &&
                url.protocol === "http:")
            )
          );
        } catch {
          return true;
        }
      })
    )
      throw new GameError("Invalid redirect URIs.");
    const id = randomToken();
    run(db, "INSERT INTO clients VALUES(?,?)", id, JSON.stringify(redirects));
    res.status(201).json({
      client_id: id,
      redirect_uris: redirects,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    });
  });
  function validate(args) {
    const c = one(
      db,
      "SELECT redirects FROM clients WHERE id=?",
      args.client_id ?? "",
    );
    if (!c || !JSON.parse(c.redirects).includes(args.redirect_uri))
      throw new GameError("Unregistered redirect URI.");
    if (
      args.response_type !== "code" ||
      args.code_challenge_method !== "S256" ||
      !/^[A-Za-z0-9_-]{43}$/.test(args.code_challenge ?? "") ||
      args.resource !== resource ||
      (args.scope && args.scope !== "play")
    )
      throw new GameError(
        "Expected code, S256 PKCE, the MCP resource, and play scope.",
      );
    return args;
  }
  app.get("/oauth/authorize", (req, res) => {
    const args = validate(req.query),
      nonce = randomToken();
    res.cookie("oauth_nonce", nonce, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 600000,
      path: "/oauth/authorize",
    });
    const fields = Object.entries(args)
      .map(
        ([k, v]) =>
          `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`,
      )
      .join("");
    res
      .type("html")
      .send(
        `<!doctype html><html><head><title>Link One Shot</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font:16px system-ui;background:#14151a;color:#f4f4f6;max-width:420px;margin:8vh auto;padding:24px}input,button{box-sizing:border-box;width:100%;padding:15px;margin:8px 0;border-radius:12px;border:1px solid #45464e;background:#24252c;color:white}button{background:#c6f36b;color:#14151a;font-weight:700}p{color:#b8b8c4;line-height:1.6}a{color:#c6f36b}</style></head><body><h1>ONE SHOT<span style="color:#c6f36b">.</span></h1><h2>Link your player profile</h2><p>This grants access to your game, profile, clubs, and answer submissions. Only your display name and region appear publicly.</p><form method="post">${fields}<input type="hidden" name="nonce" value="${nonce}"><label>Email<input type="email" name="email" required autocomplete="username"></label><label>Password<input type="password" name="password" required autocomplete="current-password"></label><button>Sign in & authorize</button></form><p>New here? <a href="${base}" target="_blank" rel="noopener">Create your One Shot account</a>, then return to this page.</p></body></html>`,
      );
  });
  app.post("/oauth/authorize", async (req, res) => {
    const args = validate(req.body);
    const nonce = req.headers.cookie
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("oauth_nonce="))
      ?.slice(12);
    if (!nonce || nonce !== req.body.nonce)
      throw new GameError(
        "Authorization form expired. Reload and try again.",
        403,
      );
    const p = one(
      db,
      "SELECT * FROM players WHERE email=?",
      String(req.body.email ?? "")
        .trim()
        .toLowerCase(),
    );
    if (
      !p ||
      !(await verifyPassword(
        String(req.body.password ?? "").slice(0, 128),
        p.password,
      ))
    )
      throw new GameError("Email or password incorrect.", 401);
    const code = randomToken();
    run(
      db,
      "INSERT INTO codes VALUES(?,?,?,?,?,?,?)",
      hash(code),
      p.id,
      args.client_id,
      args.redirect_uri,
      args.code_challenge,
      resource,
      Date.now() + 120000,
    );
    res.clearCookie("oauth_nonce", { path: "/oauth/authorize" });
    const url = new URL(args.redirect_uri);
    url.searchParams.set("code", code);
    if (args.state) url.searchParams.set("state", args.state);
    res.redirect(url.toString());
  });
  app.post("/oauth/token", (req, res) => {
    const { grant_type, client_id, resource: requested } = req.body;
    if (requested !== resource)
      return res.status(400).json({ error: "invalid_target" });
    let player;
    if (grant_type === "authorization_code") {
      const row = one(
        db,
        "SELECT * FROM codes WHERE hash=?",
        hash(String(req.body.code ?? "")),
      );
      const challenge = createHash("sha256")
        .update(String(req.body.code_verifier ?? ""))
        .digest("base64url");
      if (
        !row ||
        row.expires < Date.now() ||
        row.client !== client_id ||
        row.redirect !== req.body.redirect_uri ||
        row.challenge !== challenge ||
        row.resource !== resource
      )
        return res.status(400).json({ error: "invalid_grant" });
      player = row.player;
      run(db, "DELETE FROM codes WHERE hash=?", hash(req.body.code));
    } else if (grant_type === "refresh_token") {
      const row = one(
        db,
        "SELECT * FROM tokens WHERE hash=? AND kind='refresh' AND expires>?",
        hash(String(req.body.refresh_token ?? "")),
        Date.now(),
      );
      if (!row || row.client !== client_id)
        return res.status(400).json({ error: "invalid_grant" });
      player = row.player;
      run(db, "DELETE FROM tokens WHERE hash=?", row.hash);
    } else return res.status(400).json({ error: "unsupported_grant_type" });
    res.setHeader("Cache-Control", "no-store");
    res.json({
      access_token: issue(db, player, "access", client_id, "play", 3600000),
      refresh_token: issue(
        db,
        player,
        "refresh",
        client_id,
        "play",
        30 * 86400000,
      ),
      token_type: "Bearer",
      expires_in: 3600,
      scope: "play",
    });
  });
}
