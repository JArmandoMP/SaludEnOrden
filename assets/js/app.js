/* ============================================================
   SaludEnOrden · Aplicación: navegación, acciones y recordatorios
   ============================================================ */
(function () {
  'use strict';
  const HM = window.HM;

  const ROUTES = {
    inicio: { title: 'Resumen', eyebrow: 'Mi salud', view: 'inicio' },
    perfil: { title: 'Mi perfil', eyebrow: 'Mi salud', view: 'perfil' },
    monitoreo: { title: 'Monitoreo diario', eyebrow: 'Mi salud', view: 'monitoreo' },
    historial: { title: 'Historial clínico', eyebrow: 'Registros', view: 'historial' },
    tratamientos: { title: 'Tratamientos', eyebrow: 'Registros', view: 'tratamientos' },
    citas: { title: 'Citas médicas', eyebrow: 'Registros', view: 'citas' },
    documentos: { title: 'Documentos', eyebrow: 'Registros', view: 'documentos' },
    directorio: { title: 'Directorio médico', eyebrow: 'Registros', view: 'directorio' },
    tarjeta: { title: 'Tarjeta de emergencia', eyebrow: 'Compartir', view: 'tarjeta' },
    informe: { title: 'Informe / PDF', eyebrow: 'Compartir', view: 'informe' }
  };

  let currentRoute = 'inicio';
  let rendering = false;
  let refreshing = false;
  let reminderTimer = null;

  function $(sel) { return document.querySelector(sel); }

  function getRoute() {
    const raw = (location.hash || '#/inicio').replace(/^#\/?/, '').split('?')[0];
    return ROUTES[raw] ? raw : 'inicio';
  }

  function initials() {
    return HM.initials(HM.profileName() || 'SaludEnOrden');
  }

  function updateChrome() {
    const avatar = $('#avatarInitials');
    if (avatar) avatar.textContent = initials();
    const pName = HM.profileName();
    const profileBtn = $('#profileBtn');
    if (profileBtn) profileBtn.title = pName || 'Mi perfil';

    const todayChip = $('#todayChip');
    if (todayChip) todayChip.textContent = capitalize(HM.fmtDate(new Date(), 'long'));

    const backupLabel = $('#lastBackupLabel');
    if (backupLabel) {
      backupLabel.textContent = HM.state.settings && HM.state.settings.lastBackup
        ? 'Respaldado el ' + HM.fmtDate(HM.state.settings.lastBackup, 'short')
        : 'Aún sin respaldo';
    }

    const alerts = HM.alerts();
    const bellBadge = $('#bellBadge');
    if (bellBadge) {
      bellBadge.textContent = alerts.count > 99 ? '99+' : String(alerts.count);
      bellBadge.hidden = alerts.count === 0;
    }

    const treatmentsBadge = document.querySelector('[data-badge="tratamientos"]');
    if (treatmentsBadge) {
      treatmentsBadge.textContent = alerts.pendingDoses.length > 9 ? '9+' : String(alerts.pendingDoses.length);
      treatmentsBadge.hidden = !alerts.pendingDoses.length;
    }
    const citasBadge = document.querySelector('[data-badge="citas"]');
    if (citasBadge) {
      citasBadge.textContent = alerts.appointments.length > 9 ? '9+' : String(alerts.appointments.length);
      citasBadge.hidden = !alerts.appointments.length;
    }
  }

  function capitalize(text) {
    const s = String(text || '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function updateStorageLabel() {
    HM.db.estimate().then(function (estimate) {
      const el = $('#storageLabel');
      if (!el) return;
      if (estimate && estimate.usage) {
        el.textContent = 'Datos locales · ' + HM.formatBytes(estimate.usage);
      } else {
        el.textContent = 'Datos guardados localmente';
      }
    }).catch(function () { /* noop */ });
  }

  async function renderRoute(options) {
    if (rendering) return;
    rendering = true;
    const opts = options || {};
    const routeKey = getRoute();
    const route = ROUTES[routeKey];
    const container = $('#appView');
    if (!container) { rendering = false; return; }

    if (document.body.classList.contains('modal-open') && !opts.keepModal) {
      HM.modal.close();
    }

    try {
      HM.files.clearUrlCache();
      currentRoute = routeKey;
      document.querySelectorAll('.nav-item').forEach(function (item) {
        const active = item.dataset.route === routeKey;
        item.classList.toggle('active', active);
        if (active) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
      const pageTitle = $('#pageTitle');
      const pageEyebrow = $('#pageEyebrow');
      if (pageTitle) pageTitle.textContent = route.title;
      if (pageEyebrow) pageEyebrow.textContent = route.eyebrow;
      document.title = 'SaludEnOrden · ' + route.title;

      const viewFn = HM.views[route.view];
      if (typeof viewFn !== 'function') throw new Error('Vista no encontrada: ' + route.view);
      const result = await viewFn();
      const html = typeof result === 'string' ? result : result.html;
      container.innerHTML = html;
      container.classList.remove('view-enter');
      void container.offsetWidth;
      container.classList.add('view-enter');
      if (result && typeof result.mount === 'function') {
        try { result.mount(container); } catch (err) { console.error('Error al montar la vista', err); }
      }
      if (!opts.keepScroll) window.scrollTo({ top: 0, behavior: 'auto' });
      updateChrome();
      updateStorageLabel();
      closeSidebar();
    } catch (err) {
      console.error(err);
      container.innerHTML = '<div class="card card-pad"><div class="error-banner" style="margin:0">' + HM.icon('alert-triangle') +
        '<div><strong>No se pudo mostrar esta sección.</strong><br>' + HM.escape(err.message || String(err)) + '<br><br>Recarga la página o revisa la consola del navegador.</div></div></div>';
    } finally {
      rendering = false;
    }
  }

  async function refreshApp(keepScroll) {
    if (refreshing) return;
    refreshing = true;
    try {
      await HM.loadAll();
      updateChrome();
      const result = await renderRoute({ keepScroll: true });
      if (!keepScroll) window.scrollTo({ top: 0, behavior: 'auto' });
      updateStorageLabel();
      return result;
    } catch (err) {
      console.error(err);
      HM.toast('No se pudieron actualizar los datos', err.message, 'error', 6000);
    } finally {
      refreshing = false;
    }
  }
  HM.afterDataChange = refreshApp;
  HM.refreshApp = refreshApp;

  function refreshKeepPosition() {
    const y = window.scrollY;
    renderRoute({ keepScroll: true }).then(function () {
      window.scrollTo(0, y);
    });
  }

  /* ----------------------------- Navegación y menús ----------------------------- */
  function closeSidebar() {
    const sidebar = $('#sidebar');
    const scrim = $('#sidebarScrim');
    if (sidebar) sidebar.classList.remove('open');
    if (scrim) scrim.classList.remove('show');
  }

  function openSidebar() {
    const sidebar = $('#sidebar');
    const scrim = $('#sidebarScrim');
    if (sidebar) sidebar.classList.add('open');
    if (scrim) scrim.classList.add('show');
  }

  function closeQuick() {
    const menu = $('#quickMenu');
    const btn = $('#quickAddBtn');
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function toggleQuick() {
    const menu = $('#quickMenu');
    const btn = $('#quickAddBtn');
    if (!menu || !btn) return;
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    btn.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) closePopover();
  }

  function closePopover() {
    const pop = $('#alertPopover');
    const btn = $('#bellBtn');
    if (pop) pop.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function renderAlertPopover() {
    const pop = $('#alertPopover');
    if (!pop) return;
    const alerts = HM.alerts();
    let body = '';
    if (alerts.pendingDoses.length) {
      body += '<div class="popover-head" style="border:0;padding-bottom:4px"><h3 style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted-2)">Medicamentos de hoy</h3></div><div style="padding:0 8px">';
      body += alerts.pendingDoses.slice(0, 6).map(function (dose) {
        return '<div class="popover-item"><span class="pi-icon ic-violet">' + HM.icon('pill') + '</span><div class="grow"><strong>' + HM.escape(dose.treatment.name) + '</strong><p>' + HM.escape(dose.treatment.dose) + ' · ' + HM.escape(dose.time) + '</p></div>' +
          '<button type="button" class="dose-check" data-action="toggle-dose" data-id="' + dose.treatment.id + '" data-date="' + alerts.today + '" data-time="' + dose.time + '" data-status="pendiente" aria-label="Marcar como tomada">' + HM.icon('check') + '</button></div>';
      }).join('');
      body += '</div>';
    }
    if (alerts.appointments.length) {
      body += '<div class="popover-head" style="border:0;padding-bottom:4px"><h3 style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted-2)">Próximas citas</h3></div><div style="padding:0 8px">';
      body += alerts.appointments.slice(0, 5).map(function (a) {
        return '<div class="popover-item"><span class="pi-icon ic-amber">' + HM.icon('calendar') + '</span><div class="grow"><strong>' + HM.escape(a.title) + '</strong><p>' + HM.fmtDate(a.dateTime, 'datetime') + ' · ' + HM.escape(HM.countdown(a.dateTime)) + '</p></div></div>';
      }).join('');
      body += '</div>';
    }
    if (!body) {
      body = '<div class="popover-empty">' + HM.icon('check-circle') + '<p style="margin-top:6px">Todo al día. No hay recordatorios pendientes.</p></div>';
    }
    body += '<div style="padding:10px;border-top:1px solid var(--line);display:flex;gap:6px"><a href="#/citas" class="btn btn-outline btn-sm grow" style="justify-content:center">Ver agenda</a><a href="#/tratamientos" class="btn btn-soft btn-sm grow" style="justify-content:center">Ver tratamientos</a></div>';

    pop.innerHTML = '<div class="popover-head"><h3>Recordatorios</h3><button type="button" class="icon-btn" style="width:28px;height:28px" id="popoverClose" aria-label="Cerrar">' + HM.icon('x') + '</button></div><div class="popover-body">' + body + '</div>';
    const close = pop.querySelector('#popoverClose');
    if (close) close.addEventListener('click', closePopover);
  }

  function togglePopover() {
    const pop = $('#alertPopover');
    const btn = $('#bellBtn');
    if (!pop || !btn) return;
    const willOpen = pop.hidden;
    if (willOpen) {
      renderAlertPopover();
      pop.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      closeQuick();
    } else {
      closePopover();
    }
  }

  /* ----------------------------- Documentos ----------------------------- */
  function pickDocuments() {
    const existing = document.getElementById('docFileInput');
    if (existing && currentRoute === 'documentos') {
      existing.click();
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv';
    input.addEventListener('change', function () {
      if (input.files && input.files.length) HM.forms.document(input.files);
    });
    input.click();
  }

  /* ----------------------------- Acciones ----------------------------- */
  async function toggleDose(el) {
    const status = el.dataset.status === 'tomada' ? null : 'tomada';
    try {
      await HM.setDoseStatus(el.dataset.id, el.dataset.date, el.dataset.time, status);
      closePopover();
      updateChrome();
      refreshKeepPosition();
    } catch (err) {
      console.error(err);
      HM.toast('No se pudo registrar la toma', err.message, 'error');
    }
  }

  async function attendAppointment(id) {
    const appointment = HM.appointment(id);
    if (!appointment) return;
    const ok = await HM.confirm({
      title: 'Confirmar asistencia',
      message: '¿Confirmas que asististe a "' + appointment.title + '"? Se marcará como asistida en tu agenda.',
      confirmText: 'Sí, asistí',
      icon: 'calendar-check'
    });
    if (!ok) return;
    const updated = Object.assign({}, appointment, { status: 'asistida', updatedAt: HM.nowISO() });
    await HM.db.put('appointments', updated);
    let recordId = updated.recordId;
    if (!recordId) {
      const add = await HM.confirm({
        title: 'Agregar al historial clínico',
        message: '¿Quieres crear también un registro clínico con los datos de esta cita? Podrás completar el diagnóstico y las indicaciones después.',
        confirmText: 'Sí, agregar',
        cancelText: 'Ahora no',
        icon: 'file-text'
      });
      if (add) {
        const record = {
          id: HM.uid(),
          type: 'consulta',
          date: HM.toDateInput(appointment.dateTime),
          title: appointment.title,
          providerId: appointment.providerId || '',
          doctor: appointment.doctor || '',
          specialty: appointment.specialty || '',
          diagnosis: '',
          treatment: '',
          notes: [appointment.reason, appointment.notes].filter(Boolean).join('\n'),
          vaccineDose: '',
          nextDose: '',
          fileIds: [],
          appointmentId: appointment.id,
          createdAt: HM.nowISO(),
          updatedAt: HM.nowISO()
        };
        await HM.db.put('records', record);
        recordId = record.id;
        updated.recordId = recordId;
        await HM.db.put('appointments', updated);
      }
    }
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    HM.toast('Cita marcada como asistida', recordId ? 'También quedó en tu historial clínico.' : '', 'success');
  }

  async function cancelAppointment(id) {
    const appointment = HM.appointment(id);
    if (!appointment) return;
    const ok = await HM.confirm({
      title: 'Cancelar cita',
      message: '¿Deseas marcar "' + appointment.title + '" como cancelada?',
      confirmText: 'Sí, cancelar',
      danger: true,
      icon: 'calendar'
    });
    if (!ok) return;
    await HM.db.put('appointments', Object.assign({}, appointment, { status: 'cancelada', updatedAt: HM.nowISO() }));
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    HM.toast('Cita cancelada', '', 'info');
  }

  async function finishTreatment(id) {
    const treatment = HM.treatment(id);
    if (!treatment) return;
    const ok = await HM.confirm({
      title: 'Finalizar tratamiento',
      message: '¿Marcar "' + treatment.name + '" como concluido? Dejará de aparecer en tus tomas diarias, pero seguirá en tu historial.',
      confirmText: 'Finalizar',
      icon: 'check-circle'
    });
    if (!ok) return;
    await HM.db.put('treatments', Object.assign({}, treatment, {
      active: false,
      endDate: treatment.endDate || HM.todayISO(),
      updatedAt: HM.nowISO()
    }));
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    HM.toast('Tratamiento finalizado', 'Puedes reactivarlo desde tu historial de tratamientos.', 'success');
  }

  async function reactivateTreatment(id) {
    const treatment = HM.treatment(id);
    if (!treatment) return;
    await HM.db.put('treatments', Object.assign({}, treatment, { active: true, endDate: '', updatedAt: HM.nowISO() }));
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    HM.toast('Tratamiento reactivado', 'Sus recordatorios vuelven a estar activos.', 'success');
  }

  /* ----------------------------- Medición rápida ----------------------------- */
  const QUICK_VITAL_METRICS = {
    presion: { label: 'Presión', icon: 'gauge' },
    glucosa: { label: 'Glucosa', icon: 'droplet' },
    peso: { label: 'Peso', icon: 'weight' },
    temperatura: { label: 'Temperatura', icon: 'thermometer' },
    pulso: { label: 'Pulso', icon: 'heart-pulse' },
    oxigeno: { label: 'SpO₂', icon: 'wind' }
  };

  function quickVitalFields(type) {
    if (type === 'presion') {
      return '<div class="form-grid">' +
        '<div class="field"><label>Sistólica <span class="req">*</span></label><input class="input" type="number" id="qvSystolic" min="50" max="300" placeholder="120"></div>' +
        '<div class="field"><label>Diastólica <span class="req">*</span></label><input class="input" type="number" id="qvDiastolic" min="30" max="200" placeholder="80"></div>' +
        '<div class="field full"><label>Pulso (opcional)</label><input class="input" type="number" id="qvPulse" min="20" max="250" placeholder="70"></div>' +
      '</div>';
    }
    if (type === 'glucosa') {
      return '<div class="form-grid">' +
        '<div class="field full"><label>Glucosa <span class="req">*</span></label><div class="input-suffix"><input class="input" type="number" id="qvValue" min="20" max="800" step="0.1" placeholder="95"><span>mg/dL</span></div></div>' +
        '<div class="field full"><label>Momento</label><select class="select" id="qvContext"><option>En ayunas</option><option>Antes de comer</option><option>Después de comer</option><option>Antes de dormir</option><option>Aleatoria</option></select></div>' +
      '</div>';
    }
    if (type === 'peso') {
      return '<div class="form-grid">' +
        '<div class="field full"><label>Peso <span class="req">*</span></label><div class="input-suffix"><input class="input" type="number" id="qvValue" min="2" max="500" step="0.1" placeholder="70"><span>kg</span></div></div>' +
      '</div>';
    }
    if (type === 'pulso') {
      return '<div class="form-grid">' +
        '<div class="field full"><label>Pulso <span class="req">*</span></label><div class="input-suffix"><input class="input" type="number" id="qvValue" min="20" max="250" placeholder="70"><span>lpm</span></div></div>' +
      '</div>';
    }
    if (type === 'oxigeno') {
      return '<div class="form-grid">' +
        '<div class="field full"><label>Saturación de oxígeno (SpO₂) <span class="req">*</span></label><div class="input-suffix"><input class="input" type="number" id="qvValue" min="50" max="100" step="1" placeholder="97"><span>%</span></div></div>' +
      '</div>';
    }
    return '<div class="form-grid">' +
      '<div class="field full"><label>Temperatura <span class="req">*</span></label><div class="input-suffix"><input class="input" type="number" id="qvValue" min="30" max="45" step="0.1" placeholder="36.6"><span>°C</span></div></div>' +
    '</div>';
  }
  function openQuickVital(startType) {
    let current = startType || 'presion';
    HM.modal.open({
      title: 'Medición rápida',
      subtitle: 'Registra en segundos sin salir de esta pantalla.',
      icon: 'activity',
      size: 'narrow',
      body:
        '<div class="form-section">' +
          '<div class="chart-tabs" id="qvTabs">' + Object.keys(QUICK_VITAL_METRICS).map(function (key) {
            const m = QUICK_VITAL_METRICS[key];
            return '<button type="button" class="chip' + (key === current ? ' active' : '') + '" data-qv="' + key + '">' + HM.icon(m.icon) + HM.escape(m.label) + '</button>';
          }).join('') + '</div>' +
        '</div>' +
        '<div class="form-section"><div id="qvFields">' + quickVitalFields(current) + '</div></div>',
      footer:
        '<button type="button" class="btn btn-outline" data-modal-close>Cancelar</button>' +
        '<button type="button" class="btn btn-primary" id="qvSave">' + HM.icon('check') + ' Guardar</button>',
      onMount: function (root) {
        function renderFields() {
          const block = root.querySelector('#qvFields');
          if (block) block.innerHTML = quickVitalFields(current);
          root.querySelectorAll('#qvTabs .chip').forEach(function (chip) {
            chip.classList.toggle('active', chip.dataset.qv === current);
          });
          const first = root.querySelector('#qvFields input');
          if (first) { try { first.focus(); } catch (e) { /* noop */ } }
        }
        root.querySelectorAll('#qvTabs .chip').forEach(function (chip) {
          chip.addEventListener('click', function () { current = chip.dataset.qv; renderFields(); });
        });
        root.querySelector('#qvSave').addEventListener('click', async function () {
          const values = {};
          if (current === 'presion') {
            const sEl = root.querySelector('#qvSystolic');
            const dEl = root.querySelector('#qvDiastolic');
            const pEl = root.querySelector('#qvPulse');
            const s = Number(sEl.value);
            const d = Number(dEl.value);
            if (sEl.value === '' || !(s >= 50 && s <= 300)) { HM.toast('Dato inválido', 'La sistólica debe estar entre 50 y 300.', 'error'); return; }
            if (dEl.value === '' || !(d >= 30 && d <= 200)) { HM.toast('Dato inválido', 'La diastólica debe estar entre 30 y 200.', 'error'); return; }
            values.systolic = s;
            values.diastolic = d;
            if (pEl && pEl.value) values.pulse = Number(pEl.value);
          } else {
            const el = root.querySelector('#qvValue');
            const v = Number(el.value);
            const ranges = {
              glucosa: [20, 800, 'La glucosa debe estar entre 20 y 800 mg/dL.'],
              peso: [2, 500, 'El peso debe estar entre 2 y 500 kg.'],
              temperatura: [30, 45, 'La temperatura debe estar entre 30 y 45 °C.'],
              pulso: [20, 250, 'El pulso debe estar entre 20 y 250 lpm.'],
              oxigeno: [50, 100, 'La saturación debe estar entre 50 y 100 %.']
            };
            const r = ranges[current];
            if (el.value === '' || !(v >= r[0] && v <= r[1])) { HM.toast('Dato inválido', r[2], 'error'); return; }
            values.value = v;
            if (current === 'glucosa') values.context = root.querySelector('#qvContext').value;
          }
          try {
            await HM.db.put('vitals', { id: HM.uid(), type: current, date: HM.nowISO(), values: values, note: '', createdAt: HM.nowISO() });
            HM.modal.close();
            document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
            HM.toast('Medición guardada', (QUICK_VITAL_METRICS[current].label + ': ' + (current === 'presion' ? values.systolic + '/' + values.diastolic : values.value) + ' registrada a esta hora.'), 'success');
          } catch (err) {
            HM.toast('No se pudo guardar', err.message, 'error');
          }
        });
      }
    });
  }

  function openReport() {
    closeQuick();
    closePopover();
    if (currentRoute === 'informe') {
      const toolbar = document.querySelector('.report-toolbar');
      if (toolbar) toolbar.scrollIntoView({ behavior: 'smooth', block: 'center' });
      HM.toast('Informe listo', 'Revisa las secciones y pulsa “Imprimir / Guardar PDF”.', 'info', 3600);
      return;
    }
    location.hash = '#/informe';
    setTimeout(function () {
      HM.toast('Informe listo', 'Elige las secciones y pulsa “Imprimir / Guardar PDF”.', 'info', 4200);
    }, 300);
  }

  const ACTION_HANDLERS = {
    'add-vital': function () { HM.forms.vital(); },
    'add-record': function () { HM.forms.record(); },
    'add-treatment': function () { HM.forms.treatment(); },
    'add-appointment': function () { HM.forms.appointment(); },
    'add-provider': function () { HM.forms.provider(); },
    'add-document': function () { pickDocuments(); },
    'open-upload': function () { pickDocuments(); },
    'edit-profile': function () { HM.forms.profile(); },
    'delete-profile': async function () {
      const ok = await HM.confirm({
        title: 'Eliminar perfil',
        message: 'Se eliminarán los datos del perfil. Los demás registros se conservarán. ¿Continuar?',
        confirmText: 'Eliminar perfil',
        danger: true,
        icon: 'trash'
      });
      if (!ok) return;
      try {
        await HM.db.remove('profile', 'profile');
        HM.state.profile = null;
        document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
        HM.toast('Perfil eliminado', 'Puedes crear un nuevo perfil cuando quieras.', 'info', 5000);
      } catch (err) {
        HM.toast('No se pudo eliminar', err.message || 'Intenta de nuevo.', 'error');
      }
    },
    'assign-password': function () { openPasswordModal('assign'); },
    'change-password': function () { openPasswordModal('change'); },
    'remove-password': async function () {
      const user = currentUser();
      if (!user) return;
      const ok = await HM.confirm({
        title: 'Quitar contraseña',
        message: 'SaludEnOrden dejará de pedir contraseña para entrar a esta cuenta. ¿Continuar?',
        confirmText: 'Quitar',
        danger: true,
        icon: 'shield'
      });
      if (!ok) return;
      clearUserPassword(user);
      await HM.logManual('securityOff', 'Cuenta', user.name);
      HM.toast('Contraseña quitada', 'Esta cuenta abrirá sin pedir contraseña.', 'info', 5000);
      document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    },
    'view-record': function (el) {
      const record = HM.record(el.dataset.id);
      if (record) HM.views.openRecordDetail(record);
    },
    'edit-record': function (el) {
      const record = HM.record(el.dataset.id);
      if (record) { HM.modal.close(); setTimeout(function () { HM.forms.record(record); }, 40); }
    },
    'delete-record': function (el) {
      const record = HM.record(el.dataset.id);
      if (record) HM.forms.deleteRecord(record);
    },
    'edit-vital': function (el) {
      const vital = HM.state.vitals.find(function (v) { return v.id === el.dataset.id; });
      if (vital) HM.forms.vital(vital);
    },
    'delete-vital': function (el) {
      const vital = HM.state.vitals.find(function (v) { return v.id === el.dataset.id; });
      if (vital) HM.forms.deleteVital(vital);
    },
    'edit-treatment': function (el) {
      const treatment = HM.treatment(el.dataset.id);
      if (treatment) HM.forms.treatment(treatment);
    },
    'delete-treatment': function (el) {
      const treatment = HM.treatment(el.dataset.id);
      if (treatment) HM.forms.deleteTreatment(treatment);
    },
    'finish-treatment': function (el) { finishTreatment(el.dataset.id); },
    'reactivate-treatment': function (el) { reactivateTreatment(el.dataset.id); },
    'edit-appointment': function (el) {
      const appointment = HM.appointment(el.dataset.id);
      if (appointment) HM.forms.appointment(appointment);
    },
    'delete-appointment': function (el) {
      const appointment = HM.appointment(el.dataset.id);
      if (appointment) HM.forms.deleteAppointment(appointment);
    },
    'attend-appointment': function (el) { attendAppointment(el.dataset.id); },
    'cancel-appointment': function (el) { cancelAppointment(el.dataset.id); },
    'edit-provider': function (el) {
      const provider = HM.state.providers.find(function (p) { return p.id === el.dataset.id; });
      if (provider) HM.forms.provider(provider);
    },
    'delete-provider': function (el) {
      const provider = HM.state.providers.find(function (p) { return p.id === el.dataset.id; });
      if (provider) HM.forms.deleteProvider(provider);
    },
    'toggle-dose': function (el) { toggleDose(el); },
    'preview-doc': function (el) {
      const doc = HM.document(el.dataset.id);
      if (doc) HM.forms.previewFile(doc.fileId, doc.name);
    },
    'edit-doc': function (el) {
      const doc = HM.document(el.dataset.id);
      if (doc) HM.forms.documentEdit(doc);
    },
    'delete-doc': function (el) {
      const doc = HM.document(el.dataset.id);
      if (doc) HM.forms.deleteDocument(doc);
    },
    'preview-file': function (el) { HM.forms.previewFile(el.dataset.fileId, el.dataset.fileName || ''); },
    'download-file': async function (el) {
      const file = await HM.files.get(el.dataset.fileId);
      if (file) HM.downloadBlob(file.blob, file.name);
    },
    'backup': function () { HM.downloadBackup(); },
    'open-report': function () { openReport(); }
  };

  async function handleAction(el) {
    const action = el.dataset.action;
    const handler = ACTION_HANDLERS[action];
    if (!handler) return;
    if (action === 'toggle-dose') {
      closeQuick();
    } else {
      closeQuick();
      closePopover();
    }
    try {
      await handler(el);
    } catch (err) {
      console.error('Acción fallida: ' + action, err);
      HM.toast('Ocurrió un problema', err.message || String(err), 'error', 6000);
    }
  }

  /* ----------------------------- Ajustes ----------------------------- */
  const ACT_STYLE = {
    create: { text: 'Creó', icon: 'plus' },
    edit: { text: 'Actualizó', icon: 'edit' },
    del: { text: 'Eliminó', icon: 'trash' },
    backup: { text: 'Realizó un respaldo', icon: 'download-cloud' },
    restore: { text: 'Restauró un respaldo', icon: 'upload' },
    demo: { text: 'Cargó datos de demostración', icon: 'sparkles' },
    import: { text: 'Importó datos de una versión anterior', icon: 'database' },
    clear: { text: 'Borró todos los datos', icon: 'trash' },
    security: { text: 'Asignó o cambió la contraseña de la cuenta', icon: 'shield' },
    securityOff: { text: 'Quitó la contraseña de la cuenta', icon: 'shield' }
  };
  function activityItemHTML(a) {
    const st = ACT_STYLE[a.action] || { text: 'Cambió', icon: 'info' };
    let main = st.text;
    if (['create', 'edit', 'del'].indexOf(a.action) !== -1 && a.entity) {
      main = st.text + ' ' + a.entity.charAt(0).toLowerCase() + a.entity.slice(1) + (a.title ? ' «' + HM.escape(a.title) + '»' : '');
    } else if (a.title) {
      main += ' «' + HM.escape(a.title) + '»';
    }
    return '<div class="list-item activity-item"><span class="stat-icon ic-blue">' + HM.icon(st.icon) + '</span><div class="grow"><strong>' + main + '</strong><p>' + HM.fmtDate(a.date, 'datetime') + '</p></div></div>';
  }

  async function openSettings() {
    const settings = HM.state.settings || {};
    const me = currentUser() || { name: 'tu cuenta' };
    let activity = [];
    try {
      activity = (await HM.db.getAll('activity')).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); }).slice(0, 12);
    } catch (e) { activity = []; }
    const notifSupported = 'Notification' in window;
    const permission = notifSupported ? Notification.permission : 'unsupported';
    const body =
      '<div class="form-section">' +
        '<div class="form-section-title">' + HM.icon('database') + ' Respaldo y restauración</div>' +
        '<p class="small muted" style="line-height:1.55">Tu información vive únicamente en este navegador. Realiza un respaldo con frecuencia y guárdalo en un lugar seguro (nube, USB o correo personal).</p>' +
        '<div class="row row-center mt-2">' +
          '<button type="button" class="btn btn-primary" data-settings-export>' + HM.icon('download-cloud') + ' Realizar respaldo</button>' +
          '<button type="button" class="btn btn-success" data-settings-import>' + HM.icon('folder-open') + ' Restaurar respaldo</button>' +
        '</div>' +
        '<input type="file" id="settingsImportInput" accept=".json,application/json" hidden>' +
        '<div class="list-item mt-3" style="align-items:center"><span class="stat-icon ic-blue" style="width:32px;height:32px;border-radius:9px">' + HM.icon('shield') + '</span><div class="grow"><strong>Almacenamiento local</strong><p id="settingsStorage">Calculando…</p></div><span class="badge badge-gray">' + (HM.state.settings && HM.state.settings.lastBackup ? 'Respaldado ' + HM.fmtDate(HM.state.settings.lastBackup, 'short') : 'Sin respaldo') + '</span></div>' +
        '<p class="form-note mt-2" id="lastBackupPath">' + (function () {
          const st = HM.state.settings;
          if (st && st.lastBackupFile) {
            return 'Último respaldo: ' + (st.lastBackup ? HM.fmtDate(st.lastBackup, 'datetime') : '') + ' — ' + HM.escape(st.lastBackupFile) + ' (' + HM.escape(st.lastBackupWhere || 'carpeta Descargas del navegador') + ').';
          }
          return 'Aún no has realizado un respaldo manual.';
        })() + '</p>' +
        '<div class="list-item mt-2" style="align-items:center"><span class="stat-icon ic-blue" style="width:32px;height:32px;border-radius:9px">' + HM.icon('refresh') + '</span><div class="grow"><strong>Copia automática (cada 10 minutos)</strong><p>Se guarda sola por si hay un corte de luz. También al ocultar o cerrar la ventana.</p></div><label class="switch" title="Activar o desactivar el auto-guardado automático"><input type="checkbox" id="autoBackupToggle" aria-label="Activar auto-guardado automático"' + ((HM.state.settings && HM.state.settings.autoBackup === false) ? '' : ' checked') + '><span class="switch-track"></span></label></div>' +
        '<div class="list-item mt-2" style="align-items:center"><span class="stat-icon ic-violet" style="width:32px;height:32px;border-radius:9px">' + HM.icon('lock') + '</span><div class="grow"><strong>Cifrar los respaldos</strong><p>Protege el archivo con contraseña (AES-256). Si la pierdes, no se puede recuperar.</p></div><label class="switch" title="Cifrar los respaldos con contraseña"><input type="checkbox" id="backupEncryptToggle" aria-label="Cifrar los respaldos con contraseña"' + ((HM.state.settings && HM.state.settings.backupEncrypt) ? ' checked' : '') + (HM.backupCryptoAvailable() ? '' : ' disabled') + '><span class="switch-track"></span></label></div>' +
        (HM.autoBackupFolderSupported() ? '<div class="list-item mt-2" style="align-items:center"><span class="stat-icon ic-teal" style="width:32px;height:32px;border-radius:9px">' + HM.icon('folder') + '</span><div class="grow"><strong>Carpeta de respaldo automático</strong><p>' + HM.escape((HM.state.settings && HM.state.settings.autoBackupDirName) ? 'Se guarda en "' + HM.state.settings.autoBackupDirName + '"' : 'Elige una carpeta para guardar también una copia en el disco.') + '</p></div><div style="display:flex;gap:6px">' + (HM.state.settings && HM.state.settings.autoBackupDirName ? '<button type="button" class="btn btn-outline btn-sm" data-clear-auto-folder>' + HM.icon('x') + '</button>' : '') + '<button type="button" class="btn btn-soft btn-sm" data-pick-auto-folder>' + HM.icon('folder-open') + ' Elegir</button></div></div>' : '') +
      '</div>' +

      '<div class="form-section">' +
        '<div class="form-section-title">' + HM.icon('shield') + ' Seguridad</div>' +
        '<div class="list-item" style="align-items:center"><span class="stat-icon ic-green" style="width:32px;height:32px;border-radius:9px">' + HM.icon('lock') + '</span><div class="grow"><strong>Bloqueo por inactividad</strong><p>Si no tocas nada durante ese tiempo, la app se cierra y pide tu contraseña de nuevo.</p></div><label class="switch" title="Activar o desactivar el bloqueo por inactividad"><input type="checkbox" id="autoLockToggle" aria-label="Activar bloqueo por inactividad"' + ((HM.state.settings && HM.state.settings.autoLock === false) ? '' : ' checked') + '><span class="switch-track"></span></label></div>' +
        '<div class="form-grid mt-2"><div class="field"><label>Tiempo de inactividad</label><select class="select" id="autoLockMinutes"' + ((HM.state.settings && HM.state.settings.autoLock === false) ? ' disabled' : '') + '>' +
          [5, 10, 30].map(function (m) {
            const cur = (HM.state.settings && HM.state.settings.autoLockMinutes) || 10;
            return '<option value="' + m + '"' + (Number(cur) === m ? ' selected' : '') + '>' + m + ' minutos</option>';
          }).join('') +
        '</select></div></div>' +
        '<div class="list-item mt-2" style="align-items:center"><span class="stat-icon ic-amber" style="width:32px;height:32px;border-radius:9px">' + HM.icon('eye') + '</span><div class="grow"><strong>Texto más grande</strong><p>Aumenta el tamaño de letra en toda la aplicación.</p></div><label class="switch" title="Activar texto más grande"><input type="checkbox" id="textSizeToggle" aria-label="Texto más grande"' + ((HM.state.settings && HM.state.settings.textSize === 'grande') ? ' checked' : '') + '><span class="switch-track"></span></label></div>' +
        '<p class="form-note mt-2">Antes de bloquearse, la app guarda una copia de seguridad de tus datos.</p>' +
      '</div>' +

      '<div class="form-section">' +
        '<div class="form-section-title">' + HM.icon('bell') + ' Recordatorios</div>' +
        '<label class="switch"><input type="checkbox" id="notifToggle"' + (settings.notifications ? ' checked' : '') + '><span class="switch-track"></span><span>Mostrar notificaciones del navegador</span></label>' +
        '<p class="form-note mt-2">Los recordatorios de medicamentos y citas siempre aparecen en la campana de SaludEnOrden. Si activas esta opción, el navegador también te avisará cuando tengas una toma o cita pendiente.<br>Estado del permiso: <strong>' + (permission === 'granted' ? 'concedido' : permission === 'denied' ? 'bloqueado' : permission === 'unsupported' ? 'no disponible' : 'sin solicitar') + '</strong>.</p>' +
        '<div class="row mt-2"><button type="button" class="btn btn-outline btn-sm" data-test-notification' + (!notifSupported ? ' disabled' : '') + '>' + HM.icon('bell') + ' Probar notificación</button></div>' +
      '</div>' +

      '<div class="form-section">' +
        '<div class="form-section-title">' + HM.icon('sparkles') + ' Datos de ejemplo y privacidad</div>' +
        '<p class="small muted" style="line-height:1.55">Puedes cargar un historial de demostración para explorar todas las funciones o borrar todo y empezar de cero.</p>' +
        '<div class="row row-center mt-2">' +
          '<button type="button" class="btn btn-soft" data-load-demo>' + HM.icon('sparkles') + ' Cargar datos de ejemplo</button>' +
          '<button type="button" class="btn btn-danger" data-clear-all>' + HM.icon('trash') + ' Borrar todos los datos</button>' +
        '</div>' +
        '<p class="form-note mt-2">Actualmente tienes ' + HM.state.records.length + ' registros clínicos, ' + HM.state.vitals.length + ' mediciones y ' + HM.state.documents.length + ' documentos.</p>' +
      '</div>' +

      '<div class="form-section">' +
        '<div class="form-section-title">' + HM.icon('shield') + ' Privacidad y uso</div>' +
        '<p class="small muted" style="line-height:1.6">SaludEnOrden es un programa de uso personal y distribución gratuita no comercial, pensado para que cada persona lleve su propio historial.</p>' +
        '<p class="small muted" style="line-height:1.6"><strong>Tus datos no salen de este dispositivo.</strong> No hay cuentas en la nube, ni envío de historial médico a internet. La única conexión es la comprobación opcional de versiones en GitHub, que no transmite información personal. Si borras los datos de este equipo, no hay copia en ningún servidor.</p>' +
        '<p class="small muted" style="line-height:1.6">El instalador se compila desde código abierto y no incluye datos personales. Puedes comprobar su integridad con el SHA256 publicado en el CHANGELOG. No está firmado digitalmente: Windows SmartScreen puede mostrar una advertencia al descargarlo; eso no significa que contenga malware, pero verifica siempre el hash y la fuente.</p>' +
      '</div>' +

      '<div class="form-section">' +
        '<div class="form-section-title">' + HM.icon('user') + ' Mi cuenta</div>' +
        '<p class="small muted" style="line-height:1.55">La cuenta "' + HM.escape(me.name) + '" y toda su información viven solo en este dispositivo. Si eliminas tu cuenta, podrás crear otra desde cero.</p>' +
        '<div class="row row-center mt-2"><button type="button" class="btn btn-danger" data-delete-account>' + HM.icon('trash') + ' Eliminar mi cuenta y su información</button></div>' +
      '</div>' +

      '<div class="form-section">' +
        '<div class="form-section-title">' + HM.icon('refresh') + ' Actualizaciones</div>' +
        '<p class="small muted" style="line-height:1.55">Busca versiones nuevas en GitHub Releases. Si no hay conexión, revisa también tu carpeta Descargas o Escritorio. Solo se consulta si hay una versión nueva: nunca se envían tus datos médicos.</p>' +
        '<div class="row mt-2"><button type="button" class="btn btn-soft" data-check-update>' + HM.icon('search') + ' Buscar actualización</button></div>' +
        '<p class="form-note mt-2" id="updateStatus">Versión actual: ' + HM.escape(HM.appVersion()) + '</p>' +
      '</div>' +

      '<div class="form-section">' +
        '<div class="form-section-title">' + HM.icon('clock') + ' Bitácora de cambios</div>' +
        '<div class="list-item" style="align-items:center"><span class="stat-icon ic-blue" style="width:32px;height:32px;border-radius:9px">' + HM.icon('refresh') + '</span><div class="grow"><strong>Última actualización</strong><p>' + (activity[0] ? HM.fmtDate(activity[0].date, 'datetime') : 'Sin cambios registrados todavía') + '</p></div></div>' +
        (activity.length
          ? '<div class="activity-list">' + activity.map(activityItemHTML).join('') + '</div><p class="tiny muted" style="margin-top:8px">Se guardan las últimas 100 modificaciones de este usuario, con fecha y hora.</p>'
          : '<p class="small muted mt-2" style="line-height:1.55">Aún no hay cambios registrados. Aquí verás cada perfil, registro, medición, tratamiento, cita o documento que crees, actualices o elimines.</p>') +
      '</div>' +

      '<div class="form-section">' +
        '<div class="form-section-title">' + HM.icon('info') + ' Acerca de SaludEnOrden</div>' +
        '<div style="display:flex;align-items:center;gap:14px;margin-bottom:10px"><img src="assets/img/logo-mark.svg" alt="SaludEnOrden" width="48" height="48" style="border-radius:12px;box-shadow:var(--shadow-sm)"><div><strong style="font-family:var(--font-display);font-size:17px;letter-spacing:-.02em">SaludEnOrden</strong><p class="tiny muted" style="margin:2px 0 0">Tu historial médico personal, privado y siempre a mano.</p></div></div>' +
        '<p class="small muted" style="line-height:1.55">Funciona sin cuentas ni servidores. Todo se guarda en este dispositivo. La aplicación no sustituye la valoración de un profesional de la salud.</p>' +
        '<p class="tiny muted" style="margin-top:8px">Versión ' + (HM.appVersion() || '1.0') + ' · Hecha para tener tu salud en orden.</p>' +
      '</div>';

    HM.modal.open({
      title: 'Ajustes y respaldo',
      subtitle: 'Privacidad, recordatorios y copias de seguridad.',
      icon: 'sliders',
      size: 'wide',
      body: body,
      footer: '<button type="button" class="btn btn-outline" data-modal-close>Cerrar</button>',
      onMount: function (root) {
        HM.db.estimate().then(function (estimate) {
          const el = root.querySelector('#settingsStorage');
          if (!el) return;
          if (estimate && estimate.usage != null) {
            el.textContent = HM.formatBytes(estimate.usage) + ' en uso' + (estimate.quota ? ' de ' + HM.formatBytes(estimate.quota) + ' disponibles' : '');
          } else {
            el.textContent = 'Datos guardados en este dispositivo.';
          }
        }).catch(function () {});

        root.querySelector('[data-settings-export]').addEventListener('click', async function () {
          await HM.downloadBackup();
          const el = root.querySelector('#lastBackupPath');
          const st = HM.state.settings;
          if (el && st && st.lastBackupFile) {
            el.textContent = 'Último respaldo: ' + (st.lastBackup ? HM.fmtDate(st.lastBackup, 'datetime') : '') + ' — ' + st.lastBackupFile + ' (' + (st.lastBackupWhere || 'carpeta Descargas del navegador') + ').';
          }
        });

        const importInput = root.querySelector('#settingsImportInput');
        root.querySelector('[data-settings-import]').addEventListener('click', function () {
          importInput.click();
        });
        importInput.addEventListener('change', async function () {
          const file = importInput.files && importInput.files[0];
          importInput.value = '';
          if (!file) return;
          let json;
          try {
            json = JSON.parse(await file.text());
          } catch (err) {
            HM.toast('Archivo inválido', 'Selecciona un respaldo .json generado por SaludEnOrden.', 'error');
            return;
          }
          if (json && json.encrypted) {
            const pw = await HM.askBackupPassword('enter');
            if (!pw) return;
            try {
              json = await HM.decryptBackup(pw, json);
            } catch (err) {
              HM.toast('No se pudo descifrar', 'Contraseña incorrecta o respaldo dañado.', 'error', 7000);
              return;
            }
          }
          const counts = json && json.data ? {
            records: (json.data.records || []).length,
            vitals: (json.data.vitals || []).length,
            docs: (json.data.documents || []).length,
            files: (json.files || []).length
          } : null;
          if (!counts) {
            HM.toast('Archivo inválido', 'No parece un respaldo de SaludEnOrden.', 'error');
            return;
          }
          const ok = await HM.confirm({
            title: 'Restaurar respaldo',
            message: 'Se reemplazarán todos los datos actuales por los del respaldo' + (json.patient ? ' de ' + json.patient : '') + ':\n' + counts.records + ' registros, ' + counts.vitals + ' mediciones, ' + counts.docs + ' documentos y ' + counts.files + ' archivos.\n\nEsta acción no se puede deshacer. ¿Continuar?',
            confirmText: 'Restaurar',
            danger: true,
            icon: 'upload'
          });
          if (!ok) return;
          HM.modal.close();
          try {
            const result = await HM.importBackup(json);
            HM.toast('Respaldo restaurado', result.records + ' registros y ' + result.files + ' archivos recuperados.', 'success', 6000);
          } catch (err) {
            console.error(err);
            HM.toast('No se pudo restaurar', err.message || 'El respaldo está dañado.', 'error', 7000);
          }
        });

        const backupEncryptToggle = root.querySelector('#backupEncryptToggle');
        if (backupEncryptToggle && HM.backupCryptoAvailable()) {
          backupEncryptToggle.addEventListener('change', async function () {
            await HM.setSetting({ backupEncrypt: backupEncryptToggle.checked });
            if (backupEncryptToggle.checked) {
              HM.toast('Cifrado activado', 'Los próximos respaldos pedirán una contraseña.', 'success', 4000);
            } else {
              HM.toast('Cifrado desactivado', 'Los respaldos se guardarán en texto plano.', 'info', 4000);
            }
          });
        }
        const textSizeToggle = root.querySelector('#textSizeToggle');
        if (textSizeToggle) {
          textSizeToggle.addEventListener('change', async function () {
            const value = textSizeToggle.checked ? 'grande' : 'normal';
            await HM.setSetting({ textSize: value });
            applyTextSize();
            HM.toast(value === 'grande' ? 'Texto grande activado' : 'Texto normal', 'Cambia al instante en toda la aplicación.', 'info', 3200);
          });
        }

        const autoLockToggle = root.querySelector('#autoLockToggle');
        if (autoLockToggle) {
          autoLockToggle.addEventListener('change', async function () {
            await HM.setSetting({ autoLock: autoLockToggle.checked });
            const minutesSel = root.querySelector('#autoLockMinutes');
            if (minutesSel) minutesSel.disabled = !autoLockToggle.checked;
            if (autoLockToggle.checked) {
              HM.startAutoLock();
              HM.toast('Bloqueo por inactividad activado', 'La app pedirá tu contraseña si no hay actividad.', 'success', 4000);
            } else {
              HM.toast('Bloqueo por inactividad desactivado', 'La app no se cerrará sola.', 'info', 4000);
            }
          });
        }
        const autoLockMinutes = root.querySelector('#autoLockMinutes');
        if (autoLockMinutes) {
          autoLockMinutes.addEventListener('change', async function () {
            await HM.setSetting({ autoLockMinutes: Number(autoLockMinutes.value) });
            HM.startAutoLock();
            HM.toast('Tiempo actualizado', 'Bloqueo tras ' + autoLockMinutes.value + ' minutos sin actividad.', 'info', 4000);
          });
        }

        const notifToggle = root.querySelector('#notifToggle');
        notifToggle.addEventListener('change', async function () {
          if (!notifToggle.checked) {
            await HM.setSetting({ notifications: false });
            HM.toast('Notificaciones desactivadas', 'Los recordatorios seguirán en la campana de SaludEnOrden.', 'info');
            return;
          }
          if (!('Notification' in window)) {
            notifToggle.checked = false;
            await HM.setSetting({ notifications: false });
            HM.toast('No disponible', 'Este navegador no permite notificaciones. Usa la campana de SaludEnOrden.', 'warn');
            return;
          }
          let permission = Notification.permission;
          if (permission === 'default') {
            try { permission = await Notification.requestPermission(); } catch (err) { permission = 'denied'; }
          }
          if (permission !== 'granted') {
            notifToggle.checked = false;
            await HM.setSetting({ notifications: false });
            HM.toast('Permiso no concedido', 'Puedes habilitarlo desde la configuración del sitio en tu navegador.', 'warn', 6000);
            return;
          }
          await HM.setSetting({ notifications: true });
          HM.toast('Recordatorios activados', 'Te avisaremos de tus tomas y citas pendientes.', 'success');
        });

        const testBtn = root.querySelector('[data-test-notification]');
        if (testBtn) {
          testBtn.addEventListener('click', function () {
            try {
              new Notification('SaludEnOrden · Recordatorio', { body: 'Así se verá el aviso de tus medicamentos y citas.', icon: 'assets/img/favicon.svg' });
              HM.toast('Notificación enviada', 'Revisa las notificaciones de tu sistema.', 'success');
            } catch (err) {
              HM.toast('No se pudo mostrar', 'Activa el permiso de notificaciones primero.', 'warn');
            }
          });
        }

        root.querySelector('[data-load-demo]').addEventListener('click', async function () {
          if (HM.state.records.length || HM.state.vitals.length || HM.state.profile) {
            const ok = await HM.confirm({
              title: 'Cargar datos de ejemplo',
              message: 'Se reemplazará toda la información actual por un historial de demostración con citas, mediciones y documentos. ¿Continuar?',
              confirmText: 'Sí, cargar ejemplo',
              danger: true,
              icon: 'sparkles'
            });
            if (!ok) return;
          }
          HM.modal.close();
          try {
            HM.toast('Preparando datos de ejemplo', 'Esto puede tardar unos segundos…', 'info', 4000);
            await HM.loadDemoData();
            HM.toast('Datos de ejemplo cargados', 'Explora los módulos para ver cómo funciona SaludEnOrden.', 'success', 5000);
          } catch (err) {
            console.error(err);
            HM.toast('No se pudieron cargar los datos', err.message, 'error');
          }
        });

        const autoToggle = root.querySelector('#autoBackupToggle');
        if (autoToggle) {
          autoToggle.addEventListener('change', async function () {
            await HM.setSetting({ autoBackup: autoToggle.checked });
            if (autoToggle.checked) {
              startAutosave();
              HM.toast('Auto-guardado activado', 'Se guardará una copia cada 10 minutos y al ocultar la ventana.', 'success', 4000);
            } else {
              if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null; }
              HM.toast('Auto-guardado desactivado', 'Ya no se guardarán copias automáticas.', 'info', 4000);
            }
          });
        }

        root.querySelectorAll('[data-pick-auto-folder]').forEach(function (btn) {
          btn.addEventListener('click', async function () {
            const ok = await HM.pickAutoBackupFolder();
            if (ok) { HM.modal.close(); openSettings(); }
          });
        });
        root.querySelectorAll('[data-clear-auto-folder]').forEach(function (btn) {
          btn.addEventListener('click', async function () {
            await HM.clearAutoBackupFolder();
            HM.modal.close();
            openSettings();
          });
        });
        const checkUpdateBtn = root.querySelector('[data-check-update]');
        if (checkUpdateBtn) {
          checkUpdateBtn.addEventListener('click', async function () {
            const status = root.querySelector('#updateStatus');
            try {
              const res = await fetch('/__api/check-updates?current=' + encodeURIComponent(HM.appVersion()));
              const data = await res.json();
              if (data && data.available) {
                const desdeGithub = data.source === 'github';
                const ok = await HM.confirm({
                  title: 'Actualización disponible',
                  message: 'Se encontró SaludEnOrden v' + data.version + ' (tú tienes v' + HM.appVersion() + ').\n\n' +
                    (desdeGithub
                      ? 'Se descargará el instalador desde GitHub (aprox. 30 MB) y se abrirá. No se envían tus datos personales.\n\n¿Continuar?'
                      : 'El instalador se abrirá desde tu equipo y tú solo sigues el asistente (Actualizar). ¿Continuar?'),
                  confirmText: desdeGithub ? 'Descargar e instalar' : 'Instalar ahora',
                  icon: 'download'
                });
                if (!ok) return;
                let installerPath = data.path;
                if (desdeGithub) {
                  HM.toast('Descargando actualización', 'Descargando v' + data.version + ' desde GitHub…', 'info', 8000);
                  const d = await fetch('/__api/download-update?version=' + encodeURIComponent(data.version));
                  const dj = await d.json();
                  if (!d.ok || !dj.ok) {
                    HM.toast('No se pudo descargar', (dj.error || 'Revisa tu conexión.') + ' Puedes descargarlo manualmente desde GitHub.', 'error', 7000);
                    return;
                  }
                  installerPath = dj.path;
                }
                if (!installerPath) {
                  HM.toast('No se pudo abrir', 'Abre el instalador manualmente.', 'error', 6000);
                  return;
                }
                const r2 = await fetch('/__api/launch-installer?path=' + encodeURIComponent(installerPath));
                if (r2.ok) {
                  HM.toast('Instalador abierto', 'Sigue el asistente. La app se cerrará en unos segundos.', 'success', 6000);
                  setTimeout(function () { try { window.close(); } catch (e) { } }, 3500);
                } else {
                  HM.toast('No se pudo abrir', 'Abre el instalador manualmente.', 'error', 6000);
                }
              } else {
                HM.toast('Todo al día', 'Ya tienes la versión más reciente (' + HM.appVersion() + ').', 'success', 4000);
                if (status) status.textContent = 'Versión actual: ' + HM.appVersion() + ' · No hay actualizaciones.';
              }
            } catch (err) {
              HM.toast('No se pudo buscar', 'Verifica tu instalación.', 'error', 5000);
            }
          });
        }

        root.querySelector('[data-delete-account]').addEventListener('click', async function () {
          const user = currentUser();
          if (!user) return;
          const ok = await HM.confirm({
            title: 'Eliminar mi cuenta',
            message: 'Se eliminará tu cuenta "' + user.name + '" junto con todo tu historial médico, medicamentos, citas y archivos guardados en este dispositivo. Esta acción no se puede deshacer. ¿Continuar?',
            confirmText: 'Eliminar mi cuenta',
            danger: true,
            icon: 'trash'
          });
          if (!ok) return;
          HM.modal.close();
          await wipeUserData(user);
          try { localStorage.removeItem('vitalia.user.v1'); } catch (e) { /* continuar */ }
          renderWelcome();
        });

        root.querySelector('[data-clear-all]').addEventListener('click', async function () {
          const first = await HM.confirm({
            title: 'Borrar todos los datos',
            message: 'Se eliminarán tu perfil, todo tu historial médico, los medicamentos, citas y todos los archivos guardados. Esta acción es irreversible.\n\nTe recomendamos descargar un respaldo antes de continuar.',
            confirmText: 'Quiero borrar todo',
            danger: true,
            icon: 'trash'
          });
          if (!first) return;
          const second = await HM.confirm({
            title: 'Última confirmación',
            message: '¿Seguro que deseas borrar toda tu información médica de este dispositivo?',
            confirmText: 'Sí, borrar definitivamente',
            danger: true,
            icon: 'alert-triangle'
          });
          if (!second) return;
          HM.modal.close();
          try {
            await HM.clearAllData();
            HM.toast('Información eliminada', 'Puedes empezar de nuevo cuando quieras.', 'info');
            location.hash = '#/inicio';
            refreshApp();
          } catch (err) {
            HM.toast('No se pudo borrar', err.message, 'error');
          }
        });
      }
    });
  }

  /* ----------------------------- Recordatorios ----------------------------- */
  function readNotified() {
    try {
      const raw = localStorage.getItem('vitalia.notified');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveNotified(notified) {
    try { localStorage.setItem('vitalia.notified', JSON.stringify(notified)); } catch (e) { /* noop */ }
  }

  function notify(title, body) {
    try {
      const n = new Notification(title, { body: body, icon: 'assets/img/favicon.svg', tag: 'vitalia-' + Date.now() });
      n.onclick = function () { window.focus(); n.close(); };
      return true;
    } catch (err) {
      console.warn('No se pudo mostrar la notificación', err);
      return false;
    }
  }

  function checkBrowserNotifications() {
    if (!HM.state.ready) return;
    if (!HM.state.settings || !HM.state.settings.notifications) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date();
    const today = HM.todayISO();
    const notified = readNotified();
    let changed = false;

    const doses = HM.todayDoses();
    doses.forEach(function (dose) {
      if (dose.status !== 'pendiente') return;
      const parts = dose.time.split(':').map(Number);
      const due = new Date();
      due.setHours(parts[0], parts[1], 0, 0);
      if (now < due) return;
      if (now.getTime() - due.getTime() > 90 * 60000) return;
      const key = 'dose|' + dose.treatment.id + '|' + today + '|' + dose.time;
      if (notified[key]) return;
      if (notify('Hora de tu medicamento', dose.treatment.name + ' · ' + dose.treatment.dose + ' (' + dose.time + ')')) {
        notified[key] = now.toISOString();
        changed = true;
      }
    });

    HM.pendingAppointments().forEach(function (a) {
      const dt = HM.parseDate(a.dateTime);
      if (!dt) return;
      const minutes = Number(a.reminderMinutes || 0);
      const reminderAt = new Date(dt.getTime() - minutes * 60000);
      if (now < reminderAt) return;
      if (now.getTime() - dt.getTime() > 60 * 60000) return;
      const key = 'appt|' + a.id + '|' + HM.fmtDate(dt, 'short');
      if (notified[key]) return;
      if (notify('Cita médica: ' + a.title, HM.fmtDate(a.dateTime, 'datetime') + (a.location ? ' · ' + a.location : ''))) {
        notified[key] = now.toISOString();
        changed = true;
      }
    });

    if (changed) {
      const cutoff = HM.addDays(new Date(), -7).getTime();
      Object.keys(notified).forEach(function (key) {
        const ts = new Date(notified[key]).getTime();
        if (isFinite(ts) && ts < cutoff) delete notified[key];
      });
      saveNotified(notified);
      updateChrome();
    }
  }

  function initReminders() {
    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = setInterval(function () {
      checkBrowserNotifications();
      updateChrome();
    }, 60000);
    setTimeout(checkBrowserNotifications, 2500);
  }


  /* ----------------------------- Arranque ----------------------------- */
  function bindChrome() {
    const menuBtn = $('#menuBtn');
    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    const scrim = $('#sidebarScrim');
    if (scrim) scrim.addEventListener('click', closeSidebar);
    document.querySelectorAll('.nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        closeSidebar();
        closeQuick();
        closePopover();
      });
    });

    const quickBtn = $('#quickAddBtn');
    if (quickBtn) quickBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleQuick(); });
    document.querySelectorAll('[data-quick]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const quick = btn.dataset.quick;
        closeQuick();
        if (quick === 'quick-vital') openQuickVital();
        else if (quick === 'vital') HM.forms.vital();
        else if (quick === 'record') HM.forms.record();
        else if (quick === 'treatment') HM.forms.treatment();
        else if (quick === 'appointment') HM.forms.appointment();
        else if (quick === 'document') pickDocuments();
      });
    });

    const bellBtn = $('#bellBtn');
    if (bellBtn) bellBtn.addEventListener('click', function (e) { e.stopPropagation(); togglePopover(); });

    const printBtn = $('#topPrintBtn');
    if (printBtn) printBtn.addEventListener('click', openReport);

    const profileBtn = $('#profileBtn');
    if (profileBtn) profileBtn.addEventListener('click', function () { location.hash = '#/perfil'; });

    const backupBtn = $('#backupBtn');
    if (backupBtn) backupBtn.addEventListener('click', function () { HM.downloadBackup(); });

    const settingsBtn = $('#settingsBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);

    const logoutBtn = $('#logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', onLogout);

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.quick-wrap')) closeQuick();
      if (!e.target.closest('.popover-wrap')) closePopover();
    });

    document.addEventListener('click', function (e) {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      handleAction(el);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeQuick();
        closePopover();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          openReport();
        }
      }
    });

    document.addEventListener('vitalia:data-changed', function () {
      refreshApp(true);
    });
    document.addEventListener('vitalia:backup-done', function () {
      updateChrome();
    });

    window.addEventListener('hashchange', function () {
      closeQuick();
      closePopover();
      renderRoute();
    });
  }

  async function init() {
    bindChrome();
    try {
      await HM.loadAll();
    } catch (err) {
      console.error(err);
      HM.state.dbError = err.message || String(err);
    }
    updateChrome();
    updateStorageLabel();
    if (!location.hash || !ROUTES[getRoute()]) {
      try { history.replaceState(null, '', '#/inicio'); } catch (e) { location.hash = '#/inicio'; }
    }
    await renderRoute();
    initReminders();
    startAutosave();
    startAutoLock();
    applyTextSize();
  }

  /* ----------------------------- Multiusuario ----------------------------- */
  function bytesToBase64(bytes) {
    let out = '';
    bytes.forEach(function (b) { out += String.fromCharCode(b); });
    return btoa(out);
  }
  function base64ToBytes(b64) {
    const bin = atob(String(b64 || ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function randomBytes(n) {
    const out = new Uint8Array(n);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(out);
    else for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
    return out;
  }
  function sha256Ascii(text) {
    function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let i, j;
    const result = [];
    const words = [];
    const asciiBitLength = text.length * 8;
    const hash = [];
    const k = [];
    let primeCounter = 0;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        primeCounter++;
      }
    }
    let ascii = unescape(encodeURIComponent(text)) + '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      const code = ascii.charCodeAt(i);
      words[i >> 2] |= code << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);
    for (j = 0; j < words.length;) {
      const w = words.slice(j, j += 16);
      const oldHash = hash.slice(0);
      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15];
        const w2 = w[i - 2];
        const a = hash[0];
        const e = hash[4];
        const temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i]
          + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0);
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash.unshift((temp1 + temp2) | 0);
        hash[4] = (hash[4] + temp1) | 0;
        hash.splice(8);
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j >= 0; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result.push((b < 16 ? '0' : '') + b.toString(16));
      }
    }
    return result.join('');
  }
  function fallbackDerive(password, salt) {
    const saltText = Array.from(salt).map(function (b) { return String.fromCharCode(b); }).join('');
    let data = saltText + String(password || '');
    for (let i = 0; i < 1500; i++) data = sha256Ascii(data);
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bytes[i] = parseInt(data.substr(i * 2, 2), 16) || 0;
    return bytes;
  }
  async function derivePasswordHash(password, salt) {
    if (window.crypto && crypto.subtle) {
      try {
        const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' }, keyMaterial, 256);
        return new Uint8Array(bits);
      } catch (e) { /* usar respaldo */ }
    }
    return fallbackDerive(password, salt);
  }
  function authEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }
  async function verifyUserPassword(user, password) {
    if (!user || !user.pw) return true;
    try {
      const hash = await derivePasswordHash(password, base64ToBytes(user.pw.salt));
      return authEqual(hash, base64ToBytes(user.pw.hash));
    } catch (e) { return false; }
  }
  async function setUserPassword(user, password) {
    const salt = randomBytes(16);
    const hash = await derivePasswordHash(password, salt);
    const list = getUsers();
    const target = list.find(function (u) { return u.id === user.id; });
    if (target) { target.pw = { salt: bytesToBase64(salt), hash: bytesToBase64(hash) }; saveUsers(list); }
  }
  function clearUserPassword(user) {
    const list = getUsers();
    const target = list.find(function (u) { return u.id === user.id; });
    if (target) { delete target.pw; saveUsers(list); }
  }
  const PW_LABELS = ['Muy débil', 'Muy débil', 'Débil', 'Aceptable', 'Buena', 'Excelente'];
  function passwordScore(pw) {
    if (!pw) return 0;
    const rules = [
      pw.length >= 8,
      /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw),
      /[^a-zA-Z0-9\s]/.test(pw),
      /[a-z]/.test(pw) && /[A-Z]/.test(pw),
      pw.length >= 12
    ];
    return rules.filter(Boolean).length;
  }

  /* ------------- Bloqueo automático por inactividad ------------- */
  let autoLockTimer = null;
  let autoLockBound = false;
  let lastActivity = Date.now();
  function activityMark() { lastActivity = Date.now(); }
  function lockTimeoutMinutes() {
    const st = HM.state && HM.state.settings;
    if (!st || st.autoLock === false) return 0;
    const m = Number(st.autoLockMinutes);
    return (m >= 1 && m <= 240) ? m : 10;
  }
  function bindActivity() {
    if (autoLockBound) return;
    autoLockBound = true;
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(function (evt) {
      document.addEventListener(evt, activityMark, { passive: true });
    });
  }
  function startAutoLock() {
    bindActivity();
    activityMark();
    if (autoLockTimer) { clearInterval(autoLockTimer); autoLockTimer = null; }
    autoLockTimer = setInterval(async function () {
      const minutes = lockTimeoutMinutes();
      if (!minutes) return;
      const user = currentUser();
      if (!user) return;
      if (Date.now() - lastActivity < minutes * 60 * 1000) return;
      clearInterval(autoLockTimer);
      autoLockTimer = null;
      try { await autoSaveSnapshot(); } catch (e) { /* mejor esfuerzo */ }
      try { localStorage.setItem('vitalia.bye.v1', JSON.stringify({ id: user.id, name: user.name, reason: 'inactividad' })); } catch (e) { /* sin almacenamiento */ }
      try { location.hash = '#/inicio'; } catch (e) { /* ignorar */ }
      HM.setDbUser('');
      location.reload();
    }, 20000);
  }
  function applyTextSize() {
    const grande = HM.state && HM.state.settings && HM.state.settings.textSize === 'grande';
    if (document.documentElement) document.documentElement.classList.toggle('texto-grande', !!grande);
  }
  HM.applyTextSize = applyTextSize;

  /* ----------------- Copia automática (cada 10 minutos) ----------------- */
  const AUTO_KEY = 'vitalia.autobackup.v1';
  let autoSaveBusy = false;
  let autoSaveTimer = null;
  async function autoSaveSnapshot() {
    if (autoSaveBusy) return false;
    if (HM.state && HM.state.settings && HM.state.settings.autoBackup === false) return false;
    autoSaveBusy = true;
    try {
      const backup = await HM.buildBackup();
      try {
        localStorage.setItem(AUTO_KEY, JSON.stringify({ date: HM.nowISO(), json: JSON.stringify(backup) }));
        // Respaldo automático a carpeta elegida (si existe)
        const dir = HM.state && HM.state.settings && HM.state.settings.autoBackupDirHandle;
        if (dir) {
          try {
            const perm = await dir.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted') {
              const req = await dir.requestPermission({ mode: 'readwrite' });
              if (req !== 'granted') throw new Error('sin permiso');
            }
            const fileHandle = await dir.getFileHandle('saludenorden-autoguardado.json', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(backup));
            await writable.close();
          } catch (e) {
            console.warn('No se pudo escribir el respaldo en la carpeta elegida:', e);
          }
        }
        return true;
      } catch (e) { return false; }
    } catch (e) { return false; }
    finally { autoSaveBusy = false; }
  }
  function readAutoBackup() {
    try {
      const raw = localStorage.getItem(AUTO_KEY);
      if (!raw) return null;
      const pack = JSON.parse(raw);
      return { date: pack.date, json: JSON.parse(pack.json) };
    } catch (e) { return null; }
  }
  function startAutosave() {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(function () { autoSaveSnapshot(); }, 10 * 60 * 1000);
    if (!startAutosave._vis) {
      startAutosave._vis = true;
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') autoSaveSnapshot();
      });
    }
  }
  HM.autoSaveSnapshot = autoSaveSnapshot;
  HM.readAutoBackup = readAutoBackup;

  const USERS_KEY = 'vitalia.users.v1';
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveUsers(list) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch (e) { /* sin almacenamiento */ }
  }
  function currentUserId() {
    try { return localStorage.getItem('vitalia.user.v1') || ''; } catch (e) { return ''; }
  }
  function currentUser() {
    const id = currentUserId();
    return getUsers().find(function (u) { return u.id === id; }) || null;
  }
  const AVATAR_COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#e11d48', '#0ea5e9', '#d97706', '#059669', '#9333ea'];
  function avatarColor(id) {
    const users = getUsers();
    const i = users.findIndex(function (u) { return u.id === id; });
    return AVATAR_COLORS[(i === -1 ? 0 : i) % AVATAR_COLORS.length];
  }

  HM.currentHasPassword = function () {
    const u = currentUser();
    return !!(u && u.pw);
  };

  function showWelcomeLayer(html) {
    const root = document.getElementById('welcomeRoot');
    if (!root) return;
    root.innerHTML = html;
    root.hidden = false;
    const app = document.getElementById('app');
    if (app) app.style.display = 'none';
  }
  function hideWelcomeLayer() {
    const root = document.getElementById('welcomeRoot');
    if (root) { root.hidden = true; root.innerHTML = ''; }
    const app = document.getElementById('app');
    if (app) app.style.display = '';
  }

  function enterUser(user) {
    if (user.pw) { renderPasswordEntry(user); return; }
    HM.setDbUser(user.id);
    hideWelcomeLayer();
    init();
  }

  function createUser(name) {
    const list = getUsers();
    const user = {
      id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: String(name || '').trim(),
      createdAt: HM.nowISO()
    };
    list.push(user);
    saveUsers(list);
    return user;
  }

  async function legacyHasData() {
    try {
      if (!window.indexedDB) return false;
      if (indexedDB.databases) {
        const list = await indexedDB.databases();
        if (!list.some(function (d) { return d.name === HM.legacyDbName; })) return false;
      }
      const src = await HM.openNamedDb(HM.legacyDbName);
      const counts = await Promise.all(['profile', 'records', 'vitals'].map(function (name) {
        return new Promise(function (resolve) {
          const tx = src.transaction(name, 'readonly');
          const req = tx.objectStore(name).count();
          req.onsuccess = function () { resolve(req.result); };
          req.onerror = function () { resolve(0); };
        });
      }));
      src.close();
      return counts.some(function (c) { return c > 0; });
    } catch (e) { return false; }
  }

  async function importLegacyData(user) {
    HM.logMuted = true;
    const src = await HM.openNamedDb(HM.legacyDbName);
    const names = Array.from(src.objectStoreNames);
    for (const name of names) {
      const items = await new Promise(function (resolve, reject) {
        const tx = src.transaction(name, 'readonly');
        const req = tx.objectStore(name).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
      for (const item of items) await HM.db.put(name, item);
    }
    src.close();
    HM.logMuted = false;
    await HM.logManual('import', 'Datos', '');
    enterUser(user);
  }

  function welcomeUserTile(user) {
    return '<button type="button" class="welcome-user" data-user-id="' + user.id + '">' +
      '<span class="welcome-avatar" style="background:' + avatarColor(user.id) + '">' + HM.escape(HM.initials(user.name)) + '</span>' +
      '<span class="welcome-user-name">' + HM.escape(user.name) + (user.pw ? '<span class="tile-shield" title="Protegido con contraseña">' + HM.icon('shield') + '</span>' : '') + '</span>' +
      '<span class="welcome-user-arrow">' + HM.icon('arrow-right') + '</span>' +
    '</button>';
  }

  function renderWelcome() {
    const users = getUsers();
    const tiles = users.map(welcomeUserTile).join('');
    showWelcomeLayer(
      '<div class="welcome-card">' +
        '<img src="assets/img/logo-mark.svg" alt="SaludEnOrden" width="56" height="56" class="welcome-brand-img">' +
        '<h1>Bienvenido a SaludEnOrden</h1>' +
        '<p>¿Quién usará el historial hoy?</p>' +
        (tiles ? '<div class="welcome-users">' + tiles + '</div>' : '') +
        '<form id="welcomeCreate" autocomplete="off">' +
          '<input class="input" type="text" name="name" placeholder="Nombre del nuevo usuario" maxlength="40" required>' +
          '<button type="submit" class="btn btn-primary">' + HM.icon('user-plus') + ' Crear usuario</button>' +
        '</form>' +
        '<p class="welcome-note">' + HM.icon('shield') + ' Cada usuario guarda su información por separado en este dispositivo. Todo funciona sin conexión y nadie más lo ve.</p>' +
        '<div class="welcome-legacy" id="welcomeLegacy" hidden>' + HM.icon('database') + ' Se detectó información existente de una versión anterior. <button type="button" class="btn btn-soft btn-sm" id="legacyImportBtn">Importar datos</button></div>' +
        '<button type="button" class="welcome-admin-link" id="adminLink">' + HM.icon('shield') + ' Acceso de administrador</button>' +
      '</div>');

    const root = document.getElementById('welcomeRoot');
    root.querySelectorAll('.welcome-user').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const user = getUsers().find(function (u) { return u.id === btn.dataset.userId; });
        if (user) enterUser(user);
      });
    });
    root.querySelector('#welcomeCreate').addEventListener('submit', function (e) {
      e.preventDefault();
      const name = String(e.target.name.value || '').trim();
      if (!name) return;
      renderCreatePassword(createUser(name));
    });
    const adminLink = root.querySelector('#adminLink');
    if (adminLink) adminLink.addEventListener('click', renderAdminLogin);
    if (!users.length) {
      legacyHasData().then(function (has) {
        const box = document.getElementById('welcomeLegacy');
        if (has && box) {
          box.hidden = false;
          box.querySelector('#legacyImportBtn').addEventListener('click', function () {
            const name = 'Mi historial';
            const legacyUser = createUser(name);
            renderCreatePassword(legacyUser, function () {
              importLegacyData(legacyUser).catch(function (err) {
                console.error(err);
                HM.toast('No se pudo importar', err.message || 'Intenta de nuevo.', 'error');
              });
            });
          });
        }
      });
    }
  }

  function renderSessionClosed(last) {
    const list = getUsers();
    const again = last && last.id ? list.find(function (u) { return u.id === last.id; }) : null;
    const byInactivity = last && last.reason === 'inactividad';
    showWelcomeLayer(
      '<div class="welcome-card">' +
        '<span class="welcome-logo welcome-logo-green">' + HM.icon(byInactivity ? 'lock' : 'check-circle') + '</span>' +
        '<h1>' + (byInactivity ? 'Sesión bloqueada' : 'Sesión cerrada') + '</h1>' +
        '<p>' + (byInactivity
          ? 'Se bloqueó por inactividad' + (last && last.name ? ' de <strong>' + HM.escape(last.name) + '</strong>' : '') + '. Tus datos están guardados y a salvo.'
          : 'Saliste de la cuenta' + (last && last.name ? ' de <strong>' + HM.escape(last.name) + '</strong>' : '') + '. Tus datos quedaron guardados de forma segura en este dispositivo.') + '</p>' +
        '<div class="welcome-actions">' +
          (again ? '<button type="button" class="btn btn-primary" data-enter-again>' + HM.icon('arrow-right') + ' Volver a entrar</button>' : '') +
          '<button type="button" class="btn btn-outline" data-go-welcome>' + HM.icon('user-plus') + ' Cambiar de usuario</button>' +
        '</div>' +
      '</div>');
    const root = document.getElementById('welcomeRoot');
    const againBtn = root.querySelector('[data-enter-again]');
    if (againBtn) againBtn.addEventListener('click', function () { enterUser(again); });
    root.querySelector('[data-go-welcome]').addEventListener('click', renderWelcome);
  }

  async function onLogout() {
    const user = currentUser();
    const ok = await HM.confirm({
      title: 'Cerrar sesión',
      message: 'Volverás a la pantalla de sesión cerrada y luego a la bienvenida. La información de ' + (user ? '«' + user.name + '»' : 'este usuario') + ' queda guardada en este dispositivo.',
      confirmText: 'Cerrar sesión',
      icon: 'log-out'
    });
    if (!ok) return;
    try { localStorage.setItem('vitalia.bye.v1', JSON.stringify({ id: user ? user.id : '', name: user ? user.name : '' })); } catch (e) { /* sin almacenamiento */ }
    try { location.hash = '#/inicio'; } catch (e) { /* ignorar */ }
    HM.setDbUser('');
    location.reload();
  }

  function renderCreatePassword(user, enterFn) {
    showWelcomeLayer(
      '<div class="welcome-card">' +
        '<span class="welcome-logo welcome-logo-green">' + HM.icon('shield') + '</span>' +
        '<h1>Protege tu cuenta</h1>' +
        '<p>Crea una contraseña para <strong>' + HM.escape(user.name) + '</strong>. SaludEnOrden la pedirá cada vez que abras la app en este dispositivo.</p>' +
        '<form id="createPwForm" class="stack-form" autocomplete="off" novalidate>' +
          '<div class="field"><label>Contraseña</label><input class="input" type="password" name="password" id="createPwInput" required></div>' +
          '<div class="pw-strength"><div class="pw-bar"><span id="createPwBar"></span></div><span class="pw-label" id="createPwLabel">Escribe una contraseña para ver su nivel</span></div>' +
          '<div class="field"><label>Repetir contraseña</label><input class="input" type="password" name="password2" required></div>' +
          '<div class="auth-error" id="createPwError"></div>' +
          '<p class="form-note" style="text-align:left">Debe tener 8 caracteres o más e incluir letras, números y símbolos (por ejemplo: !, #, %).</p>' +
          '<button type="submit" class="btn btn-primary">' + HM.icon('shield') + ' Guardar y entrar</button>' +
        '</form>' +
        '<button type="button" class="welcome-link" data-skip-pw>Continuar sin contraseña</button>' +
      '</div>');
    const root = document.getElementById('welcomeRoot');
    const input = root.querySelector('#createPwInput');
    const bar = root.querySelector('#createPwBar');
    const label = root.querySelector('#createPwLabel');
    const errorEl = root.querySelector('#createPwError');
    function go() {
      if (typeof enterFn === 'function') { enterFn(); return; }
      HM.setDbUser(user.id);
      hideWelcomeLayer();
      init();
    }
    function update() {
      const score = passwordScore(input.value);
      bar.style.width = (input.value ? Math.max(score * 20, 6) : 0) + '%';
      bar.className = score ? 'pw-' + score : '';
      label.textContent = !input.value ? 'Escribe una contraseña para ver su nivel' : PW_LABELS[score];
    }
    input.addEventListener('input', update);
    update();
    root.querySelector('#createPwForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      const pw = String(input.value || '');
      if (passwordScore(pw) < 3) { errorEl.textContent = 'La contraseña aún no es aceptable: usa 8 caracteres o más con letras, números y símbolos.'; return; }
      const pw2 = String(e.target.password2.value || '');
      if (pw !== pw2) { errorEl.textContent = 'Las contraseñas no coinciden.'; return; }
      HM.setDbUser(user.id);
      await setUserPassword(user, pw);
      await HM.logManual('security', 'Cuenta', user.name);
      go();
    });
    root.querySelector('[data-skip-pw]').addEventListener('click', go);
  }

  function renderPasswordEntry(user) {
    showWelcomeLayer(
      '<div class="welcome-card">' +
        '<span class="welcome-avatar welcome-avatar-big" style="background:' + avatarColor(user.id) + '">' + HM.escape(HM.initials(user.name)) + '</span>' +
        '<h1>Hola, ' + HM.escape((user.name || '').split(' ')[0]) + '</h1>' +
        '<p>Ingresa tu contraseña para abrir tu historial.</p>' +
        '<form id="pwEntryForm" class="stack-form" autocomplete="off">' +
          '<div class="field"><label>Contraseña</label><input class="input" type="password" name="password" required></div>' +
          '<div class="auth-error" id="pwEntryError"></div>' +
          '<button type="submit" class="btn btn-primary">' + HM.icon('arrow-right') + ' Entrar</button>' +
        '</form>' +
        '<button type="button" class="welcome-link" data-back>Cambiar de usuario</button>' +
      '</div>');
    const root = document.getElementById('welcomeRoot');
    root.querySelector('#pwEntryForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      const password = String(e.target.password.value || '');
      const errorEl = root.querySelector('#pwEntryError');
      if (!password) { errorEl.textContent = 'Escribe tu contraseña.'; return; }
      const ok = await verifyUserPassword(user, password);
      if (!ok) { errorEl.textContent = 'Contraseña incorrecta. Intenta de nuevo.'; return; }
      HM.setDbUser(user.id);
      hideWelcomeLayer();
      init();
    });
    root.querySelector('[data-back]').addEventListener('click', renderWelcome);
  }

  function renderAdminLogin() {
    showWelcomeLayer(
      '<div class="welcome-card">' +
        '<span class="welcome-logo">' + HM.icon('shield') + '</span>' +
        '<h1>Acceso de administrador</h1>' +
        '<p>Panel reservado para borrar la información guardada de los usuarios.</p>' +
        '<form id="adminForm" class="stack-form" autocomplete="off">' +
          '<div class="field"><label>Usuario</label><input class="input" type="text" name="username" required></div>' +
          '<div class="field"><label>Contraseña</label><input class="input" type="password" name="password" required></div>' +
          '<div class="auth-error" id="adminError"></div>' +
          '<button type="submit" class="btn btn-primary">Entrar al panel</button>' +
        '</form>' +
        '<button type="button" class="welcome-link" data-back>Volver</button>' +
      '</div>');
    const root = document.getElementById('welcomeRoot');
    root.querySelector('#adminForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const username = String(e.target.username.value || '').trim().toLowerCase();
      const password = String(e.target.password.value || '');
      const errorEl = root.querySelector('#adminError');
      if (username !== 'admin' || password !== 'admin') { errorEl.textContent = 'Credenciales de administrador incorrectas.'; return; }
      renderAdminPanel();
    });
    root.querySelector('[data-back]').addEventListener('click', renderWelcome);
  }

  async function wipeUserData(user) {
    try { indexedDB.deleteDatabase(HM.userDbName(user.id)); } catch (e) { /* continuar */ }
    saveUsers(getUsers().filter(function (u) { return u.id !== user.id; }));
  }

  function renderAdminPanel() {
    const users = getUsers();
    const rows = users.map(function (u) {
      return '<div class="admin-user"><span class="welcome-avatar" style="background:' + avatarColor(u.id) + '">' + HM.escape(HM.initials(u.name)) + '</span>' +
        '<div class="grow"><strong>' + HM.escape(u.name) + '</strong><p class="tiny muted">' + (u.pw ? 'Con contraseña' : 'Sin contraseña') + '</p></div>' +
        '<button type="button" class="btn btn-danger btn-sm" data-wipe-user="' + u.id + '">' + HM.icon('trash') + ' Borrar su información</button></div>';
    }).join('');
    showWelcomeLayer(
      '<div class="welcome-card admin-card">' +
        '<span class="welcome-logo">' + HM.icon('shield') + '</span>' +
        '<h1>Panel de administrador</h1>' +
        '<p>Desde aquí puedes borrar la información guardada de los usuarios. Esta acción no se puede deshacer.</p>' +
        (rows ? '<div class="admin-users">' + rows + '</div>' : '<p class="small muted mt-2">No hay usuarios registrados.</p>') +
        (users.length ? '<button type="button" class="btn btn-danger" id="wipeAll">' + HM.icon('trash') + ' Borrar toda la información de todos los usuarios</button>' : '') +
        '<button type="button" class="welcome-link" data-back>Salir del panel</button>' +
      '</div>');
    const root = document.getElementById('welcomeRoot');
    root.querySelectorAll('[data-wipe-user]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const user = getUsers().find(function (u) { return u.id === btn.dataset.wipeUser; });
        if (!user) return;
        const ok = await HM.confirm({
          title: 'Borrar información',
          message: 'Se eliminarán todos los datos de ' + user.name + ' y su cuenta quedará eliminada. Esta acción no se puede deshacer. ¿Continuar?',
          confirmText: 'Borrar',
          danger: true,
          icon: 'trash'
        });
        if (!ok) return;
        await wipeUserData(user);
        renderAdminPanel();
      });
    });
    const wipeAllBtn = root.querySelector('#wipeAll');
    if (wipeAllBtn) {
      wipeAllBtn.addEventListener('click', async function () {
        const ok = await HM.confirm({
          title: 'Borrar todo',
          message: 'Se eliminarán TODOS los usuarios y toda su información guardada en este dispositivo. Esta acción no se puede deshacer. ¿Continuar?',
          confirmText: 'Borrar todo',
          danger: true,
          icon: 'trash'
        });
        if (!ok) return;
        for (const u of getUsers()) await wipeUserData(u);
        renderAdminPanel();
      });
    }
    root.querySelector('[data-back]').addEventListener('click', renderWelcome);
  }

  function openPasswordModal(mode) {
    const assign = mode === 'assign';
    const user = currentUser();
    if (!user) return;
    const body =
      '<form id="pwForm" autocomplete="off" novalidate>' +
        '<div class="field"><label>Nueva contraseña</label><input class="input" type="password" name="password" id="pwInput" required></div>' +
        '<div class="pw-strength"><div class="pw-bar"><span id="pwBar"></span></div><span class="pw-label" id="pwLabel">Escribe una contraseña para ver su nivel</span></div>' +
        '<div class="field"><label>Repetir contraseña</label><input class="input" type="password" name="password2" required></div>' +
        '<div class="auth-error" id="pwError"></div>' +
        '<p class="form-note">Debe tener 8 caracteres o más e incluir letras, números y símbolos (por ejemplo: !, #, %).</p>' +
      '</form>';
    HM.modal.open({
      title: assign ? 'Asignar contraseña' : 'Cambiar contraseña',
      subtitle: assign ? 'Se pedirá en el próximo inicio de sesión de ' + user.name + '.' : 'La nueva contraseña se pedirá en el próximo inicio de sesión.',
      icon: 'shield',
      body: body,
      footer: '<button type="button" class="btn btn-primary" id="pwSave">' + HM.icon('shield') + ' Guardar contraseña</button><button type="button" class="btn btn-outline" data-modal-close>Cancelar</button>',
      onMount: function (root) {
        const input = root.querySelector('#pwInput');
        const bar = root.querySelector('#pwBar');
        const label = root.querySelector('#pwLabel');
        const errorEl = root.querySelector('#pwError');
        function update() {
          const score = passwordScore(input.value);
          bar.style.width = (input.value ? Math.max(score * 20, 6) : 0) + '%';
          bar.className = score ? 'pw-' + score : '';
          label.textContent = !input.value ? 'Escribe una contraseña para ver su nivel' : PW_LABELS[score];
        }
        input.addEventListener('input', update);
        update();
        root.querySelector('#pwSave').addEventListener('click', async function () {
          const pw = String(input.value || '');
          if (passwordScore(pw) < 3) { errorEl.textContent = 'La contraseña aún no es aceptable: usa 8 caracteres o más con letras, números y símbolos.'; return; }
          const pw2 = String(root.querySelector('[name="password2"]').value || '');
          if (pw !== pw2) { errorEl.textContent = 'Las contraseñas no coinciden.'; return; }
          await setUserPassword(user, pw);
          await HM.logManual('security', 'Cuenta', user.name);
          HM.modal.close();
          HM.toast('Contraseña asignada', 'Se pedirá en el próximo inicio de sesión de ' + user.name + '.', 'success', 6000);
          document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
        });
      }
    });
  }

  function start() {
    let bye = null;
    try {
      const raw = localStorage.getItem('vitalia.bye.v1');
      if (raw) { bye = JSON.parse(raw); localStorage.removeItem('vitalia.bye.v1'); }
    } catch (e) { /* sin almacenamiento */ }
    if (bye) renderSessionClosed(bye);
    else {
      const user = currentUser();
      if (!user) renderWelcome();
      else if (user.pw) renderPasswordEntry(user);
      else init();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  HM.navigate = function (route) {
    location.hash = '#/' + route;
  };
  HM.openSettings = openSettings;


})();
