/* ============================================================
   SaludEnOrden · Formularios de captura
   ============================================================ */
(function () {
  'use strict';
  const HM = window.HM;
  const F = (HM.forms = {});

  /* ----------------------------- Helpers de campos ----------------------------- */
  function req(label) {
    return HM.escape(label) + ' <span class="req">*</span>';
  }

  function inputField(o) {
    const options = o || {};
    const attrs = [];
    if (options.min != null) attrs.push('min="' + options.min + '"');
    if (options.max != null) attrs.push('max="' + options.max + '"');
    if (options.step != null) attrs.push('step="' + options.step + '"');
    if (options.placeholder) attrs.push('placeholder="' + HM.escape(options.placeholder) + '"');
    if (options.autofocus) attrs.push('autofocus');
    if (options.inputmode) attrs.push('inputmode="' + options.inputmode + '"');
    if (options.maxlength) attrs.push('maxlength="' + options.maxlength + '"');
    if (options.disabled) attrs.push('disabled');
    return '<div class="field' + (options.full ? ' full' : '') + '">' +
      '<label>' + (options.required ? req(options.label || options.name) : HM.escape(options.label || options.name)) + '</label>' +
      '<input class="input" type="' + (options.type || 'text') + '" name="' + options.name + '" value="' + HM.escape(options.value == null ? '' : options.value) + '" ' + attrs.join(' ') + '>' +
      (options.hint ? '<span class="hint">' + HM.escape(options.hint) + '</span>' : '') +
      '</div>';
  }

  function suffixField(o) {
    return '<div class="field' + (o.full ? ' full' : '') + '">' +
      '<label>' + (o.required ? req(o.label) : HM.escape(o.label)) + '</label>' +
      '<div class="input-suffix"><input class="input" type="' + (o.type || 'number') + '" name="' + o.name + '" value="' + HM.escape(o.value == null ? '' : o.value) + '" ' +
      (o.min != null ? 'min="' + o.min + '" ' : '') + (o.max != null ? 'max="' + o.max + '" ' : '') + (o.step != null ? 'step="' + o.step + '" ' : '') + '><span>' + HM.escape(o.suffix) + '</span></div>' +
      (o.hint ? '<span class="hint" id="' + (o.hintId || '') + '">' + HM.escape(o.hint) + '</span>' : '') +
      '</div>';
  }

  function selectField(o) {
    const options = (o.options || []).map(function (opt) {
      const value = typeof opt === 'string' ? opt : opt.value;
      const label = typeof opt === 'string' ? opt : opt.label;
      const selected = String(value) === String(o.value == null ? '' : o.value) ? ' selected' : '';
      return '<option value="' + HM.escape(value) + '"' + selected + '>' + HM.escape(label) + '</option>';
    }).join('');
    return '<div class="field' + (o.full ? ' full' : '') + '">' +
      '<label>' + (o.required ? req(o.label) : HM.escape(o.label)) + '</label>' +
      '<select class="select" name="' + o.name + '">' + options + '</select>' +
      (o.hint ? '<span class="hint">' + HM.escape(o.hint) + '</span>' : '') +
      '</div>';
  }

  function textareaField(o) {
    return '<div class="field' + (o.full ? ' full' : '') + '">' +
      '<label>' + (o.required ? req(o.label) : HM.escape(o.label)) + '</label>' +
      '<textarea class="textarea" name="' + o.name + '" ' + (o.rows ? 'rows="' + o.rows + '"' : '') + ' placeholder="' + HM.escape(o.placeholder || '') + '">' + HM.escape(o.value == null ? '' : o.value) + '</textarea>' +
      (o.hint ? '<span class="hint">' + HM.escape(o.hint) + '</span>' : '') +
      '</div>';
  }

  function pickerHTML(types, active, labelKey, dataAttr) {
    return '<div class="type-picker">' + Object.keys(types).map(function (key) {
      const meta = types[key];
      return '<button type="button" class="type-pick' + (key === active ? ' active' : '') + '" data-' + (dataAttr || 'type') + '="' + key + '">' +
        HM.icon(meta.icon) + '<span>' + HM.escape(meta[labelKey || 'label']) + '</span></button>';
    }).join('') + '</div>';
  }

  function footer(saveLabel) {
    return '<button type="button" class="btn btn-outline" data-modal-close>Cancelar</button>' +
      '<button type="submit" class="btn btn-primary" form="entityForm">' + HM.icon('check') + ' ' + HM.escape(saveLabel || 'Guardar') + '</button>';
  }

  function onFormSubmit(root, handler) {
    const form = root.querySelector('#entityForm');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const button = root.querySelector('button[form="entityForm"][type="submit"]');
      const original = button ? button.innerHTML : '';
      if (button) {
        button.disabled = true;
        button.innerHTML = 'Guardando…';
      }
      try {
        await handler(form, root);
      } catch (err) {
        console.error(err);
        HM.toast('No se pudo guardar', err.message || 'Intenta de nuevo.', 'error', 6000);
      } finally {
        if (button && document.body.contains(button)) {
          button.disabled = false;
          button.innerHTML = original;
        }
      }
    });
  }

  function val(form, name) {
    const el = form.elements[name];
    if (!el) return '';
    return String(el.value == null ? '' : el.value).trim();
  }

  function numberVal(form, name) {
    const raw = val(form, name).replace(',', '.');
    if (raw === '') return null;
    const n = Number(raw);
    return isFinite(n) ? n : null;
  }

  function fail(message, field, form) {
    HM.toast('Revisa el formulario', message, 'warn', 5000);
    const el = typeof field === 'string' ? (form && form.elements[field]) : field;
    if (el && typeof el.focus === 'function') {
      try { el.focus(); } catch (e) { /* noop */ }
    } else if (el && el[0] && typeof el[0].focus === 'function') {
      try { el[0].focus(); } catch (e) { /* noop */ }
    }
  }

  function closeAndRefresh(message, detail) {
    HM.modal.close();
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    HM.toast(message, detail || '', 'success');
  }

  function collectRows(listSelector, root) {
    return HM.$$(listSelector + ' .repeat-row', root).map(function (row) {
      const obj = { id: row.dataset.id || HM.uid() };
      HM.$$('[data-field]', row).forEach(function (el) {
        obj[el.dataset.field] = String(el.value || '').trim();
      });
      return obj;
    }).filter(function (obj) {
      return Object.keys(obj).some(function (key) { return key !== 'id' && obj[key]; });
    });
  }

  function setTypePicker(root, attr, hiddenName, callback) {
    const hidden = root.querySelector('input[name="' + hiddenName + '"]');
    const dataKey = attr.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
    root.querySelectorAll('[data-' + attr + ']').forEach(function (btn) {
      btn.addEventListener('click', function () {
        root.querySelectorAll('[data-' + attr + ']').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        hidden.value = btn.dataset[dataKey];
        if (callback) callback(btn.dataset[dataKey]);
      });
    });
  }

  /* ----------------------------- Gestor de adjuntos ----------------------------- */
  function attachmentHTML() {
    return '<div class="file-drop" data-attach-drop tabindex="0" role="button" aria-label="Adjuntar archivos">' +
      HM.icon('upload') +
      '<p><strong>Haz clic</strong> o arrastra tus archivos aquí</p>' +
      '<p>Capturas, recetas, estudios · máximo 30 MB por archivo</p>' +
      '<input type="file" data-attach-input multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv">' +
      '</div>' +
      '<div class="attachment-list mt-2" data-attach-list></div>';
  }

  function setupAttachments(root, existingIds) {
    const drop = root.querySelector('[data-attach-drop]');
    const input = root.querySelector('[data-attach-input]');
    const list = root.querySelector('[data-attach-list]');
    const state = {
      existing: (existingIds || []).slice(),
      added: [],
      removed: []
    };

    async function render() {
      const items = [];
      for (const id of state.existing) {
        const file = await HM.files.get(id);
        if (file) items.push({ kind: 'existing', id: id, name: file.name, size: file.size });
      }
      state.added.forEach(function (file, index) {
        items.push({ kind: 'new', id: index, name: file.name, size: file.size });
      });
      if (!items.length) {
        list.innerHTML = '<p class="muted tiny">Sin archivos adjuntos.</p>';
        return;
      }
      list.innerHTML = items.map(function (item) {
        return '<div class="attachment">' +
          '<span class="file-ic">' + HM.icon(HM.isImage(null, item.name) ? 'image' : HM.isPdf(null, item.name) ? 'file-text' : 'file') + '</span>' +
          '<div class="grow"><strong>' + HM.escape(item.name) + '</strong><small>' + HM.formatBytes(item.size) + '</small></div>' +
          '<div class="attachment-actions"><button type="button" class="icon-btn" data-remove-attach="' + item.kind + ':' + item.id + '" aria-label="Quitar archivo">' + HM.icon('x') + '</button></div>' +
          '</div>';
      }).join('');
    }

    function addFiles(fileList) {
      const incoming = Array.from(fileList || []);
      for (const file of incoming) {
        if (file.size > HM.files.MAX_FILE) {
          HM.toast('Archivo demasiado grande', '"' + file.name + '" supera los 30 MB.', 'warn', 5000);
          continue;
        }
        state.added.push(file);
      }
      render();
    }

    drop.addEventListener('click', function (e) {
      if (e.target === input) return;
      input.click();
    });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('dragover'); });
    });
    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });
    list.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-remove-attach]');
      if (!btn) return;
      const parts = btn.dataset.removeAttach.split(':');
      const kind = parts[0];
      const id = parts[1];
      if (kind === 'existing') {
        state.removed.push(id);
        state.existing = state.existing.filter(function (x) { return x !== id; });
      } else {
        state.added.splice(Number(id), 1);
      }
      render();
    });

    render();

    return {
      async finalize() {
        const saved = await HM.files.saveAll(state.added);
        return {
          fileIds: state.existing.concat(saved.map(function (f) { return f.id; })),
          async cleanup() {
            for (const id of state.removed) {
              await HM.files.remove(id);
            }
          }
        };
      }
    };
  }

  /* ----------------------------- Perfil ----------------------------- */
  function contactRow(c) {
    const contact = c || {};
    return '<div class="repeat-row" data-id="' + HM.escape(contact.id || HM.uid()) + '">' +
      '<button type="button" class="repeat-remove" aria-label="Eliminar contacto">' + HM.icon('x') + '</button>' +
      '<div class="repeat-grid">' +
        '<div class="field"><label>Nombre completo</label><input class="input" data-field="name" value="' + HM.escape(contact.name || '') + '" placeholder="Nombre"></div>' +
        '<div class="field"><label>Parentesco</label><select class="select" data-field="relationship">' + HM.relations.map(function (r) { return '<option' + (r === contact.relationship ? ' selected' : '') + '>' + HM.escape(r) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Teléfono</label><input class="input" type="tel" data-field="phone" value="' + HM.escape(contact.phone || '') + '" placeholder="55 0000 0000"></div>' +
        '<div class="field"><label>Correo</label><input class="input" type="email" data-field="email" value="' + HM.escape(contact.email || '') + '" placeholder="opcional"></div>' +
        '<div class="field full"><label>Notas</label><input class="input" data-field="notes" value="' + HM.escape(contact.notes || '') + '" placeholder="Disponibilidad, idioma, etc."></div>' +
      '</div></div>';
  }

  function allergyRow(a) {
    const allergy = a || {};
    return '<div class="repeat-row" data-id="' + HM.escape(allergy.id || HM.uid()) + '">' +
      '<button type="button" class="repeat-remove" aria-label="Eliminar alergia">' + HM.icon('x') + '</button>' +
      '<div class="repeat-grid">' +
        '<div class="field"><label>Sustancia o medicamento</label><input class="input" data-field="substance" value="' + HM.escape(allergy.substance || '') + '" placeholder="Ej. Penicilina"></div>' +
        '<div class="field"><label>Gravedad</label><select class="select" data-field="severity">' + HM.allergySeverities.map(function (s) { return '<option' + (s === allergy.severity ? ' selected' : '') + '>' + HM.escape(s) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field full"><label>Reacción</label><input class="input" data-field="reaction" value="' + HM.escape(allergy.reaction || '') + '" placeholder="Ej. Urticaria, dificultad para respirar"></div>' +
        '<div class="field full"><label>Notas</label><input class="input" data-field="notes" value="' + HM.escape(allergy.notes || '') + '" placeholder="Indicaciones o precauciones"></div>' +
      '</div></div>';
  }

  function conditionRow(c) {
    const item = c || {};
    return '<div class="repeat-row" data-id="' + HM.escape(item.id || HM.uid()) + '">' +
      '<button type="button" class="repeat-remove" aria-label="Eliminar condición">' + HM.icon('x') + '</button>' +
      '<div class="repeat-grid">' +
        '<div class="field"><label>Condición o diagnóstico</label><input class="input" data-field="name" value="' + HM.escape(item.name || '') + '" placeholder="Ej. Hipertensión"></div>' +
        '<div class="field"><label>Desde / año</label><input class="input" data-field="since" value="' + HM.escape(item.since || '') + '" placeholder="Ej. 2019"></div>' +
        '<div class="field full"><label>Notas</label><input class="input" data-field="notes" value="' + HM.escape(item.notes || '') + '" placeholder="Tratamiento, control, etc."></div>' +
      '</div></div>';
  }

  function familyRow(f) {
    const item = f || {};
    return '<div class="repeat-row" data-id="' + HM.escape(item.id || HM.uid()) + '">' +
      '<button type="button" class="repeat-remove" aria-label="Eliminar antecedente">' + HM.icon('x') + '</button>' +
      '<div class="repeat-grid">' +
        '<div class="field"><label>Familiar</label><select class="select" data-field="relative">' + HM.relations.map(function (r) { return '<option' + (r === item.relative ? ' selected' : '') + '>' + HM.escape(r) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Condición</label><input class="input" data-field="condition" value="' + HM.escape(item.condition || '') + '" placeholder="Ej. Diabetes tipo 2"></div>' +
        '<div class="field full"><label>Notas</label><input class="input" data-field="notes" value="' + HM.escape(item.notes || '') + '" placeholder="Edad de diagnóstico, etc."></div>' +
      '</div></div>';
  }

  F.profile = function () {
    const p = HM.state.profile || {};
    const contacts = p.emergencyContacts && p.emergencyContacts.length ? p.emergencyContacts : [{}];
    const allergies = p.allergies && p.allergies.length ? p.allergies : [{}];
    const conditions = p.conditions || [];
    const family = p.familyHistory || [];

    const body =
      '<form id="entityForm" novalidate autocomplete="off">' +
        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('user') + ' Datos personales</div>' +
          '<div class="form-grid">' +
            inputField({ name: 'firstName', label: 'Nombre(s)', value: p.firstName, required: true, placeholder: 'Tu nombre' }) +
            inputField({ name: 'lastName', label: 'Apellidos', value: p.lastName, placeholder: 'Tus apellidos' }) +
            inputField({ name: 'birthDate', label: 'Fecha de nacimiento', type: 'date', value: p.birthDate }) +
            selectField({ name: 'sex', label: 'Sexo', value: p.sex || '', options: [{ value: '', label: 'Seleccionar…' }, 'Femenino', 'Masculino', 'Otro', 'Prefiero no decir'] }) +
            selectField({ name: 'bloodType', label: 'Grupo sanguíneo', value: p.bloodType || '', options: [{ value: '', label: 'Seleccionar…' }].concat(HM.bloodTypes) }) +
            inputField({ name: 'height', label: 'Estatura', type: 'number', value: p.height, placeholder: 'Ej. 165', min: 40, max: 260, step: '0.1' }) +
            inputField({ name: 'phone', label: 'Teléfono personal', type: 'tel', value: p.phone, placeholder: '55 0000 0000' }) +
            inputField({ name: 'email', label: 'Correo electrónico', type: 'email', value: p.email, placeholder: 'correo@ejemplo.com' }) +
            inputField({ name: 'address', label: 'Dirección particular', value: p.address, placeholder: 'Calle, número, colonia', full: true }) +
            inputField({ name: 'city', label: 'Ciudad / Estado', value: p.city, placeholder: 'Ciudad de México' }) +
            inputField({ name: 'documentId', label: 'Identificación oficial', value: p.documentId, placeholder: 'INE, CURP o pasaporte' }) +
            inputField({ name: 'insurance', label: 'Aseguradora / servicio médico', value: p.insurance, placeholder: 'IMSS, ISSSTE, GNP…' }) +
            inputField({ name: 'policyNumber', label: 'Número de póliza o afiliación', value: p.policyNumber, placeholder: 'Opcional' }) +
          '</div>' +
        '</div>' +

        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('phone') + ' Contactos de emergencia</div>' +
          '<div class="repeat-list" data-list="contacts">' + contacts.map(contactRow).join('') + '</div>' +
          '<button type="button" class="add-row-btn mt-2" data-add-contacts>' + HM.icon('plus') + ' Agregar contacto</button>' +
        '</div>' +

        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('alert-triangle') + ' Alergias</div>' +
          '<div class="repeat-list" data-list="allergies">' + allergies.map(allergyRow).join('') + '</div>' +
          '<button type="button" class="add-row-btn mt-2" data-add-allergies>' + HM.icon('plus') + ' Agregar alergia</button>' +
        '</div>' +

        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('clipboard') + ' Condiciones y antecedentes personales</div>' +
          '<div class="repeat-list" data-list="conditions">' + conditions.map(conditionRow).join('') + '</div>' +
          '<button type="button" class="add-row-btn mt-2" data-add-conditions>' + HM.icon('plus') + ' Agregar condición</button>' +
        '</div>' +

        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('heart') + ' Antecedentes familiares</div>' +
          '<div class="repeat-list" data-list="family">' + family.map(familyRow).join('') + '</div>' +
          '<button type="button" class="add-row-btn mt-2" data-add-family>' + HM.icon('plus') + ' Agregar antecedente</button>' +
        '</div>' +

        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('file-text') + ' Notas médicas</div>' +
          textareaField({ name: 'notes', label: 'Información relevante', value: p.notes, placeholder: 'Alergias, indicaciones especiales, observaciones…', full: true, rows: 4 }) +
        '</div>' +
      '</form>';

    const root = HM.modal.open({
      title: p.firstName ? 'Editar mi perfil' : 'Completar mi perfil',
      subtitle: 'Esta información aparecerá en tu informe médico y en casos de emergencia.',
      icon: 'user',
      size: 'wide',
      body: body,
      footer: footer('Guardar perfil'),
      onMount: function (root) {
        const lists = root.querySelector('#entityForm');
        const rows = {
          contacts: contactRow,
          allergies: allergyRow,
          conditions: conditionRow,
          family: familyRow
        };
        Object.keys(rows).forEach(function (key) {
          const btn = root.querySelector('[data-add-' + key + ']');
          const list = root.querySelector('[data-list="' + key + '"]');
          btn.addEventListener('click', function () {
            list.insertAdjacentHTML('beforeend', rows[key]());
            const last = list.lastElementChild;
            const firstInput = last && last.querySelector('input, select');
            if (firstInput) firstInput.focus();
          });
        });
        root.querySelector('#entityForm').addEventListener('click', function (e) {
          const btn = e.target.closest('.repeat-remove');
          if (btn) btn.closest('.repeat-row').remove();
        });

        onFormSubmit(root, async function (form) {
          if (!val(form, 'firstName')) return fail('Escribe al menos tu nombre.', 'firstName', form);
          const profile = {
            id: 'profile',
            firstName: val(form, 'firstName'),
            lastName: val(form, 'lastName'),
            birthDate: val(form, 'birthDate'),
            sex: val(form, 'sex'),
            bloodType: val(form, 'bloodType'),
            height: numberVal(form, 'height'),
            phone: val(form, 'phone'),
            email: val(form, 'email'),
            address: val(form, 'address'),
            city: val(form, 'city'),
            documentId: val(form, 'documentId'),
            insurance: val(form, 'insurance'),
            policyNumber: val(form, 'policyNumber'),
            emergencyContacts: collectRows('[data-list="contacts"]', root),
            allergies: collectRows('[data-list="allergies"]', root).map(function (a) {
              a.severity = a.severity || 'Leve';
              return a;
            }),
            conditions: collectRows('[data-list="conditions"]', root),
            familyHistory: collectRows('[data-list="family"]', root),
            notes: val(form, 'notes'),
            createdAt: (HM.state.profile && HM.state.profile.createdAt) || HM.nowISO(),
            updatedAt: HM.nowISO()
          };
          await HM.db.put('profile', profile);
          closeAndRefresh('Perfil guardado', 'Tu información personal quedó actualizada.');
        });
      }
    });
    return root;
  };

  /* ----------------------------- Signos vitales ----------------------------- */
  F.vital = function (existing) {
    const v = existing || {};
    const type = v.type || 'presion';
    const values = v.values || {};

    const panels = {
      presion: '<div class="form-grid">' +
        inputField({ name: 'systolic', label: 'Sistólica', type: 'number', value: values.systolic, placeholder: '120', min: 50, max: 300, required: true, hint: 'Número superior' }) +
        inputField({ name: 'diastolic', label: 'Diastólica', type: 'number', value: values.diastolic, placeholder: '80', min: 30, max: 200, required: true, hint: 'Número inferior' }) +
        inputField({ name: 'pulse', label: 'Pulso (opcional)', type: 'number', value: values.pulse, placeholder: '70', min: 20, max: 250 }) +
        '</div>',
      glucosa: '<div class="form-grid">' +
        suffixField({ name: 'value', label: 'Glucosa', value: values.value, suffix: 'mg/dL', type: 'number', min: 20, max: 800, step: '0.1', required: true }) +
        selectField({ name: 'context', label: 'Momento de la medición', value: values.context || 'En ayunas', options: ['En ayunas', 'Antes de comer', 'Después de comer', 'Antes de dormir', 'Aleatoria'] }) +
        '</div>',
      peso: '<div class="form-grid">' +
        suffixField({ name: 'value', label: 'Peso', value: values.value, suffix: 'kg', type: 'number', min: 2, max: 500, step: '0.1', required: true, hint: ' ', hintId: 'bmiHint' }) +
        '</div>',
      temperatura: '<div class="form-grid">' +
        suffixField({ name: 'value', label: 'Temperatura', value: values.value, suffix: '°C', type: 'number', min: 30, max: 45, step: '0.1', required: true }) +
        selectField({ name: 'method', label: 'Método (opcional)', value: values.method || '', options: [{ value: '', label: 'No especificado' }, 'Oral', 'Axilar', 'Rectal', 'Ótica', 'Frontal'] }) +
        '</div>',
      pulso: '<div class="form-grid">' +
        suffixField({ name: 'value', label: 'Frecuencia cardíaca', value: values.value, suffix: 'lpm', type: 'number', min: 20, max: 250, required: true }) +
        '</div>',
      oxigeno: '<div class="form-grid">' +
        suffixField({ name: 'value', label: 'Saturación de oxígeno', value: values.value, suffix: '%', type: 'number', min: 50, max: 100, required: true }) +
        '</div>',
      sintoma: '<div class="form-grid">' +
        inputField({ name: 'description', label: 'Describe el síntoma', value: values.description, placeholder: 'Ej. Dolor de cabeza pulsátil', required: true, full: true }) +
        '<div class="field"><label>Intensidad <span class="req">*</span></label><div class="range-row"><input type="range" name="intensity" min="1" max="10" value="' + HM.escape(values.intensity || 5) + '" id="intensityRange"><span class="range-value" id="intensityValue">' + HM.escape(values.intensity || 5) + '</span></div><span class="hint">1 = muy leve · 10 = insoportable</span></div>' +
        inputField({ name: 'duration', label: 'Duración', value: values.duration, placeholder: 'Ej. 4 horas' }) +
        '</div>'
    };

    const body =
      '<form id="entityForm" novalidate autocomplete="off">' +
        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('activity') + ' ¿Qué deseas registrar?</div>' +
          pickerHTML(HM.vitalTypes, type, 'short', 'vital-type') +
          '<input type="hidden" name="type" value="' + type + '">' +
        '</div>' +
        '<div class="form-section">' +
          '<div class="form-grid">' +
            inputField({ name: 'date', label: 'Fecha y hora', type: 'datetime-local', value: HM.toDateTimeInput(v.date || new Date()), required: true }) +
          '</div>' +
        '</div>' +
        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('gauge') + ' Medición</div>' +
          Object.keys(panels).map(function (key) {
            return '<div class="vital-panel' + (key === type ? '' : ' hidden') + '" data-panel="' + key + '">' + panels[key] + '</div>';
          }).join('') +
        '</div>' +
        '<div class="form-section">' +
          textareaField({ name: 'note', label: 'Nota u observación', value: v.note, placeholder: 'Ej. Tomado después de caminar, en ayunas, con síntomas…', full: true, rows: 3 }) +
        '</div>' +
      '</form>';

    const root = HM.modal.open({
      title: existing ? 'Editar signo vital' : 'Registrar signo vital',
      subtitle: 'Lleva un seguimiento sencillo de tu salud día a día.',
      icon: 'activity',
      body: body,
      footer: footer(existing ? 'Guardar cambios' : 'Guardar registro'),
      onMount: function (root) {
        const form = root.querySelector('#entityForm');
        const hidden = form.querySelector('input[name="type"]');
        root.querySelectorAll('[data-vital-type]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            root.querySelectorAll('[data-vital-type]').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            hidden.value = btn.dataset.vitalType;
            root.querySelectorAll('.vital-panel').forEach(function (panel) {
              panel.classList.toggle('hidden', panel.dataset.panel !== hidden.value);
            });
          });
        });

        const intensity = root.querySelector('#intensityRange');
        if (intensity) {
          intensity.addEventListener('input', function () {
            root.querySelector('#intensityValue').textContent = intensity.value;
          });
        }

        const weightInput = root.querySelector('.vital-panel[data-panel="peso"] input[name="value"]');
        const bmiHint = root.querySelector('#bmiHint');
        function updateBMI() {
          if (!bmiHint || hidden.value !== 'peso') return;
          const height = HM.state.profile && HM.state.profile.height;
          const weight = Number(weightInput && weightInput.value);
          if (height && weight) {
            const bmi = HM.computeBMI(weight, height);
            bmiHint.textContent = 'IMC calculado: ' + HM.num(bmi, 1) + ' · ' + HM.bmiLabel(bmi);
          } else {
            bmiHint.textContent = 'Agrega tu estatura en el perfil para calcular el IMC.';
          }
        }
        if (weightInput) weightInput.addEventListener('input', updateBMI);
        updateBMI();

        onFormSubmit(root, async function () {
          const selected = hidden.value;
          const date = val(form, 'date');
          const panel = form.querySelector('.vital-panel[data-panel="' + selected + '"]');
          const fieldEl = function (name) { return panel ? panel.querySelector('[name="' + name + '"]') : null; };
          const panelVal = function (name) {
            const el = fieldEl(name);
            return el ? String(el.value == null ? '' : el.value).trim() : '';
          };
          const panelNumber = function (name) {
            const raw = panelVal(name).replace(',', '.');
            if (raw === '') return null;
            const n = Number(raw);
            return isFinite(n) ? n : null;
          };
          if (!date) return fail('Indica la fecha y hora de la medición.', 'date', form);
          const out = { id: (existing && existing.id) || HM.uid(), type: selected, date: HM.parseDate(date).toISOString(), values: {}, note: val(form, 'note'), createdAt: (existing && existing.createdAt) || HM.nowISO() };

          if (selected === 'presion') {
            const sys = panelNumber('systolic');
            const dia = panelNumber('diastolic');
            const pulse = panelNumber('pulse');
            if (sys == null || dia == null) return fail('Escribe la presión sistólica y diastólica.', fieldEl('systolic'), form);
            if (sys < 50 || sys > 300 || dia < 30 || dia > 200) return fail('La presión debe estar entre 50–300 / 30–200 mmHg.', fieldEl('systolic'), form);
            if (sys <= dia) return fail('La presión sistólica debe ser mayor que la diastólica.', fieldEl('systolic'), form);
            out.values = { systolic: sys, diastolic: dia };
            if (pulse != null) out.values.pulse = pulse;
          } else if (selected === 'sintoma') {
            if (!panelVal('description')) return fail('Describe el síntoma que presentaste.', fieldEl('description'), form);
            out.values = { description: panelVal('description'), intensity: Number(panelVal('intensity') || 5), duration: panelVal('duration') };
          } else {
            const value = panelNumber('value');
            const ranges = {
              glucosa: [20, 800, 'La glucosa debe estar entre 20 y 800 mg/dL.'],
              peso: [2, 500, 'El peso debe estar entre 2 y 500 kg.'],
              temperatura: [30, 45, 'La temperatura debe estar entre 30 y 45 °C.'],
              pulso: [20, 250, 'El pulso debe estar entre 20 y 250 lpm.'],
              oxigeno: [50, 100, 'La saturación debe estar entre 50 y 100 %.']
            };
            if (value == null) return fail('Escribe el valor de la medición.', fieldEl('value'), form);
            const range = ranges[selected] || [0, 10000, 'Valor fuera de rango.'];
            if (value < range[0] || value > range[1]) return fail(range[2], fieldEl('value'), form);
            out.values.value = value;
            if (selected === 'glucosa') out.values.context = panelVal('context');
            if (selected === 'temperatura') out.values.method = panelVal('method');
          }

          await HM.db.put('vitals', out);
          closeAndRefresh(existing ? 'Medición actualizada' : 'Signo vital registrado', 'Tu seguimiento diario está al día.');
        });
      }
    });
    return root;
  };

  /* ----------------------------- Historial clínico ----------------------------- */
  F.record = function (existing) {
    const r = existing || {};
    const type = r.type || 'consulta';
    const providers = HM.state.providers.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });

    const body =
      '<form id="entityForm" novalidate autocomplete="off">' +
        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('file-text') + ' Tipo de registro</div>' +
          pickerHTML(HM.recordTypes, type, 'label', 'record-type') +
          '<input type="hidden" name="type" value="' + type + '">' +
        '</div>' +
        '<div class="form-section">' +
          '<div class="form-grid">' +
            inputField({ name: 'title', label: 'Título del registro', value: r.title, required: true, placeholder: 'Ej. Consulta de medicina general', full: true }) +
            inputField({ name: 'date', label: 'Fecha', type: 'date', value: r.date || HM.todayISO(), required: true }) +
            selectField({ name: 'providerId', label: 'Médico, clínica u hospital', value: r.providerId || '', options: [{ value: '', label: 'Sin institución / no aplica' }].concat(providers.map(function (p) { return { value: p.id, label: p.name + (p.specialty ? ' · ' + p.specialty : '') }; })) }) +
            inputField({ name: 'doctor', label: 'Médico tratante', value: r.doctor, placeholder: 'Nombre del médico' }) +
            inputField({ name: 'specialty', label: 'Especialidad', value: r.specialty, placeholder: 'Ej. Medicina general' }) +
            '<div class="form-grid full hidden" id="vaccineFields" style="grid-template-columns:1fr 1fr;gap:14px">' +
              inputField({ name: 'vaccineDose', label: 'Dosis aplicada', value: r.vaccineDose, placeholder: 'Ej. 0.5 ml · IM' }) +
              inputField({ name: 'nextDose', label: 'Próxima dosis', type: 'date', value: r.nextDose }) +
            '</div>' +
            textareaField({ name: 'diagnosis', label: 'Diagnóstico o resultados', value: r.diagnosis, placeholder: 'Diagnóstico, hallazgos o resultados del estudio', full: true, rows: 3 }) +
            textareaField({ name: 'treatment', label: 'Tratamiento o indicaciones', value: r.treatment, placeholder: 'Medicamentos, dosis, recomendaciones…', full: true, rows: 3 }) +
            textareaField({ name: 'notes', label: 'Notas y observaciones', value: r.notes, placeholder: 'Detalles adicionales que quieras conservar', full: true, rows: 3 }) +
          '</div>' +
        '</div>' +
        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('paperclip') + ' Archivos adjuntos</div>' +
          attachmentHTML() +
        '</div>' +
      '</form>';

    const root = HM.modal.open({
      title: existing ? 'Editar registro clínico' : 'Nuevo registro clínico',
      subtitle: 'Consultas, diagnósticos, cirugías, estudios, vacunas y más.',
      icon: 'file-text',
      size: 'wide',
      body: body,
      footer: footer(existing ? 'Guardar cambios' : 'Guardar registro'),
      onMount: function (root) {
        const form = root.querySelector('#entityForm');
        const attach = setupAttachments(root, r.fileIds || []);
        function syncVaccine() {
          root.querySelector('#vaccineFields').classList.toggle('hidden', form.elements['type'].value !== 'vacuna');
        }
        setTypePicker(root, 'record-type', 'type', syncVaccine);
        syncVaccine();

        onFormSubmit(root, async function () {
          if (!val(form, 'title')) return fail('Escribe un título para el registro.', 'title', form);
          if (!val(form, 'date')) return fail('Selecciona la fecha del registro.', 'date', form);
          const attachments = await attach.finalize();
          const record = {
            id: (existing && existing.id) || HM.uid(),
            type: val(form, 'type'),
            date: val(form, 'date'),
            title: val(form, 'title'),
            providerId: val(form, 'providerId'),
            doctor: val(form, 'doctor'),
            specialty: val(form, 'specialty'),
            diagnosis: val(form, 'diagnosis'),
            treatment: val(form, 'treatment'),
            notes: val(form, 'notes'),
            vaccineDose: val(form, 'vaccineDose'),
            nextDose: val(form, 'nextDose'),
            fileIds: attachments.fileIds,
            createdAt: (existing && existing.createdAt) || HM.nowISO(),
            updatedAt: HM.nowISO()
          };
          await HM.db.put('records', record);
          await attachments.cleanup();
          closeAndRefresh(existing ? 'Registro actualizado' : 'Registro agregado al historial', 'La información quedó guardada.');
        });
      }
    });
    return root;
  };

  /* ----------------------------- Tratamientos ----------------------------- */
  F.treatment = function (existing) {
    const t = existing || {};
    const times = (t.times && t.times.length ? t.times : ['08:00']).slice();
    const providers = HM.state.providers.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });

    const timesHTML = function (time) {
      return '<div class="repeat-row" style="padding:8px 40px 8px 8px">' +
        '<input class="input" type="time" name="treatmentTime" value="' + HM.escape(time || '08:00') + '">' +
        '<button type="button" class="repeat-remove" aria-label="Quitar horario">' + HM.icon('x') + '</button>' +
        '</div>';
    };

    const body =
      '<form id="entityForm" novalidate autocomplete="off">' +
        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('pill') + ' Medicamento</div>' +
          '<div class="form-grid">' +
            inputField({ name: 'name', label: 'Nombre del medicamento', value: t.name, required: true, placeholder: 'Ej. Vitamina D3' }) +
            inputField({ name: 'dose', label: 'Dosis', value: t.dose, required: true, placeholder: 'Ej. 1000 UI · 1 cápsula' }) +
            selectField({ name: 'form', label: 'Presentación', value: t.form || 'Tableta', options: HM.medicationForms }) +
            inputField({ name: 'frequency', label: 'Frecuencia', value: t.frequency || 'Una vez al día', placeholder: 'Ej. Cada 8 horas' }) +
            inputField({ name: 'startDate', label: 'Inicio del tratamiento', type: 'date', value: t.startDate || HM.todayISO(), required: true }) +
            inputField({ name: 'endDate', label: 'Fin del tratamiento', type: 'date', value: t.endDate, hint: 'Déjalo vacío si es indefinido.' }) +
            inputField({ name: 'prescriber', label: 'Médico que lo prescribe', value: t.prescriber, placeholder: 'Nombre del médico' }) +
            inputField({ name: 'reason', label: 'Motivo / diagnóstico', value: t.reason, placeholder: 'Ej. Déficit de vitamina D' }) +
          '</div>' +
        '</div>' +
        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('clock') + ' Horarios de toma</div>' +
          '<div class="repeat-list" id="timesList">' + times.map(timesHTML).join('') + '</div>' +
          '<button type="button" class="add-row-btn mt-2" id="addTime">' + HM.icon('plus') + ' Agregar horario</button>' +
          '<p class="form-note mt-1">Estos horarios alimentan los recordatorios de toma del día.</p>' +
        '</div>' +
        '<div class="form-section">' +
          '<div class="form-grid">' +
            textareaField({ name: 'instructions', label: 'Indicaciones', value: t.instructions, placeholder: 'Cómo tomarlo, con o sin alimentos, precauciones…', full: true, rows: 3 }) +
            '<div class="field full"><label class="switch"><input type="checkbox" name="active" ' + (t.active === false ? '' : 'checked') + '><span class="switch-track"></span><span>Tratamiento activo (mostrar recordatorios)</span></label></div>' +
          '</div>' +
        '</div>' +
        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('paperclip') + ' Receta o indicaciones médicas</div>' +
          attachmentHTML() +
        '</div>' +
      '</form>';

    const root = HM.modal.open({
      title: existing ? 'Editar tratamiento' : 'Nuevo tratamiento',
      subtitle: 'Guarda dosis, horarios y recetas para no perder ninguna toma.',
      icon: 'pill',
      size: 'wide',
      body: body,
      footer: footer(existing ? 'Guardar cambios' : 'Guardar tratamiento'),
      onMount: function (root) {
        const form = root.querySelector('#entityForm');
        const timesList = root.querySelector('#timesList');
        const attach = setupAttachments(root, t.fileIds || []);
        root.querySelector('#addTime').addEventListener('click', function () {
          timesList.insertAdjacentHTML('beforeend', timesHTML('09:00'));
          const last = timesList.lastElementChild;
          const input = last && last.querySelector('input');
          if (input) input.focus();
        });
        timesList.addEventListener('click', function (e) {
          const btn = e.target.closest('.repeat-remove');
          if (btn) btn.closest('.repeat-row').remove();
        });

        onFormSubmit(root, async function () {
          if (!val(form, 'name')) return fail('Escribe el nombre del medicamento.', 'name', form);
          if (!val(form, 'dose')) return fail('Indica la dosis (por ejemplo, 500 mg).', 'dose', form);
          if (!val(form, 'startDate')) return fail('Selecciona la fecha de inicio.', 'startDate', form);
          const start = val(form, 'startDate');
          const end = val(form, 'endDate');
          if (end && end < start) return fail('La fecha de fin no puede ser anterior al inicio.', 'endDate', form);
          const timeValues = HM.$$('input[name="treatmentTime"]', timesList).map(function (el) { return el.value; }).filter(Boolean);
          if (!timeValues.length) return fail('Agrega al menos un horario de toma.', null, form);
          const uniqueTimes = Array.from(new Set(timeValues)).sort();
          const attachments = await attach.finalize();
          const treatment = {
            id: (existing && existing.id) || HM.uid(),
            name: val(form, 'name'),
            dose: val(form, 'dose'),
            form: val(form, 'form'),
            frequency: val(form, 'frequency'),
            times: uniqueTimes,
            startDate: start,
            endDate: end,
            active: form.elements['active'].checked,
            prescriber: val(form, 'prescriber'),
            reason: val(form, 'reason'),
            instructions: val(form, 'instructions'),
            fileIds: attachments.fileIds,
            createdAt: (existing && existing.createdAt) || HM.nowISO(),
            updatedAt: HM.nowISO()
          };
          await HM.db.put('treatments', treatment);
          await attachments.cleanup();
          closeAndRefresh(existing ? 'Tratamiento actualizado' : 'Tratamiento guardado', 'Los recordatorios de toma quedaron configurados.');
        });
      }
    });
    return root;
  };

  /* ----------------------------- Citas ----------------------------- */
  F.appointment = function (existing) {
    const a = existing || {};
    const providers = HM.state.providers.slice().sort(function (x, y) { return x.name.localeCompare(y.name); });
    const reminderOptions = [
      { value: '0', label: 'Sin recordatorio' },
      { value: '30', label: '30 minutos antes' },
      { value: '60', label: '1 hora antes' },
      { value: '180', label: '3 horas antes' },
      { value: '1440', label: '1 día antes' },
      { value: '2880', label: '2 días antes' },
      { value: '10080', label: '1 semana antes' }
    ];

    const body =
      '<form id="entityForm" novalidate autocomplete="off">' +
        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('calendar') + ' Datos de la cita</div>' +
          '<div class="form-grid">' +
            inputField({ name: 'dateTime', label: 'Fecha y hora', type: 'datetime-local', value: HM.toDateTimeInput(a.dateTime || HM.addDays(new Date(), 1)), required: true }) +
            inputField({ name: 'title', label: 'Motivo de la cita', value: a.title, required: true, placeholder: 'Ej. Control de cardiología' }) +
            inputField({ name: 'specialty', label: 'Especialidad', value: a.specialty, placeholder: 'Ej. Cardiología' }) +
            selectField({ name: 'providerId', label: 'Médico, clínica u hospital', value: a.providerId || '', options: [{ value: '', label: 'Sin institución / no aplica' }].concat(providers.map(function (p) { return { value: p.id, label: p.name + (p.specialty ? ' · ' + p.specialty : '') }; })) }) +
            inputField({ name: 'doctor', label: 'Médico', value: a.doctor, placeholder: 'Nombre del médico' }) +
            inputField({ name: 'location', label: 'Lugar', value: a.location, placeholder: 'Dirección o consultorio' }) +
            inputField({ name: 'reason', label: 'Motivo / notas previas', value: a.reason, placeholder: '¿Qué revisará el médico?', full: true }) +
            selectField({ name: 'reminderMinutes', label: 'Recordatorio', value: String(a.reminderMinutes == null ? 1440 : a.reminderMinutes), options: reminderOptions, hint: 'Aparecerá en la campana de recordatorios.' }) +
            (existing ? selectField({ name: 'status', label: 'Estado', value: a.status || 'pendiente', options: [{ value: 'pendiente', label: 'Pendiente' }, { value: 'asistida', label: 'Asistida' }, { value: 'cancelada', label: 'Cancelada' }] }) : '') +
            textareaField({ name: 'notes', label: 'Notas adicionales', value: a.notes, placeholder: 'Qué llevar, indicaciones previas, ayuno…', full: true, rows: 3 }) +
          '</div>' +
        '</div>' +
      '</form>';

    const root = HM.modal.open({
      title: existing ? 'Editar cita médica' : 'Agendar cita médica',
      subtitle: 'Guarda la fecha, el lugar y activa un recordatorio.',
      icon: 'calendar',
      body: body,
      footer: footer(existing ? 'Guardar cambios' : 'Agendar cita'),
      onMount: function (root) {
        onFormSubmit(root, async function (form) {
          if (!val(form, 'dateTime')) return fail('Selecciona la fecha y hora de la cita.', 'dateTime', form);
          if (!val(form, 'title')) return fail('Escribe el motivo de la cita.', 'title', form);
          const appointment = {
            id: (existing && existing.id) || HM.uid(),
            dateTime: HM.parseDate(val(form, 'dateTime')).toISOString(),
            title: val(form, 'title'),
            specialty: val(form, 'specialty'),
            providerId: val(form, 'providerId'),
            doctor: val(form, 'doctor'),
            location: val(form, 'location'),
            reason: val(form, 'reason'),
            notes: val(form, 'notes'),
            reminderMinutes: Number(val(form, 'reminderMinutes') || 0),
            status: existing ? val(form, 'status') : 'pendiente',
            recordId: (existing && existing.recordId) || null,
            createdAt: (existing && existing.createdAt) || HM.nowISO(),
            updatedAt: HM.nowISO()
          };
          await HM.db.put('appointments', appointment);
          closeAndRefresh(existing ? 'Cita actualizada' : 'Cita agendada', 'Puedes consultarla en tu agenda y en los recordatorios.');
        });
      }
    });
    return root;
  };

  /* ----------------------------- Documentos ----------------------------- */
  F.document = function (fileList) {
    const selected = Array.from(fileList || []);
    if (!selected.length) return null;

    const body =
      '<form id="entityForm" novalidate autocomplete="off">' +
        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('paperclip') + ' Archivos seleccionados</div>' +
          '<div class="attachment-list">' +
            selected.map(function (file, i) {
              return '<div class="attachment"><span class="file-ic">' + HM.icon(HM.isImage(file.type, file.name) ? 'image' : HM.isPdf(file.type, file.name) ? 'file-text' : 'file') + '</span>' +
                '<div class="grow"><strong>' + HM.escape(file.name) + '</strong><small>' + HM.formatBytes(file.size) + '</small></div></div>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="form-section">' +
          '<div class="form-grid">' +
            selectField({ name: 'category', label: 'Categoría', value: selected[0] && HM.isImage(selected[0].type, selected[0].name) ? 'imagen' : 'estudio', options: Object.keys(HM.docCategories).map(function (key) { return { value: key, label: HM.docCategories[key].label }; }) }) +
            inputField({ name: 'date', label: 'Fecha del documento', type: 'date', value: HM.todayISO() }) +
            selectField({ name: 'providerId', label: 'Médico o institución', value: '', options: [{ value: '', label: 'Sin institución / no aplica' }].concat(HM.state.providers.map(function (p) { return { value: p.id, label: p.name }; })), full: true }) +
            textareaField({ name: 'notes', label: 'Notas', value: '', placeholder: '¿Qué contiene este documento?', full: true, rows: 3 }) +
          '</div>' +
        '</div>' +
      '</form>';

    return HM.modal.open({
      title: selected.length === 1 ? 'Agregar documento' : 'Agregar ' + selected.length + ' documentos',
      subtitle: 'Capturas de pantalla, recetas, estudios o documentos escaneados.',
      icon: 'folder',
      body: body,
      footer: footer('Guardar documento' + (selected.length > 1 ? 's' : '')),
      onMount: function (root) {
        onFormSubmit(root, async function (form) {
          const category = val(form, 'category');
          const date = val(form, 'date') || HM.todayISO();
          const providerId = val(form, 'providerId');
          const notes = val(form, 'notes');
          let count = 0;
          for (const file of selected) {
            if (file.size > HM.files.MAX_FILE) {
              HM.toast('Archivo omitido', '"' + file.name + '" supera los 30 MB.', 'warn', 5000);
              continue;
            }
            const saved = await HM.files.save(file);
            await HM.db.put('documents', {
              id: HM.uid(),
              name: file.name,
              category: category,
              date: date,
              providerId: providerId,
              notes: notes,
              fileId: saved.id,
              size: file.size,
              mime: file.type,
              createdAt: HM.nowISO()
            });
            count++;
          }
          if (count) {
            closeAndRefresh(count === 1 ? 'Documento guardado' : count + ' documentos guardados', 'Ya están disponibles en tu archivo médico.');
          } else {
            HM.toast('No se guardó ningún archivo', 'Revisa el tamaño de los archivos.', 'error');
          }
        });
      }
    });
  };

  F.documentEdit = function (doc) {
    const body =
      '<form id="entityForm" novalidate autocomplete="off">' +
        '<div class="form-grid">' +
          inputField({ name: 'name', label: 'Nombre del documento', value: doc.name, required: true, full: true }) +
          selectField({ name: 'category', label: 'Categoría', value: doc.category, options: Object.keys(HM.docCategories).map(function (key) { return { value: key, label: HM.docCategories[key].label }; }) }) +
          inputField({ name: 'date', label: 'Fecha del documento', type: 'date', value: doc.date }) +
          selectField({ name: 'providerId', label: 'Médico o institución', value: doc.providerId || '', options: [{ value: '', label: 'Sin institución / no aplica' }].concat(HM.state.providers.map(function (p) { return { value: p.id, label: p.name }; })), full: true }) +
          textareaField({ name: 'notes', label: 'Notas', value: doc.notes, full: true, rows: 3 }) +
        '</div>' +
      '</form>';

    return HM.modal.open({
      title: 'Editar documento',
      subtitle: 'Puedes cambiar la categoría, la fecha y las notas.',
      icon: 'edit',
      body: body,
      footer: footer('Guardar cambios'),
      onMount: function (root) {
        onFormSubmit(root, async function (form) {
          if (!val(form, 'name')) return fail('Escribe un nombre para el documento.', 'name', form);
          const updated = Object.assign({}, doc, {
            name: val(form, 'name'),
            category: val(form, 'category'),
            date: val(form, 'date'),
            providerId: val(form, 'providerId'),
            notes: val(form, 'notes'),
            updatedAt: HM.nowISO()
          });
          await HM.db.put('documents', updated);
          closeAndRefresh('Documento actualizado', 'Los datos del archivo cambiaron.');
        });
      }
    });
  };

  /* ----------------------------- Directorio ----------------------------- */
  F.provider = function (existing) {
    const p = existing || {};
    const type = p.type || 'medico';
    const body =
      '<form id="entityForm" novalidate autocomplete="off">' +
        '<div class="form-section">' +
          '<div class="form-section-title">' + HM.icon('stethoscope') + ' Tipo de contacto</div>' +
          pickerHTML(HM.providerTypes, type, 'label', 'provider-type') +
          '<input type="hidden" name="type" value="' + type + '">' +
        '</div>' +
        '<div class="form-section">' +
          '<div class="form-grid">' +
            inputField({ name: 'name', label: 'Nombre', value: p.name, required: true, placeholder: 'Nombre del médico o institución', full: true }) +
            inputField({ name: 'specialty', label: 'Especialidad / servicio', value: p.specialty, placeholder: 'Ej. Cardiología, laboratorio clínico' }) +
            inputField({ name: 'license', label: 'Cédula profesional (solo médicos)', value: p.license, placeholder: 'Número de cédula profesional' }) +
            inputField({ name: 'phone', label: 'Teléfono', type: 'tel', value: p.phone, placeholder: '55 0000 0000' }) +
            inputField({ name: 'email', label: 'Correo', type: 'email', value: p.email, placeholder: 'contacto@ejemplo.com' }) +
            inputField({ name: 'address', label: 'Dirección', value: p.address, placeholder: 'Calle, número, colonia', full: true }) +
            textareaField({ name: 'notes', label: 'Notas', value: p.notes, placeholder: 'Horario, referencias, indicaciones de acceso…', full: true, rows: 3 }) +
          '</div>' +
        '</div>' +
      '</form>';

    return HM.modal.open({
      title: existing ? 'Editar contacto médico' : 'Agregar al directorio',
      subtitle: 'Guarda médicos, clínicas, hospitales y laboratorios de confianza.',
      icon: 'stethoscope',
      body: body,
      footer: footer(existing ? 'Guardar cambios' : 'Guardar contacto'),
      onMount: function (root) {
        setTypePicker(root, 'provider-type', 'type');
        onFormSubmit(root, async function (form) {
          if (!val(form, 'name')) return fail('Escribe el nombre del médico o institución.', 'name', form);
          const provider = {
            id: (existing && existing.id) || HM.uid(),
            type: val(form, 'type'),
            name: val(form, 'name'),
            specialty: val(form, 'specialty'),
            license: val(form, 'license'),
            phone: val(form, 'phone'),
            email: val(form, 'email'),
            address: val(form, 'address'),
            notes: val(form, 'notes'),
            createdAt: (existing && existing.createdAt) || HM.nowISO(),
            updatedAt: HM.nowISO()
          };
          await HM.db.put('providers', provider);
          closeAndRefresh(existing ? 'Contacto actualizado' : 'Contacto agregado', 'Estará disponible al registrar consultas y citas.');
        });
      }
    });
  };

  /* ----------------------------- Visor de archivos ----------------------------- */
  F.previewFile = async function (fileId, displayName) {
    const record = await HM.files.get(fileId);
    if (!record) {
      HM.toast('Archivo no encontrado', 'El archivo ya no está disponible.', 'error');
      return;
    }
    const url = await HM.files.url(fileId);
    const isImg = HM.isImage(record.type, record.name);
    const isPdf = HM.isPdf(record.type, record.name);
    let content = '';
    if (isImg) {
      content = '<div style="background:#f6f9fd;border-radius:14px;overflow:hidden;text-align:center"><img src="' + url + '" alt="' + HM.escape(displayName || record.name) + '" style="max-height:65vh;width:auto;max-width:100%;display:inline-block"></div>';
    } else if (isPdf) {
      content = '<iframe src="' + url + '" style="width:100%;height:65vh;border:1px solid var(--line);border-radius:12px;background:#f6f9fd" title="Vista previa del PDF"></iframe>';
    } else {
      content = '<div class="empty-state"><div class="empty-icon">' + HM.icon('file') + '</div><h3>Vista previa no disponible</h3><p>Este tipo de archivo no se puede visualizar en el navegador, pero puedes descargarlo.</p></div>';
    }
    HM.modal.open({
      title: displayName || record.name,
      subtitle: HM.formatBytes(record.size) + ' · ' + (record.type || 'archivo'),
      icon: isImg ? 'image' : isPdf ? 'file-text' : 'file',
      size: 'wide',
      body: content,
      footer: '<button type="button" class="btn btn-outline" data-modal-close>Cerrar</button>' +
        '<button type="button" class="btn btn-primary" data-download-file>' + HM.icon('download') + ' Descargar</button>',
      onMount: function (root) {
        root.querySelector('[data-download-file]').addEventListener('click', function () {
          HM.downloadBlob(record.blob, record.name);
        });
      }
    });
  };

  /* ----------------------------- Eliminaciones ----------------------------- */
  F.deleteRecord = async function (record) {
    const ok = await HM.confirm({
      title: 'Eliminar registro clínico',
      message: 'Se eliminará "' + record.title + '" y sus archivos adjuntos. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      danger: true,
      icon: 'trash'
    });
    if (!ok) return;
    for (const id of record.fileIds || []) await HM.files.remove(id);
    await HM.db.remove('records', record.id);
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    HM.toast('Registro eliminado', '', 'info');
  };

  F.deleteTreatment = async function (treatment) {
    const ok = await HM.confirm({
      title: 'Eliminar tratamiento',
      message: 'Se eliminará "' + treatment.name + '", sus horarios y los registros de toma asociados. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      danger: true,
      icon: 'trash'
    });
    if (!ok) return;
    for (const id of treatment.fileIds || []) await HM.files.remove(id);
    const logs = HM.state.doseLogs.filter(function (l) { return l.treatmentId === treatment.id; });
    for (const log of logs) await HM.db.remove('doseLogs', log.id);
    await HM.db.remove('treatments', treatment.id);
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    HM.toast('Tratamiento eliminado', '', 'info');
  };

  F.deleteDocument = async function (doc) {
    const ok = await HM.confirm({
      title: 'Eliminar documento',
      message: 'Se eliminará "' + doc.name + '" del archivo. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      danger: true,
      icon: 'trash'
    });
    if (!ok) return;
    await HM.files.remove(doc.fileId);
    await HM.db.remove('documents', doc.id);
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    HM.toast('Documento eliminado', '', 'info');
  };

  F.deleteProvider = async function (provider) {
    const ok = await HM.confirm({
      title: 'Eliminar contacto del directorio',
      message: 'Se eliminará "' + provider.name + '". Los registros y citas asociados conservarán su texto, pero perderán el vínculo con este contacto.',
      confirmText: 'Eliminar',
      danger: true,
      icon: 'trash'
    });
    if (!ok) return;
    await HM.db.remove('providers', provider.id);
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    HM.toast('Contacto eliminado', '', 'info');
  };

  F.deleteVital = async function (vital) {
    const ok = await HM.confirm({
      title: 'Eliminar medición',
      message: 'Se eliminará esta medición de ' + (HM.vitalTypes[vital.type] ? HM.vitalTypes[vital.type].label.toLowerCase() : 'signos vitales') + '. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      danger: true,
      icon: 'trash'
    });
    if (!ok) return;
    await HM.db.remove('vitals', vital.id);
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    HM.toast('Medición eliminada', '', 'info');
  };

  F.deleteAppointment = async function (appointment) {
    const ok = await HM.confirm({
      title: 'Eliminar cita',
      message: 'Se eliminará "' + appointment.title + '" de tu agenda. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      danger: true,
      icon: 'trash'
    });
    if (!ok) return;
    await HM.db.remove('appointments', appointment.id);
    document.dispatchEvent(new CustomEvent('vitalia:data-changed'));
    HM.toast('Cita eliminada', '', 'info');
  };

})();
