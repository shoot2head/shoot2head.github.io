/* CapCut-like editor engine — plain JS, no dependencies.
 * Exposes window.EditorEngine (singleton object) with the exact API contract
 * in the task brief. All editing is client-side; export is WebM via
 * canvas.captureStream() + MediaRecorder. No watermark, no server.
 */
(function (global) {
  'use strict';

  var FILTERS = {
    'none': '', 'grayscale': 'grayscale(1)', 'sepia': 'sepia(1)',
    'contrast': 'contrast(1.5)', 'saturate': 'saturate(1.8)',
    'vintage': 'sepia(0.6) contrast(1.1) brightness(1.05)',
    'bw': 'grayscale(1) contrast(1.2)',
    'brightness': 'brightness(1.5)',
    'warm': 'sepia(0.8) saturate(1.2)',
    'cool': 'hue-rotate(180deg) saturate(1.1)',
    'vivid': 'saturate(1.5) contrast(1.3)',
    'faded': 'contrast(0.6) brightness(1.2) saturate(0.7)',
    'noir': 'grayscale(1) contrast(1.4)'
  };
  var EASINGS = ['linear', 'ease-in', 'ease-out', 'ease-in-out'];
  var EFFECTS = ['none', 'zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'fade-in', 'fade-out'];
  // Colour controls (CONTRACT §10, paid→free): per-clip manual adjustments.
  // temperature/tint/exposure/hue default 0; saturation/contrast default 100 (%).
  var COLOR_ADJUST_DEFAULTS = { temperature: 0, tint: 0, exposure: 0, saturation: 100, hue: 0, contrast: 100 };
  var COLOR_ADJUST_RANGES = {
    temperature: [-100, 100], tint: [-100, 100], exposure: [-100, 100],
    saturation: [0, 200], hue: [-180, 180], contrast: [0, 200]
  };
  // Validate a colour-adjust object: every value must be a finite number
  // (throws otherwise); out-of-range values are CLAMPED to the range.
  // Missing keys take the defaults above. Returns a full 6-key object.
  function normalizeColorAdjust(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error('setColorAdjust: expected an object {temperature, tint, exposure, saturation, hue, contrast} or null');
    }
    var out = {};
    for (var key in COLOR_ADJUST_DEFAULTS) {
      var v = (key in input) ? input[key] : COLOR_ADJUST_DEFAULTS[key];
      if (typeof v !== 'number' || !isFinite(v)) {
        throw new Error('setColorAdjust: ' + key + ' must be a number');
      }
      var range = COLOR_ADJUST_RANGES[key];
      out[key] = clamp(v, range[0], range[1]);
    }
    return out;
  }
  // ctx.filter fragment for the exposure/saturation/hue/contrast parts.
  // Only non-default parts are emitted, so an untouched clip keeps the
  // exact filter string it had before (old behaviour unchanged).
  function colorFilterString(ca) {
    if (!ca) return '';
    var parts = [];
    if (ca.exposure) parts.push('brightness(' + (1 + ca.exposure / 100) + ')');
    if (ca.saturation !== 100) parts.push('saturate(' + (ca.saturation / 100) + ')');
    if (ca.hue) parts.push('hue-rotate(' + ca.hue + 'deg)');
    if (ca.contrast !== 100) parts.push('contrast(' + (ca.contrast / 100) + ')');
    return parts.join(' ');
  }
  // Temperature/tint overlays, drawn in the clip's own transformed space
  // (so they follow the mask, crop, rotation and flip of the frame).
  // Warm = orange, cool = blue, magenta/green for tint; alpha scales with
  // |value| and caps at 0.25 / 0.20 so the shift stays subtle.
  function drawColorOverlays(ctx, c, dw, dh) {
    var ca = c.colorAdjust;
    if (!ca) return;
    var overlays = [];
    if (ca.temperature > 0) overlays.push(['255,140,0', ca.temperature / 100 * 0.25]);
    else if (ca.temperature < 0) overlays.push(['0,120,255', -ca.temperature / 100 * 0.25]);
    if (ca.tint > 0) overlays.push(['255,0,255', ca.tint / 100 * 0.2]);
    else if (ca.tint < 0) overlays.push(['0,255,0', -ca.tint / 100 * 0.2]);
    if (!overlays.length) return;
    ctx.save();
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    overlays.forEach(function (o) {
      ctx.fillStyle = 'rgba(' + o[0] + ',' + o[1].toFixed(3) + ')';
      ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
    });
    ctx.restore();
  }
  var KEYFRAME_PROPS = ['scale', 'x', 'y', 'opacity', 'rotation', 'volume'];
  var KEYFRAME_DEFAULTS = { scale: 1, x: 0, y: 0, opacity: 1, rotation: 0, volume: 1 };
  // Combination research (2026-11-17): aspect presets copied from
  // Clipchamp / Flixier / Kapwing resize presets — free in all of them.
  var ASPECTS = { '16:9': [16, 9], '9:16': [9, 16], '1:1': [1, 1], '4:5': [4, 5] };
  var projectAspect = '16:9';
  var chromaScratch = null; // reused offscreen canvas for chroma-key passes

  var clips = [];
  var markers = []; // project timeline markers: {id, time, label} (CapCut "M" key)
  var currentTime = 0;
  var playing = false;
  var rafId = null;
  var lastTick = 0;
  var listeners = {};
  var uidCounter = 0;
  var mediaEls = {}; // clipId -> HTMLVideoElement / HTMLAudioElement (for render/export)
  // Photoanim bitmap cache: clipId -> Map(frameIndex -> ImageBitmap|canvas),
  // insertion order = LRU order, capped at FRAME_CACHE_MAX frames per clip.
  var FRAME_CACHE_MAX = 60;
  var frameCache = {};
  var frameDecoding = {}; // clipId -> { frameIndex: Promise } (dedup in-flight decodes)

  function uid(prefix) { uidCounter += 1; return (prefix || 'clip') + '_' + Date.now().toString(36) + '_' + uidCounter; }
  // Deep clone that keeps File/Blob values by reference (photoanim frames
  // are stored as File objects — JSON cloning would turn them into {}).
  function clone(o) {
    if (o === null || typeof o !== 'object') return o;
    if (o instanceof File || o instanceof Blob) return o;
    if (Array.isArray(o)) return o.map(clone);
    var out = {};
    for (var k in o) {
      if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = clone(o[k]);
    }
    return out;
  }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function clipSpeed(c) { return (typeof c.speed === 'number' && isFinite(c.speed) && c.speed > 0) ? c.speed : 1; }
  // Speed at `rel` seconds into the clip's visible part. Flat speed when no
  // ramp is set; piecewise-linear interpolation between ramp points otherwise.
  function speedAt(c, rel) {
    var ramp = c.speedRamp;
    if (!ramp || !ramp.length) return clipSpeed(c);
    if (rel <= ramp[0].time) return ramp[0].speed;
    var last = ramp[ramp.length - 1];
    if (rel >= last.time) return last.speed;
    for (var i = 0; i < ramp.length - 1; i++) {
      var a = ramp[i], b = ramp[i + 1];
      if (rel >= a.time && rel <= b.time) {
        var p = (rel - a.time) / (b.time - a.time || 1);
        return a.speed + (b.speed - a.speed) * p;
      }
    }
    return last.speed;
  }
  // Source seconds consumed after `rel` visible seconds (integral of speed).
  // With no ramp this is exactly rel * speed (previous behaviour).
  function sourceOffset(c, rel) {
    var ramp = c.speedRamp;
    if (!ramp || !ramp.length) return rel * clipSpeed(c);
    var total = 0, prevT = 0, prevS = ramp[0].speed;
    var pts = ramp.slice();
    if (pts[0].time > 0) pts.unshift({ time: 0, speed: pts[0].speed });
    for (var i = 1; i < pts.length; i++) {
      var t = Math.min(pts[i].time, rel);
      if (t <= prevT) continue;
      // Speed at t, interpolated (t may fall mid-segment).
      var sAtT = pts[i].speed;
      if (t < pts[i].time) {
        sAtT = prevS + (pts[i].speed - prevS) * ((t - prevT) / (pts[i].time - prevT));
      }
      total += (prevS + sAtT) / 2 * (t - prevT);
      prevT = t; prevS = sAtT;
      if (t >= rel) return total;
    }
    if (rel > prevT) total += prevS * (rel - prevT);
    return total;
  }
  // Visible seconds needed to consume the whole trimmed source range.
  function visibleDuration(c) {
    var srcLen = Math.max(0, c.trimOut - c.trimIn);
    var ramp = c.speedRamp;
    if (!ramp || !ramp.length) return srcLen / clipSpeed(c);
    // Binary search: sourceOffset(rel) is monotonic in rel.
    var lo = 0, hi = srcLen / 0.25 + 1; // slowest allowed speed is 0.25
    for (var i = 0; i < 40; i++) {
      var mid = (lo + hi) / 2;
      if (sourceOffset(c, mid) < srcLen) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function clipEnd(c) { return c.timelineStart + visibleDuration(c); }
  function findClip(id) {
    for (var i = 0; i < clips.length; i++) if (clips[i].id === id) return clips[i];
    return null;
  }
  function on(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
  }
  function off(event, cb) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(function (f) { return f !== cb; });
  }
  function emit(event, data) {
    (listeners[event] || []).slice().forEach(function (cb) {
      try { cb(data); } catch (e) { /* listener errors must not break the engine */ }
    });
  }
  function changed(clip) {
    if (clip) emit('clip-changed', clone(clip));
    emit('state-changed', null);
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function baseClip(overrides) {
    var c = {
      id: uid(), type: 'video', name: 'clip', src: '', duration: 0,
      timelineStart: 0, track: 'video', trimIn: 0, trimOut: 0,
      volume: 1, filter: null, effect: null, mask: null, speed: 1,
      keyframes: {}, transition: null,
      fade: null, // {in: seconds, out: seconds} — audio fade in/out
      speedRamp: null, // [{time (visible s), speed}] — null = flat speed
      chromaKey: null, // {color: '#00ff00', similarity 0..1, smoothness 0..1}
      flip: 'none', // 'none' | 'horizontal' | 'vertical'
      crop: null, // {x,y,w,h} fractions of the source frame (0..1), null = full frame
      rotation: 0, // base rotation in degrees; rotation keyframes override at their times
      colorAdjust: null // {temperature, tint, exposure, saturation, hue, contrast} or null (CONTRACT §10)
    };
    if (overrides) for (var k in overrides) c[k] = overrides[k];
    return c;
  }

  /* ---------- media ---------- */

  function readDuration(file, url) {
    return new Promise(function (resolve) {
      var el = document.createElement(file.type.indexOf('audio') === 0 ? 'audio' : 'video');
      var done = false;
      var finish = function (d) {
        if (done) return; done = true;
        try { el.src = ''; } catch (e) {}
        resolve(d);
      };
      var timer = setTimeout(function () { finish(5); }, 5000);
      el.preload = 'metadata';
      el.onloadedmetadata = function () {
        clearTimeout(timer);
        finish(isFinite(el.duration) && el.duration > 0 ? el.duration : 5);
      };
      el.onerror = function () { clearTimeout(timer); finish(5); };
      el.src = url;
    });
  }

  function addMedia(file) {
    return Promise.resolve().then(function () {
      if (!file) throw new Error('addMedia: no file');
      // Empty file: reject cleanly instead of handing a 0-byte blob to a
      // media element (which logs ERR_REQUEST_RANGE_NOT_SATISFIABLE and
      // then falls back to a bogus 5 s duration). A 0-byte file is broken
      // input, not a 5-second clip.
      if (typeof file.size === 'number' && file.size === 0) throw new Error('addMedia: empty file ' + (file.name || file.type || 'unknown'));
      var kind = (file.type || '').split('/')[0];
      var type, track;
      if (kind === 'video') { type = 'video'; track = 'video'; }
      else if (kind === 'audio') { type = 'audio'; track = 'audio'; }
      else if (kind === 'image') { type = 'image'; track = 'video'; }
      else throw new Error('addMedia: unsupported file type ' + (file.type || 'unknown'));
      var url = URL.createObjectURL(file);
      var durP = (type === 'image')
        ? Promise.resolve(5)
        : readDuration(file, url);
      return durP.then(function (dur) {
        var clip = baseClip({
          type: type, name: file.name || type, src: url, duration: dur,
          track: track, trimIn: 0, trimOut: dur
        });
        clips.push(clip);
        if (type === 'image') {
          // Preload so the first renderFrame() can draw immediately.
          var img = new Image();
          img.src = url;
          mediaEls[clip.id] = img;
        }
        emit('clip-added', clone(clip));
        emit('state-changed', null);
        return clone(clip);
      });
    });
  }

  // Shared audio import (CONTRACT §7): audio-only entry point used by every
  // panel — thin wrapper over addMedia that rejects non-audio files.
  function importAudio(file) {
    if (!file || (file.type || '').split('/')[0] !== 'audio') {
      return Promise.reject(new Error('importAudio: not an audio file: ' + (file && file.name ? file.name : 'no file')));
    }
    return addMedia(file);
  }

  function addTextClip(text, opts) {
    opts = opts || {};
    var dur = (typeof opts.duration === 'number' && opts.duration > 0) ? opts.duration : 3;
    var clip = baseClip({
      type: 'text', name: (opts.name || (text || 'text').slice(0, 30) || 'text'),
      src: '', duration: dur, track: 'text',
      trimIn: 0, trimOut: dur,
      text: text || '', fontSize: opts.fontSize || 48,
      color: opts.color || '#ffffff',
      position: opts.position ? clone(opts.position) : { x: 0.5, y: 0.85 },
      anim: opts.anim || 'none'
    });
    clips.push(clip);
    emit('clip-added', clone(clip));
    emit('state-changed', null);
    return clone(clip);
  }

/* ---------- photo animation (frame-sequence playback, 2026-11-17) ----------
 * SCALE DESIGN (CONTRACT §7): a sequence may hold ANY number of frames
 * — 18,000 for 10 min at 30 fps, 108,000 for 1 hour, longer allowed too.
 * Frames are stored as File objects — NEVER preloaded images and NEVER
 * object URLs. Bitmaps are decoded lazily via createImageBitmap into a
 * per-clip LRU cache capped at 60 frames; renderFrame draws from the
 * cache and triggers an async decode on a miss (drawing the nearest
 * cached frame meanwhile); export awaits the exact frame's decode before
 * drawing it. Import is chunked (50 files per chunk, yielding to the
 * event loop) with onProgress callbacks. No drawing tools anywhere: the
 * user draws photos elsewhere and imports them here. A 'photoanim' clip
 * is an ordered list of image frames played at fps (default 30);
 * duration = frames.length / fps. trimIn/trimOut clamp the visible
 * window in seconds, as for other clips. Frame index at timeline time t
 * is floor((trimIn + speed-aware offset) * fps) — with trimIn 0 and
 * speed 1 that is floor((t - timelineStart) * fps). */

  function validFps(fps) {
    return (typeof fps === 'number' && isFinite(fps) && fps >= 1 && fps <= 120) ? fps : null;
  }
  function photoDuration(c) {
    var n = (c.frames && c.frames.length) || 0;
    return n / (validFps(c.fps) || 30);
  }
  // Frame index for `rel` seconds into the clip's visible part.
  function photoFrameIndex(c, rel) {
    var n = (c.frames || []).length;
    if (!n) return 0;
    return clamp(Math.floor((c.trimIn + sourceOffset(c, rel)) * (validFps(c.fps) || 30)), 0, n - 1);
  }
  // Keep duration/trim window consistent after any frame-list or fps change.
  // If the clip was untrimmed (trimOut at the old end), trimOut follows the
  // new end so the whole sequence stays visible.
  function syncPhotoClip(c, wasAtEnd) {
    c.duration = photoDuration(c);
    if (wasAtEnd) c.trimOut = c.duration;
    else if (c.trimOut > c.duration) c.trimOut = c.duration;
    if (c.trimIn > c.trimOut) c.trimIn = c.trimOut;
    if (c.trimIn < 0) c.trimIn = 0;
  }

  /* ----- bitmap LRU cache (cap 60 frames per clip) ----- */
  function cacheMap(clipId) {
    if (!frameCache[clipId]) frameCache[clipId] = new Map();
    return frameCache[clipId];
  }
  function cacheGet(clipId, index) {
    var m = frameCache[clipId];
    if (!m || !m.has(index)) return null;
    var bmp = m.get(index);
    m.delete(index); m.set(index, bmp); // mark most-recently-used
    return bmp;
  }
  function cachePut(clipId, index, bmp) {
    var m = cacheMap(clipId);
    if (m.has(index)) m.delete(index);
    m.set(index, bmp);
    while (m.size > FRAME_CACHE_MAX) {
      var oldest = m.keys().next().value;
      var old = m.get(oldest);
      m.delete(oldest);
      if (old && typeof old.close === 'function') { try { old.close(); } catch (e) {} }
    }
  }
  // Drop decoded bitmaps behind `index` (export moves forward frame by
  // frame, so older frames are never needed again in that pass).
  function cacheEvictBefore(clipId, index) {
    var m = frameCache[clipId];
    if (!m) return;
    m.forEach(function (bmp, idx) {
      if (idx < index) {
        m.delete(idx);
        if (bmp && typeof bmp.close === 'function') { try { bmp.close(); } catch (e) {} }
      }
    });
  }
  function clearFrameCache(clipId) {
    var m = frameCache[clipId];
    if (m) {
      m.forEach(function (bmp) { if (bmp && typeof bmp.close === 'function') { try { bmp.close(); } catch (e) {} } });
      delete frameCache[clipId];
    }
    if (frameDecoding[clipId]) delete frameDecoding[clipId];
  }
  function getFrameCacheSize(clipId) {
    var m = frameCache[clipId];
    return m ? m.size : 0;
  }
  function nearestCachedFrame(clipId, index) {
    var m = frameCache[clipId];
    if (!m || !m.size) return null;
    var best = null, bestDist = Infinity;
    m.forEach(function (bmp, idx) {
      var d = Math.abs(idx - index);
      if (d < bestDist) { bestDist = d; best = bmp; }
    });
    return best;
  }
  // Decode one frame (File -> ImageBitmap, canvas fallback) into the LRU
  // cache. Concurrent requests for the same frame share one decode.
  // Never rejects: a failed decode resolves to null.
  function decodeFrame(clip, index) {
    var cached = cacheGet(clip.id, index);
    if (cached) return Promise.resolve(cached);
    var inFlight = (frameDecoding[clip.id] || {})[index];
    if (inFlight) return inFlight;
    var file = (clip.frames || [])[index];
    if (!file) return Promise.resolve(null);
    var p = Promise.resolve().then(function () {
      if (typeof createImageBitmap === 'function') return createImageBitmap(file);
      // Fallback: decode via a short-lived object URL into a canvas.
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          try {
            var cv = document.createElement('canvas');
            cv.width = img.naturalWidth; cv.height = img.naturalHeight;
            cv.getContext('2d').drawImage(img, 0, 0);
            resolve(cv);
          } catch (e) { reject(e); } finally { URL.revokeObjectURL(url); }
        };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decodeFrame: image failed to load')); };
        img.src = url;
      });
    }).then(function (bmp) {
      cachePut(clip.id, index, bmp);
      return bmp;
    }).catch(function () { return null; })
    .then(function (bmp) {
      if (frameDecoding[clip.id]) delete frameDecoding[clip.id][index];
      return bmp;
    });
    if (!frameDecoding[clip.id]) frameDecoding[clip.id] = {};
    frameDecoding[clip.id][index] = p;
    return p;
  }

  function checkImageFiles(files, fnName) {
    if (!files || !files.length) throw new Error(fnName + ': no files');
    files.forEach(function (f) {
      if ((f.type || '').split('/')[0] !== 'image') {
        throw new Error(fnName + ': not an image: ' + (f.name || 'file'));
      }
    });
  }
// Append File objects in chunks of 50, yielding to the event loop between
// chunks so ANY frame-count import never freezes the page — 18,000 for
// 10 min, 108,000 for 1 hour, longer allowed too. onProgress is called
// after each chunk with {done, total}. Files are stored as-is — no
// object URLs, no decoding at import time.
  function insertFilesChunked(clip, files, atIndex, onProgress) {
    var total = files.length;
    var idx = (typeof atIndex === 'number')
      ? clamp(Math.round(atIndex), 0, clip.frames.length) : clip.frames.length;
    var done = 0;
    function step(start) {
      var chunk = files.slice(start, start + 50);
      for (var i = 0; i < chunk.length; i++) {
        clip.frames.splice(idx + done + i, 0, chunk[i]);
        clip.frameNames.splice(idx + done + i, 0, chunk[i].name || 'frame');
      }
      done += chunk.length;
      if (onProgress) { try { onProgress({ done: done, total: total }); } catch (e) {} }
      if (start + 50 < files.length) return sleep(0).then(function () { return step(start + 50); });
      return Promise.resolve();
    }
    return step(0);
  }

  function addPhotoSequence(files, opts) {
    return Promise.resolve().then(function () {
      checkImageFiles(files, 'addPhotoSequence');
      opts = opts || {};
      var fps = validFps(opts.fps) || 30;
      var clip = baseClip({
        type: 'photoanim', name: opts.name || 'photo sequence', src: '',
        duration: 0, track: 'video', trimIn: 0, trimOut: 0,
        frames: [], frameNames: [], fps: fps, framesMissing: false
      });
      if (typeof opts.timelineStart === 'number') clip.timelineStart = Math.max(0, opts.timelineStart);
      clips.push(clip);
      return insertFilesChunked(clip, files, null, opts.onProgress).then(function () {
        syncPhotoClip(clip, true);
        emit('clip-added', clone(clip));
        emit('state-changed', null);
        return clone(clip);
      });
    });
  }

  function addFrames(clipId, files, atIndex) {
    var c = findClip(clipId);
    if (!c) return Promise.reject(new Error('addFrames: clip not found: ' + clipId));
    if (c.type !== 'photoanim') return Promise.reject(new Error('addFrames: not a photoanim clip: ' + clipId));
    try { checkImageFiles(files, 'addFrames'); } catch (e) { return Promise.reject(e); }
    var wasAtEnd = c.trimOut >= c.duration - 0.001;
    // A mid-sequence insert shifts later frame indices, which would stale
    // the index-keyed bitmap cache — clear it (frames re-decode on demand).
    var midInsert = (typeof atIndex === 'number') && atIndex < c.frames.length;
    return insertFilesChunked(c, files, atIndex, null).then(function () {
      if (midInsert) clearFrameCache(clipId);
      syncPhotoClip(c, wasAtEnd);
      changed(c);
    });
  }

  function removeFrame(clipId, index) {
    var c = findClip(clipId);
    if (!c) throw new Error('removeFrame: clip not found: ' + clipId);
    if (c.type !== 'photoanim') throw new Error('removeFrame: not a photoanim clip: ' + clipId);
    if (!c.frames || index < 0 || index >= c.frames.length) {
      throw new Error('removeFrame: index out of range: ' + index);
    }
    var wasAtEnd = c.trimOut >= c.duration - 0.001;
    c.frames.splice(index, 1);
    c.frameNames.splice(index, 1);
    // Drop the removed frame's bitmap (and shift nothing else: the cache is
    // keyed by frame index, so indices after the gap are stale — clear it).
    clearFrameCache(clipId);
    syncPhotoClip(c, wasAtEnd);
    changed(c);
    return clone(c);
  }

  function reorderFrames(clipId, fromIndex, toIndex) {
    var c = findClip(clipId);
    if (!c) throw new Error('reorderFrames: clip not found: ' + clipId);
    if (c.type !== 'photoanim') throw new Error('reorderFrames: not a photoanim clip: ' + clipId);
    var n = (c.frames && c.frames.length) || 0;
    if (fromIndex < 0 || fromIndex >= n || toIndex < 0 || toIndex >= n) {
      throw new Error('reorderFrames: index out of range');
    }
    if (fromIndex === toIndex) return clone(c);
    var mv = function (arr) { var v = arr.splice(fromIndex, 1)[0]; arr.splice(toIndex, 0, v); };
    mv(c.frames);
    mv(c.frameNames);
    // Cache is keyed by frame index — a reorder makes cached bitmaps land
    // on the wrong frames, so clear it (frames re-decode lazily on demand).
    clearFrameCache(clipId);
    changed(c);
    return clone(c);
  }

  function setSequenceFps(clipId, fps) {
    var c = findClip(clipId);
    if (!c) throw new Error('setSequenceFps: clip not found: ' + clipId);
    if (c.type !== 'photoanim') throw new Error('setSequenceFps: not a photoanim clip: ' + clipId);
    var f = validFps(fps);
    if (f === null) throw new Error('setSequenceFps: fps must be a number between 1 and 120');
    var wasAtEnd = c.trimOut >= c.duration - 0.001;
    c.fps = f;
    syncPhotoClip(c, wasAtEnd);
    changed(c);
    return clone(c);
  }

  function getFrameCount(clipId) {
    var c = findClip(clipId);
    if (!c) throw new Error('getFrameCount: clip not found: ' + clipId);
    return (c.frames && c.frames.length) || 0;
  }

  /* ---------- timeline ops ---------- */

  function addClipToTimeline(clipId, track, timelineStart) {
    var c = findClip(clipId);
    if (!c) throw new Error('addClipToTimeline: clip not found: ' + clipId);
    if (track) c.track = track;
    if (typeof timelineStart === 'number') c.timelineStart = Math.max(0, timelineStart);
    changed(c);
    return clone(c);
  }

  // opts.ripple: ripple delete — later clips on the SAME track shift left
  // to close the gap (CapCut main-track magnet / Premiere ripple delete on
  // one track). Default false: plain delete leaves a gap.
  function removeClip(clipId, opts) {
    var c = findClip(clipId);
    if (!c) return;
    opts = opts || {};
    var ripple = !!opts.ripple;
    var shift = 0, end = 0;
    if (ripple) { shift = visibleDuration(c); end = clipEnd(c); }
    if (mediaEls[clipId]) { try { mediaEls[clipId].pause(); mediaEls[clipId].src = ''; } catch (e) {} delete mediaEls[clipId]; }
    clearFrameCache(clipId); // closes decoded bitmaps for photoanim clips
    clips = clips.filter(function (x) { return x.id !== clipId; });
    if (ripple && shift > 0) {
      clips.forEach(function (x) {
        if (x.track === c.track && x.timelineStart >= end - 0.001) {
          x.timelineStart = Math.max(0, x.timelineStart - shift);
        }
      });
    }
    emit('clip-removed', clone(c));
    emit('state-changed', null);
  }

  function trimClip(clipId, trimIn, trimOut) {
    var c = findClip(clipId);
    if (!c) throw new Error('trimClip: clip not found: ' + clipId);
    var ti = clamp(trimIn, 0, c.duration);
    var to = clamp(trimOut, 0, c.duration);
    if (to <= ti) throw new Error('trimClip: trimOut must be > trimIn');
    c.trimIn = ti; c.trimOut = to;
    changed(c);
    return clone(c);
  }

  function splitClip(clipId, atTime) {
    var c = findClip(clipId);
    if (!c) throw new Error('splitClip: clip not found: ' + clipId);
    var start = c.timelineStart, end = clipEnd(c);
    if (!(atTime > start && atTime < end)) {
      throw new Error('splitClip: atTime must be inside the clip (' + start + '–' + end + ')');
    }
    var offset = atTime - start; // seconds into the visible part (timeline time)
    var srcOffset = sourceOffset(c, offset); // source seconds consumed (speed/ramp-aware)
    var b = clone(c);
    b.id = uid();
    b.trimIn = c.trimIn + srcOffset;
    b.timelineStart = atTime;
    if (b.speedRamp && b.speedRamp.length) {
      // Ramp times are relative to the clip's visible start — shift to B's start.
      var shifted = b.speedRamp
        .filter(function (p) { return p.time >= offset - 0.001; })
        .map(function (p) { return { time: Math.max(0, p.time - offset), speed: p.speed }; });
      if (!shifted.length || shifted[0].time > 0.001) {
        shifted.unshift({ time: 0, speed: speedAt(c, offset) });
      }
      b.speedRamp = shifted;
    }
    c.trimOut = c.trimIn + srcOffset;
    // insert B right after A
    var idx = clips.indexOf(c);
    clips.splice(idx + 1, 0, b);
    changed(c);
    emit('clip-added', clone(b));
    return [clone(c), clone(b)];
  }

  function moveClip(clipId, newStart) {
    var c = findClip(clipId);
    if (!c) throw new Error('moveClip: clip not found: ' + clipId);
    c.timelineStart = Math.max(0, newStart);
    changed(c);
    return clone(c);
  }

  // Duplicate a clip: same props (filter, crop, rotation, keyframes with
  // easing, trim, speed, ...), a new id, inserted right after the original
  // in the clip list and placed right after it on the timeline (its
  // timelineStart = the original's end). Photoanim frames (File objects)
  // are shared by reference — clone() keeps File/Blob values as-is.
  function duplicateClip(clipId) {
    var c = findClip(clipId);
    if (!c) throw new Error('duplicateClip: clip not found: ' + clipId);
    var dup = clone(c);
    dup.id = uid();
    dup.timelineStart = clipEnd(c);
    var idx = clips.indexOf(c);
    clips.splice(idx + 1, 0, dup);
    emit('clip-added', clone(dup));
    emit('state-changed', null);
    return clone(dup);
  }

  /* ---------- clip properties ---------- */

  function setVolume(clipId, v) {
    var c = findClip(clipId);
    if (!c) throw new Error('setVolume: clip not found: ' + clipId);
    c.volume = clamp(v, 0, 1);
    changed(c);
    return clone(c);
  }

  function setSpeed(clipId, speed) {
    var c = findClip(clipId);
    if (!c) throw new Error('setSpeed: clip not found: ' + clipId);
    if (typeof speed !== 'number' || !isFinite(speed) || speed < 0.25 || speed > 4) {
      throw new Error('setSpeed: speed must be a number between 0.25 and 4');
    }
    c.speed = speed;
    var el = mediaEls[clipId];
    if (el && typeof el.playbackRate === 'number') {
      try { el.playbackRate = speed; } catch (e) {}
    }
    changed(c);
    return clone(c);
  }

  /* ---------- combination features (2026-11-17) ---------- */

  // Audio fade in/out, in seconds (linear ramps). fade = {in, out} or null.
  function setFade(clipId, fade) {
    var c = findClip(clipId);
    if (!c) throw new Error('setFade: clip not found: ' + clipId);
    if (fade === null || fade === undefined) { c.fade = null; }
    else {
      var fi = (typeof fade.in === 'number' && isFinite(fade.in)) ? Math.max(0, fade.in) : 0;
      var fo = (typeof fade.out === 'number' && isFinite(fade.out)) ? Math.max(0, fade.out) : 0;
      c.fade = { in: fi, out: fo };
    }
    changed(c);
    return clone(c);
  }

  // Effective volume (0..1) of a clip at timeline time t: base volume x
  // 'volume' keyframes x fade in/out ramps. Pure function of state — the
  // export gain automation schedules the same curve.
  function effectiveVolume(c, t) {
    var rel = t - c.timelineStart;
    var v = (typeof c.volume === 'number') ? c.volume : 1;
    if (c.keyframes && c.keyframes.volume && c.keyframes.volume.length) {
      v *= keyframeValue(c, 'volume', rel);
    }
    if (c.fade) {
      var dur = visibleDuration(c);
      if (c.fade.in > 0 && rel < c.fade.in) v *= clamp(rel / c.fade.in, 0, 1);
      if (c.fade.out > 0 && rel > dur - c.fade.out) v *= clamp((dur - rel) / c.fade.out, 0, 1);
    }
    return clamp(v, 0, 1);
  }
  function getEffectiveVolume(clipId, t) {
    var c = findClip(clipId);
    if (!c) throw new Error('getEffectiveVolume: clip not found: ' + clipId);
    return effectiveVolume(c, t);
  }

  // Speed ramp: points [{time (visible seconds), speed}] — speed varies
  // linearly between points (FlexClip "Speed Curve", CapCut speed curve).
  // Points are sorted, clamped to 0.25–4. null clears the ramp (flat speed).
  function setSpeedRamp(clipId, points) {
    var c = findClip(clipId);
    if (!c) throw new Error('setSpeedRamp: clip not found: ' + clipId);
    if (points === null || points === undefined) { c.speedRamp = null; }
    else {
      if (!Array.isArray(points) || points.length < 2) {
        throw new Error('setSpeedRamp: need at least 2 points');
      }
      c.speedRamp = points.map(function (p) {
        if (typeof p.time !== 'number' || typeof p.speed !== 'number' ||
            !isFinite(p.time) || !isFinite(p.speed)) {
          throw new Error('setSpeedRamp: point needs numeric time and speed');
        }
        return { time: Math.max(0, p.time), speed: clamp(p.speed, 0.25, 4) };
      }).sort(function (a, b) { return a.time - b.time; });
    }
    changed(c);
    return clone(c);
  }

  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (!isFinite(n) || h.length !== 6) throw new Error('setChromaKey: bad color ' + hex);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Chroma key (green screen): removes pixels close to `color` from video /
  // image clips. Free in Clipchamp (green screen), Kapwing, Flixier, FlexClip.
  // opts = {color:'#00ff00', similarity 0..1, smoothness 0..1} or null to clear.
  function setChromaKey(clipId, opts) {
    var c = findClip(clipId);
    if (!c) throw new Error('setChromaKey: clip not found: ' + clipId);
    if (opts === null || opts === undefined) { c.chromaKey = null; }
    else {
      c.chromaKey = {
        color: hexToRgb(opts.color || '#00ff00'),
        similarity: clamp(typeof opts.similarity === 'number' ? opts.similarity : 0.3, 0, 1),
        smoothness: clamp(typeof opts.smoothness === 'number' ? opts.smoothness : 0.1, 0, 1)
      };
    }
    changed(c);
    return clone(c);
  }

  // Mirror a clip: 'none' | 'horizontal' | 'vertical' (free in Flixier/Clipchamp).
  function setFlip(clipId, mode) {
    var c = findClip(clipId);
    if (!c) throw new Error('setFlip: clip not found: ' + clipId);
    if (['none', 'horizontal', 'vertical'].indexOf(mode) === -1) {
      throw new Error('setFlip: mode must be none, horizontal or vertical');
    }
    c.flip = mode;
    changed(c);
    return clone(c);
  }

  // Crop a clip to a fraction of its source frame: {x,y,w,h} all in 0..1,
  // x+w and y+h at most 1. null clears the crop (full frame). Honoured by
  // drawCover, so renderFrame and export (which frame-steps renderFrame)
  // both crop. Keyframe x/y/scale still apply on top of the cropped frame.
  function setCrop(clipId, crop) {
    var c = findClip(clipId);
    if (!c) throw new Error('setCrop: clip not found: ' + clipId);
    if (crop === null || crop === undefined) { c.crop = null; }
    else {
      var vals = [crop.x, crop.y, crop.w, crop.h];
      var bad = vals.some(function (v) { return typeof v !== 'number' || !isFinite(v); }) ||
        crop.x < 0 || crop.y < 0 || crop.w <= 0 || crop.h <= 0 ||
        crop.x + crop.w > 1.000001 || crop.y + crop.h > 1.000001;
      if (bad) throw new Error('setCrop: crop must be {x,y,w,h} fractions of the frame (0..1)');
      c.crop = { x: crop.x, y: crop.y, w: crop.w, h: crop.h };
    }
    changed(c);
    return clone(c);
  }

  // Base rotation in degrees (any number; 90 = quarter turn clockwise).
  // Rotation keyframes, when present, override the base rotation at their
  // times (see renderFrame); with no rotation keyframes the base applies.
  function setRotation(clipId, degrees) {
    var c = findClip(clipId);
    if (!c) throw new Error('setRotation: clip not found: ' + clipId);
    if (typeof degrees !== 'number' || !isFinite(degrees)) {
      throw new Error('setRotation: degrees must be a number');
    }
    c.rotation = degrees;
    changed(c);
    return clone(c);
  }

  // Colour controls (CONTRACT §10, paid→free): manual per-clip adjustments,
  // free in CapCut Pro / Clipchamp / Kapwing as paid "colour correction".
  // adjust = {temperature, tint, exposure, saturation, hue, contrast} —
  // partial objects are fine (missing keys take defaults); out-of-range
  // values are clamped, non-numeric values throw. null clears the adjust
  // (back to the unadjusted frame). Honoured by drawCover, so renderFrame
  // and export (which frame-steps renderFrame) both apply it, combined
  // with the clip's filter/effect/mask/keyframes/crop/flip/chromaKey.
  function setColorAdjust(clipId, adjust) {
    var c = findClip(clipId);
    if (!c) throw new Error('setColorAdjust: clip not found: ' + clipId);
    if (adjust === null || adjust === undefined) c.colorAdjust = null;
    else c.colorAdjust = normalizeColorAdjust(adjust);
    changed(c);
    return clone(c);
  }

  // Ken Burns presets (MASTER PLAN §1): sets scale/x/y keyframes over the
  // clip's visible duration, all with ease-in-out, replacing any existing
  // scale/x/y keyframes (opacity/rotation/volume keyframes are untouched).
  // x/y are px offsets (as for the 'x'/'y' keyframe props); scale is a
  // multiplier. Pan presets hold a slight zoom so the pan never shows
  // empty edges.
  var KEN_BURNS = {
    'zoom-in': { scale: [1, 1.25], x: [0, 0], y: [0, 0] },
    'zoom-out': { scale: [1.25, 1], x: [0, 0], y: [0, 0] },
    'pan-left': { scale: [1.15, 1.15], x: [60, -60], y: [0, 0] },
    'pan-right': { scale: [1.15, 1.15], x: [-60, 60], y: [0, 0] },
    'kenburns': { scale: [1, 1.3], x: [40, -40], y: [20, -20] }
  };
  function applyKenBurns(clipId, preset) {
    var c = findClip(clipId);
    if (!c) throw new Error('applyKenBurns: clip not found: ' + clipId);
    var p = KEN_BURNS[preset];
    if (!p) throw new Error('applyKenBurns: unknown preset ' + preset);
    var dur = visibleDuration(c);
    ['scale', 'x', 'y'].forEach(function (prop) {
      c.keyframes[prop] = [
        { time: 0, value: p[prop][0], easing: 'ease-in-out' },
        { time: dur, value: p[prop][1], easing: 'ease-in-out' }
      ];
    });
    changed(c);
    return clone(c);
  }

  /* ---------- market-survey features (2026-11-17) ----------
   * Detach audio, freeze frame, timeline markers and snap-to-grid: free in
   * CapCut (Ctrl+Shift+S detach, M marker, Freeze in the clip toolbar),
   * Clipchamp (Audio tab > detach audio; Freeze Frame tutorial) and
   * Premiere/DaVinci (ripple delete, markers). All plain JS, no AI/credits.
   * Audio ducking is NOT a new method: use the existing 'volume' keyframes
   * (see research.md for the recipe) — the export gain automation already
   * schedules that curve via getEffectiveVolume. */

  // Detach audio: a video clip's sound becomes its own audio clip on the
  // audio track, sharing the same media src, trim window, speed/ramp and
  // fades, at the same timelineStart. The video clip is muted (volume 0)
  // so the sound is not doubled in preview/export; setVolume() on the
  // video clip restores it. The audio clip carries detachedFrom = video id.
  // Clipchamp/CapCut behaviour, minus Clipchamp's auto-download of the file.
  function detachAudio(clipId) {
    var c = findClip(clipId);
    if (!c) throw new Error('detachAudio: clip not found: ' + clipId);
    if (c.type !== 'video') throw new Error('detachAudio: only video clips have audio to detach: ' + clipId);
    if (!c.src) throw new Error('detachAudio: clip has no media source: ' + clipId);
    var audio = baseClip({
      type: 'audio', name: (c.name || 'clip') + ' audio', src: c.src,
      duration: c.duration, track: 'audio',
      timelineStart: c.timelineStart, trimIn: c.trimIn, trimOut: c.trimOut,
      volume: (typeof c.volume === 'number') ? c.volume : 1,
      speed: clipSpeed(c),
      speedRamp: c.speedRamp ? clone(c.speedRamp) : null,
      fade: c.fade ? clone(c.fade) : null,
      detachedFrom: c.id
    });
    if (c.keyframes && c.keyframes.volume && c.keyframes.volume.length) {
      audio.keyframes = { volume: clone(c.keyframes.volume) };
    }
    var idx = clips.indexOf(c);
    clips.splice(idx + 1, 0, audio);
    c.volume = 0; // video no longer plays its own sound
    c.detachedAudioId = audio.id;
    emit('clip-added', clone(audio));
    changed(c);
    return clone(audio);
  }

  // Freeze frame: capture what the timeline shows at `atTime` (defaults to
  // the source clip's start) as a still image clip on the video track,
  // lasting `duration` seconds (default 3, as in CapCut's Freeze). The
  // frame is captured through renderFrame, so filters/masks/text overlays
  // visible at that moment are baked in. Returns Promise<clip>.
  function freezeFrame(clipId, atTime, duration) {
    var c = findClip(clipId);
    if (!c) return Promise.reject(new Error('freezeFrame: clip not found: ' + clipId));
    if (c.type !== 'video' && c.type !== 'image' && c.type !== 'photoanim') {
      return Promise.reject(new Error('freezeFrame: cannot freeze a ' + c.type + ' clip: ' + clipId));
    }
    var dur = (typeof duration === 'number' && isFinite(duration)) ? duration : 3;
    if (dur <= 0 || dur > 30) return Promise.reject(new Error('freezeFrame: duration must be between 0 and 30 seconds'));
    var t = (typeof atTime === 'number' && isFinite(atTime)) ? atTime : c.timelineStart;
    t = clamp(t, c.timelineStart, Math.max(c.timelineStart, clipEnd(c) - 0.001));
    var canvas = document.createElement('canvas');
    var dims = aspectDims();
    canvas.width = dims[0]; canvas.height = dims[1];
    renderFrame(canvas, t);
    // Video elements seek asynchronously — re-render after a beat so the
    // captured frame is the right one, then snapshot the canvas.
    return sleep(300).then(function () {
      renderFrame(canvas, t);
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) return reject(new Error('freezeFrame: could not capture frame'));
          var file = new File([blob], 'freeze-frame.png', { type: 'image/png' });
          addMedia(file).then(function (clip) {
            var real = findClip(clip.id);
            if (!real) return reject(new Error('freezeFrame: frozen clip vanished'));
            real.name = 'freeze frame @ ' + t.toFixed(2) + 's';
            real.timelineStart = t;
            real.trimIn = 0;
            real.trimOut = Math.min(dur, real.duration);
            changed(real);
            resolve(clone(real));
          }, reject);
        }, 'image/png');
      });
    });
  }

  // Timeline markers: named points in time (CapCut "M" / Premiere "M").
  // Project-level, sorted by time, persisted in saveProject/loadProject.
  function addMarker(time, label) {
    if (typeof time !== 'number' || !isFinite(time) || time < 0) {
      throw new Error('addMarker: time must be a number >= 0');
    }
    var m = { id: uid('marker'), time: time, label: (typeof label === 'string') ? label : '' };
    markers.push(m);
    markers.sort(function (a, b) { return a.time - b.time; });
    emit('state-changed', null);
    return clone(m);
  }
  function getMarkers() { return clone(markers); }
  function removeMarker(id) {
    for (var i = 0; i < markers.length; i++) {
      if (markers[i].id === id) {
        markers.splice(i, 1);
        emit('state-changed', null);
        return true;
      }
    }
    throw new Error('removeMarker: marker not found: ' + id);
  }

  // Snap a timeline time to the nearest snap point within `threshold`
  // seconds (default 0.15): clip starts/ends, marker times, the playhead,
  // and multiples of the grid (default 1 s; pass grid: 0 to disable grid
  // snapping). Returns the original time when nothing is close enough.
  // CapCut/Premiere snap to clip edges and the playhead the same way.
  function snapTime(time, opts) {
    if (typeof time !== 'number' || !isFinite(time)) throw new Error('snapTime: time must be a number');
    opts = opts || {};
    var threshold = (typeof opts.threshold === 'number' && opts.threshold >= 0) ? opts.threshold : 0.15;
    var grid = (opts.grid === undefined || opts.grid === null) ? 1 : opts.grid;
    var best = time, bestD = Infinity;
    function consider(v) {
      var d = Math.abs(v - time);
      if (d <= threshold && d < bestD) { best = v; bestD = d; }
    }
    clips.forEach(function (c) { consider(c.timelineStart); consider(clipEnd(c)); });
    markers.forEach(function (m) { consider(m.time); });
    consider(currentTime);
    if (typeof grid === 'number' && grid > 0) consider(Math.round(time / grid) * grid);
    return best;
  }

  // Project aspect ratio — 16:9 / 9:16 / 1:1 / 4:5 (resize presets, free in
  // Clipchamp / Flixier / Kapwing / VEED). renderFrame letterboxes into the
  // canvas; exportVideo sizes its canvas to match.
  function setAspectRatio(label) {
    if (!(label in ASPECTS)) throw new Error('setAspectRatio: unknown ratio ' + label);
    projectAspect = label;
    emit('state-changed', null);
    return projectAspect;
  }
  function getAspectRatio() { return projectAspect; }
  // Canvas dims for an aspect label at a given height (base). aspect
  // defaults to the project aspect ratio; export passes the preset's
  // aspect ('16:9' for 'long', '9:16' for 'short').
  function aspectDims(base, aspect) {
    var a = ASPECTS[aspect || projectAspect];
    base = base || 720; // export height: 360 / 720 / 1080 by quality
    if (a[0] >= a[1]) return [Math.round(base * a[0] / a[1]), base];
    return [base, Math.round(base * a[1] / a[0])];
  }

  // --- SRT captions (import + export; SRT download is free in Clipchamp,
  // Kapwing, Flixier — auto-captions themselves stay out: they cost AI credits) ---
  function srtTimeToSec(s) {
    var m = s.match(/(\d+):(\d\d):(\d\d)[,.](\d+)/);
    if (!m) return null;
    return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
  }
  function secToSrtTime(sec) {
    var ms = Math.round(sec * 1000);
    var h = Math.floor(ms / 3600000); ms -= h * 3600000;
    var mi = Math.floor(ms / 60000); ms -= mi * 60000;
    var s = Math.floor(ms / 1000); ms -= s * 1000;
    function p(n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; }
    return p(h, 2) + ':' + p(mi, 2) + ':' + p(s, 2) + ',' + p(ms, 3);
  }
  function parseSRT(text) {
    var cues = [];
    var blocks = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\s*\n/);
    blocks.forEach(function (block) {
      var lines = block.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.length; });
      if (lines.length < 2) return;
      var timeLine = lines[0].indexOf('-->') !== -1 ? lines[0] : (lines[1] || '');
      var textLines = lines[0].indexOf('-->') !== -1 ? lines.slice(1) : lines.slice(2);
      var parts = timeLine.split('-->');
      if (parts.length !== 2) return;
      var start = srtTimeToSec(parts[0].trim()), end = srtTimeToSec(parts[1].trim());
      if (start === null || end === null || end <= start) return;
      cues.push({ start: start, end: end, text: textLines.join('\n') });
    });
    cues.sort(function (a, b) { return a.start - b.start; });
    return cues;
  }

  // Import an SRT file's text as caption (text) clips, one per cue.
  function importCaptions(srtText, opts) {
    opts = opts || {};
    var cues = parseSRT(srtText);
    var created = cues.map(function (cue) {
      var clip = baseClip({
        type: 'text', name: 'caption ' + secToSrtTime(cue.start),
        src: '', duration: cue.end - cue.start, track: 'text',
        timelineStart: cue.start, trimIn: 0, trimOut: cue.end - cue.start,
        text: cue.text, fontSize: opts.fontSize || 40,
        color: opts.color || '#ffffff',
        position: opts.position ? clone(opts.position) : { x: 0.5, y: 0.85 },
        anim: opts.anim || 'none'
      });
      clips.push(clip);
      emit('clip-added', clone(clip));
      return clone(clip);
    });
    emit('state-changed', null);
    return created;
  }

  // Export all text clips as an SRT document (timeline order).
  function exportCaptions() {
    var caps = clips.filter(function (c) { return c.type === 'text'; })
      .sort(function (a, b) { return a.timelineStart - b.timelineStart; });
    return caps.map(function (c, i) {
      return (i + 1) + '\n' + secToSrtTime(c.timelineStart) + ' --> ' +
        secToSrtTime(clipEnd(c)) + '\n' + (c.text || '') + '\n';
    }).join('\n');
  }

  function setFilter(clipId, name) {
    var c = findClip(clipId);
    if (!c) throw new Error('setFilter: clip not found: ' + clipId);
    if (name !== null && !(name in FILTERS)) throw new Error('setFilter: unknown filter ' + name);
    c.filter = (name === 'none') ? null : name;
    changed(c);
    return clone(c);
  }

  function setEffect(clipId, name) {
    var c = findClip(clipId);
    if (!c) throw new Error('setEffect: clip not found: ' + clipId);
    if (name !== null && EFFECTS.indexOf(name) === -1) throw new Error('setEffect: unknown effect ' + name);
    c.effect = (name === 'none') ? null : name;
    changed(c);
    return clone(c);
  }

  function setMask(clipId, mask) {
    var c = findClip(clipId);
    if (!c) throw new Error('setMask: clip not found: ' + clipId);
    c.mask = mask ? clone(mask) : null;
    changed(c);
    return clone(c);
  }

  function addKeyframe(clipId, prop, time, value, easing) {
    var c = findClip(clipId);
    if (!c) throw new Error('addKeyframe: clip not found: ' + clipId);
    if (KEYFRAME_PROPS.indexOf(prop) === -1) throw new Error('addKeyframe: unknown prop ' + prop);
    // Optional 4th arg: easing for the segment STARTING at this keyframe
    // (interpolation between keyframe i and i+1 uses keyframe i's easing).
    var e = (easing === undefined || easing === null) ? 'linear' : easing;
    if (EASINGS.indexOf(e) === -1) throw new Error('addKeyframe: unknown easing ' + easing);
    if (!c.keyframes[prop]) c.keyframes[prop] = [];
    c.keyframes[prop] = c.keyframes[prop].filter(function (k) { return Math.abs(k.time - time) > 0.001; });
    c.keyframes[prop].push({ time: time, value: value, easing: e });
    c.keyframes[prop].sort(function (a, b) { return a.time - b.time; });
    changed(c);
    return clone(c);
  }

  function removeKeyframe(clipId, prop, time) {
    var c = findClip(clipId);
    if (!c) throw new Error('removeKeyframe: clip not found: ' + clipId);
    if (c.keyframes[prop]) {
      c.keyframes[prop] = c.keyframes[prop].filter(function (k) { return Math.abs(k.time - time) > 0.001; });
    }
    changed(c);
    return clone(c);
  }

  function getClipState(clipId) {
    var c = findClip(clipId);
    if (!c) throw new Error('getClipState: clip not found: ' + clipId);
    return clone(c);
  }

  function setTransition(clipId, transition) {
    var c = findClip(clipId);
    if (!c) throw new Error('setTransition: clip not found: ' + clipId);
    if (transition && transition.type &&
        ['fade', 'dissolve', 'wipe', 'slide', 'none'].indexOf(transition.type) === -1) {
      throw new Error('setTransition: unknown transition type ' + transition.type);
    }
    c.transition = transition ? clone(transition) : null;
    changed(c);
    return clone(c);
  }

  function getDuration() {
    var d = 0;
    clips.forEach(function (c) { d = Math.max(d, clipEnd(c)); });
    return d;
  }

  /* ---------- playback ---------- */

  function tick(now) {
    if (!playing) return;
    var dt = (now - lastTick) / 1000;
    lastTick = now;
    currentTime += dt;
    var dur = getDuration();
    if (dur > 0 && currentTime >= dur) { currentTime = dur; emit('timeupdate', currentTime); pause(); return; }
    emit('timeupdate', currentTime);
    rafId = requestAnimationFrame(tick);
  }

  function seek(t) {
    var dur = getDuration();
    currentTime = clamp(t, 0, dur > 0 ? dur : 0);
    emit('timeupdate', currentTime);
    return currentTime;
  }

  function play() {
    if (playing) return;
    if (getDuration() > 0 && currentTime >= getDuration()) currentTime = 0;
    playing = true;
    lastTick = performance.now();
    rafId = requestAnimationFrame(tick);
    emit('state-changed', null);
  }

  function pause() {
    playing = false;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    emit('state-changed', null);
  }

  function getCurrentTime() { return currentTime; }
  function isPlaying() { return playing; }

  /* ---------- rendering ---------- */

  // Easing for a normalised segment position p (0..1). 'linear' is the
  // default and the fallback for legacy keyframes stored without easing.
  function easeValue(easing, p) {
    p = clamp(p, 0, 1);
    if (easing === 'ease-in') return p * p;
    if (easing === 'ease-out') return 1 - (1 - p) * (1 - p);
    if (easing === 'ease-in-out') return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    return p; // 'linear'
  }

  function keyframeValue(c, prop, relTime) {
    var frames = c.keyframes[prop];
    var def = KEYFRAME_DEFAULTS[prop];
    if (!frames || !frames.length) return def;
    if (relTime <= frames[0].time) return frames[0].value;
    var last = frames[frames.length - 1];
    if (relTime >= last.time) return last.value;
    for (var i = 0; i < frames.length - 1; i++) {
      var a = frames[i], b = frames[i + 1];
      if (relTime >= a.time && relTime <= b.time) {
        // The segment's easing comes from keyframe i (the segment's start).
        var p = easeValue(a.easing, (relTime - a.time) / (b.time - a.time || 1));
        return a.value + (b.value - a.value) * p;
      }
    }
    return def;
  }

  function getMediaEl(c) {
    if (mediaEls[c.id]) {
      var ex = mediaEls[c.id];
      if (ex && typeof ex.playbackRate === 'number') {
        try { ex.playbackRate = clipSpeed(c); } catch (e) {}
      }
      return mediaEls[c.id];
    }
    if (c.type !== 'video' && c.type !== 'audio') return null;
    var el = document.createElement(c.type === 'audio' ? 'audio' : 'video');
    el.src = c.src;
    el.preload = 'auto';
    el.playbackRate = clipSpeed(c);
    el.muted = (c.type === 'video'); // preview muted; export mixes audio separately
    el.playsInline = true;
    mediaEls[c.id] = el;
    return el;
  }

  function seekMediaEl(el, t) {
    return new Promise(function (resolve) {
      if (!el || !isFinite(t)) return resolve();
      try {
        if (Math.abs(el.currentTime - t) < 0.05) return resolve();
        var done = false;
        var finish = function () { if (!done) { done = true; resolve(); } };
        var timer = setTimeout(finish, 200);
        el.addEventListener('seeked', function h() {
          el.removeEventListener('seeked', h);
          clearTimeout(timer); finish();
        });
        el.currentTime = t;
      } catch (e) { resolve(); }
    });
  }

  // mask x/y/w/h are fractions of the canvas (0..1); values >1 are treated as px.
  function toPx(v, size) { return v > 1 ? v : v * size; }

  function applyMask(ctx, mask, W, H) {
    if (!mask) return;
    var x = toPx(mask.x || 0, W), y = toPx(mask.y || 0, H);
    var w = toPx(mask.w || 1, W), h = toPx(mask.h || 1, H);
    ctx.beginPath();
    if (mask.shape === 'circle') {
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    } else if (mask.shape === 'ellipse') {
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.clip();
    // feather: soft edge is approximated by a blurred redraw in the caller path;
    // stored value is honoured in state; hard clip is the deterministic fallback.
  }

  // Draw one image/video element cover-fitting the canvas, honouring the
  // clip's mask/filter/keyframes/effect/flip/chromaKey/crop. alphaScale
  // multiplies the clip opacity (used for the onion-skin ghost frame: 0.3).
  // wipeP (0..1, or null) reveals only the left wipeP fraction of the
  // canvas — the 'wipe' transition. crop draws only the cropped source
  // rect (fractions of the frame) cover-fitted to the canvas.
  function drawCover(ctx, el, W, H, c, kx, ky, scale, effScale, effX, opacity, effOpacity, rotation, alphaScale, wipeP) {
    // ImageBitmap exposes width/height; <img>/<video> expose naturalWidth/videoWidth.
    var iw = el.videoWidth || el.naturalWidth || el.width;
    var ih = el.videoHeight || el.naturalHeight || el.height;
    if (!iw || !ih) return;
    // Source rect: the crop window, or the whole frame when uncropped.
    var sx = 0, sy = 0, sw = iw, sh = ih;
    if (c.crop && typeof c.crop.w === 'number' && c.crop.w > 0 &&
        typeof c.crop.h === 'number' && c.crop.h > 0) {
      sx = (c.crop.x || 0) * iw; sy = (c.crop.y || 0) * ih;
      sw = c.crop.w * iw; sh = c.crop.h * ih;
    }
    var cover = Math.max(W / sw, H / sh);
    var dw = sw * cover, dh = sh * cover;
    ctx.save();
    if (c.mask) applyMask(ctx, c.mask, W, H);
    if (typeof wipeP === 'number') {
      ctx.beginPath();
      ctx.rect(0, 0, clamp(wipeP, 0, 1) * W, H);
      ctx.clip();
    }
    ctx.filter = [FILTERS[c.filter] || '', colorFilterString(c.colorAdjust)].filter(function (s) { return !!s; }).join(' ');
    ctx.globalAlpha = clamp(opacity * effOpacity * alphaScale, 0, 1);
    ctx.translate(W / 2 + kx + effX, H / 2 + ky);
    ctx.rotate((rotation || 0) * Math.PI / 180);
    var fx = (c.flip === 'horizontal') ? -1 : 1;
    var fy = (c.flip === 'vertical') ? -1 : 1;
    ctx.scale(scale * effScale * fx, scale * effScale * fy);
    var srcRect = { sx: sx, sy: sy, sw: sw, sh: sh };
    var srcEl = c.chromaKey ? chromaKeyed(el, dw, dh, c.chromaKey, srcRect) : el;
    try {
      if (srcEl) {
        if (c.chromaKey) ctx.drawImage(srcEl, -dw / 2, -dh / 2, dw, dh);
        else ctx.drawImage(srcEl, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
      }
    } catch (e) {}
    // Temperature/tint overlays on top of the drawn frame, inside the same
    // transform/mask — so they combine with filter, crop, flip and keyframes.
    drawColorOverlays(ctx, c, dw, dh);
    ctx.restore();
    ctx.filter = 'none';
  }

  function renderFrame(canvas, t, opts) {
    if (!canvas) throw new Error('renderFrame: no canvas');
    opts = opts || {};
    var onionSkin = !!opts.onionSkin; // photoanim only: ghost of previous frame
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // Letterbox to the project aspect ratio (default 16:9 = full canvas).
    var ar = ASPECTS[projectAspect];
    var rw = W, rh = H, ox = 0, oy = 0;
    if (W / H > ar[0] / ar[1]) { rw = Math.floor(H * ar[0] / ar[1]); ox = Math.floor((W - rw) / 2); }
    else if (W / H < ar[0] / ar[1]) { rh = Math.floor(W * ar[1] / ar[0]); oy = Math.floor((H - rh) / 2); }
    ctx.save();
    ctx.translate(ox, oy);
    ctx.beginPath();
    ctx.rect(0, 0, rw, rh);
    ctx.clip();
    W = rw; H = rh;

    // video/image layer first, then text overlays (text track on top)
    var ordered = clips.slice().sort(function (a, b) {
      var rank = { video: 0, audio: 0, image: 0, text: 1 };
      return (rank[a.type] || 0) - (rank[b.type] || 0);
    });

    ordered.forEach(function (c) {
      var start = c.timelineStart, end = clipEnd(c);
      if (t < start || t >= end) return;
      if (c.type === 'audio') return;
      var rel = t - start; // seconds into visible part
      var progress = visibleDuration(c) > 0 ? rel / visibleDuration(c) : 0;

      // keyframe values (time is seconds into the clip's visible part)
      var scale = keyframeValue(c, 'scale', rel);
      var kx = keyframeValue(c, 'x', rel);
      var ky = keyframeValue(c, 'y', rel);
      var opacity = keyframeValue(c, 'opacity', rel);
      // Base rotation applies when no rotation keyframes exist; with
      // keyframes, the keyframe curve overrides the base at its times.
      var rotation = (c.keyframes && c.keyframes.rotation && c.keyframes.rotation.length)
        ? keyframeValue(c, 'rotation', rel)
        : ((typeof c.rotation === 'number' && isFinite(c.rotation)) ? c.rotation : 0);

      // effect presets (applied on top of keyframes)
      var effScale = 1, effX = 0, effOpacity = 1;
      if (c.effect === 'zoom-in') effScale = 1 + progress * 0.2;
      else if (c.effect === 'zoom-out') effScale = 1.2 - progress * 0.2;
      else if (c.effect === 'pan-left') effX = -progress * W * 0.08;
      else if (c.effect === 'pan-right') effX = progress * W * 0.08;
      else if (c.effect === 'fade-in') effOpacity = progress;
      else if (c.effect === 'fade-out') effOpacity = 1 - progress;
      // transition at clip start: fade/dissolve fade opacity in; wipe
      // reveals left-to-right (wipeP, passed to drawCover / text clip);
      // slide slides the clip in from the right (effX offset).
      var wipeP = null;
      if (c.transition && c.transition.type) {
        var td = c.transition.duration || 0.5;
        if (rel < td) {
          if (c.transition.type === 'fade' || c.transition.type === 'dissolve') {
            effOpacity *= (rel / td);
          } else if (c.transition.type === 'wipe') {
            wipeP = rel / td;
          } else if (c.transition.type === 'slide') {
            effX += (1 - rel / td) * W;
          }
        }
      }

      if (c.type === 'text') {
        ctx.save();
        if (typeof wipeP === 'number') {
          ctx.beginPath();
          ctx.rect(0, 0, clamp(wipeP, 0, 1) * W, H);
          ctx.clip();
        }
        ctx.globalAlpha = clamp(opacity * effOpacity, 0, 1);
        ctx.filter = colorFilterString(c.colorAdjust); // colour adjust applies to text clips too
        var fs = c.fontSize || 48;
        var animScale = 1;
        if (c.anim === 'pop') animScale = 0.8 + 0.2 * Math.min(1, rel * 4);
        ctx.font = 'bold ' + Math.round(fs * animScale) + 'px sans-serif';
        ctx.fillStyle = c.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var px = toPx((c.position && c.position.x != null) ? c.position.x : 0.5, W) + effX;
        var py = toPx((c.position && c.position.y != null) ? c.position.y : 0.5, H) + ky;
        ctx.translate(px, py);
        ctx.rotate(rotation * Math.PI / 180);
        if (c.anim === 'typewriter') {
          var n = Math.floor((c.text || '').length * clamp(rel * 2, 0, 1));
          ctx.fillText((c.text || '').slice(0, n), 0, 0);
        } else {
          ctx.fillText(c.text || '', 0, 0);
        }
        ctx.restore();
        return;
      }

      // photoanim: frame-sequence playback (exportVideo frame-steps through
      // renderFrameAsync, so sequences export automatically). Filters/masks/
      // keyframes/effects/transitions/flip/chromaKey apply via drawCover,
      // exactly as for image clips. With onionSkin on, the previous frame
      // is drawn at ~0.3 opacity beneath the current frame.
      // LAZY: the frame is drawn from the 60-frame LRU bitmap cache; on a
      // miss an async decode is triggered and the nearest cached frame is
      // drawn meanwhile (nothing is drawn if the cache is empty yet).
      if (c.type === 'photoanim') {
        var frames = c.frames || [];
        if (!frames.length) return;
        var fi = photoFrameIndex(c, rel);
        if (onionSkin && fi > 0) {
          var prev = cacheGet(c.id, fi - 1);
          if (prev) drawCover(ctx, prev, W, H, c, kx, ky, scale, effScale, effX, opacity, effOpacity, rotation, 0.3, wipeP);
          else decodeFrame(c, fi - 1);
        }
        var cur = cacheGet(c.id, fi);
        if (cur) {
          drawCover(ctx, cur, W, H, c, kx, ky, scale, effScale, effX, opacity, effOpacity, rotation, 1, wipeP);
        } else {
          decodeFrame(c, fi);
          var near = nearestCachedFrame(c.id, fi);
          if (near) drawCover(ctx, near, W, H, c, kx, ky, scale, effScale, effX, opacity, effOpacity, rotation, 1, wipeP);
        }
        return;
      }

      // video / image
      var el = null;
      if (c.type === 'video') {
        el = getMediaEl(c);
        if (el) {
          var mediaT = c.trimIn + sourceOffset(c, rel);
          if (Math.abs(el.currentTime - mediaT) > 0.08) {
            try { el.currentTime = mediaT; } catch (e) {}
          }
          if (!el.videoWidth) return; // not loaded yet — frame stays black
        } else return;
      } else if (c.type === 'image') {
        el = mediaEls[c.id];
        if (!el) {
          var img = new Image();
          img.src = c.src;
          mediaEls[c.id] = img;
          el = img;
        }
        if (!el.complete || !el.naturalWidth) return;
      }
      if (!el) return;

      drawCover(ctx, el, W, H, c, kx, ky, scale, effScale, effX, opacity, effOpacity, rotation, 1, wipeP);
    });
    ctx.restore();
  }

  // Async render: await the exact photoanim frame's decode before drawing,
  // so export captures the right frame (never a stale/nearest one). Preview
  // uses the sync renderFrame (cache + async decode on miss) instead.
  function renderFrameAsync(canvas, t, opts) {
    opts = opts || {};
    var jobs = [];
    clips.forEach(function (c) {
      if (c.type !== 'photoanim' || !(c.frames || []).length) return;
      if (t < c.timelineStart || t >= clipEnd(c)) return;
      var fi = photoFrameIndex(c, t - c.timelineStart);
      jobs.push(decodeFrame(c, fi).then(function () {
        if (opts.onionSkin && fi > 0) return decodeFrame(c, fi - 1);
      }));
    });
    return Promise.all(jobs).then(function () { renderFrame(canvas, t, opts); });
  }

  // Chroma-key pass: draw the frame to a scratch canvas, zero the alpha of
  // pixels close to the key colour, return the scratch canvas (or the
  // original element if anything fails). The scratch is sized dw x dh, the
  // same rect the caller draws — so no extra distortion. srcRect (optional)
  // draws only the crop window of the source into the scratch.
  function chromaKeyed(el, dw, dh, key, srcRect) {
    try {
      var w = Math.max(1, Math.round(dw)), h = Math.max(1, Math.round(dh));
      if (!chromaScratch) chromaScratch = document.createElement('canvas');
      if (chromaScratch.width !== w || chromaScratch.height !== h) {
        chromaScratch.width = w; chromaScratch.height = h;
      }
      var sctx = chromaScratch.getContext('2d');
      sctx.clearRect(0, 0, w, h);
      if (srcRect) sctx.drawImage(el, srcRect.sx, srcRect.sy, srcRect.sw, srcRect.sh, 0, 0, w, h);
      else sctx.drawImage(el, 0, 0, w, h);
      var img = sctx.getImageData(0, 0, w, h);
      var d = img.data;
      var kr = key.color[0], kg = key.color[1], kb = key.color[2];
      var sim = key.similarity, sm = key.smoothness;
      for (var i = 0; i < d.length; i += 4) {
        var dr = d[i] - kr, dg = d[i + 1] - kg, db = d[i + 2] - kb;
        var dist = Math.sqrt((dr * dr + dg * dg + db * db) / (3 * 255 * 255));
        var a = (sm > 0) ? clamp((dist - sim) / sm, 0, 1) : (dist < sim ? 0 : 1);
        d[i + 3] = Math.round(d[i + 3] * a);
      }
      sctx.putImageData(img, 0, 0);
      return chromaScratch;
    } catch (e) { return el; }
  }

  /* ---------- export ---------- */

  function pickMime() {
    var candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (var i = 0; i < candidates.length; i++) {
      try { if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidates[i])) return candidates[i]; } catch (e) {}
    }
    return '';
  }

  // Export the timeline as WebM (MediaRecorder + canvas.captureStream).
  // opts: {preset, quality, fps, onProgress} — nothing more.
  // preset: 'long' (16:9 horizontal, default) | 'short' (9:16 vertical) —
  //   sets the export canvas aspect; renderFrame letterboxes into it.
  // quality: '360p' (min) | '720p' (default) | '1080p' (max, no 4K).
  // fps: user-set frame rate, default 30, max 90 (higher values clamp).
  // The video bitrate is set EXPLICITLY — never the browser's low default —
  // because the owner converts the WebM to MP4 himself and the export must
  // look clear: 360p -> 2,500,000 bps, 720p -> 8,000,000, 1080p ->
  // 12,000,000; audio 192,000 bps. Codec: VP9 preferred
  // ('video/webm;codecs=vp9,opus') when supported, else VP8
  // ('video/webm;codecs=vp8,opus'). WebM only — no MP4 work.
  function exportVideo(opts) {
    opts = opts || {};
    var preset = opts.preset || 'long';
    if (preset !== 'long' && preset !== 'short') {
      return Promise.reject(new Error("exportVideo: preset must be 'long' or 'short'"));
    }
    var quality = opts.quality || '720p';
    var videoBitsPerSecond;
    if (quality === '360p') videoBitsPerSecond = 2500000;
    else if (quality === '720p') videoBitsPerSecond = 8000000;
    else if (quality === '1080p') videoBitsPerSecond = 12000000;
    else return Promise.reject(new Error("exportVideo: quality must be '360p', '720p' or '1080p'"));
    var qualityHeight = quality === '360p' ? 360 : quality === '1080p' ? 1080 : 720;
    // fps is user-controllable: default 30, max 90 (clamp higher values).
    var fps = (typeof opts.fps === 'number' && isFinite(opts.fps) && opts.fps > 0) ? opts.fps : 30;
    if (fps > 90) fps = 90;
    var audioBitsPerSecond = 192000;
    return new Promise(function (resolve, reject) {
      var duration = getDuration();
      if (!clips.length || duration <= 0) return reject(new Error('exportVideo: nothing to export'));
      if (typeof MediaRecorder === 'undefined') return reject(new Error('exportVideo: MediaRecorder not supported in this browser'));
      var canvas = document.createElement('canvas');
      // Export canvas follows the PRESET aspect (not the project aspect)
      // at the quality's height; renderFrame letterboxes the project into it.
      var dims = aspectDims(qualityHeight, preset === 'short' ? '9:16' : '16:9');
      canvas.width = dims[0]; canvas.height = dims[1];
      var stream;
      // captureStream(0): frames are pushed manually with requestFrame()
      // after each draw — a detached canvas gets no automatic BeginFrames
      // in headless Chromium, so captureStream(30) can record nothing.
      try { stream = canvas.captureStream(0); } catch (e) { return reject(e); }

      // --- audio mixing (best effort; video-only export if it fails) ---
      var audioCtx = null, audioEls = [], audioDest = null;
      try {
        var audioClips = clips.filter(function (c) { return c.type === 'audio' || c.type === 'video'; });
        if (audioClips.length) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (AC) {
            audioCtx = new AC();
            var dest = audioCtx.createMediaStreamDestination();
            var t0 = audioCtx.currentTime + 0.05; // export clock origin
            audioClips.forEach(function (c) {
              try {
                var el = getMediaEl(c);
                if (!el) return;
                el.playbackRate = speedAt(c, 0);
                var src = audioCtx.createMediaElementSource(el);
                var gain = audioCtx.createGain();
                src.connect(gain); gain.connect(dest);
                // Schedule fade in/out + volume keyframes on the gain node;
                // falls back to the flat volume if scheduling throws.
                try {
                  var start = t0 + c.timelineStart;
                  var dur = visibleDuration(c);
                  var vols = [{ t: 0, v: effectiveVolume(c, c.timelineStart) }];
                  if (c.fade) {
                    if (c.fade.in > 0) vols.push({ t: c.fade.in, v: effectiveVolume(c, c.timelineStart + c.fade.in) });
                    if (c.fade.out > 0) vols.push({ t: Math.max(0, dur - c.fade.out), v: effectiveVolume(c, c.timelineStart + Math.max(0, dur - c.fade.out)) });
                  }
                  (c.keyframes.volume || []).forEach(function (k) {
                    vols.push({ t: k.time, v: effectiveVolume(c, c.timelineStart + k.time) });
                  });
                  vols.push({ t: dur, v: effectiveVolume(c, c.timelineStart + dur) });
                  vols.sort(function (a, b) { return a.t - b.t; });
                  gain.gain.setValueAtTime(vols[0].v, start);
                  vols.slice(1).forEach(function (p) {
                    gain.gain.linearRampToValueAtTime(p.v, start + Math.max(0, p.t));
                  });
                } catch (e2) {
                  gain.gain.value = (typeof c.volume === 'number') ? c.volume : 1;
                }
                audioEls.push({ el: el, clip: c });
              } catch (e) {}
            });
            // The mixed track is attached later, inside run(), and only if
            // the AudioContext is actually running (see below).
            audioDest = dest;
          }
        }
      } catch (e) { /* fall through with video-only stream */ }

      // The recorder is created inside run(), after the resume decision:
      // attaching a suspended context's audio track starves the muxer and
      // the recorder emits nothing, so audio joins the stream only when
      // the context is actually running.
      var recorder = null, chunks = [], stopped = null;

      var totalFrames = Math.max(1, Math.ceil(duration * fps));
      var stoppedFlag = false;

      (async function run() {
        try {
          // Headless Chromium can leave resume() pending forever (no audio
          // device): race it against a timeout and export anyway.
          if (audioCtx && audioCtx.resume) { try { await Promise.race([audioCtx.resume(), sleep(1500)]); } catch (e) {} }
          // Attach the mixed audio ONLY if the context is running: a
          // suspended context's track starves the muxer and the recorder
          // emits zero bytes (verified in headless Chromium) — export then
          // proceeds video-only, and audio still mixes in a real browser.
          var mime = pickMime();
          if (audioCtx && audioCtx.state === 'running' && audioDest &&
              audioDest.stream.getAudioTracks().length) {
            stream = new MediaStream(stream.getVideoTracks().concat(audioDest.stream.getAudioTracks()));
          }
          try {
            var recOpts = { mimeType: mime, videoBitsPerSecond: videoBitsPerSecond, audioBitsPerSecond: audioBitsPerSecond };
            if (!mime) delete recOpts.mimeType;
            recorder = new MediaRecorder(stream, recOpts);
          } catch (e) { reject(e); return; }
          recorder.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunks.push(ev.data); };
          stopped = new Promise(function (res) { recorder.onstop = res; });
          recorder.onerror = function (ev) { reject(new Error('exportVideo: MediaRecorder error')); };
          audioEls.forEach(function (item) {
            try { item.el.playbackRate = speedAt(item.clip, 0); item.el.currentTime = 0; item.el.play().catch(function () {}); } catch (e) {}
          });
          recorder.start(100);
          for (var i = 0; i < totalFrames; i++) {
            var t = i / fps;
            // seek video elements so the drawn frame matches time t
            var seeks = [];
            clips.forEach(function (c) {
              if (c.type === 'video' && t >= c.timelineStart && t < clipEnd(c)) {
                var el = getMediaEl(c);
                if (el) seeks.push(seekMediaEl(el, c.trimIn + sourceOffset(c, t - c.timelineStart)));
              }
            });
            await Promise.all(seeks);
            // Keep playback rate on the speed ramp while exporting.
            clips.forEach(function (c) {
              if (c.speedRamp && c.speedRamp.length && t >= c.timelineStart && t < clipEnd(c)) {
                var el2 = mediaEls[c.id];
                if (el2 && typeof el2.playbackRate === 'number') {
                  try { el2.playbackRate = speedAt(c, t - c.timelineStart); } catch (e) {}
                }
              }
            });
            // Await the exact frame's decode, draw, then release bitmaps
            // behind the current frame (export moves forward frame by frame,
            // so the pass holds ~1 decoded frame per sequence; the 60-frame
            // LRU cap bounds it either way).
            await renderFrameAsync(canvas, t);
            // Push the just-drawn frame into the capture stream (see
            // captureStream(0) above — no automatic frames in headless).
            try { var _vt = stream.getVideoTracks()[0]; if (_vt && _vt.requestFrame) _vt.requestFrame(); } catch (e) {}
            clips.forEach(function (c) {
              if (c.type !== 'photoanim' || !(c.frames || []).length) return;
              if (t < c.timelineStart || t >= clipEnd(c)) return;
              cacheEvictBefore(c.id, photoFrameIndex(c, t - c.timelineStart));
            });
            if (opts.onProgress) { try { opts.onProgress((i + 1) / totalFrames); } catch (e) {} }
            await sleep(1000 / fps);
          }
          if (!stoppedFlag) { stoppedFlag = true; recorder.stop(); }
          await stopped;
          audioEls.forEach(function (item) { try { item.el.pause(); } catch (e) {} });
          if (audioCtx) { try { audioCtx.close(); } catch (e) {} }
          var type = mime ? mime.split(';')[0] : 'video/webm';
          resolve(new Blob(chunks, { type: type }));
        } catch (e) {
          try { if (!stoppedFlag && recorder && recorder.state !== 'inactive') recorder.stop(); } catch (e2) {}
          reject(e);
        }
      })();
    });
  }

  /* ---------- persistence ---------- */

  function saveProject() {
    // File objects cannot persist: for photoanim clips save only the frame
    // count, fps and frame names, and flag framesMissing so the UI can
    // prompt the user to re-import the photos on load (see loadProject).
    var savedClips = clips.map(function (c) {
      if (c.type !== 'photoanim') return c;
      var cc = clone(c);
      cc.frameCount = (c.frames && c.frames.length) || 0;
      cc.frameNames = (c.frameNames || []).slice();
      cc.frames = [];
      cc.framesMissing = true;
      return cc;
    });
    return JSON.stringify({ version: 1, currentTime: currentTime, aspectRatio: projectAspect, markers: clone(markers), clips: savedClips });
  }

  function loadProject(json) {
    var data = (typeof json === 'string') ? JSON.parse(json) : json;
    if (!data || !Array.isArray(data.clips)) throw new Error('loadProject: invalid project JSON');
    pause();
    clips = data.clips.map(function (c) {
      var cc = clone(c);
      // old projects have no speed field — default to 1x, clamp to range
      if (typeof cc.speed !== 'number' || !isFinite(cc.speed)) cc.speed = 1;
      cc.speed = clamp(cc.speed, 0.25, 4);
      // defaults for fields added by the combination upgrade (2026-11-17)
      if (!('fade' in cc)) cc.fade = null;
      if (!('speedRamp' in cc)) cc.speedRamp = null;
      if (!('chromaKey' in cc)) cc.chromaKey = null;
      if (!('flip' in cc)) cc.flip = 'none';
      // defaults for MASTER PLAN fields (2026-11-17): crop + base rotation
      if (!('crop' in cc)) cc.crop = null;
      if (typeof cc.rotation !== 'number' || !isFinite(cc.rotation)) cc.rotation = 0;
      // colour controls (CONTRACT §10): backfill missing field to null;
      // a partial or out-of-range stored value is normalised (clamped,
      // missing keys defaulted); a malformed value resets to null.
      if (!('colorAdjust' in cc) || cc.colorAdjust === null || cc.colorAdjust === undefined) cc.colorAdjust = null;
      else {
        try { cc.colorAdjust = normalizeColorAdjust(cc.colorAdjust); }
        catch (e) { cc.colorAdjust = null; }
      }
      // photoanim: File objects never survive a save — restore the shell
      // (fps + frame names) with an empty frames list and framesMissing so
      // the UI can prompt for re-import. duration follows the (empty) list.
      if (cc.type === 'photoanim') {
        cc.fps = validFps(cc.fps) || 30;
        cc.frameNames = Array.isArray(cc.frameNames) ? cc.frameNames : [];
        if (!Array.isArray(cc.frames)) cc.frames = [];
        if (!cc.frames.length) cc.framesMissing = true;
        else if (!('framesMissing' in cc)) cc.framesMissing = false;
        cc.duration = photoDuration(cc);
        if (typeof cc.trimOut !== 'number' || cc.trimOut > cc.duration) cc.trimOut = cc.duration;
        if (typeof cc.trimIn !== 'number' || cc.trimIn > cc.trimOut) cc.trimIn = 0;
      }
      return cc;
    });
    projectAspect = (data.aspectRatio && data.aspectRatio in ASPECTS) ? data.aspectRatio : '16:9';
    markers = Array.isArray(data.markers) ? data.markers.filter(function (m) {
      return m && typeof m.time === 'number' && isFinite(m.time) && m.time >= 0;
    }).map(function (m) {
      return { id: (typeof m.id === 'string') ? m.id : uid('marker'), time: m.time, label: (typeof m.label === 'string') ? m.label : '' };
    }) : [];
    mediaEls = {};
    frameCache = {};
    frameDecoding = {};
    currentTime = clamp(typeof data.currentTime === 'number' ? data.currentTime : 0, 0, getDuration());
    emit('state-changed', null);
    emit('timeupdate', currentTime);
    return clone(clips);
  }

  global.EditorEngine = {
    addMedia: addMedia,
    importAudio: importAudio,
    addPhotoSequence: addPhotoSequence,
    addFrames: addFrames,
    removeFrame: removeFrame,
    reorderFrames: reorderFrames,
    setSequenceFps: setSequenceFps,
    getFrameCount: getFrameCount,
    getFrameCacheSize: getFrameCacheSize,
    addTextClip: addTextClip,
    addClipToTimeline: addClipToTimeline,
    removeClip: removeClip,
    trimClip: trimClip,
    splitClip: splitClip,
    moveClip: moveClip,
    setVolume: setVolume,
    setSpeed: setSpeed,
    setFade: setFade,
    getEffectiveVolume: getEffectiveVolume,
    setSpeedRamp: setSpeedRamp,
    setChromaKey: setChromaKey,
    setFlip: setFlip,
    duplicateClip: duplicateClip,
    setCrop: setCrop,
    setRotation: setRotation,
    setColorAdjust: setColorAdjust,
    applyKenBurns: applyKenBurns,
    detachAudio: detachAudio,
    freezeFrame: freezeFrame,
    addMarker: addMarker,
    getMarkers: getMarkers,
    removeMarker: removeMarker,
    snapTime: snapTime,
    setAspectRatio: setAspectRatio,
    getAspectRatio: getAspectRatio,
    importCaptions: importCaptions,
    exportCaptions: exportCaptions,
    setFilter: setFilter,
    setEffect: setEffect,
    setMask: setMask,
    addKeyframe: addKeyframe,
    removeKeyframe: removeKeyframe,
    getClipState: getClipState,
    setTransition: setTransition,
    getDuration: getDuration,
    seek: seek,
    play: play,
    pause: pause,
    getCurrentTime: getCurrentTime,
    isPlaying: isPlaying,
    renderFrame: renderFrame,
    exportVideo: exportVideo,
    on: on,
    off: off,
    saveProject: saveProject,
    loadProject: loadProject
  };
})(typeof window !== 'undefined' ? window : this);
