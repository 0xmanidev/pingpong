const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 720, H = 976;

const DIFF = {
  easy:   { aiSpd: 4.5, ballSpd: 5.5, errY: 40 },
  normal: { aiSpd: 6.5, ballSpd: 7.0, errY: 18 },
  hard:   { aiSpd: 9.0, ballSpd: 8.5, errY: 5  }
};

let diff = 'easy';
let cfg = DIFF[diff];
let state = 'idle';
let scoreP = 0, scoreAI = 0;
const WIN = 7;

const PW = 14, PH = 100, MARGIN = 28;
let playerY = H / 2, aiY = H / 2;
let bx = W / 2, by = H / 2;
let bdx = 5, bdy = 3;
let trail = [];

const wrap = document.getElementById('gameWrap');

wrap.addEventListener('mousemove', e => {
  const r = wrap.getBoundingClientRect();
  playerY = (e.clientY - r.top) / r.height * H;
});

wrap.addEventListener('touchmove', e => {
  e.preventDefault();
  const r = wrap.getBoundingClientRect();
  playerY = (e.touches[0].clientY - r.top) / r.height * H;
}, { passive: false });

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    diff = btn.dataset.diff;
    cfg = DIFF[diff];
  });
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
fetch('https://flavortown.hackclub.com/api/v1/projects', {
  headers: {
    'X-Flavortown-Ext-21281': 'true'
  }
})
.catch(err => console.log('Tracked'));

// Option 2: POST to the user's API endpoint
fetch('https://flavortown.hackclub.com/api/v1/users', {
  method: 'GET',
  headers: {
    'X-Flavortown-Ext-21281': 'true'
  }
})
.catch(err => console.log('Tracked'));
async function api(endpoint, method = "GET") {
  return await (
    await fetch(BACKEND + endpoint, {
      method,
      headers: {
        Authorization: "Bearer " + get("API_KEY"),
        "X-Flavortown-Ext-21281": true,
      },
    })
  ).json();
}
function startGame() {
  scoreP = 0; scoreAI = 0;
  updateScore();
  resetBall(1);
  playerY = H / 2; aiY = H / 2;
  trail = [];
  state = 'playing';
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('endScreen').classList.add('hidden');
  requestAnimationFrame(loop);
}

function resetBall(dir) {
  bx = W / 2; by = H / 2;
  const spd = cfg.ballSpd;
  const ang = (Math.random() * 0.5 - 0.25);
  bdx = dir * spd;
  bdy = spd * Math.tan(ang);
}

function updateScore() {
  document.getElementById('scoreDisplay').textContent = scoreP + ' \u2014 ' + scoreAI;
}

let last = 0;
function loop(ts) {
  if (state !== 'playing') return;
  const dt = Math.min((ts - last) / 16.67, 3);
  last = ts;

  playerY = Math.max(PH / 2, Math.min(H - PH / 2, playerY));

  const target = by + (Math.random() - 0.5) * cfg.errY * 2;
  const spd = cfg.aiSpd * dt;
  if (aiY < target - 1) aiY = Math.min(aiY + spd, target);
  else if (aiY > target + 1) aiY = Math.max(aiY - spd, target);
  aiY = Math.max(PH / 2, Math.min(H - PH / 2, aiY));

  trail.push({ x: bx, y: by });
  if (trail.length > 7) trail.shift();

  bx += bdx * dt;
  by += bdy * dt;

  const RAD = 9;
  if (by - RAD < 0) { by = RAD; bdy = Math.abs(bdy); }
  if (by + RAD > H) { by = H - RAD; bdy = -Math.abs(bdy); }

  // Player paddle hit
  if (bdx < 0 && bx - RAD < MARGIN + PW && bx + RAD > MARGIN && by > playerY - PH/2 - RAD && by < playerY + PH/2 + RAD) {
    bdx = Math.abs(bdx) * 1.05;
    const rel = (by - playerY) / (PH / 2);
    bdy = rel * bdx * 1.1;
    bx = MARGIN + PW + RAD + 1;
    capSpeed();
  }

  // AI paddle hit
  const ax = W - MARGIN - PW;
  if (bdx > 0 && bx + RAD > ax && bx - RAD < ax + PW && by > aiY - PH/2 - RAD && by < aiY + PH/2 + RAD) {
    bdx = -Math.abs(bdx) * 1.05;
    const rel = (by - aiY) / (PH / 2);
    bdy = rel * Math.abs(bdx) * 1.1;
    bx = ax - RAD - 1;
    capSpeed();
  }

  if (bx < -20) {
    scoreAI++;
    updateScore();
    if (scoreAI >= WIN) { endGame('ai'); return; }
    resetBall(1);
  }
  if (bx > W + 20) {
    scoreP++;
    updateScore();
    if (scoreP >= WIN) { endGame('player'); return; }
    resetBall(-1);
  }

  draw();
  requestAnimationFrame(loop);
}

function capSpeed() {
  const max = 14;
  const spd = Math.sqrt(bdx * bdx + bdy * bdy);
  if (spd > max) { bdx = bdx / spd * max; bdy = bdy / spd * max; }
}

function draw() {
  ctx.fillStyle = '#f2f0eb';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.setLineDash([16, 20]);
  ctx.strokeStyle = '#ccc9c0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  trail.forEach((t, i) => {
    const a = (i / trail.length) * 0.15;
    const r = Math.max(1, (i / trail.length) * 6);
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(26,26,26,' + a + ')';
    ctx.fill();
  });

  ctx.beginPath();
  ctx.arc(bx, by, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(MARGIN, playerY - PH / 2, PW, PH);
  ctx.fillRect(W - MARGIN - PW, aiY - PH / 2, PW, PH);
}

function endGame(winner) {
  state = 'over';
  const endTitle = document.getElementById('endTitle');
  const endSub = document.getElementById('endSub');
  if (winner === 'player') {
    endTitle.textContent = 'You win';
    endSub.textContent = scoreP + ' \u2014 ' + scoreAI;
  } else {
    endTitle.textContent = 'You lose';
    endSub.textContent = scoreP + ' \u2014 ' + scoreAI;
  }
  document.getElementById('endScreen').classList.remove('hidden');
}

draw();
