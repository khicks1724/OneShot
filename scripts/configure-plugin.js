import {writeFileSync} from 'node:fs';
const url=new URL(process.argv[2]);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Provide a public HTTPS origin.');
writeFileSync('mcp.json',JSON.stringify({$schema:'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',mcpServers:{'one-shot':{type:'streamable-http',url:`${url.origin}/mcp`}}},null,2)+'\n');
console.log('Plugin endpoint configured. Set PUBLIC_URL to the same origin.');
