// shoot2head.mp3 - Complete player

// ============ COVER TILE HELPERS ============
function gradFor(seed) {
  const str = String(seed || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 6;
}

function coverTileHTML(seed, label) {
  const n = gradFor(seed);
  const txt = label || '♫';
  return `<div class="cover-tile cover-grad-${n}"><span>${txt}</span></div>`;
}

function setCoverTile(el, seed, label) {
  if (!el) return;
  const n = gradFor(seed);
  const txt = label || '♫';
  el.className = `cover-tile cover-grad-${n}`;
  el.innerHTML = `<span>${txt}</span>`;
}

function escAttr(s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
function realCover(track) {
  const c = track && track.cover;
  return (typeof c === 'string' && c.indexOf('http') === 0) ? c : '';
}
function coverImgHTML(track) {
  const url = realCover(track);
  if (!url) return '';
  return `<img class="cover-img" src="${escAttr(url)}" alt="" loading="lazy" data-seed="${escAttr(track.id || track.title)}" data-label="${escAttr((track.title || 'T')[0].toUpperCase())}">`;
}
function coverHTML(track) {
  // Real song photo when the track has one, gradient tile otherwise.
  return coverImgHTML(track) || coverTileHTML(track.id || track.title, (track.title || 'T')[0].toUpperCase());
}
function setCover(el, track) {
  if (!el) return;
  const img = coverImgHTML(track);
  if (img) { el.className = ''; el.innerHTML = img; }
  else setCoverTile(el, track.id || track.title, (track.title || 'T')[0].toUpperCase());
}
function setFullscreenCover(track) {
  const el = document.getElementById('fullscreenCover');
  if (!el) return;
  const box = el.parentElement; // .fullscreen-cover
  if (realCover(track)) {
    if (box) box.classList.remove('cover-small');
    el.className = '';
    el.innerHTML = coverImgHTML(track);
  } else {
    // Uploaded song with no photo: no big colour block — only the title
    // and a tiny round disc up top.
    if (box) box.classList.add('cover-small');
    const n = gradFor(track.id || track.title);
    el.className = `cover-tile cover-grad-${n}`;
    el.innerHTML = `<span>♪</span>`;
  }
}
// A photo that fails to load falls back to its gradient tile.
document.addEventListener('error', (e) => {
  const t = e.target;
  if (!t || !t.classList || !t.classList.contains('cover-img')) return;
  const tile = document.createElement('div');
  tile.className = `cover-tile cover-grad-${gradFor(t.dataset.seed || '')}`;
  tile.innerHTML = `<span>${t.dataset.label || '♫'}</span>`;
  t.replaceWith(tile);
}, true);

function setPlayerStatus(message) {
  const el = document.getElementById('nowPlayingStatus');
  if (el) el.textContent = message || '';
}

function setMediaPlaybackState(state) {
  if (!('mediaSession' in navigator)) return;
  try { navigator.mediaSession.playbackState = state; } catch (e) {}
}
function updateMediaSession(track) {
  // Lock-screen / notification controls — this is what keeps the song
  // playing (and controllable) when the screen is off or another app is open.
  if (!('mediaSession' in navigator) || !track) return;
  try {
    const cover = realCover(track);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || 'Unknown',
      artist: track.artist || '',
      album: track.album || '',
      artwork: cover ? [{ src: cover, sizes: '500x500', type: 'image/jpeg' }] : [],
    });
  } catch (e) {}
}

// ============ DATA ============
let trackList = [];
let playlists = [];

function getAllSongsPlaylist() {
  const firstCover = trackList.length && trackList[0].cover ? trackList[0].cover : '';
  return {
    id: 'all-songs',
    title: 'সব গান',
    description: 'All songs',
    cover: firstCover,
    trackIds: trackList.map(t => t.id),
    owner: 'shoot2head'
  };
}

function findPlaylist(id) {
  if (id === 'all-songs') return getAllSongsPlaylist();
  return [...playlists, ...userPlaylists].find(p => p.id === id) || null;
}

function createPlaylistRow(p) {
  const count = (p.trackIds || []).length;
  const coverHtml = p.cover
    ? `<img class="playlist-row-cover" src="${escAttr(p.cover)}" alt="" loading="lazy">`
    : `<div class="playlist-row-cover cover-tile cover-grad-${gradFor(p.id || p.title)}"><span>${escAttr((p.title || 'P')[0].toUpperCase())}</span></div>`;
  return `
    <div class="playlist-row" data-id="${p.id}">
      ${coverHtml}
      <div class="playlist-row-info">
        <div class="playlist-row-title">${escAttr(p.title)}</div>
        <div class="playlist-row-meta">${count} song${count !== 1 ? 's' : ''}</div>
      </div>
      <div class="playlist-row-chevron">›</div>
    </div>
  `;
}

function attachPlaylistRowListeners(container) {
  if (!container) return;
  container.querySelectorAll('.playlist-row').forEach(row => {
    row.addEventListener('click', () => {
      navigateTo('playlistDetail', { playlistId: row.dataset.id });
    });
  });
}

// ============ ONLINE SEARCH — free sources, tried in order ============
// No service name is ever shown in the UI. Online results look like the app's own songs.
const SEARCH_SOURCES = [
  { name: 'invidious', url: q => `https://yt.chocolatemoo53.com/api/v1/search?q=${encodeURIComponent(q)}&type=video` },
  { name: 'lemnoslife', url: q => `https://yt.lemnoslife.com/search?q=${encodeURIComponent(q)}` },
  { name: 'saavn', url: q => `https://corsproxy.io/?url=${encodeURIComponent('https://saavn.dev/api/search/songs?query=' + encodeURIComponent(q) + '&limit=10')}` },
];
let onlineResults = [];   // normalized track objects from the online search
let searchSeq = 0;         // guards against stale responses
let searchTimer = null;

function fetchWithTimeout(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal })
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .finally(() => clearTimeout(t));
}

function normalizeInvidious(items) {
  return (items || []).filter(i => i && i.type === 'video' && i.videoId).map(i => ({
    id: 'yt_' + i.videoId, title: i.title || 'Unknown', artist: i.author || '',
    durationSec: i.lengthSeconds || 0, duration: formatTime(i.lengthSeconds || 0),
    videoId: i.videoId, source: 'youtube',
    cover: (i.videoThumbnails && i.videoThumbnails.length ? i.videoThumbnails[i.videoThumbnails.length - 1].url : '') || ('https://i.ytimg.com/vi/' + i.videoId + '/hqdefault.jpg'),
    album: '', albumId: '', playlistIds: [],
  }));
}

function normalizeLemnoslife(data) {
  const items = Array.isArray(data) ? data : (data.items || data.results || []);
  return (items || []).filter(i => i && (i.id || i.videoId)).map(i => {
    const vid = i.videoId || i.id;
    const th = i.thumbnails && i.thumbnails.length ? i.thumbnails[i.thumbnails.length - 1] : null;
    return {
      id: 'yt_' + vid, title: i.title || 'Unknown',
      artist: (i.channel && (i.channel.name || i.channel)) || i.author || '',
      durationSec: i.duration || 0, duration: formatTime(i.duration || 0),
      videoId: vid, source: 'youtube',
      cover: (th && (th.url || th)) || ('https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg'),
      album: '', albumId: '', playlistIds: [],
    };
  });
}

function normalizeSaavn(data) {
  const results = (data && data.data && data.data.results) || [];
  return results.filter(r => r && r.id).map(r => {
    const dl = (r.downloadUrl || []).slice().sort((a, b) => parseInt(b.quality) - parseInt(a.quality))[0];
    const img = (r.image || []).slice(-1)[0];
    return {
      id: 'sv_' + r.id, title: r.name || 'Unknown',
      artist: (r.artists && r.artists.primary && r.artists.primary.map(a => a.name).join(', ')) || '',
      durationSec: r.duration || 0, duration: formatTime(r.duration || 0),
      audioUrl: dl ? dl.url : '', source: 'saavn',
      cover: img ? img.url : '', album: '', albumId: '', playlistIds: [],
    };
  }).filter(t => t.audioUrl);
}

async function searchOnline(query, seq) {
  for (const src of SEARCH_SOURCES) {
    const data = await fetchWithTimeout(src.url(query));
    if (seq !== searchSeq) return; // a newer search started
    if (!data) continue;
    let tracks = [];
    try {
      if (src.name === 'invidious') tracks = normalizeInvidious(data);
      else if (src.name === 'lemnoslife') tracks = normalizeLemnoslife(data);
      else if (src.name === 'saavn') tracks = normalizeSaavn(data);
    } catch (e) { tracks = []; }
    if (tracks.length) { onlineResults = tracks; renderOnlineResults(); return; }
  }
  if (seq === searchSeq) { onlineResults = []; renderOnlineResults(); }
}

function renderOnlineResults() {
  const grid = document.getElementById('searchOnlineGrid');
  const status = document.getElementById('onlineStatus');
  if (!grid) return;
  if (!onlineResults.length) { grid.innerHTML = ''; if (status) status.textContent = 'No more songs found.'; return; }
  if (status) status.textContent = '';
  grid.innerHTML = onlineResults.map(t => createCard(t, 'track')).join('');
  attachCardListeners(grid);
}

// ============ HIDDEN AUDIO ENGINE (plays online songs, no video shown) ============
let ytPlayer = null;
let ytReady = false;
let ytLoading = false;
let activeEngine = 'audio'; // 'audio' = built-in player, 'youtube' = hidden player
let ytProgressTimer = null;

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (ytPlayer) return resolve(true);
    if (window.YT && window.YT.Player) { initYouTubePlayer(); return resolve(true); }
    if (ytLoading) {
      const wait = setInterval(() => { if (ytPlayer) { clearInterval(wait); resolve(true); } }, 300);
      setTimeout(() => { clearInterval(wait); resolve(false); }, 15000);
      return;
    }
    ytLoading = true;
    window.onYouTubeIframeAPIReady = () => { initYouTubePlayer(); resolve(true); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => resolve(false);
    document.head.appendChild(tag);
    setTimeout(() => resolve(false), 15000);
  });
}

function initYouTubePlayer() {
  if (ytPlayer) return;
  try {
    ytPlayer = new YT.Player('ytPlayer', {
      width: '1', height: '1',
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0, playsinline: 1 },
      events: {
        onReady: () => { ytReady = true; },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) handleTrackEnded();
          else if (e.data === YT.PlayerState.PLAYING) { isPlaying = true; setPlayerStatus(''); setMediaPlaybackState('playing'); updatePlayButtons(); }
          else if (e.data === YT.PlayerState.BUFFERING) { setPlayerStatus('লোড হচ্ছে…'); }
          else if (e.data === YT.PlayerState.PAUSED) { isPlaying = false; setMediaPlaybackState('paused'); updatePlayButtons(); }
        },
      },
    });
  } catch (e) { ytPlayer = null; }
}

function startYtProgress() {
    stopYtProgress();
    ytProgressTimer = setInterval(() => {
      if (activeEngine !== 'youtube' || !ytPlayer || !ytPlayer.getDuration) return;
      const d = ytPlayer.getDuration() || 0;
      const c = ytPlayer.getCurrentTime() || 0;
      if (!d) return;
      const percent = (c / d) * 100;
      const pb = document.getElementById('progressBar'); if (pb) { pb.value = percent; paintProgress(pb, percent); }
      const fpb = document.getElementById('fullscreenProgressBar'); if (fpb) { fpb.value = percent; paintProgress(fpb, percent); }
      const mpb = document.getElementById('modalProgressBar'); if (mpb) { mpb.value = percent; paintProgress(mpb, percent); }
      const tc = formatTime(c);
      const tcEl = document.getElementById('timeCurrent'); if (tcEl) tcEl.textContent = tc;
      const ptcEl = document.getElementById('playerTimeCurrent'); if (ptcEl) ptcEl.textContent = tc;
      const tt = formatTime(d);
      const ttEl = document.getElementById('timeTotal'); if (ttEl) ttEl.textContent = tt;
      const pttEl = document.getElementById('playerTimeTotal'); if (pttEl) pttEl.textContent = tt;
    }, 500);
  }

function stopYtProgress() { if (ytProgressTimer) { clearInterval(ytProgressTimer); ytProgressTimer = null; } }

function setVolume01(v) {
  audio.volume = v;
  if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(Math.round(v * 100));
}

function toTrackId(raw) {
  const n = parseInt(raw, 10);
  return String(n) === String(raw) ? n : raw;
}

function findTrackById(id) {
  const tid = toTrackId(id);
  return trackList.find(t => t.id === tid) || onlineResults.find(t => t.id === tid) || null;
}

function playTrackObjects(tracks, startIndex = 0) {
  queue = tracks.slice();
  if (!queue.length) return;
  playTrack(startIndex);
  navigateTo('fullscreenNowPlaying');
  renderQueue();
}

// ============ IN-APP OFFLINE DOWNLOADS (IndexedDB) ============
// Downloads live INSIDE the app, so a downloaded song plays offline — like an MP3
// stored on the phone. Clearing the browser's site data removes them.
const DL_DB_NAME = 'shoot2head-downloads';
const DL_STORE = 'tracks';
let dlDbPromise = null;
let downloadedIds = new Set();

function openDlDb() {
  if (dlDbPromise) return dlDbPromise;
  dlDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DL_DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(DL_STORE, { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dlDbPromise;
}
async function saveDownloadedTrack(track, blob, ext, size) {
  const db = await openDlDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DL_STORE, 'readwrite');
    tx.objectStore(DL_STORE).put({
      id: track.id, title: track.title, artist: track.artist,
      duration: track.duration, durationSec: track.durationSec || 0,
      ext, size, blob, downloadedAt: Date.now(),
      source: track.source || '', videoId: track.videoId || '', audioUrl: track.audioUrl || '',
      cover: track.cover || ''
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
async function getDownloadedTrack(id) {
  try {
    const db = await openDlDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(DL_STORE, 'readonly').objectStore(DL_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return null; }
}
async function listDownloadedTracks() {
  try {
    const db = await openDlDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(DL_STORE, 'readonly').objectStore(DL_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return []; }
}
async function deleteDownloadedTrack(id) {
  const db = await openDlDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DL_STORE, 'readwrite');
    tx.objectStore(DL_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
async function playDownloadedById(id) {
  const entry = await getDownloadedTrack(id);
  if (!entry) return;
  const track = {
    id: entry.id, title: entry.title, artist: entry.artist,
    duration: entry.duration, durationSec: entry.durationSec,
    audioUrl: entry.audioUrl, source: entry.source, videoId: entry.videoId
  };
  // Keep the current queue when the song is already in it — otherwise
  // tapping ✓ would collapse the queue to this one song.
  const idx = queue.findIndex(t => t.id === toTrackId(entry.id) || t.id === entry.id);
  if (idx >= 0) playTrack(idx);
  else playTrackObjects([track], 0);
}
async function renderDownloaded() {
  const listEl = document.getElementById('downloadedList');
  const emptyEl = document.getElementById('downloadedEmpty');
  if (!listEl) return;
  const items = await listDownloadedTracks();
  downloadedIds = new Set(items.map(t => t.id));
  // Mark already-downloaded buttons on the current view
  document.querySelectorAll('.track-download').forEach(b => {
    const id = toTrackId(b.dataset.id);
    b.textContent = downloadedIds.has(id) ? '✓' : '⬇';
  });
  // Same for the playing views (fullscreen, queue, track modal)
  const fsDl = document.getElementById('fsDownloadBtn');
  if (fsDl && queue.length) fsDl.textContent = downloadedIds.has(queue[currentTrackIndex]?.id) ? '✓' : '⬇';
  document.querySelectorAll('.queue-download').forEach(b => {
    const t = queue[parseInt(b.dataset.index)];
    if (t) b.textContent = downloadedIds.has(t.id) ? '✓' : '⬇';
  });
  const mDl = document.getElementById('modalDownloadBtn');
  if (mDl && trackModal.dataset.trackId) mDl.textContent = downloadedIds.has(toTrackId(trackModal.dataset.trackId)) ? '✓' : '⬇';
  if (emptyEl) emptyEl.style.display = items.length ? 'none' : 'block';
  listEl.innerHTML = items.map(e => `
    <div class="track-row downloaded-row" data-id="${e.id}">
      <div class="track-num">↓</div>
      <div class="track-main">
        ${coverHTML(e)}
        <div class="track-text">
          <div class="title">${e.title}</div>
          <div class="artist">${e.artist}</div>
        </div>
      </div>
      <div class="track-album"></div>
      <div class="track-duration">${e.duration}</div>
      <button class="track-remove" data-id="${e.id}" title="Remove download">✕</button>
    </div>`).join('');
  listEl.querySelectorAll('.downloaded-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('track-remove')) return;
      playDownloadedById(toTrackId(row.dataset.id));
    });
    row.querySelector('.track-remove')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const rid = toTrackId(e.target.dataset.id);
      const entry = await getDownloadedTrack(rid);
      await deleteDownloadedTrack(rid);
      if (entry) localStorage.setItem(DOWNLOAD_KEY, String(Math.max(0, getDownloadedBytes() - (entry.size || 0))));
      updateDownloadsBar();
      renderDownloaded();
      setDownloadStatus('Removed from the app: ' + (entry ? entry.title : ''));
    });
  });
}

// ============ DOWNLOADS — 1 GB limit, saves to the phone's Downloads folder ============
const DOWNLOAD_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB
const DOWNLOAD_KEY = 'shoot2head_downloaded_bytes';

function getDownloadedBytes() {
  return parseInt(localStorage.getItem(DOWNLOAD_KEY) || '0', 10) || 0;
}
function addDownloadedBytes(n) {
  const total = getDownloadedBytes() + n;
  localStorage.setItem(DOWNLOAD_KEY, String(total));
  updateDownloadsBar();
  return total;
}
function formatBytes(n) {
  if (n === 0) return '0 MB';
  if (n >= 1073741824) return (n / 1073741824).toFixed(2) + ' GB';
  if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
  if (n >= 1024) return Math.round(n / 1024) + ' KB';
  return n + ' B';
}
function updateDownloadsBar() {
  const el = document.getElementById('downloadUsage');
  if (el) el.textContent = formatBytes(getDownloadedBytes()) + ' / 1 GB';
  const bar = document.getElementById('downloadUsageBar');
  if (bar) bar.style.width = Math.min(100, (getDownloadedBytes() / DOWNLOAD_LIMIT_BYTES) * 100) + '%';
}
function setDownloadStatus(msg) {
  const el = document.getElementById('downloadStatus');
  if (!el) return;
  el.textContent = msg;
  clearTimeout(setDownloadStatus._t);
  setDownloadStatus._t = setTimeout(() => { el.textContent = ''; }, 6000);
}
function sanitizeFilename(s) {
  return String(s || 'song').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'song';
}

async function resolveDownload(track) {
  if (track.audioUrl) {
    // Library songs: real MP3 files. HEAD gives the exact size for the limit check.
    let size = null;
    try {
      const head = await fetch(track.audioUrl, { method: 'HEAD' });
      const len = head.headers.get('content-length');
      if (len) size = parseInt(len, 10);
    } catch (e) { /* size unknown — still downloadable */ }
    return { url: track.audioUrl, ext: 'mp3', size };
  }
  if (track.source === 'youtube') {
    // Best audio-only stream, proxied through the same service used for search.
    const data = await fetchWithTimeout(`https://yt.chocolatemoo53.com/api/v1/videos/${track.videoId}?local=true`, 10000);
    if (!data) return null;
    const fmts = (data.adaptiveFormats || []).filter(f => (f.type || '').startsWith('audio/') && f.url);
    if (!fmts.length) return null;
    fmts.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    const best = fmts[0];
    const ext = (best.type || '').includes('webm') ? 'webm' : 'm4a';
    return { url: best.url, ext, size: parseInt(best.clen || '0', 10) || null };
  }
  return null;
}

async function downloadTrack(track, btn) {
  if (!track || (btn && btn.dataset.busy === '1')) return;
  if (btn) { btn.dataset.busy = '1'; btn.textContent = '…'; }
  try {
    const dl = await resolveDownload(track);
    if (!dl) throw new Error('no-audio');
    if (dl.size && getDownloadedBytes() + dl.size > DOWNLOAD_LIMIT_BYTES) {
      setDownloadStatus('1 GB limit reached. Remove a downloaded song below, or press Clear to remove them all.');
      if (btn) btn.textContent = '⬇';
      return;
    }
    const res = await fetch(dl.url);
    if (!res.ok) throw new Error('fetch-failed');
    const total = dl.size || parseInt(res.headers.get('content-length') || '0', 10) || 0;
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (btn && total) btn.textContent = Math.round((received / total) * 100) + '%';
    }
    if (getDownloadedBytes() + received > DOWNLOAD_LIMIT_BYTES) {
      setDownloadStatus('This song would go over the 1 GB limit. It was not saved.');
      if (btn) btn.textContent = '⬇';
      return;
    }
    const blob = new Blob(chunks, { type: dl.ext === 'mp3' ? 'audio/mpeg' : 'audio/webm' });
    // Save INSIDE the app (IndexedDB) — the song then plays offline from the app.
    await saveDownloadedTrack(track, blob, dl.ext, received);
    addDownloadedBytes(received);
    downloadedIds.add(track.id);
    setDownloadStatus('Saved in the app — plays offline: ' + track.title);
    if (btn) btn.textContent = '✓';
    renderDownloaded();
  } catch (e) {
    console.log('Download failed:', e);
    setDownloadStatus('Download failed. Check your connection and try again — or just play the song instead.');
    if (btn) btn.textContent = '⬇';
  } finally {
    if (btn) delete btn.dataset.busy;
  }
}

// ============ STATE ============
let currentTrackIndex = 0;
let isPlaying = false;
let currentView = 'home';
let navigationHistory = ['home'];
let currentPlaylistId = null;
let queue = [];
let shuffle = false;
let repeat = 0; // 0=off, 1=all, 2=one
let likedTracks = new Set();
let userPlaylists = [];

// Audio element
const audio = new Audio();
audio.volume = 0.8;

// ============ DOM ELEMENTS ============
const viewContainer = document.getElementById('viewContainer');
const nowPlayingBar = document.getElementById('nowPlayingBar');
const trackModal = document.getElementById('trackModal');
const createPlaylistModal = document.getElementById('createPlaylistModal');

// ============ INIT ============

// ============ SERVER PLAYLISTS — playlists.json is the server data ============
// The app reads its playlists from mp3/playlists.json on every load, so a playlist
// update only changes that file — the app code never needs an update.
async function loadServerPlaylists() {
  try {
    const res = await fetch('playlists.json?v=' + Date.now());
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    if (!data || !Array.isArray(data.tracks) || !Array.isArray(data.playlists)) throw new Error('Invalid data');
    const serverTrackIds = new Set(data.tracks.map(t => t.id));
    trackList = trackList.filter(t => !serverTrackIds.has(t.id)).concat(data.tracks);
    const serverPlIds = new Set(data.playlists.map(p => p.id));
    playlists = playlists.filter(p => !serverPlIds.has(p.id)).concat(data.playlists);
    renderAll();
  } catch (e) {
    console.log('Server playlists unavailable:', e);
    const grid = document.getElementById('playlistGrid');
    if (grid) {
      grid.innerHTML = '<div class="empty-state" style="padding: 20px; text-align: center; color: #888;">গান লোড হয়নি — নেট চেক করে আবার চেষ্টা করো</div>';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadLikedTracks();
  initEventListeners();
  renderAll();
  setupAudioEvents();
  updateNowPlayingBar();
  updateDownloadsBar();
  loadServerPlaylists();
  renderDownloaded();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  document.getElementById('resetDownloadsBtn')?.addEventListener('click', async () => {
    const items = await listDownloadedTracks();
    for (const it of items) await deleteDownloadedTrack(it.id);
    localStorage.removeItem(DOWNLOAD_KEY);
    updateDownloadsBar();
    renderDownloaded();
    setDownloadStatus('All in-app downloads cleared.');
  });
});

// ============ EVENT LISTENERS ============
  function initEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.view));
    });

    // Mobile bottom navigation
    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.view));
    });

    // Now playing bar controls
    document.getElementById('playBtn').addEventListener('click', () => playPause());
    document.getElementById('pauseBtn').addEventListener('click', () => playPause());
    document.getElementById('nextBtn').addEventListener('click', () => playNext());
    document.getElementById('prevBtn').addEventListener('click', () => playPrev());
    document.getElementById('progressBar').addEventListener('input', (e) => { paintProgress(e.target, e.target.value); seek(e.target.value); });
    document.getElementById('volumeControl').addEventListener('input', (e) => setVolume01(e.target.value / 100));
    document.getElementById('queueBtn').addEventListener('click', () => navigateTo('fullscreenNowPlaying'));

    // Fullscreen now playing
    document.getElementById('closeFullscreen').addEventListener('click', () => goBack());
    document.getElementById('fsPlayBtn').addEventListener('click', () => playPause());
    document.getElementById('fsPauseBtn').addEventListener('click', () => playPause());
    document.getElementById('fsPrevBtn').addEventListener('click', () => playPrev());
    document.getElementById('fsNextBtn').addEventListener('click', () => playNext());
    document.getElementById('fullscreenProgressBar').addEventListener('input', (e) => seek(e.target.value));
    document.getElementById('fsVolumeControl').addEventListener('input', (e) => setVolume01(e.target.value / 100));
    document.getElementById('shuffleBtn').addEventListener('click', toggleShuffle);
    document.getElementById('repeatBtn').addEventListener('click', toggleRepeat);
    document.getElementById('fsDownloadBtn').addEventListener('click', (e) => {
      const t = queue[currentTrackIndex];
      if (!t) return;
      if (downloadedIds.has(t.id)) playDownloadedById(t.id);
      else downloadTrack(t, e.target);
    });
    document.getElementById('clearQueueBtn').addEventListener('click', clearQueue);

    // Track modal
    document.querySelector('#trackModal .modal-close').addEventListener('click', () => closeModal());
    document.getElementById('modalPlayBtn').addEventListener('click', () => playPause());
    document.getElementById('modalDownloadBtn').addEventListener('click', (e) => {
      const t = findTrackById(trackModal.dataset.trackId);
      if (!t) return;
      if (downloadedIds.has(t.id)) playDownloadedById(t.id);
      else downloadTrack(t, e.target);
    });
    document.getElementById('modalProgressBar').addEventListener('input', (e) => seek(e.target.value));
    trackModal.addEventListener('click', (e) => { if (e.target === trackModal) closeModal(); });

  // Lock-screen / notification buttons (play, pause, previous, next)
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', () => { if (!isPlaying) playPause(); });
      navigator.mediaSession.setActionHandler('pause', () => { if (isPlaying) playPause(); });
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    } catch (e) {}
  }

  // Create playlist modal
  document.querySelector('#createPlaylistModal .modal-close').addEventListener('click', () => closeCreatePlaylistModal());
  document.getElementById('cancelCreatePlaylist').addEventListener('click', () => closeCreatePlaylistModal());
  document.getElementById('confirmCreatePlaylist').addEventListener('click', createPlaylist);
  createPlaylistModal.addEventListener('click', (e) => { if (e.target === createPlaylistModal) closeCreatePlaylistModal(); });

  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => performSearch(e.target.value));

  // Library filters
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderLibrary(chip.dataset.filter);
    });
  });

  // Create playlist button
  document.getElementById('createPlaylistBtn').addEventListener('click', () => openCreatePlaylistModal());

  // Back buttons
  document.getElementById('playlistBackBtn')?.addEventListener('click', () => goBack());
  document.getElementById('likedBackBtn')?.addEventListener('click', () => goBack());

  // Play all buttons
  document.getElementById('playlistPlayAll')?.addEventListener('click', () => playPlaylist(currentPlaylistId));

  // Save/Follow buttons
  document.getElementById('playlistSave')?.addEventListener('click', () => toggleSavePlaylist(currentPlaylistId));

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') { e.preventDefault(); playPause(); }
    if (e.code === 'ArrowRight') playNext();
    if (e.code === 'ArrowLeft') playPrev();
    if (e.code === 'ArrowUp') audio.volume = Math.min(1, audio.volume + 0.1);
    if (e.code === 'ArrowDown') audio.volume = Math.max(0, audio.volume - 0.1);
    if (e.code === 'Escape') { closeModal(); closeCreatePlaylistModal(); if (currentView !== 'home') goBack(); }
  });

  // Click now playing bar to open fullscreen
  nowPlayingBar.addEventListener('click', (e) => {
    if (!e.target.closest('.btn') && !e.target.closest('.progress') && !e.target.closest('.volume') && !e.target.closest('.queue')) {
      navigateTo('fullscreenNowPlaying');
    }
  });
}

// ============ AUDIO ============
function setupAudioEvents() {
  audio.addEventListener('play', () => { isPlaying = true; setMediaPlaybackState('playing'); updatePlayButtons(); });
  audio.addEventListener('pause', () => { isPlaying = false; setMediaPlaybackState('paused'); updatePlayButtons(); });
  audio.addEventListener('ended', () => handleTrackEnded());
  audio.addEventListener('timeupdate', () => updateProgress());
  audio.addEventListener('loadedmetadata', () => updateDuration());
  audio.addEventListener('waiting', () => setPlayerStatus('লোড হচ্ছে…'));
  audio.addEventListener('stalled', () => setPlayerStatus('লোড হচ্ছে…'));
  audio.addEventListener('playing', () => { setPlayerStatus(''); setMediaPlaybackState('playing'); });
  audio.addEventListener('canplay', () => setPlayerStatus(''));
  audio.addEventListener('error', () => setPlayerStatus('গান লোড হয়নি — নেট চেক করে আবার চেষ্টা করো'));
}

function ytState() {
  try {
    if (!ytPlayer || !ytPlayer.getPlayerState) return null;
    return ytPlayer.getPlayerState();
  } catch (e) { return null; }
}
async function watchYoutubeStart() {
  // True once the hidden player is playing or buffering. A newer track
  // taking over also counts (this watchdog must not fight it).
  const myIndex = currentTrackIndex;
  for (let i = 0; i < 16; i++) {
    if (currentTrackIndex !== myIndex) return true;
    const s = ytState();
    if (s === 1 || s === 3) return true; // PLAYING or BUFFERING
    await new Promise(r => setTimeout(r, 500));
  }
  if (currentTrackIndex !== myIndex) return true;
  try { if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo(); } catch (e) {}
  for (let i = 0; i < 4; i++) {
    if (currentTrackIndex !== myIndex) return true;
    const s = ytState();
    if (s === 1 || s === 3) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return currentTrackIndex !== myIndex;
}
async function playYoutubeViaAudio(track) {
  // Fallback: play the song's direct audio stream through the built-in
  // player, using the same Invidious audio URL the download button uses.
  const dl = await resolveDownload(track);
  if (!dl || !dl.url) return false;
  if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
  stopYtProgress();
  activeEngine = 'audio';
  audio.src = dl.url;
  try {
    await audio.play();
    return true;
  } catch (e) {
    console.log('Fallback playback failed:', e);
    return false;
  }
}
async function playTrack(index) {
  if (index < 0 || index >= queue.length) return;
  currentTrackIndex = index;
  const track = queue[index];
  // Revoke the previous downloaded blob URL when switching tracks
  if (audio._dlUrl) { URL.revokeObjectURL(audio._dlUrl); audio._dlUrl = null; }
  // In-app download? Play the stored file — works offline, no network needed.
  const dlPromise = getDownloadedTrack(track.id);
  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 1500));
  const dl = await Promise.race([dlPromise, timeoutPromise]);
  if (dl && dl.blob) {
    if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
    stopYtProgress();
    activeEngine = 'audio';
    audio._dlUrl = URL.createObjectURL(dl.blob);
    audio.src = audio._dlUrl;
    audio.play().catch(err => {
      console.log('Playback failed:', err);
      setPlayerStatus('গান লোড হয়নি — নেট চেক করে আবার চেষ্টা করো');
    });
    updateNowPlayingBar();
    updateFullscreenNowPlaying();
    updateTrackModal(track);
    renderQueue();
    highlightPlayingTrack();
    return;
  }
  if (track.source === 'youtube') {
    audio.pause();
    setPlayerStatus('লোড হচ্ছে…');
    // Direct audio first: the raw audio stream has no YouTube ads, and the
    // built-in player keeps playing in the background (screen off / another
    // app open) — the hidden YouTube player pauses when the tab is hidden.
    const played = await playYoutubeViaAudio(track);
    if (played) {
      activeEngine = 'audio';
    } else {
      // Fall back to the hidden YouTube player (may include YouTube ads
      // and may pause in the background).
      activeEngine = 'youtube';
      const ok = await loadYouTubeAPI();
      if (ok && ytPlayer && ytPlayer.loadVideoById) {
        let tries = 0;
        while (!ytReady && tries < 20) { await new Promise(r => setTimeout(r, 250)); tries++; }
        ytPlayer.setVolume(Math.round(audio.volume * 100));
        ytPlayer.loadVideoById(track.videoId);
        startYtProgress();
        const started = await watchYoutubeStart();
        if (!started) {
          activeEngine = 'audio';
          stopYtProgress();
          isPlaying = false;
          updatePlayButtons();
          setPlayerStatus('গান লোড হয়নি — নেট চেক করে আবার চেষ্টা করো');
          return;
        }
      } else {
        activeEngine = 'audio';
        stopYtProgress();
        isPlaying = false;
        updatePlayButtons();
        setPlayerStatus('গান লোড হয়নি — নেট চেক করে আবার চেষ্টা করো');
        return;
      }
    }
  } else {
    if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
    stopYtProgress();
    activeEngine = 'audio';
    audio.src = track.audioUrl;
    audio.play().catch(err => {
      console.log('Playback failed:', err);
      setPlayerStatus('গান লোড হয়নি — নেট চেক করে আবার চেষ্টা করো');
    });
  }
  updateNowPlayingBar();
  updateFullscreenNowPlaying();
  updateTrackModal(track);
  renderQueue();
  highlightPlayingTrack();
}

function playPause() {
  if (queue.length === 0) {
    playQueue(trackList.map(t => t.id), 0);
    return;
  }
  if (activeEngine === 'youtube' && ytPlayer && ytPlayer.getPlayerState) {
    const s = ytPlayer.getPlayerState();
    if (s === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
    return;
  }
  if (isPlaying) audio.pause();
  else audio.play().catch(err => {
    console.log('Playback failed:', err);
    setPlayerStatus('গান লোড হয়নি — নেট চেক করে আবার চেষ্টা করো');
  });
}

function playNext() {
  if (repeat === 2) { playTrack(currentTrackIndex); return; }
  let nextIndex = currentTrackIndex + 1;
  if (nextIndex >= queue.length) {
    if (repeat === 1) nextIndex = 0;
    else return;
  }
  playTrack(nextIndex);
}

function playPrev() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  let prevIndex = currentTrackIndex - 1;
  if (prevIndex < 0) {
    if (repeat === 1) prevIndex = queue.length - 1;
    else return;
  }
  playTrack(prevIndex);
}

function seek(percent) {
  if (activeEngine === 'youtube' && ytPlayer && ytPlayer.getDuration) {
    const d = ytPlayer.getDuration() || 0;
    if (d) ytPlayer.seekTo((percent / 100) * d, true);
    return;
  }
  if (audio.duration) audio.currentTime = (percent / 100) * audio.duration;
}

function handleTrackEnded() {
  if (repeat === 2) { audio.currentTime = 0; audio.play(); return; }
  playNext();
}

function updateProgress() {
    if (!audio.duration) return;
    const percent = (audio.currentTime / audio.duration) * 100;
    const pb = document.getElementById('progressBar'); pb.value = percent; paintProgress(pb, percent);
    const fpb = document.getElementById('fullscreenProgressBar'); fpb.value = percent; paintProgress(fpb, percent);
    const mpb = document.getElementById('modalProgressBar'); mpb.value = percent; paintProgress(mpb, percent);
    const tc = formatTime(audio.currentTime);
    document.getElementById('timeCurrent').textContent = tc;
    document.getElementById('playerTimeCurrent').textContent = tc;
    const tt = formatTime(audio.duration);
    document.getElementById('timeTotal').textContent = tt;
    document.getElementById('playerTimeTotal').textContent = tt;
  }

function updateDuration() {
    const tt = formatTime(audio.duration);
    document.getElementById('timeTotal').textContent = tt;
    document.getElementById('playerTimeTotal').textContent = tt;
  }

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updatePlayButtons() {
  const showPlay = !isPlaying;
  document.getElementById('playBtn').hidden = !showPlay;
  document.getElementById('pauseBtn').hidden = showPlay;
  document.getElementById('fsPlayBtn').hidden = !showPlay;
  document.getElementById('fsPauseBtn').hidden = showPlay;
}

// ============ NAVIGATION ============
function navigateTo(view, data = {}) {
  if (view === currentView && !data.force) return;
  
  // Update history
  if (view !== currentView) {
    navigationHistory.push(currentView);
  }
  
  // Store data for detail views
  if (data.playlistId) currentPlaylistId = data.playlistId;

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  
  // Show target view
  const targetView = document.getElementById(view + 'View');
  if (targetView) targetView.classList.add('active');
  
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  // Update mobile bottom nav active state
  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  currentView = view;
  renderView(view);
  window.scrollTo(0, 0);
}

function goBack() {
  if (navigationHistory.length > 1) {
    navigationHistory.pop(); // remove current
    const prevView = navigationHistory.pop(); // get previous
    navigateTo(prevView, { force: true });
  } else {
    navigateTo('home');
  }
}

function renderView(view) {
  switch (view) {
    case 'home': renderHome(); break;
    case 'search': renderSearch(); break;
    case 'library': renderLibrary('playlists'); break;
    case 'playlistDetail': renderPlaylistDetail(); break;
    case 'likedSongs': renderLikedSongs(); break;
    case 'fullscreenNowPlaying': renderFullscreenNowPlaying(); break;
  }
}

// ============ RENDER FUNCTIONS ============
function renderAll() {
  renderHome();
  renderSearch();
  renderLibrary('playlists');
  updateNowPlayingBar();
  updateFullscreenNowPlaying();
  renderQueue();
}

function renderHome() {
  const playlistGrid = document.getElementById('playlistGrid');
  if (playlistGrid) {
    const allSongsPl = getAllSongsPlaylist();
    const items = [allSongsPl, ...playlists];
    playlistGrid.innerHTML = items.map(p => createPlaylistRow(p)).join('');
    attachPlaylistRowListeners(playlistGrid);
  }

  const countEl = document.getElementById('serverSongCount');
  if (countEl) countEl.textContent = `${trackList.length} songs`;
}

function renderSearch() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  performSearch(query);
}

function performSearch(query) {
  const q = (query || '').trim();
  const ql = q.toLowerCase();
  const tracksGrid = document.getElementById('searchTracksGrid');
  const playlistsGrid = document.getElementById('searchPlaylistsGrid');
  const onlineSection = document.getElementById('onlineSection');
  const sections = {
    tracks: document.getElementById('tracksSection'),
    playlists: document.getElementById('playlistsSection'),
  };

  clearTimeout(searchTimer);
  if (!q) {
    Object.values(sections).forEach(s => s.style.display = 'none');
    if (onlineSection) onlineSection.style.display = 'none';
    onlineResults = [];
    return;
  }

  Object.values(sections).forEach(s => s.style.display = 'block');

  const filteredTracks = trackList.filter(t =>
    t.title.toLowerCase().includes(ql) || t.artist.toLowerCase().includes(ql)
  );
  tracksGrid.innerHTML = filteredTracks.map(t => createCard(t, 'track')).join('');
  attachCardListeners(tracksGrid);

  const filteredPlaylists = [...playlists, ...userPlaylists].filter(p =>
    p.title.toLowerCase().includes(ql)
  );
  playlistsGrid.innerHTML = filteredPlaylists.map(p => createPlaylistRow(p)).join('');
  attachPlaylistRowListeners(playlistsGrid);

  // Online search — all free sources, debounced
  if (onlineSection) {
    onlineSection.style.display = 'block';
    const status = document.getElementById('onlineStatus');
    if (status) status.textContent = 'Searching...';
    document.getElementById('searchOnlineGrid').innerHTML = '';
    const seq = ++searchSeq;
    searchTimer = setTimeout(() => searchOnline(q, seq), 400);
  }
}

function renderLibrary(filter) {
  const grid = document.getElementById('libraryGrid');
  switch (filter) {
    case 'playlists': {
      const items = [...playlists, ...userPlaylists.filter(p => !playlists.find(op => op.id === p.id))];
      if (items.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">Create your first playlist</div>';
      } else {
        grid.innerHTML = items.map(p => createPlaylistRow(p)).join('');
        attachPlaylistRowListeners(grid);
      }
      break;
    }
    case 'liked':
      navigateTo('likedSongs');
      return;
  }
}

function renderPlaylistDetail() {
  const playlist = findPlaylist(currentPlaylistId);
  if (!playlist) { navigateTo('home'); return; }
  
  setCover(document.getElementById('playlistCover'), playlist);
  document.getElementById('playlistTitle').textContent = playlist.title;
  document.getElementById('playlistDescription').textContent = playlist.description || '';
  
  const saveBtn = document.getElementById('playlistSave');
  if (saveBtn) {
    if (playlist.id === 'all-songs') {
      saveBtn.style.display = 'none';
    } else {
      saveBtn.style.display = 'inline-block';
      const isSaved = userPlaylists.some(p => p.id === playlist.id);
      saveBtn.textContent = isSaved ? 'Saved' : 'Save';
      saveBtn.classList.toggle('active', isSaved);
    }
  }

  const tracks = playlist.trackIds.map(id => trackList.find(t => t.id === id)).filter(Boolean);
  const totalSec = tracks.reduce((sum, t) => sum + (t.durationSec || 0), 0);
  document.getElementById('playlistMeta').textContent = `${tracks.length} songs, ${formatTime(totalSec)}`;
  
  const tracksContainer = document.getElementById('playlistTracks');
  tracksContainer.innerHTML = tracks.map((t, i) => createTrackRow(t, i, playlist.trackIds.indexOf(t.id))).join('');
  attachTrackRowListeners(tracksContainer, playlist.trackIds);
}

function renderLikedSongs() {
  const likedTrackObjects = trackList.filter(t => likedTracks.has(t.id));
  document.getElementById('likedMeta').textContent = `${likedTrackObjects.length} song${likedTrackObjects.length !== 1 ? 's' : ''}`;
  
  const container = document.getElementById('likedTracks');
  if (likedTrackObjects.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding: 40px; text-align: center; color: #888;">No liked songs yet. Click the heart on any track to add it here.</div>';
  } else {
    container.innerHTML = likedTrackObjects.map((t, i) => createTrackRow(t, i, trackList.indexOf(t), true)).join('');
    attachTrackRowListeners(container, likedTrackObjects.map(t => t.id), true);
  }
}

function renderFullscreenNowPlaying() {
  updateFullscreenNowPlaying();
  renderQueue();
}

function updateFullscreenNowPlaying() {
  if (queue.length === 0) return;
  const track = queue[currentTrackIndex];
  setFullscreenCover(track);
  document.getElementById('fullscreenTitle').textContent = track.title;
  document.getElementById('fullscreenArtist').textContent = track.artist;
  const fsDl = document.getElementById('fsDownloadBtn');
  if (fsDl) fsDl.textContent = downloadedIds.has(track.id) ? '✓' : '⬇';
  updatePlayButtons();
}

function renderQueue() {
  const list = document.getElementById('queueList');
  if (queue.length === 0) {
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">Queue is empty. Play something to start the queue.</div>';
    return;
  }
  list.innerHTML = queue.map((t, i) => `
    <div class="queue-item" data-index="${i}">
      ${coverHTML(t)}
      <div class="queue-info">
        <div class="queue-title">${t.title}</div>
        <div class="queue-artist">${t.artist}</div>
      </div>
      <button class="queue-download" data-index="${i}" title="Download">${downloadedIds.has(t.id) ? '✓' : '⬇'}</button>
      <button class="queue-remove" data-index="${i}">✕</button>
    </div>
  `).join('');
  
  // Highlight current
  const currentItem = list.querySelector(`[data-index="${currentTrackIndex}"]`);
  if (currentItem) currentItem.style.background = '#2a0a0a';
  
  // Attach listeners
  list.querySelectorAll('.queue-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('queue-remove') && !e.target.classList.contains('queue-download')) {
        playTrack(parseInt(item.dataset.index));
      }
    });
    item.querySelector('.queue-download')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = queue[parseInt(item.dataset.index)];
      if (!t) return;
      if (downloadedIds.has(t.id)) playDownloadedById(t.id);
      else downloadTrack(t, e.target);
    });
    item.querySelector('.queue-remove')?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromQueue(parseInt(item.dataset.index));
    });
  });
}

// ============ CARD CREATION ============
function createCard(item, type) {
  if (type !== 'track') return '';
  const isLiked = likedTracks.has(item.id);
  const heart = `<button class="track-like${isLiked ? ' liked' : ''}" data-id="${item.id}" title="${isLiked ? 'Unlike' : 'Like'}">♥</button>`;
  const dlBtn = `<button class="track-download" data-id="${item.id}" title="Download">${downloadedIds.has(item.id) ? '✓' : '⬇'}</button>`;
  return `
    <div class="card" data-type="track" data-id="${item.id}">
      ${coverHTML(item)}
      <div class="info">
        <div class="title">${escAttr(item.title)}</div>
        <div class="artist">${escAttr(item.artist)}</div>
        <div class="card-actions">${heart}${dlBtn}</div>
      </div>
    </div>
  `;
}

function createTrackRow(track, displayIndex, actualIndex, showAlbum = false) {
  const isLiked = likedTracks.has(track.id);
  const isPlayingNow = queue[currentTrackIndex]?.id === track.id && isPlaying;
  return `
    <div class="track-row${isPlayingNow ? ' playing' : ''}" data-id="${track.id}" data-index="${actualIndex}">
      <div class="track-num${isPlayingNow ? ' playing' : ''}">${displayIndex + 1}</div>
      <div class="track-main">
        ${coverHTML(track)}
        <div class="track-text">
          <div class="title">${escAttr(track.title)}</div>
          <div class="artist">${escAttr(track.artist)}</div>
        </div>
      </div>
      ${showAlbum ? `<div class="track-album">${escAttr(track.album)}</div>` : ''}
      <div class="track-duration">${track.duration}</div>
      <button class="track-like${isLiked ? ' liked' : ''}" data-id="${track.id}" title="${isLiked ? 'Unlike' : 'Like'}">♥</button>
      <button class="track-download" data-id="${track.id}" title="Download">${downloadedIds.has(track.id) ? '✓' : '⬇'}</button>
    </div>
  `;
}

// ============ CARD LISTENERS ============
function attachCardListeners(container) {
  if (!container) return;
  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('track-like')) return;
      if (e.target.classList.contains('track-download')) return;
      const type = card.dataset.type;
      const id = card.dataset.id;
      handleCardClick(type, id);
    });
    // Like button on track cards
    card.querySelector('.track-like')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = toTrackId(e.target.dataset.id);
      toggleLike(id);
    });
    // Download button on track cards — plays the stored copy when already downloaded
    card.querySelector('.track-download')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = findTrackById(e.target.dataset.id);
      if (!t) return;
      if (downloadedIds.has(t.id)) playDownloadedById(t.id);
      else downloadTrack(t, e.target);
    });
  });
}

function handleCardClick(type, id) {
  switch (type) {
    case 'playlist': navigateTo('playlistDetail', { playlistId: id }); break;
    case 'track': {
      const t = findTrackById(id);
      if (!t) break;
      if (t.source === 'youtube' || t.source === 'saavn') playTrackObjects(onlineResults, onlineResults.indexOf(t));
      else openTrackModal(t);
      break;
    }
  }
}

function attachTrackRowListeners(container, trackIds, isLikedView = false) {
  if (!container) return;
  container.querySelectorAll('.track-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('track-like')) return;
      if (e.target.classList.contains('track-download')) return;
      const index = parseInt(row.dataset.index);
      const trackIdsToPlay = isLikedView 
        ? trackList.filter(t => likedTracks.has(t.id)).map(t => t.id)
        : trackIds;
      playQueue(trackIdsToPlay, index);
    });
    row.querySelector('.track-like')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(e.target.dataset.id);
      toggleLike(id);
    });
    row.querySelector('.track-download')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = findTrackById(e.target.dataset.id);
      if (!t) return;
      if (downloadedIds.has(t.id)) playDownloadedById(t.id);
      else downloadTrack(t, e.target);
    });
  });
}

// ============ PLAYBACK QUEUE ============
function playQueue(trackIds, startIndex = 0) {
  queue = trackIds.map(id => trackList.find(t => t.id === id)).filter(Boolean);
  if (queue.length === 0) return;
  playTrack(startIndex);
  navigateTo('fullscreenNowPlaying');
  renderQueue();
}

function playPlaylist(playlistId) {
  const playlist = findPlaylist(playlistId);
  if (!playlist) return;
  playQueue(playlist.trackIds, 0);
}

function removeFromQueue(index) {
  queue.splice(index, 1);
  if (queue.length === 0) {
    audio.pause();
    isPlaying = false;
    updatePlayButtons();
    updateNowPlayingBar();
  } else if (index < currentTrackIndex) {
    currentTrackIndex--;
    if (currentTrackIndex < 0) currentTrackIndex = 0;
  } else if (index === currentTrackIndex && index >= queue.length) {
    currentTrackIndex = queue.length - 1;
    playTrack(currentTrackIndex);
  }
  renderQueue();
  updateFullscreenNowPlaying();
}

function clearQueue() {
  queue = [];
  currentTrackIndex = 0;
  audio.pause();
  isPlaying = false;
  updatePlayButtons();
  updateNowPlayingBar();
  renderQueue();
  updateFullscreenNowPlaying();
}

function toggleShuffle() {
  shuffle = !shuffle;
  document.getElementById('shuffleBtn').style.color = shuffle ? '#1DB954' : '';
  // For simplicity, not implementing full shuffle logic
}

function toggleRepeat() {
  repeat = (repeat + 1) % 3;
  const btn = document.getElementById('repeatBtn');
  btn.style.color = repeat === 0 ? '' : '#1DB954';
  const badge = document.getElementById('repeatOneBadge');
  if (badge) badge.style.display = repeat === 2 ? 'block' : 'none';
}

// Seek bar: green played part, grey rest (uses CSS custom property --p)
  function paintProgress(input, percent) {
    if (!input) return;
    const p = Math.max(0, Math.min(100, percent));
    input.style.setProperty('--p', p + '%');
  }

// ============ NOW PLAYING BAR ============
function updateNowPlayingBar() {
  if (queue.length === 0) {
    document.getElementById('nowPlayingTitle').textContent = 'কোনো গান চলছে না';
    document.getElementById('nowPlayingArtist').textContent = '—';
    const coverEl = document.getElementById('nowPlayingCover');
    if (coverEl) { coverEl.className = ''; coverEl.innerHTML = ''; }
    document.getElementById('progressBar').value = 0;
    return;
  }
  const track = queue[currentTrackIndex];
  document.getElementById('nowPlayingTitle').textContent = track.title;
  document.getElementById('nowPlayingArtist').textContent = track.artist;
  setCover(document.getElementById('nowPlayingCover'), track);
  updateMediaSession(track);
}

// ============ TRACK MODAL ============
function openTrackModal(track) {
  if (!track) return;
  setCover(document.getElementById('modalCover'), track);
  document.getElementById('modalTitle').textContent = track.title;
  document.getElementById('modalArtist').textContent = track.artist;
  document.getElementById('modalDuration').textContent = track.duration;
  document.getElementById('modalProgressBar').value = 0;
  const mDl = document.getElementById('modalDownloadBtn');
  if (mDl) mDl.textContent = downloadedIds.has(track.id) ? '✓' : '⬇';
  trackModal.dataset.trackId = track.id;
  trackModal.classList.add('active');
}

function closeModal() {
  trackModal.classList.remove('active');
}

function updateTrackModal(track) {
  if (!trackModal.classList.contains('active')) return;
  if (parseInt(trackModal.dataset.trackId) !== track.id) return;
  document.getElementById('modalProgressBar').value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
}

// ============ CREATE PLAYLIST ============
function openCreatePlaylistModal() {
  document.getElementById('newPlaylistName').value = '';
  document.getElementById('newPlaylistDesc').value = '';
  createPlaylistModal.classList.add('active');
}

function closeCreatePlaylistModal() {
  createPlaylistModal.classList.remove('active');
}

function createPlaylist() {
  const name = document.getElementById('newPlaylistName').value.trim();
  const desc = document.getElementById('newPlaylistDesc').value.trim();
  if (!name) return;
  
  const newPlaylist = {
    id: 'playlist_' + Date.now(),
    title: name,
    description: desc || 'Your new playlist',
    trackIds: [],
    owner: 'You'
  };
  userPlaylists.push(newPlaylist);
  closeCreatePlaylistModal();
  if (currentView === 'library') renderLibrary('playlists');
}

// ============ LIKE SYSTEM ============
function toggleLike(trackId) {
  if (likedTracks.has(trackId)) {
    likedTracks.delete(trackId);
  } else {
    likedTracks.add(trackId);
  }
  saveLikedTracks();
  updateLikeUI(trackId);
  
  // Re-render if on liked songs page
  if (currentView === 'likedSongs') renderLikedSongs();
  // Re-render search if visible
  if (currentView === 'search') renderSearch();
}

function updateLikeUI(trackId) {
  const isLiked = likedTracks.has(trackId);
  document.querySelectorAll(`.track-like[data-id="${trackId}"]`).forEach(btn => {
    btn.classList.toggle('liked', isLiked);
    btn.title = isLiked ? 'Unlike' : 'Like';
  });
}

function saveLikedTracks() {
  localStorage.setItem('shoot2head_liked', JSON.stringify([...likedTracks]));
}

function loadLikedTracks() {
  const saved = localStorage.getItem('shoot2head_liked');
  if (saved) {
    likedTracks = new Set(JSON.parse(saved));
  }
}

// ============ SAVE PLAYLIST ============
function toggleSavePlaylist(playlistId) {
  if (playlistId === 'all-songs') return;
  const btn = document.getElementById('playlistSave');
  const index = userPlaylists.findIndex(p => p.id === playlistId);
  if (index >= 0) {
    userPlaylists.splice(index, 1);
    if (btn) {
      btn.textContent = 'Save';
      btn.classList.remove('active');
    }
  } else {
    const mainPlaylist = findPlaylist(playlistId);
    if (mainPlaylist) {
      userPlaylists.push({ ...mainPlaylist });
      if (btn) {
        btn.textContent = 'Saved';
        btn.classList.add('active');
      }
    }
  }
  if (currentView === 'library') renderLibrary('playlists');
}

// ============ HELPERS ============
function highlightPlayingTrack() {
  document.querySelectorAll('.track-row').forEach(row => {
    const trackId = parseInt(row.dataset.id);
    const isCurrent = queue[currentTrackIndex]?.id === trackId;
    row.classList.toggle('playing', isCurrent && isPlaying);
    row.querySelector('.track-num')?.classList.toggle('playing', isCurrent && isPlaying);
  });
}