import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { navigate } from '../router.js';
import { store } from '../state/store.js';

type Player = { name: string; isAI: boolean };

export function renderTournament() {
  const app = document.getElementById('app');
  if (!app) return;
  const t = store.getState().tournament;
  if (!t) {
    // Setup view
    app.innerHTML = `
      <div class="min-h-screen bg-gray-900 flex items-center justify-center relative">
        ${renderHeader()}
        <div class="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-xl text-white">
          <h2 class="text-2xl font-bold mb-4 text-center">Crea Torneo (4 giocatori)</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-300 mb-1">Numero di AI (0-3)</label>
              <input id="aiCount" type="number" min="0" max="3" value="1" class="w-full p-2 bg-gray-700 rounded" />
              <p id="aiHint" class="text-xs text-gray-400 mt-1"></p>
            </div>
            <div>
              <label class="block text-sm text-gray-300 mb-1">Nomi Player Locali (oltre all'utente corrente)</label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input id="p1" type="text" placeholder="Player 1" class="p-2 bg-gray-700 rounded" />
                <input id="p2" type="text" placeholder="Player 2" class="p-2 bg-gray-700 rounded" />
                <input id="p3" type="text" placeholder="Player 3" class="p-2 bg-gray-700 rounded" />
                <input id="p4" type="text" placeholder="Player 4" class="p-2 bg-gray-700 rounded" />
              </div>
              <p class="text-xs text-gray-400 mt-1">Almeno 1 giocatore locale è richiesto (tu). I campi visibili dipendono dal numero di AI.</p>
            </div>
            <div class="flex space-x-3">
              <button id="startTournamentBtn" class="flex-1 bg-green-600 hover:bg-green-500 py-2 rounded">Avvia</button>
              <button id="backHomeBtn" class="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded">Home</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const updateInputs = () => {
      const aiCount = Math.max(0, Math.min(3, parseInt((document.getElementById('aiCount') as HTMLInputElement).value || '0', 10)));
      const extraLocalsAllowed = Math.max(0, 4 - aiCount - 1); // minus current user
      const ids = ['p1', 'p2', 'p3', 'p4'];
      ids.forEach((id, idx) => {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (!el) return;
        if (idx < extraLocalsAllowed) {
          el.parentElement?.classList.remove('hidden');
          el.classList.remove('hidden');
        } else {
          el.value = '';
          el.classList.add('hidden');
        }
      });
      const hint = document.getElementById('aiHint');
      if (hint) hint.textContent = `Puoi inserire fino a ${extraLocalsAllowed} nomi locali oltre a te.`;
    };

    (document.getElementById('aiCount') as HTMLInputElement)?.addEventListener('input', updateInputs);
    updateInputs();

    document.getElementById('startTournamentBtn')?.addEventListener('click', () => {
      const aiCount = Math.max(0, Math.min(3, parseInt((document.getElementById('aiCount') as HTMLInputElement).value || '0', 10)));
      const extraLocalsAllowed = Math.max(0, 4 - aiCount - 1);
      const visibleInputs = ['p1', 'p2', 'p3', 'p4']
        .map((id, idx) => ({ el: document.getElementById(id) as HTMLInputElement, idx }))
        .filter(x => !!x.el && !x.el.classList.contains('hidden'))
        .slice(0, extraLocalsAllowed);
      const localNames = visibleInputs.map((x) => {
        const val = (x.el.value || '').trim();
        // Defaults: Player 2, Player 3, ... relative to position
        const defaultNum = x.idx + 2;
        return val || `Player ${defaultNum}`;
      });

      // Build players: current user + provided locals + AIs to fill
      const me = store.getState().currentUser || 'Player 1';
      const locals: Player[] = [{ name: me, isAI: false }, ...localNames.map(n => ({ name: n, isAI: false }))];
      const toFill = Math.max(0, 4 - locals.length);
      const aiPlayers: Player[] = Array.from({ length: Math.min(aiCount, toFill) }, (_, i) => ({ name: `AI ${i + 1}`, isAI: true }));
      let players: Player[] = [...locals, ...aiPlayers];
      while (players.length < 4) players.push({ name: `AI ${players.length - locals.length + 1}`, isAI: true });
      players = players.sort(() => Math.random() - 0.5);
      store.setState({ tournament: { players, round: 'semifinals', semifinalWinners: [null, null] } });
      renderTournament();
    });
    document.getElementById('backHomeBtn')?.addEventListener('click', () => navigate('home'));
    setupHeaderEvents();
    return;
  }

  // Bracket view
  const [a, b, c, d] = t.players;
  const s1 = t.semifinalWinners[0];
  const s2 = t.semifinalWinners[1];
  const finalReady = s1 && s2;
  app.innerHTML = `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center relative">
      ${renderHeader()}
      <div class="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl text-white">
        <h2 class="text-2xl font-bold mb-4 text-center">Torneo - Bracket</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-4">
            <div class="bg-gray-700 p-4 rounded">
              <div class="font-semibold">Semifinale 1</div>
              <div class="mt-2 text-sm">${a.name} ${a.isAI ? '(AI)' : ''} vs ${b.name} ${b.isAI ? '(AI)' : ''}</div>
              <div class="mt-3 flex space-x-2">
                ${s1 ? `<span class=\"text-green-400\">Vincitore: ${s1.name}</span>` : `<button id=\"playS1\" class=\"bg-green-600 hover:bg-green-500 px-3 py-1 rounded\">Gioca</button>`}
              </div>
            </div>
            <div class="bg-gray-700 p-4 rounded">
              <div class="font-semibold">Semifinale 2</div>
              <div class="mt-2 text-sm">${c.name} ${c.isAI ? '(AI)' : ''} vs ${d.name} ${d.isAI ? '(AI)' : ''}</div>
              <div class="mt-3 flex space-x-2">
                ${s2 ? `<span class=\"text-green-400\">Vincitore: ${s2.name}</span>` : `<button id=\"playS2\" class=\"bg-green-600 hover:bg-green-500 px-3 py-1 rounded\">Gioca</button>`}
              </div>
            </div>
          </div>
          <div class="md:col-span-1 flex items-center justify-center">
            <div class="text-gray-400">→</div>
          </div>
          <div class="bg-gray-700 p-4 rounded">
            <div class="font-semibold">Finale</div>
            <div class="mt-2 text-sm">${s1 ? s1.name : '—'} vs ${s2 ? s2.name : '—'}</div>
            <div class="mt-3 flex space-x-2">
              ${finalReady ? `<button id=\"playFinal\" class=\"bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded\">Gioca Finale</button>` : '<span class="text-gray-400">In attesa semifinali</span>'}
            </div>
          </div>
        </div>
        <div class="mt-6 text-center">
          <button id="resetTournamentBtn" class="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded">Nuovo Torneo</button>
          <button id="backHomeBtn2" class="ml-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded">Home</button>
        </div>
      </div>
    </div>
  `;

  const playMatch = (p1: Player, p2: Player, placeWinner: (w: Player) => void) => {
    // AI vs AI -> simulate
    if (p1.isAI && p2.isAI) {
      const w = Math.random() < 0.5 ? p1 : p2;
      placeWinner(w);
      renderTournament();
      return;
    }

    // Determine who plays on which side
    // In game.ts: left = Player 1 (human in AI mode), right = Player 2 (AI in AI mode)
    // For PvP: left = first player, right = second player
    // For AI mode: human is always left, AI is always right

    let leftPlayer: Player, rightPlayer: Player;

    if (p1.isAI || p2.isAI) {
      // AI mode: human on left, AI on right
      leftPlayer = p1.isAI ? p2 : p1;
      rightPlayer = p1.isAI ? p1 : p2;
    } else {
      // PvP mode: p1 on left, p2 on right
      leftPlayer = p1;
      rightPlayer = p2;
    }

    // Play game with locked mode
    store.setState({
      gameConfig: {
        lockedMode: p1.isAI || p2.isAI ? 'ai' : 'pvp',
        playerNames: { left: leftPlayer.name, right: rightPlayer.name },
        onGameEnd: (winnerSide) => {
          const winner = winnerSide === 'left' ? leftPlayer : rightPlayer;
          placeWinner(winner);
          navigate('tournament');
        }
      }
    });
    navigate('game');
  };

  document.getElementById('playS1')?.addEventListener('click', () => playMatch(a, b, (w) => {
    const t0 = store.getState().tournament!;
    store.setState({ tournament: { ...t0, semifinalWinners: [w, t0.semifinalWinners[1]] } });
  }));
  document.getElementById('playS2')?.addEventListener('click', () => playMatch(c, d, (w) => {
    const t0 = store.getState().tournament!;
    store.setState({ tournament: { ...t0, semifinalWinners: [t0.semifinalWinners[0], w] } });
  }));
  document.getElementById('playFinal')?.addEventListener('click', () => {
    if (!s1 || !s2) return;
    playMatch(s1, s2, (w) => {
      alert(`Vincitore del torneo: ${w.name}`);
      store.setState({ tournament: undefined });
      navigate('home');
    });
  });
  document.getElementById('resetTournamentBtn')?.addEventListener('click', () => { store.setState({ tournament: undefined }); renderTournament(); });
  document.getElementById('backHomeBtn2')?.addEventListener('click', () => navigate('home'));
  setupHeaderEvents();
}


