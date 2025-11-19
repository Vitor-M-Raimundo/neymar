document.addEventListener('page:afterin', function (e) {
  if (e.detail.name !== 'perfil_prof') return;

  const fotoInput = document.getElementById('fotoInput2');
  const fotoEl    = document.getElementById('fotoProf');
  const nomeEl    = document.getElementById('nomeProf');
  const emailEl   = document.getElementById('emailProf');
  const email     = localStorage.getItem('userEmail');

  // Helper para alert com botão "ok"
  function alertOk(text) {
    if (app?.dialog?.create) {
      app.dialog.create({
        title: '',
        text,
        buttons: [{ text: 'ok', close: true }],
      }).open();
    } else if (app?.dialog?.alert) {
      app.dialog.alert(text);
    } else {
      alert(text);
    }
  }

  // Carrega dados do professor
  if (email) {
    fetch('https://proatleta.site/get_usuario.php?email=' + encodeURIComponent(email))
      .then(r => r.json())
      .then(data => {
        if (data.success && data.usuario) {
          const u = data.usuario;
          if (u.foto) {
            fotoEl && (fotoEl.src = u.foto);
            localStorage.setItem('userFoto', u.foto);
          } else {
            fotoEl && (fotoEl.src = localStorage.getItem('userFoto') || 'img/user.jpg');
          }
          if (nomeEl) nomeEl.textContent = u.nome || (localStorage.getItem('userNome') || 'Professor');
          if (emailEl) emailEl.textContent = u.email || email;
          if (u.nome)  localStorage.setItem('userNome', u.nome);
          if (u.email) localStorage.setItem('userEmail', u.email);
        } else {
          fotoEl && (fotoEl.src = localStorage.getItem('userFoto') || 'img/user.jpg');
          if (nomeEl) nomeEl.textContent = localStorage.getItem('userNome') || 'Professor';
          if (emailEl) emailEl.textContent = email || 'email@exemplo.com';
        }
      })
      .catch(() => {
        fotoEl && (fotoEl.src = localStorage.getItem('userFoto') || 'img/user.jpg');
        if (nomeEl) nomeEl.textContent = localStorage.getItem('userNome') || 'Professor';
        if (emailEl) emailEl.textContent = email || 'email@exemplo.com';
      });
  }

  function uploadFoto(file) {
    if (!file || !email) return;
    const fd = new FormData();
    fd.append('foto2', file);
    fd.append('email', email);

    fetch('https://proatleta.site/upload_fotoProf.php', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.url) {
          localStorage.setItem('userFoto', data.url);
          fotoEl && (fotoEl.src = data.url);
          alertOk('Foto atualizada.');
        } else {
          alertOk(data.message || 'Falha no upload.');
        }
      })
      .catch(() => alertOk('Erro ao enviar foto.'));
  }

  if (fotoInput && fotoInput.dataset._fp_inited !== '1') {
    fotoInput.dataset._fp_inited = '1';
    fotoInput.addEventListener('change', ev => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      const confirmar = () => uploadFoto(file);
      if (app?.dialog?.confirm) {
        app.dialog.confirm('Deseja alterar a imagem?', '', confirmar, () => { fotoInput.value = ''; });
      } else {
        if (confirm('Deseja alterar a imagem?')) confirmar();
        else fotoInput.value = '';
      }
    });
  }
});