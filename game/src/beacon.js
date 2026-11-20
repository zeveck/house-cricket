// The beacon: where the trapped cricket's call comes from, and how far away it is along the
// house's rooms. Pure logic (no DOM, no AudioContext), so game.js, the HUD and node tools can
// use it; audio.js turns it into gain / low-pass / reverb / pan.
//
// Target (design "The beacon"): until the zone's item is picked up, the zone's sound hole;
// afterwards the lair. Data, in order of preference:
//   before the item: zone.soundHole {room, x, y} | a `beacon` entity (B marker) without `after` | zone.beacon | the item
//   after the item:  zone.lair {room, x, y}      | a `beacon` entity with `after: true` | the cage | the boss | zone.beacon
//   zones without an item (sandbox, attic) go straight to the lair; a rescued zone has no beacon.
//   Voice: zone.beaconVoice = 'alarm' | ['alarm','knock'] | {hole: [...], lair: [...]};
//          default: the zone cricket's species (chirps.js CRICKET_VOICE).
//   Span: zone.beaconSpan = margin | {hole: margin, lair: margin}: a phase's first -20 dB span is measured
//          from where a player comes in, the rest down to -24 at the zone's far side (see field()).
//   Zone 5 (Laundry): soundHole = the dryer vent by the Glider, beaconVoice = {hole: ['alarm','knock'], lair: ['alarm']},
//          lair = the alarm in Peridot's arena.
// Distance: shortest path over room exits (portal midpoints, from world.exits) and doors (one way),
// plus the straight distance inside the player's and the target's rooms; a room's `noWay` marks the
// straight lines a cricket can't take (see noWay below). Gain: 0 dB at the target to
// -24 dB at the zone's far side (its farthest room corner; zone.beaconSpan adds a knee), never lower.
import { TILE } from '../data/movement.js';
import { ZONE_INFO } from '../data/zones.js';
import { CRICKET_VOICE, individualPitch, pitchOf } from './chirps.js';

export const FLOOR_DB = -24;
// Default temperatures (F) per zone number (design: Kitchen and Laundry warm, Basement cold).
// zone.temp overrides; room def `temp` overrides that: a number, or {left, right} for a
// thermostat-lock gradient across the room (F at the left and right edges).
export const ZONE_TEMP = { 0: 76, 1: 70, 2: 72, 3: 82, 4: 68, 5: 84, 6: 71, 7: 68, 8: 76, 9: 56, 10: 64, 99: 72 };

export function tempAt(room, x = null) {
  const zt = room?.zone?.temp ?? ZONE_INFO[room?.zone?.n]?.temp ?? ZONE_TEMP[room?.zone?.n] ?? 70;
  const t = room?.def?.temp;
  if (typeof t === 'number') return t;
  if (t && typeof t === 'object' && t.left != null && t.right != null) {
    const fx = x == null ? 0.5 : Math.max(0, Math.min(1, x / room.pw));
    return t.left + (t.right - t.left) * fx;
  }
  return zt;
}

/** Zone facts: data/zones.js ZONE_INFO[n] merged with the zone module's own fields. */
export function info(zone) { return { ...(ZONE_INFO[zone?.n] || {}), ...(zone || {}) }; }
function zoneRooms(world, zone) { return Object.values(world.rooms).filter((r) => r.zone === zone); }
function findEnt(world, zone, pred) {
  for (const r of zoneRooms(world, zone)) for (const e of r.entities) if (pred(e)) return { room: r.id, x: e.x, y: e.y, e };
  return null;
}
const asVoices = (v) => (Array.isArray(v) ? v : v ? [v] : []);

/** What the beacon is right now (cached per zone/item/rescue state). */
export function beaconSpec(game) {
  const zone = game.zone, world = game.world;
  if (!zone || !world) return null;
  const zi = info(zone);
  const cage = findEnt(world, zone, (e) => e.type === 'cage');
  const cricket = zi.cricket || cage?.e.cricket || null;
  const item = zi.item || null;
  const hasItem = item ? game.player.has(item) : true;
  const freed = cricket ? game.rescued.has(cricket) : false;
  const key = `${zone.id}|${hasItem}|${freed}`;
  game._beaconCache ||= {};
  if (key in game._beaconCache) return game._beaconCache[key];
  let spec = null;
  if (!freed) {
    let t = null, phase;
    if (!hasItem) {
      phase = 'hole';
      t = zi.soundHole || findEnt(world, zone, (e) => e.type === 'beacon' && !e.after) || zi.beacon || findEnt(world, zone, (e) => e.type === 'item' && e.item === item);
    }
    if (!t) {
      phase = 'lair';
      t = zi.lair || findEnt(world, zone, (e) => e.type === 'beacon' && e.after) || cage || findEnt(world, zone, (e) => e.type === 'boss') || zi.beacon;
    }
    const room = t && world.rooms[t.room];
    if (room) {
      const bv = zi.beaconVoice;
      let voices = bv && !Array.isArray(bv) && typeof bv === 'object' ? asVoices(bv[phase]) : asVoices(bv);
      if (!voices.length) voices = [CRICKET_VOICE[cricket] || 'house'];
      const px = (t.x + 0.5) * TILE, py = (t.y + 0.5) * TILE;
      // [issue 22] zone.beaconSpan = {hole: margin, lair: margin}: this phase's span is measured from
      // where a player comes in (see field()); the lair phase also comes from the item's spot.
      const bs = zi.beaconSpan, span = bs && typeof bs === 'object' ? bs[phase] : bs;
      let from = null;
      if (span && phase === 'lair' && item) {
        const h = zi.soundHole || findEnt(world, zone, (e) => e.type === 'beacon' && !e.after) || zi.beacon || findEnt(world, zone, (e) => e.type === 'item' && e.item === item);
        if (h && world.rooms[h.room]) from = [{ room: h.room, x: (h.x + 0.5) * TILE, y: (h.y + 0.5) * TILE }];
      }
      spec = {
        zone: zone.id, phase, cricket, voices, voice: voices[0], span: span || null, from,
        pitch: cricket ? individualPitch(cricket) : 1,
        target: { room: room.id, x: px, y: py, tx: t.x, ty: t.y, wx: room.wx + px, wy: room.wy + py },
        temp: tempAt(room, px),
      };
      spec.hz = pitchOf(spec.voice, { pitch: spec.pitch });
    }
  }
  game._beaconCache[key] = spec;
  return spec;
}

// ---- the portal graph (cached on the world) ----
function graph(world) {
  if (world._portalGraph) return world._portalGraph;
  const nodes = [], byRoom = {};
  const add = (wx, wy, rooms) => { const i = nodes.length; nodes.push({ wx, wy, rooms }); for (const r of rooms) (byRoom[r] ||= []).push(i); return i; };
  const links = [];
  for (const room of Object.values(world.rooms)) {
    for (const ex of world.exits(room)) {
      const mid = ((ex.start + ex.end + 1) / 2) * TILE;
      const p = ex.side === 'left' ? [room.wx, room.wy + mid] : ex.side === 'right' ? [room.wx + room.pw, room.wy + mid]
        : ex.side === 'top' ? [room.wx + mid, room.wy] : [room.wx + mid, room.wy + room.ph];
      add(p[0], p[1], [room.id, ex.to]);
    }
    for (const e of room.entities) if (e.type === 'door' && world.rooms[e.to]) {
      const to = world.rooms[e.to];
      const a = add(room.wx + (e.x + 0.5) * TILE, room.wy + (e.y + 0.5) * TILE, [room.id]);
      const at = e.at || [2, to.th - 3];
      const b = add(to.wx + (at[0] + 0.5) * TILE, to.wy + (at[1] + 0.5) * TILE, [to.id]);
      links.push([a, b]);
      nodes[a].door = 'src'; nodes[b].door = 'dst'; nodes[a].partner = b; nodes[b].partner = a; // [issue 10]
    }
  }
  // [issue 10] twins: the same opening seen from both rooms (one node per room's exits, ~0 apart)
  for (let i = 0; i < nodes.length; i++) for (let j = 0; j < nodes.length; j++) if (i !== j && isTwin(nodes[i], nodes[j])) nodes[i].twin = j;
  // adjacency: every pair of nodes sharing a room (straight distance) unless the room's noWay says
  // you can't walk it, plus door links (0). field() searches from the target outwards, so adj[u]
  // lists the nodes that lead *into* u: [v, w] in adj[u] means a player at v can go on to u.
  const adj = nodes.map(() => []);
  for (const [rid, ids] of Object.entries(byRoom)) {
    const room = world.rooms[rid];
    for (const a of ids) for (const b of ids) if (a !== b && !noWay(room, nodes[a].wx, nodes[a].wy, nodes[b].wx, nodes[b].wy)) adj[b].push([a, Math.hypot(nodes[a].wx - nodes[b].wx, nodes[a].wy - nodes[b].wy)]);
  }
  // [issue 21] A door is one way (game.js useDoor: in at the door, out at its `at` spot; a way back is
  // its own door entity): the door leads into its arrival spot, never the other way.
  for (const [a, b] of links) adj[b].push([a, 0]);
  world._portalGraph = { nodes, byRoom, adj };
  return world._portalGraph;
}

// [issue 21] A room's straight lines are walkable unless its def says otherwise: room.def.noWay =
// [{from: [x, y, w, h], to: [x, y, w, h]}] (tiles) says nothing in `from` gets to `to` inside the room
// (the Sunroom's potting bench: its floor can't climb to the bench top, the canopy is the way up; the
// Laundry sink's drop from the stair head only comes down).
// World pixel points; one on the room's edge (an exit) counts as the tile just inside.
function inRect(room, wx, wy, r) {
  const tx = Math.max(0, Math.min(room.tw - 1, Math.floor((wx - room.wx) / TILE)));
  const ty = Math.max(0, Math.min(room.th - 1, Math.floor((wy - room.wy) / TILE)));
  return tx >= r[0] && tx < r[0] + r[2] && ty >= r[1] && ty < r[1] + r[3];
}
function noWay(room, ax, ay, bx, by) {
  for (const w of room?.def?.noWay || []) if (inRect(room, ax, ay, w.from) && inRect(room, bx, by, w.to)) return true;
  return false;
}

function isTwin(a, b) {
  return !a.door && !b.door && a.rooms.length === 2 && b.rooms.length === 2 && a.rooms[0] === b.rooms[1] && a.rooms[1] === b.rooms[0]
    && Math.hypot(a.wx - b.wx, a.wy - b.wy) < 2 * TILE;
}

// Dijkstra from the target to every portal node (dist, and next: the node after it on the way to
// the target, -1 straight to the target); plus the zone's far-side distance.
function field(world, spec) {
  const key = `${spec.target.room}@${spec.target.wx},${spec.target.wy}|${spec.span || ''}`;
  world._beaconFields ||= {};
  if (world._beaconFields[key]) return world._beaconFields[key];
  const { nodes, byRoom, adj } = graph(world);
  const dist = new Float64Array(nodes.length).fill(Infinity), done = new Uint8Array(nodes.length), next = new Int32Array(nodes.length).fill(-1);
  const troom = world.rooms[spec.target.room];
  for (const i of byRoom[spec.target.room] || []) if (!noWay(troom, nodes[i].wx, nodes[i].wy, spec.target.wx, spec.target.wy)) dist[i] = Math.hypot(nodes[i].wx - spec.target.wx, nodes[i].wy - spec.target.wy);
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < nodes.length; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u < 0) break;
    done[u] = 1;
    for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; next[v] = u; }
  }
  const f = { dist, next, maxDist: 1 };
  // far side: the farthest corner of any room in the target's zone
  const tz = world.rooms[spec.target.room].zone;
  for (const r of Object.values(world.rooms)) {
    if (r.zone !== tz) continue;
    for (const [cx, cy] of [[0, 0], [r.pw, 0], [0, r.ph], [r.pw, r.ph]]) {
      const d = pathFrom(world, f, spec, r, cx, cy).d;
      if (Number.isFinite(d)) f.maxDist = Math.max(f.maxDist, d);
    }
  }
  // [issue 22] A phase with a span margin (zone.beaconSpan): f.span = `margin` x the farthest place a
  // player comes in from (an opening or door from another zone, the zone's start spot, spec.from: the
  // item's spot in the lair phase), if that's short of the zone's own far side. measure() then falls
  // from 0 dB to SPAN_KNEE_DB over the span and on to the floor at the far side. For a zone whose far
  // rooms lie past the target (the Sunroom: the bench floor and the Glass Corner, the long way back
  // round by the canopy), so the route isn't squeezed into the loud end and the rooms past the span
  // still get warmer and colder.
  if (spec.span > 0) {
    const { nodes } = graph(world), inZ = (r) => world.rooms[r]?.zone === tz;
    let far = 0;
    nodes.forEach((nd, i) => {
      const entry = nd.door === 'dst' ? !inZ(nodes[nd.partner].rooms[0]) : nd.rooms.length === 2 && !inZ(nd.rooms[1]);
      if (inZ(nd.rooms[0]) && entry && Number.isFinite(dist[i])) far = Math.max(far, dist[i]);
    });
    const zs = info(tz).start, sr = world.rooms[typeof zs === 'string' ? zs : zs?.room];
    const spots = [...(spec.from || [])];
    if (sr) {
      const m = Number.isFinite(zs?.x) ? zs : sr.entities.find((e) => e.type === 'start') || sr.entities.find((e) => e.type === 'save') || { x: 2, y: sr.th - 3 }; // as game.startAt
      spots.push({ room: sr.id, x: (m.x + 0.5) * TILE, y: (m.y + 0.5) * TILE });
    }
    for (const s of spots) { const d = pathFrom(world, f, spec, world.rooms[s.room], s.x, s.y).d; if (Number.isFinite(d)) far = Math.max(far, d); }
    if (far > 0 && spec.span * far < f.maxDist) f.span = spec.span * far;
  }
  world._beaconFields[key] = f;
  return f;
}
function pathFrom(world, f, spec, room, x, y) {
  const wx = room.wx + x, wy = room.wy + y;
  if (room.id === spec.target.room && !noWay(room, wx, wy, spec.target.wx, spec.target.wy)) return { d: Math.hypot(spec.target.wx - wx, spec.target.wy - wy), via: null };
  const { nodes, byRoom } = graph(world);
  let d = Infinity, via = null;
  for (const i of byRoom[room.id] || []) {
    if (noWay(room, wx, wy, nodes[i].wx, nodes[i].wy)) continue;
    const c = Math.hypot(nodes[i].wx - wx, nodes[i].wy - wy) + f.dist[i];
    if (c < d) { d = c; via = nodes[i]; }
  }
  return { d, via };
}

// [issue 22] The distance fraction (gain = FLOOR_DB x frac): straight to the far side, or with a span
// (zone.beaconSpan) 0 -> SPAN_KNEE_DB over the span, then on down to the floor at the zone's far side.
export const SPAN_KNEE_DB = -20;
function fracOf(f, d) {
  if (!f.span) return d / f.maxDist;
  const k = SPAN_KNEE_DB / FLOOR_DB;
  return d <= f.span ? k * d / f.span : k + (1 - k) * (d - f.span) / (f.maxDist - f.span);
}

/**
 * Measure the beacon from the player: path distance, gain (dB), and the next waypoint
 * (the exit on the path, or the target itself) in the current room's coordinates.
 */
export function measure(game, spec = beaconSpec(game)) {
  if (!spec || !game.room) return null;
  const world = game.world, room = game.room, p = game.player;
  const f = field(world, spec);
  const { d, via } = pathFrom(world, f, spec, room, p.cx, p.cy);
  const reach = Number.isFinite(d);
  const frac = reach ? Math.max(0, Math.min(1, fracOf(f, d))) : 1;
  const wp = via ? { x: via.wx - room.wx, y: via.wy - room.wy } : { x: spec.target.wx - room.wx, y: spec.target.wy - room.wy };
  return { pathDist: reach ? Math.round(d) : null, maxDist: Math.round(f.maxDist), frac, gainDb: FLOOR_DB * frac, waypoint: wp, sameRoom: !via && reach };
}

// [issue 10] The ear guide's aim: from a portal node `n` of room `roomId` on the path, walk on while
// the path stays in the room (a twin, or another opening of this room: the same doorway, or a
// doorway you stand at that the path only passes), and stop at the doorway the path leaves the room
// by. A door is aimed at itself, never at where it leads. Returns a node index.
export function aimFrom(world, f, roomId, n) {
  const { nodes } = graph(world);
  for (let k = 0; k < 64; k++) {
    if (nodes[n].door === 'src') return n;
    const s = f.next[n];
    if (s < 0) return n;
    if (nodes[s].rooms.includes(roomId)) { n = s; continue; } // a twin, or another opening of this room
    return n;
  }
  return n;
}

/**
 * [issue 10] The way to walk (the ear guide and the Listen direction): the next doorway on the path
 * out of the player's room, or the target itself in its own room, in the room's coordinates.
 * keep: the last `via` (a portal node index); it stays unless another is better by more than a tile.
 * Returns {via, node, aim: {x, y}, door (an interior door), target (aiming at the beacon)} or null.
 */
export function route(game, spec = beaconSpec(game), keep = null) {
  if (!spec || !game.room) return null;
  const world = game.world, room = game.room, p = game.player;
  const wx = room.wx + p.cx, wy = room.wy + p.cy;
  if (room.id === spec.target.room && !noWay(room, wx, wy, spec.target.wx, spec.target.wy)) return { via: null, node: null, aim: { x: spec.target.wx - room.wx, y: spec.target.wy - room.wy }, door: false, target: true };
  const f = field(world, spec), { nodes, byRoom } = graph(world), ids = byRoom[room.id] || [];
  const cost = (i) => (noWay(room, wx, wy, nodes[i].wx, nodes[i].wy) ? Infinity : Math.hypot(nodes[i].wx - wx, nodes[i].wy - wy) + f.dist[i]);
  let via = -1, bd = Infinity;
  for (const i of ids) { const c = cost(i); if (c < bd) { bd = c; via = i; } }
  if (via < 0 || !Number.isFinite(bd)) return null;
  if (keep != null && keep !== via && ids.includes(keep) && cost(keep) <= bd + TILE) via = keep;
  const node = aimFrom(world, f, room.id, via), nd = nodes[node];
  return { via, node, aim: { x: nd.wx - room.wx, y: nd.wy - room.wy }, door: nd.door === 'src', target: false };
}
/** [issue 10] Read-only views for the tests: the portal graph and the field of a beacon. */
export function portalGraph(world) { return graph(world); }
export function beaconField(world, spec) { return field(world, spec); }

/** The Listen arrow's target in the current room's coordinates (game.beaconTarget delegates here). */
export function targetInRoom(game) {
  const spec = beaconSpec(game);
  if (!spec || !game.room) return null;
  const m = measure(game, spec);
  return { x: spec.target.wx - game.room.wx, y: spec.target.wy - game.room.wy, room: spec.target.room, via: m?.waypoint || null };
}

// [fixer] Listen range: the Crumb Shop's big ears (player.listenRange, +0.5 each) and Pip's perk
// (listen2: twice as far) make a listening cricket hear the beacon as if it were that much nearer.
export function listenReach(p) { return (p?.listenRange || 1) * (p?.stats?.perk === 'listen2' ? 2 : 1); }
/** The beacon's gain (dB) while listening: the distance fraction shrinks by listenReach, plus `boost`. */
export function listenGainDb(m, p, boost) { return FLOOR_DB * Math.min(1, m.frac / listenReach(p)) + boost; }
