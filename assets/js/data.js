/* ============================================================
   SaludEnOrden · Estado, catálogos, datos derivados, respaldo y demo
   ============================================================ */
(function () {
  'use strict';
  const HM = window.HM;
  const state = (HM.state = {
    profile: null,
    vitals: [],
    records: [],
    treatments: [],
    doseLogs: [],
    appointments: [],
    providers: [],
    documents: [],
    settings: null,
    ready: false,
    dbError: null
  });

  const DEFAULT_SETTINGS = {
    id: 'app',
    notifications: false,
    lastBackup: null,
    demo: false,
    createdWith: 'SaludEnOrden',
    updatedAt: null,
    autoBackupDirName: null
  };
  HM.pickAutoBackupFolder = async function () {
    if (!window.showDirectoryPicker) {
      HM.toast('No disponible', 'Tu navegador no permite elegir carpetas.', 'warn', 5000);
      return false;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await HM.setSetting({ autoBackupDirHandle: handle, autoBackupDirName: handle.name });
      HM.toast('Carpeta seleccionada', 'Los respaldos automáticos se guardarán en "' + handle.name + '".', 'success', 5000);
      return true;
    } catch (err) {
      if (err && err.name !== 'AbortError') HM.toast('No se pudo seleccionar', err.message, 'error', 5000);
      return false;
    }
  };
  HM.clearAutoBackupFolder = async function () {
    await HM.setSetting({ autoBackupDirHandle: null, autoBackupDirName: null });
    HM.toast('Carpeta quitada', 'Ya no se guardarán respaldos automáticos en el disco.', 'info', 4000);
  };
  HM.autoBackupFolderSupported = function () { return !!window.showDirectoryPicker; };

  /* Título legible de cada elemento para la bitácora */
  HM.activityTitle = function (store, item) {
    if (!item) return '';
    switch (store) {
      case 'profile': return [item.firstName, item.lastName].filter(Boolean).join(' ');
      case 'vitals': return (HM.vitalTypes[item.type] && HM.vitalTypes[item.type].short) || '';
      case 'records': return item.title || (HM.recordTypes[item.type] && HM.recordTypes[item.type].label) || '';
      case 'treatments': return item.name || item.medication || '';
      case 'appointments': return item.title || '';
      case 'providers': return item.name || '';
      case 'documents': return item.name || item.title || '';
      default: return '';
    }
  };

  /* ----------------------------- Catálogos ----------------------------- */
  HM.recordTypes = {
    consulta: { label: 'Consulta', plural: 'Consultas', icon: 'stethoscope', color: '#2563eb', cls: 'blue', badge: 'badge' },
    diagnostico: { label: 'Diagnóstico', plural: 'Diagnósticos', icon: 'clipboard', color: '#7c3aed', cls: 'violet', badge: 'badge-violet' },
    cirugia: { label: 'Cirugía', plural: 'Cirugías', icon: 'hospital', color: '#0d9488', cls: 'teal', badge: 'badge-teal' },
    laboratorio: { label: 'Laboratorio', plural: 'Laboratorio', icon: 'flask', color: '#0ea5e9', cls: 'sky', badge: 'badge-sky' },
    vacuna: { label: 'Vacuna', plural: 'Vacunas', icon: 'syringe', color: '#059669', cls: 'green', badge: 'badge-green' },
    hospitalizacion: { label: 'Hospitalización', plural: 'Hospitalizaciones', icon: 'hospital', color: '#d97706', cls: 'amber', badge: 'badge-amber' },
    otro: { label: 'Otro registro', plural: 'Otros', icon: 'file-text', color: '#60708a', cls: 'gray', badge: 'badge-gray' }
  };

  HM.vitalTypes = {
    presion: { label: 'Presión arterial', short: 'Presión', icon: 'gauge', unit: 'mmHg', color: '#2563eb', cls: 'blue' },
    glucosa: { label: 'Glucosa', short: 'Glucosa', icon: 'droplet', unit: 'mg/dL', color: '#7c3aed', cls: 'violet' },
    peso: { label: 'Peso', short: 'Peso', icon: 'weight', unit: 'kg', color: '#0d9488', cls: 'teal' },
    temperatura: { label: 'Temperatura', short: 'Temperatura', icon: 'thermometer', unit: '°C', color: '#d97706', cls: 'amber' },
    pulso: { label: 'Frecuencia cardíaca', short: 'Pulso', icon: 'heart-pulse', unit: 'lpm', color: '#e11d48', cls: 'rose' },
    oxigeno: { label: 'Oxígeno en sangre', short: 'SpO₂', icon: 'wind', unit: '%', color: '#0ea5e9', cls: 'sky' },
    sintoma: { label: 'Síntoma', short: 'Síntomas', icon: 'alert-triangle', unit: '', color: '#f59e0b', cls: 'amber' }
  };

  HM.providerTypes = {
    medico: { label: 'Médico', plural: 'Médicos', icon: 'stethoscope', cls: 'blue' },
    clinica: { label: 'Clínica', plural: 'Clínicas', icon: 'hospital', cls: 'teal' },
    hospital: { label: 'Hospital', plural: 'Hospitales', icon: 'hospital', cls: 'violet' },
    laboratorio: { label: 'Laboratorio', plural: 'Laboratorios', icon: 'flask', cls: 'sky' }
  };

  HM.docCategories = {
    receta: { label: 'Receta', icon: 'pill', cls: 'violet' },
    laboratorio: { label: 'Laboratorio', icon: 'flask', cls: 'sky' },
    estudio: { label: 'Estudio', icon: 'scan', cls: 'blue' },
    imagen: { label: 'Imagen médica', icon: 'image', cls: 'teal' },
    vacuna: { label: 'Vacuna', icon: 'syringe', cls: 'green' },
    otro: { label: 'Otro', icon: 'file', cls: 'gray' }
  };

  HM.bloodTypes = ['O+', 'O−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'No lo sé'];
  HM.allergySeverities = ['Leve', 'Moderada', 'Grave'];
  HM.relations = ['Madre', 'Padre', 'Hermano/a', 'Hijo/a', 'Abuelo/a', 'Tío/a', 'Primo/a', 'Esposo/a', 'Amigo/a', 'Otro'];
  HM.medicationForms = ['Tableta', 'Cápsula', 'Jarabe', 'Suspensión', 'Inyección', 'Gotas', 'Crema', 'Inhalador', 'Parche', 'Supositorio', 'Otro'];

  /* ----------------------------- Carga ----------------------------- */
  HM.loadAll = async function () {
    try {
      const results = await Promise.all([
        HM.db.getAll('profile'),
        HM.db.getAll('vitals'),
        HM.db.getAll('records'),
        HM.db.getAll('treatments'),
        HM.db.getAll('doseLogs'),
        HM.db.getAll('appointments'),
        HM.db.getAll('providers'),
        HM.db.getAll('documents'),
        HM.db.get('settings', 'app')
      ]);
      state.profile = results[0][0] || null;
      state.vitals = results[1];
      state.records = results[2];
      state.treatments = results[3];
      state.doseLogs = results[4];
      state.appointments = results[5];
      state.providers = results[6];
      state.documents = results[7];
      state.settings = results[8] || Object.assign({}, DEFAULT_SETTINGS);
      if (!results[8]) {
        await HM.db.put('settings', state.settings);
      }
      state.ready = true;
      state.dbError = null;
      return true;
    } catch (err) {
      console.error('Error al cargar los datos', err);
      state.dbError = err.message || String(err);
      throw err;
    }
  };

  HM.setSetting = async function (patch) {
    state.settings = Object.assign({}, state.settings || DEFAULT_SETTINGS, patch, { updatedAt: HM.nowISO() });
    await HM.db.put('settings', state.settings);
    return state.settings;
  };

  /* ----------------------------- Accesos ----------------------------- */
  HM.profileName = function () {
    const p = state.profile;
    if (!p) return '';
    return [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
  };

  HM.profileFirstName = function () {
    return (state.profile && state.profile.firstName) || '';
  };

  HM.provider = function (id) {
    return state.providers.find(function (p) { return p.id === id; }) || null;
  };

  HM.providerName = function (id) {
    const p = HM.provider(id);
    return p ? p.name : '';
  };

  HM.record = function (id) {
    return state.records.find(function (r) { return r.id === id; }) || null;
  };

  HM.treatment = function (id) {
    return state.treatments.find(function (t) { return t.id === id; }) || null;
  };

  HM.document = function (id) {
    return state.documents.find(function (d) { return d.id === id; }) || null;
  };

  HM.appointment = function (id) {
    return state.appointments.find(function (a) { return a.id === id; }) || null;
  };

  HM.sortDesc = function (list, field) {
    return list.slice().sort(function (a, b) {
      return (HM.parseDate(b[field]) || 0) - (HM.parseDate(a[field]) || 0);
    });
  };

  HM.sortAsc = function (list, field) {
    return list.slice().sort(function (a, b) {
      return (HM.parseDate(a[field]) || 0) - (HM.parseDate(b[field]) || 0);
    });
  };

  /* ----------------------------- Perfil ----------------------------- */
  HM.profileCompleteness = function () {
    const p = state.profile || {};
    const checks = [
      !!p.firstName,
      !!p.lastName,
      !!p.birthDate,
      !!p.bloodType && p.bloodType !== 'No lo sé',
      !!p.phone,
      !!p.address,
      !!(p.emergencyContacts && p.emergencyContacts.length),
      !!(p.allergies && p.allergies.length)
    ];
    const done = checks.filter(Boolean).length;
    return { done: done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
  };

  HM.severityRank = function (severity) {
    const s = HM.normalize(severity);
    if (s === 'grave') return 3;
    if (s === 'moderada') return 2;
    return 1;
  };

  HM.severityBadge = function (severity) {
    const rank = HM.severityRank(severity);
    if (rank >= 3) return 'badge-rose';
    if (rank === 2) return 'badge-amber';
    return 'badge-gray';
  };

  HM.computeBMI = function (weightKg, heightCm) {
    const w = Number(weightKg);
    const h = Number(heightCm) / 100;
    if (!w || !h) return null;
    return w / (h * h);
  };

  HM.bmiLabel = function (bmi) {
    if (!bmi && bmi !== 0) return '';
    if (bmi < 18.5) return 'Bajo peso';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Sobrepeso';
    return 'Obesidad';
  };

  /* ----------------------------- Tratamientos ----------------------------- */
  HM.isTreatmentActive = function (t) {
    return t && t.active !== false;
  };

  HM.activeTreatments = function () {
    return state.treatments.filter(HM.isTreatmentActive);
  };

  HM.treatmentOnDate = function (t, dateValue) {
    if (!t || !dateValue) return false;
    const date = HM.toDateInput(dateValue);
    if (t.startDate && date < t.startDate) return false;
    if (t.endDate && date > t.endDate) return false;
    return true;
  };

  HM.treatmentTimes = function (t) {
    return (t.times && t.times.length ? t.times : ['08:00']).slice().sort();
  };

  HM.doseLog = function (treatmentId, date, time) {
    const id = treatmentId + '|' + date + '|' + time;
    return state.doseLogs.find(function (l) { return l.id === id; }) || null;
  };

  HM.setDoseStatus = async function (treatmentId, date, time, status) {
    const id = treatmentId + '|' + date + '|' + time;
    const existing = state.doseLogs.find(function (l) { return l.id === id; });
    if (!status) {
      if (existing) {
        await HM.db.remove('doseLogs', id);
        state.doseLogs = state.doseLogs.filter(function (l) { return l.id !== id; });
      }
      return;
    }
    const log = {
      id: id,
      treatmentId: treatmentId,
      date: date,
      time: time,
      status: status,
      loggedAt: HM.nowISO()
    };
    await HM.db.put('doseLogs', log);
    if (existing) {
      state.doseLogs = state.doseLogs.map(function (l) { return l.id === id ? log : l; });
    } else {
      state.doseLogs.push(log);
    }
  };

  HM.todayDoses = function () {
    const today = HM.todayISO();
    const doses = [];
    HM.activeTreatments().forEach(function (t) {
      if (!HM.treatmentOnDate(t, today)) return;
      HM.treatmentTimes(t).forEach(function (time) {
        const log = HM.doseLog(t.id, today, time);
        doses.push({ key: t.id + '|' + today + '|' + time, treatment: t, time: time, log: log, status: log ? log.status : 'pendiente' });
      });
    });
    return doses.sort(function (a, b) { return a.time.localeCompare(b.time); });
  };

  HM.adherence = function (t, days) {
    const totalDays = days || 7;
    const start = HM.startOfDay(HM.addDays(new Date(), -(totalDays - 1)));
    const today = HM.startOfDay(new Date());
    let startDate = HM.parseDate(t.startDate) || start;
    if (startDate < start) startDate = start;
    const endDate = t.endDate ? HM.parseDate(t.endDate) : today;
    let end = endDate < today ? endDate : today;
    if (end < startDate) return null;
    const times = HM.treatmentTimes(t).length;
    let total = 0;
    let taken = 0;
    let cursor = new Date(startDate);
    while (cursor <= end) {
      const date = HM.toDateInput(cursor);
      total += times;
      HM.treatmentTimes(t).forEach(function (time) {
        const log = HM.doseLog(t.id, date, time);
        if (log && log.status === 'tomada') taken++;
      });
      cursor = HM.addDays(cursor, 1);
    }
    if (!total) return null;
    return { total: total, taken: taken, percent: Math.round((taken / total) * 100) };
  };

  HM.treatmentProgress = function (t) {
    if (!t.endDate) return null;
    const start = HM.parseDate(t.startDate || new Date());
    const end = HM.parseDate(t.endDate);
    if (!start || !end || end < start) return null;
    const total = Math.max(1, HM.daysBetween(start, end) + 1);
    const done = HM.clamp(HM.daysBetween(start, new Date()) + 1, 0, total);
    return { total: total, done: done, percent: Math.round((done / total) * 100) };
  };

  /* ----------------------------- Citas ----------------------------- */
  HM.pendingAppointments = function () {
    return state.appointments
      .filter(function (a) { return a.status === 'pendiente' || !a.status; })
      .sort(function (a, b) { return (HM.parseDate(a.dateTime) || 0) - (HM.parseDate(b.dateTime) || 0); });
  };

  HM.upcomingAppointments = function (days) {
    const limit = HM.addDays(new Date(), days || 30);
    return HM.pendingAppointments().filter(function (a) {
      const d = HM.parseDate(a.dateTime);
      return d && d >= HM.startOfDay(new Date()) && d <= limit;
    });
  };

  HM.pastAppointments = function () {
    const now = new Date();
    return state.appointments
      .filter(function (a) { return (a.status && a.status !== 'pendiente') || (HM.parseDate(a.dateTime) && HM.parseDate(a.dateTime) < now && a.status !== 'pendiente'); })
      .sort(function (a, b) { return (HM.parseDate(b.dateTime) || 0) - (HM.parseDate(a.dateTime) || 0); });
  };

  /* ----------------------------- Alertas ----------------------------- */
  HM.reminderLabel = function (minutes) {
    if (!minutes) return 'Sin recordatorio';
    if (minutes < 60) return minutes + ' min antes';
    if (minutes < 1440) return Math.round(minutes / 60) + ' h antes';
    if (minutes < 10080) return Math.round(minutes / 1440) + ' día(s) antes';
    return Math.round(minutes / 10080) + ' semana(s) antes';
  };

  HM.alerts = function () {
    const now = new Date();
    const today = HM.todayISO();
    const doses = HM.todayDoses();
    const pendingDoses = doses.filter(function (d) { return d.status === 'pendiente'; });
    const upcoming = state.appointments
      .filter(function (a) {
        if (a.status && a.status !== 'pendiente') return false;
        const d = HM.parseDate(a.dateTime);
        return d && d >= HM.startOfDay(now) && d <= HM.addDays(now, 7);
      })
      .sort(function (a, b) { return (HM.parseDate(a.dateTime) || 0) - (HM.parseDate(b.dateTime) || 0); });

    const dueDoses = pendingDoses.filter(function (dose) {
      const [hh, mm] = dose.time.split(':').map(Number);
      const due = new Date();
      due.setHours(hh, mm, 0, 0);
      return due <= now;
    });

    return {
      doses: doses,
      pendingDoses: pendingDoses,
      dueDoses: dueDoses,
      appointments: upcoming,
      count: pendingDoses.length + upcoming.length,
      today: today
    };
  };

  HM.getGreeting = function () {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  /* ----------------------------- Respaldo ----------------------------- */
  const BACKUP_STORES = ['profile', 'vitals', 'records', 'treatments', 'doseLogs', 'appointments', 'providers', 'documents', 'settings'];

  HM.buildBackup = async function () {
    const data = {};
    for (const store of BACKUP_STORES) {
      data[store] = await HM.db.getAll(store);
    }
    const fileRecords = await HM.db.getAll('files');
    const files = [];
    for (const record of fileRecords) {
      try {
        files.push({
          id: record.id,
          name: record.name,
          type: record.type,
          size: record.size,
          createdAt: record.createdAt,
          data: await HM.readAsDataURL(record.blob)
        });
      } catch (err) {
        console.warn('No se pudo incluir el archivo ' + record.name, err);
      }
    }
    return {
      app: 'vitalia',
      version: 1,
      exportedAt: HM.nowISO(),
      patient: HM.profileName() || null,
      data: data,
      files: files
    };
  };

  /* ----------------------------- Cifrado de respaldos (AES-GCM + PBKDF2) ----------------------------- */
  function b64FromBytes(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function bytesFromB64(str) {
    const bin = atob(String(str || ''));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  async function deriveBackupKey(password, salt, iterations) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  HM.backupCryptoAvailable = function () {
    return !!(window.crypto && crypto.subtle && crypto.subtle.encrypt && window.TextEncoder);
  };
  HM.encryptBackup = async function (password, backup) {
    const iterations = 150000;
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveBackupKey(password, salt, iterations);
    const plain = new TextEncoder().encode(JSON.stringify(backup));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plain);
    return {
      app: 'vitalia',
      version: 2,
      encrypted: true,
      cipher: 'AES-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: iterations,
      salt: b64FromBytes(salt),
      iv: b64FromBytes(iv),
      data: b64FromBytes(new Uint8Array(cipher)),
      exportedAt: HM.nowISO()
    };
  };
  HM.decryptBackup = async function (password, pack) {
    const key = await deriveBackupKey(password, bytesFromB64(pack.salt), pack.iterations || 150000);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytesFromB64(pack.iv) }, key, bytesFromB64(pack.data));
    return JSON.parse(new TextDecoder().decode(plain));
  };
  HM.askBackupPassword = function (mode) {
    // mode: 'set' (crear) | 'enter' (descifrar). Devuelve la contraseña o null.
    return new Promise(function (resolve) {
      let settled = false;
      const finish = function (value) {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      HM.modal.open({
        title: mode === 'set' ? 'Contraseña del respaldo' : 'Respaldo cifrado',
        subtitle: mode === 'set'
          ? 'Escribe una contraseña para proteger el archivo. Si la pierdes, no podrás recuperar el respaldo.'
          : 'Este respaldo está cifrado. Escribe la contraseña con la que se creó.',
        icon: 'lock',
        size: 'narrow',
        body:
          '<form id="backupPwForm" autocomplete="off">' +
            '<div class="field"><label>Contraseña</label><input class="input" type="password" name="password" id="backupPwInput" required></div>' +
            '<p class="form-note" id="backupPwError" style="color:var(--rose-600);display:none"></p>' +
          '</form>',
        footer:
          '<button type="button" class="btn btn-outline" data-cancel>' + (mode === 'set' ? 'Cancelar respaldo' : 'Cancelar') + '</button>' +
          '<button type="button" class="btn btn-primary" data-ok>' + (mode === 'set' ? 'Cifrar y guardar' : 'Descifrar') + '</button>',
        onMount: function (root) {
          const input = root.querySelector('#backupPwInput');
          const error = root.querySelector('#backupPwError');
          const submit = function () {
            const value = String(input.value || '');
            if (!value) {
              error.textContent = 'Escribe una contraseña.';
              error.style.display = '';
              return;
            }
            if (mode === 'set' && value.length < 8) {
              error.textContent = 'Usa al menos 8 caracteres. Si la pierdes, el respaldo no se podrá recuperar.';
              error.style.display = '';
              return;
            }
            HM.modal.close();
            finish(value);
          };
          root.querySelector('[data-ok]').addEventListener('click', submit);
          root.querySelector('#backupPwForm').addEventListener('submit', function (e) { e.preventDefault(); submit(); });
          root.querySelector('[data-cancel]').addEventListener('click', function () { HM.modal.close(); finish(null); });
        },
        onClose: function () { finish(null); }
      });
    });
  };

  HM.downloadBackup = async function () {
    HM.toast('Preparando respaldo', 'Incluyendo registros y archivos adjuntos…', 'info', 2600);
    try {
      const name = 'saludenorden-respaldo-' + HM.todayISO() + '.json';
      let handle = null;
      // Elegir dónde guardar (Chrome/Edge); si el navegador no lo permite,
      // el archivo va a la carpeta Descargas como siempre.
      if (window.showSaveFilePicker) {
        try {
          handle = await window.showSaveFilePicker({
            suggestedName: name,
            types: [{ description: 'Respaldo de SaludEnOrden', accept: { 'application/json': ['.json'] } }]
          });
        } catch (pickErr) {
          if (pickErr && pickErr.name === 'AbortError') {
            HM.toast('Respaldo cancelado', 'No se eligió una ubicación para guardar.', 'info', 3200);
            return false;
          }
          handle = null;
        }
      }
      const backup = await HM.buildBackup();
      const encrypt = !!(HM.state.settings && HM.state.settings.backupEncrypt) && HM.backupCryptoAvailable();
      let payload = backup;
      if (encrypt) {
        const pw = await HM.askBackupPassword('set');
        if (!pw) {
          HM.toast('Respaldo cancelado', 'Se necesita una contraseña para cifrar el respaldo.', 'info', 3200);
          return false;
        }
        payload = await HM.encryptBackup(pw, backup);
      }
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      if (handle) {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        HM.downloadBlob(blob, name);
      }
      const now = HM.nowISO();
      const savedName = handle ? handle.name : name;
      const where = handle ? 'carpeta que elegiste' : 'carpeta Descargas del navegador';
      await HM.setSetting({ lastBackup: now, lastBackupFile: savedName, lastBackupWhere: where });
      await HM.logManual('backup', 'Respaldo', savedName);
      HM.toast('Respaldo realizado', 'Fecha: ' + HM.fmtDate(now, 'datetime') + ' · Guardado como ' + savedName + (encrypt ? ' (cifrado)' : ''), 'success', 7000);
      document.dispatchEvent(new CustomEvent('vitalia:backup-done'));
      return true;
    } catch (err) {
      console.error(err);
      HM.toast('No se pudo crear el respaldo', err.message, 'error', 6000);
      return false;
    }
  };

  HM.importBackup = async function (json) {
    if (!json || json.app !== 'vitalia' || !json.data) {
      throw new Error('El archivo no es un respaldo válido de SaludEnOrden.');
    }
    for (const store of BACKUP_STORES) {
      if (json.data[store] && !Array.isArray(json.data[store])) {
        throw new Error('El respaldo está dañado en la sección "' + store + '".');
      }
    }
    HM.files.clearUrlCache();
    await HM.db.clearAll();
    for (const store of BACKUP_STORES) {
      if (json.data[store] && json.data[store].length) {
        await HM.db.bulkPut(store, json.data[store]);
      }
    }
    if (Array.isArray(json.files)) {
      for (const file of json.files) {
        if (!file || !file.data) continue;
        try {
          const blob = HM.dataURLtoBlob(file.data);
          await HM.db.put('files', {
            id: file.id,
            name: file.name || 'archivo',
            type: file.type || blob.type,
            size: file.size || blob.size,
            createdAt: file.createdAt || HM.nowISO(),
            blob: blob
          });
        } catch (err) {
          console.warn('Archivo no importado', file.name, err);
        }
      }
    }
    await HM.loadAll();
    await HM.setSetting({ lastBackup: json.exportedAt || HM.nowISO() });
    await HM.logManual('restore', 'Respaldo', '');
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    return {
      records: (json.data.records || []).length,
      files: (json.files || []).length
    };
  };

  HM.clearAllData = async function () {
    HM.files.clearUrlCache();
    await HM.db.clearAll();
    state.profile = null;
    state.vitals = [];
    state.records = [];
    state.treatments = [];
    state.doseLogs = [];
    state.appointments = [];
    state.providers = [];
    state.documents = [];
    state.settings = Object.assign({}, DEFAULT_SETTINGS);
    await HM.db.put('settings', state.settings);
    await HM.logManual('clear', 'Datos', '');
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
  };

  /* ----------------------------- Datos de demostración ----------------------------- */
  function demoDate(daysAgo, hour, minute) {
    const d = HM.addDays(new Date(), -daysAgo);
    d.setHours(hour == null ? 10 : hour, minute == null ? 0 : minute, 0, 0);
    return d;
  }

  function demoDateTime(futureDays, hour, minute) {
    const d = HM.addDays(new Date(), futureDays);
    d.setHours(hour == null ? 10 : hour, minute == null ? 0 : minute, 0, 0);
    return d.toISOString();
  }

  function demoRecordDate(daysAgo) {
    return HM.toDateInput(demoDate(daysAgo));
  }

  async function createDemoDocument(title, subtitle, lines, category, providerId, date) {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const grad = ctx.createLinearGradient(0, 0, 900, 260);
    grad.addColorStop(0, '#1e40af');
    grad.addColorStop(1, '#0ea5e9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 240);
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath();
    ctx.arc(790, 60, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 25px Segoe UI, Arial, sans-serif';
    ctx.fillText('VITALIA · SALUD', 60, 85);
    ctx.font = '700 42px Segoe UI, Arial, sans-serif';
    ctx.fillText(title, 60, 145);
    ctx.font = '400 22px Segoe UI, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.fillText(subtitle, 60, 185);
    const patient = HM.profileName() || 'Paciente';
    ctx.fillStyle = '#0d1b31';
    ctx.font = '700 26px Segoe UI, Arial, sans-serif';
    ctx.fillText(patient, 60, 305);
    ctx.fillStyle = '#60708a';
    ctx.font = '400 18px Segoe UI, Arial, sans-serif';
    ctx.fillText('Documento de demostración · ' + HM.fmtDate(date, 'long'), 60, 338);
    ctx.strokeStyle = '#e4ebf5';
    ctx.beginPath();
    ctx.moveTo(60, 365);
    ctx.lineTo(840, 365);
    ctx.stroke();
    let y = 420;
    lines.forEach(function (line, i) {
      if (line.type === 'title') {
        ctx.fillStyle = '#2563eb';
        ctx.font = '700 19px Segoe UI, Arial, sans-serif';
        ctx.fillText(line.text, 60, y);
        y += 34;
      } else if (line.type === 'space') {
        y += 24;
      } else {
        ctx.fillStyle = '#2a3a52';
        ctx.font = '400 20px Segoe UI, Arial, sans-serif';
        ctx.fillText(line.text, 60, y);
        y += 34;
      }
    });
    ctx.fillStyle = '#eff6ff';
    ctx.fillRect(0, 1090, 900, 110);
    ctx.fillStyle = '#60708a';
    ctx.font = '400 16px Segoe UI, Arial, sans-serif';
    ctx.fillText('Generado con SaludEnOrden · Historial médico personal', 60, 1148);
    const blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
    const file = new File([blob], title.replace(/\s+/g, '-').toLowerCase() + '.png', { type: 'image/png' });
    const saved = await HM.files.save(file);
    return {
      id: HM.uid(),
      name: title + '.png',
      category: category,
      date: date,
      providerId: providerId,
      notes: 'Documento de demostración generado por SaludEnOrden.',
      fileId: saved.id,
      createdAt: HM.nowISO()
    };
  }

  HM.loadDemoData = async function () {
    await HM.clearAllData();
    HM.logMuted = true;

    const p1 = HM.uid();
    const p2 = HM.uid();
    const p3 = HM.uid();
    const p4 = HM.uid();
    const p5 = HM.uid();
    const p6 = HM.uid();
    const providers = [
      { id: p1, type: 'medico', name: 'Dr. Ricardo Salinas', specialty: 'Medicina general', phone: '55 5544 3322', email: 'r.salinas@correo.com', address: 'Consultorio 302, Centro Médico Polanco, CDMX', notes: 'Médico de cabecera. Atención con cita.' },
      { id: p2, type: 'medico', name: 'Dra. Paola Ruiz', specialty: 'Ginecología y obstetricia', phone: '55 3311 2200', email: 'dra.paola.ruiz@correo.com', address: 'Clínica Delta, Consultorio 12, CDMX', notes: '' },
      { id: p3, type: 'hospital', name: 'Hospital Central del Sur', specialty: 'Hospital general', phone: '55 8899 1100', email: '', address: 'Av. Insurgentes Sur 1234, CDMX', notes: 'Urgencias 24 h.' },
      { id: p4, type: 'laboratorio', name: 'Laboratorio Salud Total', specialty: 'Análisis clínicos', phone: '55 6677 8899', email: 'contacto@saludtotal.mx', address: 'Calle Durango 45, Roma Norte, CDMX', notes: 'Entrega de resultados en 24 h.' },
      { id: p5, type: 'clinica', name: 'Clínica de Especialidades Delta', specialty: 'Consulta de especialidades', phone: '55 2233 4455', email: '', address: 'Av. Universidad 500, CDMX', notes: '' },
      { id: p6, type: 'medico', name: 'Dr. Andrés Mendoza', specialty: 'Cardiología', phone: '55 7788 9900', email: 'a.mendoza@correo.com', address: 'Clínica Delta, Consultorio 21, CDMX', notes: 'Control anual.' }
    ];

    const profile = {
      id: 'profile',
      firstName: 'María Fernanda',
      lastName: 'López Ramírez',
      birthDate: '1992-03-18',
      sex: 'Femenino',
      bloodType: 'O+',
      height: 164,
      phone: '55 1234 5678',
      email: 'maria.lopez@correo.com',
      address: 'Av. Reforma 245, Col. Juárez, Cuauhtémoc, CDMX',
      city: 'Ciudad de México',
      documentId: 'LORM920318MDFPRR09',
      insurance: 'GNP Seguros',
      policyNumber: 'GNP-8842190',
      emergencyContacts: [
        { id: HM.uid(), name: 'Carlos Hernández', relationship: 'Esposo/a', phone: '55 9876 5432', email: 'carlos.h@correo.com', notes: 'Contacto principal' },
        { id: HM.uid(), name: 'Ana Ramírez', relationship: 'Madre', phone: '55 4433 2211', email: '', notes: '' }
      ],
      allergies: [
        { id: HM.uid(), substance: 'Penicilina', severity: 'Grave', reaction: 'Anafilaxia, dificultad para respirar', notes: 'Usar antibiótico alternativo. Portar identificación médica.' },
        { id: HM.uid(), substance: 'Polen', severity: 'Leve', reaction: 'Estornudos y congestión nasal', notes: 'Temporada de primavera.' }
      ],
      conditions: [
        { id: HM.uid(), name: 'Migraña con aura', since: '2018', notes: '2 a 3 episodios al mes.' },
        { id: HM.uid(), name: 'Anemia ferropénica', since: '2021', notes: 'Controlada con suplemento de hierro.' }
      ],
      familyHistory: [
        { id: HM.uid(), relative: 'Madre', condition: 'Diabetes tipo 2', notes: 'Diagnosticada a los 55 años.' },
        { id: HM.uid(), relative: 'Padre', condition: 'Hipertensión arterial', notes: 'En tratamiento.' },
        { id: HM.uid(), relative: 'Abuela materna', condition: 'Cáncer de mama', notes: 'Diagnosticado a los 62 años.' }
      ],
      notes: 'Alergia grave a la penicilina. Llevar siempre identificación médica y este historial actualizado.',
      updatedAt: HM.nowISO(),
      createdAt: HM.nowISO()
    };

    const vitals = [];
    const weightValues = [66.2, 65.8, 65.5, 65.3, 65.0, 64.9, 64.7, 64.8];
    weightValues.forEach(function (w, i) {
      vitals.push({
        id: HM.uid(), type: 'peso', date: demoDate(56 - i * 8, 7, 30).toISOString(),
        values: { value: w }, note: i === 7 ? 'Control de peso mensual' : '', createdAt: HM.nowISO()
      });
    });
    const pressures = [
      [122, 80, 74], [118, 78, 70], [126, 82, 78], [120, 79, 72], [124, 80, 76],
      [119, 77, 71], [121, 78, 73], [117, 76, 70]
    ];
    pressures.forEach(function (v, i) {
      vitals.push({
        id: HM.uid(), type: 'presion', date: demoDate(52 - i * 7, 8, 15).toISOString(),
        values: { systolic: v[0], diastolic: v[1], pulse: v[2] }, note: '', createdAt: HM.nowISO()
      });
    });
    [104, 98, 96, 101, 94, 92].forEach(function (g, i) {
      vitals.push({
        id: HM.uid(), type: 'glucosa', date: demoDate(45 - i * 8, 7, 45).toISOString(),
        values: { value: g, context: i % 2 ? 'Después de comer' : 'En ayunas' }, note: '', createdAt: HM.nowISO()
      });
    });
    [72, 68, 75, 70, 74].forEach(function (p, i) {
      vitals.push({ id: HM.uid(), type: 'pulso', date: demoDate(35 - i * 7, 21, 10).toISOString(), values: { value: p }, note: '', createdAt: HM.nowISO() });
    });
    [97, 98, 97].forEach(function (o, i) {
      vitals.push({ id: HM.uid(), type: 'oxigeno', date: demoDate(20 - i * 6, 22, 0).toISOString(), values: { value: o }, note: '', createdAt: HM.nowISO() });
    });
    [36.5, 36.8].forEach(function (t, i) {
      vitals.push({ id: HM.uid(), type: 'temperatura', date: demoDate(12 - i * 5, 20, 30).toISOString(), values: { value: t }, note: '', createdAt: HM.nowISO() });
    });
    vitals.push({
      id: HM.uid(), type: 'sintoma', date: demoDate(3, 18, 20).toISOString(),
      values: { description: 'Dolor de cabeza pulsátil con sensibilidad a la luz', intensity: 6, duration: '4 horas' },
      note: 'Cedió con sumatriptán y descanso en habitación oscura.', createdAt: HM.nowISO()
    });

    const recordConsultaId = HM.uid();
    const records = [
      {
        id: recordConsultaId, type: 'consulta', date: demoRecordDate(24),
        title: 'Consulta de seguimiento · Medicina general', providerId: p1, doctor: 'Dr. Ricardo Salinas',
        diagnosis: 'Migraña con aura. Anemia ferropénica controlada.',
        treatment: 'Continuar vitamina D y hierro. Sumatriptán al inicio de la crisis. Higiene del sueño.',
        notes: 'Paciente refiere mejoría de los episodios de migraña. Se recomienda control en 3 meses y nueva biometría hemática.',
        fileIds: [], createdAt: HM.nowISO()
      },
      {
        id: HM.uid(), type: 'laboratorio', date: demoRecordDate(40),
        title: 'Biometría hemática y perfil metabólico', providerId: p4, doctor: 'Laboratorio Salud Total',
        diagnosis: 'Hemoglobina 12.8 g/dL · Ferritina 28 ng/mL · Glucosa 94 mg/dL · Colesterol total 178 mg/dL',
        treatment: 'Resultados dentro de parámetros, ferritina en límite bajo.',
        notes: 'Se sugiere continuar suplemento de hierro y repetir estudio en 3 meses. Resultados completos en el documento adjunto.',
        fileIds: [], createdAt: HM.nowISO()
      },
      {
        id: HM.uid(), type: 'vacuna', date: demoRecordDate(118),
        title: 'Vacuna contra la influenza · dosis anual', providerId: p1, doctor: 'Dr. Ricardo Salinas',
        diagnosis: '', treatment: 'Dosis 0.5 ml, vía intramuscular.', notes: 'Sin reacciones adversas. Próxima dosis anual.',
        vaccineDose: '0.5 ml · IM', nextDose: HM.toDateInput(HM.addDays(new Date(), 247)),
        fileIds: [], createdAt: HM.nowISO()
      },
      {
        id: HM.uid(), type: 'diagnostico', date: demoRecordDate(61),
        title: 'Diagnóstico de migraña con aura', providerId: p1, doctor: 'Dr. Ricardo Salinas',
        diagnosis: 'Migraña con aura (CIE-10 G43.1)', treatment: 'Sumatriptán 50 mg al inicio. Seguimiento con diario de crisis.',
        notes: 'Se descartan causas secundarias. Identificar desencadenantes: falta de sueño y estrés.', fileIds: [], createdAt: HM.nowISO()
      },
      {
        id: HM.uid(), type: 'cirugia', date: '2015-08-12',
        title: 'Apendicectomía laparoscópica', providerId: p3, doctor: 'Dr. Fernando Ibarra',
        diagnosis: 'Apendicitis aguda', treatment: 'Cirugía sin complicaciones. Recuperación completa.', notes: 'Hospitalización de 2 días. Sin secuelas.', fileIds: [], createdAt: HM.nowISO()
      },
      {
        id: HM.uid(), type: 'hospitalizacion', date: '2019-06-03',
        title: 'Hospitalización por deshidratación', providerId: p3, doctor: 'Urgencias · Hospital Central del Sur',
        diagnosis: 'Gastroenteritis aguda con deshidratación moderada', treatment: 'Hidratación intravenosa y observación por 24 horas.', notes: 'Egreso sin complicaciones.', fileIds: [], createdAt: HM.nowISO()
      }
    ];

    const treatmentVitamin = {
      id: HM.uid(), name: 'Vitamina D3', dose: '1000 UI', form: 'Cápsula', times: ['09:00'],
      frequency: 'Una vez al día', startDate: demoRecordDate(35), endDate: '', active: true,
      prescriber: 'Dr. Ricardo Salinas', reason: 'Déficit de vitamina D', instructions: 'Tomar con el desayuno. No exceder la dosis indicada.',
      fileIds: [], createdAt: HM.nowISO()
    };
    const treatmentIron = {
      id: HM.uid(), name: 'Sulfato ferroso', dose: '325 mg', form: 'Tableta', times: ['21:00'],
      frequency: 'Una vez al día', startDate: demoRecordDate(62), endDate: '', active: true,
      prescriber: 'Dr. Ricardo Salinas', reason: 'Anemia ferropénica', instructions: 'Tomar con jugo de cítricos, evitar café o lácteos en la misma toma.',
      fileIds: [], createdAt: HM.nowISO()
    };
    const treatmentIbu = {
      id: HM.uid(), name: 'Ibuprofeno', dose: '400 mg', form: 'Tableta', times: ['08:00', '20:00'],
      frequency: 'Cada 12 horas', startDate: demoRecordDate(12), endDate: demoRecordDate(7), active: false,
      prescriber: 'Dr. Ricardo Salinas', reason: 'Crisis de migraña', instructions: 'Tomar solo si hay dolor. Con alimentos.',
      fileIds: [], createdAt: HM.nowISO()
    };
    const treatments = [treatmentVitamin, treatmentIron, treatmentIbu];

    const doseLogs = [];
    [treatmentVitamin, treatmentIron].forEach(function (t) {
      for (let i = 1; i <= 7; i++) {
        const date = demoRecordDate(i);
        HM.treatmentTimes(t).forEach(function (time) {
          const skip = (i === 4 && t.id === treatmentIron.id);
          if (!skip) {
            doseLogs.push({
              id: t.id + '|' + date + '|' + time, treatmentId: t.id, date: date, time: time,
              status: 'tomada', loggedAt: demoDate(i, 12, 0).toISOString()
            });
          }
        });
      }
    });

    const appointments = [
      {
        id: HM.uid(), dateTime: demoDateTime(6, 11, 30), title: 'Control de cardiología',
        specialty: 'Cardiología', providerId: p6, doctor: 'Dr. Andrés Mendoza',
        location: 'Clínica Delta, Consultorio 21', reason: 'Control anual y revisión de presión arterial',
        notes: 'Llevar registro de presión arterial de los últimos 30 días.',
        status: 'pendiente', reminderMinutes: 1440, createdAt: HM.nowISO()
      },
      {
        id: HM.uid(), dateTime: demoDateTime(18, 10, 0), title: 'Revisión ginecológica anual',
        specialty: 'Ginecología', providerId: p2, doctor: 'Dra. Paola Ruiz',
        location: 'Clínica Delta, Consultorio 12', reason: 'Revisión anual',
        notes: '', status: 'pendiente', reminderMinutes: 1440, createdAt: HM.nowISO()
      },
      {
        id: HM.uid(), dateTime: demoDateTime(46, 8, 15), title: 'Perfil tiroideo y ferritina',
        specialty: 'Laboratorio', providerId: p4, doctor: '',
        location: 'Laboratorio Salud Total, Roma Norte', reason: 'Control de anemia',
        notes: 'Acudir en ayunas.', status: 'pendiente', reminderMinutes: 720, createdAt: HM.nowISO()
      },
      {
        id: HM.uid(), dateTime: demoDateTime(-24, 10, 0), title: 'Consulta de seguimiento',
        specialty: 'Medicina general', providerId: p1, doctor: 'Dr. Ricardo Salinas',
        location: 'Centro Médico Polanco', reason: 'Seguimiento de migraña',
        notes: 'Se ajustó el tratamiento.', status: 'asistida', reminderMinutes: 60,
        recordId: recordConsultaId, createdAt: HM.nowISO()
      }
    ];

    const documents = [];
    try {
      const labDoc = await createDemoDocument(
        'Resultados de laboratorio',
        'Biometría hemática y perfil metabólico',
        [
          { type: 'title', text: 'RESULTADOS PRINCIPALES' },
          { text: 'Hemoglobina ......................... 12.8 g/dL' },
          { text: 'Ferritina ................................ 28 ng/mL' },
          { text: 'Glucosa en ayunas .............. 94 mg/dL' },
          { text: 'Colesterol total ..................... 178 mg/dL' },
          { type: 'space' },
          { type: 'title', text: 'OBSERVACIONES' },
          { text: 'Ferritina en límite bajo. Continuar con hierro.' },
          { text: 'Repetir estudio en 3 meses.' }
        ],
        'laboratorio', p4, demoRecordDate(40)
      );
      documents.push(labDoc);
      const rxDoc = await createDemoDocument(
        'Receta médica',
        'Vitamina D3 y sulfato ferroso',
        [
          { type: 'title', text: 'INDICACIONES' },
          { text: 'Vitamina D3 1000 UI · 1 cápsula al día' },
          { text: 'Sulfato ferroso 325 mg · 1 tableta por la noche' },
          { text: 'Duración: 3 meses' },
          { type: 'space' },
          { type: 'title', text: 'RECOMENDACIONES' },
          { text: 'Tomar el hierro con cítricos, no con lácteos.' },
          { text: 'Mantener horario regular de sueño.' }
        ],
        'receta', p1, demoRecordDate(35)
      );
      documents.push(rxDoc);
    } catch (err) {
      console.warn('No se pudieron generar los documentos de ejemplo', err);
    }

    await Promise.all([
      HM.db.bulkPut('providers', providers),
      HM.db.bulkPut('vitals', vitals),
      HM.db.bulkPut('records', records),
      HM.db.bulkPut('treatments', treatments),
      HM.db.bulkPut('doseLogs', doseLogs),
      HM.db.bulkPut('appointments', appointments),
      HM.db.bulkPut('documents', documents),
      HM.db.put('profile', profile)
    ]);
    await HM.setSetting({ demo: true, notifications: state.settings ? !!state.settings.notifications : false });
    await HM.loadAll();
    HM.logMuted = false;
    await HM.logManual('demo', 'Datos', '');
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    return true;
  };

})();
