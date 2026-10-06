import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Target,
  Trophy,
  Users,
  User,
  Flame,
  Clock,
  Globe,
  ChevronRight,
  Check,
  X,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  GraduationCap,
  Zap,
  Eye,
  Crown,
  Copy,
  Plus,
  LogOut,
  Shield,
  Volume2,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  Loader2,
  Link,
  HelpCircle,
} from "lucide-react";
import { api, call, embedded, onContext } from "./transport";
import { Mascot, MascotStudio, mascots } from "./Mascot";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "./style.css";
import "./identity.css";
const hosts = [
  {
    id: "professor",
    name: "The Professor",
    role: "A little wisdom. A little wit.",
    icon: GraduationCap,
    color: "purple",
  },
  {
    id: "hype",
    name: "Hype Man",
    role: "Every answer is a highlight.",
    icon: Zap,
    color: "lime",
  },
  {
    id: "villain",
    name: "The Villain",
    role: "Your favorite worthy adversary.",
    icon: Crown,
    color: "orange",
  },
  {
    id: "oracle",
    name: "The Oracle",
    role: "Follow your intuition.",
    icon: Eye,
    color: "blue",
  },
];
const rounds = ["Warmup", "Culture", "Curveball", "The Wager", "Final Boss"];
const fmt = (n) => Number(n || 0).toLocaleString();
const countdown = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) =>
    String(n).padStart(2, "0"),
  );
};
function App() {
  const [mascotKind, setMascotKind] = useState(() => {
    const saved = localStorage.getItem("oneshot-mascot");
    return ["slug", "ticket"].includes(saved) ? saved : "slug";
  });
  const [themeReaction, setThemeReaction] = useState(false);
  const themeMounted = useRef(false);
  useEffect(() => {
    localStorage.setItem("oneshot-mascot", mascotKind);
  }, [mascotKind]);
  const [data, setData] = useState(null),
    [game, setGame] = useState(null),
    [screen, setScreen] = useState("play"),
    [theme, setTheme] = useState(
      localStorage.getItem("oneshot-theme") || "auto",
    ),
    [hostTheme, setHostTheme] = useState(null),
    [now, setNow] = useState(Date.now()),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [modal, setModal] = useState(null),
    [period, setPeriod] = useState("daily"),
    [board, setBoard] = useState([]),
    [clubFilter, setClubFilter] = useState(""),
    [coach, setCoach] = useState(null),
    [hostLine, setHostLine] = useState(""),
    [hint, setHint] = useState(null),
    [removed, setRemoved] = useState([]),
    [confidence, setConfidence] = useState(50),
    [selected, setSelected] = useState(""),
    [bootError, setBootError] = useState("");
  const delta = useRef(0),
    seen = useRef(new Set()),
    inflight = useRef(false),
    profile = data?.dashboard?.profile,
    schedule = data?.dashboard?.schedule;
  const [invite, setInvite] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("club")
      ? { type: "club", code: p.get("club") }
      : p.get("friend")
        ? { type: "friend", code: p.get("friend") }
        : null;
  });
  function consume(result) {
    if (!result) return;
    if (result.dashboard) {
      setData((old) => ({ ...old, ...result }));
      setBoard(result.dashboard.leaderboard);
      delta.current = result.dashboard.serverTime - Date.now();
    }
    if (result.game) {
      setGame(result.game);
      delta.current = result.game.serverTime - Date.now();
    }
    if (result.hint) setHint(result.hint);
    if (result.removed) setRemoved(result.removed);
    if (result.coaching) setCoach(result.coaching);
    if (result.commentary) setHostLine(result.commentary.text);
  }
  async function perform(name, args = {}) {
    if (inflight.current) return;
    inflight.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await call(name, args);
      consume(r);
      return r;
    } catch (e) {
      setError(e.message);
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }
  async function boot() {
    setBootError("");
    try {
      if (!embedded) await api("/api/guest", {});
      consume(await call("dashboard"));
    } catch (e) {
      setBootError(e.message);
    }
  }
  useEffect(() => {
    boot();
    const id = setInterval(() => setNow(Date.now() + delta.current), 250);
    const fn = (e) => consume(e.detail);
    window.addEventListener("oneshot:data", fn);
    onContext((c) => setHostTheme(c.theme));
    return () => {
      clearInterval(id);
      window.removeEventListener("oneshot:data", fn);
    };
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function update() {
      document.documentElement.dataset.theme =
        theme === "auto"
          ? hostTheme || (media.matches ? "dark" : "light")
          : theme;
    }
    update();
    media.addEventListener("change", update);
    localStorage.setItem("oneshot-theme", theme);
    return () => media.removeEventListener("change", update);
  }, [theme, hostTheme]);
  useEffect(() => {
    if (!game || game.finished) return;
    let stopped = false;
    const id = setInterval(async () => {
      if (inflight.current) return;
      try {
        const r = await call("game", { gameId: game.id });
        if (!stopped) consume(r);
      } catch {}
    }, 1500);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [game?.id, game?.finished]);
  useEffect(() => {
    setSelected("");
    setConfidence(50);
    setHint(null);
    setRemoved([]);
    setHostLine("");
  }, [game?.question?.index, game?.id]);
  useEffect(() => {
    if (
      !game?.question ||
      game.mode !== "practice" ||
      game.question.answered ||
      busy
    )
      return;
    if (now > game.question.deadline)
      perform("answer", {
        gameId: game.id,
        index: game.question.index,
        answer: "",
        confidence,
      });
  }, [now, game?.question?.answered]);
  useEffect(() => {
    const key = game?.question?.reveal
      ? `${game.id}:${game.question.index}`
      : null;
    if (key && game.lastResult && !seen.current.has(key)) {
      seen.current.add(key);
      call("commentary", { gameId: game.id })
        .then(consume)
        .catch(() => {});
    }
    if (game?.finished && !seen.current.has(`${game.id}:coach`)) {
      seen.current.add(`${game.id}:coach`);
      call("coach", { gameId: game.id })
        .then(consume)
        .catch(() => {});
      call("dashboard")
        .then(consume)
        .catch(() => {});
    }
  }, [game?.question?.reveal, game?.question?.index, game?.finished]);
  useEffect(() => {
    if (screen !== "leaderboard") return;
    let active = true;
    call("leaderboard", { period, ...(clubFilter ? { club: clubFilter } : {}) })
      .then((r) => active && setBoard(r.leaderboard))
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [screen, period, clubFilter]);
  const q = game?.question,
    canAnswer = q && !q.answered && !q.reveal && now < q.deadline && !busy;
  const mascotMood = game?.finished
    ? "celebrate"
    : q?.reveal
      ? q.result?.correct
        ? "celebrate"
        : "oops"
      : q?.answered
        ? "thinking"
        : q && q.deadline - now < 6000
          ? "urgent"
          : themeReaction
            ? "theme"
            : "idle";
  useEffect(() => {
    if (!themeMounted.current) {
      themeMounted.current = true;
      return;
    }
    setThemeReaction(true);
    const timer = setTimeout(() => setThemeReaction(false), 1500);
    return () => clearTimeout(timer);
  }, [theme, hostTheme]);
  async function submit() {
    if (!canAnswer || !selected.trim()) return;
    await perform("answer", {
      gameId: game.id,
      index: q.index,
      answer: selected.trim(),
      confidence,
    });
  }
  useEffect(() => {
    function keys(e) {
      if (
        !q ||
        !canAnswer ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)
      )
        return;
      if (["1", "2", "3", "4"].includes(e.key) && q.choices.length) {
        const choice = q.choices[Number(e.key) - 1];
        if (!removed.includes(choice)) setSelected(choice);
      }
      if (e.key === "Enter") submit();
    }
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [q, selected, canAnswer, removed, confidence]);
  useEffect(() => {
    if (message) {
      const id = setTimeout(() => setMessage(""), 4000);
      return () => clearTimeout(id);
    }
  }, [message]);
  const nextShow = schedule
    ? now >= schedule.starts && now < schedule.ends
      ? schedule.starts
      : schedule.next
    : 0;
  const live = schedule && now >= schedule.starts && now < schedule.ends,
    entryOpen = live && now < schedule.starts + 25000;
  const chosenHost = hosts.find((h) => h.id === profile?.host) || hosts[0];
  async function share(url) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Invite link copied.");
    } catch {
      setModal({ type: "link", url });
    }
  }
  function home() {
    setGame(null);
    setCoach(null);
    setScreen("play");
    call("dashboard")
      .then(consume)
      .catch(() => {});
  }
  async function start(mode) {
    setCoach(null);
    await perform("join", { mode });
    setScreen("play");
  }
  if (!data)
    return (
      <main className="loading">
        <div className="brand">
          <Target />
          ONE SHOT<span>.</span>
        </div>
        {bootError ? (
          <>
            <p>{bootError}</p>
            <button className="primary" onClick={boot}>
              Try again
            </button>
          </>
        ) : (
          <>
            <Loader2 className="spin" />
            <p>Getting the show ready…</p>
          </>
        )}
      </main>
    );
  return (
    <div className="shell">
      <header className="topbar">
        <button className="brand" onClick={home}>
          <Target size={29} />
          ONE SHOT<span>.</span>
        </button>
        <nav aria-label="Main navigation">
          {[
            ["play", "The show", Target],
            ["leaderboard", "Leaderboard", Trophy],
            ["clubs", "Clubs", Users],
            ["profile", "My profile", User],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              className={screen === id ? "active" : ""}
              onClick={() => setScreen(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="topactions">
          <button
            className="iconbutton"
            aria-label={`Theme: ${theme}. Click to change.`}
            title={`Theme: ${theme}`}
            onClick={() =>
              setTheme(
                theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto",
              )
            }
          >
            {theme === "auto" ? (
              <Monitor size={18} />
            ) : theme === "dark" ? (
              <Moon size={18} />
            ) : (
              <Sun size={18} />
            )}
          </button>
          <button
            className="avatar"
            onClick={() => setScreen("profile")}
            aria-label="Your profile"
          >
            {profile.name.slice(0, 2).toUpperCase()}
          </button>
        </div>
      </header>
      <div className="statusbar">
        <span>
          <i className={live ? "dot live" : "dot"} />
          {live ? "THE SHOW IS LIVE" : "ONE GAME. EVERY DAY. MAKE IT COUNT."}
        </span>
        <span className="quiet">
          {new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          }).format(now)}
          <span className="desktop"> · Season {profile.season.number}</span>
        </span>
      </div>
      {(error || message) && (
        <div
          className={`toast ${error ? "error" : ""}`}
          role={error ? "alert" : "status"}
        >
          {error || message}
          <button
            aria-label="Dismiss"
            onClick={() => {
              setError("");
              setMessage("");
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {invite && (
        <div className="invitation">
          <Link size={18} />
          <span>
            You’ve been invited to{" "}
            {invite.type === "club" ? "a trivia club" : "connect with a friend"}
            .
          </span>
          <button
            onClick={async () => {
              if (!data.accountLinked) {
                setModal({ type: "auth" });
                return;
              }
              const r = await perform(
                invite.type === "club" ? "join_club" : "accept_friend",
                { code: invite.code },
              );
              if (r) {
                setInvite(null);
                setMessage("Invitation accepted.");
              }
            }}
          >
            Accept invite <ArrowRight size={15} />
          </button>
          <button
            className="iconbutton"
            aria-label="Dismiss invite"
            onClick={() => setInvite(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <main>
        {screen === "play" && !game && (
          <div className="layout">
            <section className="primarycol">
              <div className="hero">
                <div className="hero-text">
                  <div className="eyebrow">
                    <span className="pill">THE DAILY CHALLENGE</span>
                    <span className="quiet">10 questions · ~6 minutes</span>
                  </div>
                  <h1>
                    One game.
                    <br />
                    One chance.
                    <br />
                    <em>One shot.</em>
                  </h1>
                  <p>
                    A daily battle of brains. A little confidence.
                    <br className="desktop" /> And a whole world to beat.
                  </p>
                  <div className="hero-actions">
                    <button
                      className="primary"
                      onClick={() => {
                        if (!data.accountLinked) {
                          setModal({ type: "auth" });
                          return;
                        }
                        if (schedule.joined)
                          perform("game", { gameId: schedule.joined });
                        else start("ranked");
                      }}
                      disabled={!schedule.joined && !entryOpen}
                    >
                      {schedule.joined
                        ? "Return to your show"
                        : entryOpen
                          ? "Enter the live show"
                          : "The next shot is coming"}{" "}
                      <ArrowUpRight size={18} />
                    </button>
                    <button
                      className="textbutton"
                      onClick={() => start("practice")}
                    >
                      Try a practice round <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="mascot-stage">
                  <span className="stage-note">ONE OF THE GOOD ONES.</span>
                  <Mascot kind={mascotKind} mood={mascotMood} />
                  <p className="mascot-caption">
                    <strong>{mascots[mascotKind].name}</strong> is in your
                    corner.<span>Move your pointer. Give them a tap.</span>
                  </p>
                </div>
              </div>
              <MascotStudio kind={mascotKind} onChange={setMascotKind} />
              <div className="sectionhead">
                <h2>Your next shot</h2>
                <span className="tag">
                  <Globe size={13} /> Worldwide, together
                </span>
              </div>
              <article className="showcard">
                <div className="showtop">
                  <div className="showicon">
                    <Zap size={24} />
                  </div>
                  <div>
                    <span className="eyebrow quiet">THE DAILY 10</span>
                    <h3>Tonight’s gauntlet</h3>
                    <p>
                      {new Intl.DateTimeFormat(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZoneName: "short",
                      }).format(nextShow || schedule.next)}{" "}
                      · Same questions for everyone
                    </p>
                  </div>
                  <div className="countdown" aria-label="Time until show">
                    {countdown(nextShow - now).map((n, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="colon">:</span>}
                        <div>
                          <b>{n}</b>
                          <small>{["HRS", "MIN", "SEC"][i]}</small>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div className="categories">
                  {schedule.categories.slice(0, 6).map((c, i) => (
                    <span key={c}>
                      <span className={`category-dot c${i}`} />
                      {c}
                    </span>
                  ))}
                  <span>+ more</span>
                </div>
                <div className="showbottom">
                  <span>
                    <Users size={15} />{" "}
                    {schedule.players
                      ? `${fmt(schedule.players)} challengers entered`
                      : "Be among the first challengers"}
                  </span>
                  <span>
                    <Shield size={14} /> One entry. Fair play.
                  </span>
                </div>
              </article>
              <div className="sectionhead">
                <h2>The road to the final</h2>
                <button
                  className="textbutton small"
                  onClick={() => setModal({ type: "rules" })}
                >
                  How it works <HelpCircle size={14} />
                </button>
              </div>
              <div className="rounds">
                {rounds.map((r, i) => (
                  <div key={r}>
                    <small>0{i + 1}</small>
                    <b>{r}</b>
                    <span>
                      {i < 3
                        ? "Find your rhythm"
                        : i === 3
                          ? "Back your instincts"
                          : "Make it count"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="finalstrip">
                <Crown size={20} />
                <div>
                  <b>One last question. All the glory.</b>
                  <span>
                    The top 10% advance to the Global Final. Ties qualify
                    together.
                  </span>
                </div>
                <ArrowUpRight size={18} />
              </div>
            </section>
            <aside>
              <div className="card hostcard">
                <div className="sectionhead">
                  <h2>Meet your host</h2>
                  <Sparkles size={17} />
                </div>
                <div className={`host-portrait ${chosenHost.color}`}>
                  <chosenHost.icon size={52} />
                  <span>ON AIR</span>
                </div>
                <h3>{chosenHost.name}</h3>
                <p>{chosenHost.role}</p>
                <blockquote>
                  “
                  {chosenHost.id === "professor"
                    ? "A little knowledge is dangerous. Ten questions should be interesting."
                    : chosenHost.id === "hype"
                      ? "The stage is yours. Let’s make some noise."
                      : chosenHost.id === "villain"
                        ? "I hope you brought more than confidence."
                        : "The answer is waiting. Trust what you know."}
                  ”
                </blockquote>
                <button
                  className="secondary full"
                  onClick={() => setModal({ type: "hosts" })}
                >
                  Choose your host <ArrowRight size={15} />
                </button>
              </div>
              <div className="card">
                <div className="sectionhead">
                  <h2>Your momentum</h2>
                  <TrendingUp size={17} />
                </div>
                <div className="momentum">
                  <div>
                    <Flame className="orange-text" size={20} />
                    <b>{profile.streak}</b>
                    <span>day streak</span>
                  </div>
                  <div>
                    <Target className="lime-text" size={20} />
                    <b>{profile.accuracy}%</b>
                    <span>accuracy</span>
                  </div>
                </div>
                <div className="rating">
                  <span>
                    {profile.tier}{" "}
                    <span className="quiet">
                      · {fmt(profile.rating)} rating
                    </span>
                  </span>
                  <span className="tag purple">{profile.games} games</span>
                </div>
              </div>
              <div className="small-note">
                <Shield size={18} />
                <p>
                  One shared question set. Server-verified scores. No second
                  shots in ranked play.
                </p>
              </div>
            </aside>
          </div>
        )}
        {screen === "play" && game && (
          <div className="game-layout">
            <div className="game-top">
              <button className="textbutton" onClick={home}>
                <ArrowLeft size={16} /> Back to lobby
              </button>
              <span className="tag">
                {game.mode === "practice"
                  ? "PRACTICE · UNRANKED"
                  : "LIVE · RANKED"}
              </span>
            </div>
            <div className="scorestrip">
              <span>
                <Target size={18} />
                <b>{fmt(game.score)}</b> <small>points</small>
              </span>
              <span>
                <Flame size={18} />
                <b>{game.streak}</b> <small>streak</small>
              </span>
              <span>
                <Trophy size={18} />
                <b>#{game.rank}</b>{" "}
                <small>
                  of {game.participants}{" "}
                  {game.mode === "practice" ? "practice players" : "players"}
                </small>
              </span>
            </div>
            <div className="game-sidekick">
              <Mascot kind={mascotKind} mood={mascotMood} />
              <p>
                <strong>{mascots[mascotKind].name}</strong>
                <br />
                {game.finished
                  ? "That’s a wrap. Take a bow."
                  : q?.reveal
                    ? q.result?.correct
                      ? "Knew you had it in you."
                      : "Shake it off. There’s another shot."
                    : q?.answered
                      ? "Locked in. Now we wait."
                      : q && q.deadline - now < 6000
                        ? "Clock’s ticking. Trust yourself."
                        : "Take a breath. You’ve got this."}
              </p>
            </div>
            {game.finished ? (
              <section className="results card">
                <div className="result-icon">
                  <Trophy size={44} />
                </div>
                <span className="eyebrow">THAT’S YOUR SHOT</span>
                <h1>You made it count.</h1>
                <p>
                  {game.mode === "practice"
                    ? "Practice complete. Your ranked shot is still waiting."
                    : "Your score is locked. See you at the next show."}
                </p>
                <div className="resultstats">
                  <div>
                    <b>{fmt(game.score)}</b>
                    <span>Total points</span>
                  </div>
                  <div>
                    <b>
                      {game.history.filter((a) => a.correct).length}/
                      {game.mode === "practice" ? 10 : game.finalist ? 11 : 10}
                    </b>
                    <span>Correct answers</span>
                  </div>
                  <div>
                    <b>#{game.rank}</b>
                    <span>
                      {game.mode === "practice"
                        ? "Practice rank"
                        : "Daily rank"}
                    </span>
                  </div>
                </div>
                <div className="answertrail">
                  {Array.from(
                    {
                      length:
                        game.mode === "practice" ? 10 : game.finalist ? 11 : 10,
                    },
                    (_, i) => {
                      const a = game.history.find((a) => a.question === i);
                      return (
                        <span
                          key={i}
                          className={a?.correct ? "correct" : "missed"}
                          title={`Question ${i + 1}: ${a?.correct ? "correct" : "missed or skipped"}`}
                        >
                          {a?.correct ? <Check size={18} /> : <X size={18} />}
                        </span>
                      );
                    },
                  )}
                </div>
                <div className="coach">
                  <div className="eyebrow">
                    <Sparkles size={15} />{" "}
                    {coach?.ai ? "AI POST-GAME COACH" : "POST-GAME NOTES"}
                  </div>
                  <p>{coach?.text || "Your coach is looking over the game…"}</p>
                </div>
                <button className="primary" onClick={home}>
                  Back to the show <ArrowRight size={18} />
                </button>
              </section>
            ) : game.waitingFinal ? (
              <section className="card results">
                <Crown size={48} />
                <h1>The final is underway.</h1>
                <p>
                  The top 10% are taking their final shot. Your result arrives
                  when the show closes.
                </p>
                <span className="tag">
                  Score locked · {fmt(game.score)} points
                </span>
              </section>
            ) : (
              q && (
                <section className="questioncard card">
                  <div className="question-meta">
                    <span className="tag purple">{q.round}</span>
                    <span className="quiet">
                      Question {q.index + 1} of {q.index === 10 ? 11 : 10}
                    </span>
                    <span
                      className={`timer ${q.deadline - now < 6000 ? "urgent" : ""}`}
                    >
                      <Clock size={16} />
                      {Math.max(0, Math.ceil((q.deadline - now) / 1000))}s
                    </span>
                  </div>
                  <div className="timertrack">
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, ((q.deadline - now) / (q.seconds * 1000)) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="eyebrow quiet question-category">
                    {q.category}{" "}
                    <span>
                      · {["", "Easy", "Medium", "Hard"][q.difficulty]}
                    </span>
                  </div>
                  <h1>{q.prompt}</h1>
                  {q.choices.length ? (
                    <div className="choices">
                      {q.choices.map((choice, i) => (
                        <button
                          key={choice}
                          className={`choice ${selected === choice ? "selected" : ""} ${q.reveal && q.answer === choice ? "right" : ""} ${q.reveal && selected === choice && q.answer !== choice ? "wrong" : ""} ${removed.includes(choice) ? "removed" : ""}`}
                          disabled={!canAnswer || removed.includes(choice)}
                          onClick={() => setSelected(choice)}
                        >
                          <span className="choice-letter">
                            {["A", "B", "C", "D"][i]}
                          </span>
                          <span>{choice}</span>
                          {q.reveal && q.answer === choice ? (
                            <CheckCircle2 size={20} />
                          ) : selected === choice ? (
                            <Check size={18} />
                          ) : (
                            <span className="keycap">{i + 1}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <label className="free-answer">
                      <span>Your answer</span>
                      <input
                        autoComplete="off"
                        autoFocus
                        placeholder="Trust what you know…"
                        maxLength={200}
                        value={selected}
                        disabled={!canAnswer}
                        onChange={(e) => setSelected(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                      />
                    </label>
                  )}
                  {(q.index === 6 || q.index === 7) && !q.reveal && (
                    <div className="wager">
                      <div>
                        <b>How sure are you?</b>
                        <small>
                          Correct: multiply your reward. Wrong: lose wager
                          points.
                        </small>
                      </div>
                      <div>
                        {[25, 50, 75, 100].map((c) => (
                          <button
                            key={c}
                            disabled={!canAnswer}
                            className={confidence === c ? "active" : ""}
                            onClick={() => setConfidence(c)}
                          >
                            {c}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {hint && (
                    <div className="hint">
                      <Sparkles size={17} />
                      <span>{hint}</span>
                    </div>
                  )}
                  {q.reveal ? (
                    <div className="reveal">
                      <div
                        className={
                          q.result?.correct ? "lime-text" : "orange-text"
                        }
                      >
                        {q.result?.correct ? (
                          <CheckCircle2 size={22} />
                        ) : (
                          <BookOpen size={22} />
                        )}
                        <b>
                          {q.result?.correct
                            ? "Right on target."
                            : q.result
                              ? "A little wiser for the next one."
                              : "Time’s up."}
                        </b>
                        <span>
                          {q.result?.points > 0 ? "+" : ""}
                          {q.result?.points ?? 0} points
                        </span>
                      </div>
                      <p>
                        {hostLine && (
                          <em>
                            {hostLine}
                            <br />
                          </em>
                        )}
                        {q.explanation}
                      </p>
                      <a href={q.source} target="_blank" rel="noreferrer">
                        Read the source <ArrowUpRight size={13} />
                      </a>
                      {game.mode === "practice" && (
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => perform("next", { gameId: game.id })}
                        >
                          {q.index === 9 ? "See my results" : "Next question"}
                          <ArrowRight size={16} />
                        </button>
                      )}
                      {game.mode === "ranked" && (
                        <p className="quiet small">
                          The next question opens automatically for everyone.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="question-actions">
                      <div className="lifelines">
                        <span className="quiet small">
                          {game.lifelineUsed
                            ? "Lifeline used"
                            : "One lifeline per game"}
                        </span>
                        <div>
                          <button
                            title="Get a clue"
                            disabled={game.lifelineUsed || !canAnswer}
                            onClick={() =>
                              perform("lifeline", {
                                gameId: game.id,
                                type: "hint",
                              })
                            }
                          >
                            <Sparkles size={16} /> Hint
                          </button>
                          <button
                            title="Remove two wrong answers"
                            disabled={
                              game.lifelineUsed ||
                              !canAnswer ||
                              !q.choices.length
                            }
                            onClick={() =>
                              perform("lifeline", {
                                gameId: game.id,
                                type: "fifty",
                              })
                            }
                          >
                            50/50
                          </button>
                          <button
                            title="Double your reward and risk"
                            disabled={game.lifelineUsed || !canAnswer}
                            onClick={() =>
                              perform("lifeline", {
                                gameId: game.id,
                                type: "double",
                              })
                            }
                          >
                            <Zap size={16} /> 2×
                          </button>
                        </div>
                      </div>
                      <button
                        className="primary"
                        disabled={!canAnswer || !selected.trim()}
                        onClick={submit}
                      >
                        {busy ? (
                          <Loader2 className="spin" size={18} />
                        ) : q.answered ? (
                          "Answer locked"
                        ) : now >= q.deadline ? (
                          "Time’s up"
                        ) : (
                          "Lock it in"
                        )}
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  )}
                  {q.answered && !q.reveal && (
                    <div className="locked">
                      <Shield size={16} /> Your answer is locked. Everyone gets
                      the reveal together.
                    </div>
                  )}
                </section>
              )
            )}
            {!game.finished && (
              <div className="progressrounds">
                {rounds.map((r, i) => (
                  <span
                    key={r}
                    className={
                      q && Math.floor(q.index / 2) === i ? "current" : ""
                    }
                  >
                    <small>0{i + 1}</small>
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {screen === "leaderboard" && (
          <section>
            <div className="pageheading">
              <div>
                <span className="eyebrow lime-text">THE COMPETITION</span>
                <h1>
                  Great minds.
                  <br />
                  Greater rivalries.
                </h1>
                <p>Every point earned. Every place worth chasing.</p>
              </div>
              <div className="page-art">
                <Trophy size={78} />
              </div>
            </div>
            <div className="filters">
              <div className="tabs">
                {["daily", "weekly", "monthly", "season", "all", "friends"].map(
                  (p) => (
                    <button
                      key={p}
                      className={period === p ? "active" : ""}
                      onClick={() => setPeriod(p)}
                    >
                      {p === "all"
                        ? "All time"
                        : p[0].toUpperCase() + p.slice(1)}
                    </button>
                  ),
                )}
              </div>
              <select
                aria-label="Filter by club"
                value={clubFilter}
                onChange={(e) => setClubFilter(e.target.value)}
              >
                <option value="">Global leaderboard</option>
                {data.dashboard.clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="card board">
              <div className="boardhead">
                <span>Rank / Challenger</span>
                <span>Games</span>
                <span>Points</span>
              </div>
              {board.length ? (
                board.map((row) => (
                  <div
                    className={`boardrow ${row.id === profile.id ? "you" : ""}`}
                    key={row.id}
                  >
                    <div>
                      <span className={`rank rank${row.rank}`}>
                        {row.rank <= 3 ? (
                          <Trophy size={19} />
                        ) : (
                          String(row.rank).padStart(2, "0")
                        )}
                      </span>
                      <span className="avatar">
                        {row.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <b>
                          {row.name}{" "}
                          {row.id === profile.id && (
                            <small className="tag">YOU</small>
                          )}
                        </b>
                        <small>{row.region}</small>
                      </div>
                    </div>
                    <span className="quiet">{row.games}</span>
                    <b>{fmt(row.score)}</b>
                  </div>
                ))
              ) : (
                <div className="empty">
                  <Trophy size={38} />
                  <h3>The board is wide open.</h3>
                  <p>Ranked scores appear when real players take their shot.</p>
                  <button className="secondary" onClick={home}>
                    Go to the show <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="small-note">
              <Shield size={17} />
              <p>
                Live standings can change until the Global Final closes.
                Practice scores are excluded. Weekly and monthly boards use
                rolling windows.
              </p>
            </div>
          </section>
        )}
        {screen === "clubs" && (
          <section>
            <div className="pageheading">
              <div>
                <span className="eyebrow purple-text">
                  BETTER WITH YOUR PEOPLE
                </span>
                <h1>
                  Your club.
                  <br />
                  Your bragging rights.
                </h1>
                <p>Same global game. A rivalry a little closer to home.</p>
              </div>
              <button
                className="primary"
                onClick={() =>
                  data.accountLinked
                    ? setModal({ type: "club" })
                    : setModal({ type: "auth" })
                }
              >
                <Plus size={18} /> Create a club
              </button>
            </div>
            <div className="club-grid">
              {data.dashboard.clubs.map((c) => (
                <article className="card clubcard" key={c.id}>
                  <div className="club-icon">
                    <Users size={28} />
                  </div>
                  <h3>{c.name}</h3>
                  <p>
                    {c.members} {c.members === 1 ? "challenger" : "challengers"}
                  </p>
                  <div>
                    <button
                      className="secondary"
                      onClick={() => {
                        setClubFilter(c.id);
                        setScreen("leaderboard");
                      }}
                    >
                      Standings <ArrowUpRight size={15} />
                    </button>
                    <button
                      className="iconbutton"
                      aria-label={`Copy invite for ${c.name}`}
                      onClick={() =>
                        share(`${data.publicUrl}/?club=${c.invite}`)
                      }
                    >
                      <Copy size={17} />
                    </button>
                  </div>
                </article>
              ))}
              <article className="card clubcard joinclub">
                <Plus size={28} />
                <h3>Find your people</h3>
                <p>
                  Got an invite code? Join the conversation and the competition.
                </p>
                <button
                  className="secondary"
                  onClick={() => setModal({ type: "joinclub" })}
                >
                  Join a club <ArrowRight size={15} />
                </button>
              </article>
            </div>
            <article className="friendcard card">
              <div className="club-icon orange">
                <Users size={25} />
              </div>
              <div>
                <h3>A little friendly competition</h3>
                <p>
                  Invite a friend and compare your scores on the friends
                  leaderboard.
                </p>
              </div>
              <button
                className="primary"
                onClick={async () => {
                  if (!data.accountLinked) {
                    setModal({ type: "auth" });
                    return;
                  }
                  const r = await perform("invite");
                  if (r) share(r.inviteUrl);
                }}
              >
                Get invite link <Link size={16} />
              </button>
            </article>
            <div className="rival card">
              <div className="eyebrow">
                <Zap size={15} /> YOUR NEXT RIVAL
              </div>
              {data.dashboard.rival ? (
                <>
                  <h3>{data.dashboard.rival.name}</h3>
                  <p>
                    {fmt(data.dashboard.rival.score)} season points. Close
                    enough to chase.
                  </p>
                </>
              ) : (
                <>
                  <h3>A worthy rival is out there.</h3>
                  <p>
                    Play a ranked show to find a challenger near your season
                    score.
                  </p>
                </>
              )}
            </div>
          </section>
        )}
        {screen === "profile" && (
          <section>
            <div className="pageheading">
              <div>
                <span className="eyebrow lime-text">YOUR PLAYER CARD</span>
                <h1>
                  {profile.name}
                  <span className="lime-text">.</span>
                </h1>
                <p>
                  {profile.region} · {profile.tier} · {fmt(profile.rating)}{" "}
                  performance rating
                </p>
              </div>
              <button
                className="secondary"
                onClick={() => setModal({ type: "profile" })}
              >
                Edit profile <User size={16} />
              </button>
            </div>
            <div className="profile-grid">
              {[
                [Trophy, profile.games, "Ranked games"],
                [Flame, profile.streak, "Day streak"],
                [Target, `${profile.accuracy}%`, "Answer accuracy"],
                [Clock, `${profile.avgTime}s`, "Average response"],
              ].map(([Icon, value, label]) => (
                <div className="card statcard" key={label}>
                  <Icon size={22} />
                  <b>{value}</b>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="layout profilelayout">
              <div className="card">
                <div className="sectionhead">
                  <h2>Your knowledge map</h2>
                  <BookOpen size={18} />
                </div>
                {Object.keys(profile.categories).length ? (
                  Object.entries(profile.categories)
                    .sort(
                      (a, b) =>
                        b[1].correct / b[1].total - a[1].correct / a[1].total,
                    )
                    .map(([name, s]) => (
                      <div className="category-stat" key={name}>
                        <div>
                          <span>{name}</span>
                          <b>{Math.round((s.correct / s.total) * 100)}%</b>
                        </div>
                        <div className="bar">
                          <span
                            style={{ width: `${(s.correct / s.total) * 100}%` }}
                          />
                        </div>
                        <small>
                          {s.correct} / {s.total} correct
                        </small>
                      </div>
                    ))
                ) : (
                  <div className="empty">
                    <Target size={35} />
                    <h3>Every expert starts somewhere.</h3>
                    <p>Your strengths emerge as you play ranked games.</p>
                  </div>
                )}
              </div>
              <div className="card">
                <div className="sectionhead">
                  <h2>A little trophy shelf</h2>
                  <Crown size={18} />
                </div>
                {profile.badges.map((b, i) => (
                  <div
                    key={b.name}
                    className={`badge-row ${b.earned ? "earned" : ""}`}
                  >
                    <div>
                      {[<Target />, <Flame />, <Trophy />, <Crown />][i]}
                    </div>
                    <span>
                      <b>{b.name}</b>
                      <small>{b.detail}</small>
                    </span>
                    {b.earned && <CheckCircle2 size={18} />}
                  </div>
                ))}
              </div>
            </div>
            <div className="accountcard card">
              <div>
                <h3>
                  {data.accountLinked
                    ? "Your account is connected"
                    : "Give your score a name"}
                </h3>
                <p>
                  {data.accountLinked
                    ? "Your profile follows you when you link One Shot in ChatGPT."
                    : "Create an account to enter ranked shows and join clubs."}
                </p>
              </div>
              {!embedded &&
                (data.accountLinked ? (
                  <button
                    className="secondary"
                    onClick={async () => {
                      await api("/api/logout", {});
                      setGame(null);
                      await boot();
                      setMessage("Signed out.");
                    }}
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                ) : (
                  <button
                    className="primary"
                    onClick={() => setModal({ type: "auth" })}
                  >
                    Create account <ArrowRight size={16} />
                  </button>
                ))}
            </div>
          </section>
        )}
      </main>
      <footer>
        <span className="brand smallbrand">
          <Target size={17} />
          ONE SHOT<span>.</span>
        </span>
        <span>A little knowledge. A daily ritual.</span>
        <button onClick={() => setModal({ type: "rules" })}>Fair play</button>
        <button onClick={() => setModal({ type: "privacy" })}>Privacy</button>
        <span className="connection">
          <i className="dot" />
          {embedded ? "Connected to ChatGPT" : "Local preview"}
        </span>
      </footer>
      {modal && (
        <div
          className="modalback"
          onClick={(e) => e.target === e.currentTarget && setModal(null)}
        >
          <section
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-label={modal.type}
          >
            <button
              className="modalclose iconbutton"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {modal.type === "auth" && (
              <Auth
                onDone={async () => {
                  setModal(null);
                  await boot();
                  setMessage("You’re ready to take your shot.");
                }}
              />
            )}
            {modal.type === "hosts" && (
              <>
                <span className="eyebrow purple-text">
                  SAME GAME. YOUR VIBE.
                </span>
                <h2>Who’s on the mic?</h2>
                <p>
                  Personalities change the commentary. The questions stay fair.
                </p>
                <div className="host-options">
                  {hosts.map((h) => (
                    <button
                      key={h.id}
                      className={profile.host === h.id ? "selected" : ""}
                      disabled={busy}
                      onClick={async () => {
                        const r = await perform("profile", {
                          name: profile.name,
                          region: profile.region,
                          host: h.id,
                        });
                        if (r) {
                          setModal(null);
                          setMessage(`${h.name} is on the mic.`);
                        }
                      }}
                    >
                      <span className={`host-icon ${h.color}`}>
                        <h.icon size={25} />
                      </span>
                      <span>
                        <b>{h.name}</b>
                        <small>{h.role}</small>
                      </span>
                      {profile.host === h.id && <CheckCircle2 size={19} />}
                    </button>
                  ))}
                </div>
              </>
            )}
            {modal.type === "club" && (
              <SimpleForm
                title="Start your club"
                label="Club name"
                placeholder="The Knowledge Collective"
                button="Create club"
                onSubmit={async (value) => {
                  const r = await perform("create_club", { name: value });
                  if (r) {
                    setModal(null);
                    share(r.inviteUrl);
                  }
                }}
              />
            )}
            {modal.type === "joinclub" && (
              <SimpleForm
                title="Join your people"
                label="Invitation code"
                placeholder="Paste your club code"
                button="Join club"
                onSubmit={async (value) => {
                  const r = await perform("join_club", { code: value });
                  if (r) {
                    setModal(null);
                    setMessage("Welcome to the club.");
                  }
                }}
              />
            )}
            {modal.type === "profile" && (
              <ProfileForm
                profile={profile}
                busy={busy}
                onSubmit={async (value) => {
                  const r = await perform("profile", value);
                  if (r) setModal(null);
                }}
              />
            )}
            {modal.type === "link" && (
              <>
                <h2>Your invitation link</h2>
                <p>Copy this link and share it with your challenger.</p>
                <input
                  readOnly
                  value={modal.url}
                  onFocus={(e) => e.target.select()}
                />
              </>
            )}
            {modal.type === "rules" && (
              <>
                <span className="eyebrow lime-text">HOW THE SHOW WORKS</span>
                <h2>One shot. Make it fair.</h2>
                <p>
                  One shared daily show at the time shown in your local
                  timezone. Enter during the first question. Ten questions, five
                  rounds, one lifeline. The top 10% (including ties) get a final
                  question.
                </p>
                <div className="rules">
                  <p>
                    <b>Points</b> Correct answers earn 300–900 base points, a
                    speed bonus of up to 100 in three-second buckets, and up to
                    200 streak points.
                  </p>
                  <p>
                    <b>The Wager</b> On questions 7 and 8, 25%, 50%, 75%, or
                    100% confidence scales rewards and penalties. Scores never
                    fall below zero.
                  </p>
                  <p>
                    <b>Lifelines</b> Choose a curated hint, 50/50, or double
                    points and risk. One per game. Skipped questions break a
                    streak.
                  </p>
                  <p>
                    <b>Free answers</b> Frozen accepted variants and
                    accent-insensitive matching keep adjudication consistent for
                    every player.
                  </p>
                  <p>
                    <b>Practice</b> Play anytime, at your own pace. Practice
                    scores never affect your ranked profile or standings.
                  </p>
                  <p>
                    <b>Rating</b> A performance rating based on completed ranked
                    scores; it is not an Elo system. Seasons last eight weeks.
                  </p>
                </div>
              </>
            )}
            {modal.type === "privacy" && (
              <>
                <h2>
                  Your knowledge.
                  <br />
                  Your privacy.
                </h2>
                <p>
                  Your public profile contains your display name, region, and
                  game statistics. Your email, password hash, and account tokens
                  stay private.
                </p>
                <p>
                  AI commentary and coaching send your display name and game
                  statistics to OpenAI. The game still works when the AI service
                  is unavailable.
                </p>
                <p>
                  One Shot uses its own linked account. It does not receive your
                  private ChatGPT account information automatically.
                </p>
                <p>
                  Accounts, answers, timings, friendships, and clubs are stored
                  by the operator. Invite links grant membership or friendship
                  when accepted.
                </p>
                {!embedded && (
                  <button
                    className="danger"
                    onClick={() => setModal({ type: "delete" })}
                  >
                    Delete my account and game data
                  </button>
                )}
              </>
            )}
            {modal.type === "delete" && (
              <>
                <h2>Delete your player?</h2>
                <p>
                  This permanently deletes your account, game history,
                  friendships, and clubs you own.
                </p>
                <button
                  className="danger"
                  onClick={async () => {
                    try {
                      await api("/api/account", null, "DELETE");
                      setModal(null);
                      setGame(null);
                      await boot();
                      setMessage("Account deleted.");
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  Permanently delete
                </button>
                <button className="secondary" onClick={() => setModal(null)}>
                  Keep my account
                </button>
              </>
            )}
            {error && (
              <p className="formerror" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function Auth({ onDone }) {
  const [mode, setMode] = useState("register"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <span className="eyebrow lime-text">YOUR DAILY RITUAL STARTS HERE</span>
      <h2>
        {mode === "register" ? "Meet your competition." : "Welcome back."}
      </h2>
      <p>One account for the web and your ChatGPT plugin.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fields = Object.fromEntries(new FormData(e.target));
          try {
            await api("/api/auth", { ...fields, mode });
            await onDone();
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "register" && (
          <label>
            Display name
            <input
              name="name"
              minLength={2}
              maxLength={24}
              required
              placeholder="Your public player name"
              autoComplete="nickname"
            />
          </label>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            minLength={10}
            maxLength={128}
            required
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            placeholder="At least 10 characters"
          />
        </label>
        {error && <p className="formerror">{error}</p>}
        <button className="primary full" disabled={busy}>
          {busy
            ? "Connecting…"
            : mode === "register"
              ? "Create my account"
              : "Sign in"}
          <ArrowRight size={17} />
        </button>
      </form>
      <button
        className="textbutton authswitch"
        onClick={() => setMode(mode === "register" ? "login" : "register")}
      >
        {mode === "register"
          ? "Already a challenger? Sign in"
          : "New here? Create an account"}
      </button>
    </>
  );
}
function SimpleForm({ title, label, placeholder, button, onSubmit }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <h2>{title}</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSubmit(new FormData(e.target).get("value").trim());
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {label}
          <input
            name="value"
            placeholder={placeholder}
            required
            maxLength={100}
          />
        </label>
        <button className="primary full" disabled={busy}>
          {busy ? "Working…" : button}
          <ArrowRight size={17} />
        </button>
      </form>
    </>
  );
}
function ProfileForm({ profile, busy, onSubmit }) {
  return (
    <>
      <h2>A name worth remembering.</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            ...Object.fromEntries(new FormData(e.target)),
            host: profile.host,
          });
        }}
      >
        <label>
          Display name
          <input
            name="name"
            defaultValue={profile.name}
            required
            minLength={2}
            maxLength={24}
          />
        </label>
        <label>
          Region
          <input
            name="region"
            defaultValue={profile.region}
            required
            minLength={2}
            maxLength={60}
          />
        </label>
        <button className="primary full" disabled={busy}>
          Save profile <Check size={17} />
        </button>
      </form>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
