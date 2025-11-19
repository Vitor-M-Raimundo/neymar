(function () {
  function limitLength(input, max) {
    if (!input) return;
    input.addEventListener('input', function (e) {
      let v = e.target.value || '';
      if (v.length > max) v = v.slice(0, max);
      e.target.value = v;
    }, { passive: true });
  }

  // CPF: 000.000.000-00
  function maskCPF(input) {
    if (!input) return;
    input.addEventListener('input', function (e) {
      let value = (e.target.value || '').replace(/\D/g, '').slice(0, 11);
      if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      }
      e.target.value = value;
    });
  }

  // Telefone BR com suporte a +55
  function maskTelefoneBR(input) {
    if (!input) return;
    input.addEventListener('input', function (e) {
      const raw = e.target.value || '';
      let digits = raw.replace(/\D/g, '');

      const hasCC = digits.startsWith('55') && digits.length > 11;
      const maxLen = hasCC ? 13 : 11; // 55 + DDD + número
      digits = digits.slice(0, maxLen);

      let out = '';

      if (hasCC) {
        const ddd = digits.slice(2, 4);
        const rest = digits.slice(4);
        if (rest.length > 5) {
          if (rest.length > 8) out = `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
          else out = `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
        } else if (rest.length > 0) {
          out = `+55 (${ddd}) ${rest}`;
        } else if (ddd) {
          out = `+55 (${ddd}`;
        } else {
          out = '+55';
        }
      } else {
        const ddd = digits.slice(0, 2);
        const rest = digits.slice(2);
        if (rest.length > 5) {
          if (rest.length > 8) out = `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
          else out = `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
        } else if (rest.length > 0) {
          out = `(${ddd}) ${rest}`;
        } else if (digits.length > 0) {
          out = `(${digits}`;
        } else {
          out = '';
        }
      }

      e.target.value = out;
    });
  }

  // Alternar visibilidade da senha (olho)
  function attachToggle(iconEl, targetInput) {
    if (!iconEl || !targetInput) return;
    if (iconEl.dataset.toggleAttached === '1') return;

    iconEl.addEventListener('click', function () {
      const isPwd = targetInput.getAttribute('type') === 'password';
      targetInput.setAttribute('type', isPwd ? 'text' : 'password');

      if (iconEl.classList.contains('mdi')) {
        iconEl.classList.toggle('mdi-eye');
        iconEl.classList.toggle('mdi-eye-off');
      } else {
        iconEl.classList.toggle('ri-eye-line');
        iconEl.classList.toggle('ri-eye-off-line');
      }
    });

    iconEl.dataset.toggleAttached = '1';
  }

  function initMasks(root) {
    const ctx = root || document;
    const q = (sel) => (ctx && ctx.querySelector) ? ctx.querySelector(sel) : document.querySelector(sel);
    const byId = (id) => q('#' + id);

    // Cadastro
    const cpf        = byId('cpf');
    const telefone   = byId('telefone');
    const nome       = byId('nome');
    const sobrenome  = byId('sobrenome');
    const senha      = byId('senha');
    const confirmar  = byId('confirmar');

    // Editar aluno (IDs antigos)
    const emailChangeAluno = byId('email_change');
    const senhaChangeAluno = byId('senha_change');
    const telChangeAluno   = byId('tel_change');
    const toggleEditarAluno = byId('toggleSenha');

    // Editar professor (IDs novos)
    const emailChangeProf = byId('email_prof_change');
    const senhaChangeProf = byId('senha_prof_change');
    const telChangeProf   = byId('tel_prof_change');
    const toggleEditarProf = byId('toggleSenhaProf');

    // Limites
    limitLength(nome, 60);
    limitLength(sobrenome, 60);
    limitLength(emailChangeAluno, 60);
    limitLength(emailChangeProf, 60);
    limitLength(senha, 14);
    limitLength(confirmar, 14);
    limitLength(senhaChangeAluno, 14);
    limitLength(senhaChangeProf, 14);

    // Máscaras de telefone
    maskTelefoneBR(telefone);
    maskTelefoneBR(telChangeAluno);
    maskTelefoneBR(telChangeProf);

    // CPF
    maskCPF(cpf);

    // Toggles senha
    attachToggle(byId('viewPassword'), senha);
    attachToggle(byId('viewPassword3'), confirmar);
    attachToggle(toggleEditarAluno, senhaChangeAluno);
    attachToggle(toggleEditarProf, senhaChangeProf);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMasks(document);
  });

  // Suporte a páginas SPA do Framework7
  document.addEventListener('page:afterin', function (e) {
    const name = e.detail && e.detail.name;
    if (!name) return;
    if (name === 'cadastro' || name === 'editar_aluno' || name === 'editar_prof' || name === 'login') {
      initMasks(e.target);
    }
  });

  // Fallback para ícone de olho via delegação
  document.addEventListener('click', function (e) {
    const icon = e.target.closest && e.target.closest('.password-toggle-icon');
    if (!icon) return;

    let input = null;
    const wrap = icon.closest('.input-wrapper') || icon.closest('.item-input-wrap');
    if (wrap) input = wrap.querySelector('input');

    if (!input) {
      const targetId = icon.getAttribute('data-target');
      if (targetId) input = document.getElementById(targetId);
    }
    if (!input) return;

    const isPwd = input.getAttribute('type') === 'password';
    input.setAttribute('type', isPwd ? 'text' : 'password');

    if (icon.classList.contains('mdi')) {
      icon.classList.toggle('mdi-eye');
      icon.classList.toggle('mdi-eye-off');
    } else {
      icon.classList.toggle('ri-eye-line');
      icon.classList.toggle('ri-eye-off-line');
    }
  });
})();