import { navigate } from './router.js';
import { store } from './state/store.js';

// Bootstrap application
// Loads mock data and renders the Home page

document.addEventListener('DOMContentLoaded', function () {
	store.loadMockData();
	navigate('home');
});
