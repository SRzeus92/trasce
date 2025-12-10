import { store } from '../state/store.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { showMessage } from '../components/message.js';
import { navigate } from '../router.js';

export function renderProfile() {
  const { isLoggedIn, currentUser, userAvatar, userEmail, friends, gameHistory } = store.getState();
  if (!isLoggedIn) return navigate('login');
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center relative">
      ${renderHeader()}
      <div class="bg-gray-800 p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <h2 class="text-3xl font-bold text-white mb-6 text-center">Il Mio Profilo</h2>
        <div id="message" class="hidden"></div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="flex flex-col items-center">
            <div class="relative group">
              <img src="${userAvatar}" alt="${currentUser}" class="w-32 h-32 rounded-full border-4 border-green-500 mb-4">
            </div>
            <button id="uploadAvatarBtn" class="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white text-sm">Cambia Avatar</button>
          </div>
          <div class="md:col-span-2 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <label class="text-gray-400 text-sm">Username</label>
                <div class="flex items-center space-x-2">
                  <span id="usernameDisplay" class="text-white text-lg">${currentUser}</span>
                  <button id="editUsernameBtn" class="text-blue-400 hover:text-blue-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                </div>
              </div>
              <div id="usernameEdit" class="hidden flex-1">
                <input type="text" id="usernameInput" value="${currentUser}" class="w-full p-2 bg-gray-700 text-white rounded">
                <div class="flex space-x-2 mt-2">
                  <button id="saveUsernameBtn" class="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-white text-sm">Salva</button>
                  <button id="cancelUsernameBtn" class="bg-gray-500 hover:bg-gray-600 px-3 py-1 rounded text-white text-sm">Annulla</button>
                </div>
              </div>
            </div>
            <div>
              <label class="text-gray-400 text-sm">Email</label>
              <p class="text-white">${userEmail}</p>
              <p class="text-gray-500 text-xs">L'email non può essere modificata</p>
            </div>
            <div class="grid grid-cols-2 gap-4 text-center">
              <div class="bg-gray-700 p-3 rounded"><div class="text-green-400 font-bold">${friends.length}</div><div class="text-gray-400 text-sm">Amici</div></div>
              <div class="bg-gray-700 p-3 rounded"><div class="text-blue-400 font-bold">${gameHistory.length}</div><div class="text-gray-400 text-sm">Partite</div></div>
            </div>
          </div>
        </div>
        <div class="mb-6">
          <h3 class="text-xl font-bold text-white mb-4">Ultime Partite</h3>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            ${gameHistory.slice(0,3).map(g => `
              <div class=\"bg-gray-700 p-3 rounded flex justify-between items-center\">
                <div><span class=\"text-white\">vs ${g.opponent}</span><span class=\"text-gray-400 text-sm ml-2\">${g.date}</span></div>
                <div class=\"flex items-center space-x-2\">
                  <span class=\"text-white font-mono\">${g.score}</span>
                  <span class=\"px-2 py-1 rounded text-xs ${g.result === 'Vittoria' ? 'bg-green-500' : 'bg-red-500'} text-white\">${g.result}</span>
                </div>
              </div>
            `).join('')}
          </div>
          <button id="viewAllGamesBtn" class="w-full mt-2 bg-gray-600 hover:bg-gray-700 py-2 rounded text-white">Vedi Tutte le Partite</button>
        </div>
        <div class="flex space-x-4">
          <button id="backHomeFromProfileBtn" class="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg text-white">Torna alla Home</button>
          <button id="gameHistoryBtn" class="flex-1 bg-green-500 hover:bg-green-600 py-3 rounded-lg text-white font-semibold">Cronologia Completa</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('editUsernameBtn')?.addEventListener('click', () => {
    document.getElementById('usernameDisplay')?.classList.add('hidden');
    document.getElementById('usernameEdit')?.classList.remove('hidden');
  });
  document.getElementById('saveUsernameBtn')?.addEventListener('click', () => {
    const value = (document.getElementById('usernameInput') as HTMLInputElement).value.trim();
    if (value && value !== currentUser) {
      store.setState({ currentUser: value });
      showMessage('Username aggiornato con successo!', 'success');
    }
    renderProfile();
  });
  document.getElementById('cancelUsernameBtn')?.addEventListener('click', () => renderProfile());
  document.getElementById('uploadAvatarBtn')?.addEventListener('click', () => showMessage('Funzionalità upload avatar in sviluppo!'));
  document.getElementById('backHomeFromProfileBtn')?.addEventListener('click', () => navigate('home'));
  document.getElementById('gameHistoryBtn')?.addEventListener('click', () => navigate('history'));
  document.getElementById('viewAllGamesBtn')?.addEventListener('click', () => navigate('history'));
  setupHeaderEvents();
}

