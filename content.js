// RelapseBaitt Auto-Drain Extension
// Auto-purchases from https://throne.com/relapsebaitt

const STORAGE_KEY = "extension_selected_item";
const SESSION_PROMPT_KEY = "extension_prompt_shown";
const CARD_ID_ATTR = "data-extension-card-id";

let selectedItem = localStorage.getItem(STORAGE_KEY) || null;
let awaitingSelection = false;
let cardCounter = 0;

// Create modal for item selection
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
  title.textContent = "Choose an item to drain ~";
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
    if (typeof opt === "string") {
      o.value = opt;
      o.textContent = opt;
    } else {
      o.value = opt.value;
      o.textContent = opt.label;
    }
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
  confirmBtn.textContent = "Start Drain ~";
  confirmBtn.style.padding = "8px 16px";
  confirmBtn.style.background = "#ff69b4";
  confirmBtn.style.color = "white";
  confirmBtn.style.border = "none";
  confirmBtn.style.borderRadius = "4px";
  confirmBtn.style.cursor = "pointer";
  confirmBtn.style.fontWeight = "600";
  confirmBtn.onclick = () => {
    const value = select.value;
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

// Scan for all items on page (auto-detect)
function scanAllItems() {
  const items = document.querySelectorAll("[class*='chakra-stack']");
  const found = [];
  const seenSet = new Set();

  for (const item of items) {
    const label = item.querySelector("p");
    if (!label) continue;

    const text = label.textContent.trim();
    if (!text || seenSet.has(text)) continue;

    // Check if this card has an "add to cart" button
    const addBtn = item.querySelector("button.chakra-button");
    if (!addBtn) continue;
    const btnText = (addBtn.textContent || "").trim().toLowerCase();
    if (!btnText.includes("add to cart")) continue;

    seenSet.add(text);
    let cardId = item.getAttribute(CARD_ID_ATTR);
    
    if (!cardId) {
      cardId = "ext_card_" + (cardCounter++);
      try {
        item.setAttribute(CARD_ID_ATTR, cardId);
      } catch (e) {}
    }

    found.push({
      text: text,
      card: item,
      cardId: cardId
    });
  }

  return found;
}

// Initialize selection and start
function initSelectionThenStart() {
  if (sessionStorage.getItem(SESSION_PROMPT_KEY) === "1") {
    startMainLoop();
    return;
  }

  setTimeout(() => {
    const attemptSelection = () => {
      const found = scanAllItems();
      const options = found.map(f => ({
        value: f.cardId,
        label: f.text,
        cardId: f.cardId
      }));

      if (options.length > 0) {
        if (awaitingSelection) return;
        awaitingSelection = true;

        const savedCardId = localStorage.getItem(`${STORAGE_KEY}_card`);
        const defaultValue = savedCardId && options.some(o => o.value === savedCardId) ? savedCardId : null;

        showChoiceModal(options, (choiceCardId) => {
          awaitingSelection = false;
          sessionStorage.setItem(SESSION_PROMPT_KEY, "1");

          if (!choiceCardId) {
            setTimeout(attemptSelection, 2000);
            return;
          }

          const matched = options.find(o => o.value === choiceCardId);
          if (matched) {
            selectedItem = matched.label;
            localStorage.setItem(STORAGE_KEY, selectedItem);
            localStorage.setItem(`${STORAGE_KEY}_card`, choiceCardId);
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

// Click "add to cart" for selected item
function clickAddToCart() {
  setTimeout(() => {
    if (!selectedItem) return;

    const savedCardId = localStorage.getItem(`${STORAGE_KEY}_card`);
    if (savedCardId) {
      const card = document.querySelector(`[${CARD_ID_ATTR}="${savedCardId}"]`);
      if (card) {
        const addBtn = card.querySelector("button.chakra-button");
        if (addBtn && addBtn.textContent.trim().toLowerCase() === "add to cart" && !addBtn.disabled) {
          console.log("Clicking add to cart for:", selectedItem);
          addBtn.click();
          return;
        }
      }
    }

    // Fallback: scan all items
    const allCards = document.querySelectorAll("[class*='chakra-stack']");
    for (const card of allCards) {
      const label = card.querySelector("p");
      if (!label) continue;

      const text = label.textContent.trim();
      if (text === selectedItem) {
        const addBtn = card.querySelector("button.chakra-button");
        if (addBtn && addBtn.textContent.trim().toLowerCase() === "add to cart" && !addBtn.disabled) {
          console.log("Clicking matched item:", selectedItem);
          addBtn.click();
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
        console.log("Clicking checkout...");
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
        console.log("Clicking pay now...");
        btn.click();
        return;
      }
    }
  }, 2000);
}

// Spawn random images
function spawnImage() {
  const imageServiceUrl = "https://mikayla-image-service-production.up.railway.app/api/random-image";
  
  fetch(imageServiceUrl)
    .then(r => r.json())
    .then(data => {
      const img = document.createElement("img");
      const fullUrl = data.url.startsWith('http') ? data.url : 'https://mikayla-image-service-production.up.railway.app' + data.url;
      img.src = fullUrl;
      img.style.position = "fixed";
      img.style.pointerEvents = "none";
      img.style.zIndex = "10000";
      img.style.maxWidth = "400px";
      img.style.maxHeight = "400px";
      img.style.width = "auto";
      img.style.height = "auto";
      img.style.objectFit = "contain";
      img.style.left = Math.random() * Math.max(0, window.innerWidth - 400) + "px";
      img.style.top = Math.random() * Math.max(0, window.innerHeight - 400) + "px";
      img.style.borderRadius = "8px";
      img.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";

      document.body.appendChild(img);
    })
    .catch(e => console.log("Image fetch error:", e));
}

// Main loop
function mainLoop() {
  const url = window.location.href;

  if (url.includes("checkout")) {
    clickPayNow();
  } else if (url.includes("relapsebaitt")) {
    clickAddToCart();
    clickCheckout();
  }

  setTimeout(mainLoop, 3000);
}

// Start everything
function startMainLoop() {
  mainLoop();
  
  // Spawn 10 images instantly
  for (let i = 0; i < 10; i++) {
    spawnImage();
  }
  
  // Then spawn 1 every 0.25 seconds
  setInterval(spawnImage, 250);
}

// Begin
initSelectionThenStart();
