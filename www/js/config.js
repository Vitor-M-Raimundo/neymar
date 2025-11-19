// Função para validar senha no back-end
async function verificarSenha(email, senha) {
  const res = await fetch('https://proatleta.site/validar_senha.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return !!data?.success;
}

function navigate(destino) {
  const tryRouter = (path) => {
    try {
      let view = app?.views?.main;
      if (!view && app?.views && app.views.length) view = app.views[0];
      if (!view && window?.f7?.views) view = f7.views[0];
      if (view?.router) { view.router.navigate(path, { animate: true }); return true; }
    } catch { }
    return false;
  };

  if (/^\/.+\/$/.test(destino)) {
    if (tryRouter(destino)) return;
    const mapa = {
      '/link5/': 'link5.html',
      '/perfil_prof/': 'perfil_prof.html',
      '/editar_aluno/': 'editar_perfil_aluno.html',
      '/editar_prof/': 'editar_perfil_prof.html'
    };
    destino = mapa[destino] || destino.replace(/^\/|\/$/g, '') + '.html';
  } else {
    tryRouter(destino);
  }
  window.location.href = destino;
}

function gateEditar(btn, destino) {
  if (!btn || btn.dataset._inited === '1') return;
  btn.dataset._inited = '1';
  btn.addEventListener('click', function (ev) {
    ev.preventDefault();
    const email = localStorage.getItem('userEmail');
    if (!email) {
      (app?.dialog?.alert || alert)('Sessão expirada. Faça login.');
      return;
    }
    const pedir = () => {
      if (app?.dialog?.prompt) {
        app.dialog.prompt('Digite sua senha para continuar', 'Confirmar identidade',
          async (senha) => {
            if (!senha) return;
            try {
              const ok = await verificarSenha(email, senha);
              if (ok) navigate(destino); else app.dialog.alert('Senha incorreta.', pedir);
            } catch { app.dialog.alert('Erro ao validar senha.'); }
          },
          () => { }
        );
      } else {
        const senha = prompt('Digite sua senha para continuar');
        if (!senha) return;
        verificarSenha(email, senha)
          .then(ok => ok ? navigate(destino) : alert('Senha incorreta.'))
          .catch(() => alert('Erro ao validar senha.'));
      }
    };
    pedir();
  });
}

document.addEventListener('page:afterin', function (e) {
  const pageName = e.detail?.name;
  const pageEl = e.target;

  if (pageName === 'link5') {
    const nomeEl = document.getElementById('nomeUsuario');
    const emailEl = document.getElementById('emailUsuario');
    if (nomeEl) nomeEl.textContent = localStorage.getItem('userNomeAluno') || localStorage.getItem('userNome') || 'Usuário';
    if (emailEl) emailEl.textContent = localStorage.getItem('userEmailAluno') || localStorage.getItem('userEmail') || 'email@exemplo.com';
    gateEditar(pageEl.querySelector('#btnEditarPerfil'), '/editar_aluno/');
  }

  if (pageName === 'perfil_prof') {
    const nomeEl = document.getElementById('nomeProf');
    const emailEl = document.getElementById('emailProf');
    if (nomeEl) nomeEl.textContent = localStorage.getItem('userNomeProf') || localStorage.getItem('userNome') || 'Professor';
    if (emailEl) emailEl.textContent = localStorage.getItem('userEmailProf') || localStorage.getItem('userEmail') || 'email@exemplo.com';
    gateEditar(pageEl.querySelector('#btnEditarProf'), '/editar_prof/');
  }

  const logoutBtn = pageEl.querySelector('#btnLogout');
  if (logoutBtn && logoutBtn.dataset._inited !== '1') {
    logoutBtn.dataset._inited = '1';
    logoutBtn.addEventListener('click', function () {
      try {
        // limpa sessão
        localStorage.clear();

        // zera histórico custom e F7
        window.navigationHistory = ['/inicio/'];
        window.lastNonConfigRoute = '/inicio/';
        const view = app?.views?.main || window.mainView;

        if (view?.router) {
          try { view.router.clearPreviousHistory(); } catch (_) { }
          view.router.navigate('/inicio/', {
            clearPreviousHistory: true,
            force: true,
            reloadCurrent: true,
            ignoreCache: true,
            animate: true,
          });
        } else {
          window.location.href = 'inicio.html';
        }
      } catch (_) {
        window.location.href = 'inicio.html';
      }
    }, { once: true });
  }

  const backBtn = pageEl.querySelector('.btn-voltar');
  if (backBtn && backBtn.dataset._inited !== '1') {
    backBtn.dataset._inited = '1';
    backBtn.addEventListener('click', function (ev) {
      ev.preventDefault();

      let dest;
      if (pageName === 'config') {
        const hist = window.navigationHistory || [];
        const prevInHistory = hist.length > 1 ? hist[hist.length - 2] : null;
        dest = window.lastNonConfigRoute || prevInHistory || '/index/';
      } else {
        dest = backBtn.getAttribute('href') || '/link5/';
      }

      try { backBtn.setAttribute('href', dest); } catch (_) { }
      navigate(dest);
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const profPage = document.querySelector('.page[data-name="perfil_prof"]');
  const alunoPage = document.querySelector('.page[data-name="link5"]');
  if (profPage) gateEditar(profPage.querySelector('#btnEditarProf'), '/editar_prof/');
  if (alunoPage) gateEditar(alunoPage.querySelector('#btnEditarPerfil'), '/editar_aluno/');
});