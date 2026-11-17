/**
 * Video Editor UI
 * Vanilla JS, no frameworks, works against window.EditorEngine API contract
 */

(function() {
    'use strict';

    // ==================== STATE ====================
    const state = {
        engine: null,
        engineReady: false,
        selectedClipId: null,
        clips: new Map(),
        isPlaying: false,
        currentTime: 0,
        duration: 10,
        pxPerSecond: 40,
        timelineZoom: 40,
        rafId: null,
        lastRenderTime: 0,
        history: [],
        historyIndex: -1,
        maxHistory: 50,
        isRestoring: false,
        dragState: null,
        snapEnabled: true,
        markers: [],
        photoAnimDraft: {
            files: [],
            fps: 30,
            objectUrls: [],
            playing: false,
            rafId: null,
            onionSkin: false
        },
        frameStrip: {
            visibleStart: 0,
            visibleEnd: 0,
            thumbWidth: 104,
            viewportWidth: 0
        }
    };

    // ==================== SVG STICKERS ====================
    const SVG_STICKERS = {
        'star': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21L12 17.77L5.82 21L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#a78bfa"/></svg>',
        'heart': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.84 4.61a5.5 5.5 0 0 1 0 7.78L12 18.59l-8.84-8.84a5.5 5.5 0 0 1 7.78 0L12 13.22l3.06-3.06a5.5 5.5 0 0 1 7.78 0z" fill="#EF4444"/></svg>',
        'arrow': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M12 5l7 7-7 7" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'burst': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/></svg>',
        'speech-bubble': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="#a78bfa" fill-opacity="0.9"/></svg>',
        'crown': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3 7h4l-3 3 3 7-4-3-4 3 3-7H5l3-7-3-3h4z" fill="#F59E0B"/></svg>',
        'fire': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 14.5A2.5 2.5 0 0 1 11 12c0-1.38-.5-2.01-1.17-2.5A4 4 0 0 1 15 3.5a4.01 4.01 0 0 1 4 4c0 1.5-.65 2.12-1.22 2.62A2.5 2.5 0 0 1 17.5 10c0 1.38.5 2.01 1.17 2.5A4 4 0 0 1 14 19.5a4.01 4.01 0 0 1-4-4c0-1.5.65-2.12 1.22-2.62A2.5 2.5 0 0 1 6.5 14z" fill="#EF4444" fill-opacity="0.9"/></svg>',
        'checkmark': '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="#22C55E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

    // ==================== DOM ELEMENTS ====================
    const els = {};

    function cacheElements() {
        els.projectName = document.getElementById('pe-project-name');
        els.btnUndo = document.getElementById('pe-btn-undo');
        els.btnRedo = document.getElementById('pe-btn-redo');
        els.btnSaveProject = document.getElementById('pe-btn-save-project');
        els.btnLoadProject = document.getElementById('pe-btn-load-project');
        els.loadProjectFile = document.getElementById('pe-load-project-file');
        els.btnExport = document.getElementById('pe-export-btn');
        els.exportProgress = document.getElementById('pe-export-progress');
        els.progressFill = document.querySelector('.pe-progress-fill');
        els.progressText = document.querySelector('.pe-progress-text');
        els.engineMissingBanner = document.getElementById('pe-engine-missing-banner');

        els.tabButtons = document.querySelectorAll('.pe-tab-btn');
        els.tabPanels = document.querySelectorAll('.pe-tab-panel');

        // Media tab - two-mode imports
        els.mediaUpload = document.getElementById('pe-media-upload');
        els.mediaUploadFolder = document.getElementById('pe-media-upload-folder');
        els.btnMediaFiles = document.getElementById('pe-btn-media-files');
        els.btnMediaFolder = document.getElementById('pe-btn-media-folder');
        // Video-only import
        els.mediaVideoUpload = document.getElementById('pe-media-video-upload');
        els.mediaVideoUploadFolder = document.getElementById('pe-media-video-upload-folder');
        els.btnMediaVideoFiles = document.getElementById('pe-btn-media-video-files');
        els.btnMediaVideoFolder = document.getElementById('pe-btn-media-video-folder');
        els.mediaList = document.getElementById('pe-media-list');
        els.toolbarImportAudio = document.getElementById('pe-toolbar-import-audio');
        els.toolbarImportAudioFolder = document.getElementById('pe-toolbar-import-audio-folder');
        els.toolbarImportSrt = document.getElementById('pe-toolbar-import-srt');
        els.toolbarImportSrtFolder = document.getElementById('pe-toolbar-import-srt-folder');

        // Text tab - two-mode SRT
        els.textInput = document.getElementById('pe-text-input');
        els.textFontSize = document.getElementById('pe-text-font-size');
        els.textColor = document.getElementById('pe-text-color');
        els.textAnimation = document.getElementById('pe-text-animation');
        els.btnAddText = document.getElementById('pe-btn-add-text');
        els.textSrtUpload = document.getElementById('pe-text-srt-upload');
        els.textSrtUploadFolder = document.getElementById('pe-text-srt-upload-folder');
        els.btnTextSrtFiles = document.getElementById('pe-btn-text-srt-files');
        els.btnTextSrtFolder = document.getElementById('pe-btn-text-srt-folder');
        els.btnExportSrt = document.getElementById('pe-btn-export-srt');

        els.filterButtons = document.getElementById('pe-filter-buttons');
        els.effectButtons = document.getElementById('pe-effect-buttons');

        els.transitionType = document.getElementById('pe-transition-type');
        els.transitionDuration = document.getElementById('pe-transition-duration');
        els.btnApplyTransition = document.getElementById('pe-btn-apply-transition');

        els.clipVolume = document.getElementById('pe-clip-volume');
        els.clipVolumeValue = document.getElementById('pe-clip-volume-value');
        // Audio tab - two-mode music/sfx
        els.musicUpload = document.getElementById('pe-music-upload');
        els.musicUploadFolder = document.getElementById('pe-music-upload-folder');
        els.btnMusicFiles = document.getElementById('pe-btn-music-files');
        els.btnMusicFolder = document.getElementById('pe-btn-music-folder');
        els.sfxUpload = document.getElementById('pe-sfx-upload');
        els.sfxUploadFolder = document.getElementById('pe-sfx-upload-folder');
        els.btnSfxFiles = document.getElementById('pe-btn-sfx-files');
        els.btnSfxFolder = document.getElementById('pe-btn-sfx-folder');

        els.svgStickerGrid = document.getElementById('pe-svg-sticker-grid');
        els.emojiStickerGrid = document.getElementById('pe-emoji-sticker-grid');

        // Photo Animation tab - two-mode
        els.photoAnimUpload = document.getElementById('pe-photoanim-upload');
        els.photoAnimUploadFolder = document.getElementById('pe-photoanim-upload-folder');
        els.btnPhotoAnimFiles = document.getElementById('pe-btn-photoanim-files');
        els.btnPhotoAnimFolder = document.getElementById('pe-btn-photoanim-folder');
        els.photoAnimFps = document.getElementById('pe-photoanim-fps');
        els.btnPhotoAnimPlay = document.getElementById('pe-btn-photoanim-play');
        els.photoAnimOnionSkin = document.getElementById('pe-photoanim-onionskin');
        els.frameStripSpacer = document.getElementById('pe-frame-strip-spacer');
        els.frameStripViewport = document.getElementById('pe-frame-strip-viewport');
        els.btnPhotoAnimAddTimeline = document.getElementById('pe-btn-photoanim-add-timeline');

        els.previewCanvas = document.getElementById('pe-preview-canvas');
        els.btnPlayPause = document.getElementById('pe-btn-play-pause');
        els.currentTime = document.getElementById('pe-current-time');
        els.totalDuration = document.getElementById('pe-total-duration');
        els.seekBar = document.getElementById('pe-seek-bar');

        els.aspectRatioBtns = document.querySelectorAll('.pe-aspect-btn');
        els.aspectRatioDisplay = document.getElementById('pe-aspect-ratio-display');

        els.propertiesContent = document.getElementById('pe-properties-content');

        els.timelineRuler = document.getElementById('pe-timeline-ruler');
        els.timelineZoom = document.getElementById('pe-timeline-zoom');
        els.timelineTracks = document.getElementById('pe-timeline-tracks');
        els.trackVideo = document.getElementById('pe-track-video');
        els.trackAudio = document.getElementById('pe-track-audio');
        els.trackText = document.getElementById('pe-track-text');
        els.playhead = document.getElementById('pe-playhead');
        
        // Toolbar buttons (with folder variants)
        els.toolbarImportAudioMain = document.getElementById('pe-toolbar-import-audio-main');
        els.toolbarImportAudioMainFolder = document.getElementById('pe-toolbar-import-audio-main-folder');
        els.toolbarImportSrtMain = document.getElementById('pe-toolbar-import-srt-main');
        els.toolbarImportSrtMainFolder = document.getElementById('pe-toolbar-import-srt-main-folder');
        els.btnAddMarker = document.getElementById('pe-btn-add-marker');
        els.snapToggle = document.getElementById('pe-snap-toggle');

        for (let i = 2; i <= 6; i++) {
            els['toolbarImportAudio' + i] = document.getElementById('pe-toolbar-import-audio-' + i);
            els['toolbarImportAudio' + i + 'Folder'] = document.getElementById('pe-toolbar-import-audio-' + i + '-folder');
            els['toolbarImportSrt' + i] = document.getElementById('pe-toolbar-import-srt-' + i);
            els['toolbarImportSrt' + i + 'Folder'] = document.getElementById('pe-toolbar-import-srt-' + i + '-folder');
        }
    }

    // ==================== UTILITIES ====================
    function safeCall(fn, ...args) {
        try {
            if (typeof fn === 'function') {
                return fn(...args);
            }
        } catch (e) {
            console.warn('[UI] Engine call failed:', e.message);
            showStatus('Engine error: ' + e.message);
        }
        return undefined;
    }

    function formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) seconds = 0;
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const tenths = Math.floor((seconds % 1) * 10);
        return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0') + '.' + tenths;
    }

    function formatTimeForFilename() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return year + '-' + month + '-' + day + '_' + hours + minutes;
    }

    function showStatus(message, isError) {
        console.log('[UI Status]', message);
    }

    function getTrackForType(type) {
        if (type === 'video' || type === 'image' || type === 'photoanim') return 'video';
        if (type === 'audio') return 'audio';
        if (type === 'text') return 'text';
        return 'video';
    }

    function getClipColor(type) {
        if (type === 'video' || type === 'image' || type === 'photoanim') return 'var(--track-video)';
        if (type === 'audio') return 'var(--track-audio)';
        if (type === 'text') return 'var(--track-text)';
        return 'var(--track-video)';
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
    }

    // ==================== SHARED IMPORT HANDLERS ====================
    async function handleAudioImport(file) {
        if (!state.engineReady || !state.engine) {
            const clip = {
                id: 'mock-audio-' + Date.now(),
                type: 'audio', name: file.name, duration: 5,
                timelineStart: state.currentTime, track: 'audio',
                trimIn: 0, trimOut: 5, volume: 1,
                filter: 'none', effect: 'none', mask: null,
                keyframes: {}, transition: {type: 'none', duration: 0},
                text: '', fontSize: 48, color: '#ffffff',
                position: {x: 0, y: 0}, anim: 'none', speed: 1,
                fade: null, speedRamp: null, chromaKey: null, flip: 'none'
            };
            state.clips.set(clip.id, clip);
            renderTimeline();
            showStatus('Added audio: ' + file.name + ' (demo)');
            return;
        }

        try {
            const clip = typeof state.engine.importAudio === 'function'
                ? await safeCall(state.engine.importAudio, file)
                : await safeCall(state.engine.addMedia, file);
            if (clip) {
                safeCall(state.engine.addClipToTimeline, clip.id, 'audio', state.currentTime);
                showStatus('Added audio: ' + file.name);
            }
        } catch (e) {
            showStatus('Failed to add audio: ' + e.message, true);
        }
    }

    async function handleSrtImport(file) {
        const text = await file.text();
        if (!state.engineReady || !state.engine) {
            const cues = parseSRT(text);
            for (const cue of cues) {
                const clip = {
                    id: 'mock-srt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                    type: 'text', name: cue.text.substring(0, 20), duration: cue.end - cue.start,
                    timelineStart: state.currentTime + cue.start, track: 'text',
                    trimIn: 0, trimOut: cue.end - cue.start, volume: 1,
                    filter: 'none', effect: 'none', mask: null,
                    keyframes: {}, transition: {type: 'none', duration: 0},
                    text: cue.text, fontSize: 48, color: '#ffffff',
                    position: {x: 0, y: 0}, anim: 'none', speed: 1
                };
                state.clips.set(clip.id, clip);
            }
            renderTimeline();
            showStatus('Imported ' + cues.length + ' captions (demo)');
            return;
        }

        if (typeof state.engine.importCaptions === 'function') {
            safeCall(state.engine.importCaptions, text, {startTime: state.currentTime});
            showStatus('Imported SRT captions');
        } else {
            showStatus('SRT import not available in this engine build', true);
        }
    }

    function parseSRT(srtText) {
        const cues = [];
        const blocks = srtText.trim().split(/\n\s*\n/);
        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length < 3) continue;
            const timeLine = lines[1];
            const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
            if (!timeMatch) continue;
            const start = parseTimecode(timeMatch[1]);
            const end = parseTimecode(timeMatch[2]);
            const text = lines.slice(2).join('\n');
            cues.push({start, end, text});
        }
        return cues;
    }

    function parseTimecode(tc) {
        const [time, ms] = tc.replace(',', '.').split('.');
        const [h, m, s] = time.split(':').map(Number);
        return h * 3600 + m * 60 + s + Number('0.' + ms);
    }

    function formatTimecode(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0') + ',' + ms.toString().padStart(3, '0');
    }

    // ==================== ENGINE INITIALIZATION ====================
    function initEngine() {
        if (window.EditorEngine && typeof window.EditorEngine.addMedia === 'function') {
            state.engine = window.EditorEngine;
            state.engineReady = true;
            els.engineMissingBanner.style.display = 'none';
            setupEngineListeners();
            refreshFromEngine();
            showStatus('Engine connected');
        } else {
            state.engineReady = false;
            els.engineMissingBanner.style.display = 'block';
            setupMockData();
            showStatus('Engine not loaded — demo mode');
        }
    }

    function setupEngineListeners() {
        if (!state.engine) return;
        const eng = state.engine;
        safeCall(eng.on, 'clip-added', onClipAdded);
        safeCall(eng.on, 'clip-removed', onClipRemoved);
        safeCall(eng.on, 'clip-changed', onClipChanged);
        safeCall(eng.on, 'state-changed', onStateChanged);
        safeCall(eng.on, 'timeupdate', onTimeUpdate);
    }

    function onClipAdded(clip) {
        if (clip) {
            state.clips.set(clip.id, clip);
            renderTimeline();
            updatePropertiesPanel();
        }
    }

    function onClipRemoved(clipId) {
        state.clips.delete(clipId);
        if (state.selectedClipId === clipId) {
            state.selectedClipId = null;
        }
        renderTimeline();
        updatePropertiesPanel();
    }

    function onClipChanged(clip) {
        if (clip) {
            state.clips.set(clip.id, clip);
            renderTimeline();
            updatePropertiesPanel();
        }
    }

    function onStateChanged(newState) {
        if (newState && typeof newState === 'object') {
            if (newState.duration !== undefined) {
                state.duration = newState.duration;
                updateDurationDisplay();
                renderTimelineRuler();
            }
            if (newState.aspectRatio !== undefined) {
                updateAspectRatioDisplay(newState.aspectRatio);
            }
            if (newState.markers !== undefined) {
                state.markers = newState.markers;
                renderTimelineRuler();
            }
        }
    }

    function onTimeUpdate(time) {
        state.currentTime = time;
        updateTimeDisplay();
        updatePlayheadPosition();
        updateSeekBar();
        updateEffectiveVolumeDisplay();
    }

    function refreshFromEngine() {
        if (!state.engine) return;
        state.duration = safeCall(state.engine.getDuration) || 10;
        state.currentTime = safeCall(state.engine.getCurrentTime) || 0;
        state.isPlaying = safeCall(state.engine.isPlaying) || false;

        updateDurationDisplay();
        updateTimeDisplay();
        updatePlayPauseButton();
        renderTimelineRuler();
        renderTimeline();

        const ar = safeCall(state.engine.getAspectRatio);
        if (ar) updateAspectRatioDisplay(ar);

        if (typeof state.engine.getMarkers === 'function') {
            state.markers = safeCall(state.engine.getMarkers) || [];
            renderTimelineRuler();
        }
    }

    // ==================== MOCK DATA ====================
    function setupMockData() {
        const mockClips = [
            { id: 'mock-1', type: 'video', name: 'intro.mp4', duration: 5, timelineStart: 0, track: 'video', trimIn: 0, trimOut: 5, volume: 1, filter: 'none', effect: 'none', mask: null, keyframes: {}, transition: {type: 'none', duration: 0}, text: '', fontSize: 48, color: '#ffffff', position: {x: 0, y: 0}, anim: 'none', speed: 1, fade: null, speedRamp: null, chromaKey: null, flip: 'none' },
            { id: 'mock-2', type: 'audio', name: 'music.mp3', duration: 10, timelineStart: 0, track: 'audio', trimIn: 0, trimOut: 10, volume: 0.8, filter: 'none', effect: 'none', mask: null, keyframes: {}, transition: {type: 'none', duration: 0}, text: '', fontSize: 48, color: '#ffffff', position: {x: 0, y: 0}, anim: 'none', speed: 1, fade: null, speedRamp: null, chromaKey: null, flip: 'none' },
            { id: 'mock-3', type: 'text', name: 'Title Text', duration: 3, timelineStart: 2, track: 'text', trimIn: 0, trimOut: 3, volume: 1, filter: 'none', effect: 'fade-in', mask: null, keyframes: {}, transition: {type: 'fade', duration: 0.5}, text: 'Hello World', fontSize: 64, color: '#ffffff', position: {x: 0, y: 0}, anim: 'fade', speed: 1, fade: null, speedRamp: null, chromaKey: null, flip: 'none' },
        ];

        mockClips.forEach(clip => state.clips.set(clip.id, clip));
        state.duration = 10;
        renderTimeline();
        renderTimelineRuler();
    }

    // ==================== HISTORY (Undo/Redo) ====================
    function saveHistorySnapshot() {
        if (state.isRestoring) return;
        if (!state.engineReady || !state.engine) {
            const snapshot = {
                clips: Array.from(state.clips.entries()),
                selectedClipId: state.selectedClipId,
                currentTime: state.currentTime,
                duration: state.duration,
                markers: [...state.markers]
            };
            state.history = state.history.slice(0, state.historyIndex + 1);
            state.history.push(snapshot);
            if (state.history.length > state.maxHistory) state.history.shift();
            else state.historyIndex++;
            updateUndoRedoButtons();
        } else {
            const projectJson = safeCall(state.engine.saveProject);
            if (projectJson) {
                state.history = state.history.slice(0, state.historyIndex + 1);
                state.history.push(projectJson);
                if (state.history.length > state.maxHistory) state.history.shift();
                else state.historyIndex++;
                updateUndoRedoButtons();
            }
        }
    }

    function undo() {
        if (state.historyIndex <= 0) return;
        state.historyIndex--;
        restoreHistorySnapshot(state.history[state.historyIndex]);
        updateUndoRedoButtons();
    }

    function redo() {
        if (state.historyIndex >= state.history.length - 1) return;
        state.historyIndex++;
        restoreHistorySnapshot(state.history[state.historyIndex]);
        updateUndoRedoButtons();
    }

    function restoreHistorySnapshot(snapshot) {
        state.isRestoring = true;
        if (state.engineReady && state.engine && typeof snapshot === 'string') {
            safeCall(state.engine.loadProject, snapshot);
        } else {
            state.clips = new Map(snapshot.clips);
            state.selectedClipId = snapshot.selectedClipId;
            state.currentTime = snapshot.currentTime;
            state.duration = snapshot.duration;
            state.markers = snapshot.markers || [];
            renderTimeline();
            renderTimelineRuler();
            updatePropertiesPanel();
            updateTimeDisplay();
            updateSeekBar();
            updatePlayheadPosition();
        }
        state.isRestoring = false;
    }

    function updateUndoRedoButtons() {
        els.btnUndo.disabled = state.historyIndex <= 0;
        els.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
    }

    // ==================== TAB SWITCHING ====================
    function initTabs() {
        els.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                els.tabButtons.forEach(b => {
                    b.classList.remove('pe-is-active');
                    b.setAttribute('aria-selected', 'false');
                });
                els.tabPanels.forEach(p => p.classList.remove('pe-is-active'));
                btn.classList.add('pe-is-active');
                btn.setAttribute('aria-selected', 'true');
                document.getElementById('pe-tab-' + tab).classList.add('pe-is-active');
            });
        });
    }

    // ==================== MEDIA TAB ====================
    function initMediaTab() {
        // Media import - files mode
        els.btnMediaFiles.addEventListener('click', () => els.mediaUpload.click());
        els.mediaUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await addMediaFile(file);
            }
            els.mediaUpload.value = '';
        });

        // Media import - folder mode
        els.btnMediaFolder.addEventListener('click', () => els.mediaUploadFolder.click());
        els.mediaUploadFolder.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await addMediaFile(file);
            }
            els.mediaUploadFolder.value = '';
        });

        // Video-only import - files mode
        els.btnMediaVideoFiles.addEventListener('click', () => els.mediaVideoUpload.click());
        els.mediaVideoUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                if (file.type.startsWith('video/')) {
                    await addMediaFile(file);
                }
            }
            els.mediaVideoUpload.value = '';
        });

        // Video-only import - folder mode
        els.btnMediaVideoFolder.addEventListener('click', () => els.mediaVideoUploadFolder.click());
        els.mediaVideoUploadFolder.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                if (file.type.startsWith('video/')) {
                    await addMediaFile(file);
                }
            }
            els.mediaVideoUploadFolder.value = '';
        });

        // Toolbar Import Audio - files mode (existing button)
        els.toolbarImportAudio.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*';
            input.multiple = true;
            input.style.display = 'none';
            document.body.appendChild(input);
            input.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                for (const file of files) {
                    await handleAudioImport(file);
                }
                input.value = '';
                document.body.removeChild(input);
            });
            input.click();
        });

        // Toolbar Import Audio - folder mode
        els.toolbarImportAudioFolder.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*';
            input.multiple = true;
            input.webkitdirectory = true;
            input.style.display = 'none';
            document.body.appendChild(input);
            input.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                for (const file of files) {
                    await handleAudioImport(file);
                }
                input.value = '';
                document.body.removeChild(input);
            });
            input.click();
        });

        // Toolbar Import SRT - files mode (existing button)
        els.toolbarImportSrt.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.srt';
            input.multiple = true;
            input.style.display = 'none';
            document.body.appendChild(input);
            input.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                for (const file of files) {
                    await handleSrtImport(file);
                }
                input.value = '';
                document.body.removeChild(input);
            });
            input.click();
        });

        // Toolbar Import SRT - folder mode
        els.toolbarImportSrtFolder.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.srt';
            input.multiple = true;
            input.webkitdirectory = true;
            input.style.display = 'none';
            document.body.appendChild(input);
            input.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                for (const file of files) {
                    await handleSrtImport(file);
                }
                input.value = '';
                document.body.removeChild(input);
            });
            input.click();
        });
    }

    async function addMediaFile(file) {
        if (!state.engineReady || !state.engine) {
            const type = file.type.startsWith('video/') ? 'video' :
                         file.type.startsWith('audio/') ? 'audio' : 'image';
            const duration = type === 'video' ? 5 : type === 'audio' ? 3 : 4;
            const clip = {
                id: 'mock-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                type, name: file.name, duration,
                timelineStart: 0, track: getTrackForType(type),
                trimIn: 0, trimOut: duration, volume: 1,
                filter: 'none', effect: 'none', mask: null,
                keyframes: {}, transition: {type: 'none', duration: 0},
                text: '', fontSize: 48, color: '#ffffff',
                position: {x: 0, y: 0}, anim: 'none', speed: 1,
                fade: null, speedRamp: null, chromaKey: null, flip: 'none'
            };
            state.clips.set(clip.id, clip);
            renderMediaList();
            showStatus('Added ' + file.name + ' (demo mode)');
            return;
        }

        try {
            const clip = await safeCall(state.engine.addMedia, file);
            if (clip) {
                const track = getTrackForType(clip.type);
                safeCall(state.engine.addClipToTimeline, clip.id, track, state.currentTime);
                renderMediaList();
                showStatus('Added ' + file.name);
            }
        } catch (e) {
            showStatus('Failed to add media: ' + e.message, true);
        }
    }

    function renderMediaList() {
        els.mediaList.innerHTML = '';
        state.clips.forEach(clip => {
            const div = document.createElement('div');
            div.className = 'pe-media-item' + (clip.id === state.selectedClipId ? ' pe-is-selected' : '');
            div.dataset.clipId = clip.id;

            const iconClass = clip.type === 'video' ? 'pe-is-video' : clip.type === 'audio' ? 'pe-is-audio' : 'pe-is-image';
            const iconChar = clip.type === 'video' ? '🎨' : clip.type === 'audio' ? '🎵' : '🟸';

            div.innerHTML = '<div class="pe-media-icon ' + iconClass + '">' + iconChar + '</div>' +
                '<div class="pe-media-info">' +
                '<div class="pe-media-name">' + escapeHtml(clip.name) + '</div>' +
                '<div class="pe-media-duration">' + formatTime(clip.duration) + '</div>' +
                '</div>';

            div.addEventListener('click', () => selectClip(clip.id));
            div.addEventListener('dblclick', () => addClipToTimeline(clip.id));
            els.mediaList.appendChild(div);
        });
    }

    function addClipToTimeline(clipId) {
        const clip = state.clips.get(clipId);
        if (!clip) return;

        if (state.engineReady && state.engine) {
            const track = getTrackForType(clip.type);
            safeCall(state.engine.addClipToTimeline, clip.id, track, state.currentTime);
            saveHistorySnapshot();
        } else {
            clip.timelineStart = state.currentTime;
            clip.track = getTrackForType(clip.type);
            renderTimeline();
            showStatus('Added to timeline at ' + formatTime(state.currentTime) + ' (demo)');
        }
    }

    // ==================== TEXT TAB ====================
    function initTextTab() {
        els.btnAddText.addEventListener('click', () => {
            const text = els.textInput.value.trim();
            if (!text) {
                showStatus('Enter some text first');
                return;
            }

            const options = {
                fontSize: parseInt(els.textFontSize.value) || 48,
                color: els.textColor.value,
                anim: els.textAnimation.value
            };

            addTextClip(text, options);
            els.textInput.value = '';
        });

        // SRT import - files mode
        els.btnTextSrtFiles.addEventListener('click', () => els.textSrtUpload.click());
        els.textSrtUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await handleSrtImport(file);
            }
            els.textSrtUpload.value = '';
        });

        // SRT import - folder mode
        els.btnTextSrtFolder.addEventListener('click', () => els.textSrtUploadFolder.click());
        els.textSrtUploadFolder.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await handleSrtImport(file);
            }
            els.textSrtUploadFolder.value = '';
        });

        els.btnExportSrt?.addEventListener('click', exportSrt);
    }

    function addTextClip(text, options) {
        if (state.engineReady && state.engine) {
            const clip = safeCall(state.engine.addTextClip, text, options);
            if (clip) {
                safeCall(state.engine.addClipToTimeline, clip.id, 'text', state.currentTime);
                saveHistorySnapshot();
                showStatus('Added text clip');
            }
        } else {
            const clip = {
                id: 'mock-text-' + Date.now(),
                type: 'text', name: text.substring(0, 20), duration: 3,
                timelineStart: state.currentTime, track: 'text',
                trimIn: 0, trimOut: 3, volume: 1,
                filter: 'none', effect: options.anim || 'none', mask: null,
                keyframes: {}, transition: {type: 'none', duration: 0},
                text: text, fontSize: options.fontSize, color: options.color,
                position: {x: 0, y: 0}, anim: options.anim, speed: 1,
                fade: null, speedRamp: null, chromaKey: null, flip: 'none'
            };
            state.clips.set(clip.id, clip);
            selectClip(clip.id);
            renderTimeline();
            showStatus('Added text clip (demo)');
        }
    }

    function exportSrt() {
        if (state.engineReady && state.engine && typeof state.engine.exportCaptions === 'function') {
            const srt = safeCall(state.engine.exportCaptions);
            if (srt) {
                downloadText(srt, 'captions.srt');
                showStatus('SRT exported');
            }
        } else {
            const textClips = [];
            state.clips.forEach(clip => {
                if (clip.type === 'text' && clip.text) {
                    textClips.push({
                        start: clip.timelineStart + clip.trimIn,
                        end: clip.timelineStart + clip.trimOut,
                        text: clip.text
                    });
                }
            });
            textClips.sort((a, b) => a.start - b.start);
            const srt = textClips.map((cue, i) =>
                (i + 1) + '\n' + formatTimecode(cue.start) + ' --> ' + formatTimecode(cue.end) + '\n' + cue.text + '\n'
            ).join('\n');
            downloadText(srt, 'captions.srt');
            showStatus('SRT exported (demo)');
        }
    }

    function downloadText(text, filename) {
        const blob = new Blob([text], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ==================== EFFECTS TAB ====================
    const FILTER_NAMES = ['none', 'grayscale', 'sepia', 'contrast', 'saturate', 'vintage', 'bw', 'brightness', 'warm', 'cool', 'vivid', 'faded', 'noir'];
    const EFFECT_NAMES = ['none', 'zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'fade-in', 'fade-out'];
    const KEN_BURNS_PRESETS = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'kenburns'];

    function initEffectsTab() {
        FILTER_NAMES.forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'pe-btn pe-btn-secondary';
            btn.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            btn.dataset.filter = name;
            btn.addEventListener('click', () => applyFilter(name));
            els.filterButtons.appendChild(btn);
        });

        EFFECT_NAMES.forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'pe-btn pe-btn-secondary';
            btn.textContent = name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' ');
            btn.dataset.effect = name;
            btn.addEventListener('click', () => applyEffect(name));
            els.effectButtons.appendChild(btn);
        });

        const kbSection = document.createElement('div');
        kbSection.className = 'pe-section';
        kbSection.innerHTML = '<h4>Ken Burns Presets</h4><div class="pe-button-grid" id="pe-kenburns-buttons"></div>';
        els.effectButtons.parentNode.insertBefore(kbSection, els.effectButtons.nextSibling);

        const kbGrid = document.getElementById('pe-kenburns-buttons');
        KEN_BURNS_PRESETS.forEach(preset => {
            const btn = document.createElement('button');
            btn.className = 'pe-btn pe-btn-secondary';
            btn.textContent = preset.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
            btn.dataset.preset = preset;
            btn.addEventListener('click', () => applyKenBurnsPreset(preset));
            kbGrid.appendChild(btn);
        });
    }

    function applyFilter(name) {
        if (!state.selectedClipId) {
            showStatus('Select a clip first');
            return;
        }
        if (state.engineReady && state.engine) {
            safeCall(state.engine.setFilter, state.selectedClipId, name);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(state.selectedClipId);
            if (clip) { clip.filter = name; updatePropertiesPanel(); }
        }
        showStatus('Filter: ' + name);
    }

    function applyEffect(name) {
        if (!state.selectedClipId) {
            showStatus('Select a clip first');
            return;
        }
        if (state.engineReady && state.engine) {
            safeCall(state.engine.setEffect, state.selectedClipId, name);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(state.selectedClipId);
            if (clip) { clip.effect = name; updatePropertiesPanel(); }
        }
        showStatus('Effect: ' + name);
    }

    function applyKenBurnsPreset(preset) {
        if (!state.selectedClipId) {
            showStatus('Select a clip first');
            return;
        }
        if (state.engineReady && state.engine && typeof state.engine.applyKenBurns === 'function') {
            safeCall(state.engine.applyKenBurns, state.selectedClipId, preset);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(state.selectedClipId);
            if (clip) {
                const dur = getEffectiveDuration(clip);
                if (!clip.keyframes) clip.keyframes = {};
                clip.keyframes.scale = [
                    {time: 0, value: 1},
                    {time: dur, value: preset.includes('zoom-in') ? 1.3 : preset.includes('zoom-out') ? 0.8 : 1}
                ];
                if (preset.includes('pan-left')) {
                    clip.keyframes.x = [
                        {time: 0, value: 0},
                        {time: dur, value: -0.1}
                    ];
                } else if (preset.includes('pan-right')) {
                    clip.keyframes.x = [
                        {time: 0, value: 0},
                        {time: dur, value: 0.1}
                    ];
                }
                updatePropertiesPanel();
            }
        }
        showStatus('Ken Burns: ' + preset);
    }

    // ==================== TRANSITIONS TAB ====================
    function initTransitionsTab() {
        els.btnApplyTransition.addEventListener('click', () => {
            if (!state.selectedClipId) {
                showStatus('Select a clip first');
                return;
            }
            const type = els.transitionType.value;
            const duration = parseFloat(els.transitionDuration.value) || 0;
            applyTransition(type, duration);
        });
    }

    function applyTransition(type, duration) {
        if (state.engineReady && state.engine) {
            safeCall(state.engine.setTransition, state.selectedClipId, {type, duration});
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(state.selectedClipId);
            if (clip) { clip.transition = {type, duration}; updatePropertiesPanel(); }
        }
        showStatus('Transition: ' + type + ' ' + duration + 's');
    }

    // ==================== AUDIO TAB ====================
    function initAudioTab() {
        els.clipVolume.addEventListener('input', (e) => {
            const vol = parseInt(e.target.value);
            els.clipVolumeValue.textContent = vol + '%';
            if (state.selectedClipId) {
                setClipVolume(vol / 100);
            }
        });

        // Music import - files mode
        els.btnMusicFiles.addEventListener('click', () => els.musicUpload.click());
        els.musicUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await handleAudioImport(file);
            }
            els.musicUpload.value = '';
        });

        // Music import - folder mode
        els.btnMusicFolder.addEventListener('click', () => els.musicUploadFolder.click());
        els.musicUploadFolder.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await handleAudioImport(file);
            }
            els.musicUploadFolder.value = '';
        });

        // SFX import - files mode
        els.btnSfxFiles.addEventListener('click', () => els.sfxUpload.click());
        els.sfxUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await handleAudioImport(file);
            }
            els.sfxUpload.value = '';
        });

        // SFX import - folder mode
        els.btnSfxFolder.addEventListener('click', () => els.sfxUploadFolder.click());
        els.sfxUploadFolder.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await handleAudioImport(file);
            }
            els.sfxUploadFolder.value = '';
        });

        // Toolbar Import Audio - files mode (existing button)
        const audioBtn = els['toolbarImportAudio' + 4];
        const audioBtnFolder = els['toolbarImportAudio' + 4 + 'Folder'];
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.multiple = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) {
                        await handleAudioImport(file);
                    }
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (audioBtnFolder) {
            audioBtnFolder.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.multiple = true;
                input.webkitdirectory = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) {
                        await handleAudioImport(file);
                    }
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }

        // Toolbar Import SRT - files mode (existing button)
        const srtBtn = els['toolbarImportSrt' + 4];
        const srtBtnFolder = els['toolbarImportSrt' + 4 + 'Folder'];
        if (srtBtn) {
            srtBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.srt';
                input.multiple = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) {
                        await handleSrtImport(file);
                    }
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (srtBtnFolder) {
            srtBtnFolder.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.srt';
                input.multiple = true;
                input.webkitdirectory = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) {
                        await handleSrtImport(file);
                    }
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
    }

    function setClipVolume(vol) {
        if (state.engineReady && state.engine) {
            safeCall(state.engine.setVolume, state.selectedClipId, vol);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(state.selectedClipId);
            if (clip) { clip.volume = vol; updatePropertiesPanel(); }
        }
    }

    // ==================== STICKERS TAB ====================
    const EMOJI_STICKERS = ['⭐', '❤️', '🔥', '👍', '🎉', '😂', '✨', '💡', '🎨', '🎵', '🚀', '👑'];

    function initStickersTab() {
        Object.entries(SVG_STICKERS).forEach(([name, svg]) => {
            const div = document.createElement('div');
            div.className = 'pe-svg-sticker-item';
            div.innerHTML = svg;
            div.title = name;
            div.addEventListener('click', () => addSvgSticker(name, svg));
            els.svgStickerGrid.appendChild(div);
        });

        EMOJI_STICKERS.forEach(emoji => {
            const div = document.createElement('div');
            div.className = 'pe-sticker-item';
            div.textContent = emoji;
            div.addEventListener('click', () => addSticker(emoji));
            els.emojiStickerGrid.appendChild(div);
        });
    }

    function addSticker(emoji) {
        addTextClip(emoji, {fontSize: 120, color: '#ffffff', anim: 'pop'});
    }

    async function addSvgSticker(name, svgString) {
        if (!state.engineReady || !state.engine) {
            const clip = {
                id: 'mock-sticker-' + name + '-' + Date.now(),
                type: 'image', name: 'sticker-' + name + '.svg', duration: 4,
                timelineStart: state.currentTime, track: 'video',
                trimIn: 0, trimOut: 4, volume: 1,
                filter: 'none', effect: 'pop', mask: null,
                keyframes: {}, transition: {type: 'none', duration: 0},
                text: '', fontSize: 48, color: '#ffffff',
                position: {x: 0, y: 0}, anim: 'pop', speed: 1,
                fade: null, speedRamp: null, chromaKey: null, flip: 'none'
            };
            state.clips.set(clip.id, clip);
            selectClip(clip.id);
            renderTimeline();
            showStatus('Added SVG sticker: ' + name + ' (demo)');
            return;
        }

        try {
            const blob = new Blob([svgString], {type: 'image/svg+xml'});
            const file = new File([blob], 'sticker-' + name + '.svg', {type: 'image/svg+xml'});
            const clip = await safeCall(state.engine.addMedia, file);
            if (clip) {
                safeCall(state.engine.addClipToTimeline, clip.id, 'video', state.currentTime);
                saveHistorySnapshot();
                showStatus('Added SVG sticker: ' + name);
            }
        } catch (e) {
            showStatus('Failed to add sticker: ' + e.message, true);
        }
    }

    // ==================== PHOTO ANIMATION TAB ====================
    function initPhotoAnimTab() {
        // Photo import - files mode
        els.btnPhotoAnimFiles.addEventListener('click', () => els.photoAnimUpload.click());
        els.photoAnimUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            await loadPhotoAnimFiles(files);
            els.photoAnimUpload.value = '';
        });

        // Photo import - folder mode
        els.btnPhotoAnimFolder.addEventListener('click', () => els.photoAnimUploadFolder.click());
        els.photoAnimUploadFolder.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            await loadPhotoAnimFiles(files);
            els.photoAnimUploadFolder.value = '';
        });

        els.photoAnimFps.addEventListener('change', (e) => {
            state.photoAnimDraft.fps = parseInt(e.target.value) || 30;
            renderFrameStrip();
        });

        els.btnPhotoAnimPlay.addEventListener('click', togglePhotoAnimPlay);

        els.photoAnimOnionSkin.addEventListener('change', (e) => {
            state.photoAnimDraft.onionSkin = e.target.checked;
            if (state.photoAnimDraft.playing) {
                renderPhotoAnimPreview();
            }
        });

        els.btnPhotoAnimAddTimeline.addEventListener('click', addPhotoAnimToTimeline);

        // Toolbar Import Audio - files mode (existing button)
        const audioBtn = els['toolbarImportAudio' + 6];
        const audioBtnFolder = els['toolbarImportAudio' + 6 + 'Folder'];
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.multiple = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) {
                        await handleAudioImport(file);
                    }
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (audioBtnFolder) {
            audioBtnFolder.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.multiple = true;
                input.webkitdirectory = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) {
                        await handleAudioImport(file);
                    }
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }

        // Toolbar Import SRT - files mode (existing button)
        const srtBtn = els['toolbarImportSrt' + 6];
        const srtBtnFolder = els['toolbarImportSrt' + 6 + 'Folder'];
        if (srtBtn) {
            srtBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.srt';
                input.multiple = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) {
                        await handleSrtImport(file);
                    }
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (srtBtnFolder) {
            srtBtnFolder.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.srt';
                input.multiple = true;
                input.webkitdirectory = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) {
                        await handleSrtImport(file);
                    }
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }

        els.frameStripViewport.addEventListener('scroll', onFrameStripScroll);

        renderFrameStrip();
    }

    async function loadPhotoAnimFiles(files) {
        if (!files.length) return;

        const chunkSize = 50;
        const allFiles = [...state.photoAnimDraft.files, ...files];
        state.photoAnimDraft.files = [];
        state.photoAnimDraft.objectUrls = [];

        for (let i = 0; i < allFiles.length; i += chunkSize) {
            const chunk = allFiles.slice(i, i + chunkSize);
            for (const file of chunk) {
                if (file.type.startsWith('image/')) {
                    const objectUrl = URL.createObjectURL(file);
                    state.photoAnimDraft.files.push(file);
                    state.photoAnimDraft.objectUrls.push(objectUrl);
                }
            }
            await new Promise(r => setTimeout(r, 0));
            renderFrameStrip();
            showStatus('Loaded ' + state.photoAnimDraft.files.length + ' photos...');
        }

        showStatus('Loaded ' + state.photoAnimDraft.files.length + ' photos for animation');
    }

    function renderFrameStrip() {
        const viewport = els.frameStripViewport;
        const spacer = els.frameStripSpacer;
        const files = state.photoAnimDraft.files;
        const thumbWidth = state.frameStrip.thumbWidth;
        const viewportWidth = viewport.clientWidth;

        if (!viewportWidth) {
            requestAnimationFrame(renderFrameStrip);
            return;
        }

        state.frameStrip.viewportWidth = viewportWidth;
        const visibleCount = Math.ceil(viewportWidth / thumbWidth) + 2;
        const totalWidth = files.length * thumbWidth;

        spacer.style.width = totalWidth + 'px';

        const scrollLeft = viewport.scrollLeft;
        const startIndex = Math.max(0, Math.floor(scrollLeft / thumbWidth) - 1);
        const endIndex = Math.min(files.length, startIndex + visibleCount + 2);

        state.frameStrip.visibleStart = startIndex;
        state.frameStrip.visibleEnd = endIndex;

        let html = '<div class="pe-frame-strip" style="width:' + totalWidth + 'px;">';
        for (let i = startIndex; i < endIndex; i++) {
            const objectUrl = state.photoAnimDraft.objectUrls[i];
            html += '<div class="pe-frame-item' + (i === 0 ? ' pe-is-selected' : '') + '" data-index="' + i + '" draggable="true">' +
                (objectUrl ? '<img class="pe-frame-thumb" src="' + objectUrl + '" alt="Frame ' + (i+1) + '">' : '<div class="pe-frame-placeholder">🟸</div>') +
                '<span class="pe-frame-number">' + (i + 1) + '</span>' +
                '<div class="pe-frame-actions">' +
                '<button class="pe-frame-btn pe-is-up" title="Move Up" data-action="up" data-index="' + i + '">↑</button>' +
                '<button class="pe-frame-btn" title="Move Down" data-action="down" data-index="' + i + '">↓</button>' +
                '<button class="pe-frame-btn" title="Remove" data-action="remove" data-index="' + i + '">×</button>' +
                '</div></div>';
        }
        html += '</div>';
        viewport.innerHTML = html;

        bindFrameStripEvents();
    }

    function onFrameStripScroll() {
        renderFrameStrip();
    }

    function bindFrameStripEvents() {
        const items = els.frameStripViewport.querySelectorAll('.pe-frame-item');
        items.forEach(item => {
            const index = parseInt(item.dataset.index);

            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('pe-frame-btn')) return;
                selectFrame(index);
            });

            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index.toString());
                item.classList.add('pe-is-dragging');
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('pe-is-dragging');
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = index;
                if (fromIndex !== toIndex) {
                    reorderFrames(fromIndex, toIndex);
                }
            });

            item.querySelectorAll('.pe-frame-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    const idx = parseInt(btn.dataset.index);
                    if (action === 'remove') removeFrame(idx);
                    else if (action === 'up') moveFrameUp(idx);
                    else if (action === 'down') moveFrameDown(idx);
                });
            });
        });
    }

    function selectFrame(index) {
        els.frameStripViewport.querySelectorAll('.pe-frame-item').forEach(item => {
            item.classList.toggle('pe-is-selected', parseInt(item.dataset.index) === index);
        });
    }

    function reorderFrames(fromIndex, toIndex) {
        const files = state.photoAnimDraft.files;
        const urls = state.photoAnimDraft.objectUrls;
        const [file] = files.splice(fromIndex, 1);
        const [url] = urls.splice(fromIndex, 1);
        files.splice(toIndex, 0, file);
        urls.splice(toIndex, 0, url);
        renderFrameStrip();
        selectFrame(toIndex);
    }

    function removeFrame(index) {
        const files = state.photoAnimDraft.files;
        const urls = state.photoAnimDraft.objectUrls;
        URL.revokeObjectURL(urls[index]);
        files.splice(index, 1);
        urls.splice(index, 1);
        renderFrameStrip();
    }

    function moveFrameUp(index) {
        if (index > 0) reorderFrames(index, index - 1);
    }

    function moveFrameDown(index) {
        if (index < state.photoAnimDraft.files.length - 1) reorderFrames(index, index + 1);
    }

    function togglePhotoAnimPlay() {
        if (state.photoAnimDraft.playing) {
            stopPhotoAnimPlay();
        } else {
            startPhotoAnimPlay();
        }
    }

    function startPhotoAnimPlay() {
        if (!state.photoAnimDraft.files.length) {
            showStatus('No frames to preview');
            return;
        }
        state.photoAnimDraft.playing = true;
        els.btnPhotoAnimPlay.textContent = 'Stop';
        const fps = state.photoAnimDraft.fps;
        const frameDuration = 1000 / fps;
        let currentFrame = 0;
        const files = state.photoAnimDraft.files;
        const urls = state.photoAnimDraft.objectUrls;

        function animate() {
            if (!state.photoAnimDraft.playing) return;
            if (currentFrame >= files.length) currentFrame = 0;

            const objectUrl = urls[currentFrame];
            if (objectUrl) {
                const img = new Image();
                img.src = objectUrl;
                img.onload = () => {
                    const ctx = els.previewCanvas.getContext('2d');
                    const w = els.previewCanvas.width;
                    const h = els.previewCanvas.height;
                    ctx.fillStyle = '#0a0f1a';
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(img, 0, 0, w, h);

                    if (state.photoAnimDraft.onionSkin && currentFrame > 0) {
                        const prevUrl = urls[currentFrame - 1];
                        const prevImg = new Image();
                        prevImg.src = prevUrl;
                        if (prevImg.complete) {
                            ctx.globalAlpha = 0.3;
                            ctx.drawImage(prevImg, 0, 0, w, h);
                            ctx.globalAlpha = 1;
                        }
                    }
                };
            }

            selectFrame(currentFrame);
            currentFrame++;
            state.photoAnimDraft.rafId = setTimeout(animate, frameDuration);
        }
        animate();
    }

    function stopPhotoAnimPlay() {
        state.photoAnimDraft.playing = false;
        els.btnPhotoAnimPlay.textContent = 'Preview';
        if (state.photoAnimDraft.rafId) {
            clearTimeout(state.photoAnimDraft.rafId);
            state.photoAnimDraft.rafId = null;
        }
    }

    async function addPhotoAnimToTimeline() {
        if (!state.photoAnimDraft.files.length) {
            showStatus('No frames to add');
            return;
        }

        if (state.engineReady && state.engine && typeof state.engine.addPhotoSequence === 'function') {
            const files = state.photoAnimDraft.files;
            const clip = await safeCall(state.engine.addPhotoSequence, files, {
                fps: state.photoAnimDraft.fps,
                timelineStart: state.currentTime
            });
            if (clip) {
                showStatus('Photo animation added to timeline');
                state.photoAnimDraft.files.forEach((_, i) => URL.revokeObjectURL(state.photoAnimDraft.objectUrls[i]));
                state.photoAnimDraft.files = [];
                state.photoAnimDraft.objectUrls = [];
                renderFrameStrip();
            }
        } else {
            const clip = {
                id: 'mock-photoanim-' + Date.now(),
                type: 'photoanim', name: 'Photo Animation', duration: state.photoAnimDraft.files.length / state.photoAnimDraft.fps,
                timelineStart: state.currentTime, track: 'video',
                trimIn: 0, trimOut: state.photoAnimDraft.files.length / state.photoAnimDraft.fps, volume: 1,
                filter: 'none', effect: 'none', mask: null,
                keyframes: {}, transition: {type: 'none', duration: 0},
                text: '', fontSize: 48, color: '#ffffff',
                position: {x: 0, y: 0}, anim: 'none', speed: 1,
                fade: null, speedRamp: null, chromaKey: null, flip: 'none',
                frames: state.photoAnimDraft.files.map(f => f.name),
                fps: state.photoAnimDraft.fps
            };
            state.clips.set(clip.id, clip);
            selectClip(clip.id);
            renderTimeline();
            showStatus('Photo animation added (demo)');
        }
    }

    function renderPhotoAnimPreview() {
        // Handled in startPhotoAnimPlay animate()
    }

    // ==================== ASPECT RATIO ====================
    function initAspectRatio() {
        els.aspectRatioBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const ratio = btn.dataset.ratio;
                setAspectRatio(ratio);
            });
        });
    }

    function setAspectRatio(ratio) {
        if (state.engineReady && state.engine && typeof state.engine.setAspectRatio === 'function') {
            safeCall(state.engine.setAspectRatio, ratio);
        }
        updateAspectRatioDisplay(ratio);
        resizePreviewForAspectRatio(ratio);
    }

    function updateAspectRatioDisplay(ratio) {
        els.aspectRatioBtns.forEach(btn => {
            btn.classList.toggle('pe-is-active', btn.dataset.ratio === ratio);
        });
        if (els.aspectRatioDisplay) els.aspectRatioDisplay.textContent = ratio;
    }

    function resizePreviewForAspectRatio(ratio) {
        const canvas = els.previewCanvas;
        let w, h;
        switch (ratio) {
            case '16:9': w = 640; h = 360; break;
            case '9:16': w = 360; h = 640; break;
            case '1:1': w = 480; h = 480; break;
            case '4:5': w = 480; h = 600; break;
            default: w = 640; h = 360;
        }
        canvas.width = w;
        canvas.height = h;
    }

    // ==================== PREVIEW & TRANSPORT ====================
    function initPreview() {
        els.btnPlayPause.addEventListener('click', togglePlayPause);
        els.seekBar.addEventListener('input', (e) => {
            const t = parseFloat(e.target.value);
            seek(t);
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            if (e.code === 'Space') {
                e.preventDefault();
                togglePlayPause();
            } else if (e.code === 'Delete' || e.code === 'Backspace') {
                if (state.selectedClipId) {
                    deleteSelectedClip();
                }
            } else if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) redo(); else undo();
                } else if (e.key === 'y') {
                    e.preventDefault();
                    redo();
                } else if (e.key === 's') {
                    e.preventDefault();
                    saveProject();
                } else if (e.key === 'o') {
                    e.preventDefault();
                    els.loadProjectFile.click();
                }
            }
        });
    }

    function togglePlayPause() {
        if (state.engineReady && state.engine) {
            if (state.isPlaying) {
                safeCall(state.engine.pause);
            } else {
                safeCall(state.engine.play);
            }
            state.isPlaying = safeCall(state.engine.isPlaying) || false;
        } else {
            state.isPlaying = !state.isPlaying;
            if (state.isPlaying) startRenderLoop();
            else stopRenderLoop();
        }
        updatePlayPauseButton();
    }

    function updatePlayPauseButton() {
        els.btnPlayPause.textContent = state.isPlaying ? '⏸' : '▶';
        els.btnPlayPause.setAttribute('aria-label', state.isPlaying ? 'Pause' : 'Play');
    }

    function seek(t) {
        if (state.engineReady && state.engine) {
            safeCall(state.engine.seek, t);
            state.currentTime = t;
        } else {
            state.currentTime = Math.max(0, Math.min(t, state.duration));
            renderPreviewFrame();
        }
        updateTimeDisplay();
        updateSeekBar();
        updatePlayheadPosition();
        updateEffectiveVolumeDisplay();
    }

    function startRenderLoop() {
        if (state.rafId) return;
        state.lastRenderTime = performance.now();
        function loop(now) {
            state.rafId = requestAnimationFrame(loop);
            if (!state.isPlaying) return;

            if (state.engineReady && state.engine) {
                state.currentTime = safeCall(state.engine.getCurrentTime) || state.currentTime;
            } else {
                const delta = (now - state.lastRenderTime) / 1000;
                state.currentTime = Math.min(state.currentTime + delta, state.duration);
                if (state.currentTime >= state.duration) {
                    state.isPlaying = false;
                    updatePlayPauseButton();
                    stopRenderLoop();
                }
            }
            state.lastRenderTime = now;

            renderPreviewFrame();
            updateTimeDisplay();
            updateSeekBar();
            updatePlayheadPosition();
            updateEffectiveVolumeDisplay();
        }
        state.rafId = requestAnimationFrame(loop);
    }

    function stopRenderLoop() {
        if (state.rafId) {
            cancelAnimationFrame(state.rafId);
            state.rafId = null;
        }
    }

    function renderPreviewFrame() {
        const canvas = els.previewCanvas;
        const ctx = canvas.getContext('2d');

        if (state.engineReady && state.engine) {
            safeCall(state.engine.renderFrame, canvas, state.currentTime);
        } else {
            ctx.fillStyle = '#0a0f1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';

            state.clips.forEach(clip => {
                const effectiveDur = getEffectiveDuration(clip);
                const clipEnd = clip.timelineStart + effectiveDur;
                if (state.currentTime >= clip.timelineStart && state.currentTime < clipEnd) {
                    const color = clip.type === 'video' ? '#3B82F6' :
                                  clip.type === 'audio' ? '#F59E0B' :
                                  clip.type === 'photoanim' ? '#22C55E' : '#a78bfa';
                    ctx.fillStyle = color;
                    ctx.fillRect(50, 50, 200, 100);
                    ctx.fillStyle = '#fff';
                    ctx.fillText(clip.name, canvas.width/2, canvas.height/2);
                }
            });

            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.font = '24px monospace';
            ctx.fillText(formatTime(state.currentTime), canvas.width - 120, 40);
        }
    }

    function getEffectiveDuration(clip) {
        if (clip.speedRamp && clip.speedRamp.length > 0) {
            const avgSpeed = clip.speedRamp.reduce((sum, p) => sum + p.speed, 0) / clip.speedRamp.length;
            return (clip.trimOut - clip.trimIn) / avgSpeed;
        }
        return (clip.trimOut - clip.trimIn) / (clip.speed || 1);
    }

    function updateTimeDisplay() {
        els.currentTime.textContent = formatTime(state.currentTime);
    }

    function updateDurationDisplay() {
        els.totalDuration.textContent = formatTime(state.duration);
        els.seekBar.max = state.duration;
    }

    function updateSeekBar() {
        els.seekBar.value = state.currentTime;
    }

    function updatePlayheadPosition() {
        const left = 120 + state.currentTime * state.pxPerSecond;
        els.playhead.style.left = left + 'px';
        els.playhead.style.display = 'block';
    }

    function updateEffectiveVolumeDisplay() {
        const clip = state.clips.get(state.selectedClipId);
        if (!clip) return;

        const display = document.getElementById('pe-propEffectiveVolume');
        if (display && state.engineReady && state.engine && typeof state.engine.getEffectiveVolume === 'function') {
            const vol = safeCall(state.engine.getEffectiveVolume, clip.id, state.currentTime);
            if (vol !== undefined) {
                display.textContent = 'Effective Volume: ' + Math.round(vol * 100) + '%';
            }
        }
    }

    // ==================== TIMELINE ====================
    function initTimeline() {
        els.timelineZoom.addEventListener('input', (e) => {
            state.pxPerSecond = parseInt(e.target.value);
            state.timelineZoom = state.pxPerSecond;
            renderTimeline();
            renderTimelineRuler();
        });

        els.timelineTracks.addEventListener('click', (e) => {
            if (e.target === els.timelineTracks || e.target.classList.contains('pe-track-lane')) {
                const rect = els.timelineTracks.getBoundingClientRect();
                const x = e.clientX - rect.left - 120;
                if (x >= 0) {
                    const t = x / state.pxPerSecond;
                    seek(t);
                }
            }
        });

        els.btnAddMarker?.addEventListener('click', () => {
            addMarkerAtPlayhead();
        });

        els.snapToggle?.addEventListener('change', (e) => {
            state.snapEnabled = e.target.checked;
            showStatus('Snap: ' + (state.snapEnabled ? 'ON' : 'OFF'));
        });
    }

    function renderTimelineRuler() {
        const ruler = els.timelineRuler;
        ruler.innerHTML = '';

        const totalSeconds = Math.ceil(state.duration);
        const majorInterval = getMajorInterval(totalSeconds);

        for (let i = 0; i <= totalSeconds; i++) {
            const mark = document.createElement('div');
            mark.className = 'pe-ruler-mark' + (i % majorInterval === 0 ? ' pe-is-major' : '');
            mark.style.left = (120 + i * state.pxPerSecond) + 'px';
            if (i % majorInterval === 0) {
                mark.dataset.time = formatTime(i);
            }
            ruler.appendChild(mark);
        }

        state.markers.forEach(marker => {
            const mark = document.createElement('div');
            mark.className = 'pe-marker';
            mark.style.left = (120 + marker.time * state.pxPerSecond) + 'px';
            mark.title = marker.label || 'Marker at ' + formatTime(marker.time);
            mark.dataset.markerId = marker.id;
            mark.innerHTML = '▲';
            mark.addEventListener('click', (e) => {
                e.stopPropagation();
                removeMarker(marker.id);
            });
            ruler.appendChild(mark);
        });

        let maxEnd = state.duration;
        state.clips.forEach(clip => {
            const effectiveDur = getEffectiveDuration(clip);
            const end = clip.timelineStart + effectiveDur;
            if (end > maxEnd) maxEnd = end;
        });
        ruler.style.minWidth = (120 + maxEnd * state.pxPerSecond + 100) + 'px';
    }

    function getMajorInterval(totalSeconds) {
        if (totalSeconds <= 30) return 1;
        if (totalSeconds <= 120) return 5;
        if (totalSeconds <= 300) return 10;
        if (totalSeconds <= 600) return 30;
        return 60;
    }

    function renderTimeline() {
        els.trackVideo.innerHTML = '';
        els.trackAudio.innerHTML = '';
        els.trackText.innerHTML = '';

        let maxEnd = state.duration;
        state.clips.forEach(clip => {
            const effectiveDur = getEffectiveDuration(clip);
            const end = clip.timelineStart + effectiveDur;
            if (end > maxEnd) maxEnd = end;
        });
        const contentWidth = 120 + maxEnd * state.pxPerSecond + 100;
        els.trackVideo.style.minWidth = contentWidth + 'px';
        els.trackAudio.style.minWidth = contentWidth + 'px';
        els.trackText.style.minWidth = contentWidth + 'px';

        state.clips.forEach(clip => {
            const trackEl = getTrackElement(clip.track);
            if (!trackEl) return;

            const startX = 120 + clip.timelineStart * state.pxPerSecond;
            const effectiveDur = getEffectiveDuration(clip);
            const width = Math.max(20, effectiveDur * state.pxPerSecond);

            const block = document.createElement('div');
            const typeClass = 'pe-is-' + clip.type;
            block.className = 'pe-clip-block ' + typeClass + (clip.id === state.selectedClipId ? ' pe-is-selected' : '');
            block.dataset.clipId = clip.id;
            block.style.left = startX + 'px';
            block.style.width = width + 'px';
            block.textContent = clip.name + (clip.speed && clip.speed !== 1 ? ' @ ' + clip.speed + 'x' : '');

            const handleL = document.createElement('div');
            handleL.className = 'pe-clip-handle pe-is-left';
            handleL.dataset.clipId = clip.id;
            handleL.dataset.handle = 'left';
            block.appendChild(handleL);

            const handleR = document.createElement('div');
            handleR.className = 'pe-clip-handle pe-is-right';
            handleR.dataset.clipId = clip.id;
            handleR.dataset.handle = 'right';
            block.appendChild(handleR);

            block.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('pe-clip-handle')) return;
                onClipBlockMouseDown(e, clip);
            });
            block.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                splitClipAtPlayhead(clip.id);
            });

            trackEl.appendChild(block);
        });

        setupHandleDraggers();
    }

    function getTrackElement(track) {
        switch (track) {
            case 'video': return els.trackVideo;
            case 'audio': return els.trackAudio;
            case 'text': return els.trackText;
            default: return els.trackVideo;
        }
    }

    function selectClip(clipId) {
        state.selectedClipId = clipId;
        renderTimeline();
        renderMediaList();
        updatePropertiesPanel();
        updateVolumeSlider();
    }

    function updateVolumeSlider() {
        const clip = state.clips.get(state.selectedClipId);
        if (clip) {
            els.clipVolume.value = Math.round(clip.volume * 100);
            els.clipVolumeValue.textContent = Math.round(clip.volume * 100) + '%';
        } else {
            els.clipVolume.value = 100;
            els.clipVolumeValue.textContent = '100%';
        }
    }

    function onClipBlockMouseDown(e, clip) {
        e.preventDefault();
        selectClip(clip.id);

        const startX = e.clientX;
        const startTimelineStart = clip.timelineStart;
        const track = clip.track;

        function onMove(e) {
            const dx = e.clientX - startX;
            let dt = dx / state.pxPerSecond;

            if (state.snapEnabled) {
                dt = snapTime(startTimelineStart + dt);
            }

            const newStart = Math.max(0, startTimelineStart + dt);
            clip.timelineStart = newStart;
            renderTimeline();
        }

        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (state.engineReady && state.engine) {
                safeCall(state.engine.moveClip, clip.id, track, clip.timelineStart);
                saveHistorySnapshot();
            } else {
                saveHistorySnapshot();
            }
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    function setupHandleDraggers() {
        document.querySelectorAll('.pe-clip-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const clipId = handle.dataset.clipId;
                const clip = state.clips.get(clipId);
                if (!clip) return;

                const isLeft = handle.dataset.handle === 'left';
                const startX = e.clientX;
                const startTrim = isLeft ? clip.trimIn : clip.trimOut;
                const maxTrim = clip.duration;

                function onMove(e) {
                    const dx = e.clientX - startX;
                    let dt = dx / state.pxPerSecond;

                    let newTrim = startTrim + dt;
                    newTrim = Math.max(0, Math.min(maxTrim, newTrim));
                    if (isLeft) {
                        if (newTrim >= clip.trimOut - 0.1) newTrim = clip.trimOut - 0.1;
                        clip.trimIn = newTrim;
                    } else {
                        if (newTrim <= clip.trimIn + 0.1) newTrim = clip.trimIn + 0.1;
                        clip.trimOut = newTrim;
                    }
                    renderTimeline();
                }

                function onUp() {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    if (state.engineReady && state.engine) {
                        safeCall(state.engine.trimClip, clipId, clip.trimIn, clip.trimOut);
                        saveHistorySnapshot();
                    } else {
                        saveHistorySnapshot();
                    }
                    updatePropertiesPanel();
                }

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        });
    }

    function snapTime(time) {
        if (!state.engineReady || !state.engine || typeof state.engine.snapTime !== 'function') {
            return Math.round(time);
        }
        return safeCall(state.engine.snapTime, time, {threshold: 0.15, grid: 1});
    }

    function splitClipAtPlayhead(clipId) {
        const clip = state.clips.get(clipId);
        if (!clip) return;

        const effectiveDur = getEffectiveDuration(clip);
        const relativeTime = state.currentTime - clip.timelineStart + clip.trimIn / (clip.speed || 1);
        if (relativeTime <= clip.trimIn / (clip.speed || 1) + 0.1 || relativeTime >= clip.trimOut / (clip.speed || 1) - 0.1) {
            showStatus('Playhead must be inside clip to split');
            return;
        }

        if (state.engineReady && state.engine) {
            const result = safeCall(state.engine.splitClip, clipId, state.currentTime);
            if (result) saveHistorySnapshot();
        } else {
            const clipA = {...clip, id: clipId + '-a', trimOut: clip.trimIn + (clip.trimOut - clip.trimIn) * (relativeTime / effectiveDur), name: clip.name + ' (1)'};
            const clipB = {...clip, id: clipId + '-b', trimIn: clip.trimIn + (clip.trimOut - clip.trimIn) * (relativeTime / effectiveDur), timelineStart: clip.timelineStart + relativeTime, name: clip.name + ' (2)'};
            state.clips.set(clipA.id, clipA);
            state.clips.set(clipB.id, clipB);
            state.clips.delete(clipId);
            selectClip(clipA.id);
            renderTimeline();
            saveHistorySnapshot();
            showStatus('Split clip (demo)');
        }
    }

    function deleteSelectedClip() {
        if (!state.selectedClipId) return;

        const ripple = false;
        if (state.engineReady && state.engine) {
            safeCall(state.engine.removeClip, state.selectedClipId, {ripple});
            saveHistorySnapshot();
        } else {
            state.clips.delete(state.selectedClipId);
            state.selectedClipId = null;
            renderTimeline();
            updatePropertiesPanel();
            saveHistorySnapshot();
        }
        showStatus('Clip deleted');
    }

    function rippleDeleteSelectedClip() {
        if (!state.selectedClipId) return;

        if (state.engineReady && state.engine) {
            safeCall(state.engine.removeClip, state.selectedClipId, {ripple: true});
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(state.selectedClipId);
            if (clip) {
                const track = clip.track;
                const clipEnd = clip.timelineStart + getEffectiveDuration(clip);
                state.clips.forEach(c => {
                    if (c.track === track && c.timelineStart > clip.timelineStart) {
                        c.timelineStart -= getEffectiveDuration(clip);
                    }
                });
                state.clips.delete(state.selectedClipId);
                state.selectedClipId = null;
                renderTimeline();
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus('Ripple deleted');
    }

    // ==================== MARKERS ====================
    function addMarkerAtPlayhead() {
        const label = prompt('Marker label (optional):') || '';
        if (state.engineReady && state.engine && typeof state.engine.addMarker === 'function') {
            safeCall(state.engine.addMarker, state.currentTime, label);
            showStatus('Marker added at ' + formatTime(state.currentTime));
        } else {
            const marker = {
                id: 'marker-' + Date.now(),
                time: state.currentTime,
                label: label
            };
            state.markers.push(marker);
            state.markers.sort((a, b) => a.time - b.time);
            renderTimelineRuler();
            showStatus('Marker added at ' + formatTime(state.currentTime) + ' (demo)');
        }
    }

    function removeMarker(markerId) {
        if (state.engineReady && state.engine && typeof state.engine.removeMarker === 'function') {
            safeCall(state.engine.removeMarker, markerId);
            showStatus('Marker removed');
        } else {
            state.markers = state.markers.filter(m => m.id !== markerId);
            renderTimelineRuler();
            showStatus('Marker removed (demo)');
        }
    }

    // ==================== DETACH AUDIO ====================
    function detachAudio() {
        if (!state.selectedClipId) {
            showStatus('Select a video clip first');
            return;
        }
        const clip = state.clips.get(state.selectedClipId);
        if (!clip || clip.type !== 'video') {
            showStatus('Only video clips can have audio detached');
            return;
        }

        if (state.engineReady && state.engine && typeof state.engine.detachAudio === 'function') {
            safeCall(state.engine.detachAudio, clip.id);
            saveHistorySnapshot();
            showStatus('Audio detached');
        } else {
            const audioClip = {
                id: 'detached-audio-' + Date.now(),
                type: 'audio',
                name: clip.name.replace(/\.[^.]+$/, '') + '_audio',
                duration: clip.duration,
                timelineStart: clip.timelineStart,
                track: 'audio',
                trimIn: clip.trimIn,
                trimOut: clip.trimOut,
                volume: clip.volume,
                filter: 'none', effect: 'none', mask: null,
                keyframes: {}, transition: {type: 'none', duration: 0},
                text: '', fontSize: 48, color: '#ffffff',
                position: {x: 0, y: 0}, anim: 'none', speed: clip.speed,
                fade: clip.fade, speedRamp: clip.speedRamp, chromaKey: null, flip: 'none',
                detachedFrom: clip.id
            };
            clip.volume = 0;
            clip.detachedAudioId = audioClip.id;
            state.clips.set(audioClip.id, audioClip);
            renderTimeline();
            showStatus('Audio detached (demo)');
        }
    }

    // ==================== FREEZE FRAME ====================
    function freezeFrame() {
        if (!state.selectedClipId) {
            showStatus('Select a video or image clip first');
            return;
        }
        const clip = state.clips.get(state.selectedClipId);
        if (!clip || (clip.type !== 'video' && clip.type !== 'image')) {
            showStatus('Only video/image clips can be frozen');
            return;
        }

        const atTime = state.currentTime;
        const duration = 3;

        if (state.engineReady && state.engine && typeof state.engine.freezeFrame === 'function') {
            safeCall(state.engine.freezeFrame, clip.id, atTime, duration);
            saveHistorySnapshot();
            showStatus('Freeze frame added at ' + formatTime(atTime));
        } else {
            const effectiveDur = getEffectiveDuration(clip);
            const frozenClip = {
                id: 'freeze-' + Date.now(),
                type: 'image',
                name: clip.name + ' (frozen)',
                duration: duration,
                timelineStart: clip.timelineStart + effectiveDur,
                track: 'video',
                trimIn: 0, trimOut: duration, volume: 1,
                filter: 'none', effect: 'none', mask: null,
                keyframes: {}, transition: {type: 'none', duration: 0},
                text: '', fontSize: 48, color: '#ffffff',
                position: {x: 0, y: 0}, anim: 'none', speed: 1,
                fade: null, speedRamp: null, chromaKey: null, flip: 'none',
                freezeFrom: clip.id,
                freezeAtTime: atTime
            };
            state.clips.set(frozenClip.id, frozenClip);
            renderTimeline();
            showStatus('Freeze frame added (demo)');
        }
    }

    // ==================== DUPLICATE CLIP ====================
    function duplicateClip() {
        if (!state.selectedClipId) {
            showStatus('Select a clip first');
            return;
        }
        const clip = state.clips.get(state.selectedClipId);
        if (!clip) return;

        if (state.engineReady && state.engine && typeof state.engine.duplicateClip === 'function') {
            safeCall(state.engine.duplicateClip, clip.id);
            saveHistorySnapshot();
            showStatus('Clip duplicated');
        } else {
            const effectiveDur = getEffectiveDuration(clip);
            const newClip = {...clip, id: clip.id + '-dup', timelineStart: clip.timelineStart + effectiveDur, name: clip.name + ' (copy)'};
            state.clips.set(newClip.id, newClip);
            selectClip(newClip.id);
            renderTimeline();
            showStatus('Clip duplicated (demo)');
        }
    }

    // ==================== CROP & ROTATION ====================
    function applyCrop() {
        if (!state.selectedClipId) return;
        const x = parseFloat(document.getElementById('pe-propCropX').value) || 0;
        const y = parseFloat(document.getElementById('pe-propCropY').value) || 0;
        const w = parseFloat(document.getElementById('pe-propCropW').value) || 1;
        const h = parseFloat(document.getElementById('pe-propCropH').value) || 1;

        if (state.engineReady && state.engine && typeof state.engine.setCrop === 'function') {
            safeCall(state.engine.setCrop, state.selectedClipId, {x, y, w, h});
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(state.selectedClipId);
            if (clip) {
                clip.crop = {x, y, w, h};
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus('Crop applied');
    }

    function clearCrop() {
        if (!state.selectedClipId) return;
        if (state.engineReady && state.engine && typeof state.engine.setCrop === 'function') {
            safeCall(state.engine.setCrop, state.selectedClipId, null);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(state.selectedClipId);
            if (clip) {
                clip.crop = null;
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus('Crop cleared');
    }

    function applyRotation() {
        if (!state.selectedClipId) return;
        const degrees = parseFloat(document.getElementById('pe-propRotation').value) || 0;
        const clamped = Math.max(-180, Math.min(180, degrees));

        if (state.engineReady && state.engine && typeof state.engine.setRotation === 'function') {
            safeCall(state.engine.setRotation, state.selectedClipId, clamped);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(state.selectedClipId);
            if (clip) {
                clip.rotation = clamped;
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus('Rotation: ' + clamped + '°');
    }

    // ==================== KEYFRAMES WITH EASING ====================
    function addKeyframeWithEasing(clipId, prop, time, value, easing) {
        if (state.engineReady && state.engine) {
            safeCall(state.engine.addKeyframe, clipId, prop, time, value, easing || 'linear');
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(clipId);
            if (clip) {
                if (!clip.keyframes) clip.keyframes = {};
                if (!clip.keyframes[prop]) clip.keyframes[prop] = [];
                clip.keyframes[prop].push({time, value, easing: easing || 'linear'});
                clip.keyframes[prop].sort((a,b) => a.time - b.time);
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus('Keyframe added: ' + prop + ' @ ' + formatTime(time) + ' = ' + value + ' (' + (easing || 'linear') + ')');
    }

    // ==================== PROPERTIES PANEL ====================
    function updatePropertiesPanel() {
        const clip = state.clips.get(state.selectedClipId);
        if (!clip) {
            els.propertiesContent.innerHTML = '<div class="pe-no-selection">No clip selected</div>';
            return;
        }

        const keyframes = clip.keyframes || {};
        let keyframeHtml = '';
        ['scale', 'x', 'y', 'opacity', 'rotation', 'volume'].forEach(prop => {
            const kfs = keyframes[prop] || [];
            kfs.forEach(kf => {
                keyframeHtml += '<div class="pe-keyframe-item"><div class="pe-keyframe-info">' +
                    '<span class="pe-keyframe-prop">' + prop + '</span>' +
                    '<span class="pe-keyframe-time-value">t=' + formatTime(kf.time) + ' val=' + kf.value + ' easing=' + (kf.easing || 'linear') + '</span>' +
                    '</div><button class="pe-btn pe-btn-icon" data-remove-kf="' + prop + '" data-kf-time="' + kf.time + '">✕</button></div>';
            });
        });

        const isVideoOrAudio = clip.type === 'video' || clip.type === 'audio' || clip.type === 'photoanim';
        const isPhotoAnim = clip.type === 'photoanim';
        const isVideo = clip.type === 'video';

        let photoAnimHtml = '';
        if (isPhotoAnim) {
            const frameCount = clip.frames?.length || 0;
            photoAnimHtml = '<div class="pe-property-section pe-photoanim-info"><h4>Photo Animation</h4>' +
                '<div class="pe-property-row"><label>Frames</label><span>' + frameCount + '</span></div>' +
                '<div class="pe-property-row"><label>FPS</label><input type="number" id="pe-propPhotoAnimFps" value="' + (clip.fps || 30) + '" min="1" max="60" step="1" style="width:80px;"></div></div>';
        }

        const speedHtml = isVideoOrAudio && !isPhotoAnim ? '<div class="pe-property-section pe-speed-section"><h4>Speed</h4>' +
            '<div class="pe-property-row pe-speed-row"><label>Speed</label><input type="range" id="pe-propSpeed" class="pe-speed-slider" min="0.25" max="4" step="0.05" value="' + (clip.speed || 1) + '"><span id="pe-propSpeedVal" style="min-width: 50px; text-align: right;">' + (clip.speed || 1).toFixed(2) + 'x</span></div>' +
            '<div class="pe-property-row pe-speed-row"><label></label><div class="pe-speed-presets"><button class="pe-btn pe-btn-secondary pe-speed-preset-btn" data-speed="0.5">0.5x</button><button class="pe-btn pe-btn-secondary pe-speed-preset-btn" data-speed="1">1x</button><button class="pe-btn pe-btn-secondary pe-speed-preset-btn" data-speed="1.5">1.5x</button><button class="pe-btn pe-btn-secondary pe-speed-preset-btn" data-speed="2">2x</button></div></div>' +
            '<div class="pe-property-row pe-speed-row"><label>Effective</label><span id="pe-propEffectiveDuration" class="pe-effective-duration">Effective: ' + formatTime(getEffectiveDuration(clip)) + ' @ ' + (clip.speed || 1).toFixed(2) + 'x</span></div></div>' : '';

        const speedRampHtml = isVideoOrAudio && !isPhotoAnim ? '<div class="pe-property-section pe-speed-ramp-section"><h4>Speed Ramp</h4>' +
            '<div class="pe-ramp-points"><div class="pe-ramp-point"><label>Start</label><input type="number" id="pe-rampStartSpeed" value="' + (clip.speedRamp?.[0]?.speed || (clip.speed || 1)) + '" min="0.25" max="4" step="0.05" style="width:70px;"><input type="number" id="pe-rampStartTime" value="' + (clip.speedRamp?.[0]?.time || 0) + '" min="0" step="0.1" style="width:70px;" placeholder="Time (s)"></div>' +
            '<div class="pe-ramp-point"><label>Mid</label><input type="number" id="pe-rampMidSpeed" value="' + (clip.speedRamp?.[1]?.speed || (clip.speed || 1)) + '" min="0.25" max="4" step="0.05" style="width:70px;"><input type="number" id="pe-rampMidTime" value="' + (clip.speedRamp?.[1]?.time || (getEffectiveDuration(clip) / 2)) + '" min="0" step="0.1" style="width:70px;" placeholder="Time (s)"></div>' +
            '<div class="pe-ramp-point"><label>End</label><input type="number" id="pe-rampEndSpeed" value="' + (clip.speedRamp?.[2]?.speed || (clip.speed || 1)) + '" min="0.25" max="4" step="0.05" style="width:70px;"><input type="number" id="pe-rampEndTime" value="' + (clip.speedRamp?.[2]?.time || getEffectiveDuration(clip)) + '" min="0" step="0.1" style="width:70px;" placeholder="Time (s)"></div></div>' +
            '<div class="pe-property-actions"><button class="pe-btn pe-btn-primary" id="pe-btnApplyRamp">Apply Ramp</button><button class="pe-btn pe-btn-secondary" id="pe-btnClearRamp">Clear Ramp</button></div></div>' : '';

        const audioFadeHtml = (clip.type === 'video' || clip.type === 'audio') ? '<div class="pe-property-section pe-audio-fade-section"><h4>Audio Fade</h4>' +
            '<div class="pe-fade-row"><label>Fade In (s)</label><input type="number" id="pe-propFadeIn" value="' + (clip.fade?.in || 0) + '" min="0" max="10" step="0.1" style="width:80px;"></div>' +
            '<div class="pe-fade-row"><label>Fade Out (s)</label><input type="number" id="pe-propFadeOut" value="' + (clip.fade?.out || 0) + '" min="0" max="10" step="0.1" style="width:80px;"></div>' +
            '<div class="pe-property-row"><label>Effective Vol</label><span id="pe-propEffectiveVolume" style="flex:1; text-align:right; color:var(--text-secondary);">—</span></div>' +
            '<div class="pe-property-actions"><button class="pe-btn pe-btn-primary" id="pe-btnApplyFade">Apply</button><button class="pe-btn pe-btn-secondary" id="pe-btnClearFade">Clear</button></div></div>' : '';

        const chromaHtml = (clip.type === 'video' || clip.type === 'image') ? '<div class="pe-property-section pe-chroma-section"><h4>Chroma Key</h4>' +
            '<div class="pe-chroma-row"><label>Enabled</label><input type="checkbox" id="pe-propChromaEnabled" ' + (clip.chromaKey ? 'checked' : '') + '></div>' +
            '<div class="pe-chroma-row" id="pe-chromaInputs" style="display: ' + (clip.chromaKey ? 'flex' : 'none') + ';"><label>Color</label><input type="color" id="pe-propChromaColor" value="' + (clip.chromaKey?.color || '#00ff00') + '" style="width:50px; height:30px;"><label>Similarity</label><input type="range" id="pe-propChromaSimilarity" min="0" max="1" step="0.01" value="' + (clip.chromaKey?.similarity || 0.3) + '" style="flex:1;"><span id="pe-propChromaSimVal" style="min-width:40px; text-align:right;">' + (clip.chromaKey?.similarity || 0.3).toFixed(2) + '</span></div>' +
            '<div class="pe-chroma-row" id="pe-chromaSmoothInputs" style="display: ' + (clip.chromaKey ? 'flex' : 'none') + ';"><label>Smoothness</label><input type="range" id="pe-propChromaSmoothness" min="0" max="1" step="0.01" value="' + (clip.chromaKey?.smoothness || 0.1) + '" style="flex:1;"><span id="pe-propChromaSmoothVal" style="min-width:40px; text-align:right;">' + (clip.chromaKey?.smoothness || 0.1).toFixed(2) + '</span></div>' +
            '<div class="pe-property-actions"><button class="pe-btn pe-btn-primary" id="pe-btnApplyChroma">Apply</button><button class="pe-btn pe-btn-secondary" id="pe-btnClearChroma">Clear</button></div></div>' : '';

        const flipHtml = (clip.type === 'video' || clip.type === 'image') ? '<div class="pe-property-section pe-flip-section"><h4>Flip</h4>' +
            '<div class="pe-flip-buttons"><button class="pe-btn pe-btn-secondary pe-flip-btn" data-flip="none" ' + (clip.flip === 'none' ? 'class="pe-btn pe-btn-secondary pe-flip-btn pe-is-active"' : '') + '>None</button><button class="pe-btn pe-btn-secondary pe-flip-btn" data-flip="horizontal" ' + (clip.flip === 'horizontal' ? 'class="pe-btn pe-btn-secondary pe-flip-btn pe-is-active"' : '') + '>↔ Horizontal</button><button class="pe-btn pe-btn-secondary pe-flip-btn" data-flip="vertical" ' + (clip.flip === 'vertical' ? 'class="pe-btn pe-btn-secondary pe-flip-btn pe-is-active"' : '') + '>↕ Vertical</button></div></div>' : '';

        const cropRotationHtml = (clip.type === 'video' || clip.type === 'image' || clip.type === 'photoanim') ? '<div class="pe-property-section"><h4>Crop & Rotation</h4>' +
            '<div class="pe-property-row"><label>Crop X</label><input type="number" id="pe-propCropX" value="' + (clip.crop?.x ?? 0) + '" step="0.01" min="0" max="1" style="width:70px;"><label>Y</label><input type="number" id="pe-propCropY" value="' + (clip.crop?.y ?? 0) + '" step="0.01" min="0" max="1" style="width:70px;"></div>' +
            '<div class="pe-property-row"><label>Crop W</label><input type="number" id="pe-propCropW" value="' + (clip.crop?.w ?? 1) + '" step="0.01" min="0" max="1" style="width:70px;"><label>H</label><input type="number" id="pe-propCropH" value="' + (clip.crop?.h ?? 1) + '" step="0.01" min="0" max="1" style="width:70px;"></div>' +
            '<div class="pe-property-actions"><button class="pe-btn pe-btn-primary" id="pe-btnApplyCrop">Apply Crop</button><button class="pe-btn pe-btn-secondary" id="pe-btnClearCrop">Clear Crop</button></div>' +
            '<div class="pe-property-row"><label>Rotation (°)</label><input type="number" id="pe-propRotation" value="' + (clip.rotation ?? 0) + '" step="1" min="-180" max="180" style="width:100px;"><button class="pe-btn pe-btn-primary" id="pe-btnApplyRotation" style="margin-left: 8px;">Apply</button></div></div>' : '';

        const detachAudioHtml = isVideo ? '<div class="pe-property-section"><h4>Audio</h4><div class="pe-property-actions"><button class="pe-btn pe-btn-primary" id="pe-btnDetachAudio">Detach Audio</button></div></div>' : '';

        const freezeFrameHtml = (clip.type === 'video' || clip.type === 'image') ? '<div class="pe-property-section"><h4>Freeze Frame</h4><div class="pe-property-actions"><button class="pe-btn pe-btn-primary" id="pe-btnFreezeFrame">Freeze Frame at Playhead (3s)</button></div></div>' : '';

        const duplicateHtml = '<div class="pe-property-section"><h4>Duplicate</h4><div class="pe-property-actions"><button class="pe-btn pe-btn-primary" id="pe-btnDuplicateClip">Duplicate Clip</button></div></div>';

        const rippleDeleteHtml = '<div class="pe-property-section"><h4>Delete</h4><div class="pe-property-actions"><button class="pe-btn pe-btn-secondary" style="background:var(--danger); border-color:var(--danger);" id="pe-btnDeleteClip">Delete Clip</button><button class="pe-btn pe-btn-secondary" style="background:var(--warning); border-color:var(--warning); color:var(--bg-primary);" id="pe-btnRippleDelete">Ripple Delete</button></div></div>';

        els.propertiesContent.innerHTML = '<div class="pe-property-section"><h4>Basic Info</h4>' +
            '<div class="pe-property-row"><label>Name</label><input type="text" value="' + escapeHtml(clip.name) + '" readonly style="flex:1; background:var(--bg-secondary);"></div>' +
            '<div class="pe-property-row"><label>Type</label><input type="text" value="' + clip.type + '" readonly style="flex:1; background:var(--bg-secondary);"></div>' +
            '<div class="pe-property-row"><label>Duration</label><input type="text" value="' + formatTime(clip.duration) + '" readonly style="flex:1; background:var(--bg-secondary);"></div></div>' +
            '<div class="pe-property-section"><h4>Trim</h4><div class="pe-property-row"><label>Trim In</label><input type="number" id="pe-propTrimIn" value="' + clip.trimIn.toFixed(2) + '" step="0.01" min="0" max="' + clip.duration + '"></div>' +
            '<div class="pe-property-row"><label>Trim Out</label><input type="number" id="pe-propTrimOut" value="' + clip.trimOut.toFixed(2) + '" step="0.01" min="0" max="' + clip.duration + '"></div>' +
            '<div class="pe-property-actions"><button class="pe-btn pe-btn-primary" id="pe-btnApplyTrim">Apply Trim</button></div></div>' +
            speedHtml + speedRampHtml + audioFadeHtml + chromaHtml + flipHtml + cropRotationHtml + photoAnimHtml + detachAudioHtml + freezeFrameHtml + duplicateHtml + rippleDeleteHtml +
            '<div class="pe-property-section"><h4>Volume</h4><div class="pe-property-row"><label>Volume</label><input type="range" id="pe-propVolume" min="0" max="100" value="' + Math.round(clip.volume * 100) + '"><span id="pe-propVolumeVal">' + Math.round(clip.volume * 100) + '%</span></div></div>' +
            '<div class="pe-property-section"><h4>Filter</h4><div class="pe-property-row"><label>Filter</label><select id="pe-propFilter">' + FILTER_NAMES.map(f => '<option value="' + f + '" ' + (f === clip.filter ? 'selected' : '') + '>' + f + '</option>').join('') + '</select></div></div>' +
            '<div class="pe-property-section"><h4>Effect</h4><div class="pe-property-row"><label>Effect</label><select id="pe-propEffect">' + EFFECT_NAMES.map(e => '<option value="' + e + '" ' + (e === clip.effect ? 'selected' : '') + '>' + e + '</option>').join('') + '</select></div></div>' +
            '<div class="pe-property-section"><h4>Mask</h4><div class="pe-property-row"><label>Shape</label><select id="pe-propMaskShape"><option value="none" ' + (!clip.mask ? 'selected' : '') + '>None</option><option value="rect" ' + (clip.mask?.shape === 'rect' ? 'selected' : '') + '>Rectangle</option><option value="circle" ' + (clip.mask?.shape === 'circle' ? 'selected' : '') + '>Circle</option><option value="ellipse" ' + (clip.mask?.shape === 'ellipse' ? 'selected' : '') + '>Ellipse</option></select></div>' +
            '<div class="pe-property-row" id="pe-maskInputs" style="display: ' + (clip.mask ? 'flex' : 'none') + ';"><label>X</label><input type="number" id="pe-propMaskX" value="' + (clip.mask?.x ?? 0) + '" step="1" style="width:60px;"><label>Y</label><input type="number" id="pe-propMaskY" value="' + (clip.mask?.y ?? 0) + '" step="1" style="width:60px;"><label>W</label><input type="number" id="pe-propMaskW" value="' + (clip.mask?.w ?? 100) + '" step="1" style="width:60px;"><label>H</label><input type="number" id="pe-propMaskH" value="' + (clip.mask?.h ?? 100) + '" step="1" style="width:60px;"><label>Feather</label><input type="range" id="pe-propMaskFeather" min="0" max="100" value="' + (clip.mask?.feather ?? 0) + '" style="flex:1;"></div>' +
            '<div class="pe-property-actions"><button class="pe-btn pe-btn-primary" id="pe-btnApplyMask">Apply</button><button class="pe-btn pe-btn-secondary" id="pe-btnClearMask">Clear</button></div></div>' +
            '<div class="pe-property-section"><h4>Keyframes</h4><div class="pe-property-row"><label>Property</label><select id="pe-kfProp"><option value="scale">Scale</option><option value="x">X Position</option><option value="y">Y Position</option><option value="opacity">Opacity</option><option value="rotation">Rotation</option><option value="volume">Volume</option></select></div>' +
            '<div class="pe-property-row"><label>Time (s)</label><input type="number" id="pe-kfTime" value="' + state.currentTime.toFixed(1) + '" step="0.1" min="0" max="' + state.duration + '" style="width:100px;"></div>' +
            '<div class="pe-property-row"><label>Value</label><input type="number" id="pe-kfValue" value="1" step="0.01" style="width:100px;"></div>' +
            '<div class="pe-property-row"><label>Easing</label><select id="pe-kfEasing"><option value="linear">Linear</option><option value="ease-in">Ease In</option><option value="ease-out">Ease Out</option><option value="ease-in-out">Ease In-Out</option></select></div>' +
            '<div class="pe-property-actions"><button class="pe-btn pe-btn-primary" id="pe-btnAddKeyframe">Add Keyframe</button></div>' +
            '<div class="pe-keyframe-list" id="pe-keyframeList">' + keyframeHtml + '</div></div>' +
            '<div class="pe-property-section"><h4>Transition</h4><div class="pe-property-row"><label>Type</label><select id="pe-propTransition"><option value="none" ' + (clip.transition?.type === 'none' ? 'selected' : '') + '>None</option><option value="fade" ' + (clip.transition?.type === 'fade' ? 'selected' : '') + '>Fade</option><option value="dissolve" ' + (clip.transition?.type === 'dissolve' ? 'selected' : '') + '>Dissolve</option><option value="wipe" ' + (clip.transition?.type === 'wipe' ? 'selected' : '') + '>Wipe</option><option value="slide" ' + (clip.transition?.type === 'slide' ? 'selected' : '') + '>Slide</option></select></div>' +
            '<div class="pe-property-row"><label>Duration</label><input type="number" id="pe-propTransitionDur" value="' + (clip.transition?.duration ?? 0.5) + '" step="0.1" min="0" max="5" style="width:100px;"></div>' +
            '<div class="pe-property-actions"><button class="pe-btn pe-btn-primary" id="pe-btnApplyTransitionProp">Apply</button></div></div>' +
            '<div class="pe-property-section"><h4>Split</h4><div class="pe-property-actions"><button class="pe-btn pe-btn-primary" id="pe-btnSplitClip">Split at Playhead</button></div></div>';

        bindPropertyEvents(clip);
    }

    function bindPropertyEvents(clip) {
        document.getElementById('pe-btnApplyTrim')?.addEventListener('click', () => {
            const trimIn = parseFloat(document.getElementById('pe-propTrimIn').value) || 0;
            const trimOut = parseFloat(document.getElementById('pe-propTrimOut').value) || clip.duration;
            applyTrim(clip.id, trimIn, trimOut);
        });

        const speedSlider = document.getElementById('pe-propSpeed');
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const speed = parseFloat(e.target.value);
                document.getElementById('pe-propSpeedVal').textContent = speed.toFixed(2) + 'x';
                const effectiveDur = (clip.trimOut - clip.trimIn) / speed;
                document.getElementById('pe-propEffectiveDuration').textContent = 'Effective: ' + formatTime(effectiveDur) + ' @ ' + speed.toFixed(2) + 'x';
                applySpeed(clip.id, speed);
            });
        }

        document.querySelectorAll('.pe-speed-preset-btn')?.forEach(btn => {
            btn.addEventListener('click', () => {
                const speed = parseFloat(btn.dataset.speed);
                document.getElementById('pe-propSpeed').value = speed;
                document.getElementById('pe-propSpeedVal').textContent = speed.toFixed(2) + 'x';
                const effectiveDur = (clip.trimOut - clip.trimIn) / speed;
                document.getElementById('pe-propEffectiveDuration').textContent = 'Effective: ' + formatTime(effectiveDur) + ' @ ' + speed.toFixed(2) + 'x';
                applySpeed(clip.id, speed);
            });
        });

        document.getElementById('pe-btnApplyRamp')?.addEventListener('click', () => {
            const ramp = [
                {time: parseFloat(document.getElementById('pe-rampStartTime').value) || 0, speed: parseFloat(document.getElementById('pe-rampStartSpeed').value) || 1},
                {time: parseFloat(document.getElementById('pe-rampMidTime').value) || getEffectiveDuration(clip)/2, speed: parseFloat(document.getElementById('pe-rampMidSpeed').value) || 1},
                {time: parseFloat(document.getElementById('pe-rampEndTime').value) || getEffectiveDuration(clip), speed: parseFloat(document.getElementById('pe-rampEndSpeed').value) || 1}
            ];
            applySpeedRamp(clip.id, ramp);
        });
        document.getElementById('pe-btnClearRamp')?.addEventListener('click', () => {
            applySpeedRamp(clip.id, null);
            updatePropertiesPanel();
        });

        document.getElementById('pe-btnApplyFade')?.addEventListener('click', () => {
            const fadeIn = parseFloat(document.getElementById('pe-propFadeIn').value) || 0;
            const fadeOut = parseFloat(document.getElementById('pe-propFadeOut').value) || 0;
            applyFade(clip.id, fadeIn > 0 || fadeOut > 0 ? {in: fadeIn, out: fadeOut} : null);
        });
        document.getElementById('pe-btnClearFade')?.addEventListener('click', () => {
            document.getElementById('pe-propFadeIn').value = 0;
            document.getElementById('pe-propFadeOut').value = 0;
            applyFade(clip.id, null);
        });

        document.getElementById('pe-propChromaEnabled')?.addEventListener('change', (e) => {
            const show = e.target.checked;
            document.getElementById('pe-chromaInputs').style.display = show ? 'flex' : 'none';
            document.getElementById('pe-chromaSmoothInputs').style.display = show ? 'flex' : 'none';
        });
        document.getElementById('pe-propChromaSimilarity')?.addEventListener('input', (e) => {
            document.getElementById('pe-propChromaSimVal').textContent = parseFloat(e.target.value).toFixed(2);
        });
        document.getElementById('pe-propChromaSmoothness')?.addEventListener('input', (e) => {
            document.getElementById('pe-propChromaSmoothVal').textContent = parseFloat(e.target.value).toFixed(2);
        });
        document.getElementById('pe-btnApplyChroma')?.addEventListener('click', () => {
            const enabled = document.getElementById('pe-propChromaEnabled').checked;
            if (!enabled) {
                applyChromaKey(clip.id, null);
                return;
            }
            const chromaKey = {
                color: document.getElementById('pe-propChromaColor').value,
                similarity: parseFloat(document.getElementById('pe-propChromaSimilarity').value) || 0.3,
                smoothness: parseFloat(document.getElementById('pe-propChromaSmoothness').value) || 0.1
            };
            applyChromaKey(clip.id, chromaKey);
        });
        document.getElementById('pe-btnClearChroma')?.addEventListener('click', () => {
            document.getElementById('pe-propChromaEnabled').checked = false;
            document.getElementById('pe-chromaInputs').style.display = 'none';
            document.getElementById('pe-chromaSmoothInputs').style.display = 'none';
            applyChromaKey(clip.id, null);
        });

        document.querySelectorAll('.pe-flip-btn')?.forEach(btn => {
            btn.addEventListener('click', () => {
                const flip = btn.dataset.flip;
                applyFlip(clip.id, flip);
                document.querySelectorAll('.pe-flip-btn').forEach(b => {
                    b.classList.remove('pe-is-active');
                });
                btn.classList.add('pe-is-active');
            });
        });

        document.getElementById('pe-btnApplyCrop')?.addEventListener('click', applyCrop);
        document.getElementById('pe-btnClearCrop')?.addEventListener('click', clearCrop);
        document.getElementById('pe-btnApplyRotation')?.addEventListener('click', applyRotation);

        document.getElementById('pe-propPhotoAnimFps')?.addEventListener('change', (e) => {
            const fps = parseInt(e.target.value) || 30;
            if (state.engineReady && state.engine && typeof state.engine.setSequenceFps === 'function') {
                safeCall(state.engine.setSequenceFps, clip.id, fps);
                saveHistorySnapshot();
            } else {
                clip.fps = fps;
                clip.duration = (clip.frames?.length || 0) / fps;
                clip.trimOut = clip.duration;
                renderTimeline();
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        });

        document.getElementById('pe-btnDetachAudio')?.addEventListener('click', detachAudio);
        document.getElementById('pe-btnFreezeFrame')?.addEventListener('click', freezeFrame);
        document.getElementById('pe-btnDuplicateClip')?.addEventListener('click', duplicateClip);
        document.getElementById('pe-btnDeleteClip')?.addEventListener('click', deleteSelectedClip);
        document.getElementById('pe-btnRippleDelete')?.addEventListener('click', rippleDeleteSelectedClip);

        document.getElementById('pe-propVolume')?.addEventListener('input', (e) => {
            const vol = parseInt(e.target.value) / 100;
            document.getElementById('pe-propVolumeVal').textContent = e.target.value + '%';
            setClipVolume(vol);
        });

        document.getElementById('pe-propFilter')?.addEventListener('change', (e) => {
            applyFilter(e.target.value);
        });

        document.getElementById('pe-propEffect')?.addEventListener('change', (e) => {
            applyEffect(e.target.value);
        });

        document.getElementById('pe-propMaskShape')?.addEventListener('change', (e) => {
            document.getElementById('pe-maskInputs').style.display = e.target.value === 'none' ? 'none' : 'flex';
        });
        document.getElementById('pe-btnApplyMask')?.addEventListener('click', () => {
            const shape = document.getElementById('pe-propMaskShape').value;
            if (shape === 'none') {
                applyMask(clip.id, null);
                return;
            }
            const mask = {
                shape,
                x: parseInt(document.getElementById('pe-propMaskX').value) || 0,
                y: parseInt(document.getElementById('pe-propMaskY').value) || 0,
                w: parseInt(document.getElementById('pe-propMaskW').value) || 100,
                h: parseInt(document.getElementById('pe-propMaskH').value) || 100,
                feather: parseInt(document.getElementById('pe-propMaskFeather').value) || 0
            };
            applyMask(clip.id, mask);
        });
        document.getElementById('pe-btnClearMask')?.addEventListener('click', () => {
            document.getElementById('pe-propMaskShape').value = 'none';
            document.getElementById('pe-maskInputs').style.display = 'none';
            applyMask(clip.id, null);
        });

        document.getElementById('pe-btnAddKeyframe')?.addEventListener('click', () => {
            const prop = document.getElementById('pe-kfProp').value;
            const time = parseFloat(document.getElementById('pe-kfTime').value);
            const value = parseFloat(document.getElementById('pe-kfValue').value);
            const easing = document.getElementById('pe-kfEasing').value;
            addKeyframeWithEasing(clip.id, prop, time, value, easing);
        });

        document.querySelectorAll('[data-remove-kf]')?.forEach(btn => {
            btn.addEventListener('click', () => {
                removeKeyframe(clip.id, btn.dataset.removeKf, parseFloat(btn.dataset.kfTime));
            });
        });

        document.getElementById('pe-btnApplyTransitionProp')?.addEventListener('click', () => {
            const type = document.getElementById('pe-propTransition').value;
            const duration = parseFloat(document.getElementById('pe-propTransitionDur').value) || 0;
            applyTransition(type, duration);
        });

        document.getElementById('pe-btnSplitClip')?.addEventListener('click', () => {
            splitClipAtPlayhead(clip.id);
        });
    }

    function applyTrim(clipId, trimIn, trimOut) {
        if (trimIn >= trimOut) {
            showStatus('Trim In must be less than Trim Out');
            return;
        }
        if (state.engineReady && state.engine) {
            safeCall(state.engine.trimClip, clipId, trimIn, trimOut);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(clipId);
            if (clip) {
                clip.trimIn = trimIn;
                clip.trimOut = trimOut;
                renderTimeline();
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus('Trim applied');
    }

    function applySpeed(clipId, speed) {
        const clampedSpeed = Math.max(0.25, Math.min(4, speed));
        if (state.engineReady && state.engine) {
            if (typeof state.engine.setSpeed === 'function') {
                safeCall(state.engine.setSpeed, clipId, clampedSpeed);
                saveHistorySnapshot();
            } else {
                showStatus('Speed not available in this engine build');
            }
        } else {
            const clip = state.clips.get(clipId);
            if (clip) {
                clip.speed = clampedSpeed;
                renderTimeline();
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus('Speed: ' + clampedSpeed.toFixed(2) + 'x');
    }

    function applySpeedRamp(clipId, ramp) {
        if (state.engineReady && state.engine && typeof state.engine.setSpeedRamp === 'function') {
            safeCall(state.engine.setSpeedRamp, clipId, ramp);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(clipId);
            if (clip) {
                clip.speedRamp = ramp;
                renderTimeline();
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus(ramp ? 'Speed ramp applied' : 'Speed ramp cleared');
    }

    function applyFade(clipId, fade) {
        if (state.engineReady && state.engine && typeof state.engine.setFade === 'function') {
            safeCall(state.engine.setFade, clipId, fade);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(clipId);
            if (clip) {
                clip.fade = fade;
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus(fade ? 'Fade applied' : 'Fade cleared');
    }

    function applyChromaKey(clipId, chromaKey) {
        if (state.engineReady && state.engine && typeof state.engine.setChromaKey === 'function') {
            safeCall(state.engine.setChromaKey, clipId, chromaKey);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(clipId);
            if (clip) {
                clip.chromaKey = chromaKey;
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus(chromaKey ? 'Chroma key applied' : 'Chroma key cleared');
    }

    function applyFlip(clipId, flip) {
        if (state.engineReady && state.engine && typeof state.engine.setFlip === 'function') {
            safeCall(state.engine.setFlip, clipId, flip);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(clipId);
            if (clip) {
                clip.flip = flip;
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus('Flip: ' + flip);
    }

    function applyMask(clipId, mask) {
        if (state.engineReady && state.engine) {
            safeCall(state.engine.setMask, clipId, mask);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(clipId);
            if (clip) {
                clip.mask = mask;
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus(mask ? 'Mask applied' : 'Mask cleared');
    }

    function addKeyframeWithEasing(clipId, prop, time, value, easing) {
        if (state.engineReady && state.engine) {
            safeCall(state.engine.addKeyframe, clipId, prop, time, value, easing);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(clipId);
            if (clip) {
                if (!clip.keyframes) clip.keyframes = {};
                if (!clip.keyframes[prop]) clip.keyframes[prop] = [];
                clip.keyframes[prop].push({time, value, easing: easing || 'linear'});
                clip.keyframes[prop].sort((a,b) => a.time - b.time);
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus('Keyframe added: ' + prop + ' @ ' + formatTime(time) + ' = ' + value + ' (' + (easing || 'linear') + ')');
    }

    function removeKeyframe(clipId, prop, time) {
        if (state.engineReady && state.engine) {
            safeCall(state.engine.removeKeyframe, clipId, prop, time);
            saveHistorySnapshot();
        } else {
            const clip = state.clips.get(clipId);
            if (clip && clip.keyframes && clip.keyframes[prop]) {
                clip.keyframes[prop] = clip.keyframes[prop].filter(kf => kf.time !== time);
                updatePropertiesPanel();
                saveHistorySnapshot();
            }
        }
        showStatus('Keyframe removed');
    }

    // ==================== SHARED TOOLBAR HANDLERS ====================
    // This function is now a no-op - toolbar handlers are wired in their respective tab init functions
    function initSharedToolbarHandlers() {
        // All toolbar import handlers are now initialized in their respective tab init functions:
        // - initMediaTab() handles pe-toolbar-import-audio / pe-toolbar-import-srt (Media tab)
        // - initAudioTab() handles pe-toolbar-import-audio-4 / pe-toolbar-import-srt-4 (Audio tab)
        // - initPhotoAnimTab() handles pe-toolbar-import-audio-6 / pe-toolbar-import-srt-6 (Photo Animation tab)
        // The remaining toolbar buttons (-2, -3, -5, -main) are wired here
        
        // Effects tab toolbar (-2)
        const audioBtn2 = els.toolbarImportAudio2;
        const audioBtn2Folder = els.toolbarImportAudio2Folder;
        const srtBtn2 = els.toolbarImportSrt2;
        const srtBtn2Folder = els.toolbarImportSrt2Folder;
        
        if (audioBtn2) {
            audioBtn2.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.multiple = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleAudioImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (audioBtn2Folder) {
            audioBtn2Folder.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.multiple = true;
                input.webkitdirectory = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleAudioImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (srtBtn2) {
            srtBtn2.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.srt';
                input.multiple = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleSrtImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (srtBtn2Folder) {
            srtBtn2Folder.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.srt';
                input.multiple = true;
                input.webkitdirectory = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleSrtImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        
        // Transitions tab toolbar (-3)
        const audioBtn3 = els.toolbarImportAudio3;
        const audioBtn3Folder = els.toolbarImportAudio3Folder;
        const srtBtn3 = els.toolbarImportSrt3;
        const srtBtn3Folder = els.toolbarImportSrt3Folder;
        
        if (audioBtn3) {
            audioBtn3.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.multiple = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleAudioImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (audioBtn3Folder) {
            audioBtn3Folder.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.multiple = true;
                input.webkitdirectory = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleAudioImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (srtBtn3) {
            srtBtn3.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.srt';
                input.multiple = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleSrtImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (srtBtn3Folder) {
            srtBtn3Folder.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.srt';
                input.multiple = true;
                input.webkitdirectory = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleSrtImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        
        // Stickers tab toolbar (-5)
        const audioBtn5 = els.toolbarImportAudio5;
        const audioBtn5Folder = els.toolbarImportAudio5Folder;
        const srtBtn5 = els.toolbarImportSrt5;
        const srtBtn5Folder = els.toolbarImportSrt5Folder;
        
        if (audioBtn5) {
            audioBtn5.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.multiple = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleAudioImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (audioBtn5Folder) {
            audioBtn5Folder.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.multiple = true;
                input.webkitdirectory = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleAudioImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (srtBtn5) {
            srtBtn5.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.srt';
                input.multiple = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleSrtImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (srtBtn5Folder) {
            srtBtn5Folder.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.srt';
                input.multiple = true;
                input.webkitdirectory = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleSrtImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        
        // Main timeline toolbar
        const audioBtnMain = els.toolbarImportAudioMain;
        const audioBtnMainFolder = els.toolbarImportAudioMainFolder;
        const srtBtnMain = els.toolbarImportSrtMain;
        const srtBtnMainFolder = els.toolbarImportSrtMainFolder;
        
        if (audioBtnMain) {
            audioBtnMain.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.multiple = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleAudioImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (audioBtnMainFolder) {
            audioBtnMainFolder.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.multiple = true;
                input.webkitdirectory = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleAudioImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (srtBtnMain) {
            srtBtnMain.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.srt';
                input.multiple = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleSrtImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
        if (srtBtnMainFolder) {
            srtBtnMainFolder.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.srt';
                input.multiple = true;
                input.webkitdirectory = true;
                input.style.display = 'none';
                document.body.appendChild(input);
                input.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) await handleSrtImport(file);
                    input.value = '';
                    document.body.removeChild(input);
                });
                input.click();
            });
        }
    }

    // ==================== EXPORT ====================
    function initExport() {
        els.btnExport.addEventListener('click', exportVideo);
        els.btnSaveProject.addEventListener('click', saveProject);
        els.btnLoadProject.addEventListener('click', () => els.loadProjectFile.click());
        els.loadProjectFile.addEventListener('change', loadProjectFile);
        els.btnUndo.addEventListener('click', undo);
        els.btnRedo.addEventListener('click', redo);
    }

    async function exportVideo() {
        if (!state.engineReady || !state.engine) {
            showStatus('Export requires engine', true);
            return;
        }

        els.btnExport.disabled = true;
        els.exportProgress.style.display = 'flex';
        els.progressFill.style.width = '0%';
        els.progressText.textContent = '0%';

        try {
            const options = {
                preset: 'long',
                quality: '720p',
                fps: 30,
                onProgress: (p) => {
                    const percent = Math.round(p * 100);
                    els.progressFill.style.width = percent + '%';
                    els.progressText.textContent = percent + '%';
                }
            };

            const blob = await safeCall(state.engine.exportVideo, options);

            if (blob) {
                const filename = 'video-' + formatTimeForFilename() + '.webm';
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.EditorUI.lastExportFilename = filename;
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                showStatus('Downloaded: ' + filename);
                els.btnExport.textContent = 'Downloaded ✓';
                setTimeout(() => { els.btnExport.textContent = 'Export / এক্সৈোর্ট'; }, 3000);
            } else {
                showStatus('Export failed - no blob returned', true);
            }
        } catch (e) {
            showStatus('Export error: ' + e.message, true);
        } finally {
            els.btnExport.disabled = false;
            setTimeout(() => els.exportProgress.style.display = 'none', 2000);
        }
    }

    function saveProject() {
        if (state.engineReady && state.engine) {
            const json = safeCall(state.engine.saveProject);
            if (json) {
                downloadJson(json, 'project-' + Date.now() + '.json');
                showStatus('Project saved');
            }
        } else {
            const project = {
                clips: Array.from(state.clips.entries()),
                currentTime: state.currentTime,
                duration: state.duration,
                selectedClipId: state.selectedClipId,
                timelineZoom: state.timelineZoom,
                markers: state.markers
            };
            downloadJson(JSON.stringify(project), 'project-' + Date.now() + '.json');
            showStatus('Project saved (demo)');
        }
    }

    function downloadJson(json, filename) {
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function loadProjectFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const json = evt.target.result;
                if (state.engineReady && state.engine) {
                    safeCall(state.engine.loadProject, json);
                    saveHistorySnapshot();
                    refreshFromEngine();
                    showStatus('Project loaded');
                } else {
                    const project = JSON.parse(json);
                    if (project.clips) {
                        state.clips = new Map(project.clips);
                    }
                    state.currentTime = project.currentTime || 0;
                    state.duration = project.duration || 10;
                    state.selectedClipId = project.selectedClipId || null;
                    state.timelineZoom = project.timelineZoom || 40;
                    state.pxPerSecond = state.timelineZoom;
                    state.markers = project.markers || [];
                    els.timelineZoom.value = state.timelineZoom;
                    renderTimeline();
                    renderTimelineRuler();
                    updatePropertiesPanel();
                    updateTimeDisplay();
                    updateDurationDisplay();
                    updateSeekBar();
                    updatePlayheadPosition();
                    showStatus('Project loaded (demo)');
                }
            } catch (err) {
                showStatus('Failed to load project: ' + err.message, true);
            }
        };
        reader.readAsText(file);
        els.loadProjectFile.value = '';
    }

    // ==================== INITIALIZATION ====================
    function init() {
        cacheElements();
        initEngine();
        initTabs();
        initMediaTab();
        initTextTab();
        initEffectsTab();
        initTransitionsTab();
        initAudioTab();
        initStickersTab();
        initPhotoAnimTab();
        initPreview();
        initTimeline();
        initAspectRatio();
        initSharedToolbarHandlers();
        initExport();

        renderTimelineRuler();
        renderTimeline();
        updatePropertiesPanel();
        updateDurationDisplay();
        updateTimeDisplay();
        updateSeekBar();
        renderPreviewFrame();

        console.log('[Editor] UI initialized');
    }

    window.EditorUI = {
        init,
        state: () => state,
        showStatus,
        lastExportFilename: null
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();