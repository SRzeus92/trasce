import { store } from '../state/store.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { showMessage } from '../components/message.js';
import { navigate } from '../router.js';
import { fetchProfileData } from '../utils/user.js';

interface User {
  id: number;
  username: string;
  avatar_url: string;
  avatar?: {
    content_type: string;
    data_base64: string;
  };
  is_online: boolean;
  friendship_status: 'none' | 'accepted' | 'sent' | 'new_request';
  friendship_id?: number;
}

export async function renderFriends() {
  const state = store.getState();
  if (!state.isLoggedIn) return navigate('login');

  // Refresh profile data to get latest friends list for the "Lista Amici" section
  await fetchProfileData();
  const updatedState = store.getState();

  const app = document.getElementById('app');
  if (!app) return;

  // Initial fetch of all users for search capability
  let allUsers: User[] = [];
  try {
    const token = localStorage.getItem('access_token');
    const res = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      allUsers = await res.json();
    }
  } catch (e) {
    console.error('Failed to fetch users', e);
  }

  // Filter users for "Richieste" section manually if not in store or to be sure
  const incomingRequests = allUsers.filter(u => u.friendship_status === 'new_request');

  // RENDER STATIC STRUCTURE ONCE
  app.innerHTML = `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center relative">
      ${renderHeader()}
      <div class="bg-gray-800 p-8 rounded-lg shadow-lg max-w-4xl w-full">
        <h2 class="text-3xl font-bold text-white mb-6 text-center">Gestione Amicizie</h2>
        
        <!-- Search Section -->
        <div class="mb-6">
          <div class="flex space-x-2">
            <input type="text" id="searchFriendInput" placeholder="Cerca giocatori..." class="flex-1 p-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
            <!-- Button is optional if search is live, but kept for click-to-search preference -->
            <button id="searchFriendBtn" class="bg-blue-500 hover:bg-blue-600 px-4 py-3 rounded text-white font-bold">Cerca</button>
          </div>
          
          <!-- Search Results Container -->
          <div id="searchResultsContainer" class="mt-4 max-h-60 overflow-y-auto space-y-2 bg-gray-900 p-2 rounded hidden">
            <h3 class="text-gray-400 text-xs uppercase font-bold mb-2">Risultati Ricerca</h3>
            <div id="searchResultsList"></div>
          </div>
        </div>

        <!-- Incoming Requests -->
        <div class="mb-6 ${incomingRequests.length === 0 ? 'hidden' : ''}">
          <h3 class="text-xl font-bold text-white mb-4">Richieste in Arrivo</h3>
          <div class="space-y-2">
            ${incomingRequests.map(r => {
    const avatarSrc = r.avatar && r.avatar.data_base64
      ? `data:${r.avatar.content_type || 'image/jpeg'};base64,${r.avatar.data_base64}`
      : (r.avatar_url || '/default-avatar.png');
    return `
              <div class="bg-gray-700 p-4 rounded flex justify-between items-center border border-yellow-500">
                <div class="flex items-center space-x-3">
                  <img src="${avatarSrc}" alt="${r.username}" class="w-10 h-10 rounded-full">
                  <span class="text-white font-bold">${r.username}</span>
                </div>
                <div class="flex space-x-2">
                  <button class="accept-request bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-white text-sm" data-id="${r.friendship_id}">Accetta</button>
                  <button class="reject-request bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-white text-sm" data-id="${r.friendship_id}">Rifiuta</button>
                </div>
              </div>`;
  }).join('')}
          </div>
        </div>

        <!-- Friends List -->
        <div class="mb-6">
          <h3 class="text-xl font-bold text-white mb-4">I Tuoi Amici (${updatedState.friends.length})</h3>
          <div class="space-y-2 max-h-60 overflow-y-auto">
            ${updatedState.friends.map(f => `
              <div class="bg-gray-700 p-4 rounded flex justify-between items-center">
                <div class="flex items-center space-x-3">
                  <div class="relative">
                    <img src="${f.avatar}" alt="${f.username}" class="w-10 h-10 rounded-full object-cover">
                    <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full ${f.online ? 'bg-green-500' : 'bg-gray-500'} border-2 border-gray-700"></div>
                  </div>
                  <div>
                    <span class="text-white font-semibold">${f.username}</span>
                    <div class="text-gray-400 text-xs">${f.online ? 'Online' : 'Offline'}</div>
                  </div>
                </div>
                <div class="flex space-x-2">
                   <button class="remove-friend bg-red-500/20 hover:bg-red-500/40 text-red-500 px-2 py-1 rounded text-xs" data-id="${f.id}">Rimuovi</button>
                </div>
              </div>
            `).join('')}
            ${updatedState.friends.length === 0 ? '<p class="text-gray-400 text-center italic">Ancora nessun amico. Cerca qualcuno qui sopra!</p>' : ''}
          </div>
        </div>

        <div class="flex space-x-4">
          <button id="backHomeFromFriendsBtn" class="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg text-white">Torna alla Home</button>
          <button id="profileFromFriendsBtn" class="flex-1 bg-blue-500 hover:bg-blue-600 py-3 rounded-lg text-white font-semibold">Il Mio Profilo</button>
        </div>
      </div>
    </div>
  `;

  setupHeaderEvents();

  // DYNAMIC RENDER FUNCTION FOR SEARCH
  const renderSearchResults = (searchTerm: string) => {
    const container = document.getElementById('searchResultsContainer');
    const list = document.getElementById('searchResultsList');

    if (!container || !list) return;

    if (!searchTerm) {
      container.classList.add('hidden');
      return;
    }

    const filteredUsers = allUsers.filter(u =>
      u.id !== updatedState.currentUserId &&
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredUsers.length === 0) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    list.innerHTML = filteredUsers.map(u => {
      const avatarSrc = u.avatar && u.avatar.data_base64
        ? `data:${u.avatar.content_type || 'image/jpeg'};base64,${u.avatar.data_base64}`
        : (u.avatar_url || '/default-avatar.png');

      let actionButton = '';
      if (u.friendship_status === 'none') {
        actionButton = `<button class="add-friend-btn bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-white text-xs" data-id="${u.id}">Aggiungi</button>`;
      } else if (u.friendship_status === 'sent') {
        actionButton = `<span class="text-yellow-500 text-xs">In attesa</span>`;
      } else if (u.friendship_status === 'accepted') {
        actionButton = `<span class="text-green-500 text-xs">Amico</span>`;
      } else if (u.friendship_status === 'new_request') {
        // Could add accept button here too, but simpler to just show status if we have the dedicated request section
        // Wait, requirement might be to interact here too. Let's keep consistency.
        actionButton = `<button class="accept-request bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-white text-xs mr-2" data-id="${u.friendship_id}">Accetta</button>`;
      }

      return `
        <div class="flex items-center justify-between bg-gray-700 p-2 rounded">
            <div class="flex items-center space-x-2">
                <img src="${avatarSrc}" class="w-8 h-8 rounded-full object-cover">
                <span class="text-white">${u.username}</span>
            </div>
            <div>${actionButton}</div>
        </div>`;
    }).join('');

    // Re-attach listeners for dynamic buttons
    attachDynamicListeners();
  };

  // Attach search listeners
  const searchInput = document.getElementById('searchFriendInput') as HTMLInputElement;

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderSearchResults((e.target as HTMLInputElement).value);
    });
  }

  // Initial attachment for static buttons + dynamic ones essentially
  function attachDynamicListeners() {
    // Add Friend
    document.querySelectorAll('.add-friend-btn').forEach(btn => {
      // clear old listeners? simplified by just replacing innerHTML above, so new elements every time.
      btn.addEventListener('click', async (e) => {
        const receiverId = (e.target as HTMLElement).getAttribute('data-id');
        const token = localStorage.getItem('access_token');
        try {
          const res = await fetch('/api/friendships', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ receiver_id: parseInt(receiverId!) })
          });
          if (res.ok) {
            showMessage('Richiesta inviata!', 'success');
            // Optimistic update
            const user = allUsers.find(u => u.id === parseInt(receiverId!));
            if (user) user.friendship_status = 'sent';

            // Re-render only search results
            const searchInput = document.getElementById('searchFriendInput') as HTMLInputElement;
            renderSearchResults(searchInput.value);

            // Background fetch to keep everything in sync (optional, maybe skip to avoid race conditions overriding local state too soon)
            // await fetchProfileData();
          } else {
            const err = await res.json();
            showMessage(err.error || 'Errore invio richiesta', 'error');
          }
        } catch (err) {
          console.error(err);
          showMessage('Errore di connessione', 'error');
        }
      });
    });

    // Accept Request (in search results)
    document.querySelectorAll('.accept-request').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const friendshipId = (e.target as HTMLElement).getAttribute('data-id');
        const token = localStorage.getItem('access_token');
        try {
          const res = await fetch(`/api/friendships/${friendshipId}/accept`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            showMessage('Amicizia accettata!', 'success');
            renderFriends();
          }
        } catch (err) { console.error(err); }
      });
    });
  }

  // Attach listeners for static elements (Incoming Requests, My Friends)
  // Accept Request (Incoming List) - Note: Class is same, so attachDynamicListeners covers dynamic search ones, 
  // but we need to cover the ones statically rendered above too.
  // Actually, attachDynamicListeners searches entire document? No, document.querySelectorAll searches entire document.
  // So calling it once handles everything existing.
  attachDynamicListeners();


  // Reject Request
  document.querySelectorAll('.reject-request').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const friendshipId = (e.target as HTMLElement).getAttribute('data-id');
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/friendships/${friendshipId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          showMessage('Richiesta rifiutata.', 'success');
          renderFriends();
        }
      } catch (err) { console.error(err); }
    });
  });

  // Remove Friend
  document.querySelectorAll('.remove-friend').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Vuoi davvero rimuovere questo amico?')) return;

      const friendUserId = parseInt((e.target as HTMLElement).getAttribute('data-id')!);
      const userDetails = allUsers.find(u => u.id === friendUserId);

      if (userDetails && userDetails.friendship_id) {
        const token = localStorage.getItem('access_token');
        try {
          const res = await fetch(`/api/friendships/${userDetails.friendship_id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            showMessage('Amico rimosso.', 'success');
            renderFriends();
          }
        } catch (err) { console.error(err); }
      } else {
        // Fallback: try to find by checking if there's a friendship where userId matches? 
        // If not in allUsers (unlikely if they are a friend), we might be stuck.
        // But renderFriends fetches allUsers.
        showMessage('Impossibile rimuovere (ID non trovato). Riprova.', 'error');
      }
    });
  });

  document.getElementById('backHomeFromFriendsBtn')?.addEventListener('click', () => navigate('home'));
  document.getElementById('profileFromFriendsBtn')?.addEventListener('click', () => navigate('profile'));
}

