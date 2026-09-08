document.querySelectorAll('form').forEach((form) => {
  const endpoint = form.closest('.reservation-form')
    ? '/api/reservations'
    : form.closest('.contact-form')
      ? '/api/messages'
      : null;

  if (!endpoint) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    let status = form.querySelector('.form-status');

    if (!status) {
      status = document.createElement('p');
      status.className = 'form-status';
      status.setAttribute('role', 'status');
      form.appendChild(status);
    }

    button.disabled = true;
    button.textContent = 'Sending...';
    status.textContent = '';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Something went wrong.');

      status.textContent = result.message;
      status.style.color = '#c9a84c';
      form.reset();
    } catch (error) {
      status.textContent = error.message;
      status.style.color = '#e98b8b';
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
});
