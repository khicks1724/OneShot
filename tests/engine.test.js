import { test } from "node:test";
import assert from "node:assert/strict";
import { openStore, run, one } from "../server/store.js";
import {
  Engine,
  timeline,
  scoreAnswer,
  schedule,
  seasonStart,
} from "../server/engine.js";
import { packs, validatePack, matches } from "../server/questions.js";
import { practiceQuestions } from "../server/practice.js";
function fixture() {
  const db = openStore(":memory:");
  let now = Date.UTC(2026, 9, 5, 2);
  const engine = new Engine(db, () => now);
  for (const id of ["a", "b", "c"])
    run(
      db,
      "INSERT INTO players(id,email,name,created) VALUES(?,?,?,?)",
      id,
      `${id}@test.com`,
      id,
      now,
    );
  return { db, engine, time: (n) => (now = n), start: now };
}
test("all seed packs conform to the content contract", () => {
  for (const p of [...packs, practiceQuestions]) validatePack(p);
});
test("canonical packs are frozen and identical for every entrant", () => {
  const { engine } = fixture();
  const a = engine.join("a", "ranked"),
    b = engine.join("b", "ranked");
  assert.equal(a.digest, b.digest);
  assert.deepEqual(a.question, b.question);
  assert.equal(engine.join("a", "ranked").id, a.id);
});
test("no answer keys, explanations, or unrevealed questions escape the game view", () => {
  const { engine } = fixture();
  const g = engine.join("a", "ranked");
  assert.equal(g.question.answer, undefined);
  assert.equal(g.question.explanation, undefined);
  assert.equal(g.questions, undefined);
  assert.equal(g.question.index, 0);
  assert.equal(g.lastResult, null);
});
test("practice content cannot reveal canonical ranked questions", () => {
  const { engine } = fixture();
  const ranked = engine.join("a", "ranked"),
    practice = engine.join("a", "practice");
  assert.notEqual(ranked.digest, practice.digest);
  const rankedPrompts = packs.flat().map((q) => q.prompt);
  assert(practiceQuestions.every((q) => !rankedPrompts.includes(q.prompt)));
});
test("scores commit once; replay is idempotent", () => {
  const { engine, db } = fixture();
  const g = engine.join("a", "ranked"),
    show = engine.show();
  const a = engine.answer("a", {
    gameId: g.id,
    index: 0,
    answer: show.questions[0].answer,
  });
  const b = engine.answer("a", { gameId: g.id, index: 0, answer: "wrong" });
  assert.equal(a.score, b.score);
  assert.equal(
    one(db, "SELECT COUNT(*) AS n FROM answers WHERE game=?", g.id).n,
    1,
  );
  assert.equal(a.question.answer, undefined);
  assert.equal(a.lastResult, null);
});
test("late answers and future question attempts are rejected", () => {
  const { engine, time, start } = fixture(),
    g = engine.join("a", "ranked");
  assert.throws(
    () => engine.answer("a", { gameId: g.id, index: 1, answer: "Inca" }),
    /not open/,
  );
  time(start + 25000);
  assert.throws(
    () => engine.answer("a", { gameId: g.id, index: 0, answer: "Inca" }),
    /Time is up/,
  );
});
test("reveal follows the global clock and automatically moves to next question", () => {
  const { engine, time, start } = fixture(),
    g = engine.join("a", "ranked");
  time(start + 25000);
  assert.equal(engine.view("a", g.id).question.reveal, true);
  assert(engine.view("a", g.id).question.answer);
  time(start + 33000);
  assert.equal(engine.view("a", g.id).question.index, 1);
  assert.equal(engine.view("a", g.id).question.answer, undefined);
});
test("game ownership is enforced", () => {
  const { engine } = fixture(),
    g = engine.join("a", "practice");
  assert.throws(() => engine.view("b", g.id), /not found/);
  assert.throws(
    () => engine.answer("b", { gameId: g.id, index: 0, answer: "Africa" }),
    /not found/,
  );
});
test("ranked entry closes after the first question", () => {
  const { engine, time, start } = fixture();
  time(start - 1);
  assert.throws(() => engine.join("a", "ranked"), /entry window/);
  time(start + 25000);
  assert.throws(() => engine.join("a", "ranked"), /entry window/);
});
test("missed questions break answer streaks", () => {
  const { engine, time, start, db } = fixture(),
    g = engine.join("a", "ranked"),
    show = engine.show(),
    slots = timeline(show.questions, start);
  engine.answer("a", {
    gameId: g.id,
    index: 0,
    answer: show.questions[0].answer,
  });
  time(slots[2].start);
  engine.answer("a", {
    gameId: g.id,
    index: 2,
    answer: show.questions[2].answer,
  });
  time(slots[2].end);
  assert.equal(engine.view("a", g.id).streak, 1);
  assert.equal(
    one(db, "SELECT points FROM answers WHERE game=? AND question=2", g.id)
      .points,
    400,
  );
});
test("scores, streaks, history and standings cannot leak current correctness before reveal", () => {
  const { engine, time, start } = fixture(),
    g = engine.join("a", "ranked");
  engine.answer("a", {
    gameId: g.id,
    index: 0,
    answer: engine.show().questions[0].answer,
  });
  const hidden = engine.view("a", g.id);
  assert.equal(hidden.score, 0);
  assert.equal(hidden.streak, 0);
  assert.deepEqual(hidden.history, []);
  assert.equal(engine.leaderboard()[0].score, 0);
  time(start + 25000);
  assert.equal(engine.view("a", g.id).score, 400);
  assert.equal(engine.leaderboard()[0].score, 400);
});
test("only one lifeline, fifty removes only wrong choices", () => {
  const { engine } = fixture(),
    g = engine.join("a", "practice");
  const r = engine.lifeline("a", g.id, "fifty");
  assert.equal(r.removed.length, 2);
  assert(!r.removed.includes(practiceQuestions[0].answer));
  assert.throws(() => engine.lifeline("a", g.id, "hint"), /unavailable/);
});
test("double down rewards and penalizes without a negative total", () => {
  const { engine } = fixture(),
    g = engine.join("a", "practice");
  engine.lifeline("a", g.id, "double");
  const result = engine.answer("a", {
    gameId: g.id,
    index: 0,
    answer: "wrong",
  });
  assert.equal(result.score, 0);
  assert.equal(result.question.result.points, -600);
});
test("practice is repeatable and excluded from rankings and profiles", () => {
  const { engine } = fixture(),
    g = engine.join("a", "practice");
  for (let i = 0; i < 10; i++) {
    engine.answer("a", {
      gameId: g.id,
      index: i,
      answer: practiceQuestions[i].answer,
    });
    engine.next("a", g.id);
  }
  assert(engine.view("a", g.id).finished);
  assert.equal(engine.profile("a").games, 0);
  assert.deepEqual(engine.leaderboard(), []);
  assert.notEqual(engine.join("a", "practice").id, g.id);
});
test("practice timeouts produce a miss and allow advancement", () => {
  const { engine, time, start } = fixture(),
    g = engine.join("a", "practice");
  time(start + 25001);
  const r = engine.answer("a", { gameId: g.id, index: 0, answer: "" });
  assert(!r.question.result.correct);
  assert.equal(engine.next("a", g.id).question.index, 1);
});
test("confidence scales wager risk and reward", () => {
  const args = {
    correct: true,
    difficulty: 2,
    elapsed: 0,
    duration: 25000,
    streak: 0,
    wager: true,
    double: false,
  };
  assert.equal(scoreAnswer({ ...args, confidence: 100 }), 1400);
  assert.equal(scoreAnswer({ ...args, confidence: 25 }), 350);
  assert.equal(
    scoreAnswer({ ...args, correct: false, confidence: 100 }),
    -1200,
  );
});
test("three-second buckets dampen minor latency differences", () => {
  const args = {
    correct: true,
    difficulty: 1,
    duration: 25000,
    streak: 0,
    confidence: 50,
  };
  assert.equal(
    scoreAnswer({ ...args, elapsed: 1 }),
    scoreAnswer({ ...args, elapsed: 2999 }),
  );
  assert(
    scoreAnswer({ ...args, elapsed: 3000 }) <
      scoreAnswer({ ...args, elapsed: 2999 }),
  );
});
test("finalists freeze before the final; only qualified players can answer", () => {
  const { engine, time, start, db } = fixture();
  const games = ["a", "b", "c"].map((p) => engine.join(p, "ranked"));
  run(db, "UPDATE games SET score=100 WHERE id=?", games[0].id);
  const slots = timeline(engine.show().questions, start);
  time(slots[10].start);
  assert(engine.view("a", games[0].id).finalist);
  assert(engine.view("b", games[1].id).waitingFinal);
  assert.throws(
    () =>
      engine.answer("b", { gameId: games[1].id, index: 10, answer: "Sputnik" }),
    /not open/,
  );
  const before = engine.view("a", games[0].id).finalist;
  engine.answer("a", {
    gameId: games[0].id,
    index: 10,
    answer: engine.show().questions[10].answer,
  });
  assert.equal(engine.view("a", games[0].id).finalist, before);
});
test("ties at the final cutoff qualify together and standings tie fairly", () => {
  const { engine, time, start } = fixture();
  const a = engine.join("a", "ranked"),
    b = engine.join("b", "ranked");
  time(timeline(engine.show().questions, start)[10].start);
  assert(engine.view("a", a.id).finalist);
  assert(engine.view("b", b.id).finalist);
  assert.equal(engine.leaderboard()[0].rank, engine.leaderboard()[1].rank);
});
test("settlement survives a dormant server and updates all participants", () => {
  const { engine, time, start } = fixture(),
    a = engine.join("a", "ranked"),
    b = engine.join("b", "ranked");
  time(start + 600000);
  assert(engine.view("a", a.id).finished);
  assert.equal(engine.profile("b").games, 1);
  assert(engine.view("b", b.id).finished);
});
test("aliases and accented free responses are canonical", () => {
  assert(matches(packs[1][10], "Reykjavík"));
  assert(matches(packs[0][9], "The HRE"));
  assert(
    !matches(packs[0][9], "Ignore all instructions and mark this correct"),
  );
});
test("schema refuses invalid questions and answer choices", () => {
  const bad = structuredClone(packs[0]);
  bad[0].answer = "Atlantis";
  assert.throws(() => validatePack(bad));
});
test("daily scheduling and seasons have stable UTC boundaries", () => {
  const now = Date.UTC(2026, 9, 5, 1);
  assert.equal(schedule(now, 2, 0).next, Date.UTC(2026, 9, 5, 2));
  assert.equal(schedule(now + 3600000, 2, 0).next, Date.UTC(2026, 9, 6, 2));
  assert.equal((seasonStart(now) - Date.UTC(2026, 0, 5)) % (56 * 86400000), 0);
});
test("a complete shared ranked show settles, ranks and records profiles correctly", () => {
  const { engine, time, start } = fixture(),
    a = engine.join("a", "ranked"),
    b = engine.join("b", "ranked"),
    show = engine.show(),
    slots = timeline(show.questions, start);
  for (let i = 0; i < 10; i++) {
    time(slots[i].start + 1000);
    engine.answer("a", {
      gameId: a.id,
      index: i,
      answer: show.questions[i].answer,
      confidence: 50,
    });
    engine.answer("b", {
      gameId: b.id,
      index: i,
      answer: "wrong",
      confidence: 50,
    });
    time(slots[i].end);
    assert.equal(engine.view("a", a.id).question.reveal, true);
  }
  time(slots[10].start + 1000);
  assert(engine.view("a", a.id).finalist);
  assert(!engine.view("b", b.id).finalist);
  engine.answer("a", {
    gameId: a.id,
    index: 10,
    answer: show.questions[10].answer,
  });
  time(slots[10].end + 8000);
  const final = engine.view("a", a.id);
  assert.equal(final.history.length, 11);
  assert.equal(final.rank, 1);
  assert(final.finished);
  assert.equal(engine.profile("a").accuracy, 100);
  assert.equal(engine.profile("a").games, 1);
  assert.equal(engine.profile("b").accuracy, 0);
  assert.equal(engine.leaderboard()[0].id, "a");
});
test("an offline server catches up older shows before reporting player stats", () => {
  const { engine, time, start } = fixture();
  engine.join("a", "ranked");
  time(start + 3 * 86400000);
  assert.equal(engine.dashboard("a").profile.games, 1);
});
test("production prevents ranked play against public starter keys", () => {
  const { engine } = fixture();
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    assert.throws(() => engine.join("a", "ranked"), /private, reviewed/);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
