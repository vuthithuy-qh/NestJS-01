// ===== CHAT AI WIDGET =====
// Dependencies: API_BASE from config.js

(function () {
  "use strict";

  // ── State ──
  let chatHistory = []; // {role, text}[]
  let isOpen = false;
  let isSending = false;

  // ── Quick suggestions ──
  const QUICK_QUESTIONS = [
    "Shop có những giống mèo nào?",
    "Mèo nào giá rẻ nhất?",
    "Hướng dẫn mua hàng",
    "Cách chăm sóc mèo con",
  ];

  // ── Inject HTML ──
  function injectChatWidget() {
    const widget = document.createElement("div");
    widget.id = "chatWidget";
    widget.innerHTML = `
      <!-- Toggle Button -->
      <button class="chat-toggle-btn" id="chatToggleBtn" title="Chat với Mèo Bot 🐱">
        🐱
        <span class="chat-badge" id="chatBadge">1</span>
      </button>

      <!-- Chat Window -->
      <div class="chat-window" id="chatWindow">
        <!-- Header -->
        <div class="chat-header">
          <div class="chat-header-avatar">🐱</div>
          <div class="chat-header-info">
            <h3>Mèo Bot</h3>
            <span>Trợ lý AI của Pet Shop Vu</span>
          </div>
          <button class="chat-close-btn" id="chatCloseBtn">✕</button>
        </div>

        <!-- Messages -->
        <div class="chat-messages" id="chatMessages">
          <!-- Welcome message -->
          <div class="chat-msg bot">
            <div class="chat-msg-avatar">🐱</div>
            <div class="chat-msg-bubble">
              Xin chào! 👋 Mình là <strong>Mèo Bot</strong> — trợ lý của Pet Shop Vu.<br/>
              Bạn muốn biết gì về mèo hoặc cửa hàng, cứ hỏi mình nhé! 🐾
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="chat-quick-actions" id="chatQuickActions">
          ${QUICK_QUESTIONS.map(
            (q) =>
              `<button class="chat-quick-btn" data-question="${escapeHtml(q)}">${q}</button>`,
          ).join("")}
        </div>

        <!-- Typing indicator (hidden) -->
        <div class="chat-typing" id="chatTyping">
          <div class="chat-msg-avatar">🐱</div>
          <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>

        <!-- Input -->
        <div class="chat-input-area">
          <input type="text" id="chatInput" placeholder="Nhập tin nhắn..." autocomplete="off" />
          <button class="chat-send-btn" id="chatSendBtn" title="Gửi">➤</button>
        </div>
      </div>
    `;
    document.body.appendChild(widget);
  }

  // ── Init ──
  function initChat() {
    injectChatWidget();

    const toggleBtn = document.getElementById("chatToggleBtn");
    const closeBtn = document.getElementById("chatCloseBtn");
    const sendBtn = document.getElementById("chatSendBtn");
    const input = document.getElementById("chatInput");
    const quickActions = document.getElementById("chatQuickActions");
    const badge = document.getElementById("chatBadge");

    // Show badge hint on first load
    badge.style.display = "flex";

    // Toggle
    toggleBtn.addEventListener("click", () => {
      isOpen = !isOpen;
      document.getElementById("chatWindow").classList.toggle("open", isOpen);
      toggleBtn.style.display = isOpen ? "none" : "flex";
      badge.style.display = "none";
      if (isOpen) {
        input.focus();
      }
    });

    // Close
    closeBtn.addEventListener("click", () => {
      isOpen = false;
      document.getElementById("chatWindow").classList.remove("open");
      toggleBtn.style.display = "flex";
    });

    // Send
    sendBtn.addEventListener("click", () => sendMessage());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Quick actions
    quickActions.addEventListener("click", (e) => {
      const btn = e.target.closest(".chat-quick-btn");
      if (!btn) return;
      const question = btn.dataset.question;
      input.value = question;
      sendMessage();
    });
  }

  // ── Send Message ──
  let lastSendTime = 0;
  const SEND_COOLDOWN = 2000; // 2 seconds between messages

  async function sendMessage() {
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    if (!message || isSending) return;

    // Frontend cooldown
    const now = Date.now();
    if (now - lastSendTime < SEND_COOLDOWN) {
      return;
    }
    lastSendTime = now;

    // Add user message
    appendMessage("user", message);
    chatHistory.push({ role: "user", text: message });
    input.value = "";

    // Hide quick actions after first message
    const quickEl = document.getElementById("chatQuickActions");
    if (quickEl) quickEl.style.display = "none";

    // Show typing
    isSending = true;
    showTyping(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: chatHistory.slice(-20), // Keep last 20 messages
        }),
      });

      const result = await res.json();
      const data = result.data || result;
      const reply =
        data.reply || "Xin lỗi, mình không hiểu. Bạn thử hỏi lại nhé! 😿";

      appendMessage("bot", reply);
      chatHistory.push({ role: "model", text: reply });
    } catch (err) {
      console.error("Chat error:", err);
      appendMessage(
        "bot",
        "Không thể kết nối tới server. Vui lòng thử lại sau! 😿",
      );
    } finally {
      isSending = false;
      showTyping(false);
    }
  }

  // ── Append Message to DOM ──
  function appendMessage(role, text) {
    const container = document.getElementById("chatMessages");

    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-msg ${role}`;

    const avatarEmoji = role === "bot" ? "🐱" : "👤";
    const bubbleContent =
      role === "bot" ? formatMarkdown(text) : escapeHtml(text);

    msgDiv.innerHTML = `
      <div class="chat-msg-avatar">${avatarEmoji}</div>
      <div class="chat-msg-bubble">${bubbleContent}</div>
    `;

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  }

  // ── Show/Hide Typing ──
  function showTyping(show) {
    const typing = document.getElementById("chatTyping");
    typing.classList.toggle("show", show);
    if (show) {
      const container = document.getElementById("chatMessages");
      container.scrollTop = container.scrollHeight;
    }
  }

  // ── Simple Markdown → HTML ──
  function formatMarkdown(text) {
    let html = escapeHtml(text);

    // Bold: **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

    // Italic: *text* or _text_
    html = html.replace(/\*(?!\*)(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/_(?!_)(.*?)_/g, "<em>$1</em>");

    // Inline code: `code`
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");

    // Unordered lists: lines starting with - or *
    html = html.replace(
      /(?:^|\n)((?:[-*]\s+.+(?:\n|$))+)/g,
      (match, listBlock) => {
        const items = listBlock
          .trim()
          .split("\n")
          .map((line) => `<li>${line.replace(/^[-*]\s+/, "")}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      },
    );

    // Ordered lists: lines starting with 1. 2. etc.
    html = html.replace(
      /(?:^|\n)((?:\d+\.\s+.+(?:\n|$))+)/g,
      (match, listBlock) => {
        const items = listBlock
          .trim()
          .split("\n")
          .map((line) => `<li>${line.replace(/^\d+\.\s+/, "")}</li>`)
          .join("");
        return `<ol>${items}</ol>`;
      },
    );

    // Line breaks
    html = html.replace(/\n/g, "<br/>");

    // Clean up double <br/> before/after lists
    html = html.replace(/<br\/>\s*<ul>/g, "<ul>");
    html = html.replace(/<\/ul>\s*<br\/>/g, "</ul>");
    html = html.replace(/<br\/>\s*<ol>/g, "<ol>");
    html = html.replace(/<\/ol>\s*<br\/>/g, "</ol>");

    return html;
  }

  // ── Escape HTML ──
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── AUTO INIT ──
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initChat);
  } else {
    initChat();
  }
})();
