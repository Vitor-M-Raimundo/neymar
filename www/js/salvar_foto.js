document.addEventListener('page:afterin', function (e) {
  const pageName = e.detail && e.detail.name ? e.detail.name : null;
  const pageEl = e.target || document;

  const isAlunoPage = pageName === 'link5' || pageName === 'editar_aluno';
  const isProfPage  = pageName === 'perfil_prof' || pageName === 'editar_prof';
  if (!isAlunoPage && !isProfPage) return;

  const fotoInput = isProfPage
    ? (pageEl.querySelector('#foto_prof_change') || document.getElementById('foto_prof_change'))
    : (pageEl.querySelector('#fotoInput') || pageEl.querySelector('#fotoInput_editar') || document.getElementById('fotoInput') || document.getElementById('fotoInput_editar'));

  const uploadForm = isProfPage
    ? (pageEl.querySelector('#uploadFotoprofForm') || document.getElementById('uploadFotoprofForm'))
    : (pageEl.querySelector('#uploadFotoForm') || document.getElementById('uploadFotoForm'));

  const fotoEl = isProfPage
    ? (pageEl.querySelector('#fotoProfPreview') || pageEl.querySelector('#fotoProf') || document.getElementById('fotoProfPreview') || document.getElementById('fotoProf'))
    : (pageEl.querySelector('#fotoUsuario') || document.getElementById('fotoUsuario'));

  const email = localStorage.getItem('userEmail');

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

  if (pageName === 'link5') {
    fetch('https://proatleta.site/get_usuario.php?email=' + encodeURIComponent(email))
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          if (fotoEl) fotoEl.src = data.usuario.foto || (localStorage.getItem('userFoto') || 'img/user.jpg');
          if (data.usuario.foto) localStorage.setItem('userFoto', data.usuario.foto);
          if (data.usuario.nome) localStorage.setItem('userNome', data.usuario.nome);
          if (data.usuario.email) localStorage.setItem('userEmail', data.usuario.email);
        } else {
          if (fotoEl) fotoEl.src = localStorage.getItem('userFoto') || 'img/user.jpg';
        }
      })
      .catch(() => {
        if (fotoEl) fotoEl.src = localStorage.getItem('userFoto') || 'img/user.jpg';
      });
  } else if (isProfPage || pageName === 'editar_aluno') {
    if (fotoEl) fotoEl.src = localStorage.getItem('userFoto') || 'img/user.jpg';
  }

  function uploadFoto(file) {
    if (!file || !email) return;
    const formData = new FormData();
    const endpoint = isProfPage
      ? 'https://proatleta.site/upload_fotoProf.php'
      : 'https://proatleta.site/upload_foto.php';
    const fileField = isProfPage ? 'foto2' : 'foto';

    formData.append(fileField, file);
    formData.append('email', email);

    fetch(endpoint, { method: 'POST', body: formData })
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          localStorage.setItem('userFoto', data.url);
          if (fotoEl) fotoEl.src = data.url;
          alertOk('Foto atualizada.');
        } else {
          alertOk(data?.message || 'Falha no upload.');
        }
      })
      .catch(() => {
        alertOk('Erro ao enviar foto.');
      });
  }

  if (fotoInput && fotoInput.dataset._sf_inited !== '1') {
    fotoInput.dataset._sf_inited = '1';
    fotoInput.addEventListener('change', function (ev) {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      const confirmar = () => uploadFoto(file);
      if (typeof app !== 'undefined' && app.dialog?.confirm) {
        app.dialog.confirm('Tem certeza que deseja alterar a imagem?', '', confirmar, () => { fotoInput.value = ''; });
      } else {
        if (confirm('Tem certeza que deseja alterar a imagem?')) confirmar();
        else fotoInput.value = '';
      }
    });
  }

  if (uploadForm && uploadForm.dataset._sf_inited !== '1') {
    uploadForm.dataset._sf_inited = '1';
    uploadForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      const file = fotoInput ? fotoInput.files && fotoInput.files[0] : null;
      if (!file) return;
      uploadFoto(file);
    });
  }
});