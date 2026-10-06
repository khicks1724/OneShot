import { randomUUID } from 'node:crypto';
import { one, many, run, transaction } from './store.js';
import { packs, digest, matches } from './questions.js';
import { practiceQuestions } from './practice.js';
export class GameError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export const REVEAL_MS = 8000;
export function schedule(now, hour = Number(process.env.SHOW_HOUR_UTC ?? 2), minute = Number(process.env.SHOW_MINUTE_UTC ?? 0)) {
  const date = new Date(now); date.setUTCHours(hour,minute,0,0);
  return { today: date.getTime(), next: date.getTime() > now ? date.getTime() : date.getTime() + 86400000 };
}
export function timeline(questions, start) { let offset = start; return questions.map(q => { const slot = { start: offset, end: offset + q.seconds * 1000 }; offset = slot.end + REVEAL_MS; return slot; }); }
export function scoreAnswer({ correct, difficulty, elapsed, duration, streak, confidence, wager, double }) {
  const base = difficulty * 300;
  const speed = Math.round(100 * Math.max(0, 1 - Math.floor(elapsed / 3000) * 3000 / duration));
  const amount = Math.round((base + speed + Math.min(streak,5)*40) * (wager ? confidence / 50 : 1) * (double ? 2 : 1));
  return correct ? amount : (wager || double ? -Math.round(base * (wager ? confidence/50 : 1) * (double ? 2 : 1)) : 0);
}
export class Engine {
 constructor(db, clock = Date.now) { this.db=db; this.clock=clock; }
 show(start = schedule(this.clock()).today) {
   const id = new Date(start).toISOString().slice(0,10);
   if (!one(this.db,'SELECT id FROM shows WHERE id=?',id)) { const questions = packs[Math.abs(Math.floor(start/86400000)) % packs.length]; run(this.db,'INSERT OR IGNORE INTO shows(id,starts,questions,digest) VALUES(?,?,?,?)',id,start,JSON.stringify(questions),digest(questions)); }
   const row = one(this.db,'SELECT * FROM shows WHERE id=?',id); return { ...row, questions: JSON.parse(row.questions) };
 }
 game(player, id) { const g=one(this.db,'SELECT * FROM games WHERE id=? AND player=?',id,player); if(!g) throw new GameError('Game not found.',404); return g; }
 join(player, mode) {
   const now=this.clock();let show=this.show();
   if(mode==='practice'){const id='practice-v1';run(this.db,'INSERT OR IGNORE INTO shows(id,starts,questions,digest) VALUES(?,?,?,?)',id,0,JSON.stringify(practiceQuestions),digest(practiceQuestions));show={id,starts:0,questions:practiceQuestions};}
   if(mode==='ranked'&&process.env.NODE_ENV==='production'&&!show.reviewed)throw new GameError('This show needs a private, reviewed question pack before ranked play can open.',503);
   const slots=timeline(show.questions,show.starts);
   if(mode==='ranked' && (now<show.starts || now>=slots[0].end)) throw new GameError('The entry window is the first question. Come back for the next show.');
   return transaction(this.db,()=>{
     const old=one(this.db,'SELECT * FROM games WHERE player=? AND show=? AND mode=? AND (?=\'ranked\' OR finished=0) ORDER BY started DESC LIMIT 1',player,show.id,mode,mode);
     if(old) return this.view(player,old.id);
     const id=randomUUID(); run(this.db,'INSERT INTO games(id,player,show,mode,started,question_started) VALUES(?,?,?,?,?,?)',id,player,show.id,mode,now,mode==='ranked'?show.starts:now);
     return this.view(player,id);
   });
 }
 position(g, show, now=this.clock()) {
   if(g.finished) return { index: g.cursor, finished: true };
   if(g.mode==='practice') return { index:g.cursor, start:g.question_started, end:g.question_started+show.questions[g.cursor].seconds*1000, reveal: false };
   const slots=timeline(show.questions,show.starts);
   const index=slots.findIndex(slot=>now<slot.end+REVEAL_MS);
   if(index<0) return { finished:true, index:11 };
   return { index, ...slots[index], reveal:now>=slots[index].end };
 }
 qualify(show) {
   const games=many(this.db,"SELECT id,score FROM games WHERE show=? AND mode='ranked' ORDER BY score DESC,id",show.id);
   const count=Math.max(1,Math.ceil(games.length*.1)); const cutoff=games[count-1]?.score ?? Infinity;
   for(const g of games) run(this.db,'UPDATE games SET finalist=? WHERE id=?',g.score>=cutoff?1:0,g.id);
 }
 settle(show) {
   if(show.id.startsWith('practice-'))return;
   const slots=timeline(show.questions,show.starts), now=this.clock();
   if(now>=slots[10].start && now<slots[10].end+REVEAL_MS) {
     // Finalists are frozen once, before any final answers are accepted.
     if(!one(this.db,"SELECT id FROM games WHERE show=? AND mode='ranked' AND cursor>=10 LIMIT 1",show.id)) { this.qualify(show); run(this.db,"UPDATE games SET cursor=10 WHERE show=? AND mode='ranked'",show.id); }
   }
   if(now>=slots[10].end+REVEAL_MS) { if(!one(this.db,"SELECT id FROM games WHERE show=? AND mode='ranked' AND cursor>=10 LIMIT 1",show.id)) this.qualify(show); run(this.db,"UPDATE games SET finished=1,cursor=11 WHERE show=? AND mode='ranked'",show.id); }
 }
 sync() { for(const row of many(this.db,"SELECT DISTINCT s.* FROM shows s JOIN games g ON g.show=s.id WHERE g.mode='ranked' AND g.finished=0 AND s.starts<=?",this.clock()))this.settle({...row,questions:JSON.parse(row.questions)}); }
 view(player,id) {
   let g=this.game(player,id); const show={...one(this.db,'SELECT * FROM shows WHERE id=?',g.show)}; show.questions=JSON.parse(show.questions); this.settle(show); g=this.game(player,id);
   const pos=this.position(g,show), q=show.questions[pos.index];
   const answer=one(this.db,'SELECT * FROM answers WHERE game=? AND question=?',id,pos.index);
   const allowed=pos.index<10 || g.finalist || g.mode==='practice';
   const canReveal=g.mode==='practice'?!!answer:pos.reveal;
   const last=one(this.db,'SELECT * FROM answers WHERE game=? ORDER BY question DESC LIMIT 1',id);
   const history=many(this.db,'SELECT question,correct,points,elapsed,confidence FROM answers WHERE game=? ORDER BY question',id).filter(a=>g.mode==='practice'||pos.finished||a.question<pos.index||canReveal);
   let question=null;
   if(q && allowed && !pos.finished) question={ index:pos.index, category:q.category, prompt:q.prompt, choices:q.choices, round:q.round, difficulty:q.difficulty, seconds:q.seconds, deadline:pos.end, start:pos.start, answered:!!answer, reveal:!!canReveal, ...(canReveal?{answer:q.answer,explanation:q.explanation,source:q.source, result:answer?{correct:!!answer.correct,points:answer.points}:null}:{}) };
   const visibleScore=this.visibleScore(g),eligible=many(this.db,'SELECT * FROM games WHERE show=? AND mode=?',g.show,g.mode);
   const rank=1+eligible.filter(x=>this.visibleScore(x)>visibleScore).length;
   return { id:g.id, mode:g.mode, score:visibleScore, streak:history.at(-1)?.correct?(()=>{let n=0;for(let i=history.length-1;i>=0;i--){if(!history[i].correct||(i<history.length-1&&history[i+1].question-history[i].question!==1))break;n++;}return n;})():0, lifelineUsed:!!g.lifeline, finished:!!pos.finished, finalist:!!g.finalist, waitingFinal:!allowed, rank, participants:eligible.length, question, history, lastResult:last && (g.mode==='practice'||last.question<pos.index||canReveal)?{correct:!!last.correct,points:last.points}:null, serverTime:this.clock(), digest:show.digest };
 }
 answer(player,{gameId,index,answer,confidence=50}) {
   return transaction(this.db,()=>{
     let g=this.game(player,gameId); const show=one(this.db,'SELECT * FROM shows WHERE id=?',g.show); show.questions=JSON.parse(show.questions); this.settle(show); g=this.game(player,gameId);
     // Repeated submissions return the committed result, never score twice.
     if(one(this.db,'SELECT question FROM answers WHERE game=? AND question=?',g.id,index)) return this.view(player,g.id);
     const now=this.clock(), pos=this.position(g,show,now), q=show.questions[index];
     if(pos.finished || index!==pos.index || now<pos.start || (index===10&&!g.finalist)) throw new GameError('This question is not open.');
     if(now>=pos.end && answer!=='') throw new GameError('Time is up.');
     const correct=now<pos.end && matches(q,answer);
     const previous=one(this.db,'SELECT correct FROM answers WHERE game=? AND question=?',g.id,index-1);
     const streak=previous?.correct?g.streak:0;
     const double=g.lifeline===100+index;
     const points=scoreAnswer({correct,difficulty:q.difficulty,elapsed:now-pos.start,duration:q.seconds*1000,streak,confidence,wager:index===6||index===7,double});
     run(this.db,'INSERT INTO answers VALUES(?,?,?,?,?,?,?,?,?)',g.id,index,answer,correct?1:0,points,now-pos.start,confidence,now,g.score);
     run(this.db,'UPDATE games SET score=MAX(0,score+?),streak=? WHERE id=?',points,correct?streak+1:0,g.id);
     return this.view(player,g.id);
   });
 }
 visibleScore(g) {
   if(g.mode!=='ranked'||g.finished)return g.score;
   const show=one(this.db,'SELECT starts,questions FROM shows WHERE id=?',g.show),questions=JSON.parse(show.questions),pos=this.position(g,{...show,questions});
   if(pos.finished||pos.reveal)return g.score;
   const pending=one(this.db,'SELECT score_before FROM answers WHERE game=? AND question=?',g.id,pos.index);
   return pending?pending.score_before:g.score;
 }
 next(player,id) {
   return transaction(this.db,()=>{ const g=this.game(player,id); if(g.mode!=='practice'||g.finished) return this.view(player,id);
     if(!one(this.db,'SELECT question FROM answers WHERE game=? AND question=?',id,g.cursor)) throw new GameError('Answer the question first.');
     run(this.db,'UPDATE games SET cursor=cursor+1,question_started=?,finished=? WHERE id=?',this.clock(),g.cursor===9?1:0,id); return this.view(player,id); });
 }
 lifeline(player,id,type) {
   return transaction(this.db,()=>{ const g=this.game(player,id); const row=one(this.db,'SELECT * FROM shows WHERE id=?',g.show), show={...row,questions:JSON.parse(row.questions)}, pos=this.position(g,show), q=show.questions[pos.index];
     if(g.finished||g.lifeline||!q||this.clock()>=pos.end||one(this.db,'SELECT question FROM answers WHERE game=? AND question=?',id,pos.index)) throw new GameError('Lifeline unavailable.');
     if(type==='fifty'&&!q.choices.length) throw new GameError('50/50 needs multiple choices.');
     run(this.db,'UPDATE games SET lifeline=? WHERE id=?',type==='double'?100+pos.index:1,id);
     return { game:this.view(player,id), hint:type==='hint'?q.hint:null, removed:type==='fifty'?q.choices.filter(c=>c!==q.answer).slice(0,2):[], double:type==='double' };
   });
 }
 leaderboard(period='daily',club=null,player=null,region=null) {
   this.sync(); const now=this.clock(); const since=period==='weekly'?now-7*86400000:period==='monthly'?now-30*86400000:period==='season'?seasonStart(now):0;
   const params=[]; let where="g.mode='ranked'";
   if(period==='daily') {where+=' AND g.show=?'; params.push(this.show().id);} else {where+=' AND g.started>=?';params.push(since);}
   if(club) {where+=' AND p.id IN (SELECT player FROM members WHERE club=?)';params.push(club);}
   if(region) {where+=' AND p.region=?';params.push(region);}
   if(period==='friends'&&player) {where+=' AND (p.id=? OR p.id IN (SELECT friend FROM friends WHERE player=?))';params.push(player,player);}
   const games=many(this.db,`SELECT g.*,p.name,p.region FROM games g JOIN players p ON p.id=g.player WHERE ${where}`,...params),map=new Map();
   for(const g of games){const row=map.get(g.player)||{id:g.player,name:g.name,region:g.region,score:0,games:0};row.score+=this.visibleScore(g);row.games++;map.set(g.player,row);}
   const rows=[...map.values()].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,100);
   return rows.map(r=>({...r,rank:1+rows.filter(x=>x.score>r.score).length}));
 }
 profile(player) {
   const p=one(this.db,'SELECT id,name,host,region FROM players WHERE id=?',player);
   const games=many(this.db,"SELECT * FROM games WHERE player=? AND mode='ranked' AND finished=1 ORDER BY started DESC",player);
   const stats=one(this.db,"SELECT COUNT(*) AS answered,COALESCE(SUM(a.correct),0) AS correct,COALESCE(AVG(a.elapsed),0) AS avgTime FROM answers a JOIN games g ON g.id=a.game WHERE g.player=? AND g.mode='ranked' AND g.finished=1",player);
   const categories={}; for(const g of games) { const qs=JSON.parse(one(this.db,'SELECT questions FROM shows WHERE id=?',g.show).questions); for(const a of many(this.db,'SELECT question,correct FROM answers WHERE game=?',g.id)) {const c=qs[a.question].category; categories[c]??={correct:0,total:0};categories[c].total++;categories[c].correct+=a.correct;} }
   const rating=1000+games.reduce((v,g)=>v+Math.round((g.score/10000-.5)*60),0), accuracy=stats.answered?Math.round(stats.correct/stats.answered*100):0;
   let streak=0; if(games.length){const today=Math.floor(this.clock()/86400000);let last=Math.floor(games[0].started/86400000);if(today-last<=1){streak=1;for(let i=1;i<games.length;i++){const d=Math.floor(games[i].started/86400000);if(last-d===1){streak++;last=d;}else break;}}}
   const badges=[{name:'First shot',icon:'target',earned:games.length>=1,detail:'Finish your first ranked show.'},{name:'On fire',icon:'flame',earned:streak>=7,detail:'Play seven days in a row.'},{name:'Sharp shooter',icon:'award',earned:stats.answered>=10&&accuracy>=80,detail:'Maintain 80% accuracy over 10 answers.'},{name:'Final boss',icon:'crown',earned:games.some(g=>g.finalist),detail:'Qualify for a Global Final.'}];
   return {...p,games:games.length,rating,accuracy,avgTime:Math.round(stats.avgTime/100)/10,streak,categories,badges,tier:rating>=1800?'Diamond':rating>=1500?'Platinum':rating>=1300?'Gold':rating>=1100?'Silver':'Bronze',season:{number:Math.floor((this.clock()-Date.UTC(2026,0,5))/(56*86400000))+1,ends:seasonStart(this.clock())+56*86400000}};
 }
 dashboard(player) {
   this.sync();const current=this.show(),currentEnds=timeline(current.questions,current.starts).at(-1).end+REVEAL_MS;
   const show=this.clock()>=currentEnds?this.show(schedule(this.clock()).next):current;
   return {profile:this.profile(player),schedule:{starts:show.starts,next:schedule(this.clock()).next,ends:timeline(show.questions,show.starts).at(-1).end+REVEAL_MS,ready:process.env.NODE_ENV!=='production'||!!show.reviewed,theme:'Mixed knowledge',categories:[...new Set(show.questions.slice(0,10).map(q=>q.category))],joined:one(this.db,"SELECT id FROM games WHERE player=? AND show=? AND mode='ranked'",player,current.id)?.id??null,players:one(this.db,"SELECT COUNT(*) AS n FROM games WHERE show=? AND mode='ranked'",show.id).n},leaderboard:this.leaderboard(),clubs:many(this.db,'SELECT c.id,c.name,c.invite,(SELECT COUNT(*) FROM members WHERE club=c.id) AS members FROM clubs c JOIN members m ON m.club=c.id WHERE m.player=?',player),rival:this.rival(player),serverTime:this.clock()};
 }
 rival(player) { const rows=this.leaderboard('season'), p=rows.find(r=>r.id===player); if(!p)return null; return rows.filter(r=>r.id!==player).sort((a,b)=>Math.abs(a.score-p.score)-Math.abs(b.score-p.score))[0]??null; }
}
export function seasonStart(now) { const epoch=Date.UTC(2026,0,5),length=56*86400000;return epoch+Math.floor((now-epoch)/length)*length; }
