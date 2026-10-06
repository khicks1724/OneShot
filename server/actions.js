import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { one,many,run,transaction } from './store.js';
import { GameError } from './engine.js';
import { randomToken } from './auth.js';
const id=z.string().min(1).max(100);
export const schemas={
 dashboard:z.object({}),join:z.object({mode:z.enum(['practice','ranked'])}),game:z.object({gameId:id}),answer:z.object({gameId:id,index:z.number().int().min(0).max(10),answer:z.string().max(200),confidence:z.union([z.literal(25),z.literal(50),z.literal(75),z.literal(100)]).default(50)}),next:z.object({gameId:id}),lifeline:z.object({gameId:id,type:z.enum(['hint','fifty','double'])}),
 leaderboard:z.object({period:z.enum(['daily','weekly','monthly','season','all','friends']).default('daily'),club:id.optional(),region:z.string().max(60).optional()}),profile:z.object({name:z.string().trim().min(2).max(24),host:z.enum(['professor','hype','villain','oracle']),region:z.string().trim().min(2).max(60)}),create_club:z.object({name:z.string().trim().min(3).max(50)}),join_club:z.object({code:id}),invite:z.object({}),accept_friend:z.object({code:id}),coach:z.object({gameId:id.optional()}),commentary:z.object({gameId:id})
};
export async function action(ctx,auth,name,input) {
 const schema=schemas[name];if(!schema)throw new GameError('Unknown action.',404);const args=schema.parse(input);if(!auth)throw new GameError('Sign in to continue.',401);
 const {db,engine,ai,base}=ctx,p=auth.player;
 switch(name){
  case 'dashboard':return {dashboard:engine.dashboard(p),accountLinked:!!auth.email,aiEnabled:!!ai.client,publicUrl:base};
  case 'join':if(args.mode==='ranked'&&!auth.email)throw new GameError('Create or link an account to enter ranked shows.',403);return {game:engine.join(p,args.mode)};
  case 'game':return {game:engine.view(p,args.gameId)};
  case 'answer':return {game:engine.answer(p,args)};
  case 'next':return {game:engine.next(p,args.gameId)};
  case 'lifeline':return engine.lifeline(p,args.gameId,args.type);
  case 'leaderboard':if(args.club&&!one(db,'SELECT player FROM members WHERE club=? AND player=?',args.club,p))throw new GameError('Join the club to view its leaderboard.',403);return {leaderboard:engine.leaderboard(args.period,args.club,p,args.region)};
  case 'profile':run(db,'UPDATE players SET name=?,host=?,region=? WHERE id=?',args.name,args.host,args.region,p);return {dashboard:engine.dashboard(p)};
  case 'create_club':{ if(!auth.email)throw new GameError('Create an account first.',403);if(one(db,'SELECT COUNT(*) AS n FROM clubs WHERE owner=?',p).n>=10)throw new GameError('You can own up to 10 clubs.');const club=randomUUID(),invite=randomToken().slice(0,16);transaction(db,()=>{run(db,'INSERT INTO clubs VALUES(?,?,?,?)',club,args.name,invite,p);run(db,'INSERT INTO members VALUES(?,?)',club,p);});return {dashboard:engine.dashboard(p),inviteUrl:`${base}/?club=${invite}`};}
  case 'join_club':{if(!auth.email)throw new GameError('Create an account first.',403);const club=one(db,'SELECT id FROM clubs WHERE invite=?',args.code);if(!club)throw new GameError('Invite not found.',404);run(db,'INSERT OR IGNORE INTO members VALUES(?,?)',club.id,p);return {dashboard:engine.dashboard(p)};}
  case 'invite':{if(!auth.email)throw new GameError('Create an account first.',403);let invite=one(db,'SELECT code FROM invites WHERE player=?',p);if(!invite){invite={code:randomToken().slice(0,16)};run(db,'INSERT INTO invites VALUES(?,?)',invite.code,p);}return {inviteUrl:`${base}/?friend=${invite.code}`};}
  case 'accept_friend':{if(!auth.email)throw new GameError('Create an account first.',403);const invite=one(db,'SELECT player FROM invites WHERE code=?',args.code);if(!invite||invite.player===p)throw new GameError('Invalid friend invite.');transaction(db,()=>{run(db,'INSERT OR IGNORE INTO friends VALUES(?,?)',p,invite.player);run(db,'INSERT OR IGNORE INTO friends VALUES(?,?)',invite.player,p);});return {dashboard:engine.dashboard(p)};}
  case 'coach':{const game=args.gameId?engine.view(p,args.gameId):null;if(game&&!game.finished)throw new GameError('Finish your game before requesting coaching.');return {coaching:await ai.coach(engine.profile(p),game,engine.profile(p).host)};}
  case 'commentary':{const game=engine.view(p,args.gameId);if(!game.lastResult)throw new GameError('Wait for the reveal.');return {commentary:await ai.commentary(game.lastResult,engine.profile(p).host)};}
 }
}
