import { store } from '../state/store.js';
import { navigate } from '../router.js';

export function renderHeader(): string {
  const { isLoggedIn, userAvatar, currentUser } = store.getState();
  if (!isLoggedIn) return '';
  return `
    <header class="absolute top-0 left-0 right-0 bg-gray-800 p-4 flex justify-between items-center">
      <div class="text-white font-bold text-xl">PONG</div>
      <div class="flex items-center space-x-3 cursor-pointer" id="profileDropdown">
        <img src="${userAvatar}" alt="${currentUser}" class="w-8 h-8 rounded-full border-2 border-green-500">
        <span class="text-white">${currentUser}</span>
        <div id="dropdownMenu" class="hidden absolute top-16 right-4 bg-gray-700 rounded-lg shadow-lg p-2 min-w-48 z-50">
          <button id="profileBtn" class="w-full text-left p-2 text-white hover:bg-gray-600 rounded">Il Mio Profilo</button>
          <button id="friendsBtn" class="w-full text-left p-2 text-white hover:bg-gray-600 rounded">Gestione Amicizie</button>
          <button id="logoutHeaderBtn" class="w-full text-left p-2 text-white hover:bg-gray-600 rounded">Logout</button>
        </div>
      </div>
    </header>
  `;
}

export function setupHeaderEvents() {
  const dropdown = document.getElementById('profileDropdown');
  const menu = document.getElementById('dropdownMenu');
  dropdown?.addEventListener('click', (e) => {
    e.stopPropagation();
    menu?.classList.toggle('hidden');
  });
  document.addEventListener('click', () => menu?.classList.add('hidden'));
  document.getElementById('profileBtn')?.addEventListener('click', () => {
    navigate('profile');
    menu?.classList.add('hidden');
  });
  document.getElementById('friendsBtn')?.addEventListener('click', () => {
    navigate('friends');
    menu?.classList.add('hidden');
  });
  document.getElementById('logoutHeaderBtn')?.addEventListener('click', () => {
    store.setState({ isLoggedIn: false, currentUser: '', userAvatar: '/default-avatar.png', userEmail: '' });
    navigate('home');
    menu?.classList.add('hidden');
  });
}

