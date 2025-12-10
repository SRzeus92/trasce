export function showMessage(message: string, type: 'error' | 'success' = 'error') {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;
  messageDiv.innerHTML = `
    <div class="p-4 rounded-lg mb-4 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white">
      ${message}
    </div>
  `;
  messageDiv.classList.remove('hidden');
  setTimeout(() => {
    messageDiv.classList.add('hidden');
  }, 5000);
}

