(function () {
  if (window.__chatProfBound__) return;
  window.__chatProfBound__ = true;

  function getAny(keys) {
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = localStorage.getItem(k);
      if (v === null || v === undefined || String(v).trim() === '') v = sessionStorage.getItem(k);
      if (v !== null && v !== undefined && String(v).trim() !== '') return v;
    }
    return null;
  }

  function parseQuery() {
    var out = {};
    try {
      var q = (location.search || '').replace(/^\?/, '');
      q.split('&').forEach(function (p) {
        if (!p) return;
        var kv = p.split('=');
        out[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    } catch (e) {}
    return out;
  }

  function resolveAlunoContext(pageDetail) {
    var query = (pageDetail && pageDetail.route && pageDetail.route.query) || parseQuery();

    var alunoId = null;
    if (query && (query.alunoId || query.id_aluno || query.idAluno)) {
      alunoId = parseInt(query.alunoId || query.id_aluno || query.idAluno, 10);
    }
    if (!alunoId || isNaN(alunoId)) {
      var rawId = getAny(['chatAlunoId', 'chatWithId', 'alunoId', 'id_aluno', 'idAluno', 'aluno_chat_id', 'idAlunoPerfil']);
      alunoId = rawId ? parseInt(rawId, 10) : null;
    }

    var alunoNome = (query && (query.alunoNome || query.nome)) || getAny(['chatAlunoNome', 'alunoNome', 'nome_aluno']);
    var alunoEmail = (query && (query.alunoEmail || query.email)) || getAny(['chatAlunoEmail', 'alunoEmail']);
    var alunoFoto = (query && (query.alunoFoto || query.foto)) || getAny(['chatAlunoFoto', 'alunoFoto', 'foto_aluno']);
    var alunoEscolinha = (query && (query.alunoEscolinha || query.escolinha)) || getAny(['chatAlunoEscolinha', 'alunoEscolinha']);

    if (!alunoFoto) alunoFoto = 'img/user.jpg';

    if (alunoId && !isNaN(alunoId)) {
      localStorage.setItem('chatAlunoId', String(alunoId));
      if (alunoNome) localStorage.setItem('chatAlunoNome', alunoNome);
      if (alunoEmail) localStorage.setItem('chatAlunoEmail', alunoEmail);
      if (alunoFoto) localStorage.setItem('chatAlunoFoto', alunoFoto);
      if (alunoEscolinha) localStorage.setItem('chatAlunoEscolinha', alunoEscolinha);

      return {
        id: alunoId,
        nome: alunoNome || 'Aluno',
        email: alunoEmail || '',
        foto: alunoFoto,
        escolinha: alunoEscolinha || ''
      };
    }
    return null;
  }

  function boot(el, pageDetail) {
    if (!el) return;
    if (!el.__chatBooted) el.__chatBooted = true;

    var form = el.querySelector('#chatForm');
    if (form) {
      form.setAttribute('action', 'javascript:void(0)');
      form.setAttribute('onsubmit', 'return false');
      var btn = form.querySelector('button') || form.querySelector('[type="submit"]');
      if (btn) btn.type = 'button';
    }

    var nomeEl = el.querySelector('#alunoNome');
    var emailEl = el.querySelector('#alunoEmail');
    var fotoEl = el.querySelector('#alunoFoto');
    var escEl = el.querySelector('#alunoEscolinha');

    function applyAlunoToUI(ctx) {
      if (nomeEl) nomeEl.textContent = ctx.nome || 'Aluno';
      if (emailEl) emailEl.textContent = ctx.email || '';
      if (fotoEl) fotoEl.src = ctx.foto || 'img/user.jpg';
      if (escEl) escEl.textContent = ctx.escolinha || '';
    }

    function startChatWithContext(ctx) {
      var meuId = parseInt(localStorage.getItem('userId') || sessionStorage.getItem('userId'), 10);
      if (!meuId || !ctx || !ctx.id) return;

      if (el.__chatCtxId && Number(el.__chatCtxId) === Number(ctx.id)) {
        applyAlunoToUI(ctx);
        return;
      }

      if (window.ChatCore && ChatCore.teardown) ChatCore.teardown();
      var listEl = el.querySelector('#chatMessages');
      if (listEl) listEl.innerHTML = '';
      el.__chatCtxId = Number(ctx.id);

      applyAlunoToUI(ctx);

      var professorId = meuId;
      var alunoId = ctx.id;
      if (window.ChatCore && ChatCore.init) {
        ChatCore.init({ professorId: professorId, alunoId: alunoId, meuId: meuId, meRole: 'professor', pageEl: el });
      } else if (window.jQuery && $.getScript) {
        $.getScript('js/chat_core.js')
          .done(function () { ChatCore.init({ professorId: professorId, alunoId: alunoId, meuId: meuId, meRole: 'professor', pageEl: el }); })
          .fail(function (err) { console.error('Erro ao carregar chat_core:', err); });
      }
    }

    function ensureContextAndStart() {
      var ctx = resolveAlunoContext(pageDetail);
      if (ctx && ctx.id) startChatWithContext(ctx);
    }

    ensureContextAndStart();

    if (el.__alunoWatcherInterval) clearInterval(el.__alunoWatcherInterval);
    el.__alunoWatcherInterval = setInterval(function () {
      var currentId = el.__chatCtxId || null;
      var rawId = getAny(['chatAlunoId', 'chatWithId', 'alunoId', 'id_aluno', 'idAluno', 'aluno_chat_id', 'idAlunoPerfil']);
      var newId = rawId ? parseInt(rawId, 10) : null;
      if (newId && Number(newId) !== Number(currentId)) {
        var ctx = resolveAlunoContext(pageDetail);
        if (ctx && ctx.id) startChatWithContext(ctx);
      }
    }, 600);

    el.__chatCleanup = function () {
      if (el.__alunoWatcherInterval) { clearInterval(el.__alunoWatcherInterval); el.__alunoWatcherInterval = null; }
      if (el.__chatWaitTimer) { clearInterval(el.__chatWaitTimer); el.__chatWaitTimer = null; }
      if (window.ChatCore && ChatCore.teardown) ChatCore.teardown();
      el.__chatCtxId = null;
    };
  }

  document.addEventListener('page:init', function (e) {
    var d = e && e.detail;
    if (!d || d.name !== 'chat_prof') return;
    var el = d.el || e.target;
    boot(el, d);
  });

  document.addEventListener('page:reinit', function (e) {
    var d = e && e.detail;
    if (!d || d.name !== 'chat_prof') return;
    var el = d.el || e.target;
    boot(el, d);
  });

  document.addEventListener('page:beforeout', function (e) {
    var d = e && e.detail;
    if (d && d.name === 'chat_prof') {
      var el = d.el || e.target;
      if (el && el.__chatCleanup) el.__chatCleanup();
    }
  });

  function bootStandalone() {
    var el = document.querySelector('[data-name="chat_prof"]');
    if (!el) return;
    boot(el, { route: { query: parseQuery() } });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootStandalone);
  } else {
    setTimeout(bootStandalone, 0);
  }
})();