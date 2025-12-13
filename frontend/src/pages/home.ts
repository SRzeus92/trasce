import { store } from '../state/store.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { navigate } from '../router.js';

export function renderHome() {
  const app = document.getElementById('app');
  if (!app) return;
  const { isLoggedIn, currentUser } = store.getState();

  app.innerHTML = `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center relative">
      ${renderHeader()}
      <div class="text-center text-white">
        <h1 class="text-6xl font-bold mb-4">PONG</h1>
        <p class="text-xl mb-8">Trascendente</p>
        <div id="message" class="hidden max-w-md mx-auto"></div>
        ${isLoggedIn ? `
          <div class="space-y-4">
            <p class="text-green-400 mb-4">Benvenuto, ${currentUser}!</p>
            <button id="gameBtn" class="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg text-lg font-semibold mr-4">Gioca Ora</button>
            <button id="profileHomeBtn" class="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg text-lg font-semibold mr-4">Il Mio Profilo</button>
            <button id="tournamentBtn" class="bg-yellow-600 hover:bg-yellow-500 px-6 py-3 rounded-lg text-lg font-semibold mr-4">Torneo</button>
            <button id="friendsHomeBtn" class="bg-purple-500 hover:bg-purple-600 px-6 py-3 rounded-lg text-lg font-semibold mr-4">Gestione Amicizie</button>
            <button id="logoutBtn" class="bg-red-500 hover:bg-red-600 px-6 py-3 rounded-lg text-lg font-semibold">Logout</button>
          </div>
        ` : `
          <div class="space-y-4 max-w-md mx-auto">
            <button id="loginBtn" class="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg text-lg font-semibold block w-full">Login</button>
            <button id="registerBtn" class="bg-purple-500 hover:bg-purple-600 px-6 py-3 rounded-lg text-lg font-semibold block w-full">Registrati</button>
            <div class="relative my-4">
              <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-600"></div></div>
              <div class="relative flex justify-center text-sm"><span class="px-2 bg-gray-900 text-gray-400">Oppure</span></div>
            </div>
            <button id="googleLoginBtn" class="bg-white text-gray-800 hover:bg-gray-200 px-6 py-3 rounded-lg text-lg font-semibold flex items-center justify-center space-x-2 w-full">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <span>Accedi con Google</span>
            </button>
          </div>
        `}
      </div>
    </div>
  `;

  if (isLoggedIn) {
    document.getElementById('gameBtn')?.addEventListener('click', () => navigate('game'));
    document.getElementById('profileHomeBtn')?.addEventListener('click', () => navigate('profile'));
    document.getElementById('friendsHomeBtn')?.addEventListener('click', () => navigate('friends'));
    document.getElementById('tournamentBtn')?.addEventListener('click', () => navigate('tournament'));
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
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
  } else {
    document.getElementById('loginBtn')?.addEventListener('click', () => navigate('login'));
    document.getElementById('registerBtn')?.addEventListener('click', () => navigate('register'));
    document.getElementById('googleLoginBtn')?.addEventListener('click', () => {
      store.setState({
        isLoggedIn: true,
        currentUser: 'google_user',
        userEmail: 'googleuser@example.com',
        userAvatar: '/google-avatar.png',
      });
      navigate('home');
    });
  }
}

