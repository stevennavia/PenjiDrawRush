const C = document.querySelector('#game');
const x = C.getContext('2d');
const W = 1280;
const H = 720;
const $ = (selector) => document.querySelector(selector);
const ui = {
  start: $('#start'), hud: $('#hud'), tools: $('#tools'), play: $('#play'),
  again: $('#again'), over: $('#over'), score: $('#score'), jump: $('#jump'),
  pause: $('#pause'), ink: $('#ink'), inkValue: $('#inkValue'), stage: $('#stage'),
  meters: $('#meters'), lives: $('#lives'), notice: $('#notice'),
  scoreForm: $('#scoreForm'), playerName: $('#playerName'), saveScore: $('#saveScore'),
  saveStatus: $('#saveStatus'), leaderboardList: $('#leaderboardList'),
  desktopHints: $('#desktopHints'), musicToggle: $('#musicToggle')
};

const img = {};
for (const name of ['office', 'outdoors', 'workshop', 'robot-sheet', 'pencil', 'pickups-enemies-atlas']) {
  img[name] = new Image();
  img[name].src = `assets/${name}.png`;
}

const music = $('#bgm');
const MUSIC_PREFERENCE = 'penji-draw-rush-muted';
let musicMuted = localStorage.getItem(MUSIC_PREFERENCE) === 'true';
music.volume = .25;
function updateMusicToggle() {
  ui.musicToggle.textContent = musicMuted ? '♪ MUSIC OFF' : '♫ MUSIC ON';
  ui.musicToggle.setAttribute('aria-pressed', String(musicMuted));
  ui.musicToggle.setAttribute('aria-label', musicMuted ? 'Turn music on' : 'Mute music');
}
function ensureMusic() {
  if (musicMuted) {
    music.pause();
    return;
  }
  music.muted = false;
  music.volume = .25;
  if (!music.paused) return;
  const resumeAt = Number(music.dataset.resumeAt || 0);
  if (resumeAt && Math.abs(music.currentTime - resumeAt) > .15) music.currentTime = resumeAt;
  music.play().catch(() => {});
}
function setMusicMuted(value) {
  musicMuted = value;
  localStorage.setItem(MUSIC_PREFERENCE, String(value));
  if (musicMuted) music.pause();
  else ensureMusic();
  updateMusicToggle();
}
music.addEventListener('timeupdate', () => { music.dataset.resumeAt = String(music.currentTime); });
addEventListener('pointerdown', ensureMusic, { once: true, passive: true });
addEventListener('keydown', ensureMusic, { once: true });
addEventListener('pagehide', () => music.pause());
addEventListener('beforeunload', () => music.pause());

let state = 'menu';
let paused = false;
let cam = 0;
let last = 0;
let acc = 0;
let frame = 0;
let ink = 100;
let lives = 3;
let dist = 0;
let score = 0;
let slow = 0;
let mouse = null;
let drawing = false;
let preview = [];
let strokes = [];
let plats = [];
let hazards = [];
let pickups = [];
let hurt = 0;
let finalRun = { score: 0, distance: 0 };
let savedLeaderboardKey = '';
let activePointer = null;
let p = { x: 260, y: 380, vx: 150, vy: 0, ground: false, coyote: 0, jump: 0, surface: null };
C.width = W;
C.height = H;

const theme = () => {
  const distance = dist % 210;
  return distance < 70 ? 'office' : distance < 140 ? 'outdoors' : 'workshop';
};

function note(message) {
  ui.notice.textContent = message;
  ui.notice.style.opacity = 1;
  setTimeout(() => { ui.notice.style.opacity = 0; }, 1000);
}

function reset() {
  ink = 100;
  lives = 3;
  score = 0;
  dist = 0;
  cam = 0;
  strokes = [];
  p = { x: 260, y: 380, vx: 150, vy: 0, ground: false, coyote: 0, jump: 0, surface: null };
  world();
}

function world() {
  plats = [[-180, 500, 520, 500]];
  hazards = [];
  pickups = [];
  for (let i = 1; i < 390; i += 1) {
    const start = i * 520;
    const stage = Math.floor(start / 7000) % 3;
    const pattern = i % 5;
    const base = stage === 1 ? 485 : stage === 2 ? 505 : 520;
    const lift = [0, 80, 145, 55, 190][pattern] + stage * 25;
    const y = base - lift;
    const width = stage === 0 ? 330 : stage === 1 ? 285 : 250;
    plats.push([start, y, start + width, y]);
    if (pattern === 2) plats.push([start + width, y, start + width + 150, y - 65]);
    if (i > 3 && pattern === 1) hazards.push({ x: start - 54, y: base, w: 48, stage });
    pickups.push({
      x: start + Math.min(120, width * .5),
      y: y - 55,
      type: i % 17 === 0 ? 'heart' : i % 5 === 0 ? 'ink' : 'star',
      taken: false
    });
  }
}

function start() {
  state = 'playing';
  paused = false;
  ensureMusic();
  ui.start.hidden = true;
  ui.over.hidden = true;
  ui.hud.hidden = false;
  ui.jump.hidden = false;
  ui.pause.hidden = false;
  ui.musicToggle.hidden = false;
  ui.desktopHints.hidden = false;
  ui.tools.hidden = true;
  ui.tools.style.display = 'none';
  reset();
  last = performance.now();
  requestAnimationFrame(loop);
}

function menu() {
  state = 'menu';
  paused = false;
  ui.over.hidden = true;
  ui.start.hidden = false;
  ui.hud.hidden = true;
  ui.jump.hidden = true;
  ui.pause.hidden = true;
  ui.musicToggle.hidden = true;
  ui.desktopHints.hidden = true;
}

function jump() {
  if (state === 'playing' && !paused) p.jump = .12;
}

ui.play.onclick = start;
ui.again.onclick = start;
ui.jump.onclick = jump;
ui.jump.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  event.stopPropagation();
  jump();
}, { passive: false });
ui.pause.onclick = () => toggle();
ui.musicToggle.onclick = () => setMusicMuted(!musicMuted);
ui.scoreForm.addEventListener('submit', saveScore);
updateMusicToggle();

function toggle() {
  if (state !== 'playing') return;
  paused = !paused;
  note(paused ? 'PAUSED' : 'GO!');
  if (!paused) {
    last = performance.now();
    requestAnimationFrame(loop);
  }
}

addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    jump();
  }
  if (event.key === 'p' || event.key === 'Escape') toggle();
  if (event.key === 'r' && state === 'over') start();
  if ('123'.includes(event.key) && state === 'playing') {
    p.x = (Number(event.key) - 1) * 7000 + 340;
    p.y = 280;
    p.vx = 180;
    cam = p.x - 260;
    note('TEST WARP');
  }
});

function point(event) {
  const bounds = C.getBoundingClientRect();
  const sx = (event.clientX - bounds.left) * W / bounds.width;
  const sy = (event.clientY - bounds.top) * H / bounds.height;
  return { screen: { x: sx, y: sy }, world: { x: sx + cam, y: sy } };
}

function add(pointValue) {
  const previous = preview.at(-1);
  if (!previous || Math.hypot(pointValue.x - previous.x, pointValue.y - previous.y) > 3) preview.push(pointValue);
}

function beginStroke(event) {
  if (state !== 'playing' || paused || activePointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
  event.preventDefault();
  const position = point(event);
  activePointer = event.pointerId;
  mouse = position.screen;
  drawing = true;
  preview = [position.world];
  slow = 2;
  C.setPointerCapture?.(event.pointerId);
}

function moveStroke(event) {
  const samples = event.getCoalescedEvents?.() || [event];
  if (event.pointerType === 'mouse') {
    for (const sample of samples) mouse = point(sample).screen;
  }
  if (event.pointerId !== activePointer) return;
  event.preventDefault();
  for (const sample of samples) {
    const position = point(sample);
    mouse = position.screen;
    if (drawing) add(position.world);
  }
}

function endStroke(event) {
  if (event.pointerId !== activePointer) return;
  commit();
  activePointer = null;
}

C.addEventListener('pointerdown', beginStroke, { passive: false });
C.addEventListener('pointermove', moveStroke, { passive: false });
C.addEventListener('pointerup', endStroke);
C.addEventListener('pointercancel', endStroke);
C.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') mouse = null; });
C.addEventListener('contextmenu', (event) => event.preventDefault());

function commit() {
  if (!drawing) return;
  drawing = false;
  if (preview.length > 1) {
    let length = preview.reduce((total, pointValue, index) => index
      ? total + Math.hypot(pointValue.x - preview[index - 1].x, pointValue.y - preview[index - 1].y)
      : 0, 0);
    const maximum = Math.min(1000, ink * 10);
    if (length > maximum) {
      const shortened = [preview[0]];
      let used = 0;
      for (let i = 1; i < preview.length; i += 1) {
        const a = shortened.at(-1);
        const b = preview[i];
        const segmentLength = Math.hypot(b.x - a.x, b.y - a.y);
        if (used + segmentLength > maximum) break;
        shortened.push(b);
        used += segmentLength;
      }
      preview = shortened;
      length = used;
    }
    if (preview.length > 1) {
      if (strokes.length === 3) strokes.shift();
      strokes.push({ pts: preview, life: 7 });
      ink = Math.max(0, ink - length / 10);
    }
  }
  preview = [];
}

function segments() {
  const all = plats.map((platform) => ({ a: { x: platform[0], y: platform[1] }, b: { x: platform[2], y: platform[3] }, drawn: false }));
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.pts.length; i += 1) all.push({ a: stroke.pts[i - 1], b: stroke.pts[i], drawn: true });
  }
  return all;
}

function at(px, oldY, newY) {
  let best;
  for (const segment of segments()) {
    if (px < Math.min(segment.a.x, segment.b.x) || px > Math.max(segment.a.x, segment.b.x)) continue;
    const t = (px - segment.a.x) / (segment.b.x - segment.a.x);
    const y = segment.a.y + (segment.b.y - segment.a.y) * t;
    if (oldY <= y + 2 && newY >= y - 2 && (!best || y < best.y)) best = { y, s: segment };
  }
  return best;
}

function tick(delta) {
  slow = Math.max(0, slow - delta);
  hurt = Math.max(0, hurt - delta);
  const currentTheme = theme();
  const baseSpeed = currentTheme === 'office' ? 300 : currentTheme === 'outdoors' ? 350 : 400;
  const oldY = p.y;
  const slope = p.surface ? (p.surface.b.y - p.surface.a.y) / (p.surface.b.x - p.surface.a.x) : 0;
  const target = (baseSpeed + Math.min(220, dist * .55) + (p.surface?.drawn ? 120 + Math.max(0, slope) * 400 : 0)) * (slow ? .42 : 1);
  p.vx += (target - p.vx) * Math.min(1, 4 * delta);
  if (p.surface?.drawn && slope > 0) p.vx += slope * 1600 * delta;
  p.vx = Math.min(760, Math.max(150, p.vx));
  p.x += p.vx * delta;
  dist = p.x / 100;
  p.vy += 1500 * delta;
  p.y += p.vy * delta;
  p.jump -= delta;
  const contacts = [at(p.x + 8, oldY + 62, p.y + 62), at(p.x + 40, oldY + 62, p.y + 62)].filter(Boolean).sort((a, b) => a.y - b.y);
  const hit = contacts[0];
  p.ground = false;
  if (hit && p.vy >= 0) {
    p.y = hit.y - 62;
    p.vy = 0;
    p.ground = true;
    p.coyote = .1;
    p.surface = hit.s;
  } else {
    p.surface = null;
    p.coyote -= delta;
  }
  if (p.jump > 0 && (p.ground || p.coyote > 0)) {
    p.vy = -560;
    p.jump = 0;
    p.ground = false;
  }
  for (const hazard of hazards) {
    if (hurt <= 0 && p.x + 40 > hazard.x && p.x < hazard.x + hazard.w && p.y + 62 > hazard.y - 10) damage();
  }
  for (const pickup of pickups) {
    if (pickup.taken || Math.hypot(p.x - pickup.x, p.y - pickup.y) >= 58) continue;
    pickup.taken = true;
    if (pickup.type === 'ink') ink = Math.min(100, ink + 25);
    else if (pickup.type === 'heart') lives = Math.min(3, lives + 1);
    else score += 25;
  }
  if (p.y > 800 && hurt <= 0) damage();
  strokes.forEach((stroke) => { stroke.life -= delta; });
  strokes = strokes.filter((stroke) => stroke.life > 0 || p.x < Math.max(...stroke.pts.map((pointValue) => pointValue.x)) + 55);
  if (!drawing) ink = Math.min(100, ink + 8 * delta);
  cam = Math.max(0, p.x - 260);
}

function gameOver() {
  state = 'over';
  finalRun = { score, distance: Math.floor(dist) };
  ui.over.hidden = false;
  ui.score.innerHTML = `<small>TOTAL SCORE</small><strong>${score}</strong><span>POINTS · ${finalRun.distance} m reached</span>`;
  ui.playerName.value = '';
  ui.saveStatus.textContent = '';
  ui.saveScore.disabled = false;
  ui.hud.hidden = true;
  ui.jump.hidden = true;
  ui.pause.hidden = true;
  ui.musicToggle.hidden = true;
  ui.desktopHints.hidden = true;
  savedLeaderboardKey = '';
  loadLeaderboard();
}

function damage() {
  hurt = 1;
  lives -= 1;
  p.x = Math.max(260, Math.floor(p.x / 520) * 520 + 45);
  p.y = 270;
  p.vx = 170;
  p.vy = 0;
  ink = 100;
  note('OOPS!');
  if (lives <= 0) gameOver();
}

function renderLeaderboard(entries, message = '') {
  ui.leaderboardList.replaceChildren();
  if (message) {
    const row = document.createElement('li');
    row.className = 'empty';
    row.textContent = message;
    ui.leaderboardList.append(row);
    return;
  }
  if (!entries.length) {
    const row = document.createElement('li');
    row.className = 'empty';
    row.textContent = 'Be the first to score!';
    ui.leaderboardList.append(row);
    return;
  }
  entries.forEach((entry, index) => {
    const row = document.createElement('li');
    const rank = document.createElement('span');
    const name = document.createElement('span');
    const points = document.createElement('span');
    rank.className = 'rank';
    name.className = 'player';
    points.className = 'points';
    rank.textContent = `#${index + 1}`;
    name.textContent = entry.name;
    points.textContent = `${entry.score} pts`;
    if (entry.name.toLowerCase() === savedLeaderboardKey) row.classList.add('saved');
    row.append(rank, name, points);
    ui.leaderboardList.append(row);
  });
}

async function loadLeaderboard() {
  renderLeaderboard([], 'Loading scores…');
  try {
    const response = await fetch('/api/leaderboard');
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    renderLeaderboard(data.leaderboard || []);
  } catch (error) {
    renderLeaderboard([], 'Leaderboard is unavailable right now.');
  }
}

async function saveScore(event) {
  event.preventDefault();
  if (state !== 'over') return;
  const name = ui.playerName.value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{1,15}$/.test(name)) {
    ui.saveStatus.textContent = 'Use 2–16 letters, numbers, spaces, _ or -.';
    return;
  }
  ui.saveScore.disabled = true;
  ui.saveStatus.textContent = 'Saving score…';
  try {
    const response = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score: finalRun.score, distance: finalRun.distance })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    savedLeaderboardKey = name.toLowerCase();
    renderLeaderboard(data.leaderboard || []);
    ui.saveStatus.textContent = data.saved
      ? data.rank ? `Saved! You are #${data.rank}.` : 'Saved! Keep climbing.'
      : 'Your saved best score is already higher.';
  } catch (error) {
    ui.saveStatus.textContent = error.message || 'Could not save your score.';
  } finally {
    ui.saveScore.disabled = false;
  }
}

function line(a, b, color, width) {
  x.strokeStyle = color;
  x.lineWidth = width;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(a.x - cam, a.y);
  x.lineTo(b.x - cam, b.y);
  x.stroke();
}

function path(points, color, width) {
  if (points.length < 2) return;
  x.strokeStyle = color;
  x.lineWidth = width;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(points[0].x - cam, points[0].y);
  for (let i = 1; i < points.length; i += 1) x.lineTo(points[i].x - cam, points[i].y);
  x.stroke();
}

function draw() {
  const currentTheme = theme();
  x.drawImage(img[currentTheme], 0, 0, W, H);
  if (currentTheme === 'outdoors') {
    x.fillStyle = '#b9e5f5';
    x.fillRect(0, 372, W, H - 372);
    x.fillStyle = '#e9fbff';
    x.beginPath();
    x.moveTo(0, 446);
    for (let i = 0; i <= W; i += 64) x.quadraticCurveTo(i + 32, 424 + (i / 64 % 2) * 10, i + 64, 444);
    x.lineTo(W, 720);
    x.lineTo(0, 720);
    x.fill();
  }
  x.fillStyle = 'rgba(28,0,74,.1)';
  x.fillRect(0, 0, W, H);
  for (const platform of plats) {
    const top = currentTheme === 'outdoors' ? '#eef8ff' : '#fff1ce';
    const edge = currentTheme === 'office' ? '#6400e8' : currentTheme === 'outdoors' ? '#6876bb' : '#f400a1';
    line({ x: platform[0], y: platform[1] }, { x: platform[2], y: platform[3] }, '#4d2376', 34);
    line({ x: platform[0], y: platform[1] }, { x: platform[2], y: platform[3] }, top, 23);
    line({ x: platform[0], y: platform[1] }, { x: platform[2], y: platform[3] }, edge, 5);
  }
  for (const hazard of hazards) {
    const sx = hazard.stage === 2 ? 362 : hazard.stage === 1 ? 1086 : 362;
    const sy = hazard.stage === 2 ? 724 : 362;
    x.save();
    x.translate(hazard.x - cam + 18, hazard.y - 29);
    if (hazard.stage === 2) x.rotate(frame * .14);
    x.drawImage(img['pickups-enemies-atlas'], sx, sy, 362, 362, -31, -31, 62, 62);
    x.restore();
  }
  for (const pickup of pickups) {
    if (pickup.taken) continue;
    const sx = pickup.type === 'ink' ? 1086 : pickup.type === 'heart' ? 362 : 0;
    const sy = pickup.type === 'heart' ? 0 : 0;
    const size = pickup.type === 'ink' ? 52 : pickup.type === 'heart' ? 40 : 48;
    if (pickup.type === 'star') {
      x.save();
      x.globalAlpha = .32 + .14 * Math.sin(frame * .12);
      x.fillStyle = '#ffd229';
      x.beginPath();
      x.arc(pickup.x - cam, pickup.y - 18, 30, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
    x.drawImage(img['pickups-enemies-atlas'], sx, sy, 362, 362, pickup.x - cam - size / 2, pickup.y - size + 4, size, size);
  }
  for (const stroke of strokes) {
    path(stroke.pts, '#6400e8', 18);
    path(stroke.pts, '#fff1ce', 7);
  }
  if (preview.length > 1) path(preview, '#f400a1', 9);
  const spriteFrame = p.vy < 0 ? 5 : p.vy > 160 ? 6 : p.ground ? Math.floor(frame / 8) % 4 : 4;
  const frameWidth = 1774 / 4;
  const frameHeight = 887 / 2;
  x.drawImage(img['robot-sheet'], (spriteFrame % 4) * frameWidth, Math.floor(spriteFrame / 4) * frameHeight, frameWidth, frameHeight, p.x - cam - 24, p.y - 34, 96, 96);
  if (mouse) x.drawImage(img.pencil, mouse.x - 7, mouse.y - 65, 68, 68);
}

function loop(now) {
  if (state !== 'playing' || paused) return;
  const delta = Math.min(.04, (now - last) / 1000);
  last = now;
  acc += delta;
  while (acc >= 1 / 120) {
    tick(1 / 120);
    acc -= 1 / 120;
  }
  frame += 1;
  draw();
  ui.ink.style.width = `${ink}%`;
  ui.inkValue.textContent = `${Math.ceil(ink)}/100`;
  ui.stage.textContent = theme() === 'office' ? 'CREATIVE OFFICE' : theme() === 'outdoors' ? 'WINTER OUTDOORS' : 'HOLIDAY WORKSHOP';
  ui.meters.textContent = `${Math.floor(dist)} m · ${score} pts`;
  ui.lives.style.visibility = 'visible';
  ui.lives.textContent = '♥ '.repeat(lives);
  requestAnimationFrame(loop);
}
