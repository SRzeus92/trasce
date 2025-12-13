import { renderHeader, setupHeaderEvents } from '../../components/header.js';
import { showMessage } from '../../components/message.js';
import { navigate } from '../../router.js';
import { store } from '../../state/store.js';

export function renderLogin() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center relative">
      ${renderHeader()}
      <div class="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 class="text-3xl font-bold text-white mb-6 text-center">Login</h2>
        <div id="message" class="hidden"></div>
        <form id="loginForm">
          <input type="email" id="loginEmail" placeholder="Email" class="w-full p-3 mb-4 bg-gray-700 text-white rounded" required>
          <input type="password" id="loginPassword" placeholder="Password" class="w-full p-3 mb-6 bg-gray-700 text-white rounded" required>
          <button type="submit" class="w-full bg-green-500 hover:bg-green-600 py-3 rounded-lg text-lg font-semibold">Accedi</button>
        </form>
        <div class="text-center mt-4">
          <button id="showRegisterBtn" class="text-blue-400 hover:text-blue-300">Non hai un account? Registrati</button>
        </div>
        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-600"></div></div>
          <div class="relative flex justify-center text-sm"><span class="px-2 bg-gray-800 text-gray-400">Oppure</span></div>
        </div>
        <button id="googleLoginFormBtn" class="w-full bg-white text-gray-800 hover:bg-gray-200 py-3 rounded-lg text-lg font-semibold flex items-center justify-center space-x-2">
          <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          <span>Accedi con Google</span>
        </button>
        <button id="backHomeBtn" class="w-full mt-4 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg text-white">Torna alla Home</button>
      </div>
    </div>
  `;

  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('loginEmail') as HTMLInputElement).value.trim();
    const password = (document.getElementById('loginPassword') as HTMLInputElement).value.trim();
    if (!email || !password) return showMessage('Inserisci email e password!', 'error');

    try {
      // Use API Gateway (game-service) endpoint
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok) {
        showMessage('Login riuscito. In attesa di OTP...', 'success');

        if (data.userId) {
          // Save email to localStorage for profile display
          localStorage.setItem('user_email', email);
          // Clear any stale registration data
          sessionStorage.removeItem('pending_otp_user_id');
          setTimeout(() => navigate('verify-otp', { userId: data.userId }), 1000);
        } else {
          showMessage('Errore: ID utente non ricevuto dal server.', 'error');
        }
      } else {
        showMessage(data.error || 'Login fallito.', 'error');
      }
    } catch (err) {
      console.error(err);
      showMessage('Errore di connessione al server.', 'error');
    }
  });
  document.getElementById('showRegisterBtn')?.addEventListener('click', () => navigate('register'));
  document.getElementById('googleLoginFormBtn')?.addEventListener('click', () => {
    showMessage('Google Auth non configurato sul server.', 'error');
  });
  document.getElementById('backHomeBtn')?.addEventListener('click', () => navigate('home'));
  setupHeaderEvents();
}

