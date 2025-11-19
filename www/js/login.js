// Inicialização idempotente dos listeners globais (evita registrar múltiplas vezes)
(function initLogin() {
  if (window.__loginListenersInstalled) return;
  window.__loginListenersInstalled = true;

  const setup = function () {
    // Sempre busque os elementos dentro da página de login atual
    const pageEl = document.querySelector('.page[data-name="login"]') || document;

    // Handler do formulário de login
    const loginForm = pageEl.querySelector('#loginForm');
    if (loginForm && !loginForm.__loginHandlerAdded) {
      loginForm.__loginHandlerAdded = true;
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // obter elementos no momento do submit (caso DOM tenha sido recriado)
        const mensagemLogin = pageEl.querySelector('#mensagemLogin');
        const email = pageEl.querySelector('#email') ? pageEl.querySelector('#email').value : '';
        const senha = pageEl.querySelector('#senha') ? pageEl.querySelector('#senha').value : '';

        fetch('https://proatleta.site/login.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `email=${encodeURIComponent(email)}&senha=${encodeURIComponent(senha)}`
        })
          .then(response => response.json())
          .then(data => {
            console.log(data);

            if (data.success) {
              const categoria = data.categoria || 'aluno';
              const nome = data.nome || 'Usuário';
              const id = data.id;

              localStorage.setItem('loggedIn', 'true');
              localStorage.setItem('userNome', nome);
              localStorage.setItem('userEmail', email);
              localStorage.setItem('userType', categoria);
              localStorage.setItem('userId', id);

              if (categoria === 'prof') {
                localStorage.setItem('professor_id', id);
              } else {
                localStorage.setItem('aluno_id', id);
              }

              if (typeof atualizarTabbarPorTipoUsuario === 'function') {
                atualizarTabbarPorTipoUsuario();
              }

              // proteger uso de app.dialog caso app não esteja disponível
              try {
                if (window.app && app.dialog && app.views && app.views.main) {
                  app.dialog.create({
                    title: 'Sucesso',
                    text: 'Login bem-sucedido!',
                    buttons: [
                      {
                        text: 'Entrar',
                        onClick: function () {
                          const rota = (categoria === 'prof') ? '/prof/' : '/index/';
                          app.views.main.router.navigate(rota, {
                            reloadCurrent: true,
                            ignoreCache: true,
                            clearPreviousHistory: true
                          });
                        }
                      }
                    ]
                  }).open();
                } else {
                  // fallback simples
                  alert('Login bem-sucedido!');
                  window.location.href = (categoria === 'prof') ? '/prof/' : '/index/';
                }
              } catch (err) {
                console.error('Erro ao mostrar dialog:', err);
                alert('Login bem-sucedido!');
              }
            } else {
              // re-obter elemento de mensagem antes de usar
              const msgEl = pageEl.querySelector('#mensagemLogin');
              if (msgEl) msgEl.innerText = data.message || 'Email ou senha incorretos.';
              else alert(data.message || 'Email ou senha incorretos.');
            }
          })
          .catch(error => {
            const msgEl = pageEl.querySelector('#mensagemLogin');
            if (msgEl) msgEl.innerText = 'Erro ao fazer login.';
            else alert('Erro ao fazer login.');
            console.error(error);
          });
      });
    }

    // Toggle senha (mostrar/ocultar)
    const toggleIcon = pageEl.querySelector('.password-toggle-icon');
    const senhaInput = pageEl.querySelector('#senha');
    if (toggleIcon && senhaInput && !toggleIcon.__toggleAdded) {
      toggleIcon.__toggleAdded = true;
      toggleIcon.addEventListener('click', function () {
        const type = senhaInput.getAttribute('type') === 'password' ? 'text' : 'password';
        senhaInput.setAttribute('type', type);
        this.classList.toggle('ri-eye-line');
        this.classList.toggle('ri-eye-off-line');
      });
    }

    // Botão voltar
    const btnVoltar = pageEl.querySelector('#btnVoltar');
    if (btnVoltar && !btnVoltar.__backAdded) {
      btnVoltar.__backAdded = true;
      btnVoltar.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.app && app.views && app.views.main) {
          try {
            app.views.main.router.back();
            return;
          } catch (err) { /* fallback */ }
        }
        window.location.href = 'index.html';
      });
    }

    // Link "Esqueceu sua senha?"
    const forgotLink = pageEl.querySelector('#forgotLink');
    if (forgotLink && !forgotLink.__forgotAdded) {
      forgotLink.__forgotAdded = true;
      forgotLink.addEventListener('click', function (e) {
        e.preventDefault();
        const url = this.getAttribute('href') || 'https://proatleta.site/html/esqueci_senha.html';
        if (window.cordova && cordova.InAppBrowser) {
          cordova.InAppBrowser.open(url, '_system');
        } else {
          window.open(url, '_blank', 'noopener');
        }
      });
    }
  };

  // chamar setup no carregamento inicial do DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

  // Framework7: quando a página for inicializada, rodar setup novamente (re-registra handlers para DOM recriado)
  document.addEventListener('page:init', function (e) {
    // quando F7 usa page.name / data-name
    const pageName = e && e.detail && (e.detail.name || (e.detail.route && e.detail.route.name));
    if (pageName === 'login' || (e.detail && e.detail.el && e.detail.el.querySelector && e.detail.el.querySelector('#loginForm'))) {
      // pequenas checagens para garantir que é a página de login
      setup();
    }
  });

  // export opcional para inicialização manual
  window.initLogin = setup;
})();