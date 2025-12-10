import { renderHome } from './pages/home.js';
import { renderLogin } from './pages/auth/login.js';
import { renderRegister } from './pages/auth/register.js';
import { renderProfile } from './pages/profile.js';
import { renderFriends } from './pages/friends.js';
import { renderHistory } from './pages/history.js';
import { renderGame } from './pages/game/game.js';
import { renderTournament } from './pages/tournament.js';

export type Route =
  | 'home'
  | 'login'
  | 'register'
  | 'profile'
  | 'friends'
  | 'history'
  | 'game'
  | 'tournament';

export function navigate(route: Route) {
  switch (route) {
    case 'home':
      renderHome();
      break;
    case 'login':
      renderLogin();
      break;
    case 'register':
      renderRegister();
      break;
    case 'profile':
      renderProfile();
      break;
    case 'friends':
      renderFriends();
      break;
    case 'history':
      renderHistory();
      break;
    case 'game':
      renderGame();
      break;
    case 'tournament':
      renderTournament();
      break;
  }
}

