// Standalone silent delivery for every shape exposed by a clip, with a local accessible player.
import {readFile, writeFile, stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const args = process.argv.slice(2), dir = path.resolve(args[0] || 'film');
const poster = args.includes('--poster') ? Number(args[args.indexOf('--poster') + 1]) : 3.5;
if (!Number.isFinite(poster) || poster < 0) throw Error('Invalid poster time');
const scripts = path.dirname(fileURLToPath(import.meta.url)), out = path.join(dir, 'out');
// A failed native-size check is a hold, even when canvas-copy stress passes.
// Check separately: render.mjs preserves review evidence and continues rendering
// after a failed selfCheck, so combining --check and --video is not an export gate.
execFileSync(process.execPath, [path.join(scripts, 'render.mjs'), dir, '--all', '--check', '--times', '0', '--out', path.join(out, 'preflight')], {stdio: 'inherit', timeout: 180000});
execFileSync(process.execPath, [path.join(scripts, 'render.mjs'), dir, '--all', '--video', '--poster', String(poster), '--out', out], {stdio: 'inherit', timeout: 2700000});
const config = JSON.parse((await readFile(path.join(dir, 'config.js'), 'utf8')).replace(/^window\.CLIP\s*=\s*/, '').replace(/;\s*$/, ''));
const held = config.heldShapes || {};
const shapes = [['4x3',1200,900],['1x1',1080,1080],['4x5',1080,1350]].filter(([name]) => !held[name.replace('x', ':')]);
const manifest = [];
for (const [name,w,h] of shapes) {
  execFileSync('ffmpeg', ['-y','-v','error','-i',path.join(out,name+'.mp4'),'-an','-c:v','libvpx-vp9','-crf','32','-b:v','0','-row-mt','1','-pix_fmt','yuv420p',path.join(out,name+'.webm')], {stdio:'inherit',timeout:300000});
  const streams = JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path.join(out,name+'.mp4')],{encoding:'utf8',timeout:30000}));
  if (streams.streams.some(s=>s.codec_type==='audio')) throw Error(`${name}: default clip must be silent`);
  const video=streams.streams.find(s=>s.codec_type==='video');
  if(video.width!==w || video.height!==h) throw Error(`${name}: incorrect dimensions`);
  manifest.push({shape:name,width:w,height:h,posterTime:poster,duration:Number(streams.format.duration),mp4Bytes:(await stat(path.join(out,name+'.mp4'))).size,webmBytes:(await stat(path.join(out,name+'.webm'))).size});
}
const escape = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=escape(config.title), context=escape(config.description || 'A sample demo of this change. The replay is labelled Demo reset.');
const heldNotice = Object.keys(held).length ? '<aside><h2>Partial delivery</h2>' + Object.entries(held).map(([shape,reason])=>`<p><b>${escape(shape)} held:</b> ${escape(reason)}</p>`).join('') + '</aside>' : '';
await writeFile(path.join(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px system-ui;margin:24px auto;padding:0 16px;max-width:1200px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:24px}figure{margin:0}video{width:100%;height:auto}button{font:inherit;padding:8px 16px}</style><h1>${title}</h1><p>${context}</p>${heldNotice}<main>${shapes.map(([name,w,h])=>`<figure><video width="${w}" height="${h}" controls muted playsinline preload="none" poster="${name}-poster.png" aria-label="${title}"><source src="${name}.webm" type="video/webm"><source src="${name}.mp4" type="video/mp4"></video><figcaption>${name}: <a href="${name}.mp4">MP4</a> · <a href="${name}.webm">WebM</a> · <a href="${name}-poster.png">Result poster</a></figcaption></figure>`).join('')}</main><script>const reduced=matchMedia('(prefers-reduced-motion:reduce)');function set(){document.querySelectorAll('video').forEach(v=>{v.loop=!reduced.matches;if(reduced.matches){v.pause();v.currentTime=0;v.load();}})}set();reduced.addEventListener('change',set);const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting)e.target.pause()}));document.querySelectorAll('video').forEach(v=>observer.observe(v));document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video').forEach(v=>v.pause())});</script></html>`);
await writeFile(path.join(out,'delivery.json'),JSON.stringify({id:config.id,title:config.title,replay:'labelled demo reset',silent:true,status:Object.keys(held).length?'partial':'complete',shapes:manifest,held},null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
