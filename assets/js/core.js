/* ============================================================
   SaludEnOrden · Núcleo: utilidades, base de datos, archivos, UI
   ============================================================ */
(function () {
  'use strict';
  const HM = (window.HM = window.HM || {});

  /* ----------------------------- Utilidades ----------------------------- */
  HM.uid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  };

  HM.escape = function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  HM.nl2br = function (value) {
    return HM.escape(value).replace(/\n/g, '<br>');
  };

  HM.icon = function (name, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  };

  HM.$ = function (selector, root) {
    return (root || document).querySelector(selector);
  };
  HM.$$ = function (selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  };

  HM.debounce = function (fn, wait) {
    let t;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  };

  HM.clamp = function (n, min, max) { return Math.min(max, Math.max(min, n)); };

  HM.num = function (value, decimals) {
    const n = Number(value);
    if (!isFinite(n)) return '—';
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals == null ? 1 : decimals
    }).format(n);
  };

  HM.fmtNumber = HM.num;

  HM.normalize = function (text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  HM.matches = function (text, query) {
    if (!query) return true;
    return HM.normalize(text).indexOf(HM.normalize(query)) !== -1;
  };

  HM.initials = function (name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'V';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  HM.titleCase = function (text) {
    return String(text || '').replace(/\w\S*/g, function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
  };

  /* ----------------------------- Fechas ----------------------------- */
  const LOCALE = 'es-MX';

  HM.parseDate = function (value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00');
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  HM.toDateInput = function (value) {
    const d = HM.parseDate(value) || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  };

  HM.toDateTimeInput = function (value) {
    const d = HM.parseDate(value) || new Date();
    return HM.toDateInput(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  HM.todayISO = function () { return HM.toDateInput(new Date()); };
  HM.nowISO = function () { return new Date().toISOString(); };
  HM.timeNow = function () {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  HM.startOfDay = function (value) {
    const d = HM.parseDate(value) || new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  HM.addDays = function (value, days) {
    const d = new Date((HM.parseDate(value) || new Date()).getTime());
    d.setDate(d.getDate() + days);
    return d;
  };

  HM.addMinutes = function (value, minutes) {
    return new Date((HM.parseDate(value) || new Date()).getTime() + minutes * 60000);
  };

  HM.daysBetween = function (a, b) {
    const da = HM.startOfDay(a).getTime();
    const db = HM.startOfDay(b).getTime();
    return Math.round((db - da) / 86400000);
  };

  HM.fmtDate = function (value, style, fallback) {
    const d = HM.parseDate(value);
    if (!d) return fallback === undefined ? '—' : fallback;
    const opt = { day: '2-digit', month: 'short', year: 'numeric' };
    switch (style) {
      case 'short': opt.month = 'short'; break;
      case 'medium': return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
      case 'long': return d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      case 'day': return d.toLocaleDateString(LOCALE, { day: '2-digit' });
      case 'monthShort': return d.toLocaleDateString(LOCALE, { month: 'short' }).replace(/\./g, '').toUpperCase();
      case 'month': return d.toLocaleDateString(LOCALE, { month: 'long' });
      case 'year': return String(d.getFullYear());
      case 'weekday': return d.toLocaleDateString(LOCALE, { weekday: 'long' });
      case 'time': return d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
      case 'datetime': return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '') + ' · ' + d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
      case 'datetimeLong': return d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }) + ', ' + d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
      default: break;
    }
    return d.toLocaleDateString(LOCALE, opt).replace(/\./g, '');
  };

  HM.fmtTime = function (value) {
    if (!value) return '—';
    if (/^\d{1,2}:\d{2}/.test(String(value))) {
      const parts = String(value).split(':');
      return parts[0].padStart(2, '0') + ':' + parts[1];
    }
    return HM.fmtDate(value, 'time');
  };

  HM.relativeDay = function (value) {
    const d = HM.parseDate(value);
    if (!d) return '';
    const diff = HM.daysBetween(new Date(), d);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Mañana';
    if (diff === -1) return 'Ayer';
    if (diff > 1 && diff < 30) return 'En ' + diff + ' días';
    if (diff < -1 && diff > -30) return 'Hace ' + Math.abs(diff) + ' días';
    return HM.fmtDate(d, 'short');
  };

  HM.countdown = function (value) {
    const d = HM.parseDate(value);
    if (!d) return '';
    const diffMs = d.getTime() - Date.now();
    if (diffMs < 0) return 'Fecha pasada';
    const mins = Math.round(diffMs / 60000);
    if (mins < 60) return 'En ' + Math.max(mins, 1) + ' min';
    const hours = Math.round(mins / 60);
    if (hours < 24) return 'En ' + hours + ' h';
    const days = Math.ceil(hours / 24);
    if (days === 1) return 'Mañana';
    if (days < 30) return 'En ' + days + ' días';
    return HM.fmtDate(d, 'short');
  };

  HM.age = function (birthDate) {
    const d = HM.parseDate(birthDate);
    if (!d) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age >= 0 && age < 130 ? age : null;
  };

  HM.isToday = function (value) {
    const d = HM.parseDate(value);
    if (!d) return false;
    return HM.toDateInput(d) === HM.todayISO();
  };

  /* ----------------------------- Descargas ----------------------------- */
  HM.downloadBlob = function (blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'archivo';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  };

  HM.readAsDataURL = function (blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  HM.dataURLtoBlob = function (dataURL) {
    const parts = String(dataURL).split(',');
    const meta = parts[0].match(/:(.*?);/);
    const mime = meta ? meta[1] : 'application/octet-stream';
    const bin = atob(parts[1]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  HM.formatBytes = function (bytes) {
    if (!bytes && bytes !== 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  HM.fileExtension = function (name) {
    const s = String(name || '');
    const i = s.lastIndexOf('.');
    return i > -1 ? s.slice(i + 1).toUpperCase() : '';
  };

  HM.isImage = function (mime, name) {
    if (mime && mime.indexOf('image/') === 0) return true;
    return /\.(png|jpe?g|gif|webp|bmp|svg|heic)$/i.test(name || '');
  };

  HM.isPdf = function (mime, name) {
    return (mime && mime.indexOf('pdf') !== -1) || /\.pdf$/i.test(name || '');
  };

  /* ----------------------------- Base de datos ----------------------------- */
  const DB_NAME = 'vitalia_historial_v1';
  const DB_VERSION = 2;
  let userDbId = '';
  try { userDbId = localStorage.getItem('vitalia.user.v1') || ''; } catch (e) { userDbId = ''; }
  function activeDbName() { return userDbId ? DB_NAME + '__' + userDbId : DB_NAME; }
  const STORES = {
    profile: { keyPath: 'id' },
    vitals: { keyPath: 'id', indexes: { date: 'date', type: 'type' } },
    records: { keyPath: 'id', indexes: { date: 'date', type: 'type' } },
    treatments: { keyPath: 'id', indexes: { startDate: 'startDate' } },
    doseLogs: { keyPath: 'id', indexes: { date: 'date', treatmentId: 'treatmentId' } },
    appointments: { keyPath: 'id', indexes: { dateTime: 'dateTime' } },
    providers: { keyPath: 'id', indexes: { type: 'type' } },
    documents: { keyPath: 'id', indexes: { date: 'date', category: 'category' } },
    files: { keyPath: 'id' },
    settings: { keyPath: 'id' },
    activity: { keyPath: 'id', indexes: { date: 'date' } }
  };

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('Este navegador no permite almacenar datos localmente (IndexedDB).'));
        return;
      }
      let req;
      try {
        req = indexedDB.open(activeDbName(), DB_VERSION);
      } catch (err) {
        reject(err);
        return;
      }
      req.onupgradeneeded = function (event) {
        const db = event.target.result;
        Object.keys(STORES).forEach(function (name) {
          if (!db.objectStoreNames.contains(name)) {
            const def = STORES[name];
            const store = db.createObjectStore(name, { keyPath: def.keyPath });
            if (def.indexes) {
              Object.keys(def.indexes).forEach(function (idx) {
                store.createIndex(idx, def.indexes[idx], { unique: false });
              });
            }
          }
        });
      };
      req.onsuccess = function () {
        const db = req.result;
        db.onversionchange = function () { db.close(); };
        resolve(db);
      };
      req.onerror = function () { reject(req.error || new Error('No se pudo abrir la base de datos.')); };
      req.onblocked = function () { reject(new Error('La base de datos está bloqueada por otra pestaña. Cierra las demás pestañas de SaludEnOrden.')); };
    });
    return dbPromise;
  }

  function requestToPromise(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  const db = {
    open: openDB,
    async getAll(store) {
      const database = await openDB();
      const tx = database.transaction(store, 'readonly');
      return requestToPromise(tx.objectStore(store).getAll());
    },
    async get(store, key) {
      const database = await openDB();
      const tx = database.transaction(store, 'readonly');
      return requestToPromise(tx.objectStore(store).get(key));
    },
    async put(store, value) {
      const database = await openDB();
      let existed = false;
      if (LOG_ENTITIES[store] && STORES[store] && STORES[store].keyPath) {
        try {
          const prev = await this.get(store, value[STORES[store].keyPath]);
          existed = prev != null;
        } catch (e) { existed = false; }
      }
      await new Promise(function (resolve, reject) {
        const tx = database.transaction(store, 'readwrite');
        tx.objectStore(store).put(value);
        tx.oncomplete = function () { resolve(value); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
      logChange(existed ? 'edit' : 'create', store, value);
      return value;
    },
    async remove(store, key) {
      const database = await openDB();
      await new Promise(function (resolve, reject) {
        const tx = database.transaction(store, 'readwrite');
        tx.objectStore(store).delete(key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
      logChange('del', store, null);
    },
    async clear(store) {
      const database = await openDB();
      return new Promise(function (resolve, reject) {
        const tx = database.transaction(store, 'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    },
    async bulkPut(store, values) {
      if (!values || !values.length) return;
      const database = await openDB();
      return new Promise(function (resolve, reject) {
        const tx = database.transaction(store, 'readwrite');
        const os = tx.objectStore(store);
        values.forEach(function (v) { os.put(v); });
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    },
    async clearAll() {
      const database = await openDB();
      const names = Object.keys(STORES);
      return new Promise(function (resolve, reject) {
        const tx = database.transaction(names, 'readwrite');
        names.forEach(function (name) { tx.objectStore(name).clear(); });
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    },
    async estimate() {
      if (!navigator.storage || !navigator.storage.estimate) return null;
      try { return await navigator.storage.estimate(); } catch (e) { return null; }
    }
  };
  HM.db = db;

  /* ----------------------------- Bitácora de cambios ----------------------------- */
  const LOG_ENTITIES = {
    profile: 'Perfil',
    vitals: 'Medición',
    records: 'Registro clínico',
    treatments: 'Tratamiento',
    appointments: 'Cita médica',
    providers: 'Contacto del directorio',
    documents: 'Documento'
  };
  const LOG_LIMIT = 100;
  HM.logMuted = false;

  HM.logManual = async function (action, entity, title) {
    try {
      await db.put('activity', { id: HM.uid(), date: HM.nowISO(), action: action, entity: entity || '', title: title || '' });
      const all = await db.getAll('activity');
      if (all.length > LOG_LIMIT) {
        all.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
        for (const oldEntry of all.slice(LOG_LIMIT)) {
          try { await db.remove('activity', oldEntry.id); } catch (e) { /* continuar */ }
        }
      }
    } catch (e) { /* la bitácora nunca debe interrumpir la app */ }
  };

  async function logChange(action, store, item) {
    if (HM.logMuted || !LOG_ENTITIES[store]) return;
    let title = '';
    try { title = HM.activityTitle ? (HM.activityTitle(store, item) || '') : ''; } catch (e) { title = ''; }
    await HM.logManual(action, LOG_ENTITIES[store], title);
  }

  HM.setDbUser = function (id) {
    userDbId = String(id || '');
    try {
      if (userDbId) localStorage.setItem('vitalia.user.v1', userDbId);
      else localStorage.removeItem('vitalia.user.v1');
    } catch (e) { /* almacenamiento no disponible */ }
    dbPromise = null;
  };

  HM.userDbName = function (id) { return DB_NAME + '__' + String(id || ''); };

  HM.appVersion = function () {
    const s = document.querySelector('script[src*="app.js"]');
    const m = s && s.src ? s.src.match(/[?&]v=([\d.]+)/) : null;
    return m ? m[1] : '';
  };

  HM.openNamedDb = function (name) {
    return new Promise(function (resolve, reject) {
      let req;
      try { req = indexedDB.open(name, DB_VERSION); } catch (err) { reject(err); return; }
      req.onupgradeneeded = function (event) {
        const db = event.target.result;
        Object.keys(STORES).forEach(function (n) {
          if (!db.objectStoreNames.contains(n)) {
            const def = STORES[n];
            const store = db.createObjectStore(n, { keyPath: def.keyPath });
            if (def.indexes) {
              Object.keys(def.indexes).forEach(function (idx) {
                store.createIndex(idx, def.indexes[idx], { unique: false });
              });
            }
          }
        });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('No se pudo abrir la base de datos.')); };
    });
  };

  HM.legacyDbName = DB_NAME;

  /* ----------------------------- Archivos adjuntos ----------------------------- */
  const urlCache = new Map();
  const MAX_FILE = 30 * 1024 * 1024;

  const files = {
    MAX_FILE: MAX_FILE,
    async save(file, meta) {
      if (!file) throw new Error('No se seleccionó ningún archivo.');
      if (file.size > MAX_FILE) throw new Error('El archivo "' + (file.name || 'sin nombre') + '" supera los 30 MB.');
      const record = {
        id: HM.uid(),
        name: file.name || (meta && meta.name) || 'archivo',
        type: file.type || (meta && meta.type) || 'application/octet-stream',
        size: file.size,
        blob: file,
        createdAt: HM.nowISO()
      };
      await db.put('files', record);
      return record;
    },
    async saveAll(fileList) {
      const out = [];
      for (const f of Array.from(fileList || [])) {
        out.push(await files.save(f));
      }
      return out;
    },
    async get(id) {
      if (!id) return null;
      return db.get('files', id);
    },
    async url(id) {
      if (!id) return null;
      if (urlCache.has(id)) return urlCache.get(id);
      const record = await files.get(id);
      if (!record || !record.blob) return null;
      const url = URL.createObjectURL(record.blob);
      urlCache.set(id, url);
      return url;
    },
    async remove(id) {
      if (!id) return;
      if (urlCache.has(id)) {
        URL.revokeObjectURL(urlCache.get(id));
        urlCache.delete(id);
      }
      await db.remove('files', id);
    },
    clearUrlCache() {
      urlCache.forEach(function (url) { URL.revokeObjectURL(url); });
      urlCache.clear();
    },
    async toDataURL(id) {
      const record = await files.get(id);
      if (!record) return null;
      return {
        id: record.id,
        name: record.name,
        type: record.type,
        size: record.size,
        data: await HM.readAsDataURL(record.blob)
      };
    }
  };
  HM.files = files;

  /* ----------------------------- Toasts ----------------------------- */
  HM.toast = function (title, message, type, timeout) {
    const root = document.getElementById('toastRoot');
    if (!root) return;
    const kind = type || 'success';
    const icons = { success: 'check-circle', error: 'alert-triangle', info: 'info', warn: 'alert-triangle' };
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML =
      '<span class="toast-ic">' + HM.icon(icons[kind] || 'check-circle') + '</span>' +
      '<div><strong>' + HM.escape(title) + '</strong>' + (message ? '<p>' + HM.escape(message) + '</p>' : '') + '</div>';
    root.appendChild(el);
    let removed = false;
    const remove = function () {
      if (removed) return;
      removed = true;
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 220);
    };
    el.addEventListener('click', remove);
    setTimeout(remove, timeout || 4400);
  };

  /* ----------------------------- Modales ----------------------------- */
  let modalState = null;
  let previousFocus = null;
  let closeTimer = null;

  function trapFocus(e) {
    if (!modalState || e.key !== 'Tab') return;
    const focusables = HM.$$('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', modalState.overlay).filter(function (el) {
      return el.offsetParent !== null;
    });
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function keyHandler(e) {
    if (!modalState) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else {
      trapFocus(e);
    }
  }

  function closeModal() {
    if (!modalState) return;
    const state = modalState;
    modalState = null;
    document.removeEventListener('keydown', keyHandler);
    const root = document.getElementById('modalRoot');
    const doClose = function () {
      root.classList.remove('show');
      root.style.pointerEvents = 'none';
      document.body.classList.remove('modal-open');
      if (state.onClose) {
        try { state.onClose(); } catch (e) { console.error(e); }
      }
      if (previousFocus && previousFocus.focus) {
        try { previousFocus.focus({ preventScroll: true }); } catch (e) { /* noop */ }
      }
    };
    doClose();
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      root.innerHTML = '';
      root.style.pointerEvents = '';
    }, 180);
  }

  function openModal(opts) {
    const root = document.getElementById('modalRoot');
    if (!root) return null;
    clearTimeout(closeTimer);
    if (modalState) closeModal();
    clearTimeout(closeTimer);
    previousFocus = document.activeElement;
    const options = opts || {};
    root.innerHTML =
      '<div class="modal-backdrop" data-modal-close="1"></div>' +
      '<section class="modal ' + (options.size ? 'modal-' + options.size : '') + '" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
        '<header class="modal-head">' +
          (options.icon ? '<span class="modal-icon">' + HM.icon(options.icon) + '</span>' : '') +
          '<div><h2 id="modalTitle">' + HM.escape(options.title || '') + '</h2>' +
            (options.subtitle ? '<p>' + HM.escape(options.subtitle) + '</p>' : '') +
          '</div>' +
          '<button type="button" class="icon-btn modal-close" data-modal-close="1" aria-label="Cerrar">' + HM.icon('x') + '</button>' +
        '</header>' +
        '<div class="modal-body">' + (options.body || '') + '</div>' +
        (options.footer ? '<footer class="modal-foot">' + options.footer + '</footer>' : '') +
      '</section>';
    root.style.pointerEvents = 'auto';
    void root.offsetWidth;
    root.classList.add('show');
    document.body.classList.add('modal-open');
    modalState = {
      overlay: root,
      onClose: options.onClose,
      resolveOnClose: options.resolveOnClose
    };
    document.addEventListener('keydown', keyHandler);

    root.querySelectorAll('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-modal-keep]')) return;
        closeModal();
      });
    });

    if (typeof options.onMount === 'function') {
      options.onMount(root);
    }
    setTimeout(function () {
      if (!modalState) return;
      const auto = root.querySelector('[autofocus]') ||
        root.querySelector('.modal-body input:not([type="hidden"]), .modal-body select, .modal-body textarea, .modal-body button') ||
        root.querySelector('.modal-foot .btn-primary');
      if (auto && auto.focus) auto.focus({ preventScroll: true });
    }, 80);
    return root;
  }

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      let settled = false;
      const finish = function (value) {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const options = opts || {};
      openModal({
        title: options.title || '¿Confirmar acción?',
        subtitle: options.subtitle || '',
        icon: options.icon || 'alert-triangle',
        size: 'narrow',
        body: '<p class="confirm-copy">' + HM.nl2br(options.message || '') + '</p>',
        footer:
          '<button type="button" class="btn btn-outline" data-cancel>' + HM.escape(options.cancelText || 'Cancelar') + '</button>' +
          '<button type="button" class="btn ' + (options.danger ? 'btn-danger' : 'btn-primary') + '" data-confirm>' + HM.escape(options.confirmText || 'Confirmar') + '</button>',
        onMount: function (root) {
          root.querySelector('[data-cancel]').addEventListener('click', function () { finish(false); closeModal(); });
          root.querySelector('[data-confirm]').addEventListener('click', function () { finish(true); closeModal(); });
          root.querySelector('.modal-close').addEventListener('click', function () { finish(false); });
          root.querySelector('.modal-backdrop').addEventListener('click', function () { finish(false); });
        },
        onClose: function () { finish(false); }
      });
    });
  }

  HM.modal = { open: openModal, close: closeModal };
  HM.confirm = confirmDialog;

  /* ----------------------------- Gráfica SVG ----------------------------- */
  let chartSeq = 0;
  HM.chartSVG = function (opts) {
    const options = opts || {};
    const items = options.items || [];
    const series = options.series || [];
    if (!items.length) return '';
    const W = 720;
    const H = options.height || 250;
    const pad = { l: 46, r: 18, t: 18, b: 30 };
    const all = [];
    items.forEach(function (item) {
      (item.values || []).forEach(function (v) {
        if (v !== null && v !== undefined && isFinite(Number(v))) all.push(Number(v));
      });
    });
    if (!all.length) return '';
    let lo = options.min != null ? Number(options.min) : Math.min.apply(null, all);
    let hi = options.max != null ? Number(options.max) : Math.max.apply(null, all);
    if (lo === hi) { lo -= 1; hi += 1; }
    if (options.min == null) {
      const span = hi - lo;
      lo = lo - span * 0.12;
    }
    if (options.max == null) {
      const span = hi - lo;
      hi = hi + span * 0.12;
    }
    if (options.min != null && options.max == null && lo === hi) hi = lo + 1;

    const innerW = W - pad.l - pad.r;
    const innerH = H - pad.t - pad.b;
    const xFor = function (i) {
      if (items.length === 1) return pad.l + innerW / 2;
      return pad.l + (innerW * i) / (items.length - 1);
    };
    const yFor = function (v) {
      return pad.t + innerH * (1 - (Number(v) - lo) / (hi - lo));
    };
    const id = 'chartGrad' + (++chartSeq);
    const fmt = options.formatValue || function (v) { return HM.num(v, 1); };
    let svg = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + HM.escape(options.ariaLabel || 'Gráfica de tendencia') + '">';
    svg += '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + (series[0] ? series[0].color : '#2563eb') + '" stop-opacity=".22"/>' +
      '<stop offset="100%" stop-color="' + (series[0] ? series[0].color : '#2563eb') + '" stop-opacity="0"/>' +
      '</linearGradient></defs>';

    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const value = lo + ((hi - lo) * i) / ticks;
      const y = yFor(value);
      svg += '<line x1="' + pad.l + '" y1="' + y.toFixed(1) + '" x2="' + (W - pad.r) + '" y2="' + y.toFixed(1) + '" stroke="#eaf0f8" stroke-width="1"/>';
      svg += '<text x="' + (pad.l - 8) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" font-size="9" fill="#8b99ad" font-family="Segoe UI, system-ui, sans-serif">' + HM.escape(fmt(value)) + '</text>';
    }

    const labelIndexes = [];
    if (items.length === 1) labelIndexes.push(0);
    else {
      const maxLabels = 4;
      for (let i = 0; i < Math.min(maxLabels, items.length); i++) {
        labelIndexes.push(Math.round((i * (items.length - 1)) / (Math.min(maxLabels, items.length) - 1)));
      }
    }
    const uniqueLabels = Array.from(new Set(labelIndexes));
    uniqueLabels.forEach(function (ii) {
      const x = xFor(ii);
      const label = items[ii].shortLabel || HM.fmtDate(items[ii].date, 'short');
      svg += '<text x="' + x.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + (ii === 0 ? 'start' : ii === items.length - 1 ? 'end' : 'middle') + '" font-size="9" fill="#8b99ad" font-family="Segoe UI, system-ui, sans-serif">' + HM.escape(label) + '</text>';
    });

    series.forEach(function (s, si) {
      const pts = [];
      items.forEach(function (item, i) {
        const v = item.values ? item.values[si] : null;
        if (v !== null && v !== undefined && isFinite(Number(v))) {
          pts.push({ x: xFor(i), y: yFor(v), v: Number(v), i: i });
        }
      });
      if (!pts.length) return;
      if (series.length === 1 && pts.length > 1) {
        let area = 'M' + pts[0].x.toFixed(1) + ' ' + (H - pad.b) + ' L' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
        pts.slice(1).forEach(function (p) { area += ' L' + p.x.toFixed(1) + ' ' + p.y.toFixed(1); });
        area += ' L' + pts[pts.length - 1].x.toFixed(1) + ' ' + (H - pad.b) + ' Z';
        svg += '<path d="' + area + '" fill="url(#' + id + ')"/>';
      }
      if (pts.length > 1) {
        let path = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
        for (let i = 1; i < pts.length; i++) path += ' L' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1);
        svg += '<path d="' + path + '" fill="none" stroke="' + s.color + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
      }
      pts.forEach(function (p, pi) {
        const isLast = pi === pts.length - 1;
        const tip = (items[p.i].tip || (HM.fmtDate(items[p.i].date, 'short') + ' · ' + fmt(p.v))) + (options.unit ? ' ' + options.unit : '');
        svg += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (isLast ? 4.4 : 3.2) + '" fill="#fff" stroke="' + s.color + '" stroke-width="' + (isLast ? 3 : 2) + '">' +
          '<title>' + HM.escape(tip) + '</title></circle>';
      });
    });

    svg += '</svg>';
    return svg;
  };


})();
