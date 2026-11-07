// Build local native-state bindings from screens.mjs evidence. No product UI is drawn here.
import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const [dirArg, optionsArg] = process.argv.slice(2);
if (!dirArg || !optionsArg) throw Error('usage: build-clip.mjs <film> <clip.json>');
const dir = path.resolve(dirArg), options = JSON.parse(await readFile(optionsArg, 'utf8'));
const m = JSON.parse(await readFile(path.join(dir, 'captures/screens.json'), 'utf8'));
for (const id of ['before', 'hover', 'pressed', 'changed', 'result']) {
  if (!m.captures[id]) throw Error(`Missing whole-surface capture: ${id}`);
}
if (!m.rects.before?.target || !m.rects.result?.target) throw Error('Record target rects before and after the action');
if (!options.id || !options.title || !options.paper || !options.groundSource || !options.font) {
  throw Error('clip.json needs id, title, paper, groundSource and font');
}
if (!(options.primaryTextPx > 0)) throw Error('Measure the decisive native CSS text size as primaryTextPx');
const targetFraction = options.targetFraction ?? [.5, .5];
if (!Array.isArray(targetFraction) || targetFraction.length !== 2 ||
    !targetFraction.every(n => Number.isFinite(n) && n >= 0 && n <= 1)) {
  throw Error('targetFraction must be two finite fractions from 0 to 1 inside the native target');
}
const b = m.captures.before.rect, r = m.captures.result.rect, target = m.rects.before.target;
const animation = m.animations.change || {fps: 30, frames: 0, duration: 0, found: []};
const sequence = animation.found.length ? Object.keys(m.captures).filter(id => /^change-\d+$/.test(id)).sort() : [];
if (animation.found.length && sequence.length !== animation.frames) throw Error('Incomplete native animation frames');
const captures = Object.fromEntries(['before', 'hover', 'pressed', 'changed', 'result', ...sequence].map(id => [id, m.captures[id]]));
// Every state is positioned in one fixed native capture coordinate system.
for (const [id, c] of Object.entries(captures)) {
  if (Math.abs(c.rect[0] - b[0]) > 2 || Math.abs(c.rect[1] - b[1]) > 2) {
    throw Error(`${id}: capture origin moved; frame a fixed whole-native region before recapturing`);
  }
}
function sample(c) {
  const x = Math.max(0, Math.floor(c.rect[2] * c.scale / 2));
  const y = Math.min(20, Math.floor(c.rect[3] * c.scale) - 1);
  const p = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(dir, 'captures', c.file), '-vf', `crop=1:1:${x}:${y}`, '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1'], {timeout: 30000});
  if (p.length !== 3) throw Error('Native colour sample is not one RGB pixel');
  return '#' + [...p].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
const config = {
  ...options, kind: options.kind || 'panel',
  colorProvenance: `${options.groundSource}; native state grounds sampled from each capture at center x, y=20`,
  box: [b[0], b[1], Math.max(...Object.values(captures).map(c => c.rect[2])), Math.max(...Object.values(captures).map(c => c.rect[3]))],
  // Match the real capture click; a label's centre can cover the word being demonstrated.
  target: [target[0] + target[2]*targetFraction[0] - b[0], target[1] + target[3]*targetFraction[1] - b[1]],
  targetRight: m.rects.result.target[0] + m.rects.result.target[2] - b[0],
  captures, grounds: Object.fromEntries(Object.entries(captures).map(([id,c]) => [id,sample(c)])),
  animations: animation, sequence,
};
await writeFile(path.join(dir, 'config.js'), 'window.CLIP = ' + JSON.stringify(config, null, 2) + ';\n');
// Ask the actual painter for its shape checks rather than duplicating its geometry.
const scripts = path.dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath, [path.join(scripts, 'render.mjs'), dir, '--all', '--check', '--times', '0', '--out', path.join(dir, 'out', 'preflight')], {stdio: 'inherit', timeout: 180000});
console.log(`Built ${options.id}: ${Object.keys(captures).length} native states; ${sequence.length} animated frames`);
