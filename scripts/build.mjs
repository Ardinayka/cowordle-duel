import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
const files=(await fs.readdir('public')).filter(file=>/\.(html|css|js|json|svg|txt|xml|webp|png|webmanifest)$/.test(file)).sort();
const contents=new Map(await Promise.all(files.map(async file=>[file,await fs.readFile('public/'+file)])));
const version=createHash('sha256');for(const [file,body] of contents)version.update(file).update(body);
const release=version.digest('hex').slice(0,16),assets={};
for(const [file,bytes] of contents){
 const ext=file.split('.').at(-1),binary=ext==='webp'||ext==='png';
 let body=binary?bytes.toString('base64'):bytes.toString('utf8');
 if(['html','css','js'].includes(ext))body=body.replace(/(["'(])((?:\.\/|\/)?[a-z0-9-]+\.(?:css|js|svg|webp))(?=["')])/gi,(_,quote,url)=>quote+url+'?v='+release);
 const type={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',txt:'text/plain; charset=utf-8',xml:'application/xml; charset=utf-8',svg:'image/svg+xml',json:'application/json',webp:'image/webp',png:'image/png',webmanifest:'application/manifest+json'}[ext];
 assets['/'+file]={body,type,binary,version:release,etag:'"'+createHash('sha256').update(body).digest('hex').slice(0,24)+'"'};
}
await fs.writeFile('server/assets.js','export default '+JSON.stringify(assets)+';');
await fs.rm('dist',{recursive:true,force:true});
await fs.mkdir('dist/server',{recursive:true});await build({entryPoints:['server/worker.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/server/index.js',minify:true});
console.log('Worker and embedded client assets built.');
