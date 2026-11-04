// Knife throwing with Rhea at a painted board on her wall (Sultan's Rest, pin 13). Eight knives. Your aim
// drifts; hold Shift to steady it (but only while your breath lasts); click or Space to throw. From the fifth
// knife the board swings on its rope. Numbers are DRAFT (Claude's).
import { W, H, COLORS, hud } from './common.js';

const KNIVES = 8, RINGS = [[22, 10], [48, 8], [76, 6], [104, 4], [130, 2]];
export const knives = {
  title: 'Knife Throwing',
  how: [
    'Rhea\'s board hangs on her wall: hit the middle for 10, the outer ring for 2.',
    'Your aim drifts by itself. Hold Shift to steady your hand while your breath lasts. Click or Space to throw.',
    'Eight knives. From the fifth, the board swings on its rope.',
  ],
  create(api) {
    let n = 0, total = 0, over = false, t = 0, breath = 1, flying = null, stuck = [], last = '', wait = 0;
    const board = () => ({ x: W / 2 + (n >= 4 ? Math.sin(t * 1.3) * 120 : 0), y: 330 });
    function update(dt) {
      if (over) return;
      t += dt;
      const steady = api.keys.has('ShiftLeft') || api.keys.has('ShiftRight');
      if (steady && breath > 0) breath = Math.max(0, breath - dt * 0.45); else breath = Math.min(1, breath + dt * 0.25);
      if (wait > 0) { wait -= dt; return; }
      if (flying) {
        flying.k += dt / 0.28;
        if (flying.k >= 1) {
          const b = board(), dx = flying.x - b.x, dy = flying.y - b.y, d = Math.hypot(dx, dy);
          const pts = RINGS.find(([r]) => d <= r)?.[1] || 0;
          total += pts; last = pts ? `+${pts}` : 'Miss!';
          if (pts) stuck.push({ dx, dy }); else stuck.push({ miss: true, x: flying.x, y: flying.y });
          flying = null; n++; wait = 0.5;
          if (n === KNIVES) {
            over = true;
            api.finish({ score: total, gold: Math.round(total / 2.2), renown: 3 + Math.floor(total / 10),
              summary: total >= 60 ? `${total} points. Rhea whistles. "You could do this for a living. Don\'t. I need the work."`
                : total >= 35 ? `${total} points. "Not bad. Your wrist\'s too stiff."` : `${total} points. Rhea collects her knives from the wall around the board, sighing.` });
          }
        }
        return;
      }
      if (api.pressed.has('Space') || api.mouse.clicked) {
        const a = aim();
        flying = { x: a.x + (Math.random() - 0.5) * 10, y: a.y + (Math.random() - 0.5) * 10, k: 0 };
      }
    }
    // The aim: a slow figure-of-eight around the board, smaller while you hold your breath.
    function aim() {
      const steady = (api.keys.has('ShiftLeft') || api.keys.has('ShiftRight')) && breath > 0;
      const amp = (steady ? 28 : 95) * (1 + n * 0.05);
      return { x: W / 2 + Math.sin(t * 1.7) * amp, y: 330 + Math.sin(t * 2.3 + 1) * amp * 0.8 };
    }
    function draw(g) {
      g.fillStyle = '#d9c095'; g.fillRect(0, 0, W, H);                                     // her wall
      g.fillStyle = '#c9b089'; for (let y = 0; y < H; y += 40) g.fillRect(0, y, W, 2);
      const b = board();
      if (n >= 4) { g.strokeStyle = '#6b4a2c'; g.lineWidth = 4; g.beginPath(); g.moveTo(W / 2, 40); g.lineTo(b.x, b.y - 140); g.stroke(); }
      const ringCol = ['#b8382b', '#f3ede0', '#2e6c8e', '#f3ede0', '#5a3f26'];
      for (let i = RINGS.length - 1; i >= 0; i--) { g.fillStyle = ringCol[i]; g.beginPath(); g.arc(b.x, b.y, RINGS[i][0], 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = '#3a2716'; g.lineWidth = 6; g.beginPath(); g.arc(b.x, b.y, 132, 0, Math.PI * 2); g.stroke();
      for (const s of stuck) knife(g, s.miss ? s.x : b.x + s.dx, s.miss ? s.y : b.y + s.dy, s.miss);
      if (flying) { const k = flying.k, x = W / 2 + (flying.x - W / 2) * k, y = H + 40 + (flying.y - H - 40) * k; knife(g, x, y, false, 1 + (1 - k) * 2, k * 18); }
      if (!flying && !over && wait <= 0) {
        const a = aim();
        g.strokeStyle = 'rgba(30,20,10,0.85)'; g.lineWidth = 2;
        g.beginPath(); g.arc(a.x, a.y, 14, 0, Math.PI * 2); g.moveTo(a.x - 22, a.y); g.lineTo(a.x + 22, a.y); g.moveTo(a.x, a.y - 22); g.lineTo(a.x, a.y + 22); g.stroke();
      }
      g.lineWidth = 1;
      // Breath.
      g.fillStyle = '#000a'; g.fillRect(40, H - 60, 220, 18); g.fillStyle = breath > 0.25 ? '#9ad0ff' : COLORS.red; g.fillRect(42, H - 58, 216 * breath, 14);
      g.fillStyle = COLORS.ink; g.font = '16px Cinzel, Georgia, serif'; g.textAlign = 'left'; g.fillText('Breath (hold Shift)', 40, H - 70);
      hud(g, [`Knife ${Math.min(n + 1, KNIVES)} of ${KNIVES}`, `Score ${total}`, last]);
    }
    return { update, draw };
  },
};
function knife(g, x, y, miss, scale = 1, spin = 0) {
  g.save(); g.translate(x, y); g.rotate(spin); g.scale(scale, scale);
  g.fillStyle = miss ? 'rgba(90,70,50,0.6)' : '#6b4a2c'; g.fillRect(-4, 4, 8, 22);        // handle sticking out
  g.fillStyle = '#c9ced6'; g.beginPath(); g.moveTo(-3, 4); g.lineTo(0, -6); g.lineTo(3, 4); g.fill();
  g.restore();
}
