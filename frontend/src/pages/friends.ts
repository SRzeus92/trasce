import { store } from '../state/store.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { showMessage } from '../components/message.js';
import { navigate } from '../router.js';

export function renderFriends() {
  const state = store.getState();
  if (!state.isLoggedIn) return navigate('login');
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center relative">
      ${renderHeader()}
      <div class="bg-gray-800 p-8 rounded-lg shadow-lg max-w-4xl w-full">
        <h2 class="text-3xl font-bold text-white mb-6 text-center">Gestione Amicizie</h2>
        <div class="mb-6">
          <div class="flex space-x-2">
            <input type="text" id="searchFriendInput" placeholder="Cerca giocatori..." class="flex-1 p-3 bg-gray-700 text-white rounded">
            <button id="searchFriendBtn" class="bg-blue-500 hover:bg-blue-600 px-4 py-3 rounded text-white">Cerca</button>
          </div>
        </div>
        <div class="mb-6">
          <h3 class="text-xl font-bold text-white mb-4">Richieste di Amicizia</h3>
          <div class="space-y-2">
            ${state.friendRequests.map(r => `
              <div class=\"bg-gray-700 p-4 rounded flex justify-between items-center\">
                <div class=\"flex items-center space-x-3\">
                  <img src=\"${r.avatar}\" alt=\"${r.username}\" class=\"w-8 h-8 rounded-full\">
                  <span class=\"text-white\">${r.username}</span>
                  ${r.sent ? '<span class=\\"text-yellow-400 text-sm\\">Inviata</span>' : ''}
                </div>
                <div class=\"flex space-x-2\">
                  ${!r.sent ? `
                    <button class=\"accept-request bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-white text-sm\" data-id=\"${r.id}\">Accetta</button>
                    <button class=\"reject-request bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-white text-sm\" data-id=\"${r.id}\">Rifiuta</button>
                  ` : `
                    <button class=\"cancel-request bg-gray-500 hover:bg-gray-600 px-3 py-1 rounded text-white text-sm\" data-id=\"${r.id}\">Annulla</button>
                  `}
                </div>
              </div>
            `).join('')}
            ${state.friendRequests.length === 0 ? '<p class="text-gray-400 text-center">Nessuna richiesta di amicizia</p>' : ''}
          </div>
        </div>
        <div class="mb-6">
          <h3 class="text-xl font-bold text-white mb-4">Lista Amici (${state.friends.length})</h3>
          <div class="space-y-2">
            ${state.friends.map(f => `
              <div class=\"bg-gray-700 p-4 rounded flex justify-between items-center\">
                <div class=\"flex items-center space-x-3\">
                  <div class=\"relative\">
                    <img src=\"${f.avatar}\" alt=\"${f.username}\" class=\"w-10 h-10 rounded-full\">
                    <div class=\"absolute -top-1 -right-1 w-3 h-3 rounded-full ${f.online ? 'bg-green-500' : 'bg-gray-500'}\"></div>
                  </div>
                  <div>
                    <span class=\"text-white\">${f.username}</span>
                    <div class=\"text-gray-400 text-xs\">${f.online ? 'Online' : 'Offline'}</div>
                  </div>
                </div>
                <div class=\"flex space-x-2\">
                  <span class=\"text-xs text-gray-300\">Solo stato online</span>
                </div>
              </div>
            `).join('')}
            ${state.friends.length === 0 ? '<p class="text-gray-400 text-center">Nessun amico aggiunto</p>' : ''}
          </div>
        </div>
        <div class="flex space-x-4">
          <button id="backHomeFromFriendsBtn" class="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg text-white">Torna alla Home</button>
          <button id="profileFromFriendsBtn" class="flex-1 bg-blue-500 hover:bg-blue-600 py-3 rounded-lg text-white font-semibold">Il Mio Profilo</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('searchFriendBtn')?.addEventListener('click', () => {
    const term = (document.getElementById('searchFriendInput') as HTMLInputElement).value.trim();
    if (term) showMessage(`Ricerca per: ${term} - Funzionalità in sviluppo!`);
  });
  document.querySelectorAll('.accept-request').forEach((btn) => btn.addEventListener('click', () => {
    showMessage('Richiesta di amicizia accettata!', 'success');
    store.loadMockData();
    setTimeout(renderFriends, 800);
  }));
  document.querySelectorAll('.reject-request').forEach((btn) => btn.addEventListener('click', () => {
    showMessage('Richiesta di amicizia rifiutata!', 'success');
    store.loadMockData();
    setTimeout(renderFriends, 800);
  }));
  document.querySelectorAll('.cancel-request').forEach((btn) => btn.addEventListener('click', () => {
    showMessage('Richiesta di amicizia annullata!', 'success');
    store.loadMockData();
    setTimeout(renderFriends, 800);
  }));
  document.querySelectorAll('.invite-game').forEach((btn) => btn.addEventListener('click', () => showMessage('Invito al gioco inviato!', 'success')));
  document.querySelectorAll('.remove-friend').forEach((btn) => btn.addEventListener('click', () => {
    showMessage('Amico rimosso dalla lista!', 'success');
    store.loadMockData();
    setTimeout(renderFriends, 800);
  }));
  document.getElementById('backHomeFromFriendsBtn')?.addEventListener('click', () => navigate('home'));
  document.getElementById('profileFromFriendsBtn')?.addEventListener('click', () => navigate('profile'));
  setupHeaderEvents();
}

