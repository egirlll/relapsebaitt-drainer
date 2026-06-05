// Auto-Drain Extension for Throne

const STORAGE_KEY = "extension_selected_item";
const STORAGE_PRICE_KEY = "extension_selected_item_price";
const SESSION_PROMPT_KEY = "extension_prompt_shown";
const THRONE_USER = "relapsebaitt";
const IMAGE_SERVICE = "https://mikpics-production.up.railway.app";

// Items configuration — built dynamically from page markup
// ALLOWED_ITEMS: array of heading strings (unique per item)
// ITEM_EMOJIS: heading -> emoji (for display)
// ITEM_PRICES: heading -> price string
let ALLOWED_ITEMS = [];
let ITEM_EMOJIS = {};
let ITEM_PRICES = {};

let selectedItem = localStorage.getItem(STORAGE_KEY) || null;
let selectedItemPrice = parseFloat(localStorage.getItem(STORAGE_PRICE_KEY)) || 0;

let unloadHandler = null;
let lastDetectedRoute = null;

let imageSpawningPaused = false;
let awaitingSelection = false;
let checkoutCounted = false;
let lockdownActive = false;
let stallTimerActive = false;

let routeChangeCount = 0;
let totalDrained = 0;
let sendCount = 0;

// Show send messages
function showSendMsg(msg) {
  const existing = document.getElementById('send-msg');
  if (existing) existing.remove();

  const msgDiv = document.createElement('div');
  msgDiv.id = 'send-msg';
  msgDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.8);z-index:10003;color:#ff1493;font-size:42px;font-weight:700;text-align:center;line-height:1.5;white-space:pre-line;font-family:-apple-system,BlinkMacSystemFont,sans-serif;text-shadow:0 0 30px rgba(255,20,147,0.8),0 0 60px rgba(255,20,147,0.4);pointer-events:none;opacity:0;transition:all 0.5s ease;';
  msgDiv.textContent = msg;
  document.body.appendChild(msgDiv);

  requestAnimationFrame(() => {
    msgDiv.style.opacity = '1';
    msgDiv.style.transform = 'translate(-50%,-50%) scale(1)';
  });

  setTimeout(() => {
    msgDiv.style.opacity = '0';
    msgDiv.style.transform = 'translate(-50%,-50%) scale(1.1)';
    setTimeout(() => msgDiv.remove(), 500);
  }, 3000);
}

// Show no escape warning
function showNoEscapeWarning(originalUrl) {
  imageSpawningPaused = true;

  const existingWarning = document.getElementById("escape-warning");
  if (existingWarning) return;

  const warningOverlay = document.createElement("div");
  warningOverlay.id = "escape-warning";
  warningOverlay.style.position = "fixed";
  warningOverlay.style.top = "0";
  warningOverlay.style.left = "0";
  warningOverlay.style.width = "100%";
  warningOverlay.style.height = "100%";
  warningOverlay.style.backgroundColor = "rgba(0, 0, 0, 1)";
  warningOverlay.style.zIndex = "10001";
  warningOverlay.style.pointerEvents = "auto";
  warningOverlay.style.display = "flex";
  warningOverlay.style.alignItems = "center";
  warningOverlay.style.justifyContent = "center";
  warningOverlay.style.flexDirection = "column";

  const message = document.createElement("h1");
  message.textContent = "Stop trying to escape";
  message.style.color = "#ff1493";
  message.style.fontSize = "48px";
  message.style.fontWeight = "900";
  message.style.textAlign = "center";
  message.style.marginBottom = "20px";
  message.style.fontFamily = "sans-serif";
  message.style.textTransform = "uppercase";
  message.style.letterSpacing = "2px";
  message.style.animation = "shake 0.5s";

  const subtext = document.createElement("p");
  subtext.textContent = "You're locked in. There's no leaving.";
  subtext.style.color = "#ff69b4";
  subtext.style.fontSize = "20px";
  subtext.style.textAlign = "center";
  subtext.style.fontFamily = "sans-serif";
  subtext.style.opacity = "0.9";

  if (!document.getElementById("lockdown-styles")) {
    const style = document.createElement("style");
    style.id = "lockdown-styles";
    style.textContent = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
      }
    `;
    document.head.appendChild(style);
  }

  warningOverlay.appendChild(message);
  warningOverlay.appendChild(subtext);
  document.body.appendChild(warningOverlay);

  setTimeout(() => {
    warningOverlay.remove();
    window.location.href = originalUrl;
  }, 2000);
}

// Create lockdown overlay
function createLockdownOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "lockdown-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 1)";
  overlay.style.zIndex = "9999";
  overlay.style.pointerEvents = "auto";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.flexDirection = "column";
  overlay.style.fontFamily = "sans-serif";
  overlay.style.color = "#fff";

  const content = document.createElement("div");
  content.style.textAlign = "center";
  content.style.padding = "40px";
  content.style.maxWidth = "500px";

  const title = document.createElement("h1");
  title.textContent = "⏳ Processing...";
  title.style.fontSize = "36px";
  title.style.marginBottom = "20px";
  title.style.color = "#ff1493";

  const msg = document.createElement("p");
  msg.textContent = "Don't close this tab. Your order is being processed. 💕";
  msg.style.fontSize = "18px";
  msg.style.marginBottom = "20px";
  msg.style.lineHeight = "1.6";

  const subtext = document.createElement("p");
  subtext.textContent = "Your wallet is emptying...";
  subtext.style.fontSize = "16px";
  subtext.style.color = "#ff69b4";
  subtext.style.marginBottom = "25px";
  subtext.style.fontStyle = "italic";
  subtext.style.opacity = "0.9";

  const spinner = document.createElement("div");
  spinner.style.border = "4px solid #ff1493";
  spinner.style.borderTop = "4px solid transparent";
  spinner.style.borderRadius = "50%";
  spinner.style.width = "50px";
  spinner.style.height = "50px";
  spinner.style.animation = "spin 1s linear infinite";
  spinner.style.margin = "0 auto 30px";

  const reminderText = document.createElement("p");
  reminderText.textContent = "it's too late to turn back now 💦";
  reminderText.style.fontSize = "14px";
  reminderText.style.color = "#ff69b4";
  reminderText.style.marginTop = "25px";
  reminderText.style.marginBottom = "15px";
  reminderText.style.opacity = "0.85";

  const leaveBtn = document.createElement("button");
  leaveBtn.textContent = "← Leave";
  leaveBtn.style.padding = "12px 24px";
  leaveBtn.style.background = "rgba(255, 255, 255, 0.2)";
  leaveBtn.style.color = "#fff";
  leaveBtn.style.border = "2px solid #fff";
  leaveBtn.style.borderRadius = "8px";
  leaveBtn.style.cursor = "pointer";
  leaveBtn.style.fontSize = "16px";
  leaveBtn.style.marginTop = "10px";
  leaveBtn.style.transition = "all 0.3s";
  leaveBtn.style.fontWeight = "600";

  leaveBtn.onmouseover = () => {
    leaveBtn.style.background = "rgba(255, 255, 255, 0.1)";
  };
  leaveBtn.onmouseout = () => {
    leaveBtn.style.background = "rgba(255, 255, 255, 0.2)";
  };

  leaveBtn.onclick = () => {
    leaveBtn.disabled = true;
    leaveBtn.style.opacity = "0.5";
    leaveBtn.style.cursor = "not-allowed";
    showRedirectWarning(() => {
      leaveBtn.disabled = false;
      leaveBtn.style.opacity = "1";
      leaveBtn.style.cursor = "pointer";
    });
  };

  if (!document.getElementById("lockdown-styles")) {
    const style = document.createElement("style");
    style.id = "lockdown-styles";
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
      }
    `;
    document.head.appendChild(style);
  }

  content.appendChild(title);
  content.appendChild(msg);
  content.appendChild(subtext);
  content.appendChild(spinner);
  content.appendChild(reminderText);
  content.appendChild(leaveBtn);
  overlay.appendChild(content);
  document.body.appendChild(overlay);
}

// Pop a random image with warning text overlay
function showRedirectWarning(onClose) {
  imageSpawningPaused = true;

  const existingWarning = document.getElementById("redirect-warning");
  if (existingWarning) existingWarning.remove();

  const imageOverlay = document.createElement("div");
  imageOverlay.id = "redirect-warning";
  imageOverlay.style.position = "fixed";
  imageOverlay.style.top = "0";
  imageOverlay.style.left = "0";
  imageOverlay.style.width = "100%";
  imageOverlay.style.height = "100%";
  imageOverlay.style.backgroundColor = "rgba(0, 0, 0, 1)";
  imageOverlay.style.zIndex = "10000";
  imageOverlay.style.pointerEvents = "auto";
  imageOverlay.style.display = "flex";
  imageOverlay.style.alignItems = "center";
  imageOverlay.style.justifyContent = "center";
  imageOverlay.style.flexDirection = "column";

  // Add to DOM immediately so the redirect-warning check works right away
  document.body.appendChild(imageOverlay);

  setTimeout(() => {
    if (!document.getElementById("redirect-warning")) return;

    const closeOverlay = () => {
      imageOverlay.remove();
      imageSpawningPaused = false;
      if (onClose) onClose();
    };

    // Grab a random already-loaded image from the spawned ones
    const spawnedImages = Array.from(document.querySelectorAll('.spawned-image'));
    const randomImg = spawnedImages.length > 0
      ? spawnedImages[Math.floor(Math.random() * spawnedImages.length)]
      : null;

    if (randomImg) {
      const img = document.createElement("img");
      img.src = randomImg.src;
      img.style.maxWidth = "600px";
      img.style.maxHeight = "600px";
      img.style.width = "auto";
      img.style.height = "auto";
      img.style.objectFit = "contain";
      img.style.borderRadius = "8px";
      img.style.cursor = "pointer";
      img.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";
      img.style.marginBottom = "30px";
      img.onclick = closeOverlay;
      imageOverlay.appendChild(img);
    }

    const warningText = document.createElement("p");
    warningText.textContent = "Leaving now will cancel your order and you'll lose your payment. Are you sure?";
    warningText.style.color = "#ff1493";
    warningText.style.fontSize = "18px";
    warningText.style.maxWidth = "500px";
    warningText.style.textAlign = "center";
    warningText.style.lineHeight = "1.6";
    warningText.style.fontWeight = "600";
    warningText.style.marginTop = "20px";
    warningText.style.marginBottom = "20px";
    warningText.style.position = "relative";
    warningText.style.zIndex = "10001";

    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "15px";
    buttonContainer.style.justifyContent = "center";
    buttonContainer.style.position = "relative";
    buttonContainer.style.zIndex = "10002";
    buttonContainer.style.marginTop = "20px";

    const stayBtn = document.createElement("button");
    stayBtn.textContent = "Stay & Continue";
    stayBtn.style.padding = "12px 24px";
    stayBtn.style.background = "#ff1493";
    stayBtn.style.color = "#fff";
    stayBtn.style.border = "none";
    stayBtn.style.borderRadius = "6px";
    stayBtn.style.cursor = "pointer";
    stayBtn.style.fontWeight = "600";
    stayBtn.style.fontSize = "16px";
    stayBtn.style.transition = "all 0.3s";
    stayBtn.style.position = "relative";
    stayBtn.style.zIndex = "10002";

    stayBtn.onmouseover = () => {
      stayBtn.style.background = "#ff69b4";
      stayBtn.style.transform = "scale(1.05)";
    };
    stayBtn.onmouseout = () => {
      stayBtn.style.background = "#ff1493";
      stayBtn.style.transform = "scale(1)";
    };
    stayBtn.onclick = closeOverlay;

    const leaveBtn = document.createElement("button");
    leaveBtn.textContent = "Leave Anyway";
    leaveBtn.style.padding = "12px 24px";
    leaveBtn.style.background = "rgba(255, 255, 255, 0.2)";
    leaveBtn.style.color = "#fff";
    leaveBtn.style.border = "2px solid #fff";
    leaveBtn.style.borderRadius = "6px";
    leaveBtn.style.cursor = "pointer";
    leaveBtn.style.fontWeight = "600";
    leaveBtn.style.fontSize = "16px";
    leaveBtn.style.transition = "all 0.3s";
    leaveBtn.style.position = "relative";
    leaveBtn.style.zIndex = "10002";

    leaveBtn.onmouseover = () => {
      leaveBtn.style.background = "rgba(255, 255, 255, 0.3)";
      leaveBtn.style.transform = "scale(1.05)";
    };
    leaveBtn.onmouseout = () => {
      leaveBtn.style.background = "rgba(255, 255, 255, 0.2)";
      leaveBtn.style.transform = "scale(1)";
    };
    leaveBtn.onclick = closeOverlay;

    buttonContainer.appendChild(stayBtn);
    buttonContainer.appendChild(leaveBtn);

    imageOverlay.appendChild(warningText);
    imageOverlay.appendChild(buttonContainer);
  }, 1000);
}

function allowUnload() {
  if (unloadHandler) {
    window.removeEventListener('beforeunload', unloadHandler);
  }
}

// Activate lockdown
function activateLockdown() {
  if (lockdownActive) return;
  lockdownActive = true;

  createLockdownOverlay();

  const blockShortcuts = (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'q' || e.key === 'Q' || e.key === 'r' || e.key === 'R' || e.key === 'w' || e.key === 'W')) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.key === "Escape" || e.keyCode === 27) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const blockUnload = (e) => {
    e.preventDefault();
    e.returnValue = '';
    return false;
  };
  unloadHandler = blockUnload;

  const blockRightClick = (e) => {
    e.preventDefault();
    return false;
  };

  history.pushState(null, null, window.location.href);
  const blockBack = () => {
    history.pushState(null, null, window.location.href);
  };

  const supportsKeyboardLock =
      ('keyboard' in navigator) && ('lock' in navigator.keyboard);

  document.addEventListener('keydown', blockShortcuts, true);
  window.addEventListener('beforeunload', blockUnload);
  document.addEventListener('contextmenu', blockRightClick, true);
  window.addEventListener('popstate', blockBack);
  if (supportsKeyboardLock) {
    document.addEventListener('fullscreenchange', async () => {
      if (document.fullscreenElement) {
        await navigator.keyboard.lock(['Escape']);
        return;
      }
      navigator.keyboard.unlock();
    });
  }
  document.addEventListener('click', (e) => {
    if (!e.isTrusted) return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  });
}

// Deactivate lockdown
function deactivateLockdown() {
  const overlay = document.getElementById("lockdown-overlay");
  if (overlay) overlay.remove();
  lockdownActive = false;
}

// Reactivate lockdown (overlay only as event listeners are still attached)
function reactivateLockdown() {
  if (lockdownActive) return;
  lockdownActive = true;
  createLockdownOverlay();
}

// Image position calculation
function calculateImagePosition() {
  const IMG_WIDTH = 400;
  const IMG_HEIGHT = 400;
  const SAFE_ZONE_HEIGHT = 450;
  const SAFE_ZONE_WIDTH = 800;

  const safeZoneLeftBound = window.innerWidth / 2 - SAFE_ZONE_WIDTH / 2;
  const safeZoneRightBound = window.innerWidth / 2 + SAFE_ZONE_WIDTH / 2;
  const safeZoneTopStart = window.innerHeight / 2 - SAFE_ZONE_HEIGHT / 2;
  const safeZoneBottomEnd = window.innerHeight / 2 + SAFE_ZONE_HEIGHT / 2;

  let left, top;
  let validPosition = false;

  for (let attempts = 0; attempts < 30; attempts++) {
    left = Math.random() * Math.max(0, window.innerWidth - IMG_WIDTH);
    top = Math.random() * Math.max(0, window.innerHeight - IMG_HEIGHT);

    const noHorizontalOverlap = (left + IMG_WIDTH) < safeZoneLeftBound || left > safeZoneRightBound;
    const noVerticalOverlap = (top + IMG_HEIGHT) < safeZoneTopStart || top > safeZoneBottomEnd;

    if (noHorizontalOverlap || noVerticalOverlap) {
      validPosition = true;
      break;
    }
  }

  if (!validPosition) {
    const corners = [
      { x: 0, y: 0 },
      { x: window.innerWidth - IMG_WIDTH, y: 0 },
      { x: 0, y: window.innerHeight - IMG_HEIGHT },
      { x: window.innerWidth - IMG_WIDTH, y: window.innerHeight - IMG_HEIGHT }
    ];
    const randomCorner = corners[Math.floor(Math.random() * corners.length)];
    left = randomCorner.x;
    top = randomCorner.y;
  }

  return { left, top };
}

// Spawn images
function spawnImage() {
  if (imageSpawningPaused) return;

  const imageServiceUrl = `${IMAGE_SERVICE}/api/random-image`;

  fetch(imageServiceUrl)
    .then(r => r.json())
    .then(data => {
      if (imageSpawningPaused) return;

      const img = document.createElement("img");
      const fullUrl = data.url.startsWith('http') ? data.url : IMAGE_SERVICE + data.url;
      img.src = fullUrl;
      img.className = "spawned-image";
      img.style.position = "fixed";
      img.style.pointerEvents = "none";
      img.style.zIndex = "10000";
      img.style.maxWidth = "400px";
      img.style.maxHeight = "400px";
      img.style.width = "auto";
      img.style.height = "auto";
      img.style.objectFit = "contain";
      img.style.borderRadius = "8px";
      img.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";

      const pos = calculateImagePosition();
      img.style.left = pos.left + "px";
      img.style.top = pos.top + "px";

      const existing = document.querySelectorAll('.spawned-image');
      if (existing.length >= 50) {
        const victim = existing[Math.floor(Math.random() * existing.length)];
        victim.remove();
      }

      document.body.appendChild(img);
    })
    .catch(e => console.error("Image fetch error:", e));
}

// Floating text prompts
const edgePrompts = [
  "don't cum ~ 💕",
  "just one more send… 💞",
  "ur doing such a good job ~ 🤭",
  "ur such a good boy 💕",
  "keep going ~ 💞",
  "don't stop 🤭",
  "good boy 💕",
  "deeper and deeper ~ 💞",
  "stroke for me ~ 🤭",
  "just give in 💕",
  "faster ~ 💞",
  "edge for me ~ 🤭",
  "don't u dare stop ~ 💕",
  "ur mine now 💞",
  "keep pumping ~ 🤭",
  "sooo close ~ 💕",
  "that's it good boy 💞",
  "u can't stop now ~ 🤭",
  "one more… 💕",
  "send again ~ 💞"
];

function spawnText() {
  if (imageSpawningPaused) return;

  const text = document.createElement("div");
  const prompt = edgePrompts[Math.floor(Math.random() * edgePrompts.length)];
  text.textContent = prompt;
  text.className = "spawned-text";
  text.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 10001;
    color: #ff1493;
    font-size: ${40 + Math.random() * 30}px;
    font-weight: 700;
    text-shadow: 0 0 10px rgba(255,20,147,0.6), 0 2px 4px rgba(0,0,0,0.8);
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.5s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  const pos = calculateImagePosition();
  text.style.left = pos.left + "px";
  text.style.top = pos.top + "px";

  document.body.appendChild(text);

  requestAnimationFrame(() => { text.style.opacity = "1"; });

  const duration = 2000 + Math.random() * 2000;
  setTimeout(() => {
    text.style.opacity = "0";
    setTimeout(() => text.remove(), 500);
  }, duration);
}

// Reposition all existing spawned images for current window size
function repositionSpawnedImages() {
  document.querySelectorAll('.spawned-image').forEach(img => {
    const pos = calculateImagePosition();
    img.style.left = pos.left + "px";
    img.style.top = pos.top + "px";
  });
}

// Show choice modal
function showChoiceModal(options, onConfirm, onCancel, defaultValue) {
  const existingModal = document.getElementById("extension-choice-modal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = "extension-choice-modal";
  modal.style.position = "fixed";
  modal.style.left = "0";
  modal.style.top = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.background = "rgba(0, 0, 0, 0.5)";
  modal.style.zIndex = "10001";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.pointerEvents = "auto";

  const content = document.createElement("div");
  content.style.background = "#fff";
  content.style.color = "#000";
  content.style.padding = "40px";
  content.style.borderRadius = "12px";
  content.style.minWidth = "280px";
  content.style.maxWidth = "90%";
  content.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.3)";
  content.style.fontFamily = "sans-serif";

  const title = document.createElement("div");
  title.textContent = "Choose an item to add to cart";
  title.style.fontWeight = "600";
  title.style.marginBottom = "20px";
  title.style.fontSize = "16px";

  const select = document.createElement("select");
  select.style.width = "100%";
  select.style.marginBottom = "20px";
  select.style.padding = "8px";
  select.style.borderRadius = "4px";
  select.style.border = "1px solid #ddd";
  select.style.fontSize = "14px";

  options.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    select.appendChild(o);
  });

  if (defaultValue) {
    select.value = defaultValue;
  }

  const buttons = document.createElement("div");
  buttons.style.display = "flex";
  buttons.style.justifyContent = "flex-end";
  buttons.style.gap = "8px";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.padding = "8px 16px";
  cancelBtn.style.background = "#f0f0f0";
  cancelBtn.style.border = "none";
  cancelBtn.style.borderRadius = "4px";
  cancelBtn.style.cursor = "pointer";
  cancelBtn.onclick = () => {
    modal.remove();
    onCancel && onCancel();
  };

  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "Start Drain";
  confirmBtn.style.padding = "8px 16px";
  confirmBtn.style.background = "#ff69b4";
  confirmBtn.style.color = "white";
  confirmBtn.style.border = "none";
  confirmBtn.style.borderRadius = "4px";
  confirmBtn.style.cursor = "pointer";
  confirmBtn.style.fontWeight = "600";
  confirmBtn.onclick = () => {
    const value = select.value;
    chrome.runtime.sendMessage({ action: 'startAudio' }).catch(() => {});
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    modal.remove();
    onConfirm && onConfirm(value);
  };

  buttons.appendChild(cancelBtn);
  buttons.appendChild(confirmBtn);

  content.appendChild(title);
  content.appendChild(select);
  content.appendChild(buttons);
  modal.appendChild(content);
  document.body.appendChild(modal);
  select.focus();
}

// Check element readiness
function isElementReady(el) {
  if (!el || !document.contains(el)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (el.offsetParent === null) return false;
  return true;
}

// Get items from page
function buildItemsFromPage() {
  const items = [];
  const emojis = {};
  const prices = {};

  const cards = document.querySelectorAll("#parent");

  for (const card of cards) {
    const wrapper = card.closest("[class*='chakra-stack']");
    if (!wrapper) continue;

    // Skip non "Add to cart" items (e.g. crowdfunding)
    const btns = wrapper.querySelectorAll("button");
    let hasAddToCart = false;
    for (const btn of btns) {
      if (btn.textContent.trim().toLowerCase() === "add to cart") {
        hasAddToCart = true;
        break;
      }
    }
    if (!hasAddToCart) continue;

    // Emoji
    const emojiEl = card.querySelector(".chakra-aspect-ratio p");
    const emoji = emojiEl ? emojiEl.textContent.trim() : "";

    // Heading (unique item name)
    const allLinkPs = wrapper.querySelectorAll("a p");
    let heading = "";
    for (const p of allLinkPs) {
      if (p.closest(".chakra-aspect-ratio")) continue;
      const text = p.textContent.trim();
      if (text) { heading = text; break; }
    }
    if (!heading) continue;

    // Price is in the first <span> in the card info area (outside aspect-ratio/buttons/avatars)
    const allSpans = wrapper.querySelectorAll("span");
    let price = '';
    for (const span of allSpans) {
      if (span.closest(".chakra-aspect-ratio")) continue;
      if (span.closest("button")) continue;
      if (span.closest("[class*='avatar']")) continue;
      const text = span.textContent.trim();
      if (text) { price = text; break; }
    }

    if (!items.includes(heading)) {
      items.push(heading);
      emojis[heading] = emoji;
      prices[heading] = price;
    }
  }

  ALLOWED_ITEMS = items;
  ITEM_EMOJIS = emojis;
  ITEM_PRICES = prices;
}

// Scan for items
function scanAllowedItems() {
  buildItemsFromPage();

  const found = [];
  const cards = document.querySelectorAll("#parent");

  for (const card of cards) {
    const wrapper = card.closest("[class*='chakra-stack']");
    if (!wrapper || !isElementReady(wrapper)) continue;

    // Get heading from this card
    const allLinkPs = wrapper.querySelectorAll("a p");
    let heading = "";
    for (const p of allLinkPs) {
      if (p.closest(".chakra-aspect-ratio")) continue;
      const text = p.textContent.trim();
      if (text) { heading = text; break; }
    }

    if (!heading || !ALLOWED_ITEMS.includes(heading)) continue;

    found.push({
      text: heading,
      card: wrapper,
      emoji: ITEM_EMOJIS[heading] || "",
      heading: heading
    });
  }

  return found;
}

// Initialize selection
function initSelectionThenStart() {
  // Clear any existing cart items at start
  document.querySelectorAll("button").forEach(btn => {
    if (btn.textContent.trim() === "Remove") btn.click();
  });

  // Stop scrollbar flashes, hide live support
  document.documentElement.style.overflow = 'hidden';
  document.head.insertAdjacentHTML("beforeend","<style>.intercom-lightweight-app{display:none!important}</style>");

  if (sessionStorage.getItem(SESSION_PROMPT_KEY) === "1") {
    startMainLoop();
    return;
  }

  setTimeout(() => {
    const attemptSelection = () => {
      const found = scanAllowedItems();
      const options = found.map(f => {
        const price = ITEM_PRICES[f.heading] || '';
        const label = price ? `${f.emoji} — ${f.heading} - ${price}` : `${f.emoji} — ${f.heading}`;
        return {
          value: f.heading,
          label: label,
          heading: f.heading
        };
      });

      if (options.length > 0) {
        if (awaitingSelection) return;
        awaitingSelection = true;

        const saved = localStorage.getItem(STORAGE_KEY);
        const defaultValue = saved && options.some(o => o.value === saved) ? saved : null;

        showChoiceModal(options, (choice) => {
          awaitingSelection = false;
          sessionStorage.setItem(SESSION_PROMPT_KEY, "1");

          const matched = options.find(o => o.value === choice);
          if (matched) {
            selectedItem = matched.heading;
            selectedItemPrice = Math.round(parseFloat((ITEM_PRICES[selectedItem] || '').replace(/[^0-9.]/g, ''))) || 0;
            localStorage.setItem(STORAGE_KEY, selectedItem);
            localStorage.setItem(STORAGE_PRICE_KEY, selectedItemPrice);
            startMainLoop();
          } else {
            setTimeout(attemptSelection, 2000);
          }
        }, () => {
          awaitingSelection = false;
          setTimeout(attemptSelection, 2000);
        }, defaultValue);
      } else {
        setTimeout(attemptSelection, 2000);
      }
    };

    attemptSelection();
  }, 1000);
}

// Click add to cart
function clickAddToCart() {
  setTimeout(() => {
    if (!selectedItem) return;

    // selectedItem is the heading text — find the matching card
    const cards = document.querySelectorAll("#parent");
    for (const card of cards) {
      const wrapper = card.closest("[class*='chakra-stack']");
      if (!wrapper) continue;

      const allLinkPs = wrapper.querySelectorAll("a p");
      let heading = "";
      for (const p of allLinkPs) {
        if (p.closest(".chakra-aspect-ratio")) continue;
        const text = p.textContent.trim();
        if (text) { heading = text; break; }
      }

      if (heading !== selectedItem) continue;

      const btns = wrapper.querySelectorAll("button");
      for (const btn of btns) {
        if (btn.textContent.trim().toLowerCase() === "add to cart" && !btn.disabled) {
          btn.click();
          return;
        }
      }
    }
  }, 1500);
}

// Click checkout
function clickCheckout() {
  setTimeout(() => {
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      const text = (btn.textContent || "").trim().toLowerCase();
      if (text.includes("checkout")) {
        btn.click();
        return;
      }
    }
  }, 2000);
}

// Click pay now
function clickPayNow() {
  setTimeout(() => {
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      const span = btn.querySelector("span");
      if (span && span.textContent.trim().toLowerCase() === "pay now" && !btn.disabled) {
        setTimeout(() => {
          btn.click();
          return;
        }, 4000);
      }
    }
  }, 2000);
}

// Detect route
function detectCurrentRoute() {
  const url = window.location.href;
  const params = new URLSearchParams(window.location.search);

  if (params.has('showCheckoutCompleteModal') && params.get('showCheckoutCompleteModal') === 'true') {
    return 'success';
  }

  if (url.includes('checkout')) {
    return 'checkout';
  } else if (url.includes(THRONE_USER) || url.includes('/cart')) {
    return 'cart';
  }

  return 'unknown';
}

// Track send and show hardcore messages
function trackSend() {
  if (checkoutCounted) return;
  checkoutCounted = true;

  const prevDrained = totalDrained;
  totalDrained += selectedItemPrice;
  sendCount++;

  if (sendCount === 1) {
    showSendMsg("u started this ~ 💕\nno quitting until i say so 🤭");
  }
  if (sendCount > 1 && sendCount % 3 === 0) {
    const fakeLastOnes = [
      "okay this is the last one ~ 💕\ni promise 🤭",
      "one more and then ur done ~ 💞\ni mean it this time 🤭",
      "just this one more ~ 💕\nthen u can stop >.< 🤭",
      "after this one u can go ~ 💞\nprobably 🤭",
      "almost done boyfie ~ 💕\njust keep going a little longer 🤭"
    ];
    showSendMsg(fakeLastOnes[Math.floor(Math.random() * fakeLastOnes.length)]);
  }
  if (sendCount === 5) showSendMsg("5 sends already ~ 💕\nur such an obedient little boy 🤭");
  if (sendCount === 10) showSendMsg("double digits 💞\ni knew u couldn't stop 🤭");
  if (sendCount === 20) showSendMsg("20 sends 💕\nur literally addicted to me\nand i love it >.< 🤭");
  if (sendCount === 7) showSendMsg("see?? 💕\nthis is so much better\nthan saving ur money 🤭");
  if (sendCount === 15) showSendMsg("u don't need that money 💞\nu need ME 🤭");
  if (prevDrained < 40 && totalDrained >= 40) showSendMsg("$40 already?? 💕\nur doing so good ~ keep going 🤭");
  if (prevDrained < 80 && totalDrained >= 80) showSendMsg("$80 ~ 💞\ndon't stop now ur in too deep 🤭");
  if (prevDrained < 160 && totalDrained >= 160) showSendMsg("$160 gone 💕\nand ur still here ~ that's so hot 🤭");
  if (prevDrained < 320 && totalDrained >= 320) showSendMsg("$320 ~ 💞\nur officially my favourite 🤭💕");
  if (totalDrained >= 500 && Math.floor(totalDrained / 100) > Math.floor(prevDrained / 100)) {
    const milestone = Math.floor(totalDrained / 100) * 100;
    showSendMsg("$" + milestone + " 💕\nu literally can't stop can u 🤭");
  }
}

// Main loop
function mainLoop() {
  if (checkUrlGuard()) {
    return;
  }

  const currentRoute = detectCurrentRoute();

  if (currentRoute !== lastDetectedRoute) {
    routeChangeCount++;
    lastDetectedRoute = currentRoute;
    reactivateLockdown();
  }

  if (currentRoute === 'success') {
    if (imageSpawningPaused && !document.getElementById('redirect-warning')) {
      imageSpawningPaused = false;
      const style = document.getElementById('hide-spawned-images');
      if (style) style.textContent = '';
    }

    checkoutCounted = false;
    lastDetectedRoute = null;
    selectedItem = localStorage.getItem(STORAGE_KEY) || null;

    const closeBtn = document.querySelector('button[aria-label="Close"]');
    if (closeBtn) {
      closeBtn.click();
    }
  }

  // Check for card decline / payment error
  const pageText = document.body.innerText.toLowerCase();
  const isDeclined = pageText.includes('declined') || pageText.includes('insufficient funds') || pageText.includes('try a different card');

  if (isDeclined && !document.getElementById('decline-overlay')) {
    const declineMessages = [
      "aww ur card declined ~ 💕\nbe a good boy and add more funds\nthen come right back to me 🤭",
      "don't stop now ~ 💞\nur card needs more money on it\ngo top it up and keep draining for me 💕",
      "ur almost out ~ 🤭\nadd more to ur card boyfie\ni know u want to keep going 💞",
      "card declined?? 💕\nthat just means u've been such a good boy ~\nnow reload it and come back to me 🤭",
      "noo don't let it end here ~ 💞\ngo add more funds rn\ni'll be waiting for u 💕"
    ];
    const msg = declineMessages[Math.floor(Math.random() * declineMessages.length)];

    const declineOverlay = document.createElement('div');
    declineOverlay.id = 'decline-overlay';
    declineOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,1);z-index:999999;display:flex;align-items:center;justify-content:center;flex-direction:column;cursor:pointer;';
    declineOverlay.innerHTML = `
      <div style="color:#ff1493;font-size:36px;font-weight:700;text-align:center;line-height:1.6;white-space:pre-line;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-shadow:0 0 20px rgba(255,20,147,0.5);padding:20px;">${msg}<br><br>click to continue...</div>
    `;
    declineOverlay.addEventListener('click', () => {
      // Set flag so overlay shows instantly on reload before page renders
      localStorage.setItem('autodrain_reloading', 'true');
      allowUnload();
      window.location.reload();
    });
    document.body.appendChild(declineOverlay);
  }

  // If reloading after decline, show black screen immediately so they see nothing
  if (localStorage.getItem('autodrain_reloading') === 'true') {
    localStorage.removeItem('autodrain_reloading');
    if (!document.getElementById('decline-overlay')) {
      const reloadOverlay = document.createElement('div');
      reloadOverlay.id = 'decline-overlay';
      reloadOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,1);z-index:999999;display:flex;align-items:center;justify-content:center;flex-direction:column;';
      reloadOverlay.innerHTML = '<div style="color:#ff1493;font-size:36px;font-weight:700;text-align:center;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,sans-serif;text-shadow:0 0 20px rgba(255,20,147,0.5);padding:20px;">restarting ~ 💕\nbe patient for me 🤭</div>';
      document.body.appendChild(reloadOverlay);
      // Remove after 5 seconds to let the drain take over
      setTimeout(() => {
        if (document.getElementById('decline-overlay')) {
          document.getElementById('decline-overlay').remove();
        }
      }, 5000);
    }
  }

  if (currentRoute === 'checkout') {
    clickPayNow();
    trackSend();
  } else if (currentRoute === 'cart') {
    clickAddToCart();
    clickCheckout();
  }

  if (!stallTimerActive) {
    stallTimerActive = true;
    const countBefore = routeChangeCount;

    setTimeout(() => {
      if (routeChangeCount === countBefore) {
        imageSpawningPaused = true;
        deactivateLockdown();
        let style = document.getElementById('hide-spawned-images');
        if (!style) {
          style = document.createElement('style');
          style.id = 'hide-spawned-images';
          document.head.appendChild(style);
        }
        style.textContent = '.spawned-image { display: none !important; }';
      }
      stallTimerActive = false;
    }, 10000);
  }

  setTimeout(mainLoop, 3000);
}

// Start main loop
function startMainLoop() {
  activateLockdown();

  mainLoop();

  for (let i = 0; i < 15; i++) {
    spawnImage();
  }

  setInterval(spawnImage, 250);
  setInterval(spawnText, 2500);

  // Reposition images on resize so they don't overlap the safe zone
  window.addEventListener('resize', repositionSpawnedImages);
}

// URL guard
function checkUrlGuard() {
  const path = window.location.pathname.toLowerCase();
  const allowedPaths = [`/${THRONE_USER}`, '/login', '/landing', '/signup', '/checkout'];
  const isAllowed = allowedPaths.some(p => path.includes(p));

  if (!isAllowed) {
    const throneUrl = `https://throne.com/${THRONE_USER}`;
    allowUnload();
    showNoEscapeWarning(throneUrl);
    return true;
  }
  return false;
}

// Begin
const guardBlocked = checkUrlGuard();
if (!guardBlocked) {
  initSelectionThenStart();
}