import { renderHeader, setupHeaderEvents } from '../../components/header.js';
import { navigate } from '../../router.js';
import { store } from '../../state/store.js';

type Mode = 'pvp' | 'ai';

export function renderGame(params?: any) {
  if (!store.getState().isLoggedIn) return navigate('login');
  const app = document.getElementById('app');
  if (!app) return;

  const cfg = store.getState().gameConfig;
  const leftPlayerName = cfg?.playerNames?.left || 'Player 1';
  const rightPlayerName = cfg?.playerNames?.right || 'Player 2';

  app.innerHTML = `
    <div class="min-h-screen bg-gray-900 flex flex-col items-center justify-center relative">
      ${renderHeader()}
      <div class="text-white text-center mb-4">
        <h2 class="text-4xl font-bold mb-2">PONG</h2>
        <p class="text-green-400">Giocando come: ${store.getState().currentUser}</p>
      </div>
  <div class="flex items-center space-x-3 mb-4">
        <label class="text-white">Modalità:</label>
        <select id="modeSelect" class="bg-gray-800 text-white p-2 rounded">
          <option value="pvp">1v1 Locale</option>
          <option value="ai">1vAI Locale</option>
        </select>
        <button id="restartBtn" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded">Restart</button>
      </div>
  <div id="gameContainer" class="relative w-fit mx-auto">
      <div class="flex items-center justify-center text-white mb-2 space-x-6">
        <div class="flex items-center space-x-2"><span class="text-sm text-gray-300">${leftPlayerName}</span><span id="scoreLeft" class="text-3xl font-bold">0</span></div>
        <div class="text-gray-500">|</div>
        <div class="flex items-center space-x-2"><span class="text-sm text-gray-300">${rightPlayerName}</span><span id="scoreRight" class="text-3xl font-bold">0</span></div>
      </div>
      <canvas id="pongCanvas" width="800" height="400" class="bg-black border-2 border-white mb-4"></canvas>
    </div>
      <div class="flex space-x-4">
        <button id="backHomeBtn2" class="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg text-white font-semibold">Torna alla Home</button>
        <button id="logoutBtn2" class="bg-red-500 hover:bg-red-600 px-6 py-3 rounded-lg text-white font-semibold">Logout</button>
      </div>
    </div>
  `;

  const canvas = document.getElementById('pongCanvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  let mode: Mode = 'pvp';
  if (cfg?.lockedMode) mode = cfg.lockedMode;

  const keys: Record<string, boolean> = {};
  window.addEventListener('keydown', (e) => (keys[e.key] = true));
  window.addEventListener('keyup', (e) => (keys[e.key] = false));

  const field = { w: canvas.width, h: canvas.height };
  const paddleW = 12;
  const paddleH = 80;
  const left = { x: 20, y: field.h / 2 - paddleH / 2, vy: 0 };
  const right = { x: field.w - 20 - paddleW, y: field.h / 2 - paddleH / 2, vy: 0 };
  const ball = { x: field.w / 2, y: field.h / 2, vx: 4, vy: 3, r: 8 };
  const speed = 6;

  let leftScore = 0;
  let rightScore = 0;
  const targetScore = 5;
  let gameOver = false;

  const scoreLeftEl = document.getElementById('scoreLeft');
  const scoreRightEl = document.getElementById('scoreRight');

  function updateScore() {
    if (scoreLeftEl) scoreLeftEl.textContent = String(leftScore);
    if (scoreRightEl) scoreRightEl.textContent = String(rightScore);
  }

  function reset() {
    left.y = field.h / 2 - paddleH / 2;
    right.y = field.h / 2 - paddleH / 2;
    ball.x = field.w / 2;
    ball.y = field.h / 2;
    ball.vx = Math.random() > 0.5 ? 4 : -4;
    ball.vy = (Math.random() * 4 + 2) * (Math.random() > 0.5 ? 1 : -1);
  }

  async function saveMatchResult(userScore: number, opponentScore: number, opponentName: string) {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const endpoint = mode === 'ai' ? '/api/matches/ai' : '/api/matches';
      const body = mode === 'ai'
        ? { user_score: userScore, opponent_score: opponentScore }
        : { opponent_alias: opponentName, user_score: userScore, opponent_score: opponentScore };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        console.log('Match saved successfully');
      } else {
        console.error('Failed to save match:', await res.text());
      }
    } catch (err) {
      console.error('Error saving match:', err);
    }
  }

  function endGame(winner: 'left' | 'right') {
    if (gameOver) return;
    gameOver = true;
    cancelAnimationFrame(raf);

    // Save match result to history
    const opponentName = mode === 'ai' ? 'AI' : 'Player 2';
    saveMatchResult(leftScore, rightScore, opponentName);

    // Overlay message
    const overlay = document.createElement('div');
    overlay.id = 'winOverlay';
    overlay.className = 'absolute inset-0 bg-black/80 flex items-center justify-center z-10';
    const hasCb = typeof cfg?.onGameEnd === 'function';
    overlay.innerHTML = `
      <div class="bg-gray-800 p-6 rounded-lg text-white text-center w-80 space-y-4">
        <h3 class="text-2xl font-bold">${winner === 'left' ? 'Player 1' : 'Player 2'} ha vinto!</h3>
        <p class="text-gray-300">Punteggio finale: Player 1 ${leftScore} - ${rightScore} Player 2</p>
        <div class="flex space-x-3">
          ${hasCb ? '<button id="continueTournamentBtn" class="flex-1 bg-green-600 hover:bg-green-500 py-2 rounded">Continua</button>' : '<button id="restartGameBtn" class="flex-1 bg-green-600 hover:bg-green-500 py-2 rounded">Rivincita</button>'}
          <button id="backHomeFromGameBtn" class="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded">Home</button>
        </div>
      </div>
    `;
    const container = document.getElementById('gameContainer');
    (container || document.body).appendChild(overlay);
    document.getElementById('restartGameBtn')?.addEventListener('click', () => {
      overlay.remove();
      leftScore = 0; rightScore = 0; updateScore();
      reset();
      gameOver = false;
      loop();
    });
    document.getElementById('continueTournamentBtn')?.addEventListener('click', () => {
      overlay.remove();
      const winSide = winner;
      const l = leftScore; const r = rightScore;
      const cb = cfg?.onGameEnd;
      // clear config before callback to avoid reuse
      store.setState({ gameConfig: undefined });
      cb && cb(winSide, l, r);
    });
    document.getElementById('backHomeFromGameBtn')?.addEventListener('click', () => {
      overlay.remove();
      navigate('home');
    });
  }

  function update() {
    if (gameOver) return;
    // Controls
    left.vy = (keys['w'] ? -speed : 0) + (keys['s'] ? speed : 0);
    if (mode === 'pvp') {
      right.vy = (keys['ArrowUp'] ? -speed : 0) + (keys['ArrowDown'] ? speed : 0);
    } else {
      // Defeatable AI: lower max speed, reaction delay and small noise
      const aiMaxSpeed = 4; // slower than player
      const reactionFrames = 4; // update roughly every N frames
      const frameBucket = Math.floor((ball.x + ball.y) / 10);
      if (frameBucket % reactionFrames === 0) {
        const noise = (Math.random() - 0.5) * 12;
        const target = ball.y + noise - paddleH / 2;
        const diff = target - right.y;
        right.vy = Math.max(-aiMaxSpeed, Math.min(aiMaxSpeed, diff * 0.2));
      }
    }
    left.y = Math.max(0, Math.min(field.h - paddleH, left.y + left.vy));
    right.y = Math.max(0, Math.min(field.h - paddleH, right.y + right.vy));

    // Ball
    ball.x += ball.vx;
    ball.y += ball.vy;
    if (ball.y - ball.r < 0 || ball.y + ball.r > field.h) ball.vy *= -1;

    // Collisions paddles
    if (ball.x - ball.r < left.x + paddleW && ball.y > left.y && ball.y < left.y + paddleH) {
      ball.x = left.x + paddleW + ball.r;
      ball.vx = Math.abs(ball.vx);
      const offset = (ball.y - (left.y + paddleH / 2)) / (paddleH / 2);
      ball.vy = offset * 5;
    }
    if (ball.x + ball.r > right.x && ball.y > right.y && ball.y < right.y + paddleH) {
      ball.x = right.x - ball.r;
      ball.vx = -Math.abs(ball.vx);
      const offset = (ball.y - (right.y + paddleH / 2)) / (paddleH / 2);
      ball.vy = offset * 5;
    }

    // Goal detection
    if (ball.x < -20) {
      rightScore += 1;
      updateScore();
      if (rightScore >= targetScore) { endGame('right'); return; }
      reset();
    } else if (ball.x > field.w + 20) {
      leftScore += 1;
      updateScore();
      if (leftScore >= targetScore) { endGame('left'); return; }
      reset();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, field.w, field.h);
    // Middle line
    ctx.strokeStyle = '#444';
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.moveTo(field.w / 2, 0);
    ctx.lineTo(field.w / 2, field.h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.fillStyle = '#fff';
    ctx.fillRect(left.x, left.y, paddleW, paddleH);
    ctx.fillRect(right.x, right.y, paddleW, paddleH);

    // Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
  }

  let raf = 0;
  function loop() {
    if (gameOver) return;
    update();
    draw();
    if (!gameOver) raf = requestAnimationFrame(loop);
  }
  reset();
  updateScore();
  loop();

  const modeSelect = document.getElementById('modeSelect') as HTMLSelectElement | null;
  if (cfg?.lockedMode && modeSelect) {
    modeSelect.value = cfg.lockedMode;
    modeSelect.disabled = true;
  }
  // Hide restart button in tournament mode
  if (cfg?.onGameEnd) {
    document.getElementById('restartBtn')?.classList.add('hidden');
  }
  modeSelect?.addEventListener('change', (e) => {
    mode = ((e.target as HTMLSelectElement).value as Mode) || 'pvp';
    // Full restart on mode switch
    leftScore = 0; rightScore = 0; updateScore();
    gameOver = false;
    const existing = document.getElementById('winOverlay');
    existing?.remove();
    cancelAnimationFrame(raf);
    reset();
    loop();
  });
  document.getElementById('restartBtn')?.addEventListener('click', () => reset());
  document.getElementById('backHomeBtn2')?.addEventListener('click', () => {
    cancelAnimationFrame(raf);
    navigate('home');
  });
  document.getElementById('logoutBtn2')?.addEventListener('click', () => {
    cancelAnimationFrame(raf);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    store.setState({
      isLoggedIn: false,
      currentUser: '',
      userAvatar: '/default-avatar.png',
      userEmail: '',
      currentUserId: null,
      gameHistory: [],
      friends: [],
      friendRequests: []
    });
    navigate('home');
  });
  setupHeaderEvents();
}

