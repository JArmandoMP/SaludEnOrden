/* ============================================================
   SaludEnOrden · Informe médico imprimible (PDF)
   ============================================================ */
(function () {
  'use strict';
  const HM = window.HM;
  const V = HM.views;
  const R = (HM.report = {});

  const DEFAULT_OPTIONS = {
    profile: true,
    alerts: true,
    family: true,
    vitals: true,
    history: true,
    vaccines: true,
    treatments: true,
    appointments: true,
    directory: true,
    documents: true,
    images: false
  };

  const SECTION_LABELS = {
    profile: 'Perfil y contactos',
    alerts: 'Alergias y condiciones',
    family: 'Antecedentes familiares',
    vitals: 'Signos vitales',
    history: 'Historial clínico',
    vaccines: 'Vacunas',
    treatments: 'Tratamientos',
    appointments: 'Citas médicas',
    directory: 'Directorio médico',
    documents: 'Documentos',
    images: 'Imágenes de documentos'
  };

  function loadOptions() {
    try {
      const raw = localStorage.getItem('vitalia.report.options');
      if (raw) return Object.assign({}, DEFAULT_OPTIONS, JSON.parse(raw));
    } catch (e) { /* noop */ }
    return Object.assign({}, DEFAULT_OPTIONS);
  }

  function saveOptions(options) {
    try { localStorage.setItem('vitalia.report.options', JSON.stringify(options)); } catch (e) { /* noop */ }
  }

  function esc(value) { return HM.escape(value); }

  function vitalText(v) {
    if (!v) return '—';
    const x = v.values || {};
    if (v.type === 'presion') return x.systolic + '/' + x.diastolic + ' mmHg' + (x.pulse ? ' · pulso ' + x.pulse + ' lpm' : '');
    if (v.type === 'glucosa') return HM.num(x.value, 0) + ' mg/dL' + (x.context ? ' · ' + x.context : '');
    if (v.type === 'peso') return HM.num(x.value, 1) + ' kg';
    if (v.type === 'temperatura') return HM.num(x.value, 1) + ' °C' + (x.method ? ' · ' + x.method : '');
    if (v.type === 'pulso') return HM.num(x.value, 0) + ' lpm';
    if (v.type === 'oxigeno') return HM.num(x.value, 0) + ' %';
    if (v.type === 'sintoma') return (x.description || 'Síntoma') + (x.intensity ? ' · intensidad ' + x.intensity + '/10' : '') + (x.duration ? ' · ' + x.duration : '');
    return '—';
  }

  function recordMeta(type) {
    return HM.recordTypes[type] || HM.recordTypes.otro;
  }

  function providerName(id) {
    return HM.providerName(id);
  }

  R.build = async function (options) {
    const p = HM.state.profile || {};
    const profileName = HM.profileName() || 'Paciente';
    const age = HM.age(p.birthDate);
    const allergies = p.allergies || [];
    const severe = allergies.filter(function (a) { return HM.severityRank(a.severity) >= 3; });
    const contacts = p.emergencyContacts || [];
    const conditions = p.conditions || [];
    const family = p.familyHistory || [];
    const now = new Date();

    let html = '<div class="r-cover">' +
      '<div class="r-brand"><span class="r-logo">' + HM.icon('heart-pulse') + '</span> SaludEnOrden · Historial médico personal</div>' +
      '<h1>Informe médico personal</h1>' +
      '<p class="r-sub">' + esc(profileName) + (age != null ? ' · ' + age + ' años' : '') + (p.bloodType ? ' · Grupo sanguíneo ' + esc(p.bloodType) : '') + '</p>' +
      (severe.length ? '<span class="r-alert">' + HM.icon('alert-triangle') + ' Alergia grave: ' + severe.map(function (a) { return esc(a.substance); }).join(', ') + '</span>' : '') +
      '<div class="r-cover-meta">' +
        '<div><strong>' + HM.fmtDate(now, 'long') + '</strong><span>Fecha de generación</span></div>' +
        '<div><strong>' + HM.state.records.length + '</strong><span>Registros clínicos</span></div>' +
        '<div><strong>' + HM.state.documents.length + '</strong><span>Documentos</span></div>' +
        (contacts[0] ? '<div><strong>' + esc(contacts[0].name) + '</strong><span>Contacto de emergencia · ' + esc(contacts[0].phone) + '</span></div>' : '') +
      '</div>' +
    '</div>';

    if (options.profile) {
      /* Resumen clínico rápido para la consulta */
      const active = HM.activeTreatments();
      const latestV = {};
      HM.sortDesc(HM.state.vitals, 'date').forEach(function (v) { if (!latestV[v.type]) latestV[v.type] = v; });
      const quickBits = [];
      if (severe.length) quickBits.push('<div class="r-alert-card" style="margin-top:8px"><strong>Alergias graves:</strong><span>' + severe.map(function (a) { return a.substance + ' (' + (a.severity || 'Leve') + ')'; }).join(', ') + '</span></div>');
      if (allergies.length && !severe.length) quickBits.push('<p class="r-note" style="margin-top:8px"><strong>Alergias:</strong> ' + esc(allergies.map(function (a) { return a.substance; }).join(', ')) + '</p>');
      if (active.length || HM.state.vitals.length) {
        html += '<section class="r-section"><h2>' + HM.icon('heart-pulse') + ' Resumen rápido para la consulta</h2>' +
          '<div class="r-grid">' +
            rField('Paciente', profileName + (age != null ? ' (' + age + ' años)' : '')) +
            rField('Grupo sanguíneo', p.bloodType || '—') +
            rField('Contacto de emergencia', contacts[0] ? contacts[0].name + ' · ' + (contacts[0].phone || '') : '—') +
            rField('Medicamentos activos', active.length ? esc(active.map(function (t) { return t.name; }).join(', ')) : '—') +
            rField('Última presión', latestV.presion ? vitalText(latestV.presion) : '—') +
            rField('Última glucosa', latestV.glucosa ? vitalText(latestV.glucosa) : '—') +
          '</div>' +
          quickBits.join('') +
        '</section>';
      }
      html += '<section class="r-section"><h2>' + HM.icon('user') + ' Datos personales y contacto</h2>' +
        '<div class="r-grid">' +
          rField('Nombre completo', profileName) +
          rField('Fecha de nacimiento', p.birthDate ? HM.fmtDate(p.birthDate, 'medium') : '—') +
          rField('Edad', age != null ? age + ' años' : '—') +
          rField('Sexo', p.sex || '—') +
          rField('Grupo sanguíneo', p.bloodType || '—') +
          rField('Teléfono', p.phone || '—') +
          rField('Correo', p.email || '—') +
          rField('Dirección', p.address || '—') +
          rField('Ciudad / Estado', p.city || '—') +
          rField('Identificación', p.documentId || '—') +
          rField('Aseguradora', p.insurance || '—') +
          rField('Póliza / afiliación', p.policyNumber || '—') +
        '</div>' +
        '<h3>Contactos de emergencia</h3>' +
        (contacts.length ? '<table class="r-table"><thead><tr><th>Nombre</th><th>Parentesco</th><th>Teléfono</th><th>Correo</th><th>Notas</th></tr></thead><tbody>' +
          contacts.map(function (c) {
            return '<tr><td><strong>' + esc(c.name) + '</strong></td><td>' + esc(c.relationship || '—') + '</td><td>' + esc(c.phone || '—') + '</td><td>' + esc(c.email || '—') + '</td><td>' + esc(c.notes || '—') + '</td></tr>';
          }).join('') + '</tbody></table>' : '<p class="r-empty">Sin contactos de emergencia registrados.</p>') +
        (p.notes ? '<h3>Notas médicas</h3><p class="r-note">' + esc(p.notes) + '</p>' : '') +
      '</section>';
    }

    if (options.alerts) {
      html += '<section class="r-section"><h2>' + HM.icon('alert-triangle') + ' Alertas de salud</h2>';
      html += '<h3>Alergias</h3>';
      if (allergies.length) {
        html += allergies.map(function (a) {
          return '<div class="r-alert-card"><strong>' + esc(a.substance) + ' · ' + esc(a.severity || 'Leve') + '</strong><span>' + esc([a.reaction, a.notes].filter(Boolean).join(' · ') || 'Sin detalle') + '</span></div>';
        }).join('');
      } else {
        html += '<p class="r-empty">Sin alergias registradas.</p>';
      }
      html += '<h3>Condiciones y antecedentes personales</h3>';
      if (conditions.length) {
        html += '<ul style="margin:4px 0 0 16px;padding:0">' + conditions.map(function (c) {
          return '<li style="margin-bottom:3px"><strong>' + esc(c.name) + '</strong>' + (c.since ? ' · desde ' + esc(c.since) : '') + (c.notes ? ' — ' + esc(c.notes) : '') + '</li>';
        }).join('') + '</ul>';
      } else {
        html += '<p class="r-empty">Sin condiciones registradas.</p>';
      }
      html += '</section>';
    }

    if (options.family) {
      html += '<section class="r-section"><h2>' + HM.icon('heart') + ' Antecedentes familiares</h2>' +
        (family.length ? '<table class="r-table"><thead><tr><th>Familiar</th><th>Condición</th><th>Notas</th></tr></thead><tbody>' +
          family.map(function (f) { return '<tr><td>' + esc(f.relative || '—') + '</td><td><strong>' + esc(f.condition) + '</strong></td><td>' + esc(f.notes || '—') + '</td></tr>'; }).join('') +
          '</tbody></table>' : '<p class="r-empty">Sin antecedentes familiares registrados.</p>') +
      '</section>';
    }

    if (options.vitals) {
      const vitals = HM.sortDesc(HM.state.vitals, 'date');
      html += '<section class="r-section"><h2>' + HM.icon('activity') + ' Signos vitales y monitoreo</h2>';
      if (vitals.length) {
        const latest = {};
        vitals.forEach(function (v) { if (!latest[v.type]) latest[v.type] = v; });
        html += '<div class="r-grid">' +
          ['presion', 'glucosa', 'peso', 'oxigeno'].map(function (t) {
            return rField(HM.vitalTypes[t].label, latest[t] ? vitalText(latest[t]) + ' · ' + HM.fmtDate(latest[t].date, 'short') : 'Sin registros');
          }).join('') + '</div>';
        html += '<h3>Historial de mediciones</h3>' +
          '<table class="r-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Medición</th><th>Nota</th></tr></thead><tbody>' +
          vitals.map(function (v) {
            return '<tr><td>' + HM.fmtDate(v.date, 'short') + ' · ' + HM.fmtTime(v.date) + '</td><td>' + esc(HM.vitalTypes[v.type] ? HM.vitalTypes[v.type].label : v.type) + '</td><td>' + esc(vitalText(v)) + '</td><td>' + esc(v.note || '—') + '</td></tr>';
          }).join('') + '</tbody></table>';
      } else {
        html += '<p class="r-empty">Sin mediciones registradas.</p>';
      }
      html += '</section>';
    }

    if (options.history) {
      const records = HM.sortDesc(HM.state.records, 'date');
      html += '<section class="r-section"><h2>' + HM.icon('file-text') + ' Historial clínico</h2>';
      if (records.length) {
        records.forEach(function (r) {
          const meta = recordMeta(r.type);
          const provider = providerName(r.providerId);
          const providerLine = Array.from(new Set([provider, r.doctor, r.specialty].filter(Boolean))).join(' · ');
          html += '<div class="r-entry">' +
            '<div class="r-entry-top"><strong>' + esc(r.title) + '</strong><span>' + HM.fmtDate(r.date, 'medium') + '</span></div>' +
            '<div class="r-entry-sub">' + esc(meta.label) + (providerLine ? ' · ' + esc(providerLine) : '') + '</div>' +
            (r.diagnosis ? '<p><strong>Diagnóstico / resultados:</strong> ' + esc(r.diagnosis) + '</p>' : '') +
            (r.treatment ? '<p><strong>Tratamiento / indicaciones:</strong> ' + esc(r.treatment) + '</p>' : '') +
            (r.vaccineDose ? '<p><strong>Dosis aplicada:</strong> ' + esc(r.vaccineDose) + (r.nextDose ? ' · Próxima dosis: ' + HM.fmtDate(r.nextDose, 'medium') : '') + '</p>' : '') +
            (r.notes ? '<p><strong>Notas:</strong> ' + esc(r.notes) + '</p>' : '') +
            (r.fileIds && r.fileIds.length ? '<p class="r-entry-files">' + r.fileIds.length + ' archivo(s) adjunto(s) disponibles en la aplicación.</p>' : '') +
          '</div>';
        });
      } else {
        html += '<p class="r-empty">Sin registros clínicos.</p>';
      }
      html += '</section>';
    }

    if (options.vaccines) {
      const vaccines = HM.sortDesc(HM.state.records.filter(function (r) { return r.type === 'vacuna'; }), 'date');
      html += '<section class="r-section"><h2>' + HM.icon('syringe') + ' Vacunas</h2>' +
        (vaccines.length ? '<table class="r-table"><thead><tr><th>Fecha</th><th>Vacuna</th><th>Dosis</th><th>Próxima dosis</th><th>Institución</th></tr></thead><tbody>' +
          vaccines.map(function (v) {
            return '<tr><td>' + HM.fmtDate(v.date, 'short') + '</td><td><strong>' + esc(v.title) + '</strong></td><td>' + esc(v.vaccineDose || '—') + '</td><td>' + (v.nextDose ? HM.fmtDate(v.nextDose, 'short') : '—') + '</td><td>' + esc(providerName(v.providerId) || v.doctor || '—') + '</td></tr>';
          }).join('') + '</tbody></table>' : '<p class="r-empty">Sin vacunas registradas.</p>') +
      '</section>';
    }

    if (options.treatments) {
      const active = HM.activeTreatments();
      const completed = HM.state.treatments.filter(function (t) { return !HM.isTreatmentActive(t); });
      const row = function (t) {
        const ad = HM.adherence(t, 7);
        return '<tr><td><strong>' + esc(t.name) + '</strong><br><span style="color:#7b8ba2">' + esc([t.form, t.reason].filter(Boolean).join(' · ')) + '</span></td><td>' + esc(t.dose) + '</td><td>' + esc((t.times || []).join(', ') || '—') + '</td><td>' + HM.fmtDate(t.startDate, 'short') + (t.endDate ? ' — ' + HM.fmtDate(t.endDate, 'short') : ' — actual') + '</td><td>' + esc(t.prescriber || '—') + '</td><td>' + (ad ? ad.percent + '%' : '—') + '</td></tr>';
      };
      html += '<section class="r-section"><h2>' + HM.icon('pill') + ' Tratamientos y medicamentos</h2>';
      html += '<h3>Tratamientos activos</h3>';
      html += active.length ? '<table class="r-table"><thead><tr><th>Medicamento</th><th>Dosis</th><th>Horarios</th><th>Periodo</th><th>Prescrito por</th><th>Adherencia 7 d</th></tr></thead><tbody>' + active.map(row).join('') + '</tbody></table>' : '<p class="r-empty">Sin tratamientos activos.</p>';
      if (completed.length) {
        html += '<h3>Tratamientos concluidos</h3><table class="r-table"><thead><tr><th>Medicamento</th><th>Dosis</th><th>Horarios</th><th>Periodo</th><th>Prescrito por</th><th>Adherencia 7 d</th></tr></thead><tbody>' + completed.map(row).join('') + '</tbody></table>';
      }
      html += '</section>';
    }

    if (options.appointments) {
      const appointments = HM.sortDesc(HM.state.appointments, 'dateTime');
      html += '<section class="r-section"><h2>' + HM.icon('calendar') + ' Citas médicas</h2>' +
        (appointments.length ? '<table class="r-table"><thead><tr><th>Fecha y hora</th><th>Motivo</th><th>Médico / institución</th><th>Lugar</th><th>Estado</th></tr></thead><tbody>' +
          appointments.map(function (a) {
            const status = a.status === 'asistida' ? 'Asistida' : a.status === 'cancelada' ? 'Cancelada' : 'Pendiente';
            return '<tr><td>' + HM.fmtDate(a.dateTime, 'short') + ' · ' + HM.fmtTime(a.dateTime) + '</td><td><strong>' + esc(a.title) + '</strong></td><td>' + esc(Array.from(new Set([a.doctor, providerName(a.providerId)].filter(Boolean))).join(' · ') || '—') + '</td><td>' + esc(a.location || '—') + '</td><td>' + status + '</td></tr>';
          }).join('') + '</tbody></table>' : '<p class="r-empty">Sin citas registradas.</p>') +
      '</section>';
    }

    if (options.directory) {
      const providers = HM.state.providers.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
      html += '<section class="r-section"><h2>' + HM.icon('stethoscope') + ' Directorio médico</h2>' +
        (providers.length ? '<table class="r-table"><thead><tr><th>Nombre</th><th>Tipo</th><th>Especialidad</th><th>Cédula</th><th>Teléfono</th><th>Dirección</th></tr></thead><tbody>' +
          providers.map(function (p) {
            const meta = HM.providerTypes[p.type] || HM.providerTypes.medico;
            return '<tr><td><strong>' + esc(p.name) + '</strong></td><td>' + esc(meta.label) + '</td><td>' + esc(p.specialty || '-') + '</td><td>' + esc(p.license || '-') + '</td><td>' + esc(p.phone || '-') + '</td><td>' + esc(p.address || '-') + '</td></tr>';
          }).join('') + '</tbody></table>' : '<p class="r-empty">Sin contactos registrados.</p>') +
      '</section>';
    }

    if (options.documents) {
      const docs = HM.sortDesc(HM.state.documents, 'date');
      html += '<section class="r-section"><h2>' + HM.icon('folder') + ' Documentos y archivos</h2>' +
        (docs.length ? '<table class="r-table"><thead><tr><th>Documento</th><th>Categoría</th><th>Fecha</th><th>Institución</th><th>Notas</th></tr></thead><tbody>' +
          docs.map(function (d) {
            const cat = HM.docCategories[d.category] || HM.docCategories.otro;
            return '<tr><td><strong>' + esc(d.name) + '</strong></td><td>' + esc(cat.label) + '</td><td>' + HM.fmtDate(d.date, 'short') + '</td><td>' + esc(providerName(d.providerId) || '—') + '</td><td>' + esc(d.notes || '—') + '</td></tr>';
          }).join('') + '</tbody></table>' : '<p class="r-empty">Sin documentos registrados.</p>') +
      '</section>';

      if (options.images && docs.length) {
        const imageDocs = docs.filter(function (d) { return HM.isImage(d.mime, d.name) && d.fileId; });
        if (imageDocs.length) {
          html += '<section class="r-section"><h2>' + HM.icon('image') + ' Anexos · Imágenes de documentos</h2><div class="r-doc-grid">';
          for (const doc of imageDocs) {
            const url = await HM.files.url(doc.fileId);
            if (!url) continue;
            html += '<div class="r-doc"><img src="' + url + '" alt="' + esc(doc.name) + '"><div><strong>' + esc(doc.name) + '</strong><br>' + HM.fmtDate(doc.date, 'short') + '</div></div>';
          }
          html += '</div></section>';
        }
      }
    }

    html += '<div class="r-footer"><span>SaludEnOrden · Informe generado el ' + HM.fmtDate(now, 'datetime') + '</span><span>' + esc(profileName) + ' · Documento personal</span></div>';
    html += '<p class="r-print-note">Este informe es un resumen de la información registrada por el paciente y no sustituye un expediente clínico oficial.</p>';

    return html;
  };

  function rField(label, value) {
    return '<div class="r-field"><label>' + esc(label) + '</label><span>' + esc(value || '—') + '</span></div>';
  }

  function optionsHTML(options) {
    return '<div class="report-options no-print">' +
      Object.keys(SECTION_LABELS).map(function (key) {
        return '<label class="check-chip"><input type="checkbox" data-report-section="' + key + '"' + (options[key] ? ' checked' : '') + '> ' + esc(SECTION_LABELS[key]) + '</label>';
      }).join('') +
    '</div>';
  }

  R.view = async function () {
    const options = loadOptions();
    const preview = await R.build(options);
    let html = '<div class="page-head"><div><h2>Informe médico completo</h2><p>Selecciona qué incluir y genera un PDF ordenado para compartir en tu trabajo, con un médico o para tus registros.</p></div>' +
      '<div class="actions"><button type="button" class="btn btn-outline" data-action="backup">' + HM.icon('download-cloud') + ' Respaldar datos</button></div></div>';

    html += '<div class="report-toolbar no-print">' +
      '<div class="toolbar-title">' + HM.icon('printer') + '<div><strong>Tu informe está listo</strong><small>' + HM.state.records.length + ' registros · ' + HM.state.documents.length + ' documentos · ' + HM.state.vitals.length + ' mediciones</small></div></div>' +
      '<div class="toolbar-actions">' +
        '<button type="button" class="btn btn-primary" data-print-report>' + HM.icon('download') + ' Imprimir / Guardar PDF</button>' +
      '</div>' +
    '</div>';

    html += '<div class="report-hint alert-box blue no-print">' + HM.icon('info') + '<div><strong>Cómo guardarlo como PDF:</strong> al imprimir, elige la impresora <strong>“Guardar como PDF”</strong> (o “Microsoft Print to PDF”) y selecciona tamaño A4. Así podrás enviarlo o imprimirlo.</div></div>';

    html += optionsHTML(options);
    html += '<div class="paper-wrap"><div class="report-paper" id="reportPreview">' + preview + '</div></div>';

    return {
      html: html,
      mount: function (root) {
        let current = options;
        async function refresh() {
          const previewEl = root.querySelector('#reportPreview');
          if (!previewEl) return;
          previewEl.innerHTML = await R.build(current);
        }
        root.querySelectorAll('[data-report-section]').forEach(function (input) {
          input.addEventListener('change', function () {
            current[input.dataset.reportSection] = input.checked;
            saveOptions(current);
            refresh();
          });
        });
        const print = async function () {
          const previewEl = root.querySelector('#reportPreview');
          if (!previewEl) return;
          const images = Array.from(previewEl.querySelectorAll('img'));
          HM.toast('Preparando el informe', 'Espera un momento mientras se cargan las imágenes…', 'info', 2500);
          await Promise.all(images.map(function (img) {
            if (img.complete) return Promise.resolve();
            return new Promise(function (resolve) {
              img.onload = resolve;
              img.onerror = resolve;
            });
          }));
          setTimeout(function () { window.print(); }, 180);
        };
        root.querySelectorAll('[data-print-report]').forEach(function (btn) {
          btn.addEventListener('click', print);
        });
      }
    };
  };

  R.print = function () {
    const images = Array.from(document.querySelectorAll('#reportPreview img'));
    Promise.all(images.map(function (img) {
      if (img.complete) return Promise.resolve();
      return new Promise(function (resolve) { img.onload = resolve; img.onerror = resolve; });
    })).then(function () { setTimeout(function () { window.print(); }, 150); });
  };

})();
