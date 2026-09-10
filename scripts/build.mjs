import fs from 'node:fs/promises';
import {build} from 'esbuild';
const assets={};for(const file of await fs.readdir('public')){if(!/\.(html|css|js|json)$/.test(file))continue;assets['/'+file]={body:await fs.readFile('public/'+file,'utf8'),type:file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'application/json'};}
await fs.writeFile('server/assets.js','export default '+JSON.stringify(assets)+';');
await fs.rm('dist',{recursive:true,force:true});
await fs.mkdir('dist/server',{recursive:true});await build({entryPoints:['server/worker.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/server/index.js',minify:true});
await fs.mkdir('dist/.openai',{recursive:true});await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');console.log('Worker and embedded client assets built.');
