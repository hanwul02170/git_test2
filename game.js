'use strict';

// Rendering-independent rules keep time, movement and collisions consistent across devices.
class RibbonShooter {
  constructor(random = Math.random) {
    this.random = random;
    this.state = 'idle';
    this.reset();
  }
  reset() {
    this.score = 0;
    this.lives = 3;
    this.remaining = 45;
    this.x = 400;
    this.bullets = [];
    this.bubbles = [];
    this.particles = [];
    this.shotClock = 0;
    this.spawnClock = 0.6;
    this.elapsed = 0;
  }
  start() { this.reset(); this.state = 'running'; }
  pause() { if (this.state === 'running') this.state = 'paused'; }
  resume() { if (this.state === 'paused') this.state = 'running'; }
  moveTo(x) { this.x = Math.max(30, Math.min(770, x)); }
  update(dt, direction = 0) {
    if (this.state !== 'running' || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    this.elapsed += dt;
    this.remaining = Math.max(0, this.remaining - dt);
    this.moveTo(this.x + direction * 420 * dt);
    this.shotClock -= dt;
    this.spawnClock -= dt;
    if (this.shotClock <= 0) {
      this.bullets.push({x: this.x, y: 408});
      this.shotClock += 0.19;
    }
    if (this.spawnClock <= 0) {
      this.bubbles.push({x: 30 + this.random() * 740, y: -24, radius: 19 + this.random() * 6, speed: 58 + this.elapsed * 1.2 + this.random() * 25, phase: this.random() * Math.PI * 2});
      this.spawnClock += Math.max(0.35, 0.85 - this.elapsed * 0.01);
    }
    for (const bullet of this.bullets) bullet.y -= 520 * dt;
    for (const bubble of this.bubbles) {
      bubble.y += bubble.speed * dt;
      for (const bullet of this.bullets) {
        if (bullet.hit || bubble.hit) continue;
        if (Math.hypot(bullet.x - bubble.x, bullet.y - bubble.y) < bubble.radius + 9) {
          bullet.hit = true;
          bubble.hit = true;
          this.score += 10;
          for (let i = 0; i < 7; i++) this.particles.push({x: bubble.x, y: bubble.y, vx: (this.random() - 0.5) * 140, vy: (this.random() - 0.5) * 140, life: 0.5});
        }
      }
      if (!bubble.hit && (bubble.y > 480 + bubble.radius || Math.hypot(bubble.x - this.x, bubble.y - 435) < bubble.radius + 20)) {
        bubble.hit = true;
        this.lives = Math.max(0, this.lives - 1);
      }
    }
    this.bullets = this.bullets.filter(b => !b.hit && b.y > -20);
    this.bubbles = this.bubbles.filter(b => !b.hit);
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    if (this.lives === 0 || this.remaining === 0) this.state = 'over';
  }
}

(() => {
  const canvas = document.querySelector('#game-canvas');
  const ctx = canvas.getContext('2d');
  const start = document.querySelector('#game-start');
  const pause = document.querySelector('#game-pause');
  const overlay = document.querySelector('#game-overlay');
  const title = document.querySelector('#game-overlay-title');
  const copy = document.querySelector('#game-overlay-copy');
  const status = document.querySelector('#game-status');
  if (!ctx) {
    start.disabled = true;
    copy.textContent = '이 브라우저에서는 게임을 실행할 수 없어요.';
    return;
  }
  const game = new RibbonShooter();
  let best = 0;
  try { const saved = Number(localStorage.getItem('haneul-shooter-best')); if (Number.isFinite(saved) && saved > 0) best = saved; } catch {}
  const keys = new Set();
  const held = {left: false, right: false};
  let dragId = null;
  let frame = 0;
  let last = 0;

  function heart(x, y, size, color) {
    ctx.save();ctx.translate(x, y);ctx.scale(size / 20, size / 20);
    ctx.fillStyle = color;ctx.beginPath();ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-22, -5, -10, -19, 0, -8);
    ctx.bezierCurveTo(10, -19, 22, -5, 0, 8);ctx.fill();ctx.restore();
  }
  function bow(x, y) {
    ctx.save();ctx.translate(x, y);ctx.lineWidth = 2.5;ctx.strokeStyle = '#b74675';ctx.fillStyle = '#ee91b6';
    ctx.beginPath();ctx.moveTo(-3, 0);ctx.bezierCurveTo(-44, -32, -47, 31, -4, 9);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(3, 0);ctx.bezierCurveTo(44, -32, 47, 31, 4, 9);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(0, 4, 10, 12, 0, 0, Math.PI * 2);ctx.fill();ctx.stroke();ctx.restore();
  }
  function draw() {
    ctx.clearRect(0, 0, 800, 480);
    const background = ctx.createLinearGradient(0, 0, 0, 480);
    background.addColorStop(0, '#fff7fb');background.addColorStop(1, '#f8d8e9');
    ctx.fillStyle = background;ctx.fillRect(0, 0, 800, 480);
    ctx.fillStyle = '#eac1d6';
    for (let i = 0; i < 45; i++) { const x = (i * 163 + 28) % 800; const y = (i * 97 + 18 + game.elapsed * 9) % 480; ctx.beginPath();ctx.arc(x, y, i % 3 === 0 ? 2 : 1, 0, Math.PI * 2);ctx.fill(); }
    ctx.strokeStyle = '#e8b8ce';ctx.setLineDash([5, 8]);ctx.beginPath();ctx.moveTo(0, 465);ctx.lineTo(800, 465);ctx.stroke();ctx.setLineDash([]);
    for (const bubble of game.bubbles) {
      ctx.fillStyle = '#fff9fccc';ctx.strokeStyle = '#df94b4';ctx.lineWidth = 2;
      ctx.beginPath();ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);ctx.fill();ctx.stroke();
      heart(bubble.x, bubble.y + 2, 12, '#e8a0bf');
      ctx.fillStyle = '#fff';ctx.beginPath();ctx.arc(bubble.x - 7, bubble.y - 8, 4, 0, Math.PI * 2);ctx.fill();
    }
    for (const bullet of game.bullets) heart(bullet.x, bullet.y, 13, '#d65c91');
    for (const particle of game.particles) { ctx.globalAlpha = Math.max(0, particle.life * 2);heart(particle.x, particle.y, 7, '#df75a2'); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#dca3c030';ctx.beginPath();ctx.ellipse(game.x, 457, 38, 8, 0, 0, Math.PI * 2);ctx.fill();
    bow(game.x, 433);
  }
  function scoreboard() {
    document.querySelector('#game-score').textContent = game.score;
    document.querySelector('#game-best').textContent = best;
    document.querySelector('#game-time').textContent = Math.ceil(game.remaining);
    document.querySelector('#game-lives').textContent = game.lives;
  }
  function clearControls() { keys.clear();held.left = false;held.right = false;dragId = null; }
  function showOverlay(heading, message, label) { title.textContent = heading;copy.textContent = message;start.textContent = label;overlay.hidden = false; }
  function finish() {
    clearControls();pause.disabled = true;
    let saved = true;
    if (game.score > best) {
      best = game.score;
      try {localStorage.setItem('haneul-shooter-best', String(best));}catch{saved = false;}
    }
    scoreboard();
    showOverlay(game.lives === 0 ? 'Nice try, sweetheart ♡' : 'You did it! ♡', `이번 점수 ${game.score}점 · 최고 기록 ${best}점`, '다시 도전하기 ↻');
    status.textContent = saved ? '한 판 더? 다시 도전해서 기록을 높여봐요!' : '기록은 이번 화면에만 유지돼요. 브라우저 저장 공간을 확인해 주세요.';
  }
  function tick(time) {
    frame = 0;
    if (game.state !== 'running') return;
    const dt = last ? (time - last) / 1000 : 0;
    last = time;
    const left = held.left || keys.has('arrowleft') || keys.has('a');
    const right = held.right || keys.has('arrowright') || keys.has('d');
    game.update(dt, Number(right) - Number(left));draw();scoreboard();
    if (game.state === 'over') finish();
    else frame = requestAnimationFrame(tick);
  }
  function run() {
    overlay.hidden = true;pause.disabled = false;pause.textContent = '일시정지';
    status.textContent = '하트 자동 발사 중! 방울을 놓치지 않게 움직여요. ♡';
    last = 0;
    if (!frame) frame = requestAnimationFrame(tick);
    canvas.focus({preventScroll: true});
  }
  function pauseGame() {
    if (game.state !== 'running') return;
    game.pause();clearControls();cancelAnimationFrame(frame);frame = 0;
    showOverlay('Take a little break ♡', '준비되면 이어서 플레이해요.', '계속하기 ♡');
    pause.textContent = '계속하기';status.textContent = '게임을 잠시 멈췄어요.';
  }
  start.addEventListener('click', () => { if (game.state === 'paused') game.resume();else game.start();clearControls();run(); });
  pause.addEventListener('click', () => { if (game.state === 'running') pauseGame();else if (game.state === 'paused') {game.resume();run();} });
  const frameElement = document.querySelector('#game-frame');
  frameElement.addEventListener('keydown', event => {
    if (/^(INPUT|TEXTAREA)$/.test(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'a', 'd'].includes(key) && game.state === 'running') {event.preventDefault();keys.add(key);}
    if (key === 'p' && !event.repeat) {event.preventDefault();if (game.state === 'running') pauseGame();else if (game.state === 'paused') {game.resume();run();}}
  });
  window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  frameElement.addEventListener('focusout', event => {if (!frameElement.contains(event.relatedTarget)) pauseGame();});
  window.addEventListener('blur', pauseGame);
  document.addEventListener('visibilitychange', () => {if (document.hidden) pauseGame();});
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {if (!entries[0].isIntersecting) pauseGame();}).observe(canvas);
  function movePointer(event) { const bounds = canvas.getBoundingClientRect();game.moveTo((event.clientX - bounds.left) * 800 / bounds.width);draw(); }
  canvas.addEventListener('pointerdown', event => {if (game.state !== 'running') return;dragId = event.pointerId;canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll: true});movePointer(event);});
  canvas.addEventListener('pointermove', event => {if (dragId === event.pointerId && game.state === 'running') movePointer(event);});
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, () => {dragId = null;});
  for (const [id, direction] of [['move-left', 'left'], ['move-right', 'right']]) {
    const button = document.querySelector('#' + id);
    button.addEventListener('pointerdown', event => {if (game.state !== 'running') return;held[direction] = true;button.setPointerCapture(event.pointerId);});
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => {held[direction] = false;});
    button.addEventListener('click', event => {if (event.detail === 0 && game.state === 'running') {game.moveTo(game.x + (direction === 'left' ? -45 : 45));draw();}});
  }
  draw();scoreboard();
})();
