(() => {
  const style = document.createElement('style');
  style.textContent = `
    .gp-chat-launcher { position: fixed; right: 24px; bottom: 24px; z-index: 1000; border: 1px solid #c9a84c; background: #c9a84c; color: #0a0a0a; border-radius: 999px; padding: 16px 24px; font: 500 14px Jost, sans-serif; letter-spacing: 1px; cursor: pointer; box-shadow: 0 14px 35px rgba(0,0,0,.35); }
    .gp-chat-panel { position: fixed; right: 24px; bottom: 82px; z-index: 1000; width: min(560px, calc(100vw - 32px)); height: min(760px, calc(100vh - 120px)); min-height: 480px; display: none; flex-direction: column; overflow: hidden; background: #151515; color: #fff; border: 1px solid rgba(201,168,76,.45); box-shadow: 0 20px 60px rgba(0,0,0,.5); }
    .gp-chat-panel.is-open { display: flex; }
    .gp-chat-head { display: flex; justify-content: space-between; align-items: center; padding: 18px; background: #0d0d0d; border-bottom: 1px solid #2a2a2a; }
    .gp-chat-head strong { color: #e8d5a3; font: 600 21px 'Cormorant Garamond', serif; }
    .gp-chat-head small { display: block; margin-top: 3px; color: #999; font: 12px Jost, sans-serif; }
    .gp-chat-close { border: 0; background: transparent; color: #c9a84c; font-size: 22px; cursor: pointer; }
    .gp-chat-messages { flex: 1; overflow-y: auto; padding: 16px; }
    .gp-chat-message { max-width: 84%; margin: 0 0 12px; padding: 11px 13px; line-height: 1.5; font: 13px Jost, sans-serif; }
    .gp-chat-message.assistant { background: #222; color: #ddd; }
    .gp-chat-message.user { margin-left: auto; background: #c9a84c; color: #0a0a0a; }
    .gp-chat-form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #2a2a2a; }
    .gp-chat-input { min-width: 0; flex: 1; border: 1px solid #3a3a3a; background: #0d0d0d; color: #fff; padding: 11px; outline: none; font: 13px Jost, sans-serif; }
    .gp-chat-send { border: 0; background: #c9a84c; color: #0a0a0a; padding: 0 14px; cursor: pointer; font-weight: 600; }
    .gp-chat-send:disabled { opacity: .5; cursor: wait; }
    @media (max-width: 480px) { .gp-chat-launcher { right: 16px; bottom: 16px; } .gp-chat-panel { right: 16px; bottom: 72px; width: calc(100vw - 32px); height: calc(100vh - 104px); min-height: 0; } }
  `;
  document.head.appendChild(style);

  const panel = document.createElement('section');
  panel.className = 'gp-chat-panel';
  panel.setAttribute('aria-label', 'Grand Palate AI concierge');
  panel.innerHTML = `
    <div class="gp-chat-head">
      <div><strong>Ask AI</strong><small>Ask about dining, events, or reservations</small></div>
      <button class="gp-chat-close" type="button" aria-label="Close assistant">&times;</button>
    </div>
    <div class="gp-chat-messages"></div>
    <form class="gp-chat-form">
      <input class="gp-chat-input" required maxlength="500" placeholder="Ask us anything..." aria-label="Message">
      <button class="gp-chat-send" type="submit">Send</button>
    </form>`;

  const launcher = document.createElement('button');
  launcher.className = 'gp-chat-launcher';
  launcher.type = 'button';
  launcher.textContent = 'Ask AI';
  launcher.setAttribute('aria-expanded', 'false');
  document.body.append(launcher, panel);

  const messages = panel.querySelector('.gp-chat-messages');
  const input = panel.querySelector('.gp-chat-input');
  const form = panel.querySelector('.gp-chat-form');
  const send = panel.querySelector('.gp-chat-send');
  const history = [];

  const addMessage = (text, role) => {
    const item = document.createElement('div');
    item.className = `gp-chat-message ${role}`;
    item.textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    history.push({ role, content: text });
  };

  const toggle = (open) => {
    panel.classList.toggle('is-open', open);
    launcher.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  };

  addMessage('Welcome to The Grand Palate. How may I help you today?', 'assistant');
  launcher.addEventListener('click', () => toggle(!panel.classList.contains('is-open')));
  panel.querySelector('.gp-chat-close').addEventListener('click', () => toggle(false));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    addMessage(message, 'user');
    input.value = '';
    send.disabled = true;
    send.textContent = '...';

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: history.slice(-6) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Assistant unavailable.');
      addMessage(result.reply, 'assistant');
    } catch (error) {
      addMessage(error.message, 'assistant');
    } finally {
      send.disabled = false;
      send.textContent = 'Send';
      input.focus();
    }
  });
})();
