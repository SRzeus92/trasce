import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { showMessage } from '../components/message.js';
import { navigate } from '../router.js';
import { store } from '../state/store.js';
import { fetchProfileData } from '../utils/user.js';

export function renderOTPVerification(params?: any) {
  const app = document.getElementById('app');
  if (!app) return;

  const userId = params?.userId;

  if (!userId) {
    showMessage('Errore: User ID mancante per la verifica OTP.', 'error');
    navigate('login');
    return;
  }

  app.innerHTML = `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center relative">
      ${renderHeader()}
      <div class="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 class="text-3xl font-bold text-white mb-6 text-center">Verifica OTP</h2>
        <p class="text-gray-300 text-center mb-6">Inserisci il codice di 6 cifre inviato alla tua email.</p>
        <div id="message" class="hidden"></div>
        <form id="otpForm" class="space-y-6">
          <input type="text" id="otpInput" maxlength="6" pattern="[0-9]{6}" placeholder="123456" class="w-full text-center text-2xl tracking-widest p-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-green-500" required>
          <button type="submit" class="w-full bg-green-500 hover:bg-green-600 py-3 rounded-lg text-lg font-semibold text-white">Verifica</button>
        </form>
        <div class="text-center mt-4">
          <button id="resendOtpBtn" class="text-blue-400 hover:text-blue-300 text-sm">Invia nuovo codice</button>
        </div>
        <button id="backLoginBtn" class="w-full mt-4 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg text-white">Torna al Login</button>
      </div>
    </div>
  `;

  document.getElementById('otpForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = (document.getElementById('otpInput') as HTMLInputElement).value.trim();

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      showMessage('Inserisci un codice valido di 6 cifre.', 'error');
      return;
    }

    try {
      // Use API Gateway endpoint /verify/otp
      const res = await fetch('/api/verify/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, otp })
      });

      const data = await res.json();

      if (res.ok) {
        showMessage('Verifica riuscita! Accesso in corso...', 'success');
        localStorage.setItem('access_token', data.access_token);

        // Fetch full profile data to ensure store is correctly populated (including avatar)
        try {
          await fetchProfileData();
        } catch (e) {
          console.error('Profile fetch during login failed', e);
        }

        setTimeout(() => navigate('home'), 500);
      } else {
        showMessage(data.error || 'Verifica fallita.', 'error');
      }
    } catch (err) {
      console.error(err);
      showMessage('Errore di connessione.', 'error');
    }
  });

  document.getElementById('backLoginBtn')?.addEventListener('click', () => navigate('login'));
  document.getElementById('resendOtpBtn')?.addEventListener('click', () => showMessage('Funzionalità reinvio non ancora implementata.', 'error'));
  setupHeaderEvents();
}
