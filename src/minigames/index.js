// The mini-game frame: a full-screen arcade screen with a title card, the game itself and a
// results card. The 3D city pauses underneath while you play.
// A game is { title, how: [lines], create(api) -> { update(dt), draw(g) } }; it calls
// api.finish({ score, gold, renown, summary }) when it's over.
import { W, H, drawCard } from './common.js';
import { marketRun } from './marketrun.js';
import { cargoHold } from './cargohold.js';
import { gullPatrol } from './gullpatrol.js';
import { glassKiln } from './glasskiln.js';
import { alleyChase } from './alleychase.js';
import { wardKeeper } from './wardkeeper.js';
import { bones } from './bones.js';
import { twentyOne } from './twentyone.js';
import { customs } from './customs.js';
import { standoff } from './standoff.js';

const GAMES = { 'Market Run': marketRun, 'Cargo Hold': cargoHold, 'Gull Patrol': gullPatrol, 'Glass Kiln': glassKiln,
  'Alley Chase': alleyChase, 'Ward Keeper': wardKeeper, 'Bones': bones, 'Twenty-One': twentyOne,
  'The Customs House': customs, 'Standoff': standoff };
export const arcade = { active: false };

export function play(name, opts = {}) {
  const game = GAMES[name];
  if (!game) return Promise.resolve(null);
  return new Promise((resolve) => {
    arcade.active = true;
    if (document.pointerLockElement) document.exitPointerLock();
    const wrap = document.getElementById('arcade');
    wrap.replaceChildren();
    wrap.classList.remove('hidden');
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    wrap.append(canvas);
    const g = canvas.getContext('2d');
    const keys = new Set(), pressed = new Set();
    const down = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!keys.has(e.code)) pressed.add(e.code);
      keys.add(e.code);
    };
    const up = (e) => keys.delete(e.code);
    addEventListener('keydown', down, true);
    addEventListener('keyup', up, true);
    const mouse = { x: 0, y: 0, clicked: false };
    canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height; });
    canvas.addEventListener('mousedown', (e) => { const r = canvas.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height; mouse.clicked = true; });

    let phase = 'title', inst = null, result = null, last = performance.now();
    const api = {
      W, H, keys, pressed, mouse, opts,
      // opts.pay (npcs.js runGame) works out the real pay (caps, half pay, Casey's luck) BEFORE the card shows it,
      // so the gold on the card is the gold you get (2026-11-04, the user: bounties said far more than they paid).
      finish(res) { result = opts.pay ? opts.pay(res) : res; phase = 'results'; },
    };
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (phase === 'title') {
        drawCard(g, game.title, game.how, 'Space to start  ·  Esc to leave');
        if (pressed.has('Space') || pressed.has('Enter')) { inst = game.create(api); phase = 'play'; }
        if (pressed.has('Escape')) return end(null);
      } else if (phase === 'play') {
        inst.update(dt);
        inst.draw(g);
        if (phase === 'play' && !game.ownEscape && pressed.has('Escape')) { result = { score: 0, gold: 0, renown: 0, summary: 'You gave up.' }; phase = 'results'; }
      } else if (phase === 'results') {
        const lines = [result.summary || ''];
        if (result.score != null) lines.push(`Score: ${result.score}`);
        lines.push(`+${result.gold || 0} gold   ·   +${result.renown || 0} renown`);
        drawCard(g, 'Done', lines, 'Space to go back to the city');
        if (pressed.has('Space') || pressed.has('Enter') || pressed.has('Escape')) return end(result);
      }
      pressed.clear();
      mouse.clicked = false;
      requestAnimationFrame(frame);
    }
    function end(res) {
      removeEventListener('keydown', down, true);
      removeEventListener('keyup', up, true);
      wrap.classList.add('hidden');
      wrap.replaceChildren();
      arcade.active = false;
      document.getElementById('resume').classList.remove('hidden');
      resolve(res);
    }
    requestAnimationFrame(frame);
  });
}


export { W, H, COLORS, drawCard, wrapText, person, hud } from './common.js';
