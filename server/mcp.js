import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAppResource,registerAppTool,RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { readFileSync } from 'node:fs';
import { schemas,action } from './actions.js';
import { identity } from './auth.js';
const descriptions={dashboard:'Open One Shot: daily trivia lobby, player profile, schedule, standings, and clubs.',join:'Enter the daily ranked show or start an unranked practice game. Ranked admission is once per day during the first question.',game:'Refresh your active game. Returns only the currently revealed question, server timing, and public scores.',answer:'Lock in one answer for the current question. Wager confidence is 25, 50, 75, or 100 percent. Scores are server authoritative.',next:'Advance a practice game after its answer reveal.',lifeline:'Use your one lifeline per game: hint, fifty (remove two wrong choices), or double (double reward and penalty).',leaderboard:'View daily, weekly, monthly, season, all-time, friends, or your club standings.',profile:'Update your public display name, region, and AI host preference.',create_club:'Create a private trivia club and return its invitation link.',join_club:'Join a trivia club using its invitation code.',invite:'Create a reusable friend invitation link. This does not send any message.',accept_friend:'Accept an invitation to a reciprocal friend relationship.',coach:'Get AI post-game coaching based on completed-game statistics.',commentary:'Get a brief AI host reaction after a revealed result.'};
export function installMcp(app,ctx) {
 app.all('/mcp',async(req,res)=>{
   const auth=identity(ctx.db,req);
   if(!auth||auth.kind!=='access'||auth.scope!=='play'){res.set('WWW-Authenticate',`Bearer resource_metadata="${ctx.base}/.well-known/oauth-protected-resource"`);return res.status(401).json({error:'Account linking required.'});}
   const server=new McpServer({name:'one-shot',version:'1.0.0'}),uri='ui://one-shot/game.html';
   registerAppResource(server,'one-shot-ui',uri,{},async()=>({contents:[{uri,mimeType:RESOURCE_MIME_TYPE,text:readFileSync('dist/widget.html','utf8'),_meta:{ui:{prefersBorder:true,csp:{connectDomains:[],resourceDomains:[]}}}}]}));
   for(const [name,schema] of Object.entries(schemas)) {
     const readOnly=['dashboard','game','leaderboard','coach','commentary'].includes(name);
     registerAppTool(server,`one_shot_${name}`,{title:descriptions[name].split('.')[0],description:descriptions[name],inputSchema:schema.shape,annotations:{readOnlyHint:readOnly,destructiveHint:false,idempotentHint:!['create_club','next','lifeline'].includes(name),openWorldHint:['coach','commentary'].includes(name)},securitySchemes:[{type:'oauth2',scopes:['play']}],_meta:{securitySchemes:[{type:'oauth2',scopes:['play']}],...(name==='dashboard'?{ui:{resourceUri:uri}}:{})}},async(args)=>{try{const result=await action(ctx,auth,name,args);return {structuredContent:result,content:[{type:'text',text:JSON.stringify(result)}]};}catch(e){return {isError:true,content:[{type:'text',text:e.status||e.name==='ZodError'?e.message:'Could not complete this action.'}]};}});
   }
   const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
   res.on('close',()=>{void transport.close();void server.close();});
   try{await server.connect(transport);await transport.handleRequest(req,res,req.body);}catch{if(!res.headersSent)res.status(500).json({error:'MCP request failed.'});}
 });
}
