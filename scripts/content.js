import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const [command,...args]=process.argv.slice(2),base=process.env.PUBLIC_URL||'http://localhost:8787';
if(!process.env.ADMIN_TOKEN)throw new Error('Set ADMIN_TOKEN before using the editorial CLI.');
async function request(path,body,method='POST'){const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${process.env.ADMIN_TOKEN}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok)throw new Error(data.error);return data;}
function saveDraft(data){mkdirSync('data/drafts',{recursive:true});const path=`data/drafts/${data.id}.json`;writeFileSync(path,JSON.stringify(data,null,2));console.log(JSON.stringify({id:data.id,path,status:'Saved privately. Verify sources, ambiguity, hints and aliases before publishing.'}));}
switch(command){
 case 'generate':saveDraft(await request('/api/admin/draft',{theme:args.join(' ')}));break;
 case 'import':saveDraft(await request('/api/admin/import',JSON.parse(readFileSync(args[0],'utf8'))));break;
 case 'export':saveDraft(await request(`/api/admin/drafts/${encodeURIComponent(args[0])}`,null,'GET'));break;
 case 'update':{const data=JSON.parse(readFileSync(args[1],'utf8'));saveDraft(await request(`/api/admin/drafts/${encodeURIComponent(args[0])}`,{questions:data.questions},'PUT'));break;}
 case 'publish':{if(args[2]!=='--reviewed')throw new Error('Complete review, then add --reviewed.');const start=Date.parse(args[1]);if(!Number.isFinite(start))throw new Error('Use an ISO 8601 start time with timezone.');console.log(JSON.stringify(await request('/api/admin/publish',{draftId:args[0],start,reviewed:true})));break;}
 default:console.log('Commands: generate <theme> | import <file> | export <id> | update <id> <file> | publish <id> <ISO-start> --reviewed');
}
