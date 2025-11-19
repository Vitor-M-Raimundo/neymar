(function () {
  // Evita redefinir em hot-reload
  if (window.ChatCore) return;

  var API_BASE = 'https://proatleta.site';
  var POLL_MS = 1800;

  function apiUrl(path) {
    var url = API_BASE + path;
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return url + sep + '__ts=' + Date.now();
  }

  function qs(el, sel) { return el ? el.querySelector(sel) : null; }

  function escHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function parseYMDHIS(s) {
    if (!s) return new Date();
    var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
    if (!m) return new Date(s);
    return new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +(m[6]||0));
  }

  function formatTimeStr(s) {
    var d = parseYMDHIS(s);
    var hh = String(d.getHours()).padStart(2,'0');
    var mm = String(d.getMinutes()).padStart(2,'0');
    return hh + ':' + mm;
  }

  function createMsgEl(msg, isMe) {
    var side = isMe ? 'me' : 'other';
    var wrap = document.createElement('div');
    wrap.className = 'message ' + side;

    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = escHtml(msg.conteudo || '');

    var time = document.createElement('div');
    time.className = 'time';
    time.textContent = formatTimeStr(msg.criado);

    wrap.appendChild(bubble);
    wrap.appendChild(time);
    return wrap;
  }

  function scrollToBottom(list) { try { list.scrollTop = list.scrollHeight + 2000; } catch(e){} }

  function isMyMessage(st, msg) {
    if (msg.hasOwnProperty('remetente_professor') && msg.remetente_professor !== null && msg.remetente_professor !== undefined) {
      var fromRole = Number(msg.remetente_professor) === 0 ? 'professor' : 'aluno';
      return fromRole === st.meRole;
    }
    if (st.professorId !== st.alunoId) {
      if (st.meRole === 'professor') return Number(msg.remetente_id) === Number(st.professorId);
      return Number(msg.remetente_id) === Number(st.alunoId);
    }
    return Number(msg.remetente_id) === Number(st.meuId);
  }

  var ChatCore = {
    __state: null,

    init: async function (opts) {
      if (ChatCore.__state) ChatCore.teardown();

      var st = {
        pageEl: opts && opts.pageEl,
        professorId: opts && opts.professorId,
        alunoId: opts && opts.alunoId,
        meuId: opts && opts.meuId,
        meRole: (opts && opts.meRole) || ((opts && opts.meuId === opts.professorId) ? 'professor' : 'aluno'),
        form: null, input: null, btn: null, list: null,
        conversaId: null, ultimoId: 0, pollTimer: null, destroyed: false
      };

      st.form = qs(st.pageEl, '#chatForm');
      st.input = qs(st.pageEl, '#chatText');
      st.list  = qs(st.pageEl, '#chatMessages');
      if (st.form) st.btn = st.form.querySelector('button') || qs(st.form, '[type="submit"]');

      if (!st.form || !st.input || !st.list || !st.professorId || !st.alunoId || !st.meuId) return;

      try { st.form.setAttribute('onsubmit','return false'); st.form.setAttribute('action','javascript:void(0)'); } catch(e){}
      if (st.btn) st.btn.type = 'button';

      var onSend = function () {
        var txt = (st.input.value || '').trim();
        if (!txt) return;
        ChatCore.__ensureConversation(st).then(function(){ ChatCore.__enviar(st, txt); }).catch(function(){});
      };
      var onEnter = function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); onSend(); } };

      if (st.btn && st.btn.__onSend) st.btn.removeEventListener('click', st.btn.__onSend, false);
      if (st.input && st.input.__onEnter) st.input.removeEventListener('keydown', st.input.__onEnter, false);

      if (st.btn) { st.btn.__onSend = onSend; st.btn.addEventListener('click', onSend, false); }
      if (st.input) { st.input.__onEnter = onEnter; st.input.addEventListener('keydown', onEnter, false); }

      try { st.input.disabled = true; } catch(e){}
      // NÃO altere o conteúdo do botão (preserva ícone)
      try { if (st.btn) { st.btn.disabled = true; st.btn.dataset._html = st.btn.innerHTML; } } catch(e){}

      ChatCore.__state = st;

      try {
        await ChatCore.__ensureConversation(st);
        await ChatCore.__carregarInicial(st);
        ChatCore.__startPolling(st);
      } finally {
        if (!st.destroyed) {
          try { st.input.disabled = false; } catch(e){}
          // Só reabilita; não mude innerHTML/textContent
          try { if (st.btn) { st.btn.disabled = false; } } catch(e){}
        }
      }
    },

    teardown: function () {
      var st = ChatCore.__state; if (!st) return;
      st.destroyed = true;
      try { if (st.pollTimer) clearInterval(st.pollTimer); } catch(e){}
      st.pollTimer = null;
      try {
        if (st.btn && st.btn.__onSend) st.btn.removeEventListener('click', st.btn.__onSend, false);
        if (st.input && st.input.__onEnter) st.input.removeEventListener('keydown', st.input.__onEnter, false);
      } catch(e){}
      ChatCore.__state = null;
    },

    __ensureConversation: async function (st) {
      if (st.conversaId) return st.conversaId;
      var url = apiUrl('/conversa.php?professor_id=' + encodeURIComponent(st.professorId) + '&aluno_id=' + encodeURIComponent(st.alunoId));
      var res = await fetch(url, { method: 'GET', mode: 'cors' });
      var txt = await res.text();
      var data = null;
      try { data = JSON.parse(txt); } catch (e) { console.error('conversa.php não-JSON:', txt); throw e; }
      if (!res.ok || !data || !data.sucesso || !data.conversa_id) { console.error('conversa.php erro:', data); throw new Error('Falha ao criar/obter conversa'); }
      st.conversaId = Number(data.conversa_id);
      return st.conversaId;
    },

    __carregarInicial: async function (st) {
      if (!st.conversaId) return;
      var url = apiUrl('/chat_buscar.php?conversa_id=' + encodeURIComponent(st.conversaId) + '&limit=200');
      var res = await fetch(url, { method: 'GET', mode: 'cors' });
      var txt = await res.text();
      var data = null;
      try { data = JSON.parse(txt); } catch (e) { console.error('chat_buscar.php não-JSON:', txt); return; }
      if (!res.ok || !data || !data.sucesso) return;
      var msgs = data.mensagens || [];
      st.list.innerHTML = '';
      for (var i=0;i<msgs.length;i++) {
        var mine = isMyMessage(st, msgs[i]);
        st.list.appendChild(createMsgEl(msgs[i], mine));
        if (+msgs[i].id > st.ultimoId) st.ultimoId = +msgs[i].id;
      }
      scrollToBottom(st.list);
    },

    __startPolling: function (st) {
      if (st.pollTimer) clearInterval(st.pollTimer);
      st.pollTimer = setInterval(function(){ ChatCore.__poll(st); }, POLL_MS);
    },

    __poll: async function (st) {
      if (!st.conversaId) return;
      var after = st.ultimoId > 0 ? '&apos_id=' + encodeURIComponent(st.ultimoId) : '';
      var url = apiUrl('/chat_buscar.php?conversa_id=' + encodeURIComponent(st.conversaId) + after + '&limit=200');
      try {
        var res = await fetch(url, { method: 'GET', mode: 'cors' });
        if (res.status === 405) {
          if (st.pollTimer) { clearInterval(st.pollTimer); st.pollTimer = null; }
          return;
        }
        var txt = await res.text();
        var data = null;
        try { data = JSON.parse(txt); } catch (e) { console.error('chat_buscar.php (poll) não-JSON:', txt); return; }
        if (!res.ok || !data || !data.sucesso) return;
        var msgs = data.mensagens || [];
        if (!msgs.length) return;
        for (var i=0;i<msgs.length;i++) {
          var mine = isMyMessage(st, msgs[i]);
          st.list.appendChild(createMsgEl(msgs[i], mine));
          if (+msgs[i].id > st.ultimoId) st.ultimoId = +msgs[i].id;
        }
        scrollToBottom(st.list);
      } catch (e) { /* silencia */ }
    },

    __enviar: async function (st, texto) {
      if (!st.conversaId || !texto) return;
      try { st.input.disabled = true; } catch(e){}
      try { if (st.btn) st.btn.disabled = true; } catch(e){}

      var body = new URLSearchParams();
      body.set('conversa_id', String(st.conversaId));
      body.set('remetente_id', String(st.meuId));
      body.set('conteudo', String(texto));
      body.set('remetente_professor', st.meRole === 'professor' ? '0' : '1');

      try {
        var url = apiUrl('/chat_enviar.php');
        var res = await fetch(url, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: body.toString()
        });
        var txt = await res.text();
        var data = null;
        try { data = JSON.parse(txt); } catch (e) { console.error('chat_enviar.php não-JSON:', txt); return; }
        if (!res.ok || !data || !data.sucesso) { console.error('Falha no envio:', data); return; }

        var msg = {
          id: data.id,
          conversa_id: st.conversaId,
          remetente_id: st.meuId,
          conteudo: texto,
          criado: data.criado,
          remetente_professor: data.remetente_professor != null ? data.remetente_professor : (st.meRole === 'professor' ? 0 : 1)
        };
        st.list.appendChild(createMsgEl(msg, true));
        if (+msg.id > st.ultimoId) st.ultimoId = +msg.id;
        scrollToBottom(st.list);
        st.input.value = '';
      } finally {
        try { st.input.disabled = false; st.input.focus(); } catch(e){}
        try { if (st.btn) st.btn.disabled = false; } catch(e){}
      }
    }
  };

  window.ChatCore = ChatCore;
})();