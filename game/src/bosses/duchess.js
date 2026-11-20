// [builder A] Duchess, leopard gecko (Bedroom, bed-lair): AVOID. Design: "The ten gecko
// encounters" 1 and house.js LAIRS.duchess.
// She stalks the sand of her old tank. When you're in front of her on the floor her tail tip
// wiggles (the tell) and she lunges at where you stood. Stand behind a sand berm (or on it) so she
// lunges into it: her snout sticks for 3 s and her body is a platform. Run up her back to the rock
// and kick a pull tab on Stripe's feeding cup.
//   Phase 1 (teach): one tell, one lunge. Kick tab 1 (left side of the cup).
//   Phase 2 (twist): she feints: a tell, a pause, a second tell, then the lunge. Tab 2 (right side).
//   Phase 3 (climax): two lunges in a row (the second tell 0.6 s after the first lunge; a first lunge
//   into a berm glances off, [fixer]). Tab 3
//   (the front); the cup tips and Stripe hops out (rescue).
// Only her snout hurts (1 heart); her body and tail are harmless. Hidden in the hide log, she
// can't see you. Losing restarts the phase (base.js). Room: data/rooms/zone-01.js bed-lair.
import { TILE as T, DT, FPS } from '../../data/movement.js';
import { makeBoss } from './base.js';
import * as S from '../sprites.js';
import { FEEDER } from './tank.js';
import { constant } from '../world.js'; // [issue 11] frozen module constants: a rewind shares them

const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const LEN = 360;                       // nose to tail, px
const BODY = LEN * 0.62;               // nose to the tail's root
const FLOOR = 16 * T, ROCK = { x0: 28 * T, x1: 36 * T, top: 12 * T };
const BERM_L = 22 * T, BERM_R = 42 * T; // the berms' inner faces (where a snout sticks)
const TABS = constant([{ x: 30.5 * T }, { x: 33.5 * T }, { x: 32 * T }]);
const CUP_X = 32 * T;
const STUCK = 3 * FPS, LUNGE = 12 * T;  // 3 s; 12 tiles/s
const SPEED = constant([0, 3.0, 3.4, 3.8]);       // stalk speed per phase, tiles/s

function nose(b) { return b.x + b.facing * BODY / 2; }
function floorAt(x) { return x > ROCK.x0 - 20 && x < ROCK.x1 + 20 ? ROCK.top : FLOOR; }
function setPlat(b, g, on) {
  const row = 14;
  if (b.plat) { for (let c = b.plat[0]; c <= b.plat[1]; c++) if (g.grid.at(c, row) === 3) g.grid.set(c, row, 0); b.plat = null; g.gridVersion++; }
  if (!on) return;
  const a = Math.round((b.x - BODY / 2) / T), z = Math.round((b.x + BODY / 2) / T) - 1;
  const lo = Math.max(1, b.facing < 0 ? a : Math.max(a, 36)), hi = Math.min(62, b.facing < 0 ? Math.min(z, 27) : z);
  for (let c = lo; c <= hi; c++) if (g.grid.at(c, row) === 0) g.grid.set(c, row, 3);
  b.plat = [lo, hi]; g.gridVersion++;
}

export default makeBoss('duchess', { postLines: true, // [playtest] base.rescue() emits geckos.<name>.post
  sfx: ['gecko-chomp', 'gecko-growl', 'unlock'], // [issue 14] the recorded effects the fight plays (src/zone-sfx.js loads them with the zone)
  art: () => ({ props: ['feeder-cup', 'feeder-cup-tipped', 'cup-tab', 'cup-tab-pulled'], crickets: { stripe: ['idle', 'leap'] } }), // [art] what the fight draws (room-art.js loads it before the lair shows)
 
  phases: 3, len: LEN,
  start(b, g) {
    setPlat(b, g, false);
    b.pulled = b.pulled || [false, false, false];
    for (let i = 0; i < 3; i++) b.pulled[i] = i < b.phase - 1;
    if (g.rescued.has(b.cricket)) { b.done = true; b.gone = true; return; }
    b.x = [0, 42, 24, 38][b.phase] * T; b.facing = b.phase === 2 ? 1 : -1;
    b.y = floorAt(b.x); b.mode = 'stalk'; b.mt = 0; b.cool = b.phase === 1 ? 90 : 50; b.pose = 'walk';
    b.lunges = 0; b.stuck = 0; b.tip = 0;
  },
  tick(b, g) {
    const p = g.player;
    const pb = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 };
    const feet = p.y + p.h;
    const onFloorLevel = feet > 13.4 * T;           // on the sand or a berm, not her back or the rock
    const seen = !p.hidden && onFloorLevel && Math.abs(p.cx - b.x) < 13 * T;
    b.y += (floorAt(b.x) - b.y) * 0.25;
    if (b.cool > 0) b.cool--;

    // the pull tabs: kick this phase's tab
    const tab = TABS[b.phase - 1];
    const kb = p.kickBox();
    if (kb && !b.pulled[b.phase - 1] && ov(kb, { x: tab.x - 26, y: ROCK.top - 46, w: 52, h: 46 })) {
      b.pulled[b.phase - 1] = true;
      g.emit('switch', { id: `duchess-tab-${b.phase}`, x: tab.x, y: ROCK.top - 20 });
      g.emit('sfx', { name: 'unlock', gain: 0.7 });
      if (b.phase < 3) g.toast(['Tab one! Two to go.', 'Tab two! One more.'][b.phase - 1], 150);
      setPlat(b, g, false);
      b.nextPhase();
      return;
    }

    const lungeTo = (aim) => { b.aim = aim; b.mode = 'lunge'; b.pose = 'strike'; b.mt = 0; g.emit('sfx', { name: 'gecko-growl', gain: 0.45, rate: 1.2, x: b.x }); };
    switch (b.mode) {
      case 'stalk': {
        b.pose = 'walk';
        if (!seen) { // pace slowly
          const home = b.facing < 0 ? 10 * T : 54 * T;
          if (Math.abs(home - b.x) < T) b.facing *= -1;
          b.x += b.facing * SPEED[b.phase] * 0.6 * T * DT;
          break;
        }
        const dx = p.cx - b.x;
        b.facing = Math.sign(dx) || b.facing;
        if (Math.abs(dx) > 5.5 * T) b.x += b.facing * SPEED[b.phase] * T * DT;
        else if (b.cool > 0) b.pose = 'idle'; // [issue 26] waiting to strike: still (the run frames don't cycle in place)
        else {
          b.pose = 'idle'; b.aimAt = p.cx; b.mt = b.tell(nose(b), b.y - 70); b.mode = 'tell';
          b.feint = b.phase === 2; b.double = b.phase === 3 ? 1 : 0;
        }
        break;
      }
      case 'tell':
        b.pose = 'idle';
        if (b.telling && b.phase !== 2) b.aimAt = b.aimAt; // aim was taken when the tell began
        if (--b.mt <= 0) {
          if (b.feint) { b.feint = false; b.mode = 'feint'; b.mt = 30; b.pose = 'walk'; break; }
          lungeTo(b.aimAt);
        }
        break;
      case 'feint':           // phase 2: a twitch, a pause... then the real tell
        b.x -= b.facing * 0.6 * T * DT;
        if (--b.mt <= 0) { b.aimAt = p.cx; b.mt = b.tell(nose(b), b.y - 70); b.mode = 'tell'; }
        break;
      case 'lunge': {
        b.mt++;
        const n = nose(b), target = b.aim + b.facing * 0.8 * T;
        const step = Math.min(Math.abs(target - n), LUNGE * DT) * Math.sign(target - n);
        b.x += step;
        // a snout into a berm sticks
        const nn = nose(b);
        // [fixer] phase 3: the first lunge of the pair glances off a berm (she recoils and lunges again
        // 0.6 s later); only the second one sticks. So the double lunge is always seen.
        const hitL = b.facing < 0 && nn <= BERM_L && b.x > BERM_L, hitR = b.facing > 0 && nn >= BERM_R && b.x < BERM_R;
        if ((hitL || hitR) && b.double === 1) {
          b.x = hitL ? BERM_L + BODY / 2 + 0.6 * T : BERM_R - BODY / 2 - 0.6 * T;
          g.emit('dust', { x: nose(b), y: FLOOR - 30 });
          g.emit('sfx', { name: 'gecko-chomp', gain: 0.4, x: b.x });
          b.double = 2; b.aimAt = p.cx; b.mt = Math.min(b.tellFrames, Math.round(0.6 * FPS * (g.gentle ? 1.5 : 1))); b.tell(nose(b), b.y - 70); b.mode = 'tell2'; b.pose = 'idle';
          if (!b.toldDouble) { b.toldDouble = true; g.toast('She bounced off! Here comes the second lunge.', 120); }
          break;
        }
        if (hitL) { b.x = BERM_L + BODY / 2; b.mode = 'stuck'; }
        else if (hitR) { b.x = BERM_R - BODY / 2; b.mode = 'stuck'; }
        if (b.mode === 'stuck') {
          b.mt = STUCK; b.pose = 'strike'; setPlat(b, g, true);
          g.emit('dust', { x: nose(b), y: FLOOR - 30 }); g.emit('land', { x: nose(b), y: FLOOR, hard: true });
          g.emit('sfx', { name: 'gecko-chomp', gain: 0.6, x: b.x });
          g.toast('Her snout is stuck in the sand! Up her back, quick!', 150);
          break;
        }
        if (Math.abs(target - nn) < 2 || b.mt > 60) {
          if (b.double === 1) { b.double = 2; b.aimAt = p.cx; b.mt = Math.min(b.tellFrames, Math.round(0.6 * FPS * (g.gentle ? 1.5 : 1))); b.tell(nose(b), b.y - 70); b.mode = 'tell2'; b.pose = 'idle'; }
          else { b.mode = 'recover'; b.mt = 50; b.pose = 'idle'; }
        }
        break;
      }
      case 'tell2':
        if (--b.mt <= 0) lungeTo(b.aimAt);
        break;
      case 'stuck':
        b.pose = 'strike';
        if (b.mt % 20 === 0) g.emit('dust', { x: nose(b), y: FLOOR - 20 });
        if (--b.mt <= 0) { setPlat(b, g, false); b.mode = 'recover'; b.mt = 45; b.pose = 'idle'; g.emit('sfx', { name: 'gecko-growl', gain: 0.4, x: b.x }); }
        break;
      case 'recover':
        if (--b.mt <= 0) { b.mode = 'stalk'; b.cool = 60; }
        break;
      default: break;
    }
    // only the snout bites
    if (b.mode === 'lunge' && p.invuln === 0 && !p.hidden) {
      const n = nose(b);
      const head = { x: n - (b.facing > 0 ? 1.4 * T : 0), y: FLOOR - 1.7 * T, w: 1.4 * T, h: 1.7 * T };
      if (ov(head, pb)) b.hit(1, n);
    }
  },
  after(b, g) { // rescued: the cup lies tipped against the rock (a step), Stripe is out
    if (!b.stepDone) { b.stepDone = true; setPlat(b, g, false); for (const c of [26, 27]) for (const r of [14, 15]) if (g.grid.at(c, r) === 0) g.grid.set(c, r, 1); g.gridVersion++; }
    b.tip = Math.min(1, (b.tip || 0) + 0.04);
  },
  draw(b, c, r) {
    // Stripe's feeding cup on the rock, with its three pull tabs. [issue 6] It's the feeding cup Pip
    // started in (tank.js FEEDER: the same width and stretch), lidded; rescued, it lies upside down
    // against the rock's foot, its base the step (cols 26-27, top at row 14).
    const tipped = b.done;
    const lid = S.get('props/feeder-cup.webp');
    const cupH = lid ? FEEDER.w * lid.height / lid.width * FEEDER.stretch : 2.8 * T;
    // (2.45 tiles tall: the near edge of its upturned base is the step's top, where Pip stands)
    if (tipped) { const im = S.get('props/feeder-cup-tipped.webp'); if (im) c.drawImage(im, 27 * T - FEEDER.w / 2, FLOOR + 3 - 2.45 * T, FEEDER.w, 2.45 * T); }
    else {
      if (lid) c.drawImage(lid, CUP_X - FEEDER.w / 2, ROCK.top + 4 - cupH, FEEDER.w, cupH);
      // [issue 13] Stripe, full size on the cup's floor and facing Pip, with a hop up to the lid now
      // and then: at 0.8 scale, floating mid-cup behind the front tab, he read as part of the
      // cup's painted texture and the cup looked empty
      if (r && !b.done) {
        const ht = (b.t || 0) % 150, hop = ht < 22 ? Math.sin(Math.PI * ht / 22) * 0.75 * T : 0;
        const face = b.game?.player && b.game.player.cx > CUP_X ? 1 : -1;
        r.drawCricketAt(c, 'stripe', CUP_X - face * 0.1 * T, ROCK.top - cupH * 0.12 - hop, face, { look: hop ? 'leap' : 'idle' });
      }
      // the tabs hang from the lid's front edge (36% down the lidded picture) over their kick spots;
      // a pulled tab is folded back up over a cracked rim
      const rimY = ROCK.top + 4 - cupH * 0.64;
      TABS.forEach((t, i) => {
        const pulled = b.pulled?.[i];
        const ti = S.get(`props/${pulled ? 'cup-tab-pulled' : 'cup-tab'}.webp`);
        const now = i === b.phase - 1 && !pulled;
        const w = 1.1 * T, h = w * (ti ? ti.height / ti.width : 0.58);
        const x = t.x - w / 2, y = pulled ? rimY - 0.02 * T - h : rimY - 0.24 * T;
        if (ti) { c.save(); c.shadowColor = 'rgba(70,45,20,0.55)'; c.shadowBlur = 5; c.shadowOffsetY = 2; c.drawImage(ti, x, y, w, h); c.restore(); } // a soft shadow: white on the white lid
        if (now && Math.floor(b.t / 20) % 2 === 0) { c.save(); c.strokeStyle = '#F2C46D'; c.lineWidth = 3; c.beginPath(); c.arc(t.x, y + h * 0.6, 18, 0, 7); c.stroke(); c.restore(); }
      });
    }
    if (b.gone) return true;  // she's dozing on the dresser now
    return false;             // and the default body (the rig)
  },
});
