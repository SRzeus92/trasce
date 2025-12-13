import { navigate } from './router.js';
import { store } from './state/store.js';
import { fetchProfileData } from './utils/user.js';

// Bootstrap application
// Loads mock data and renders the Home page

document.addEventListener('DOMContentLoaded', async function () {
	// Try to restore session
	const token = localStorage.getItem('access_token');
	if (token) {
		await fetchProfileData();
	}

	store.loadMockData(); // Keeps mock data for specific parts if needed, or remove if fully integrated
	navigate('home');
});
