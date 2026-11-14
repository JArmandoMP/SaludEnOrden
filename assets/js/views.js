/* ============================================================
   SaludEnOrden · Vistas de la aplicación
   ============================================================ */
(function () {
  'use strict';
  const HM = window.HM;
  const V = (HM.views = {});

  HM.ui = HM.ui || { monitorMetric: null };

  /* ----------------------------- Helpers ----------------------------- */
  function esc(v) { return HM.escape(v); }

  function pageHead(title, subtitle, actions) {
    return '<div class="page-head">' +
      '<div><h2>' + esc(title) + '</h2><p>' + subtitle + '</p></div>' +
      (actions ? '<div class="actions">' + actions + '</div>' : '') +
      '</div>';
  }

  function emptyState(icon, title, text, action) {
    return '<div class="empty-state">' +
      '<span class="empty-icon">' + HM.icon(icon) + '</span>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p>' + esc(text) + '</p>' +
      (action || '') +
      '</div>';
  }

  function statCard(icon, cls, label, value, meta) {
    return '<div class="stat">' +
      '<div class="stat-top"><span class="stat-icon ' + cls + '">' + HM.icon(icon) + '</span><span class="stat-label">' + esc(label) + '</span></div>' +
      '<div class="stat-value">' + value + '</div>' +
      '<div class="stat-meta">' + meta + '</div>' +
      '</div>';
  }

  function recordType(type) {
    return HM.recordTypes[type] || HM.recordTypes.otro;
  }

  function vitalType(type) {
    return HM.vitalTypes[type] || HM.vitalTypes.presion;
  }

  function latestVital(type) {
    return HM.state.vitals
      .filter(function (v) { return v.type === type; })
      .sort(function (a, b) { return (HM.parseDate(b.date) || 0) - (HM.parseDate(a.date) || 0); })[0] || null;
  }

  function vitalsOf(type) {
    return HM.state.vitals
      .filter(function (v) { return v.type === type; })
      .sort(function (a, b) { return (HM.parseDate(a.date) || 0) - (HM.parseDate(b.date) || 0); });
  }

  function vitalValue(v) {
    if (!v) return '';
    const t = v.type;
    const values = v.values || {};
    if (t === 'presion') return values.systolic + '/' + values.diastolic;
    if (t === 'glucosa') return HM.num(values.value, 0) + ' mg/dL';
    if (t === 'peso') return HM.num(values.value, 1) + ' kg';
    if (t === 'temperatura') return HM.num(values.value, 1) + ' °C';
    if (t === 'pulso') return HM.num(values.value, 0) + ' lpm';
    if (t === 'oxigeno') return HM.num(values.value, 0) + '%';
    if (t === 'sintoma') return values.description || 'Síntoma';
    return '—';
  }

  function vitalBig(v) {
    if (!v) return '—';
    const values = v.values || {};
    if (v.type === 'presion') return HM.num(values.systolic, 0) + '<span style="color:var(--muted-2);font-weight:500;font-size:18px"> / </span>' + HM.num(values.diastolic, 0);
    if (v.type === 'glucosa') return HM.num(values.value, 0) + '<small>mg/dL</small>';
    if (v.type === 'peso') return HM.num(values.value, 1) + '<small>kg</small>';
    if (v.type === 'temperatura') return HM.num(values.value, 1) + '<small>°C</small>';
    if (v.type === 'pulso') return HM.num(values.value, 0) + '<small>lpm</small>';
    if (v.type === 'oxigeno') return HM.num(values.value, 0) + '<small>%</small>';
    if (v.type === 'sintoma') return HM.escape(values.description || 'Síntoma');
    return '—';
  }

  function vitalMeta(v) {
    if (!v) return 'Sin registros todavía';
    const parts = [HM.relativeDay(v.date)];
    if (v.type === 'glucosa' && v.values && v.values.context) parts.push(v.values.context);
    if (v.type === 'presion' && v.values && v.values.pulse) parts.push('Pulso ' + v.values.pulse + ' lpm');
    if (v.type === 'temperatura' && v.values && v.values.method) parts.push(v.values.method);
    return parts.join(' · ');
  }

  function dateBlock(date) {
    const d = HM.parseDate(date) || new Date();
    return '<div class="date-block"><strong>' + d.getDate() + '</strong><span>' + HM.fmtDate(d, 'monthShort') + '</span></div>';
  }

  function capitalize(text) {
    const s = String(text || '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function providerLabel(providerId, fallback) {
    const p = providerId ? HM.provider(providerId) : null;
    return p ? p.name : (fallback || '');
  }

  function trendInfo(type) {
    const items = vitalsOf(type);
    if (items.length < 2) return { items: items, delta: null };
    const last = items[items.length - 1];
    const prev = items[items.length - 2];
    const get = function (v) {
      if (!v) return null;
      if (v.type === 'presion') return v.values.systolic;
      if (v.type === 'sintoma') return v.values.intensity;
      return v.values.value;
    };
    const a = get(last);
    const b = get(prev);
    if (a == null || b == null) return { items: items, delta: null };
    return { items: items, delta: a - b, prev: b, last: a };
  }

  /* ----------------------------- Resumen ----------------------------- */
  V.inicio = async function () {
    const p = HM.state.profile;
    const name = HM.profileFirstName();
    const alerts = HM.alerts();
    const completeness = HM.profileCompleteness();
    const active = HM.activeTreatments();
    const upcoming = HM.upcomingAppointments(60).slice(0, 3);
    const records = HM.sortDesc(HM.state.records, 'date').slice(0, 4);
    const docs = HM.sortDesc(HM.state.documents, 'date').slice(0, 3);
    const latestPressure = latestVital('presion');
    const latestGlucose = latestVital('glucosa');
    const latestWeight = latestVital('peso');
    const nextAppt = HM.upcomingAppointments(365)[0] || null;
    const bmi = latestWeight && p && p.height ? HM.computeBMI(latestWeight.values.value, p.height) : null;
    const severeAllergies = (p && p.allergies ? p.allergies : []).filter(function (a) { return HM.severityRank(a.severity) >= 3; });

    let html = '';

    if (HM.state.dbError) {
      html += '<div class="error-banner">' + HM.icon('alert-triangle') + '<div><strong>No se pudieron cargar los datos.</strong><br>' + esc(HM.state.dbError) + '<br>Si abriste el archivo directamente, prueba con Chrome o Edge actualizado.</div></div>';
    }

    html += '<section class="hero">' +
      '<div class="hero-copy">' +
        '<span class="hero-kicker">' + HM.icon('sparkles') + (p ? 'Tu salud, en orden' : 'Tu historial médico personal') + '</span>' +
        '<h2>' + (p ? esc(HM.getGreeting()) + ', ' + esc(name || 'bienvenido') : 'Bienvenido a SaludEnOrden') + '</h2>' +
        '<p>' + (p
          ? 'Este es tu resumen de salud de hoy. Registra cómo te sientes y mantén a mano toda tu información médica.'
          : 'Crea tu perfil médico, guarda estudios y recetas, y genera un informe completo en PDF cuando lo necesites.') + '</p>' +
        '<div class="hero-actions">' +
          (p
            ? '<button type="button" class="btn btn-white-solid" data-action="add-vital">' + HM.icon('plus') + ' Registrar signos</button>' +
              '<button type="button" class="btn btn-white" data-action="add-appointment">' + HM.icon('calendar-plus') + ' Nueva cita</button>'
            : '<button type="button" class="btn btn-white-solid" data-action="edit-profile">' + HM.icon('user') + ' Crear mi perfil</button>' +
              '<a class="btn btn-white" href="#/informe">' + HM.icon('printer') + ' Ver informe</a>') +
        '</div>' +
        '<div class="hero-stats">' +
          '<div class="hero-stat"><strong>' + HM.state.records.length + '</strong><span>registros clínicos</span></div>' +
          '<div class="hero-stat"><strong>' + HM.state.documents.length + '</strong><span>documentos guardados</span></div>' +
          '<div class="hero-stat"><strong>' + active.length + '</strong><span>tratamientos activos</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="hero-art"><img src="assets/img/hero.svg" alt="Ilustración de salud y expediente médico" width="460" height="380"></div>' +
    '</section>';

    if (!p || completeness.percent < 100) {
      const missing = [];
      if (!p || !p.firstName) missing.push('nombre');
      if (!p || !p.birthDate) missing.push('fecha de nacimiento');
      if (!p || !p.bloodType || p.bloodType === 'No lo sé') missing.push('grupo sanguíneo');
      if (!p || !p.address) missing.push('dirección');
      if (!p || !p.emergencyContacts || !p.emergencyContacts.length) missing.push('contacto de emergencia');
      if (!p || !p.allergies || !p.allergies.length) missing.push('alergias');
      html += '<div class="card card-pad section-gap" style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">' +
        '<span class="stat-icon ic-blue" style="width:46px;height:46px;border-radius:14px">' + HM.icon('user') + '</span>' +
        '<div class="grow" style="min-width:220px"><div class="spread" style="margin-bottom:7px"><strong style="font-size:13px">Completa tu perfil médico</strong><span class="tiny muted">' + completeness.percent + '%</span></div>' +
          '<div class="progress-track"><div class="progress-fill" style="width:' + completeness.percent + '%"></div></div>' +
          '<p class="tiny muted" style="margin-top:6px">' + (missing.length ? 'Falta: ' + missing.slice(0, 4).join(', ') + (missing.length > 4 ? '…' : '') : 'Tu perfil está completo.') + '</p>' +
        '</div>' +
        '<button type="button" class="btn btn-soft btn-sm" data-action="edit-profile">' + HM.icon('edit') + ' Editar perfil</button>' +
      '</div>';
    }

    const emergencyBits = [];
    if (severeAllergies.length) emergencyBits.push('Alergia grave: ' + severeAllergies.map(function (a) { return a.substance; }).join(', '));
    if (p && p.bloodType) emergencyBits.push('Grupo sanguíneo: ' + p.bloodType);
    if (p && p.emergencyContacts && p.emergencyContacts[0]) {
      emergencyBits.push('Emergencias: ' + p.emergencyContacts[0].name + ' · ' + p.emergencyContacts[0].phone);
    }
    if (severeAllergies.length || (p && p.emergencyContacts && p.emergencyContacts.length)) {
      html += '<div class="alert-box ' + (severeAllergies.length ? 'rose' : 'blue') + ' section-gap" style="align-items:center">' +
        HM.icon(severeAllergies.length ? 'alert-triangle' : 'shield') +
        '<div class="grow"><strong>' + (severeAllergies.length ? 'Información crítica de salud' : 'Datos de emergencia listos') + '</strong>' +
          '<div class="tiny" style="margin-top:2px">' + esc(emergencyBits.join('  ·  ')) + '</div></div>' +
        '<a href="#/perfil" class="btn btn-sm btn-outline">Ver perfil</a>' +
      '</div>';
    }

    html += '<div class="grid grid-4 section-gap">' +
      statCard('gauge', 'ic-blue', 'Última presión arterial', latestPressure ? vitalBig(latestPressure) : '—', latestPressure ? vitalMeta(latestPressure) : 'Sin mediciones') +
      statCard('droplet', 'ic-violet', 'Última glucosa', latestGlucose ? vitalBig(latestGlucose) : '—', latestGlucose ? vitalMeta(latestGlucose) : 'Sin mediciones') +
      statCard('weight', 'ic-teal', 'Peso actual', latestWeight ? vitalBig(latestWeight) : '—', bmi ? 'IMC ' + HM.num(bmi, 1) + ' · ' + HM.bmiLabel(bmi) : latestWeight ? vitalMeta(latestWeight) : 'Sin mediciones') +
      (nextAppt
        ? statCard('calendar', 'ic-amber', 'Próxima cita', '<span style="font-size:19px;line-height:1.25;display:block;margin-top:2px">' + esc(nextAppt.title) + '</span>', HM.countdown(nextAppt.dateTime) + ' · ' + HM.fmtDate(nextAppt.dateTime, 'short'))
        : statCard('calendar', 'ic-amber', 'Próxima cita', '—', 'Agenda tu siguiente consulta')) +
    '</div>';

    /* Evolución de signos vitales (tarjeta de tendencia en el resumen) */
    const trendMetric = HM.ui.monitorMetric || (latestPressure ? 'presion' : (['glucosa', 'peso', 'temperatura', 'pulso', 'oxigeno'].filter(function (t) { return latestVital(t); })[0] || 'presion'));
    HM.ui.monitorMetric = trendMetric;
    html += '<div class="card card-pad section-gap">' +
      '<div class="card-head"><div><h2>Evolución de tus signos</h2><p>Cómo han cambiado tus últimas mediciones.</p></div>' +
        '<a href="#/monitoreo" class="btn btn-ghost btn-sm">Ver todo ' + HM.icon('arrow-right') + '</a></div>' +
      '<div id="homeTrendBlock">' + trendBlockHTML(trendMetric) + '</div>' +
    '</div>';

    /* Hoy */
    let dosesHTML = '';
    if (alerts.doses.length) {
      dosesHTML = alerts.doses.slice(0, 5).map(function (dose) {
        const done = dose.status === 'tomada';
        const overdue = !done && dose.time < HM.timeNow();
        return '<div class="dose-row' + (done ? ' done' : '') + '">' +
          '<span class="dose-time">' + esc(dose.time) + '</span>' +
          '<div class="dose-info"><strong>' + esc(dose.treatment.name) + '</strong><span>' + esc(dose.treatment.dose) + (overdue ? ' · <span style="color:var(--amber-600);font-weight:700">Hora pasada</span>' : '') + '</span></div>' +
          '<button type="button" class="dose-check' + (done ? ' checked' : '') + '" data-action="toggle-dose" data-id="' + dose.treatment.id + '" data-date="' + alerts.today + '" data-time="' + dose.time + '" data-status="' + (done ? 'tomada' : 'pendiente') + '" aria-label="' + (done ? 'Marcar como pendiente' : 'Marcar como tomada') + '">' + HM.icon(done ? 'check' : 'check') + '</button>' +
        '</div>';
      }).join('');
      if (alerts.doses.length > 5) {
        dosesHTML += '<a href="#/tratamientos" class="tiny" style="text-align:center;padding:5px;font-weight:700">Ver las ' + alerts.doses.length + ' tomas de hoy</a>';
      }
    } else {
      dosesHTML = emptyState('pill', 'Sin tomas programadas', active.length ? 'No hay tomas para hoy.' : 'Agrega un tratamiento para recibir recordatorios.', '<button type="button" class="btn btn-soft btn-sm" data-action="add-treatment">' + HM.icon('plus') + ' Agregar tratamiento</button>');
    }

    let apptsHTML = '';
    if (upcoming.length) {
      apptsHTML = upcoming.map(function (a) {
        return '<div class="mini-appt">' + dateBlock(a.dateTime) +
          '<div class="grow" style="min-width:0"><strong>' + esc(a.title) + '</strong><p>' + esc(a.doctor || providerLabel(a.providerId, '') || a.specialty || 'Cita médica') + ' · ' + HM.fmtTime(a.dateTime) + '</p>' +
          '<span class="countdown' + (HM.daysBetween(new Date(), a.dateTime) <= 1 ? ' soon' : '') + '" style="margin-top:5px;display:inline-block">' + HM.countdown(a.dateTime) + '</span></div>' +
          '</div>';
      }).join('');
      apptsHTML += '<a href="#/citas" class="btn btn-ghost btn-sm btn-block">Ver toda la agenda ' + HM.icon('arrow-right') + '</a>';
    } else {
      apptsHTML = emptyState('calendar', 'Sin citas próximas', 'Agenda una consulta y te recordaremos la fecha.', '<button type="button" class="btn btn-soft btn-sm" data-action="add-appointment">' + HM.icon('plus') + ' Agendar cita</button>');
    }

    html += '<div class="dash-split section-gap">' +
      '<div class="card card-pad">' +
        '<div class="card-head"><div><h2>Tomas de hoy</h2><p>Marca cada medicamento cuando lo tomes.</p></div><a href="#/tratamientos" class="btn btn-ghost btn-sm">Ver tratamientos ' + HM.icon('arrow-right') + '</a></div>' +
        '<div class="today-list">' + dosesHTML + '</div>' +
      '</div>' +
      '<div class="card card-pad">' +
        '<div class="card-head"><div><h2>Próximas citas</h2><p>Tu agenda médica.</p></div><a href="#/citas" class="btn btn-ghost btn-sm">Ver todas</a></div>' +
        '<div class="today-list">' + apptsHTML + '</div>' +
      '</div>' +
    '</div>';

    /* Historial y documentos */
    let recordsHTML = '';
    if (records.length) {
      recordsHTML = records.map(function (r) {
        const meta = recordType(r.type);
        return '<div class="dose-row" data-action="view-record" data-id="' + r.id + '" style="cursor:pointer">' +
          '<span class="stat-icon ' + (meta.cls === 'blue' ? 'ic-blue' : meta.cls === 'sky' ? 'ic-sky' : meta.cls === 'green' ? 'ic-green' : meta.cls === 'violet' ? 'ic-violet' : meta.cls === 'amber' ? 'ic-amber' : meta.cls === 'teal' ? 'ic-teal' : 'ic-gray') + '" style="width:34px;height:34px;border-radius:10px">' + HM.icon(meta.icon) + '</span>' +
          '<div class="dose-info"><strong>' + esc(r.title) + '</strong><span>' + HM.fmtDate(r.date, 'short') + ' · ' + esc(providerLabel(r.providerId, r.doctor || meta.label)) + '</span></div>' +
          HM.icon('chevron-right', 'sm') +
        '</div>';
      }).join('');
    } else {
      recordsHTML = emptyState('clipboard', 'Tu historial está vacío', 'Agrega consultas, diagnósticos, cirugías o estudios.', '<button type="button" class="btn btn-soft btn-sm" data-action="add-record">' + HM.icon('plus') + ' Nuevo registro</button>');
    }

    let docsHTML = '';
    if (docs.length) {
      docsHTML = docs.map(function (doc) {
        const cat = HM.docCategories[doc.category] || HM.docCategories.otro;
        return '<div class="dose-row" data-action="preview-doc" data-id="' + doc.id + '" style="cursor:pointer">' +
          '<span class="stat-icon ' + (cat.cls === 'sky' ? 'ic-sky' : cat.cls === 'violet' ? 'ic-violet' : cat.cls === 'green' ? 'ic-green' : cat.cls === 'teal' ? 'ic-teal' : 'ic-blue') + '" style="width:34px;height:34px;border-radius:10px">' + HM.icon(cat.icon) + '</span>' +
          '<div class="dose-info"><strong>' + esc(doc.name) + '</strong><span>' + HM.fmtDate(doc.date, 'short') + ' · ' + esc(cat.label) + '</span></div>' +
          HM.icon('chevron-right', 'sm') +
        '</div>';
      }).join('');
      docsHTML += '<a href="#/documentos" class="btn btn-ghost btn-sm btn-block">Abrir archivo médico ' + HM.icon('arrow-right') + '</a>';
    } else {
      docsHTML = emptyState('folder', 'Sin documentos', 'Guarda capturas, recetas o estudios escaneados.', '<button type="button" class="btn btn-soft btn-sm" data-action="add-document">' + HM.icon('upload') + ' Subir documento</button>');
    }

    html += '<div class="dash-split section-gap">' +
      '<div class="card card-pad">' +
        '<div class="card-head"><div><h2>Historial reciente</h2><p>Tus últimos registros clínicos.</p></div><a href="#/historial" class="btn btn-ghost btn-sm">Ver historial ' + HM.icon('arrow-right') + '</a></div>' +
        '<div class="today-list">' + recordsHTML + '</div>' +
      '</div>' +
      '<div class="card card-pad">' +
        '<div class="card-head"><div><h2>Documentos recientes</h2><p>Tu archivo médico digital.</p></div><a href="#/documentos" class="btn btn-ghost btn-sm">Ver todos</a></div>' +
        '<div class="today-list">' + docsHTML + '</div>' +
      '</div>' +
    '</div>';

    return {
      html: html,
      mount: function (root) {
        function bindHomeTabs() {
          root.querySelectorAll('#homeTrendBlock [data-metric]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              HM.ui.monitorMetric = btn.dataset.metric;
              const block = root.querySelector('#homeTrendBlock');
              if (block) {
                block.innerHTML = trendBlockHTML(btn.dataset.metric);
                bindHomeTabs();
              }
            });
          });
        }
        bindHomeTabs();
      }
    };
  };

  /* ----------------------------- Perfil ----------------------------- */
  V.perfil = async function () {
    const p = HM.state.profile;
    if (!p) {
      return {
        html: pageHead('Mi perfil', 'Tu información personal, contactos de emergencia y antecedentes.', '<button type="button" class="btn btn-primary" data-action="edit-profile">' + HM.icon('plus') + ' Crear perfil</button>') +
          '<div class="card card-pad">' + emptyState('user', 'Aún no tienes un perfil', 'Completa tus datos para tener tu información médica siempre a mano.', '<button type="button" class="btn btn-primary" data-action="edit-profile">' + HM.icon('user') + ' Completar mi perfil</button>') + '</div>'
      };
    }

    const age = HM.age(p.birthDate);
    const completeness = HM.profileCompleteness();
    const allergies = p.allergies || [];
    const contacts = p.emergencyContacts || [];
    const conditions = p.conditions || [];
    const family = p.familyHistory || [];
    const severe = allergies.filter(function (a) { return HM.severityRank(a.severity) >= 3; });

    const tags = [];
    if (p.bloodType) tags.push('<span class="badge badge-rose">' + HM.icon('droplet') + esc(p.bloodType) + '</span>');
    if (severe.length) tags.push('<span class="badge badge-amber">' + HM.icon('alert-triangle') + severe.length + ' alergia' + (severe.length > 1 ? 's' : '') + ' grave' + (severe.length > 1 ? 's' : '') + '</span>');
    if (conditions.length) tags.push('<span class="badge badge-violet">' + conditions.length + ' ' + (conditions.length === 1 ? 'condición' : 'condiciones') + '</span>');
    if (p.insurance) tags.push('<span class="badge badge-gray">' + HM.icon('shield') + esc(p.insurance) + '</span>');

    let html = pageHead('Mi perfil', 'Tus datos personales y la información que necesitas en una emergencia.', '<a href="#/tarjeta" class="btn btn-soft">' + HM.icon('scan') + ' Tarjeta de emergencia</a><button type="button" class="btn btn-outline" data-action="add-document">' + HM.icon('upload') + ' Adjuntar documento</button><button type="button" class="btn btn-primary" data-action="edit-profile">' + HM.icon('edit') + ' Editar perfil</button><button type="button" class="btn btn-danger" data-action="delete-profile">' + HM.icon('trash') + ' Eliminar perfil</button>');

    html += '<section class="profile-hero">' +
      '<div class="avatar-xl">' + esc(HM.initials(HM.profileName())) + '</div>' +
      '<div class="profile-main">' +
        '<h2>' + esc(HM.profileName() || 'Mi perfil') + '</h2>' +
        '<p class="sub">' + [age != null ? age + ' años' : '', p.sex, p.birthDate ? 'Nacimiento: ' + HM.fmtDate(p.birthDate, 'short') : ''].filter(Boolean).map(esc).join(' · ') + '</p>' +
        '<div class="profile-tags">' + tags.join('') + '</div>' +
      '</div>' +
      '<div class="profile-side"><div class="completeness"><div class="spread"><span>Perfil completo</span><strong>' + completeness.percent + '%</strong></div><div class="progress-track"><div class="progress-fill' + (completeness.percent === 100 ? ' green' : '') + '" style="width:' + completeness.percent + '%"></div></div></div>' +
        (p.updatedAt ? '<span class="tiny muted">Actualizado ' + HM.fmtDate(p.updatedAt, 'short') + '</span>' : '') +
      '</div>' +
    '</section>';

    if (severe.length) {
      html += '<div class="alert-box rose section-gap">' + HM.icon('alert-triangle') +
        '<div><strong>Alergia grave registrada</strong><div class="tiny" style="margin-top:2px">' + severe.map(function (a) { return esc(a.substance) + (a.reaction ? ' — ' + esc(a.reaction) : ''); }).join(' · ') + '. Informa esto a cualquier médico antes de recibir tratamiento.</div></div>' +
      '</div>';
    }

    html += '<div class="grid grid-3 section-gap">' +
      '<div class="blood-card">' +
        '<div class="blood-head"><span class="blood-icon">' + HM.icon('droplet') + '</span>' +
          '<div><small>Grupo sanguíneo</small><strong>' + esc(p.bloodType || 'Sin datos') + '</strong></div>' +
        '</div>' +
        '<div class="blood-note">' + (p.bloodType ? 'Dato importante para emergencias y transfusiones.' : 'Agrégalo en tu perfil para tenerlo disponible en una emergencia.') + '</div>' +
        '<div class="blood-meta">' +
          '<div><strong>' + severe.length + '</strong><span>alergia' + (severe.length === 1 ? '' : 's') + ' grave' + (severe.length === 1 ? '' : 's') + '</span></div>' +
          '<div><strong>' + contacts.length + '</strong><span>contacto' + (contacts.length === 1 ? '' : 's') + ' de emergencia</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="card card-pad span-2">' +
        '<div class="card-head"><div><h3>Datos personales</h3><p>Información de contacto y cobertura médica.</p></div></div>' +
        '<div class="info-list">' +
          infoItem('Nombre completo', HM.profileName() || '') +
          infoItem('Fecha de nacimiento', p.birthDate ? HM.fmtDate(p.birthDate, 'medium') + (age != null ? ' · ' + age + ' años' : '') : '') +
          infoItem('Teléfono', p.phone) +
          infoItem('Correo', p.email) +
          infoItem('Dirección', p.address) +
          infoItem('Ciudad / Estado', p.city) +
          infoItem('Identificación', p.documentId) +
          infoItem('Aseguradora', p.insurance + (p.policyNumber ? ' · Póliza ' + p.policyNumber : '')) +
        '</div>' +
      '</div>' +
    '</div>';

    html += '<div class="grid grid-2 section-gap">' +
      '<div class="card card-pad">' +
        '<div class="card-head"><div><h3>Contactos de emergencia</h3><p>A quién llamar en caso necesario.</p></div><button type="button" class="icon-btn" data-action="edit-profile" aria-label="Editar contactos">' + HM.icon('edit') + '</button></div>' +
        (contacts.length ? '<div class="stack">' + contacts.map(function (c) {
          return '<div class="contact-card">' +
            '<span class="contact-avatar">' + esc(HM.initials(c.name)) + '</span>' +
            '<div class="grow"><strong>' + esc(c.name) + '</strong><p>' + esc([c.relationship, c.phone, c.email].filter(Boolean).join(' · ')) + '</p>' + (c.notes ? '<p class="tiny">' + esc(c.notes) + '</p>' : '') + '</div>' +
            '<div class="contact-actions">' +
              (c.phone ? '<a class="icon-btn" href="tel:' + esc(String(c.phone).replace(/[^+\d]/g, '')) + '" aria-label="Llamar a ' + esc(c.name) + '">' + HM.icon('phone') + '</a>' : '') +
              (c.email ? '<a class="icon-btn" href="mailto:' + esc(c.email) + '" aria-label="Escribir a ' + esc(c.name) + '">' + HM.icon('mail') + '</a>' : '') +
            '</div>' +
          '</div>';
        }).join('') + '</div>' : '<p class="muted small">Sin contactos registrados.</p>') +
      '</div>' +
      '<div class="card card-pad">' +
        '<div class="card-head"><div><h3>Alergias</h3><p>Sustancias que debes evitar.</p></div><button type="button" class="icon-btn" data-action="edit-profile" aria-label="Editar alergias">' + HM.icon('edit') + '</button></div>' +
        (allergies.length ? '<div class="list-clean">' + allergies.map(function (a) {
          return '<div class="list-item"><span class="li-dot" style="background:' + (HM.severityRank(a.severity) >= 3 ? 'var(--rose-600)' : HM.severityRank(a.severity) === 2 ? 'var(--amber-600)' : 'var(--muted-2)') + '"></span>' +
            '<div class="grow"><strong>' + esc(a.substance) + '</strong><p>' + esc([a.reaction, a.notes].filter(Boolean).join(' · ') || 'Sin detalles') + '</p></div>' +
            '<span class="badge ' + HM.severityBadge(a.severity) + '">' + esc(a.severity || 'Leve') + '</span></div>';
        }).join('') + '</div>' : '<p class="muted small">Sin alergias registradas.</p>') +
      '</div>' +
    '</div>';

    html += '<div class="grid grid-2 section-gap">' +
      '<div class="card card-pad">' +
        '<div class="card-head"><div><h3>Condiciones personales</h3><p>Diagnósticos y padecimientos relevantes.</p></div></div>' +
        (conditions.length ? '<div class="list-clean">' + conditions.map(function (c) {
          return '<div class="list-item"><span class="li-dot"></span><div><strong>' + esc(c.name) + '</strong><p>' + esc([c.since ? 'Desde ' + c.since : '', c.notes].filter(Boolean).join(' · ')) + '</p></div></div>';
        }).join('') + '</div>' : '<p class="muted small">Sin condiciones registradas.</p>') +
      '</div>' +
      '<div class="card card-pad">' +
        '<div class="card-head"><div><h3>Antecedentes familiares</h3><p>Historia de salud en tu familia.</p></div></div>' +
        (family.length ? '<div class="list-clean">' + family.map(function (f) {
          return '<div class="list-item"><span class="li-dot" style="background:var(--violet-600)"></span><div><strong>' + esc(f.condition) + '</strong><p>' + esc([f.relative, f.notes].filter(Boolean).join(' · ')) + '</p></div></div>';
        }).join('') + '</div>' : '<p class="muted small">Sin antecedentes registrados.</p>') +
      '</div>' +
    '</div>';

    html += '<div class="card card-pad section-gap">' +
      '<div class="card-head"><div><h3>Seguridad del perfil</h3><p>Protege tu cuenta con una contraseña para el próximo inicio de sesión.</p></div></div>' +
      (HM.currentHasPassword()
        ? '<div class="row" style="align-items:center"><span class="badge badge-green">' + HM.icon('shield') + ' Contraseña asignada</span><span class="small muted">Se pedirá al entrar a esta cuenta.</span></div>' +
          '<div class="row mt-2"><button type="button" class="btn btn-outline btn-sm" data-action="change-password">' + HM.icon('edit') + ' Cambiar contraseña</button><button type="button" class="btn btn-danger btn-sm" data-action="remove-password">' + HM.icon('trash') + ' Quitar contraseña</button></div>'
        : '<p class="small muted" style="line-height:1.55">Si asignas una contraseña, SaludEnOrden la pedirá la próxima vez que entres a esta cuenta en este dispositivo. Debe incluir letras, números y símbolos.</p>' +
          '<div class="row mt-2"><button type="button" class="btn btn-primary btn-sm" data-action="assign-password">' + HM.icon('shield') + ' Asignar contraseña</button></div>') +
    '</div>';

    if (p.notes) {
      html += '<div class="card card-pad section-gap"><div class="card-head"><div><h3>Notas médicas</h3><p>Información adicional que quieres conservar.</p></div></div><p class="small" style="white-space:pre-wrap;line-height:1.65">' + esc(p.notes) + '</p></div>';
    }

    return { html: html };
  };

  function infoItem(label, value) {
    return '<div class="info-item"><label>' + esc(label) + '</label><span class="' + (value ? '' : 'empty') + '">' + (value ? esc(value) : 'Sin registrar') + '</span></div>';
  }

  /* ----------------------------- Monitoreo ----------------------------- */
  function trendBlockHTML(type) {
    const meta = vitalType(type);
    const items = vitalsOf(type).slice(-16);
    const latest = items[items.length - 1] || null;
    let series = [{ label: meta.short, color: meta.color }];
    let values = items.map(function (v) { return [v.values.value]; });
    let unit = meta.unit;
    let min = null;
    let max = null;
    let formatValue = function (v) { return HM.num(v, 0); };
    let latestHTML = latest ? vitalBig(latest) : '—';
    let avgHTML = '—';

    if (type === 'presion') {
      series = [{ label: 'Sistólica', color: '#2563eb' }, { label: 'Diastólica', color: '#93c5fd' }];
      values = items.map(function (v) { return [v.values.systolic, v.values.diastolic]; });
      min = 40;
    } else if (type === 'glucosa') {
      min = Math.min(40, Math.floor(Math.min.apply(null, items.map(function (v) { return v.values.value; }).concat([60]))) - 10);
      formatValue = function (v) { return HM.num(v, 0); };
    } else if (type === 'oxigeno') {
      min = 80;
      max = 100;
    } else if (type === 'temperatura') {
      min = 34;
      max = 42;
      formatValue = function (v) { return HM.num(v, 1); };
    } else if (type === 'peso') {
      formatValue = function (v) { return HM.num(v, 0); };
    } else if (type === 'pulso') {
      min = 40;
    }

    if (items.length) {
      if (type === 'presion') {
        const avgSys = Math.round(items.reduce(function (s, v) { return s + v.values.systolic; }, 0) / items.length);
        const avgDia = Math.round(items.reduce(function (s, v) { return s + v.values.diastolic; }, 0) / items.length);
        avgHTML = avgSys + '/' + avgDia + ' <span>mmHg</span>';
      } else {
        const avg = items.reduce(function (s, v) { return s + Number(v.values.value); }, 0) / items.length;
        avgHTML = HM.num(avg, type === 'peso' || type === 'temperatura' ? 1 : 0) + ' <span>' + esc(unit) + '</span>';
      }
    }

    const chartItems = items.map(function (v) {
      return {
        date: v.date,
        values: values[items.indexOf(v)] || [],
        tip: HM.fmtDate(v.date, 'short') + ' · ' + (v.type === 'presion' ? v.values.systolic + '/' + v.values.diastolic + ' mmHg' : HM.num(v.values.value, v.type === 'peso' || v.type === 'temperatura' ? 1 : 0) + ' ' + unit)
      };
    });

    let html = '<div class="chart-top">' +
      '<div><div class="chart-tabs">' + ['presion', 'glucosa', 'peso', 'temperatura', 'pulso', 'oxigeno'].map(function (key) {
        const available = latestVital(key);
        return '<button type="button" class="chip' + (key === type ? ' active' : '') + '" data-metric="' + key + '"' + (!available ? ' title="Sin datos aún"' : '') + '>' + HM.icon(HM.vitalTypes[key].icon) + esc(HM.vitalTypes[key].short) + '</button>';
      }).join('') + '</div>' +
      '<div class="chart-value" style="margin-top:14px">' + latestHTML + '</div>' +
      '<p class="tiny muted" style="margin-top:3px">Última medición · ' + (latest ? HM.fmtDate(latest.date, 'datetime') : 'sin registros') + '</p></div>' +
      '<div style="text-align:right"><span class="tiny muted">Promedio reciente</span><div class="chart-value" style="justify-content:flex-end">' + avgHTML + '</div></div>' +
    '</div>';

    if (!items.length) {
      html += '<div class="chart-empty">' + HM.icon('activity') + '<span>Aún no hay datos de ' + esc(meta.label.toLowerCase()) + '.</span><button type="button" class="btn btn-soft btn-sm" data-action="add-vital">' + HM.icon('plus') + ' Agregar medición</button></div>';
      return html;
    }

    html += HM.chartSVG({
      items: chartItems,
      series: series,
      unit: type === 'presion' ? '' : unit,
      min: min,
      max: max,
      formatValue: formatValue,
      height: 258,
      ariaLabel: 'Tendencia de ' + meta.label
    });
    html += '<div class="chart-legend">' + series.map(function (s) { return '<span><span class="legend-dot" style="background:' + s.color + '"></span>' + esc(s.label) + '</span>'; }).join('') +
      '<span style="margin-left:auto">' + items.length + ' medición' + (items.length > 1 ? 'es' : '') + ' recientes</span></div>';
    return html;
  }

  V.monitoreo = async function () {
    const latestPressure = latestVital('presion');
    const latestGlucose = latestVital('glucosa');
    const latestWeight = latestVital('peso');
    const p = HM.state.profile;
    const bmi = latestWeight && p && p.height ? HM.computeBMI(latestWeight.values.value, p.height) : null;
    const typesWithData = ['presion', 'glucosa', 'peso', 'temperatura', 'pulso', 'oxigeno'].filter(function (t) { return latestVital(t); });
    const defaultMetric = HM.ui.monitorMetric || (latestPressure ? 'presion' : (typesWithData[0] || 'presion'));
    HM.ui.monitorMetric = defaultMetric;
    const sorted = HM.sortDesc(HM.state.vitals, 'date');
    const symptoms = sorted.filter(function (v) { return v.type === 'sintoma'; }).slice(0, 6);

    let html = pageHead('Tus signos vitales', 'Registra presión, glucosa, peso o síntomas y observa cómo evolucionan con el tiempo.',
      '<button type="button" class="btn btn-primary" data-action="add-vital">' + HM.icon('plus') + ' Registrar medición</button>');

    html += '<div class="grid grid-4">' +
      statCard('gauge', 'ic-blue', 'Presión arterial', latestPressure ? vitalBig(latestPressure) : '—', latestPressure ? vitalMeta(latestPressure) : 'Sin mediciones') +
      statCard('droplet', 'ic-violet', 'Glucosa', latestGlucose ? vitalBig(latestGlucose) : '—', latestGlucose ? vitalMeta(latestGlucose) : 'Sin mediciones') +
      statCard('weight', 'ic-teal', 'Peso', latestWeight ? vitalBig(latestWeight) : '—', latestWeight ? vitalMeta(latestWeight) : 'Sin mediciones') +
      statCard('activity', 'ic-amber', 'IMC', bmi ? HM.num(bmi, 1) + ' <small>' + HM.bmiLabel(bmi) + '</small>' : '—', bmi ? 'Calculado con tu estatura' : 'Agrega peso y estatura') +
    '</div>';

    html += '<div class="card card-pad section-gap">' +
      '<div id="trendBlock">' + trendBlockHTML(defaultMetric) + '</div>' +
    '</div>';

    html += '<div class="card card-pad section-gap">' +
      '<div class="card-head"><div><h2>Historial de mediciones</h2><p>Todas tus mediciones, de la más reciente a la más antigua.</p></div>' +
        '<div class="head-actions"><select class="select" id="vitalTypeFilter" style="width:auto;min-height:36px;font-size:11.5px"><option value="">Todos los tipos</option>' +
          Object.keys(HM.vitalTypes).map(function (key) { return '<option value="' + key + '">' + esc(HM.vitalTypes[key].label) + '</option>'; }).join('') +
        '</select></div></div>' +
      (sorted.length ? '<div class="table-wrap"><table class="data"><thead><tr><th>Tipo</th><th>Medición</th><th>Fecha</th><th>Nota</th><th style="text-align:right">Acciones</th></tr></thead><tbody id="vitalsBody">' +
        sorted.map(function (v) {
          const meta = vitalType(v.type);
          return '<tr data-vital-type="' + v.type + '">' +
            '<td><div class="table-title"><span class="type-dot" style="background:' + meta.color + '"></span><span class="cell-main">' + esc(meta.label) + '</span></div></td>' +
            '<td><span class="cell-main">' + vitalValue(v) + '</span>' + (v.type === 'presion' && v.values.pulse ? '<span class="cell-sub">Pulso ' + v.values.pulse + ' lpm</span>' : '') + (v.type === 'glucosa' && v.values.context ? '<span class="cell-sub">' + esc(v.values.context) + '</span>' : '') + (v.type === 'sintoma' ? '<span class="cell-sub">Intensidad ' + (v.values.intensity || '—') + '/10' + (v.values.duration ? ' · ' + esc(v.values.duration) : '') + '</span>' : '') + '</td>' +
            '<td><span class="cell-main" style="font-weight:600">' + HM.fmtDate(v.date, 'short') + '</span><span class="cell-sub">' + HM.fmtTime(v.date) + '</span></td>' +
            '<td><span class="cell-sub" style="max-width:210px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(v.note || '—') + '</span></td>' +
            '<td><div class="table-actions"><button type="button" class="icon-btn" data-action="edit-vital" data-id="' + v.id + '" aria-label="Editar">' + HM.icon('edit') + '</button><button type="button" class="icon-btn" data-action="delete-vital" data-id="' + v.id + '" aria-label="Eliminar">' + HM.icon('trash') + '</button></div></td>' +
          '</tr>';
        }).join('') +
      '</tbody></table></div>' : emptyState('activity', 'Sin mediciones todavía', 'Registra tu primera medición para empezar a ver tendencias.', '<button type="button" class="btn btn-primary btn-sm" data-action="add-vital">' + HM.icon('plus') + ' Registrar medición</button>')) +
      '<div class="alert-box blue mt-3">' + HM.icon('info') + '<div><strong>Para medirte la presión:</strong> descansa 5 minutos, siéntate con la espalda apoyada y el brazo a la altura del corazón. Anota siempre la fecha y hora.</div></div>' +
    '</div>';

    if (symptoms.length) {
      html += '<div class="card card-pad section-gap"><div class="card-head"><div><h2>Síntomas recientes</h2><p>Lo que has sentido y su intensidad.</p></div></div><div class="stack">' +
        symptoms.map(function (s) {
          const intensity = Number(s.values.intensity || 0);
          const cls = intensity >= 7 ? 'rose' : intensity >= 4 ? 'amber' : 'green';
          return '<div class="list-item"><span class="li-dot" style="background:var(--' + cls + '-600)"></span><div class="grow"><strong>' + esc(s.values.description) + '</strong><p>' + HM.fmtDate(s.date, 'datetime') + (s.values.duration ? ' · ' + esc(s.values.duration) : '') + (s.note ? ' · ' + esc(s.note) : '') + '</p></div><span class="badge badge-' + cls + '">' + intensity + '/10</span></div>';
        }).join('') + '</div></div>';
    }

    return {
      html: html,
      mount: function (root) {
        function bindTabs() {
          root.querySelectorAll('[data-metric]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              HM.ui.monitorMetric = btn.dataset.metric;
              const block = root.querySelector('#trendBlock');
              if (block) {
                block.innerHTML = trendBlockHTML(btn.dataset.metric);
                bindTabs();
              }
            });
          });
        }
        bindTabs();
        const filter = root.querySelector('#vitalTypeFilter');
        if (filter) {
          filter.addEventListener('change', function () {
            root.querySelectorAll('#vitalsBody tr').forEach(function (row) {
              row.classList.toggle('hidden', !!filter.value && row.dataset.vitalType !== filter.value);
            });
          });
        }
      }
    };
  };

  /* ----------------------------- Historial clínico ----------------------------- */
  V.historial = async function () {
    const records = HM.sortDesc(HM.state.records, 'date');
    const counts = {};
    Object.keys(HM.recordTypes).forEach(function (key) { counts[key] = 0; });
    records.forEach(function (r) { counts[r.type] = (counts[r.type] || 0) + 1; });
    const years = {};
    records.forEach(function (r) {
      const y = HM.fmtDate(r.date, 'year');
      if (!years[y]) years[y] = [];
      years[y].push(r);
    });

    let html = pageHead('Tu historia clínica', 'Consultas, diagnósticos, cirugías, estudios y vacunas organizados cronológicamente.',
      '<button type="button" class="btn btn-primary" data-action="add-record">' + HM.icon('plus') + ' Nuevo registro</button>');

    html += '<div class="grid grid-4">' +
      statCard('clipboard', 'ic-blue', 'Registros totales', String(records.length), 'En tu historial') +
      statCard('stethoscope', 'ic-teal', 'Consultas', String(counts.consulta || 0), 'Registradas') +
      statCard('flask', 'ic-sky', 'Estudios de laboratorio', String(counts.laboratorio || 0), 'Resultados guardados') +
      statCard('syringe', 'ic-green', 'Vacunas', String(counts.vacuna || 0), 'Aplicadas') +
    '</div>';

    const chips = '<button type="button" class="chip active" data-record-filter="todos">Todos <span class="chip-count">' + records.length + '</span></button>' +
      Object.keys(HM.recordTypes).map(function (key) {
        const meta = HM.recordTypes[key];
        return '<button type="button" class="chip" data-record-filter="' + key + '">' + HM.icon(meta.icon) + esc(meta.plural) + ' <span class="chip-count">' + (counts[key] || 0) + '</span></button>';
      }).join('');

    let timeline = '';
    if (records.length) {
      Object.keys(years).sort().reverse().forEach(function (year) {
        timeline += '<div data-year-group="' + year + '"><div class="tl-year"><span>' + year + '</span></div>';
        years[year].forEach(function (r) {
          const meta = recordType(r.type);
          const provider = providerLabel(r.providerId, r.doctor);
          const summary = r.diagnosis || r.treatment || r.notes || '';
          const searchText = HM.normalize([r.title, r.doctor, provider, r.diagnosis, r.treatment, r.notes, meta.label].join(' '));
          const tags = ['<span class="badge ' + meta.badge + '">' + HM.icon(meta.icon) + esc(meta.label) + '</span>'];
          if (r.nextDose) tags.push('<span class="badge badge-amber">Próxima dosis: ' + HM.fmtDate(r.nextDose, 'short') + '</span>');
          if (r.fileIds && r.fileIds.length) tags.push('<span class="badge badge-gray">' + HM.icon('paperclip') + r.fileIds.length + ' archivo' + (r.fileIds.length > 1 ? 's' : '') + '</span>');
          timeline += '<div class="tl-item" data-record-type="' + r.type + '" data-record-search="' + esc(searchText) + '">' +
            '<span class="tl-dot" style="color:' + meta.color + '">' + HM.icon(meta.icon) + '</span>' +
            '<div class="tl-card" data-action="view-record" data-id="' + r.id + '">' +
              '<div class="tl-top"><span class="tl-date">' + HM.fmtDate(r.date, 'short') + '</span>' +
                '<div class="tl-main"><h4>' + esc(r.title) + '</h4>' +
                  '<p>' + (provider ? esc(provider) : 'Sin institución') + (summary ? ' · ' + esc(summary) : '') + '</p>' +
                  '<div class="tl-tags">' + tags.join('') + '</div>' +
                '</div>' +
                '<div class="table-actions" style="flex:0 0 auto">' +
                  '<button type="button" class="icon-btn" data-action="edit-record" data-id="' + r.id + '" aria-label="Editar">' + HM.icon('edit') + '</button>' +
                  '<button type="button" class="icon-btn" data-action="delete-record" data-id="' + r.id + '" aria-label="Eliminar">' + HM.icon('trash') + '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
        });
        timeline += '</div>';
      });
    } else {
      timeline = emptyState('clipboard', 'Tu historial está vacío', 'Empieza agregando una consulta, un diagnóstico o los resultados de un estudio.', '<button type="button" class="btn btn-primary btn-sm" data-action="add-record">' + HM.icon('plus') + ' Crear primer registro</button>');
    }

    html += '<div class="card card-pad section-gap">' +
      '<div class="card-head" style="align-items:center"><div class="chip-row">' + chips + '</div>' +
        '<div class="head-actions"><div style="position:relative"><input class="input" id="recordSearch" placeholder="Buscar en el historial…" style="width:230px;min-height:36px;font-size:11.5px;padding-left:34px" autocomplete="off"><span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted-2)">' + HM.icon('search', 'sm') + '</span></div></div>' +
      '</div>' +
      '<div class="timeline" id="recordTimeline">' + timeline + '</div>' +
      '<div id="recordNoResults" class="hidden">' + emptyState('search', 'Sin coincidencias', 'Prueba con otro término o cambia el filtro.') + '</div>' +
    '</div>';

    return {
      html: html,
      mount: function (root) {
        let activeFilter = 'todos';
        const search = root.querySelector('#recordSearch');
        function apply() {
          const q = HM.normalize(search ? search.value : '');
          let visible = 0;
          root.querySelectorAll('.tl-item').forEach(function (item) {
            const typeOk = activeFilter === 'todos' || item.dataset.recordType === activeFilter;
            const searchOk = !q || HM.normalize(item.dataset.recordSearch || '').indexOf(q) !== -1;
            const show = typeOk && searchOk;
            item.classList.toggle('hidden', !show);
            if (show) visible++;
          });
          root.querySelectorAll('[data-year-group]').forEach(function (group) {
            const any = group.querySelector('.tl-item:not(.hidden)');
            group.classList.toggle('hidden', !any);
          });
          const noResults = root.querySelector('#recordNoResults');
          if (noResults) noResults.classList.toggle('hidden', visible > 0 || !HM.state.records.length);
        }
        root.querySelectorAll('[data-record-filter]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            root.querySelectorAll('[data-record-filter]').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            activeFilter = btn.dataset.recordFilter;
            apply();
          });
        });
        if (search) search.addEventListener('input', HM.debounce(apply, 150));
      }
    };
  };

  V.openRecordDetail = async function (record) {
    const meta = recordType(record.type);
    const provider = HM.provider(record.providerId);
    const attachments = [];
    for (const id of record.fileIds || []) {
      const file = await HM.files.get(id);
      if (file) attachments.push(file);
    }
    const fields = [];
    fields.push('<div class="detail-item"><label>Tipo</label><span>' + esc(meta.label) + '</span></div>');
    fields.push('<div class="detail-item"><label>Fecha</label><span>' + HM.fmtDate(record.date, 'long') + '</span></div>');
    fields.push('<div class="detail-item"><label>Médico</label><span>' + esc(record.doctor || 'No especificado') + '</span></div>');
    fields.push('<div class="detail-item"><label>Institución</label><span>' + esc(provider ? provider.name : 'No especificada') + '</span></div>');

    let body = '<div class="modal-detail">' +
      '<div class="detail-head"><span class="detail-icon ' + (meta.cls === 'blue' ? 'ic-blue' : meta.cls === 'sky' ? 'ic-sky' : meta.cls === 'green' ? 'ic-green' : meta.cls === 'violet' ? 'ic-violet' : meta.cls === 'amber' ? 'ic-amber' : meta.cls === 'teal' ? 'ic-teal' : 'ic-gray') + '">' + HM.icon(meta.icon) + '</span>' +
        '<div><h3>' + esc(record.title) + '</h3><p class="detail-sub">' + esc(meta.label) + ' · ' + HM.fmtDate(record.date, 'medium') + '</p></div></div>' +
      '<div class="detail-grid">' + fields.join('') + '</div>';
    if (record.diagnosis) body += '<div class="detail-block"><h4>Diagnóstico / resultados</h4><p>' + HM.nl2br(record.diagnosis) + '</p></div>';
    if (record.treatment) body += '<div class="detail-block"><h4>Tratamiento / indicaciones</h4><p>' + HM.nl2br(record.treatment) + '</p></div>';
    if (record.vaccineDose) body += '<div class="detail-block"><h4>Dosis aplicada</h4><p>' + esc(record.vaccineDose) + (record.nextDose ? ' · Próxima dosis: ' + HM.fmtDate(record.nextDose, 'medium') : '') + '</p></div>';
    if (record.notes) body += '<div class="detail-block"><h4>Notas</h4><p>' + HM.nl2br(record.notes) + '</p></div>';
    if (attachments.length) {
      body += '<div class="detail-block"><h4>Archivos adjuntos</h4><div class="attachment-list">' + attachments.map(function (file) {
        return '<div class="attachment"><span class="file-ic">' + HM.icon(HM.isImage(file.type, file.name) ? 'image' : HM.isPdf(file.type, file.name) ? 'file-text' : 'file') + '</span><div class="grow"><strong>' + esc(file.name) + '</strong><small>' + HM.formatBytes(file.size) + '</small></div><div class="attachment-actions"><button type="button" class="icon-btn" data-action="preview-file" data-file-id="' + file.id + '" data-file-name="' + esc(file.name) + '" aria-label="Ver archivo">' + HM.icon('eye') + '</button><button type="button" class="icon-btn" data-action="download-file" data-file-id="' + file.id + '" aria-label="Descargar">' + HM.icon('download') + '</button></div></div>';
      }).join('') + '</div></div>';
    }
    body += '</div>';

    HM.modal.open({
      title: 'Detalle del registro',
      subtitle: 'Información guardada en tu historial clínico.',
      icon: 'file-text',
      size: 'wide',
      body: body,
      footer: '<button type="button" class="btn btn-danger btn-sm" data-detail-delete>' + HM.icon('trash') + ' Eliminar</button>' +
        '<div style="flex:1"></div>' +
        '<button type="button" class="btn btn-outline" data-modal-close>Cerrar</button>' +
        '<button type="button" class="btn btn-primary" data-detail-edit>' + HM.icon('edit') + ' Editar registro</button>',
      onMount: function (root) {
        root.querySelector('[data-detail-edit]').addEventListener('click', function () {
          HM.modal.close();
          setTimeout(function () { HM.forms.record(record); }, 60);
        });
        root.querySelector('[data-detail-delete]').addEventListener('click', function () {
          HM.modal.close();
          setTimeout(function () { HM.forms.deleteRecord(record); }, 60);
        });
      }
    });
  };

  /* ----------------------------- Tratamientos ----------------------------- */
  V.tratamientos = async function () {
    const active = HM.activeTreatments();
    const completed = HM.state.treatments.filter(function (t) { return !HM.isTreatmentActive(t); });
    const doses = HM.todayDoses();
    const taken = doses.filter(function (d) { return d.status === 'tomada'; }).length;
    const total = doses.length;
    const adherenceList = active.map(function (t) { return HM.adherence(t, 7); }).filter(Boolean);
    const avgAdherence = adherenceList.length ? Math.round(adherenceList.reduce(function (s, a) { return s + a.percent; }, 0) / adherenceList.length) : null;

    let html = pageHead('Tus tratamientos', 'Medicamentos, dosis, horarios y recetas. Marca cada toma para llevar un control real.',
      '<button type="button" class="btn btn-primary" data-action="add-treatment">' + HM.icon('plus') + ' Nuevo tratamiento</button>');

    html += '<div class="grid grid-4">' +
      statCard('pill', 'ic-violet', 'Tratamientos activos', String(active.length), active.length ? 'Con recordatorio de toma' : 'Sin tratamientos activos') +
      statCard('check-circle', 'ic-green', 'Tomas de hoy', total ? taken + ' / ' + total : '—', total ? (taken === total ? '¡Todas completadas!' : (total - taken) + ' pendiente' + (total - taken > 1 ? 's' : '')) : 'Sin tomas programadas') +
      statCard('activity', 'ic-blue', 'Cumplimiento 7 días', avgAdherence != null ? avgAdherence + '%' : '—', 'Promedio de tratamientos activos') +
      statCard('clipboard', 'ic-teal', 'Tratamientos concluidos', String(completed.length), 'En tu historial') +
    '</div>';

    let dosesHTML = '';
    if (doses.length) {
      dosesHTML = doses.map(function (d) {
        const done = d.status === 'tomada';
        const overdue = !done && d.time < HM.timeNow();
        return '<div class="dose-row' + (done ? ' done' : '') + '">' +
          '<span class="dose-time">' + esc(d.time) + '</span>' +
          '<div class="dose-info"><strong>' + esc(d.treatment.name) + ' · ' + esc(d.treatment.dose) + '</strong><span>' + esc(d.treatment.frequency || '') + (overdue ? ' · <span style="color:var(--amber-600);font-weight:700">Hora pasada</span>' : '') + '</span></div>' +
          '<button type="button" class="dose-check' + (done ? ' checked' : '') + '" data-action="toggle-dose" data-id="' + d.treatment.id + '" data-date="' + HM.todayISO() + '" data-time="' + d.time + '" data-status="' + (done ? 'tomada' : 'pendiente') + '">' + HM.icon('check') + '</button>' +
        '</div>';
      }).join('');
    } else {
      dosesHTML = emptyState('check-circle', 'Nada programado para hoy', 'Cuando agregues un tratamiento con horarios, aquí verás cada toma.', '<button type="button" class="btn btn-soft btn-sm" data-action="add-treatment">' + HM.icon('plus') + ' Agregar tratamiento</button>');
    }

    html += '<div class="dash-split section-gap">' +
      '<div class="card card-pad"><div class="card-head"><div><h2>Tomas de hoy</h2><p>' + (total ? taken + ' de ' + total + ' completadas' : 'Sin tomas para hoy') + '</p></div><span class="badge ' + (total && taken === total ? 'badge-green' : 'badge-blue') + '">' + (total ? taken + '/' + total : '—') + '</span></div>' +
        '<div class="today-list">' + dosesHTML + '</div>' +
        (total ? '<div class="progress-track mt-3"><div class="progress-fill green" style="width:' + Math.round((taken / total) * 100) + '%"></div></div>' : '') +
      '</div>' +
      '<div class="card card-pad"><div class="card-head"><div><h2>Resumen de dosis</h2><p>Cómo vas con tus tratamientos activos.</p></div></div>' +
        (active.length ? '<div class="stack">' + active.map(function (t) {
          const ad = HM.adherence(t, 7);
          return '<div style="border:1px solid var(--line);border-radius:12px;padding:11px"><div class="spread"><strong style="font-size:12px">' + esc(t.name) + '</strong><span class="tiny muted">' + esc(t.dose) + '</span></div><div class="spread mt-1"><span class="tiny muted">' + (ad ? ad.taken + ' de ' + ad.total + ' tomas' : 'Sin datos') + '</span><span class="tiny strong" style="color:' + (ad && ad.percent >= 80 ? 'var(--green-600)' : 'var(--amber-600)') + '">' + (ad ? ad.percent + '%' : '—') + '</span></div><div class="progress-track mt-1"><div class="progress-fill ' + (ad && ad.percent >= 80 ? 'green' : 'amber') + '" style="width:' + (ad ? ad.percent : 0) + '%"></div></div></div>';
        }).join('') + '</div>' : '<p class="muted small">Agrega un tratamiento para ver tu cumplimiento.</p>') +
      '</div>' +
    '</div>';

    html += '<div class="card card-pad section-gap"><div class="card-head"><div><h2>Tratamientos activos</h2><p>Dosis, horarios y recetas vigentes.</p></div><span class="badge badge-violet">' + active.length + ' activo' + (active.length !== 1 ? 's' : '') + '</span></div>';
    if (active.length) {
      html += '<div class="med-grid">' + active.map(function (t) {
        const ad = HM.adherence(t, 7);
        const progress = HM.treatmentProgress(t);
        return '<article class="med-card">' +
          '<div class="med-top"><span class="med-icon">' + HM.icon('pill') + '</span><div class="med-title"><h3>' + esc(t.name) + '</h3><p>' + esc([t.dose, t.form, t.frequency].filter(Boolean).join(' · ')) + '</p></div>' +
            '<div class="med-actions">' +
              '<button type="button" class="icon-btn" data-action="edit-treatment" data-id="' + t.id + '" aria-label="Editar">' + HM.icon('edit') + '</button>' +
              '<button type="button" class="icon-btn" data-action="finish-treatment" data-id="' + t.id + '" aria-label="Finalizar tratamiento" title="Finalizar tratamiento">' + HM.icon('check') + '</button>' +
            '</div></div>' +
          (t.reason ? '<p class="tiny muted">' + esc(t.reason) + '</p>' : '') +
          '<div class="med-times">' + HM.treatmentTimes(t).map(function (time) { return '<span class="time-pill">' + HM.icon('clock', 'sm') + ' ' + esc(time) + '</span>'; }).join('') + '</div>' +
          '<div class="med-foot"><div class="adherence"><div class="adherence-bar"><span style="width:' + (ad ? ad.percent : 0) + '%;background:' + (ad && ad.percent >= 80 ? 'var(--green-600)' : 'var(--amber-600)') + '"></span></div><span>' + (ad ? ad.percent + '% · 7 días' : 'Sin tomas') + '</span></div>' +
            '<span>' + (t.startDate ? 'Desde ' + HM.fmtDate(t.startDate, 'short') : '') + (t.endDate ? ' · hasta ' + HM.fmtDate(t.endDate, 'short') : '') + '</span></div>' +
          (progress ? '<div class="progress-track"><div class="progress-fill' + (progress.percent >= 100 ? ' green' : '') + '" style="width:' + progress.percent + '%"></div></div>' : '') +
          '<div class="row" style="justify-content:space-between;margin-top:auto">' +
            (t.instructions ? '<span class="tiny muted" style="max-width:65%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(t.instructions) + '">' + esc(t.instructions) + '</span>' : '<span></span>') +
            '<div class="row" style="gap:5px">' +
              (t.fileIds && t.fileIds.length ? '<button type="button" class="btn btn-ghost btn-sm" data-action="preview-file" data-file-id="' + t.fileIds[0] + '" data-file-name="Receta · ' + esc(t.name) + '">' + HM.icon('paperclip') + ' Receta</button>' : '') +
              '<button type="button" class="icon-btn" data-action="delete-treatment" data-id="' + t.id + '" aria-label="Eliminar tratamiento" title="Eliminar">' + HM.icon('trash') + '</button>' +
            '</div>' +
          '</div>' +
        '</article>';
      }).join('') + '</div>';
    } else {
      html += emptyState('pill', 'No hay tratamientos activos', 'Agrega un medicamento para programar recordatorios de toma.', '<button type="button" class="btn btn-primary btn-sm" data-action="add-treatment">' + HM.icon('plus') + ' Nuevo tratamiento</button>');
    }
    html += '</div>';

    if (completed.length) {
      html += '<div class="card card-pad section-gap"><div class="card-head"><div><h2>Tratamientos concluidos</h2><p>Tu historial de medicamentos.</p></div><span class="badge badge-gray">' + completed.length + '</span></div>' +
        '<div class="table-wrap"><table class="data"><thead><tr><th>Medicamento</th><th>Dosis</th><th>Periodo</th><th>Médico</th><th style="text-align:right">Acciones</th></tr></thead><tbody>' +
        completed.map(function (t) {
          return '<tr><td><span class="cell-main">' + esc(t.name) + '</span><span class="cell-sub">' + esc(t.reason || '') + '</span></td><td>' + esc(t.dose) + '</td><td><span class="cell-main" style="font-weight:600">' + HM.fmtDate(t.startDate, 'short') + ' — ' + HM.fmtDate(t.endDate, 'short') + '</span></td><td>' + esc(t.prescriber || '—') + '</td><td><div class="table-actions"><button type="button" class="icon-btn" data-action="reactivate-treatment" data-id="' + t.id + '" aria-label="Reactivar" title="Reactivar">' + HM.icon('refresh') + '</button><button type="button" class="icon-btn" data-action="delete-treatment" data-id="' + t.id + '" aria-label="Eliminar">' + HM.icon('trash') + '</button></div></td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }

    return { html: html };
  };

  /* ----------------------------- Citas ----------------------------- */
  V.citas = async function () {
    const pending = HM.pendingAppointments();
    const upcoming = pending.filter(function (a) { return HM.parseDate(a.dateTime) && HM.startOfDay(a.dateTime) >= HM.startOfDay(new Date()); });
    const overdue = pending.filter(function (a) { return HM.parseDate(a.dateTime) && HM.parseDate(a.dateTime) < new Date(); });
    const history = HM.sortDesc(HM.state.appointments.filter(function (a) { return a.status === 'asistida' || a.status === 'cancelada'; }), 'dateTime');
    const next = upcoming[0] || null;
    const attendedThisYear = history.filter(function (a) { return a.status === 'asistida' && HM.parseDate(a.dateTime) && HM.parseDate(a.dateTime).getFullYear() === new Date().getFullYear(); }).length;

    let html = pageHead('Tu agenda médica', 'Próximas citas, recordatorios y el historial de tus consultas.',
      '<button type="button" class="btn btn-primary" data-action="add-appointment">' + HM.icon('plus') + ' Agendar cita</button>');

    html += '<div class="grid grid-3">' +
      statCard('calendar-check', 'ic-blue', 'Próxima cita', next ? '<span style="font-size:18px;line-height:1.25;display:block;margin-top:2px">' + esc(next.title) + '</span>' : '—', next ? HM.countdown(next.dateTime) + ' · ' + HM.fmtDate(next.dateTime, 'short') : 'Sin citas próximas') +
      statCard('clock', 'ic-amber', 'Citas pendientes', String(pending.length), 'Incluye citas por confirmar') +
      statCard('check-circle', 'ic-green', 'Asistidas este año', String(attendedThisYear), 'Consultas a las que acudiste') +
    '</div>';

    const apptCard = function (a) {
      const date = HM.parseDate(a.dateTime) || new Date();
      const days = HM.daysBetween(new Date(), a.dateTime);
      const soon = days <= 1;
      const provider = HM.provider(a.providerId);
      return '<div class="appt-card">' +
        '<div class="appt-date"><strong>' + date.getDate() + '</strong><span>' + HM.fmtDate(date, 'monthShort') + '</span></div>' +
        '<div class="appt-main"><h4>' + esc(a.title) + '</h4>' +
          '<p>' + esc(Array.from(new Set([a.specialty, a.doctor, provider ? provider.name : ''].filter(Boolean))).join(' · ') || 'Cita médica') + '</p>' +
          '<div class="appt-meta">' +
            '<span>' + HM.icon('clock') + HM.fmtTime(a.dateTime) + '</span>' +
            (a.location ? '<span>' + HM.icon('map-pin') + esc(a.location) + '</span>' : '') +
            (a.reminderMinutes ? '<span>' + HM.icon('bell') + HM.reminderLabel(a.reminderMinutes) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="appt-side"><span class="countdown' + (soon ? ' soon' : '') + '">' + (days < 0 ? 'Fecha pasada' : HM.countdown(a.dateTime)) + '</span>' +
          '<div class="row" style="gap:4px;flex-wrap:nowrap">' +
            '<button type="button" class="btn btn-soft btn-sm" data-action="attend-appointment" data-id="' + a.id + '">' + HM.icon('check') + ' Asistí</button>' +
            '<button type="button" class="icon-btn" data-action="edit-appointment" data-id="' + a.id + '" aria-label="Editar cita" title="Editar">' + HM.icon('edit') + '</button>' +
            '<button type="button" class="icon-btn" data-action="cancel-appointment" data-id="' + a.id + '" aria-label="Cancelar cita" title="Cancelar">' + HM.icon('x') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    };

    html += '<div class="card card-pad section-gap"><div class="card-head"><div><h2>Próximas citas</h2><p>Ordenadas por fecha. Te avisaremos según el recordatorio configurado.</p></div><span class="badge badge-blue">' + upcoming.length + ' programada' + (upcoming.length !== 1 ? 's' : '') + '</span></div>' +
      (upcoming.length ? '<div class="appt-list">' + upcoming.map(apptCard).join('') + '</div>' : emptyState('calendar', 'Sin citas próximas', 'Agenda tu siguiente consulta para no olvidar la fecha.', '<button type="button" class="btn btn-primary btn-sm" data-action="add-appointment">' + HM.icon('plus') + ' Agendar cita</button>')) +
    '</div>';

    if (overdue.length) {
      html += '<div class="card card-pad section-gap"><div class="card-head"><div><h2>Citas por confirmar</h2><p>Estas citas ya pasaron. Marca si asististe o cancélalas.</p></div><span class="badge badge-amber">' + overdue.length + '</span></div><div class="appt-list">' + overdue.map(apptCard).join('') + '</div></div>';
    }

    html += '<div class="card card-pad section-gap"><div class="card-head"><div><h2>Historial de citas</h2><p>Consultas asistidas y canceladas.</p></div><span class="badge badge-gray">' + history.length + '</span></div>' +
      (history.length ? '<div class="table-wrap"><table class="data"><thead><tr><th>Fecha</th><th>Cita</th><th>Médico / lugar</th><th>Estado</th><th style="text-align:right">Acciones</th></tr></thead><tbody>' +
        history.map(function (a) {
          return '<tr><td><span class="cell-main">' + HM.fmtDate(a.dateTime, 'short') + '</span><span class="cell-sub">' + HM.fmtTime(a.dateTime) + '</span></td><td><span class="cell-main">' + esc(a.title) + '</span><span class="cell-sub">' + esc(a.reason || a.specialty || '') + '</span></td><td>' + esc(Array.from(new Set([a.doctor, HM.providerName(a.providerId)].filter(Boolean))).join(' · ') || '-') + '</td><td><span class="badge ' + (a.status === 'asistida' ? 'badge-green' : 'badge-gray') + '">' + (a.status === 'asistida' ? 'Asistida' : 'Cancelada') + '</span></td><td><div class="table-actions">' + (a.recordId ? '<button type="button" class="icon-btn" data-action="view-record" data-id="' + a.recordId + '" title="Ver registro clínico">' + HM.icon('file-text') + '</button>' : '') + '<button type="button" class="icon-btn" data-action="edit-appointment" data-id="' + a.id + '" aria-label="Editar">' + HM.icon('edit') + '</button><button type="button" class="icon-btn" data-action="delete-appointment" data-id="' + a.id + '" aria-label="Eliminar">' + HM.icon('trash') + '</button></div></td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="muted small">Sin citas anteriores registradas.</p>') +
    '</div>';

    return { html: html };
  };

  /* ----------------------------- Documentos ----------------------------- */
  V.documentos = async function () {
    const docs = HM.sortDesc(HM.state.documents, 'date');
    const counts = {};
    Object.keys(HM.docCategories).forEach(function (k) { counts[k] = 0; });
    docs.forEach(function (d) { counts[d.category] = (counts[d.category] || 0) + 1; });

    const cards = [];
    for (const doc of docs) {
      const cat = HM.docCategories[doc.category] || HM.docCategories.otro;
      let thumb = HM.icon(cat.icon);
      let isImage = HM.isImage(doc.mime, doc.name);
      if (isImage && doc.fileId) {
        const url = await HM.files.url(doc.fileId);
        if (url) thumb = '<img src="' + url + '" alt="' + esc(doc.name) + '" loading="lazy">';
        else isImage = false;
      }
      const provider = HM.providerName(doc.providerId);
      const searchText = HM.normalize([doc.name, doc.notes, cat.label, provider, doc.date].join(' '));
      cards.push('<article class="doc-card" data-doc-category="' + doc.category + '" data-doc-search="' + esc(searchText) + '">' +
        '<div class="doc-thumb" data-action="preview-doc" data-id="' + doc.id + '">' + thumb + (isImage ? '' : '<span class="doc-extension">' + esc(HM.fileExtension(doc.name) || 'ARCHIVO') + '</span>') + '</div>' +
        '<div class="doc-body"><h4>' + esc(doc.name) + '</h4><p>' + HM.fmtDate(doc.date, 'short') + (provider ? ' · ' + esc(provider) : '') + '</p>' +
          '<div class="doc-foot"><span class="badge ' + (cat.cls === 'sky' ? 'badge-sky' : cat.cls === 'violet' ? 'badge-violet' : cat.cls === 'green' ? 'badge-green' : cat.cls === 'teal' ? 'badge-teal' : 'badge') + '">' + esc(cat.label) + '</span>' +
            '<div class="row" style="gap:2px;flex-wrap:nowrap">' +
              '<button type="button" class="doc-open" data-action="preview-doc" data-id="' + doc.id + '">Abrir ' + HM.icon('eye') + '</button>' +
              '<button type="button" class="icon-btn" style="width:26px;height:26px;border:0" data-action="edit-doc" data-id="' + doc.id + '" aria-label="Editar documento">' + HM.icon('edit') + '</button>' +
              '<button type="button" class="icon-btn" style="width:26px;height:26px;border:0" data-action="delete-doc" data-id="' + doc.id + '" aria-label="Eliminar documento">' + HM.icon('trash') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>');
    }

    let html = pageHead('Tu archivo médico', 'Capturas de pantalla, recetas, estudios clínicos y documentos escaneados en un solo lugar.',
      '<button type="button" class="btn btn-primary" data-action="open-upload">' + HM.icon('upload') + ' Subir documentos</button>');

    html += '<div class="card card-pad">' +
      '<div class="dropzone" id="docDropzone">' +
        '<div class="dropzone-icon">' + HM.icon('upload') + '</div>' +
        '<h3>Arrastra tus archivos aquí o haz clic para seleccionarlos</h3>' +
        '<p>Capturas, PDF, recetas o estudios escaneados · máximo 30 MB por archivo</p>' +
        '<input type="file" id="docFileInput" multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv">' +
      '</div>' +
    '</div>';

    const chips = '<button type="button" class="chip active" data-doc-filter="todos">Todos <span class="chip-count">' + docs.length + '</span></button>' +
      Object.keys(HM.docCategories).map(function (key) {
        const cat = HM.docCategories[key];
        return '<button type="button" class="chip" data-doc-filter="' + key + '">' + HM.icon(cat.icon) + esc(cat.label) + ' <span class="chip-count">' + (counts[key] || 0) + '</span></button>';
      }).join('');

    html += '<div class="card card-pad section-gap">' +
      '<div class="card-head" style="align-items:center"><div class="chip-row">' + chips + '</div>' +
        '<div class="head-actions"><div style="position:relative"><input class="input" id="docSearch" placeholder="Buscar documentos…" style="width:220px;min-height:36px;font-size:11.5px;padding-left:34px" autocomplete="off"><span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted-2)">' + HM.icon('search', 'sm') + '</span></div></div></div>' +
      (cards.length ? '<div class="doc-grid" id="docGrid">' + cards.join('') + '</div>' : emptyState('folder', 'Tu archivo está vacío', 'Sube tu primera receta, captura o estudio para tenerlo siempre a mano.', '<button type="button" class="btn btn-primary btn-sm" data-action="open-upload">' + HM.icon('upload') + ' Subir documento</button>')) +
      '<div id="docNoResults" class="hidden">' + emptyState('search', 'Sin coincidencias', 'Prueba con otro término o cambia la categoría.') + '</div>' +
    '</div>';

    return {
      html: html,
      mount: function (root) {
        const input = root.querySelector('#docFileInput');
        const dropzone = root.querySelector('#docDropzone');
        const open = function () { if (input) input.click(); };
        if (dropzone) {
          dropzone.addEventListener('click', function (e) {
            if (e.target === input) return;
            open();
          });
          ['dragenter', 'dragover'].forEach(function (ev) {
            dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('dragover'); });
          });
          ['dragleave', 'drop'].forEach(function (ev) {
            dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('dragover'); });
          });
          dropzone.addEventListener('drop', function (e) {
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) HM.forms.document(e.dataTransfer.files);
          });
          input.addEventListener('change', function () {
            if (input.files && input.files.length) HM.forms.document(input.files);
            input.value = '';
          });
        }
        let filter = 'todos';
        const search = root.querySelector('#docSearch');
        function apply() {
          const q = HM.normalize(search ? search.value : '');
          let visible = 0;
          root.querySelectorAll('.doc-card').forEach(function (card) {
            const catOk = filter === 'todos' || card.dataset.docCategory === filter;
            const searchOk = !q || HM.normalize(card.dataset.docSearch || '').indexOf(q) !== -1;
            const show = catOk && searchOk;
            card.classList.toggle('hidden', !show);
            if (show) visible++;
          });
          const noResults = root.querySelector('#docNoResults');
          if (noResults) noResults.classList.toggle('hidden', visible > 0 || !HM.state.documents.length);
        }
        root.querySelectorAll('[data-doc-filter]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            root.querySelectorAll('[data-doc-filter]').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            filter = btn.dataset.docFilter;
            apply();
          });
        });
        if (search) search.addEventListener('input', HM.debounce(apply, 150));
      }
    };
  };

  /* ----------------------------- Directorio ----------------------------- */
  V.directorio = async function () {
    const providers = HM.state.providers.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    const counts = {};
    Object.keys(HM.providerTypes).forEach(function (k) { counts[k] = 0; });
    providers.forEach(function (p) { counts[p.type] = (counts[p.type] || 0) + 1; });

    const cards = providers.map(function (p) {
      const meta = HM.providerTypes[p.type] || HM.providerTypes.medico_particular;
      const searchText = HM.normalize([p.name, p.specialty, p.license, p.phone, p.email, p.address, p.notes, meta.label].join(' '));
      return '<article class="provider-card" data-provider-type="' + p.type + '" data-provider-search="' + esc(searchText) + '">' +
        '<div class="provider-top"><span class="provider-icon ' + (meta.cls === 'blue' ? 'ic-blue' : meta.cls === 'teal' ? 'ic-teal' : meta.cls === 'violet' ? 'ic-violet' : 'ic-sky') + '">' + HM.icon(meta.icon) + '</span>' +
          '<div class="provider-title"><h3>' + esc(p.name) + '</h3><p>' + esc([meta.label, p.specialty].filter(Boolean).join(' · ')) + '</p></div>' +
          '<div class="med-actions"><button type="button" class="icon-btn" data-action="edit-provider" data-id="' + p.id + '" aria-label="Editar">' + HM.icon('edit') + '</button><button type="button" class="icon-btn" data-action="delete-provider" data-id="' + p.id + '" aria-label="Eliminar">' + HM.icon('trash') + '</button></div>' +
        '</div>' +
        '<div class="provider-lines">' +
          (p.license ? '<span>' + HM.icon('clipboard') + 'Cédula prof.: ' + esc(p.license) + '</span>' : '') +
          (p.phone ? '<span>' + HM.icon('phone') + esc(p.phone) + '</span>' : '') +
          (p.email ? '<span>' + HM.icon('mail') + esc(p.email) + '</span>' : '') +
          (p.address ? '<span>' + HM.icon('map-pin') + esc(p.address) + '</span>' : '') +
        '</div>' +
        (p.notes ? '<p class="tiny muted" style="line-height:1.45">' + esc(p.notes) + '</p>' : '') +
        '<div class="provider-foot">' +
          (p.phone ? '<a class="btn btn-soft btn-sm" href="tel:' + esc(String(p.phone).replace(/[^+\d]/g, '')) + '">' + HM.icon('phone') + ' Llamar</a>' : '') +
          (p.address ? '<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.address) + '">' + HM.icon('map-pin') + ' Mapa</a>' : '') +
          (!p.phone && !p.address ? '<span class="tiny muted">Sin datos de contacto</span>' : '') +
        '</div>' +
      '</article>';
    }).join('');

    const chips = '<button type="button" class="chip active" data-provider-filter="todos">Todos <span class="chip-count">' + providers.length + '</span></button>' +
      Object.keys(HM.providerTypes).map(function (key) {
        const meta = HM.providerTypes[key];
        return '<button type="button" class="chip" data-provider-filter="' + key + '">' + HM.icon(meta.icon) + esc(meta.plural) + ' <span class="chip-count">' + (counts[key] || 0) + '</span></button>';
      }).join('');

    let html = pageHead('Tu red de atención', 'Médicos, clínicas, hospitales y laboratorios con sus datos de contacto.',
      '<button type="button" class="btn btn-primary" data-action="add-provider">' + HM.icon('plus') + ' Agregar contacto</button>');

    html += '<div class="card card-pad">' +
      '<div class="card-head" style="align-items:center"><div class="chip-row">' + chips + '</div>' +
        '<div class="head-actions"><div style="position:relative"><input class="input" id="providerSearch" placeholder="Buscar por nombre o especialidad…" style="width:250px;min-height:36px;font-size:11.5px;padding-left:34px" autocomplete="off"><span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted-2)">' + HM.icon('search', 'sm') + '</span></div></div></div>' +
      (providers.length ? '<div class="provider-grid" id="providerGrid">' + cards + '</div>' : emptyState('stethoscope', 'Directorio vacío', 'Agrega a los médicos y lugares que forman parte de tu atención médica.', '<button type="button" class="btn btn-primary btn-sm" data-action="add-provider">' + HM.icon('plus') + ' Agregar contacto</button>')) +
      '<div id="providerNoResults" class="hidden">' + emptyState('search', 'Sin coincidencias', 'Prueba con otro término o cambia el filtro.') + '</div>' +
    '</div>';

    return {
      html: html,
      mount: function (root) {
        let filter = 'todos';
        const search = root.querySelector('#providerSearch');
        function apply() {
          const q = HM.normalize(search ? search.value : '');
          let visible = 0;
          root.querySelectorAll('.provider-card').forEach(function (card) {
            const typeOk = filter === 'todos' || card.dataset.providerType === filter;
            const searchOk = !q || HM.normalize(card.dataset.providerSearch || '').indexOf(q) !== -1;
            const show = typeOk && searchOk;
            card.classList.toggle('hidden', !show);
            if (show) visible++;
          });
          const noResults = root.querySelector('#providerNoResults');
          if (noResults) noResults.classList.toggle('hidden', visible > 0 || !HM.state.providers.length);
        }
        root.querySelectorAll('[data-provider-filter]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            root.querySelectorAll('[data-provider-filter]').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            filter = btn.dataset.providerFilter;
            apply();
          });
        });
        if (search) search.addEventListener('input', HM.debounce(apply, 150));
      }
    };
  };

  /* ----------------------------- Tarjeta de emergencia ----------------------------- */
  V.tarjeta = async function () {
    const p = HM.state.profile || {};
    const name = HM.profileName();
    const age = HM.age(p.birthDate);
    const allergies = (p.allergies || []).filter(function (a) { return HM.severityRank(a.severity) >= 2; });
    const active = HM.activeTreatments();
    const contacts = p.emergencyContacts || [];
    const conditions = (p.conditions || []).map(function (c) { return c.name || ''; }).filter(Boolean);

    const allergyText = allergies.length
      ? allergies.map(function (a) { return (a.substance || '') + (a.severity ? ' (' + a.severity + ')' : ''); }).join(', ')
      : 'Ninguna registrada';
    const medText = active.length
      ? active.map(function (t) { return (t.name || '') + (t.dose ? ' · ' + t.dose : ''); }).join('; ')
      : 'Ninguno activo';
    const contactText = contacts[0]
      ? (contacts[0].name || '') + (contacts[0].relationship ? ' (' + contacts[0].relationship + ')' : '') + (contacts[0].phone ? ' · ' + contacts[0].phone : '')
      : 'Sin registrar';

    const qrLines = [
      'EMERGENCIA · SaludEnOrden',
      'Nombre: ' + (name || 'Sin registro'),
      age != null ? 'Edad: ' + age + ' años' : '',
      'Sangre: ' + (p.bloodType || 'sin registrar'),
      'Alergias: ' + allergyText,
      'Medicamentos: ' + medText,
      conditions.length ? 'Condiciones: ' + conditions.join(', ') : '',
      'Contacto: ' + contactText
    ].filter(Boolean);

    let qrSvg = '';
    let qrOk = false;
    let qrError = '';
    if (typeof qrcode === 'function') {
      try {
        const qr = qrcode(0, 'M');
        qr.addData(qrLines.join('\n'));
        qr.make();
        qrSvg = qr.createSvgTag(4, 2);
        qrOk = true;
      } catch (err) { qrError = err.message || String(err); }
    } else {
      qrError = 'librería QR no cargada';
    }

    const hasData = !!(p && (p.firstName || p.bloodType || allergies.length || contacts.length));

    let html = pageHead('Tarjeta de emergencia', 'Imprime esta tarjeta y llévala en tu cartera o guárdala en tu teléfono. El código QR se puede escanear con cualquier cámara.',
      '<a href="#/perfil" class="btn btn-outline">' + HM.icon('arrow-right') + ' Volver al perfil</a>' +
      '<button type="button" class="btn btn-primary" data-print-card>' + HM.icon('printer') + ' Imprimir tarjeta</button>');

    if (!hasData) {
      html += '<div class="card card-pad section-gap">' + emptyState('user', 'Completa tu perfil primero', 'La tarjeta usa tu nombre, tipo de sangre, alergias y contactos de emergencia.', '<a href="#/perfil" class="btn btn-primary btn-sm">' + HM.icon('user') + ' Ir a mi perfil</a>') + '</div>';
      return { html: html };
    }

    html += '<div class="paper-wrap"><div class="report-paper">' +
      '<div class="emg-card">' +
        '<div class="emg-head">' + HM.icon('heart-pulse') + '<span>TARJETA DE EMERGENCIA</span></div>' +
        '<div class="emg-body">' +
          '<div class="emg-info">' +
            '<div class="emg-name">' + esc(name || 'Sin registro') + '</div>' +
            '<div class="emg-row"><span>Grupo sanguíneo</span><strong>' + esc(p.bloodType || '—') + '</strong></div>' +
            '<div class="emg-row"><span>Alergias importantes</span><strong>' + esc(allergyText) + '</strong></div>' +
            '<div class="emg-row"><span>Medicamentos actuales</span><strong>' + esc(medText) + '</strong></div>' +
            '<div class="emg-row"><span>Contacto de emergencia</span><strong>' + esc(contactText) + '</strong></div>' +
          '</div>' +
          '<div class="emg-qr">' +
            (qrOk ? qrSvg : '<p class="tiny muted">Código no disponible: ' + esc(qrError) + '</p>') +
            '<span>Escanea con cualquier teléfono</span>' +
          '</div>' +
        '</div>' +
        '<div class="emg-foot">SaludEnOrden · Historial médico personal · ' + HM.fmtDate(new Date(), 'medium') + '</div>' +
      '</div>' +
      '<p class="r-print-note">El código QR contiene nombre, tipo de sangre, alergias, medicamentos y contacto de emergencia en texto plano, legible por cualquier cámara.</p>' +
    '</div></div>';

    return {
      html: html,
      mount: function (root) {
        root.querySelectorAll('[data-print-card]').forEach(function (btn) {
          btn.addEventListener('click', function () { window.print(); });
        });
      }
    };
  };

  /* ----------------------------- Reporte (se completa en report.js) ----------------------------- */
  V.informe = async function () {
    if (HM.report && HM.report.view) return HM.report.view();
    return { html: '<div class="card card-pad">Cargando informe…</div>' };
  };

})();
