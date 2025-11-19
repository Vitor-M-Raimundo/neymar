(function () {
  const API_BASE = 'https://proatleta.site';

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function promptAsync(msg, title) {
    return new Promise((resolve) => {
      const fn = window.app?.dialog?.prompt;
      if (fn) {
        app.dialog.prompt(msg, title || 'Confirmação', (val) => resolve(val || ''), () => resolve(''));
      } else {
        const v = prompt(msg);
        resolve(v || '');
      }
    });
  }

  async function enviarCodigoEmail(email) {
    const res = await fetch(`${API_BASE}/enviar_codigo_email.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Falha ao enviar código');
    return true;
  }

  function attachPasswordToggle(iconEl, inputEl) {
    if (!iconEl || !inputEl || iconEl.dataset.toggleAttached === '1') return;
    iconEl.addEventListener('click', function () {
      const isPwd = inputEl.getAttribute('type') === 'password';
      inputEl.setAttribute('type', isPwd ? 'text' : 'password');
      this.classList.toggle('mdi-eye');
      this.classList.toggle('mdi-eye-off');
    });
    iconEl.dataset.toggleAttached = '1';
  }

  document.addEventListener('click', function (e) {
    const icon = e.target.closest && e.target.closest('.password-toggle-icon');
    if (!icon) return;
    let input = null;
    const id = icon.getAttribute('data-target');
    if (id) input = document.getElementById(id);
    if (!input) {
      const wrap = icon.closest('.input-wrapper');
      if (wrap) input = wrap.querySelector('input');
    }
    if (!input) return;
    const isPwd = input.getAttribute('type') === 'password';
    input.setAttribute('type', isPwd ? 'text' : 'password');
    icon.classList.toggle('mdi-eye');
    icon.classList.toggle('mdi-eye-off');
  });

  async function carregarDadosProfessor(email, refs) {
    if (!email) return;
    try {
      const r = await fetch(`${API_BASE}/get_usuario.php?email=${encodeURIComponent(email)}`);
      if (!r.ok) return;
      const data = await r.json();
      if (!data?.success || !data.usuario) return;
      const u = data.usuario;

      if (refs.emailInput && u.email) refs.emailInput.value = u.email;

      const tel = u.telefone ?? '';
      const telDigits = String(tel).replace(/\D+/g, '');
      if (refs.telInput) {
        refs.telInput.value = telDigits;
        refs.telInput.dispatchEvent(new Event('input', { bubbles: true }));
        localStorage.setItem('userTelefone', telDigits);
      }
      if (refs.fotoEl && u.foto) {
        refs.fotoEl.src = u.foto;
        localStorage.setItem('userFoto', u.foto);
      }
    } catch {}
  }

  function initEditarProf(root) {
    const pageEl = root || document;

    const emailInput = pageEl.querySelector('#email_prof_change, #email_change');
    const telInput   = pageEl.querySelector('#tel_prof_change, #tel_change');
    const senhaInput = pageEl.querySelector('#senha_prof_change, #senha_change');
    const fotoEl     = pageEl.querySelector('#fotoProfPreview, #fotoUsuario');
    const form       = pageEl.querySelector('#editarProfForm, #editarForm');
    const btnSalvar  = form ? form.querySelector('.btn-salvar-prof, .btn-salvar') : null;
    const toggleIcon = pageEl.querySelector('#toggleSenhaProf, #toggleSenha');
    const fotoInput  = pageEl.querySelector('#foto_prof_change, #fotoInput_editar');

    const emailLS = localStorage.getItem('userEmail') || '';
    const fotoLS  = localStorage.getItem('userFoto') || '';
    const telLS   = localStorage.getItem('userTelefone') || '';

    if (fotoEl && fotoLS) fotoEl.src = fotoLS;
    if (emailInput && emailLS) emailInput.value = emailLS;
    if (telInput) {
      telInput.value = telLS;
      telInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    carregarDadosProfessor(emailLS, { emailInput, telInput, fotoEl });

    if (senhaInput) {
      senhaInput.value = '';
      senhaInput.placeholder = 'Nova senha (opcional)';
      senhaInput.removeAttribute('required');
      senhaInput.setAttribute('minlength', '6');
      senhaInput.setAttribute('pattern', '(?=.*[A-Z])(?=.*\\d).{6,}');
      senhaInput.setAttribute('title', 'Min 6, 1 maiúscula e 1 número');
      senhaInput.setAttribute('autocomplete', 'new-password');
    }

    attachPasswordToggle(toggleIcon, senhaInput);

    if (form && !form.dataset._inited) {
      form.dataset._inited = '1';
      form.addEventListener('submit', async function (ev) {
        ev.preventDefault();

        const emailAtual = emailLS;
        const novoEmail = (emailInput?.value || '').trim();
        const telefone = (telInput?.value || '').trim();
        const telefoneDigits = telefone.replace(/\D+/g, '');
        const novaSenha = (senhaInput?.value || '').trim();

        // Foto: se for input type="file", pegue a URL já salva pelo upload; ignore C:\fakepath\
        const isFileInput = !!(fotoInput && fotoInput.tagName === 'INPUT' && fotoInput.type === 'file');
        let fotoVal = isFileInput
          ? (localStorage.getItem('userFoto') || '')
          : ((fotoInput?.value || '').trim());

        if (!emailAtual) {
          (window.app?.dialog?.alert || alert)('Sessão expirada.');
          return;
        }
        if (!novoEmail || !telefoneDigits) {
          (window.app?.dialog?.alert || alert)('Preencha e-mail e telefone.');
          return;
        }
        if (!isValidEmail(novoEmail)) {
          (window.app?.dialog?.alert || alert)('E-mail inválido.');
          emailInput && emailInput.focus();
          return;
        }
        if (novaSenha) {
          if (novaSenha.length < 6) {
            (window.app?.dialog?.alert || alert)('Senha mínima 6.');
            senhaInput && senhaInput.focus();
            return;
          }
          if (!/[A-Z]/.test(novaSenha) || !/\d/.test(novaSenha)) {
            (window.app?.dialog?.alert || alert)('Senha precisa 1 maiúscula e 1 número.');
            senhaInput && senhaInput.focus();
            return;
          }
        }

        // Se tiver algo em fotoVal mas não for URL http(s), ignora em vez de bloquear
        if (fotoVal && !/^https?:\/\//i.test(fotoVal)) {
          fotoVal = '';
        }

        try {
          if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = 'Processando...'; }

          let codigoEmail = '';
          if (novoEmail !== emailAtual) {
            await enviarCodigoEmail(novoEmail);
            const val = await promptAsync('Enviamos um código de 5 dígitos para o novo e-mail. Digite-o para confirmar.', 'Confirmar e-mail');
            codigoEmail = (val || '').replace(/\D+/g, '').slice(0, 5);
            if (!codigoEmail || codigoEmail.length !== 5) {
              (window.app?.dialog?.alert || alert)('Código inválido.');
              return;
            }
          }

          const res = await fetch(`${API_BASE}/editar_prof.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emailAtual,
              novoEmail,
              telefone: telefoneDigits,
              novaSenha: novaSenha || null,
              codigoEmail: codigoEmail || undefined,
              foto: fotoVal // pode ser vazio; upload já salva no localStorage
            })
          });

          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();

          if (data && data.success) {
            if (novoEmail && novoEmail !== emailAtual) localStorage.setItem('userEmail', novoEmail);
            if (telefoneDigits) {
              localStorage.setItem('userTelefone', telefoneDigits);
              telInput.value = telefoneDigits;
              telInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (fotoVal) {
              localStorage.setItem('userFoto', fotoVal);
              if (fotoEl) fotoEl.src = fotoVal;
            }
            (window.app?.dialog?.alert || alert)('Atualizado com sucesso.');
          } else {
            (window.app?.dialog?.alert || alert)(data?.message || 'Falha na atualização.');
          }
        } catch (err) {
          (window.app?.dialog?.alert || alert)('Erro ao salvar.');
          console.error(err);
        } finally {
          if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = 'Salvar Alterações'; }
        }
      });
    }
  }

  document.addEventListener('page:afterin', function (e) {
    const name = e.detail && e.detail.name;
    if (name === 'editar_prof') initEditarProf(e.target);
  });

  document.addEventListener('DOMContentLoaded', function () {
    const isPage = document.querySelector('.page[data-name="editar_prof"]');
    if (isPage) initEditarProf(document);
  });
})();