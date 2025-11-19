(function () {
  if (window.__chatAlunoBound__) return;
  window.__chatAlunoBound__ = true;

  function getAny(keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = localStorage.getItem(keys[i]);
      if (!v || String(v).trim() === '') v = sessionStorage.getItem(keys[i]);
      if (v && String(v).trim() !== '') return v;
    }
    return null;
  }

  function parseQuery() {
    var out = {};
    try {
      var q = (location.search || '').replace(/^\?/, '');
      if (!q) return out;
      q.split('&').forEach(function (p) {
        if (!p) return;
        var kv = p.split('=');
        var k = decodeURIComponent(kv[0] || '');
        var v = decodeURIComponent(kv[1] || '');
        if (k) out[k] = v;
      });
    } catch (e) { }
    return out;
  }

  async function fetchProfInfo(id) {
  if (!id) return null;
  try {
    var url = 'https://proatleta.site/usuario.php?id=' + encodeURIComponent(id) + '&__ts=' + Date.now();
    var res = await fetch(url, { method: 'GET', mode: 'cors' });
    if (!res.ok) return null;
    var j = await res.json();
    if (!j || (!j.success && !j.usuario && !j.user)) return null;
    var u = j.usuario || j.user;
    var nome = ((u.nome || '') + (u.sobrenome ? ' ' + u.sobrenome : '')).trim() || null;
    var foto = u.foto || null;
    if (foto && !/^https?:\/\//i.test(foto)) {
      var base = 'https://proatleta.site/';
      foto = base + foto.replace(/^\/+/, '');
    }
    return {
      nome: nome || null,
      foto: foto || null,
      email: u.email || null,
      escolinha: u.escolinha || null
    };
  } catch (e) {
    return null;
  }
}

  function resolveProfContext(pageDetail) {
    var query = (pageDetail && pageDetail.route && pageDetail.route.query) || parseQuery();

    var id = null;
    var qIdKeys = ['id', 'profId', 'professor_id', 'id_professor', 'idProfessor', 'professorId'];
    for (var i = 0; i < qIdKeys.length && !id; i++) if (query && query[qIdKeys[i]] != null) id = parseInt(query[qIdKeys[i]], 10);
    if (!id || isNaN(id)) {
      var raw = getAny(['chatProfessorId', 'chatWithId', 'profId', 'id_professor', 'idProfessor', 'professor_id', 'professorId', 'idProfPerfil', 'id']);
      id = raw ? parseInt(raw, 10) : null;
    }

    function pick(qKeys, sKeys, def) {
      var val = null;
      for (var i = 0; !val && i < qKeys.length; i++) if (query && query[qKeys[i]]) val = query[qKeys[i]];
      if (!val) val = getAny(sKeys);
      return (val == null || val === undefined) ? (def || '') : val;
    }

    var nome = pick(['profNome', 'nome_professor', 'nomeProfessor', 'nome'], ['chatProfNome', 'chatProfessorNome', 'profNome', 'nome_professor', 'nomeProfessor'], 'Professor');
    var email = pick(['profEmail', 'email_professor', 'email'], ['chatProfEmail', 'chatProfessorEmail', 'profEmail', 'email_professor'], '');
    var foto = pick(['profFoto', 'foto_prof', 'fotoProfessor', 'foto'], ['chatProfFoto', 'chatProfessorFoto', 'profFoto', 'foto_prof', 'fotoProfessor', 'foto'], 'img/user.jpg');
    var escolinha = pick(['profEscolinha', 'escolinha', 'escola', 'academia'], ['chatProfEscolinha', 'chatProfessorEscolinha', 'profEscolinha'], '');

    if (id && !isNaN(id)) {
      localStorage.setItem('chatProfessorId', String(id));
      return { id: id, nome: String(nome).trim(), email: String(email).trim(), foto: String(foto).trim(), escolinha: String(escolinha).trim() };
    }
    return null;
  }

  function boot(el, pageDetail) {
    if (!el) return;

    var form = el.querySelector('#chatForm');
    if (form) {
      form.setAttribute('action', 'javascript:void(0)');
      form.setAttribute('onsubmit', 'return false');
      var btn = form.querySelector('button') || form.querySelector('[type="submit"]');
      if (btn) btn.type = 'button';
    }

    var nomeEl = el.querySelector('#profNome');
    var emailEl = el.querySelector('#profEmail');
    var fotoEl = el.querySelector('#profFoto');
    var escEl = el.querySelector('#profEscolinha');
    var listEl = el.querySelector('#chatMessages');

    el.__chatLastApplied = el.__chatLastApplied || { id: null, nome: null, foto: null };
    el.__chatCtxId = el.__chatCtxId || null;

    function applyProfToUI(ctx) {
      if (!ctx) return;
      var idChanged = ctx.id && String(ctx.id) !== String(el.__chatLastApplied.id);
      var nameClean = ctx.nome ? String(ctx.nome).trim() : '';
      var fotoClean = ctx.foto ? String(ctx.foto).trim() : 'img/user.jpg';

      if (nomeEl && (idChanged || nameClean !== (el.__chatLastApplied.nome || '').trim())) nomeEl.textContent = nameClean || 'Professor';
      if (emailEl) emailEl.textContent = ctx.email || '';
      if (fotoEl && (idChanged || fotoClean !== (el.__chatLastApplied.foto || '').trim())) fotoEl.src = fotoClean || 'img/user.jpg';
      if (escEl) escEl.textContent = ctx.escolinha || '';

      el.__chatLastApplied.id = ctx.id || null;
      el.__chatLastApplied.nome = nameClean || null;
      el.__chatLastApplied.foto = fotoClean || null;
      if (ctx.id) el.__chatCtxId = Number(ctx.id);
    }

    function persistProfStorage(ctx) {
      if (!ctx) {
        ['chatProfessorId','chatProfNome','chatProfessorNome','chatProfEmail','chatProfessorEmail','chatProfFoto','chatProfessorFoto','chatProfEscolinha','chatProfessorEscolinha']
          .forEach(k => localStorage.removeItem(k));
        return;
      }
      if (ctx.id) localStorage.setItem('chatProfessorId', String(ctx.id));
      if (ctx.nome) { localStorage.setItem('chatProfNome', ctx.nome); localStorage.setItem('chatProfessorNome', ctx.nome); }
      else { localStorage.removeItem('chatProfNome'); localStorage.removeItem('chatProfessorNome'); }
      if (ctx.email) { localStorage.setItem('chatProfEmail', ctx.email); localStorage.setItem('chatProfessorEmail', ctx.email); }
      else { localStorage.removeItem('chatProfEmail'); localStorage.removeItem('chatProfessorEmail'); }
      if (ctx.foto) { localStorage.setItem('chatProfFoto', ctx.foto); localStorage.setItem('chatProfessorFoto', ctx.foto); }
      else { localStorage.removeItem('chatProfFoto'); localStorage.removeItem('chatProfessorFoto'); }
      if (ctx.escolinha) { localStorage.setItem('chatProfEscolinha', ctx.escolinha); localStorage.setItem('chatProfessorEscolinha', ctx.escolinha); }
      else { localStorage.removeItem('chatProfEscolinha'); localStorage.removeItem('chatProfessorEscolinha'); }
    }

    function getCachedProf() {
      var rawId = getAny(['chatProfessorId', 'chatWithId', 'profId', 'id_professor', 'idProfessor', 'professor_id', 'professorId', 'idProfPerfil', 'id']);
      var id = rawId ? parseInt(rawId, 10) : null;
      var nome = getAny(['chatProfNome', 'chatProfessorNome', 'profNome', 'nome_professor', 'nomeProfessor', 'nome']) || '';
      var email = getAny(['chatProfEmail', 'chatProfessorEmail', 'profEmail', 'email_professor', 'email']) || '';
      var foto = getAny(['chatProfFoto', 'chatProfessorFoto', 'profFoto', 'foto_prof', 'fotoProfessor', 'foto']) || 'img/user.jpg';
      var escolinha = getAny(['chatProfEscolinha', 'chatProfessorEscolinha', 'profEscolinha', 'escolinha']) || '';
      return { id: id, nome: String(nome).trim(), email: String(email).trim(), foto: String(foto).trim(), escolinha: String(escolinha).trim() };
    }

    // atualiza UI imediatamente a partir do storage (garante navbar sincronizada)
    function updateNavbarFromStorage() {
      var cached = getCachedProf();
      if (cached && (cached.id || cached.nome || cached.foto)) {
        applyProfToUI(cached);
      }
    }

    // inverte: inicia chat com contexto (busca servidor, persiste e atualiza UI)
    async function startChatWithContext(ctx) {
      if (!ctx || !ctx.id) return;
      if (el.__switching) return;
      el.__switching = true;

      if (window.ChatCore && ChatCore.teardown) ChatCore.teardown();
      if (listEl) listEl.innerHTML = '<div style="color:#777;font-size:13px;">Carregando conversa...</div>';

      var server = await fetchProfInfo(ctx.id);
      if (server) {
        if (server.nome) ctx.nome = server.nome;
        if (server.foto) ctx.foto = server.foto;
        if (server.email) ctx.email = server.email;
        if (server.escolinha) ctx.escolinha = server.escolinha;
      }

      persistProfStorage(ctx);
      applyProfToUI(ctx);
      el.__chatCtxId = Number(ctx.id);

      var meuId = parseInt(localStorage.getItem('userId') || sessionStorage.getItem('userId'), 10);
      if (!meuId || isNaN(meuId)) { el.__switching = false; return; }

      try {
        if (window.ChatCore && ChatCore.init) {
          await ChatCore.init({ professorId: ctx.id, alunoId: meuId, meuId: meuId, meRole: 'aluno', pageEl: el });
        }
      } finally {
        el.__switching = false;
      }
    }

    function ensureContextAndStart() {
      var ctx = resolveProfContext(pageDetail);
      if (!ctx || !ctx.id) return;
      // sempre inicia (garante troca)
      startChatWithContext(ctx);
    }

    // apply any existing cached immediately
    updateNavbarFromStorage();
    // and try to start if query/id present
    ensureContextAndStart();

    // Polling: observa mudanças no storage e força atualização
    if (el.__profPollInterval) clearInterval(el.__profPollInterval);
    el.__profPollInterval = setInterval(function () {
      var cachedNow = getCachedProf();
      var last = el.__chatLastApplied || {};
      var lastId = el.__chatCtxId || last.id || null;
      var newId = cachedNow.id || null;
      var nameChanged = (String((cachedNow.nome || '')).trim() !== String((last.nome || '')).trim());
      var fotoChanged = (String((cachedNow.foto || '')).trim() !== String((last.foto || '')).trim());
      var idChanged = (newId && (!lastId || Number(newId) !== Number(lastId)));

      if (idChanged || nameChanged || fotoChanged) {
        // aplica imediatamente a navbar
        applyProfToUI(cachedNow);
        // e inicia/atualiza chat se tiver id
        if (cachedNow.id) {
          startChatWithContext(cachedNow);
        } else {
          persistProfStorage(null);
        }
      }
    }, 400);

    el.__chatCleanup = function () {
      if (el.__profPollInterval) { clearInterval(el.__profPollInterval); el.__profPollInterval = null; }
      if (window.ChatCore && ChatCore.teardown) ChatCore.teardown();
      el.__chatCtxId = null;
      el.__switching = false;
      el.__chatLastApplied = { id: null, nome: null, foto: null };
    };
  }

  // global click hook: se link/elemento contém data-chat-prof-* grava storage antes da navegação
  document.addEventListener('click', function (e) {
    try {
      var a = e.target.closest && e.target.closest('[data-chat-prof-id]');
      if (!a) return;
      var id = a.getAttribute('data-chat-prof-id');
      var nome = a.getAttribute('data-chat-prof-nome') || a.getAttribute('data-chat-prof-name') || '';
      var foto = a.getAttribute('data-chat-prof-foto') || '';
      if (id) localStorage.setItem('chatProfessorId', String(id));
      if (nome) { localStorage.setItem('chatProfNome', nome); localStorage.setItem('chatProfessorNome', nome); } else { localStorage.removeItem('chatProfNome'); localStorage.removeItem('chatProfessorNome'); }
      if (foto) { localStorage.setItem('chatProfFoto', foto); localStorage.setItem('chatProfessorFoto', foto); } else { localStorage.removeItem('chatProfFoto'); localStorage.removeItem('chatProfessorFoto'); }
    } catch (err) { /* silent */ }
  }, true);

  // page lifecycle handlers
  document.addEventListener('page:init', function (e) {
    var d = e && e.detail;
    if (!d || d.name !== 'chat_aluno') return;
    boot(d.el || e.target, d);
  });
  document.addEventListener('page:afterin', function (e) {
    var d = e && e.detail;
    if (!d || d.name !== 'chat_aluno') return;
    // quando a página fica visível, force update imediato
    try { var el = d.el || e.target; if (el) (function(){ var fn = el.__chatCleanup ? null : null; /* no-op; boot should have run */ })(); } catch (_) {}
  });
  document.addEventListener('page:reinit', function (e) {
    var d = e && e.detail;
    if (!d || d.name !== 'chat_aluno') return;
    boot(d.el || e.target, d);
  });
  document.addEventListener('page:beforeout', function (e) {
    var d = e && e.detail;
    if (!d || d.name !== 'chat_aluno') return;
    var el = d.el || e.target;
    if (el && el.__chatCleanup) el.__chatCleanup();
  });

  function bootStandalone() {
    var el = document.querySelector('[data-name="chat_aluno"]');
    if (!el) return;
    boot(el, { route: { query: parseQuery() } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootStandalone);
  else setTimeout(bootStandalone, 0);

  // storage event (other tabs/windows)
  window.addEventListener('storage', function () {
    var el = document.querySelector('[data-name="chat_aluno"]');
    if (!el) return;
    try { if (el.__profPollInterval == null) boot(el, { route: { query: parseQuery() } }); } catch (_) {}
  });
})();