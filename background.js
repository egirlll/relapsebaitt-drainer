// *** State ***

let offscreenCreated = false;

// *** Offscreen Audio ***

async function ensureOffscreen() {
  if (offscreenCreated) return;
  const exists = await chrome.offscreen.hasDocument().catch(() => false);
  if (exists) {
    offscreenCreated = true;
    return;
  }
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Play drain audio'
  }).catch(() => {});
  offscreenCreated = true;
}

async function playAudio() {
  await ensureOffscreen();
  chrome.runtime.sendMessage({ action: 'playAudio' }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'startAudio') {
    playAudio();
  }
});