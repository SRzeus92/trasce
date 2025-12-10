import { store } from '../state/store.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { navigate } from '../router.js';

export function renderHistory() {
  const { gameHistory } = store.getState();
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center relative">
      ${renderHeader()}
      <div class="bg-gray-800 p-8 rounded-lg shadow-lg max-w-4xl w-full">
        <h2 class="text-3xl font-bold text-white mb-6 text-center">Cronologia Partite</h2>
        <div class="space-y-2 max-h-96 overflow-y-auto">
          ${gameHistory.map(g => `
            <div class=\"bg-gray-700 p-4 rounded flex justify-between items-center\">
              <div class=\"flex items-center space-x-4\">
                <div class=\"w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center\"><span class=\"text-white font-bold\">${g.result === 'Vittoria' ? 'W' : 'L'}</span></div>
                <div><span class=\"text-white\">vs ${g.opponent}</span><div class=\"text-gray-400 text-sm\">${g.date}</div></div>
              </div>
              <div class=\"flex items-center space-x-4\">
                <span class=\"text-white font-mono text-lg\">${g.score}</span>
                <span class=\"px-3 py-1 rounded ${g.result === 'Vittoria' ? 'bg-green-500' : 'bg-red-500'} text-white\">${g.result}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <button id="backToProfileBtn" class="w-full mt-6 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg text-white">Torna al Profilo</button>
      </div>
    </div>
  `;
  document.getElementById('backToProfileBtn')?.addEventListener('click', () => navigate('profile'));
  setupHeaderEvents();
}

