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

  // --- NOVO: toggle de senha ---
  function attachPasswordToggle(iconEl, inputEl) {
    if (!iconEl || !inputEl || iconEl.dataset.toggleAttached === '1') return;
    iconEl.addEventListener('click', function () {
      const isPwd = inputEl.getAttribute('type') === 'password';
      inputEl.setAttribute('type', isPwd ? 'text' : 'password');
      // alterna ícones mdi
      this.classList.toggle('mdi-eye');
      this.classList.toggle('mdi-eye-off');
    });
    iconEl.dataset.toggleAttached = '1';
  }
  // Fallback global por delegação (funciona mesmo se o bind local falhar)
  document.addEventListener('click', function (e) {
    const icon = e.target.closest && e.target.closest('.password-toggle-icon');
    if (!icon) return;
    let input = null;
    const id = icon.getAttribute('data-target');
    if (id) input = document.getElementById(id);
    if (!input) {
      const wrap = icon.closest('.input-wrapper');
      if (wrap) input = wrap.querySelector('input[type="password"], input[type="text"]');
    }
    if (!input) return;
    const isPwd = input.getAttribute('type') === 'password';
    input.setAttribute('type', isPwd ? 'text' : 'password');
    icon.classList.toggle('mdi-eye');
    icon.classList.toggle('mdi-eye-off');
  });
  // --- FIM NOVO ---

  async function carregarDadosUsuario(email, refs) {
    if (!email) return;
    try {
      const r = await fetch(`${API_BASE}/get_usuario.php?email=${encodeURIComponent(email)}`);
      if (!r.ok) return;
      const data = await r.json();
      if (!data?.success || !data.usuario) return;

      const u = data.usuario;
      if (refs.emailInput && u.email) refs.emailInput.value = u.email;

      const tel = u.telefone ?? u.tel ?? u.celular ?? u.phone ?? '';
      const telDigits = String(tel || '').replace(/\D+/g, '');
      if (refs.telInput && telDigits) {
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

  function initEditarAluno(root) {
    const pageEl = root || document;

    const emailInput = pageEl.querySelector('#email_change');
    const telInput = pageEl.querySelector('#tel_change');
    const senhaInput = pageEl.querySelector('#senha_change');
    const fotoEl = pageEl.querySelector('#fotoUsuario');
    const form = pageEl.querySelector('#editarForm');
    const btnSalvar = form ? form.querySelector('.btn-salvar') : null;
    const toggleIcon = pageEl.querySelector('#toggleSenha'); // <- NOVO

    const emailLS = localStorage.getItem('userEmail') || '';
    const fotoLS = localStorage.getItem('userFoto') || '';
    const telLS = localStorage.getItem('userTelefone') || '';

    if (fotoEl && fotoLS) fotoEl.src = fotoLS;
    if (emailInput && emailLS) emailInput.value = emailLS;

    if (telInput && telLS) {
      telInput.value = telLS;
      telInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    carregarDadosUsuario(emailLS, { emailInput, telInput, fotoEl });

    if (senhaInput) {
      senhaInput.value = '';
      senhaInput.placeholder = 'Digite sua nova senha';
      senhaInput.removeAttribute('required');
      senhaInput.setAttribute('minlength', '6');
      senhaInput.setAttribute('pattern', '(?=.*[A-Z])(?=.*\\d).{6,}');
      senhaInput.setAttribute('title', 'A senha deve ter ao menos 6 caracteres, 1 letra maiúscula e 1 número.');
      senhaInput.setAttribute('autocomplete', 'new-password');
    }

    // --- NOVO: liga o toggle localmente
    attachPasswordToggle(toggleIcon, senhaInput);
    // --- FIM NOVO

    if (form && !form.dataset._inited) {
      form.dataset._inited = '1';
      form.addEventListener('submit', async function (ev) {
        ev.preventDefault();

        const emailAtual = emailLS;
        const novoEmail = (emailInput?.value || '').trim();
        const telefone = (telInput?.value || '').trim();
        const telefoneDigits = telefone.replace(/\D+/g, '');
        const novaSenha = (senhaInput?.value || '').trim();

        if (!emailAtual) {
          (window.app?.dialog?.alert || alert)('Sessão expirada. Faça login novamente.');
          return;
        }
        if (!novoEmail || !telefoneDigits) {
          (window.app?.dialog?.alert || alert)('Preencha email e telefone.');
          return;
        }
        if (!isValidEmail(novoEmail)) {
          (window.app?.dialog?.alert || alert)('Informe um e-mail válido.');
          emailInput && emailInput.focus();
          return;
        }
        if (novaSenha) {
          if (novaSenha.length < 6) {
            (window.app?.dialog?.alert || alert)('A senha deve ter no mínimo 6 caracteres.');
            senhaInput && senhaInput.focus();
            return;
          }
          if (!/[A-Z]/.test(novaSenha) || !/\d/.test(novaSenha)) {
            (window.app?.dialog?.alert || alert)('A senha deve conter pelo menos 1 letra maiúscula e 1 número.');
            senhaInput && senhaInput.focus();
            return;
          }
        }

        try {
          if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = 'Processando...'; }

          let codigoEmail = '';
          if (novoEmail !== emailAtual) {
            await enviarCodigoEmail(novoEmail);
            const val = await promptAsync('Enviamos um código de 5 dígitos para o novo e-mail. Digite-o para confirmar.', 'Confirmar e-mail');
            codigoEmail = (val || '').replace(/\D+/g, '').slice(0, 5);
            if (!codigoEmail || codigoEmail.length !== 5) {
              (window.app?.dialog?.alert || alert)('Código inválido ou não informado.');
              return;
            }
          }

          const res = await fetch(`${API_BASE}/editar_aluno.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emailAtual,
              novoEmail,
              telefone: telefoneDigits,
              novaSenha: novaSenha || null,
              codigoEmail: codigoEmail || undefined
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
            (window.app?.dialog?.alert || alert)('Dados atualizados com sucesso!');
          } else {
            const msg = (data && data.message) ? data.message : 'Falha ao salvar alterações.';
            (window.app?.dialog?.alert || alert)(msg);
          }
        } catch (err) {
          (window.app?.dialog?.alert || alert)('Erro ao salvar. Tente novamente.');
          console.error(err);
        } finally {
          if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = 'Salvar Alterações'; }
        }
      });
    }
  }

  document.addEventListener('page:afterin', function (e) {
    const name = e.detail && e.detail.name;
    if (name === 'editar_aluno') initEditarAluno(e.target);
  });

  document.addEventListener('DOMContentLoaded', function () {
    const isPage = document.querySelector('.page[data-name="editar_aluno"]');
    if (isPage) initEditarAluno(document);
  });
})();