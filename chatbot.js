(function () {
  // ─────────────────────────────────────────────
  // 1. INSTANCE GUARD (per script tag, not global)
  // ─────────────────────────────────────────────
  const script = document.currentScript ||
    Array.from(document.scripts).find(s => s.src?.includes("chatbot.js"));

  if (!script) return;

  // prevent duplicate init per script element
  if (script.__chatbot_initialized__) return;
  script.__chatbot_initialized__ = true;

  const client_name = script.dataset.client_name;
  const API_KEY = script.dataset.key;

  // FIX: real unique session id
  const SESSION_ID =
    (crypto.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const BACKEND_URL = "https://server-vls8.onrender.com/chat";

  // ─────────────────────────────────────────────
  // 2. CREATE ISOLATED ROOT (NO GLOBAL IDS)
  // ─────────────────────────────────────────────
  const root = document.createElement("div");
  root.className = "chatbot-root";
  document.body.appendChild(root);

  // ─────────────────────────────────────────────
  // 3. STYLES (global once, safe)
  // ─────────────────────────────────────────────
  if (!document.getElementById("__chatbot_styles__")) {
    const style = document.createElement("style");
    style.id = "__chatbot_styles__";
    style.textContent = `
      .chatbot-btn {
        position: fixed;
        bottom: 28px;
        right: 28px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #1a73e8;
        color: #fff;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(0,0,0,0.22);
        font-size: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
      }

      .chatbot-window {
        position: fixed;
        bottom: 96px;
        right: 28px;
        width: 340px;
        max-height: 500px;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        display: flex;
        flex-direction: column;
        z-index: 99998;
        overflow: hidden;
        font-family: Segoe UI, Arial, sans-serif;
        opacity: 0;
        transform: translateY(12px) scale(0.98);
        pointer-events: none;
        transition: 0.2s;
      }

      .chatbot-window.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
      }

      .chatbot-header {
        background: #1a73e8;
        color: #fff;
        padding: 14px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .chatbot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: #f4f6fb;
      }

      .msg {
        max-width: 82%;
        padding: 9px 13px;
        border-radius: 12px;
        font-size: 13.5px;
        line-height: 1.5;
      }

      .msg.user {
        background: #1a73e8;
        color: #fff;
        align-self: flex-end;
      }

      .msg.bot {
        background: #fff;
        color: #222;
        align-self: flex-start;
      }

      .chatbot-input {
        display: flex;
        padding: 10px;
        border-top: 1px solid #e8eaf0;
      }

      .chatbot-input input {
        flex: 1;
        border-radius: 20px;
        padding: 8px 14px;
        border: 1px solid #dde1ee;
      }

      .chatbot-send {
        margin-left: 8px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #1a73e8;
        color: #fff;
        border: none;
      }
    `;
    document.head.appendChild(style);
  }

  // ─────────────────────────────────────────────
  // 4. UI (NO GLOBAL IDS)
  // ─────────────────────────────────────────────
  root.innerHTML = `
    <button class="chatbot-btn">💬</button>

    <div class="chatbot-window">
      <div class="chatbot-header">
        <span>● ${client_name}</span>
        <button class="chatbot-close">×</button>
      </div>

      <div class="chatbot-messages"></div>

      <div class="chatbot-input">
        <input type="text" placeholder="Type..." />
        <button class="chatbot-send">➤</button>
      </div>
    </div>
  `;

  // ─────────────────────────────────────────────
  // 5. LOCAL REFERENCES (SCOPED)
  // ─────────────────────────────────────────────
  const btn = root.querySelector(".chatbot-btn");
  const win = root.querySelector(".chatbot-window");
  const closeBtn = root.querySelector(".chatbot-close");
  const messages = root.querySelector(".chatbot-messages");
  const input = root.querySelector("input");
  const sendBtn = root.querySelector(".chatbot-send");

  let history = [];
  let open = false;

  // ─────────────────────────────────────────────
  // 6. HELPERS
  // ─────────────────────────────────────────────
  function add(text, role) {
    const d = document.createElement("div");
    d.className = `msg ${role}`;
    d.textContent = text;
    messages.appendChild(d);
    messages.scrollTop = messages.scrollHeight;
    return d;
  }

  function toggle() {
    open = !open;
    win.classList.toggle("open", open);

    if (open && history.length === 0) {
      add("I can find 3BHK deals under ₹50k in 30 sec. Want that?", "bot");
    }

    if (open) input.focus();
  }

  async function send() {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    sendBtn.disabled = true;

    add(text, "user");
    history.push({ role: "user", content: text });

    const typing = add("Typing…", "bot");

    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          api_key: API_KEY,
          session_id: SESSION_ID
        })
      });

      const data = await res.json().catch(() => ({}));
      typing.remove();

      const reply = data.reply || "No response.";
      add(reply, "bot");
      history.push({ role: "assistant", content: reply });

    } catch {
      typing.remove();
      add("Server unreachable.", "bot");
    } finally {
      sendBtn.disabled = false;
    }
  }

  // ─────────────────────────────────────────────
  // 7. EVENTS
  // ─────────────────────────────────────────────
  btn.onclick = toggle;
  closeBtn.onclick = toggle;
  sendBtn.onclick = send;

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") send();
  });
})();
