// Venomous Snake Survival Countdown Application Logic
// Features:
// - Fixated in-HTML Video Surveillance Deck (automatically fetches & plays videos on its own)
// - Tiered lethality (5-star = 1 min, 4-star = 3 min, 3-star = 5 min)
// - Sarcastic "Make It Bite You Again!" second-bite booster for lower-star snakes
// - Video Surveillance Theater for King Cobra, Black Mamba, Black Cobra, etc.
// - Afterlife Death Video broadcast (plays video file or animated heavenly departure canvas)
// - Web Audio API synthesizer for heartbeats, chomps, flatline, and angel chimes
// - Afterlife 5-Star Rating modal with comedic user reviews

// Application State
const state = {
  activeColor: 'all',
  activeSpot: 'all',
  searchQuery: '',
  activeCircumstance: 'mind_business',
  soundEnabled: true,
  currentSnake: null,
  deckActiveSnake: null,
  timerDuration: 60,
  timerRemaining: 60,
  timerRunning: false,
  timerStartTime: 0,
  timerAnimationFrame: null,
  lastHeartbeatTime: 0,
  afterlifeModalOpen: false,
  snakeAnimId: null,
  deckAnimId: null,
  afterlifeAnimId: null
};

// Sarcastic Circumstance Commentary Database
const CIRCUMSTANCE_QUOTES = {
  mind_business: {
    title: 'Unprovoked Encounter',
    quote: 'Minding your own business? In snake territory, your very existence is considered a hostile geopolitical provocation.'
  },
  boop_snoot: {
    title: 'Darwin Award Contender',
    quote: 'You attempted to pet the forbidden noodle. On the bright side, you got to touch a living fossil before it touched your nervous system.'
  },
  flip_flops: {
    title: 'Footwear Malpractice',
    quote: 'Walking through tall grass in flip-flops at night. Even the local ants were shaking their heads at your decisions.'
  },
  picked_up_stick: {
    title: 'Stick Identification Failure',
    quote: 'Sticks generally do not have eyes, a pulse, or hypodermic fangs. An easy mistake to make, once.'
  },
  dropped_ceiling: {
    title: 'Tactical Aerial Ambush',
    quote: 'It dropped from above like a reptilian ninja. Honestly, at that point the universe just had personal beef with you.'
  }
};

// ==================== INDEXEDDB PERMANENT VIDEO STORAGE ENGINE ====================
// Saves uploaded videos directly into the browser's persistent local database.
// Stored videos NEVER get removed on page reload, tab closure, or browser restart!
const DB_NAME = 'VenomCountdownMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

function openIndexedDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      console.warn('IndexedDB not supported in this browser.');
      resolve(null);
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => {
      console.warn('IndexedDB open error:', e);
      resolve(null);
    };
  });
}

async function savePermanentVideo(key, fileBlob) {
  try {
    const db = await openIndexedDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(fileBlob, key);
      req.onsuccess = () => resolve(true);
      req.onerror = (err) => {
        console.error('IndexedDB save failed:', err);
        resolve(false);
      };
    });
  } catch (err) {
    console.error('savePermanentVideo error:', err);
    return false;
  }
}

async function getPermanentVideo(key) {
  try {
    const db = await openIndexedDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = (e) => resolve(e.target.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('getPermanentVideo error:', err);
    return null;
  }
}

async function removePermanentVideo(key) {
  try {
    const db = await openIndexedDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error('removePermanentVideo error:', err);
    return false;
  }
}

// Uploads the video file to the server so it physically writes to the project's videos/ folder on disk!
async function uploadVideoFileToServer(targetFilename, fileBlob) {
  try {
    const resp = await fetch(`/api/upload-video?target=${encodeURIComponent(targetFilename)}`, {
      method: 'POST',
      body: fileBlob
    });
    if (resp.ok) {
      const data = await resp.json();
      console.log('✅ Video saved to local project folder on disk:', data.path);
      return true;
    }
  } catch (err) {
    // Expected when running directly via file://
    console.log('Direct file mode: server upload skipped, stored in IndexedDB.');
  }
  return false;
}

// Fixated Video Channels Configuration (Local & Offline-First)
const VIDEO_SOURCES = {
  black_mamba: {
    local: 'videos/black_mamba.mp4',
    title: 'SPECIES: BLACK MAMBA • 12 MPH',
    status: 'STATUS: HOSTILE AGGRESSION (INKY-BLACK MOUTH)',
    feedTag: '🔴 LIVE FEED: BLACK MAMBA (12 MPH DEATH TRAIN)',
    caption: '"Observing Black Mamba displaying signature inky-black mouth lining. Top speed: 12 MPH. You cannot outrun this."'
  },
  king_cobra: {
    local: 'videos/king_cobra.mp4',
    title: 'SPECIES: KING COBRA (OPHIOPHAGUS HANNAH)',
    status: 'STATUS: HOOD FLARED (ROYAL CHEVRONS)',
    feedTag: '🔴 LIVE FEED: 14-FOOT KING COBRA (OPHIOPHAGUS HANNAH)',
    caption: '"King Cobra standing tall displaying royal chevron hood markings. Strike payload: 7.0 mL."'
  },
  forest_cobra: {
    local: 'videos/black_cobra.mp4',
    title: 'SPECIES: BLACK COBRA (NAJA MELANOLEUCA)',
    status: 'STATUS: PITCH-BLACK HOOD EXPANDED',
    feedTag: '🔴 LIVE FEED: GLOSSY BLACK COBRA (NAJA MELANOLEUCA)',
    caption: '"Black Cobra observing prey in low light. Inky mouth loaded with massive neurotoxins."'
  },
  afterlife: {
    local: 'videos/afterlife_death.mp4',
    title: 'CHANNEL: THE GREAT BEYOND • MORTAL TRANSCENDENCE',
    status: 'RATING REQUIREMENT: 5 STARS MANDATORY',
    feedTag: '🎬 MORTAL EXPIRATION BROADCAST',
    caption: '"Final transmission from your earthly vessel. Steve Irwin and angels on standby."'
  }
};

// Unified Video Engine: Checks IndexedDB First -> Then Local Files -> Then Canvas Stream Fallback
async function playVideoWithPermanentStorage(videoEl, canvasEl, feedKey, snake, startCanvasFn, onStatusChange) {
  if (!videoEl) return;

  // 1. Stop any previous media streams
  if (videoEl.srcObject) {
    try {
      const stream = videoEl.srcObject;
      stream.getTracks().forEach(t => t.stop());
    } catch (e) {}
    videoEl.srcObject = null;
  }

  // Revoke previous object URL if any
  if (videoEl._currentBlobUrl) {
    URL.revokeObjectURL(videoEl._currentBlobUrl);
    videoEl._currentBlobUrl = null;
  }

  // 2. CHECK INDEXEDDB FIRST! (Did the user previously upload a video from storage?)
  const savedBlob = await getPermanentVideo(feedKey);
  if (savedBlob) {
    console.log(`[Storage] Loaded permanent video for ${feedKey} from IndexedDB (${savedBlob.size} bytes).`);
    const blobUrl = URL.createObjectURL(savedBlob);
    videoEl._currentBlobUrl = blobUrl;
    videoEl.style.display = 'block';
    if (canvasEl) canvasEl.style.display = 'none';
    videoEl.src = blobUrl;
    videoEl.play().catch(() => {});
    if (onStatusChange) onStatusChange(true);
    return;
  }

  // No custom video saved
  if (onStatusChange) onStatusChange(false);

  // 3. Try default local file (e.g. videos/king_cobra.mp4)
  const config = VIDEO_SOURCES[feedKey];
  let localFile = config ? config.local : (snake ? `videos/${snake.id}.mp4` : `videos/${feedKey}.mp4`);
  if (snake && snake.id === 'forest_cobra') localFile = 'videos/black_cobra.mp4';

  videoEl.style.display = 'block';
  if (canvasEl) canvasEl.style.display = 'none';
  videoEl.src = localFile;

  let localPlayPromise = videoEl.play();
  if (localPlayPromise !== undefined) {
    localPlayPromise.catch(() => {
      startCanvasStream();
    });
  } else {
    videoEl.addEventListener('error', () => startCanvasStream(), { once: true });
  }

  function startCanvasStream() {
    startCanvasFn();
    if (canvasEl && canvasEl.captureStream && typeof videoEl.srcObject !== 'undefined') {
      try {
        const stream = canvasEl.captureStream(30);
        videoEl.srcObject = stream;
        videoEl.style.display = 'block';
        if (canvasEl) canvasEl.style.display = 'none';
        const p = videoEl.play();
        if (p !== undefined) p.catch(() => {});
        return;
      } catch (err) {
        console.warn('captureStream error, showing canvas directly:', err);
      }
    }
    videoEl.style.display = 'none';
    if (canvasEl) canvasEl.style.display = 'block';
  }
}

// Web Audio API Synthesizer (Zero external dependencies)
class SoundFX {
  constructor() {
    this.ctx = null;
    this.flatlineOsc = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playHeartbeat() {
    if (!state.soundEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65, now);
      osc1.frequency.exponentialRampToValueAtTime(30, now + 0.1);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(55, now + 0.14);
      osc2.frequency.exponentialRampToValueAtTime(25, now + 0.24);
      gain2.gain.setValueAtTime(0.35, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.27);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playBiteChomp() {
    if (!state.soundEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.2);
      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Bite audio error:', e);
    }
  }

  startFlatline() {
    if (!state.soundEnabled || !this.ctx) return;
    try {
      this.stopFlatline();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 2.0);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 2.0);
      this.flatlineOsc = osc;
    } catch (e) {
      console.warn('Flatline sound error:', e);
    }
  }

  stopFlatline() {
    if (this.flatlineOsc) {
      try { this.flatlineOsc.stop(); } catch(e) {}
      this.flatlineOsc = null;
    }
  }

  playHeavenlyChime() {
    if (!state.soundEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.18, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 1.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 1.3);
      });
    } catch (e) {
      console.warn('Heavenly chime sound error:', e);
    }
  }
}

const soundFX = new SoundFX();

// DOM Elements
let snakeGridEl;
let searchInputEl;
let colorPillsEls;
let spotChipsEls;
let circumstanceSelectEl;
let sarcasticTitleEl;
let sarcasticTextEl;
let visibleCountEl;
let countdownModalEl;
let clockDigitsEl;
let timerProgressBarEl;
let stageTitleEl;
let stageMessageEl;
let modalSnakeNameEl;
let modalSnakeNickEl;
let modalThreatBadgeEl;
let secondBiteBoxEl;
let secondBiteTitleEl;
let secondBiteTextEl;
let secondBiteBtnEl;

// Fixated Deck Elements
let deckFeedTitleEl;
let deckVideoPlayerEl;
let deckVideoCanvasEl;
let deckHudTopEl;
let deckHudBottomEl;
let deckCaptionEl;
let deckBiteBtnEl;
let channelPillsEls;
let deckVideoFileInputEl;
let deckResetVideoBtnEl;
let deckPermanentBadgeEl;

// Modal Video Elements
let snakeVideoSectionEl;
let snakeVideoFeedTagEl;
let snakeVideoPlayerEl;
let snakeVideoCanvasEl;
let snakeVideoCaptionEl;
let snakeVideoFileInputEl;
let snakeResetVideoBtnEl;
let snakePermanentBadgeEl;

let afterlifeVideoSectionEl;
let afterlifeVideoPlayerEl;
let afterlifeVideoCanvasEl;
let afterlifeVideoFileInputEl;
let afterlifeResetVideoBtnEl;
let afterlifePermanentBadgeEl;

let afterlifeModalEl;
let toastEl;
let soundToggleBtn;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  cacheDOMElements();
  setupEventListeners();
  renderSnakes();
  updateSarcasticCommentary();

  // Automatically fetch and play Black Mamba video on load
  const initialSnake = SNAKES_DATA.find(s => s.id === 'black_mamba') || SNAKES_DATA[0];
  switchDeckChannel('black_mamba', initialSnake);
});

function cacheDOMElements() {
  snakeGridEl = document.getElementById('snakeGrid');
  searchInputEl = document.getElementById('searchInput');
  colorPillsEls = document.querySelectorAll('.pill-btn');
  spotChipsEls = document.querySelectorAll('.spot-chip');
  circumstanceSelectEl = document.getElementById('circumstanceSelect');
  sarcasticTitleEl = document.getElementById('sarcasticTitle');
  sarcasticTextEl = document.getElementById('sarcasticText');
  visibleCountEl = document.getElementById('visibleCount');
  countdownModalEl = document.getElementById('countdownModal');
  clockDigitsEl = document.getElementById('clockDigits');
  timerProgressBarEl = document.getElementById('timerProgressBar');
  stageTitleEl = document.getElementById('stageTitle');
  stageMessageEl = document.getElementById('stageMessage');
  modalSnakeNameEl = document.getElementById('modalSnakeName');
  modalSnakeNickEl = document.getElementById('modalSnakeNick');
  modalThreatBadgeEl = document.getElementById('modalThreatBadge');
  secondBiteBoxEl = document.getElementById('secondBiteBox');
  secondBiteTitleEl = document.getElementById('secondBiteTitle');
  secondBiteTextEl = document.getElementById('secondBiteText');
  secondBiteBtnEl = document.getElementById('secondBiteBtn');

  // Fixated Video Deck elements
  deckFeedTitleEl = document.getElementById('deckFeedTitle');
  deckVideoPlayerEl = document.getElementById('deckVideoPlayer');
  deckVideoCanvasEl = document.getElementById('deckVideoCanvas');
  deckHudTopEl = document.getElementById('deckHudTop');
  deckHudBottomEl = document.getElementById('deckHudBottom');
  deckCaptionEl = document.getElementById('deckCaption');
  deckBiteBtnEl = document.getElementById('deckBiteBtn');
  channelPillsEls = document.querySelectorAll('.channel-pill');
  deckVideoFileInputEl = document.getElementById('deckVideoFileInput');
  deckResetVideoBtnEl = document.getElementById('deckResetVideoBtn');
  deckPermanentBadgeEl = document.getElementById('deckPermanentBadge');

  // Modal Video elements
  snakeVideoSectionEl = document.getElementById('snakeVideoSection');
  snakeVideoFeedTagEl = document.getElementById('snakeVideoFeedTag');
  snakeVideoPlayerEl = document.getElementById('snakeVideoPlayer');
  snakeVideoCanvasEl = document.getElementById('snakeVideoCanvas');
  snakeVideoCaptionEl = document.getElementById('snakeVideoCaption');
  snakeVideoFileInputEl = document.getElementById('snakeVideoFileInput');
  snakeResetVideoBtnEl = document.getElementById('snakeResetVideoBtn');
  snakePermanentBadgeEl = document.getElementById('snakePermanentBadge');

  afterlifeVideoSectionEl = document.getElementById('afterlifeVideoSection');
  afterlifeVideoPlayerEl = document.getElementById('afterlifeVideoPlayer');
  afterlifeVideoCanvasEl = document.getElementById('afterlifeVideoCanvas');
  afterlifeVideoFileInputEl = document.getElementById('afterlifeVideoFileInput');
  afterlifeResetVideoBtnEl = document.getElementById('afterlifeResetVideoBtn');
  afterlifePermanentBadgeEl = document.getElementById('afterlifePermanentBadge');

  afterlifeModalEl = document.getElementById('afterlifeModal');
  toastEl = document.getElementById('toastMsg');
  soundToggleBtn = document.getElementById('soundToggleBtn');
}

function setupEventListeners() {
  // Search input
  searchInputEl.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderSnakes();
    updateSarcasticCommentary();
  });

  // Color pills
  colorPillsEls.forEach(btn => {
    btn.addEventListener('click', () => {
      colorPillsEls.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeColor = btn.dataset.color;
      renderSnakes();
      updateSarcasticCommentary();
    });
  });

  // Spot chips
  spotChipsEls.forEach(chip => {
    chip.addEventListener('click', () => {
      spotChipsEls.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeSpot = chip.dataset.spot;
      renderSnakes();
      updateSarcasticCommentary();
    });
  });

  // Circumstance selection
  circumstanceSelectEl.addEventListener('change', (e) => {
    state.activeCircumstance = e.target.value;
    updateSarcasticCommentary();
  });

  // Channel pills on fixated video deck
  channelPillsEls.forEach(pill => {
    pill.addEventListener('click', () => {
      const snakeKey = pill.dataset.snake;
      const snakeObj = (snakeKey === 'afterlife') ? null : SNAKES_DATA.find(s => s.id === snakeKey);
      switchDeckChannel(snakeKey, snakeObj);
    });
  });

  // Deck bite button
  if (deckBiteBtnEl) {
    deckBiteBtnEl.addEventListener('click', () => {
      soundFX.init();
      if (state.deckActiveSnake) {
        startCountdownForSnake(state.deckActiveSnake);
      } else {
        const mamba = SNAKES_DATA.find(s => s.id === 'black_mamba');
        startCountdownForSnake(mamba);
      }
    });
  }

  // Quick Black Mamba button (5-Star / 1-Minute + Video)
  document.getElementById('quickMambaBtn').addEventListener('click', () => {
    soundFX.init();
    const mamba = SNAKES_DATA.find(s => s.id === 'black_mamba');
    if (mamba) {
      switchDeckChannel('black_mamba', mamba);
      startCountdownForSnake(mamba);
    }
  });

  // Quick King Cobra button (5-Star / 1-Minute + Video)
  const quickKingCobraBtn = document.getElementById('quickKingCobraBtn');
  if (quickKingCobraBtn) {
    quickKingCobraBtn.addEventListener('click', () => {
      soundFX.init();
      const king = SNAKES_DATA.find(s => s.id === 'king_cobra');
      if (king) {
        switchDeckChannel('king_cobra', king);
        startCountdownForSnake(king);
      }
    });
  }

  // Sound toggle button
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      soundFX.init();
      state.soundEnabled = !state.soundEnabled;
      soundToggleBtn.textContent = state.soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
    });
  }

  // Close countdown button
  document.getElementById('closeCountdownBtn').addEventListener('click', cancelCountdown);
  document.getElementById('pauseTimerBtn').addEventListener('click', togglePauseTimer);
  document.getElementById('speedrunTimerBtn').addEventListener('click', speedrunTimer);

  // Second bite speed booster button
  if (secondBiteBtnEl) {
    secondBiteBtnEl.addEventListener('click', handleSecondBite);
  }
  // Fixated Deck permanent video upload & reset listeners
  if (deckVideoFileInputEl) {
    deckVideoFileInputEl.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const key = state.deckActiveSnake ? state.deckActiveSnake.id : 'afterlife';
      const snakeName = state.deckActiveSnake ? state.deckActiveSnake.name : 'Afterlife';
      showToast(`💾 Saving permanent video for ${snakeName}...`);
      await savePermanentVideo(key, file);
      uploadVideoFileToServer(`${key}.mp4`, file);
      await switchDeckChannel(key, state.deckActiveSnake);
      showToast(`🎉 Video saved permanently! It will persist across all reloads.`);
      e.target.value = '';
    });
  }

  if (deckResetVideoBtnEl) {
    deckResetVideoBtnEl.addEventListener('click', async () => {
      const key = state.deckActiveSnake ? state.deckActiveSnake.id : 'afterlife';
      await removePermanentVideo(key);
      await switchDeckChannel(key, state.deckActiveSnake);
      showToast('↺ Reset to default video.');
    });
  }

  // Modal Snake Video permanent upload & reset listeners
  if (snakeVideoFileInputEl) {
    snakeVideoFileInputEl.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file || !state.currentSnake) return;
      const key = state.currentSnake.id;
      showToast(`💾 Saving permanent video for ${state.currentSnake.name}...`);
      await savePermanentVideo(key, file);
      uploadVideoFileToServer(`${key}.mp4`, file);
      await setupSnakeVideo(state.currentSnake);
      showToast(`🎉 Video saved permanently for ${state.currentSnake.name}!`);
      e.target.value = '';
    });
  }

  if (snakeResetVideoBtnEl) {
    snakeResetVideoBtnEl.addEventListener('click', async () => {
      if (!state.currentSnake) return;
      await removePermanentVideo(state.currentSnake.id);
      await setupSnakeVideo(state.currentSnake);
      showToast('↺ Reset snake video to default.');
    });
  }

  // Afterlife Video permanent upload & reset listeners
  if (afterlifeVideoFileInputEl) {
    afterlifeVideoFileInputEl.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      showToast('💾 Saving permanent afterlife death video...');
      await savePermanentVideo('afterlife', file);
      uploadVideoFileToServer('afterlife_death.mp4', file);
      await setupAfterlifeVideo();
      showToast('🎉 Afterlife video saved permanently!');
      e.target.value = '';
    });
  }

  if (afterlifeResetVideoBtnEl) {
    afterlifeResetVideoBtnEl.addEventListener('click', async () => {
      await removePermanentVideo('afterlife');
      await setupAfterlifeVideo();
      showToast('↺ Reset afterlife video to default.');
    });
  }

  // Video error fallbacks -> seamlessly activates canvas video synthesizer
  if (deckVideoPlayerEl) {
    deckVideoPlayerEl.addEventListener('error', () => {
      activateDeckCanvasVideo(state.deckActiveSnake);
    });
  }

  if (snakeVideoPlayerEl) {
    snakeVideoPlayerEl.addEventListener('error', () => {
      if (state.currentSnake) {
        activateSnakeCanvasVideo(state.currentSnake);
      }
    });
  }

  if (afterlifeVideoPlayerEl) {
    afterlifeVideoPlayerEl.addEventListener('error', () => {
      activateAfterlifeCanvasVideo();
    });
  }

  // Star rating interactive
  const starBtns = document.querySelectorAll('.star-btn');
  const ratingTooltip = document.getElementById('ratingTooltip');
  starBtns.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      starBtns.forEach(s => s.style.transform = 'scale(1.2)');
      ratingTooltip.textContent = '★ 5 Stars Locked: Deceased souls cannot legally leave low ratings.';
    });
    btn.addEventListener('mouseleave', () => {
      starBtns.forEach(s => s.style.transform = 'scale(1.0)');
    });
    btn.addEventListener('click', () => {
      showToast('⭐️ 5-Star Rating Registered with the Heavens!');
    });
  });

  // Submit afterlife review
  document.getElementById('submitReviewBtn').addEventListener('click', () => {
    soundFX.playHeavenlyChime();
    const reviewSelect = document.getElementById('mockReviewSelect');
    const chosenReview = reviewSelect.value;
    showToast(`🕊️ Sent: "${chosenReview}" to App Store!`);
    setTimeout(() => {
      afterlifeModalEl.classList.remove('open');
      state.afterlifeModalOpen = false;
      stopAfterlifeCanvasAnimation();
      if (afterlifeVideoPlayerEl) afterlifeVideoPlayerEl.pause();
    }, 1800);
  });

  // Respawn button
  document.getElementById('respawnBtn').addEventListener('click', () => {
    afterlifeModalEl.classList.remove('open');
    state.afterlifeModalOpen = false;
    stopAfterlifeCanvasAnimation();
    if (afterlifeVideoPlayerEl) afterlifeVideoPlayerEl.pause();
    showToast('💉 Antivenom Administered! You survived... for now.');
  });

  // First aid modal open/close
  const firstAidModal = document.getElementById('firstAidModal');
  document.getElementById('firstAidBtn').addEventListener('click', () => {
    firstAidModal.classList.add('open');
  });
  document.getElementById('closeFirstAidBtn').addEventListener('click', () => {
    firstAidModal.classList.remove('open');
  });
}

// Switch Fixated Video Deck Channel (Permanently stores and plays video)
async function switchDeckChannel(channelKey, snakeObj) {
  stopDeckCanvasAnimation();

  // Update pills
  channelPillsEls.forEach(p => p.classList.toggle('active', p.dataset.snake === channelKey));

  if (channelKey === 'afterlife') {
    state.deckActiveSnake = null;
    deckFeedTitleEl.textContent = '🔴 LIVE BROADCAST: CELESTIAL AFTERLIFE ARCHIVE';
    deckHudTopEl.textContent = 'CHANNEL: THE GREAT BEYOND • MORTAL TRANSCENDENCE';
    deckHudBottomEl.textContent = 'RATING REQUIREMENT: 5 STARS MANDATORY';
    deckCaptionEl.textContent = '"Monitoring departure into the celestial plane. Steve Irwin and angels on standby."';
    deckBiteBtnEl.textContent = '💉 EMERGENCY RESPONDERS: ADMINISTER ANTIVENOM';

    await playVideoWithPermanentStorage(deckVideoPlayerEl, deckVideoCanvasEl, 'afterlife', null, () => {
      activateDeckAfterlifeCanvas();
    }, (hasCustom) => {
      if (deckPermanentBadgeEl) deckPermanentBadgeEl.style.display = hasCustom ? 'inline-flex' : 'none';
      if (deckResetVideoBtnEl) deckResetVideoBtnEl.style.display = hasCustom ? 'inline-block' : 'none';
    });
    return;
  }

  const snake = snakeObj || SNAKES_DATA.find(s => s.id === channelKey) || SNAKES_DATA[0];
  state.deckActiveSnake = snake;

  const durationMin = Math.round(snake.countdownSeconds / 60);
  deckFeedTitleEl.textContent = `🔴 LIVE SURVEILLANCE FEED: ${snake.name.toUpperCase()}`;
  deckHudTopEl.textContent = `SPECIES: ${snake.name.toUpperCase()} (${snake.scientificName.toUpperCase()})`;
  deckHudBottomEl.textContent = `LETHALITY: ${snake.threatLevel}/5 STARS • ${durationMin} MIN SURVIVAL`;
  deckCaptionEl.textContent = `"${snake.sarcasticQuote}"`;
  deckBiteBtnEl.textContent = `🚨 I WAS BITTEN BY THIS ${snake.name.toUpperCase()}! (START ${durationMin}-MIN COUNTDOWN)`;

  await playVideoWithPermanentStorage(deckVideoPlayerEl, deckVideoCanvasEl, snake.id, snake, () => {
    activateDeckCanvasVideo(snake);
  }, (hasCustom) => {
    if (deckPermanentBadgeEl) deckPermanentBadgeEl.style.display = hasCustom ? 'inline-flex' : 'none';
    if (deckResetVideoBtnEl) deckResetVideoBtnEl.style.display = hasCustom ? 'inline-block' : 'none';
  });
}

// Render Filtered Snakes
function renderSnakes() {
  const filtered = SNAKES_DATA.filter(snake => {
    // Color filter
    if (state.activeColor !== 'all') {
      if (snake.colorCategory !== state.activeColor && snake.primaryColor !== state.activeColor) {
        return false;
      }
    }
    // Spot filter
    if (state.activeSpot !== 'all') {
      if (snake.spot !== state.activeSpot) {
        return false;
      }
    }
    // Search query
    if (state.searchQuery) {
      const q = state.searchQuery;
      const haystack = `${snake.name} ${snake.scientificName} ${snake.nickname} ${snake.region} ${snake.venomType} ${snake.colorDescription}`.toLowerCase();
      if (!haystack.includes(q)) {
        return false;
      }
    }
    return true;
  });

  visibleCountEl.textContent = `${filtered.length} of ${SNAKES_DATA.length} deadly species`;

  if (filtered.length === 0) {
    snakeGridEl.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">🤷‍♂️</div>
        <h3>No deadly snakes match your specific combo!</h3>
        <p style="color: var(--text-muted); margin-top: 6px;">Either you encountered a harmless garden worm, or you found a new species that science has not yet cataloged.</p>
        <button class="reset-filter-btn" onclick="resetAllFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  snakeGridEl.innerHTML = filtered.map(snake => {
    const starCount = snake.threatLevel;
    const stars = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
    const durationMin = Math.round(snake.countdownSeconds / 60);

    let tierClass = 'star-tier-5';
    if (starCount === 4) tierClass = 'star-tier-4';
    else if (starCount === 3) tierClass = 'star-tier-3';

    const isFeaturedVideo = (snake.id === 'black_mamba' || snake.id === 'king_cobra' || snake.id === 'forest_cobra');
    const videoBadgeHtml = `
      <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; background:${isFeaturedVideo ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}; border:1px solid ${isFeaturedVideo ? '#ef4444' : 'rgba(255,255,255,0.2)'}; color:#f1f5f9; padding:2px 8px; border-radius:4px; margin-top:4px;">
        🎥 ${isFeaturedVideo ? 'Video Available' : 'Live Feed'}
      </span>
    `;

    const secondBiteTipHtml = (starCount < 5) ? `
      <div style="font-size:0.75rem; color:#fde68a; margin: 8px 0 12px 0; background:rgba(245,158,11,0.12); padding:6px 10px; border-radius:6px; border-left:3px solid #f59e0b;">
        ⚡ <strong>Takes ${durationMin} min:</strong> <em>"Make it bite you again so all the poison gets released!"</em>
      </div>
    ` : '';

    return `
      <div class="snake-card" style="--card-accent: ${snake.avatarColor};" onclick="onCardSelect('${snake.id}')">
        <div>
          <div class="card-top">
            <div class="snake-avatar-badge" style="color: ${snake.avatarColor};">🐍</div>
            <div class="card-threat">
              <span class="star-rating-badge ${tierClass}">${stars} ${starCount}-Star</span>
              <div class="threat-text">${durationMin} Min Countdown</div>
              ${videoBadgeHtml}
            </div>
          </div>
          <h3 class="snake-name">${escapeHtml(snake.name)}</h3>
          <div class="snake-scientific">${escapeHtml(snake.scientificName)}</div>
          <span class="snake-nickname">${escapeHtml(snake.nickname)}</span>

          <div class="snake-tags">
            <span class="snake-tag">🎨 ${escapeHtml(capitalize(snake.colorCategory))}</span>
            <span class="snake-tag">📍 ${escapeHtml(snake.region)}</span>
            <span class="snake-tag">🌿 ${escapeHtml(snake.spotDescription.split(',')[0])}</span>
          </div>

          <div class="stats-box">
            <div class="stat-item">
              <span class="stat-key">Lethality Rating:</span>
              <span class="stat-val">${starCount} / 5 Stars (${durationMin} Min Timer)</span>
            </div>
            <div class="stat-item">
              <span class="stat-key">Toxicity (LD50):</span>
              <span class="stat-val">${escapeHtml(snake.ld50.split('(')[0].trim())}</span>
            </div>
            <div class="stat-item">
              <span class="stat-key">Untreated Survival:</span>
              <span class="stat-val lethal-time">${escapeHtml(snake.clinicalSurvival.split('(')[0].trim())}</span>
            </div>
          </div>

          ${secondBiteTipHtml}

          <div class="card-sarcasm">"${escapeHtml(snake.sarcasticQuote)}"</div>
        </div>

        <button class="card-btn" onclick="event.stopPropagation(); onBiteClick('${snake.id}')">
          <span>🚨 I GOT BITTEN BY THIS! (${durationMin} MIN)</span>
        </button>
      </div>
    `;
  }).join('');
}

// When a card is clicked, switch fixated deck video
window.onCardSelect = function(snakeId) {
  const snake = SNAKES_DATA.find(s => s.id === snakeId);
  if (snake) {
    switchDeckChannel(snake.id, snake);
  }
};

// Global click handler for bite buttons
window.onBiteClick = function(snakeId) {
  soundFX.init();
  const snake = SNAKES_DATA.find(s => s.id === snakeId);
  if (snake) {
    switchDeckChannel(snake.id, snake);
    startCountdownForSnake(snake);
  }
};

// Global filter reset
window.resetAllFilters = function() {
  state.activeColor = 'all';
  state.activeSpot = 'all';
  state.searchQuery = '';
  searchInputEl.value = '';
  colorPillsEls.forEach(b => b.classList.toggle('active', b.dataset.color === 'all'));
  spotChipsEls.forEach(c => c.classList.toggle('active', c.dataset.spot === 'all'));
  renderSnakes();
  updateSarcasticCommentary();
};

// Update Sarcastic Commentary Header
function updateSarcasticCommentary() {
  const circ = CIRCUMSTANCE_QUOTES[state.activeCircumstance] || CIRCUMSTANCE_QUOTES.mind_business;
  
  let extraFlavor = '';
  if (state.activeColor === 'black') {
    extraFlavor = ' You asked for Black snakes? Black Mamba, Forest Cobra, and Kraits: nature\'s official colorway for instant regret.';
  } else if (state.activeSpot === 'bed') {
    extraFlavor = ' Spot: In bed? Congratulations, you have encountered the Common Krait midnight cuddle club.';
  } else if (state.activeSpot === 'water') {
    extraFlavor = ' Spot: Water? Sea snakes deliver 0.04 mg of neurotoxins while you are trying to float peacefully.';
  }

  sarcasticTitleEl.textContent = circ.title;
  sarcasticTextEl.textContent = `"${circ.quote}${extraFlavor}"`;
}

// COUNTDOWN TIMER ENGINE
function startCountdownForSnake(snake) {
  state.currentSnake = snake;
  state.timerDuration = snake.countdownSeconds || 60;
  state.timerRemaining = state.timerDuration;
  state.timerRunning = true;
  state.timerStartTime = performance.now();
  state.lastHeartbeatTime = 0;

  const durationMin = Math.round(state.timerDuration / 60);
  modalSnakeNameEl.textContent = snake.name;
  modalSnakeNickEl.textContent = `"${snake.nickname}" • Clinical Window: ${snake.clinicalSurvival.split('(')[0]}`;

  // Update Modal Threat Badge
  if (snake.threatLevel === 5) {
    modalThreatBadgeEl.textContent = `🚨 5-STAR MAXIMUM LETHALITY • 1-MINUTE COUNTDOWN`;
    modalThreatBadgeEl.style.borderColor = '#ef4444';
  } else if (snake.threatLevel === 4) {
    modalThreatBadgeEl.textContent = `⚠️ 4-STAR LETHALITY • 3-MINUTE COUNTDOWN`;
    modalThreatBadgeEl.style.borderColor = '#f59e0b';
  } else {
    modalThreatBadgeEl.textContent = `⚠️ 3-STAR LETHALITY • 5-MINUTE COUNTDOWN`;
    modalThreatBadgeEl.style.borderColor = '#06b6d4';
  }

  // Activate Snake Video Theater in countdown modal
  snakeVideoSectionEl.style.display = 'block';
  setupSnakeVideo(snake);

  // Configure Second Bite Banner for lower-star snakes (< 5 stars)
  if (snake.threatLevel < 5) {
    secondBiteBoxEl.style.display = 'flex';
    secondBiteTitleEl.textContent = `⚠️ ${snake.threatLevel}-Star Venom Delivery (${durationMin} Min Survival Time)`;
    secondBiteTextEl.textContent = snake.secondBiteAdvice || 'Venom is working too slowly. Make it bite you one more time so all the poison gets released!';
    secondBiteBtnEl.disabled = false;
    secondBiteBtnEl.innerHTML = `⚡ Make It Bite You Again! (Release Full Poison & Cut to 1 Min)`;
  } else {
    secondBiteBoxEl.style.display = 'none';
  }

  updateStageTicker(state.timerRemaining);
  countdownModalEl.classList.add('open');

  if (state.timerAnimationFrame) {
    cancelAnimationFrame(state.timerAnimationFrame);
  }
  tickTimer();
}

function tickTimer() {
  if (!state.timerRunning) return;

  const now = performance.now();
  const elapsed = (now - state.timerStartTime) / 1000;
  state.timerRemaining = Math.max(0, state.timerDuration - elapsed);

  // Audio heartbeat calculation
  const remainingFraction = state.timerRemaining / state.timerDuration;
  const heartbeatInterval = Math.max(250, remainingFraction * 1000);
  if (now - state.lastHeartbeatTime >= heartbeatInterval) {
    soundFX.playHeartbeat();
    state.lastHeartbeatTime = now;
  }

  // Update Clock UI
  const mins = Math.floor(state.timerRemaining / 60);
  const secs = Math.floor(state.timerRemaining % 60);
  const ms = Math.floor((state.timerRemaining % 1) * 100);
  clockDigitsEl.textContent = `${padZero(mins)}:${padZero(secs)}.${padZero(ms)}`;

  // Update Progress Bar
  const progressPct = (state.timerRemaining / state.timerDuration) * 100;
  timerProgressBarEl.style.width = `${progressPct}%`;

  // Update Stage Ticker
  updateStageTicker(state.timerRemaining);

  // Check if reached 0
  if (state.timerRemaining <= 0) {
    handleTimerComplete();
    return;
  }

  state.timerAnimationFrame = requestAnimationFrame(tickTimer);
}

function updateStageTicker(secondsLeft) {
  if (!state.currentSnake || !state.currentSnake.sarcasticStages) return;
  const stages = state.currentSnake.sarcasticStages;
  const fractionLeft = secondsLeft / state.timerDuration;

  let activeStage = stages[stages.length - 1];
  for (let i = 0; i < stages.length; i++) {
    if (fractionLeft >= stages[i].pct) {
      activeStage = stages[i];
      break;
    }
  }

  stageTitleEl.textContent = `Survival Observation (${Math.ceil(secondsLeft)}s remaining)`;
  stageMessageEl.textContent = `"${activeStage.text}"`;
}

// Handler when user clicks "Make It Bite You Again!"
function handleSecondBite() {
  soundFX.playBiteChomp();

  if (state.timerRemaining > 60) {
    state.timerDuration = 60;
    state.timerRemaining = 60;
    state.timerStartTime = performance.now();
  } else {
    state.timerRemaining = Math.min(state.timerRemaining, 20);
    state.timerStartTime = performance.now() - ((state.timerDuration - state.timerRemaining) * 1000);
  }

  secondBiteBtnEl.disabled = true;
  secondBiteBtnEl.innerHTML = `✔️ Full Poison Released! (Timer Accelerated to 1 Min)`;
  showToast('🐍 CHOMP! Second dose delivered! Poison released into your bloodstream — countdown accelerated!');

  stageTitleEl.textContent = `DOUBLE-DOSE POISON RELEASE ACTIVATED!`;
  stageMessageEl.textContent = `"You voluntarily requested a second bite. Your veins are now 98% neurotoxin. Speedrun mode engaged!"`;
}

// Setup Snake Video in Modal
async function setupSnakeVideo(snake) {
  stopSnakeCanvasAnimation();
  
  const feedKey = snake.id;
  const config = VIDEO_SOURCES[feedKey];

  if (config && config.feedTag) {
    snakeVideoFeedTagEl.textContent = config.feedTag;
    snakeVideoCaptionEl.textContent = config.caption;
  } else {
    snakeVideoFeedTagEl.textContent = `🔴 LIVE FEED: ${snake.name.toUpperCase()}`;
    snakeVideoCaptionEl.textContent = `"${snake.sarcasticQuote}"`;
  }

  await playVideoWithPermanentStorage(snakeVideoPlayerEl, snakeVideoCanvasEl, feedKey, snake, () => {
    activateSnakeCanvasVideo(snake);
  }, (hasCustom) => {
    if (snakePermanentBadgeEl) snakePermanentBadgeEl.style.display = hasCustom ? 'inline-flex' : 'none';
    if (snakeResetVideoBtnEl) snakeResetVideoBtnEl.style.display = hasCustom ? 'inline-block' : 'none';
  });
}

// Canvas Visual Engine (Shared generator for Black Mamba, King Cobra, and other serpents)
function renderSnakeVisual(ctx, canvas, snake, frame) {
  ctx.fillStyle = '#06080a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const isMamba = snake && snake.id === 'black_mamba';
  const isKing = snake && snake.id === 'king_cobra';
  const isBlackCobra = snake && snake.id === 'forest_cobra';

  // Dynamic background lighting
  const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 40, canvas.width/2, canvas.height/2, canvas.width/2);
  if (isMamba) {
    grad.addColorStop(0, 'rgba(75, 85, 99, 0.2)');
    grad.addColorStop(1, 'rgba(3, 7, 18, 0.98)');
  } else if (isKing) {
    grad.addColorStop(0, 'rgba(34, 197, 94, 0.18)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
  } else {
    grad.addColorStop(0, 'rgba(239, 68, 68, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sway & strike motion
  const sway = Math.sin(frame * 0.06) * 22;
  const lunge = (Math.sin(frame * 0.08) > 0.85) ? 30 : 0;

  ctx.save();
  ctx.translate(canvas.width/2 + sway, canvas.height/2 + lunge + 10);

  if (isMamba) {
    // BLACK MAMBA: Coffin-shaped head, slender neck, pitch-black inky mouth display
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.ellipse(0, 20, 30, 90, 0, 0, Math.PI * 2);
    ctx.fill();

    // Coffin head
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.moveTo(-24, -55);
    ctx.lineTo(24, -55);
    ctx.lineTo(30, -90);
    ctx.lineTo(0, -120);
    ctx.lineTo(-30, -90);
    ctx.closePath();
    ctx.fill();

    // Inky pitch-black mouth lining
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -82, 17, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White needle fangs
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-10, -96); ctx.lineTo(-8, -78); ctx.lineTo(-6, -96);
    ctx.moveTo(6, -96); ctx.lineTo(8, -78); ctx.lineTo(10, -96);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(-15, -98, 5, 0, Math.PI * 2);
    ctx.arc(15, -98, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-16, -100, 2, 4);
    ctx.fillRect(14, -100, 2, 4);

    // Venom drip
    const mambaDrip = (frame * 5) % 80;
    ctx.fillStyle = '#84cc16';
    ctx.beginPath();
    ctx.arc(8, -78 + mambaDrip, 3, 0, Math.PI * 2);
    ctx.fill();

  } else if (isKing || isBlackCobra) {
    // COBRA: Flared hood with chevron markings
    ctx.fillStyle = isKing ? '#365314' : '#111827';
    ctx.strokeStyle = isKing ? '#facc15' : '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -15, 60, 80, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (isKing) {
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-32, -35); ctx.lineTo(0, -8); ctx.lineTo(32, -35);
      ctx.moveTo(-32, -8); ctx.lineTo(0, 18); ctx.lineTo(32, -8);
      ctx.stroke();
    }

    // Head
    ctx.fillStyle = isKing ? '#1e293b' : '#030712';
    ctx.beginPath();
    ctx.ellipse(0, -88, 26, 35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = isKing ? '#f59e0b' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(-11, -96, 5, 0, Math.PI * 2);
    ctx.arc(11, -96, 5, 0, Math.PI * 2);
    ctx.fill();

    // Fangs
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-7, -70); ctx.lineTo(-5, -56); ctx.lineTo(-3, -70);
    ctx.moveTo(3, -70); ctx.lineTo(5, -56); ctx.lineTo(7, -70);
    ctx.fill();

  } else {
    // Other species
    ctx.fillStyle = (snake && snake.avatarColor) ? snake.avatarColor : '#78350f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 42, 85, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, -75, 24, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-9, -80, 4, 0, Math.PI * 2);
    ctx.arc(9, -80, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tongue darting
  const tongueExt = (Math.sin(frame * 0.22) > 0.4) ? 26 : 0;
  if (tongueExt > 0) {
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -65);
    ctx.lineTo(0, -65 + tongueExt);
    ctx.lineTo(-6, -65 + tongueExt + 7);
    ctx.moveTo(0, -65 + tongueExt);
    ctx.lineTo(6, -65 + tongueExt + 7);
    ctx.stroke();
  }

  ctx.restore();

  // Telemetry HUD text
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#ef4444';
  ctx.fillText('🔴 OPTICAL SURVEILLANCE FEED: ONLINE', 18, 26);
  ctx.fillStyle = '#cbd5e1';
  if (snake) {
    ctx.fillText(`SPECIES: ${snake.name.toUpperCase()} (${snake.scientificName.toUpperCase()})`, 18, 46);
    ctx.fillText(`LD50 TOXICITY: ${snake.ld50.split('(')[0].trim()}`, 18, 66);
    if (isMamba) {
      ctx.fillStyle = '#fde68a';
      ctx.fillText('WARNING: PITCH-BLACK INKY MOUTH DETECTED (12 MPH STRIKE)', 18, 86);
    }
  }
}

// Canvas generator for Modal Video
function activateSnakeCanvasVideo(snake) {
  stopSnakeCanvasAnimation();
  if (!snakeVideoCanvasEl) return;

  const canvas = snakeVideoCanvasEl;
  const ctx = canvas.getContext('2d');
  canvas.width = 640;
  canvas.height = 360;

  let frame = 0;
  function loop() {
    frame++;
    renderSnakeVisual(ctx, canvas, snake, frame);
    state.snakeAnimId = requestAnimationFrame(loop);
  }
  state.snakeAnimId = requestAnimationFrame(loop);
}

function stopSnakeCanvasAnimation() {
  if (state.snakeAnimId) {
    cancelAnimationFrame(state.snakeAnimId);
    state.snakeAnimId = null;
  }
}

// Canvas generator for Fixated Deck Video
function activateDeckCanvasVideo(snake) {
  stopDeckCanvasAnimation();
  if (!deckVideoCanvasEl) return;

  const canvas = deckVideoCanvasEl;
  const ctx = canvas.getContext('2d');
  canvas.width = 640;
  canvas.height = 360;

  let frame = 0;
  function loop() {
    frame++;
    renderSnakeVisual(ctx, canvas, snake, frame);
    state.deckAnimId = requestAnimationFrame(loop);
  }
  state.deckAnimId = requestAnimationFrame(loop);
}

function stopDeckCanvasAnimation() {
  if (state.deckAnimId) {
    cancelAnimationFrame(state.deckAnimId);
    state.deckAnimId = null;
  }
}

// Setup Afterlife Video in Modal
async function setupAfterlifeVideo() {
  stopAfterlifeCanvasAnimation();
  await playVideoWithPermanentStorage(afterlifeVideoPlayerEl, afterlifeVideoCanvasEl, 'afterlife', null, () => {
    activateAfterlifeCanvasVideo();
  }, (hasCustom) => {
    if (afterlifePermanentBadgeEl) afterlifePermanentBadgeEl.style.display = hasCustom ? 'inline-flex' : 'none';
    if (afterlifeResetVideoBtnEl) afterlifeResetVideoBtnEl.style.display = hasCustom ? 'inline-block' : 'none';
  });
}

// Canvas Visual for Afterlife / Death Video
function renderAfterlifeVisual(ctx, canvas, frame) {
  ctx.fillStyle = '#090a14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Moving stars
  for (let i = 0; i < 35; i++) {
    const sx = (i * 37 + frame * 0.8) % canvas.width;
    const sy = (i * 47) % canvas.height;
    ctx.fillStyle = (i % 2 === 0) ? '#fde047' : '#93c5fd';
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Golden pearly gates
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(canvas.width/2, 260, 110, Math.PI, 0);
  ctx.stroke();

  // Floating ghost soul
  const ghostY = 220 - Math.min(120, (frame * 0.8) % 200);
  const ghostSway = Math.sin(frame * 0.08) * 15;

  ctx.save();
  ctx.translate(canvas.width/2 + ghostSway, ghostY);

  // Halo
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, -45, 24, 7, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Ghost body
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(0, -15, 26, Math.PI, 0);
  ctx.lineTo(26, 30);
  ctx.lineTo(13, 20);
  ctx.lineTo(0, 30);
  ctx.lineTo(-13, 20);
  ctx.lineTo(-26, 30);
  ctx.closePath();
  ctx.fill();

  // Sunglasses
  ctx.fillStyle = '#000';
  ctx.fillRect(-15, -20, 12, 8);
  ctx.fillRect(3, -20, 12, 8);
  ctx.fillRect(-3, -18, 6, 2);

  // Angel wings
  ctx.fillStyle = 'rgba(254, 240, 138, 0.7)';
  ctx.beginPath();
  ctx.ellipse(-32, 5, 18, 8, -0.3, 0, Math.PI * 2);
  ctx.ellipse(32, 5, 18, 8, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Golden harp
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(14, 8, 12, -Math.PI/2, Math.PI/2);
  ctx.lineTo(6, 20);
  ctx.stroke();

  ctx.restore();

  // Gravestone
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(110, 300, 30, Math.PI, 0);
  ctx.rect(80, 300, 60, 50);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('R.I.P.', 98, 315);
  ctx.font = '9px sans-serif';
  ctx.fillText('Bitten', 96, 332);

  // Banner
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#fde68a';
  ctx.textAlign = 'center';
  ctx.fillText('⭐ HEAVEN\'S OFFICIAL APP STORE ⭐', canvas.width/2, 38);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('PLEASE LEAVE 5 STARS BEFORE CROSSING OVER', canvas.width/2, 62);

  ctx.fillStyle = '#facc15';
  ctx.font = '24px sans-serif';
  ctx.fillText('★★★★★', canvas.width/2, 335);
  ctx.textAlign = 'left';
}

function activateAfterlifeCanvasVideo() {
  stopAfterlifeCanvasAnimation();
  if (!afterlifeVideoCanvasEl) return;

  const canvas = afterlifeVideoCanvasEl;
  const ctx = canvas.getContext('2d');
  canvas.width = 640;
  canvas.height = 360;

  let frame = 0;
  function loop() {
    frame++;
    renderAfterlifeVisual(ctx, canvas, frame);
    state.afterlifeAnimId = requestAnimationFrame(loop);
  }
  state.afterlifeAnimId = requestAnimationFrame(loop);
}

function activateDeckAfterlifeCanvas() {
  stopDeckCanvasAnimation();
  if (!deckVideoCanvasEl) return;

  const canvas = deckVideoCanvasEl;
  const ctx = canvas.getContext('2d');
  canvas.width = 640;
  canvas.height = 360;

  let frame = 0;
  function loop() {
    frame++;
    renderAfterlifeVisual(ctx, canvas, frame);
    state.deckAnimId = requestAnimationFrame(loop);
  }
  state.deckAnimId = requestAnimationFrame(loop);
}

function stopAfterlifeCanvasAnimation() {
  if (state.afterlifeAnimId) {
    cancelAnimationFrame(state.afterlifeAnimId);
    state.afterlifeAnimId = null;
  }
}

function handleTimerComplete() {
  state.timerRunning = false;
  clockDigitsEl.textContent = '00:00.00';
  timerProgressBarEl.style.width = '0%';
  stageTitleEl.textContent = 'STATUS: MORTAL BOUNDS EXCEEDED';
  stageMessageEl.textContent = '"Flatline achieved. Time of expiration: Right now."';

  soundFX.startFlatline();

  // Also switch the fixated background deck to Afterlife
  switchDeckChannel('afterlife', null);

  // Dramatic 1.2s delay before opening Afterlife 5-Star Rating Modal
  setTimeout(() => {
    countdownModalEl.classList.remove('open');
    stopSnakeCanvasAnimation();
    if (snakeVideoPlayerEl) snakeVideoPlayerEl.pause();

    soundFX.stopFlatline();
    soundFX.playHeavenlyChime();
    openAfterlifeModal();
  }, 1200);
}

function openAfterlifeModal() {
  state.afterlifeModalOpen = true;
  afterlifeModalEl.classList.add('open');
  setupAfterlifeVideo();
}

function cancelCountdown() {
  state.timerRunning = false;
  if (state.timerAnimationFrame) {
    cancelAnimationFrame(state.timerAnimationFrame);
  }
  stopSnakeCanvasAnimation();
  if (snakeVideoPlayerEl) snakeVideoPlayerEl.pause();
  countdownModalEl.classList.remove('open');
}

function togglePauseTimer() {
  const pauseBtn = document.getElementById('pauseTimerBtn');
  if (state.timerRunning) {
    state.timerRunning = false;
    pauseBtn.textContent = '▶️ Resume';
    if (snakeVideoPlayerEl) snakeVideoPlayerEl.pause();
  } else if (state.timerRemaining > 0) {
    state.timerRunning = true;
    state.timerStartTime = performance.now() - ((state.timerDuration - state.timerRemaining) * 1000);
    pauseBtn.textContent = '⏸️ Pause';
    if (snakeVideoPlayerEl) {
      snakeVideoPlayerEl.play().catch(() => {});
    }
    tickTimer();
  }
}

function speedrunTimer() {
  if (state.timerRunning && state.timerRemaining > 5) {
    state.timerStartTime = performance.now() - ((state.timerDuration - 5) * 1000);
    showToast('⏩ Fast-Forwarded to 5 seconds remaining!');
  }
}

// Toast Helper
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3200);
}

// Utilities
function padZero(num) {
  return num.toString().padStart(2, '0');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;'
  })[m]);
}
