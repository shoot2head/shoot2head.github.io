// shoot2head.mp3 - Complete Spotify-style player

// ============ DATA ============
const artists = {
  prabir: { id: 'prabir', name: 'Prabir', image: 'logo.png', bio: 'Prabir creates atmospheric electronic soundscapes blending ambient textures with rhythmic pulses. Based in the studio, crafting demo tracks for the next generation of listeners.' },
  abhijit: { id: 'abhijit', name: 'Abhijit', image: 'logo.png', bio: 'Abhijit explores the intersection of melody and machine. From late-night synth sessions to sunrise mixes, each track is a journey through sound.' }
};

// Demo tracks - single editable array for future audio server
const trackList = [
  { id: 1, title: 'Dreamy Tone', artist: 'Prabir', artistId: 'prabir', duration: '2:45', durationSec: 165, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', album: 'Midnight Sessions', albumId: 'album1', playlistIds: ['playlist1'] },
  { id: 2, title: 'Upbeat Demo', artist: 'Prabir', artistId: 'prabir', duration: '3:12', durationSec: 192, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', album: 'Midnight Sessions', albumId: 'album1', playlistIds: ['playlist1', 'playlist3'] },
  { id: 3, title: 'Midnight Chill', artist: 'Prabir', artistId: 'prabir', duration: '4:20', durationSec: 260, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', album: 'Midnight Sessions', albumId: 'album1', playlistIds: ['playlist2'] },
  { id: 4, title: 'Neon Dreams', artist: 'Prabir', artistId: 'prabir', duration: '3:45', durationSec: 225, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', album: 'Midnight Sessions', albumId: 'album1', playlistIds: ['playlist2'] },
  { id: 5, title: 'Echo Chamber', artist: 'Prabir', artistId: 'prabir', duration: '2:58', durationSec: 178, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', album: 'Midnight Sessions', albumId: 'album1', playlistIds: ['playlist3'] },
  { id: 6, title: 'Solar Flare', artist: 'Abhijit', artistId: 'abhijit', duration: '3:30', durationSec: 210, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', album: 'Electric Sunrise', albumId: 'album2', playlistIds: ['playlist1', 'playlist3'] },
  { id: 7, title: 'Binary Sunset', artist: 'Abhijit', artistId: 'abhijit', duration: '4:15', durationSec: 255, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', album: 'Electric Sunrise', albumId: 'album2', playlistIds: ['playlist2'] },
  { id: 8, title: 'Circuit Breaker', artist: 'Abhijit', artistId: 'abhijit', duration: '3:05', durationSec: 185, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', album: 'Electric Sunrise', albumId: 'album2', playlistIds: ['playlist1'] },
  { id: 9, title: 'Digital Horizon', artist: 'Abhijit', artistId: 'abhijit', duration: '3:50', durationSec: 230, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', album: 'Electric Sunrise', albumId: 'album2', playlistIds: ['playlist3'] },
];

const playlists = [
  { id: 'playlist1', title: 'Late Night Coding', description: 'Perfect beats for deep focus sessions', cover: 'logo.png', trackIds: [1, 2, 6, 8], owner: 'You' },
  { id: 'playlist2', title: 'Chill Vibes Only', description: 'Wind down with atmospheric sounds', cover: 'logo.png', trackIds: [3, 4, 7], owner: 'You' },
  { id: 'playlist3', title: 'Weekend Energy', description: 'High energy tracks for the weekend', cover: 'logo.png', trackIds: [2, 5, 6, 9], owner: 'You' },
];

const albums = [
  { id: 'album1', title: 'Midnight Sessions', artist: 'Prabir', artistId: 'prabir', cover: 'logo.png', year: '2024', trackIds: [1, 2, 3, 4, 5] },
  { id: 'album2', title: 'Electric Sunrise', artist: 'Abhijit', artistId: 'abhijit', cover: 'logo.png', year: '2024', trackIds: [6, 7, 8, 9] },
];

const categories = [
  { id: 'chill', name: 'Chill', cover: 'logo.png' },
  { id: 'focus', name: 'Focus', cover: 'logo.png' },
  { id: 'energy', name: 'Energy', cover: 'logo.png' },
  { id: 'electronic', name: 'Electronic', cover: 'logo.png' },
];

// ============ STATE ============
let currentTrackIndex = 0;
let isPlaying = false;
let currentView = 'home';
let navigationHistory = ['home'];
let currentPlaylistId = null;
let currentAlbumId = null;
let currentArtistId = null;
let queue = [];
let shuffle = false;
let repeat = 0; // 0=off, 1=all, 2=one
let likedTracks = new Set();
let userPlaylists = [...playlists];

// Audio element
const audio = new Audio();
audio.volume = 0.8;

// ============ DOM ELEMENTS ============
const viewContainer = document.getElementById('viewContainer');
const nowPlayingBar = document.getElementById('nowPlayingBar');
const trackModal = document.getElementById('trackModal');
const createPlaylistModal = document.getElementById('createPlaylistModal');

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  loadLikedTracks();
  initEventListeners();
  renderAll();
  setupAudioEvents();
  updateNowPlayingBar();
});

// ============ EVENT LISTENERS ============
function initEventListeners() {
  // Sidebar navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });

  // Now playing bar controls
  document.getElementById('playBtn').addEventListener('click', () => playPause());
  document.getElementById('pauseBtn').addEventListener('click', () => playPause());
  document.getElementById('nextBtn').addEventListener('click', () => playNext());
  document.getElementById('prevBtn').addEventListener('click', () => playPrev());
  document.getElementById('progressBar').addEventListener('input', (e) => seek(e.target.value));
  document.getElementById('volumeControl').addEventListener('input', (e) => audio.volume = e.target.value / 100);
  document.getElementById('queueBtn').addEventListener('click', () => navigateTo('fullscreenNowPlaying'));

  // Fullscreen now playing
  document.getElementById('closeFullscreen').addEventListener('click', () => goBack());
  document.getElementById('fsPlayBtn').addEventListener('click', () => playPause());
  document.getElementById('fsPauseBtn').addEventListener('click', () => playPause());
  document.getElementById('fsPrevBtn').addEventListener('click', () => playPrev());
  document.getElementById('fsNextBtn').addEventListener('click', () => playNext());
  document.getElementById('fullscreenProgressBar').addEventListener('input', (e) => seek(e.target.value));
  document.getElementById('fsVolumeControl').addEventListener('input', (e) => audio.volume = e.target.value / 100);
  document.getElementById('shuffleBtn').addEventListener('click', toggleShuffle);
  document.getElementById('repeatBtn').addEventListener('click', toggleRepeat);
  document.getElementById('clearQueueBtn').addEventListener('click', clearQueue);

  // Track modal
  document.querySelector('#trackModal .close-btn').addEventListener('click', () => closeModal());
  document.getElementById('modalPlayBtn').addEventListener('click', () => playPause());
  document.getElementById('modalProgressBar').addEventListener('input', (e) => seek(e.target.value));
  trackModal.addEventListener('click', (e) => { if (e.target === trackModal) closeModal(); });

  // Create playlist modal
  document.querySelector('#createPlaylistModal .close-btn').addEventListener('click', () => closeCreatePlaylistModal());
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
  document.getElementById('playlistBackBtn').addEventListener('click', () => goBack());
  document.getElementById('albumBackBtn').addEventListener('click', () => goBack());
  document.getElementById('artistBackBtn').addEventListener('click', () => goBack());
  document.getElementById('likedBackBtn').addEventListener('click', () => goBack());

  // Play all buttons
  document.getElementById('playlistPlayAll').addEventListener('click', () => playPlaylist(currentPlaylistId));
  document.getElementById('albumPlayAll').addEventListener('click', () => playAlbum(currentAlbumId));
  document.getElementById('artistPlayAll').addEventListener('click', () => playArtistTopTracks(currentArtistId));

  // Save/Follow buttons
  document.getElementById('playlistSave').addEventListener('click', () => toggleSavePlaylist(currentPlaylistId));
  document.getElementById('albumSave').addEventListener('click', () => toggleSaveAlbum(currentAlbumId));
  document.getElementById('artistFollow').addEventListener('click', () => toggleFollowArtist(currentArtistId));

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
  audio.addEventListener('play', () => { isPlaying = true; updatePlayButtons(); });
  audio.addEventListener('pause', () => { isPlaying = false; updatePlayButtons(); });
  audio.addEventListener('ended', () => handleTrackEnded());
  audio.addEventListener('timeupdate', () => updateProgress());
  audio.addEventListener('loadedmetadata', () => updateDuration());
}

function playTrack(index) {
  if (index < 0 || index >= queue.length) return;
  currentTrackIndex = index;
  const track = queue[index];
  audio.src = track.audioUrl;
  audio.play().catch(err => console.log('Playback failed:', err));
  updateNowPlayingBar();
  updateFullscreenNowPlaying();
  updateTrackModal(track);
  renderQueue();
  highlightPlayingTrack();
}

function playPause() {
  if (isPlaying) audio.pause();
  else audio.play().catch(err => console.log('Playback failed:', err));
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
  audio.currentTime = (percent / 100) * audio.duration;
}

function handleTrackEnded() {
  if (repeat === 2) { audio.currentTime = 0; audio.play(); return; }
  playNext();
}

function updateProgress() {
  if (!audio.duration) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  document.getElementById('progressBar').value = percent;
  document.getElementById('fullscreenProgressBar').value = percent;
  document.getElementById('modalProgressBar').value = percent;
  document.getElementById('timeCurrent').textContent = formatTime(audio.currentTime);
  document.getElementById('modalProgressBar').value = percent;
}

function updateDuration() {
  document.getElementById('timeTotal').textContent = formatTime(audio.duration);
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updatePlayButtons() {
  const showPlay = !isPlaying;
  document.getElementById('playBtn').style.display = showPlay ? 'flex' : 'none';
  document.getElementById('pauseBtn').style.display = showPlay ? 'none' : 'flex';
  document.getElementById('fsPlayBtn').style.display = showPlay ? 'flex' : 'none';
  document.getElementById('fsPauseBtn').style.display = showPlay ? 'none' : 'flex';
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
  if (data.albumId) currentAlbumId = data.albumId;
  if (data.artistId) currentArtistId = data.artistId;

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  
  // Show target view
  const targetView = document.getElementById(view + 'View');
  if (targetView) targetView.classList.add('active');
  
  // Update sidebar active state
  document.querySelectorAll('.nav-btn').forEach(btn => {
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
    case 'albumDetail': renderAlbumDetail(); break;
    case 'artistDetail': renderArtistDetail(); break;
    case 'likedSongs': renderLikedSongs(); break;
    case 'fullscreenNowPlaying': renderFullscreenNowPlaying(); break;
  }
}

// ============ RENDER FUNCTIONS ============
function renderAll() {
  renderHome();
  renderSearch();
  renderLibrary('playlists');
  renderCategories();
  updateNowPlayingBar();
  updateFullscreenNowPlaying();
  renderQueue();
}

function renderHome() {
  // Featured track
  const featuredTrack = trackList[0];
  document.getElementById('featuredCover').src = featuredTrack.audioUrl ? 'logo.png' : 'logo.png';
  document.getElementById('featuredTitle').textContent = featuredTrack.title;
  document.getElementById('featuredArtist').textContent = featuredTrack.artist;
  document.getElementById('featuredCover').onclick = () => openTrackModal(featuredTrack);

  // Card grid - playlists and albums
  const cardGrid = document.getElementById('cardGrid');
  cardGrid.innerHTML = playlists.map(p => createCard(p, 'playlist')).join('') + albums.map(a => createCard(a, 'album')).join('');
  attachCardListeners(cardGrid);

  // Recently played - last 4 unique tracks
  const recentTracks = getRecentlyPlayed();
  const recentGrid = document.getElementById('recentGrid');
  recentGrid.innerHTML = recentTracks.map(t => createCard(t, 'track')).join('');
  attachCardListeners(recentGrid);
}

function renderSearch() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  performSearch(query);
}

function performSearch(query) {
  const tracksGrid = document.getElementById('searchTracksGrid');
  const artistsGrid = document.getElementById('searchArtistsGrid');
  const playlistsGrid = document.getElementById('searchPlaylistsGrid');
  const sections = {
    tracks: document.getElementById('tracksSection'),
    artists: document.getElementById('artistsSection'),
    playlists: document.getElementById('playlistsSection'),
  };

  if (!query) {
    Object.values(sections).forEach(s => s.style.display = 'none');
    document.getElementById('browseCategories').style.display = 'block';
    return;
  }

  document.getElementById('browseCategories').style.display = 'none';
  Object.values(sections).forEach(s => s.style.display = 'block');

  const filteredTracks = trackList.filter(t => 
    t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query)
  );
  tracksGrid.innerHTML = filteredTracks.map(t => createCard(t, 'track')).join('');
  attachCardListeners(tracksGrid);

  const artistIds = [...new Set(trackList.filter(t => t.artist.toLowerCase().includes(query)).map(t => t.artistId))];
  artistsGrid.innerHTML = artistIds.map(id => createCard(artists[id], 'artist')).join('');
  attachCardListeners(artistsGrid);

  const filteredPlaylists = [...playlists, ...userPlaylists].filter(p => 
    p.title.toLowerCase().includes(query)
  );
  playlistsGrid.innerHTML = filteredPlaylists.map(p => createCard(p, 'playlist')).join('');
  attachCardListeners(playlistsGrid);
}

function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = categories.map(c => createCard(c, 'category')).join('');
  attachCardListeners(grid);
}

function renderLibrary(filter) {
  const grid = document.getElementById('libraryGrid');
  let items = [];
  let emptyMessage = '';
  let cardType = 'playlist';

  switch (filter) {
    case 'playlists':
      items = [...playlists, ...userPlaylists.filter(p => !playlists.find(op => op.id === p.id))];
      emptyMessage = 'Create your first playlist';
      cardType = 'playlist';
      break;
    case 'artists':
      items = Object.values(artists);
      emptyMessage = 'Follow artists to see them here';
      cardType = 'artist';
      break;
    case 'albums':
      items = albums;
      emptyMessage = 'Save albums to see them here';
      cardType = 'album';
      break;
    case 'liked':
      navigateTo('likedSongs');
      return;
  }

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">${emptyMessage}</div>`;
  } else {
    grid.innerHTML = items.map(item => createCard(item, cardType)).join('');
    attachCardListeners(grid);
  }
}

function renderPlaylistDetail() {
  const playlist = [...playlists, ...userPlaylists].find(p => p.id === currentPlaylistId);
  if (!playlist) { navigateTo('home'); return; }
  
  document.getElementById('playlistCover').src = playlist.cover;
  document.getElementById('playlistTitle').textContent = playlist.title;
  document.getElementById('playlistDescription').textContent = playlist.description;
  
  const tracks = playlist.trackIds.map(id => trackList.find(t => t.id === id)).filter(Boolean);
  const totalSec = tracks.reduce((sum, t) => sum + t.durationSec, 0);
  document.getElementById('playlistMeta').textContent = `${tracks.length} songs, ${formatTime(totalSec)}`;
  
  const tracksContainer = document.getElementById('playlistTracks');
  tracksContainer.innerHTML = tracks.map((t, i) => createTrackRow(t, i, playlist.trackIds.indexOf(t.id))).join('');
  attachTrackRowListeners(tracksContainer, playlist.trackIds);
}

function renderAlbumDetail() {
  const album = albums.find(a => a.id === currentAlbumId);
  if (!album) { navigateTo('home'); return; }
  
  document.getElementById('albumCover').src = album.cover;
  document.getElementById('albumTitle').textContent = album.title;
  document.getElementById('albumArtist').textContent = album.artist;
  
  const tracks = album.trackIds.map(id => trackList.find(t => t.id === id)).filter(Boolean);
  const totalSec = tracks.reduce((sum, t) => sum + t.durationSec, 0);
  document.getElementById('albumMeta').textContent = `${album.year} • ${tracks.length} songs, ${formatTime(totalSec)}`;
  
  const tracksContainer = document.getElementById('albumTracks');
  tracksContainer.innerHTML = tracks.map((t, i) => createTrackRow(t, i, i)).join('');
  attachTrackRowListeners(tracksContainer, album.trackIds);
}

function renderArtistDetail() {
  const artist = artists[currentArtistId];
  if (!artist) { navigateTo('home'); return; }
  
  document.getElementById('artistCover').src = artist.image;
  document.getElementById('artistName').textContent = artist.name;
  document.getElementById('artistAbout').textContent = artist.bio;
  
  const artistTracks = trackList.filter(t => t.artistId === currentArtistId);
  document.getElementById('artistMeta').textContent = `${artistTracks.length} tracks • ${formatTime(artistTracks.reduce((s, t) => s + t.durationSec, 0))}`;
  
  // Top tracks (first 5)
  const topTracks = artistTracks.slice(0, 5);
  document.getElementById('artistTopTracks').innerHTML = topTracks.map((t, i) => createTrackRow(t, i, i)).join('');
  attachTrackRowListeners(document.getElementById('artistTopTracks'), topTracks.map(t => t.id));
  
  // Discography
  const artistAlbums = albums.filter(a => a.artistId === currentArtistId);
  document.getElementById('artistDiscography').innerHTML = artistAlbums.map(a => createCard(a, 'album')).join('');
  attachCardListeners(document.getElementById('artistDiscography'));
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
  document.getElementById('fullscreenCover').src = 'logo.png';
  document.getElementById('fullscreenTitle').textContent = track.title;
  document.getElementById('fullscreenArtist').textContent = track.artist;
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
      <img src="logo.png" alt="${t.title}">
      <div class="queue-info">
        <div class="queue-title">${t.title}</div>
        <div class="queue-artist">${t.artist}</div>
      </div>
      <button class="queue-remove" data-index="${i}">✕</button>
    </div>
  `).join('');
  
  // Highlight current
  const currentItem = list.querySelector(`[data-index="${currentTrackIndex}"]`);
  if (currentItem) currentItem.style.background = '#2a0a0a';
  
  // Attach listeners
  list.querySelectorAll('.queue-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('queue-remove')) {
        playTrack(parseInt(item.dataset.index));
      }
    });
    item.querySelector('.queue-remove')?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromQueue(parseInt(item.dataset.index));
    });
  });
}

// ============ CARD CREATION ============
function createCard(item, type) {
  const isLiked = type === 'track' && likedTracks.has(item.id);
  const heart = type === 'track' ? `<button class="track-like${isLiked ? ' liked' : ''}" data-id="${item.id}" title="${isLiked ? 'Unlike' : 'Like'}">♥</button>` : '';
  
  switch (type) {
    case 'playlist':
      return `
        <div class="card" data-type="playlist" data-id="${item.id}">
          <img src="${item.cover}" alt="${item.title}">
          <div class="info">
            <div class="title">${item.title}</div>
            <div class="artist">${item.description}</div>
          </div>
        </div>
      `;
    case 'album':
      return `
        <div class="card" data-type="album" data-id="${item.id}">
          <img src="${item.cover}" alt="${item.title}">
          <div class="info">
            <div class="title">${item.title}</div>
            <div class="artist">${item.artist || item.owner}</div>
          </div>
        </div>
      `;
    case 'artist':
      return `
        <div class="card" data-type="artist" data-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" style="border-radius: 50%;">
          <div class="info">
            <div class="title">${item.name}</div>
            <div class="artist">Artist</div>
          </div>
        </div>
      `;
    case 'track':
      return `
        <div class="card" data-type="track" data-id="${item.id}">
          <img src="logo.png" alt="${item.title}">
          <div class="info">
            <div class="title">${item.title}</div>
            <div class="artist">${item.artist}</div>
          </div>
          ${heart}
        </div>
      `;
    case 'category':
      return `
        <div class="card" data-type="category" data-id="${item.id}">
          <img src="${item.cover}" alt="${item.name}">
          <div class="info">
            <div class="title">${item.name}</div>
            <div class="artist">Category</div>
          </div>
        </div>
      `;
  }
}

function createTrackRow(track, displayIndex, actualIndex, showAlbum = false) {
  const isLiked = likedTracks.has(track.id);
  const isPlayingNow = queue[currentTrackIndex]?.id === track.id && isPlaying;
  return `
    <div class="track-row${isPlayingNow ? ' playing' : ''}" data-id="${track.id}" data-index="${actualIndex}">
      <div class="track-num${isPlayingNow ? ' playing' : ''}">${displayIndex + 1}</div>
      <div class="track-main">
        <img src="logo.png" alt="${track.title}">
        <div class="track-text">
          <div class="title">${track.title}</div>
          <div class="artist">${track.artist}</div>
        </div>
      </div>
      ${showAlbum ? `<div class="track-album">${track.album}</div>` : ''}
      <div class="track-duration">${track.duration}</div>
      <button class="track-like${isLiked ? ' liked' : ''}" data-id="${track.id}" title="${isLiked ? 'Unlike' : 'Like'}">♥</button>
    </div>
  `;
}

// ============ CARD LISTENERS ============
function attachCardListeners(container) {
  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('track-like')) return;
      const type = card.dataset.type;
      const id = card.dataset.id;
      handleCardClick(type, id);
    });
    // Like button on track cards
    card.querySelector('.track-like')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(e.target.dataset.id);
      toggleLike(id);
    });
  });
}

function handleCardClick(type, id) {
  switch (type) {
    case 'playlist': navigateTo('playlistDetail', { playlistId: id }); break;
    case 'album': navigateTo('albumDetail', { albumId: id }); break;
    case 'artist': navigateTo('artistDetail', { artistId: id }); break;
    case 'track': openTrackModal(trackList.find(t => t.id === parseInt(id))); break;
    case 'category': filterByCategory(id); break;
  }
}

function attachTrackRowListeners(container, trackIds, isLikedView = false) {
  container.querySelectorAll('.track-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('track-like')) return;
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
  });
}

function filterByCategory(categoryId) {
  const category = categories.find(c => c.id === categoryId);
  if (!category) return;
  // For demo, just search
  document.getElementById('searchInput').value = category.name;
  navigateTo('search');
  performSearch(category.name.toLowerCase());
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
  const playlist = [...playlists, ...userPlaylists].find(p => p.id === playlistId);
  if (!playlist) return;
  playQueue(playlist.trackIds, 0);
}

function playAlbum(albumId) {
  const album = albums.find(a => a.id === albumId);
  if (!album) return;
  playQueue(album.trackIds, 0);
}

function playArtistTopTracks(artistId) {
  const tracks = trackList.filter(t => t.artistId === artistId).map(t => t.id);
  playQueue(tracks, 0);
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
  document.getElementById('shuffleBtn').style.color = shuffle ? '#ff0000' : '#fff';
  // For simplicity, not implementing full shuffle logic
}

function toggleRepeat() {
  repeat = (repeat + 1) % 3;
  const btn = document.getElementById('repeatBtn');
  btn.textContent = repeat === 0 ? '🔁' : repeat === 1 ? '🔁' : '🔂';
  btn.style.color = repeat === 0 ? '#fff' : '#ff0000';
  if (repeat === 2) btn.textContent = '🔂';
}

// ============ NOW PLAYING BAR ============
function updateNowPlayingBar() {
  if (queue.length === 0) {
    document.getElementById('nowPlayingTitle').textContent = 'Dreamy Tone';
    document.getElementById('nowPlayingArtist').textContent = 'Prabir';
    document.getElementById('nowPlayingCover').src = 'logo.png';
    document.getElementById('progressBar').value = 0;
    return;
  }
  const track = queue[currentTrackIndex];
  document.getElementById('nowPlayingTitle').textContent = track.title;
  document.getElementById('nowPlayingArtist').textContent = track.artist;
  document.getElementById('nowPlayingCover').src = 'logo.png';
}

// ============ TRACK MODAL ============
function openTrackModal(track) {
  if (!track) return;
  document.getElementById('modalCover').src = 'logo.png';
  document.getElementById('modalTitle').textContent = track.title;
  document.getElementById('modalArtist').textContent = track.artist;
  document.getElementById('modalDuration').textContent = track.duration;
  document.getElementById('modalProgressBar').value = 0;
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
    cover: 'logo.png',
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

// ============ SAVE/FOLLOW ============
function toggleSavePlaylist(playlistId) {
  const btn = document.getElementById('playlistSave');
  const playlist = userPlaylists.find(p => p.id === playlistId);
  if (playlist) {
    // Remove from user playlists
    userPlaylists = userPlaylists.filter(p => p.id !== playlistId);
    btn.textContent = 'Save';
    btn.classList.remove('active');
  } else {
    // Add to user playlists (find from main playlists)
    const mainPlaylist = playlists.find(p => p.id === playlistId);
    if (mainPlaylist) {
      userPlaylists.push({ ...mainPlaylist });
      btn.textContent = 'Saved';
      btn.classList.add('active');
    }
  }
  if (currentView === 'library') renderLibrary('playlists');
}

function toggleSaveAlbum(albumId) {
  const btn = document.getElementById('albumSave');
  btn.classList.toggle('active');
  btn.textContent = btn.classList.contains('active') ? 'Saved' : 'Save';
}

function toggleFollowArtist(artistId) {
  const btn = document.getElementById('artistFollow');
  btn.classList.toggle('active');
  btn.textContent = btn.classList.contains('active') ? 'Following' : 'Follow';
}

// ============ HELPERS ============
function getRecentlyPlayed() {
  // For demo, return last 4 tracks from trackList
  return trackList.slice(0, 4);
}

function highlightPlayingTrack() {
  document.querySelectorAll('.track-row').forEach(row => {
    const trackId = parseInt(row.dataset.id);
    const isCurrent = queue[currentTrackIndex]?.id === trackId;
    row.classList.toggle('playing', isCurrent && isPlaying);
    row.querySelector('.track-num')?.classList.toggle('playing', isCurrent && isPlaying);
  });
}

// ============ PLAYLIST/ALBUM/ARTIST PLAY ALL ============
// Handled in event listeners