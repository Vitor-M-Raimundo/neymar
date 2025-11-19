//INICIALIZAÇÃO DO F7 QUANDO DISPOSITIVO ESTÁ PRONTO
document.addEventListener('deviceready', onDeviceReady, false);

// Navigation history tracker
window.navigationHistory = [];
window.maxHistorySize = 10;

function addToHistory(route) {
	if (route && route !== window.navigationHistory[window.navigationHistory.length - 1]) {
		window.navigationHistory.push(route);
		if (window.navigationHistory.length > window.maxHistorySize) {
			window.navigationHistory.shift();
		}
	}
}

function getPreviousRoute() {
	// Remove current route if it's the last in history
	if (window.navigationHistory.length > 1) {
		return window.navigationHistory[window.navigationHistory.length - 2];
	}
	return '/index/'; // Default fallback
}

let exitDialog = null;
let exitDialogOpen = false;

function handleUniversalBackButton(e) {
	if (e) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
	}

	// Fecha teclado antes de qualquer coisa
	if (isTextInputFocused()) {
		hideKeyboard(() => fixBars());
		return;
	}

	const currentRoute = mainView.router.currentRoute.path;

	// Páginas raiz
	const isRoot = currentRoute === '/index/' || currentRoute === '/prof/' || currentRoute === '/inicio/';

	if (isRoot) {
		// Se já existe um dialog aberto, não criar outro
		if (exitDialogOpen) {
			return;
		}

		exitDialogOpen = true;

		// Reusa instância se já criada
		if (!exitDialog) {
			exitDialog = app.dialog.create({
				title: 'Sair do ProAtleta',
				text: 'Quer mesmo sair do ProAtleta?',
				closeByBackdropClick: false,
				buttons: [
					{
						text: 'Não',
						cssClass: 'dialog-cancel',
						onClick: () => {
							exitDialogOpen = false;
							// garante fechamento se algo ficar preso
							try { exitDialog.close(); } catch (_) { }
						}
					},
					{
						text: 'Sim',
						cssClass: 'dialog-ok',
						onClick: () => {
							exitDialogOpen = false;
							try { navigator.app.exitApp(); } catch (_) { }
						}
					}
				],
				on: {
					closed: () => { exitDialogOpen = false; }
				}
			});
		} else {
			// Atualiza estado caso tenha sido fechado manualmente
			exitDialog.on('closed', () => { exitDialogOpen = false; });
		}

		exitDialog.open();
	} else {
		// Navegação normal (voltar)
		const previousRoute = getPreviousRoute();
		mainView.router.navigate(previousRoute, { force: true });
	}
}

function isTextInputFocused() {
	const ae = document.activeElement;
	return !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));
}

function hideKeyboard(done) {
	try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (_) { }
	try {
		if (window.Keyboard && typeof window.Keyboard.hide === 'function') Keyboard.hide();
		else if (window.cordova?.plugins?.Keyboard?.close) cordova.plugins.Keyboard.close();
	} catch (_) { }
	setTimeout(() => { if (typeof done === 'function') done(); }, 120);
}

function fixBars() {
	try {
		const page = document.querySelector('.view-main .page-current');
		const pageName = page?.getAttribute('data-name');

		// IGNORAR nas páginas de edição (elas terão handler próprio)
		if (pageName === 'editar_prof' || pageName === 'editar_aluno') return;

		const pageContent = page?.querySelector('.page-content');
		if (pageContent) {
			const header = page.querySelector('.top-nav, .top-nav2') || document.querySelector('.top-nav, .top-nav2');
			let headerH = 0;
			if (header) {
				headerH = Math.round(header.offsetHeight || header.getBoundingClientRect().height || 0);
				if (!headerH) {
					const cs = getComputedStyle(header);
					const v = parseInt(cs.height, 10);
					if (!isNaN(v)) headerH = v;
				}
			}
			// Só aplica padding-top nas páginas que já usavam fixBars (ex: perfil_prof)
			if (pageName === 'perfil_prof') {
				pageContent.style.paddingTop = headerH ? headerH + 'px' : '80px';
			} else {
				pageContent.style.paddingTop = '';
			}
		}
		const tabbar = document.querySelector('.toolbar-bottom');
		if (tabbar) {
			tabbar.style.position = 'fixed';
			tabbar.style.left = '0';
			tabbar.style.right = '0';
			tabbar.style.bottom = '0';
			tabbar.style.transform = 'translate3d(0,0,0)';
		}
	} catch (_) { }
}

function queueFixBars() {
	[0, 60, 180, 360].forEach((t) => setTimeout(fixBars, t));
}

function fixBarsEditar() {
	try {
		const page = document.querySelector('.view-main .page-current');
		if (!page) return;
		const name = page.getAttribute('data-name');
		if (name !== 'editar_prof' && name !== 'editar_aluno') return;

		const content = page.querySelector('.page-content');
		if (!content) return;

		const header = page.querySelector('.top-nav, .top-nav2') || document.querySelector('.top-nav, .top-nav2');
		const headerH = header ? Math.round(header.getBoundingClientRect().height) || 80 : 80;

		const tabbar = document.querySelector('.toolbar-bottom');
		const tabH = tabbar ? (tabbar.offsetHeight || 56) : 56;

		content.style.paddingTop = headerH + 'px';
		content.style.paddingBottom = 'calc(env(safe-area-inset-bottom,0) + ' + tabH + 'px)';
		content.style.boxSizing = 'border-box';
		content.style.overflowY = (name === 'editar_aluno') ? 'hidden' : 'auto'; // não rola no aluno
		content.scrollTop = 0;

		if (tabbar) {
			tabbar.style.position = 'fixed';
			tabbar.style.left = '0';
			tabbar.style.right = '0';
			tabbar.style.bottom = '0';
			tabbar.style.transform = 'translate3d(0,0,0)';
		}
	} catch (e) { }
}

function queueFixBarsEditar() {
	[0, 80, 200].forEach(t => setTimeout(fixBarsEditar, t));
}

function setupEditarGuards(pageEl) {
	if (!pageEl) return;
	const name = pageEl.getAttribute('data-name') || pageEl.dataset?.name;

	// NUNCA registra centralização no aluno (evita “subir/cortar”)
	if (name === 'editar_aluno') {
		queueFixBarsEditar();
		// reforço visual para não rolar no aluno
		const content = pageEl.querySelector('.page-content');
		if (content) content.style.overflowY = 'hidden';
		return;
	}

	// Para editar_prof: centraliza campo focado e readapta ao teclado
	const content = pageEl.querySelector('.page-content') || pageEl;

	const onVV = () => {
		fixBarsEditar();
		const ae = document.activeElement;
		if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) {
			try { ae.scrollIntoView({ block: 'center', inline: 'nearest' }); }
			catch (_) { ae.scrollIntoView(true); }
		}
	};

	const onFocusIn = (e) => {
		if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
			setTimeout(() => {
				fixBarsEditar();
				try { e.target.scrollIntoView({ block: 'center', inline: 'nearest' }); }
				catch (_) { e.target.scrollIntoView(true); }
			}, 50);
		}
	};

	pageEl.__editar_onVV = onVV;
	pageEl.__editar_onFocusIn = onFocusIn;

	if (window.visualViewport) window.visualViewport.addEventListener('resize', onVV);
	content.addEventListener('focusin', onFocusIn, true);

	queueFixBarsEditar();
}

function teardownEditarGuards(pageEl) {
	if (!pageEl) return;
	const content = pageEl.querySelector('.page-content') || pageEl;

	if (window.visualViewport && pageEl.__editar_onVV) {
		window.visualViewport.removeEventListener('resize', pageEl.__editar_onVV);
	}
	if (pageEl.__editar_onFocusIn) {
		content.removeEventListener('focusin', pageEl.__editar_onFocusIn, true);
	}

	delete pageEl.__editar_onVV;
	delete pageEl.__editar_onFocusIn;
}
function stabilizeEditarAluno() {
	const page = document.querySelector('.page[data-name="editar_aluno"]');
	if (!page) return;
	const content = page.querySelector('.page-content');
	if (!content) return;

	// Garante posição inicial
	function resetScroll() {
		// Cancela qualquer scroll acumulado
		window.scrollTo(0, 0);
		document.documentElement.scrollTop = 0;
		content.scrollTop = 0;
	}

	// Evita scrollIntoView automático do navegador
	function preventNativeScroll(e) {
		if (e.target.matches('#senha_change, #tel_change, #email_change')) {
			// Força reposicionamento estável
			resetScroll();
			// Reserva espaço inferior se teclado reduzir o viewport
			if (window.visualViewport) {
				const vv = window.visualViewport;
				const keyboardHeight = (window.innerHeight - vv.height);
				if (keyboardHeight > 0) {
					content.style.paddingBottom = (keyboardHeight + 12) + 'px';
				} else {
					content.style.paddingBottom = '56px';
				}
			}
		}
	}

	// Remove qualquer transform/padding temporário quando sai do foco
	function onBlur(e) {
		if (e.target.matches('#senha_change, #tel_change, #email_change')) {
			content.style.paddingBottom = '56px';
			resetScroll();
		}
	}

	// Ao mudar tamanho do viewport (teclado abre/fecha) manter tudo preso
	function onVV() {
		resetScroll();
		// Reaplica paddingBottom coerente se ainda focado
		const ae = document.activeElement;
		if (ae && ae.matches('#senha_change, #tel_change, #email_change')) {
			const vv = window.visualViewport;
			const keyboardHeight = (window.innerHeight - vv.height);
			content.style.paddingBottom = (keyboardHeight > 0 ? keyboardHeight + 12 : 56) + 'px';
		} else {
			content.style.paddingBottom = '56px';
		}
	}

	// Evita centralizações anteriores (se setupEditarGuards foi usado)
	page.__editar_onFocusIn && page.removeEventListener('focusin', page.__editar_onFocusIn, true);
	if (window.visualViewport && page.__editar_onVV) {
		window.visualViewport.removeEventListener('resize', page.__editar_onVV);
	}

	// Registra novos handlers
	content.addEventListener('focusin', preventNativeScroll, true);
	content.addEventListener('focusout', onBlur, true);
	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', onVV);
	}

	// Guarda para limpeza futura
	page.__aluno_stab_cleanup = () => {
		content.removeEventListener('focusin', preventNativeScroll, true);
		content.removeEventListener('focusout', onBlur, true);
		if (window.visualViewport) window.visualViewport.removeEventListener('resize', onVV);
	};

	// Primeira estabilização
	resetScroll();
}

function onDeviceReady() {
	let initialUrl = '/index/'; // URL padrão para alunos

	// Verifica se o usuário está logado
	if (localStorage.getItem('loggedIn') === 'true') {
		const userType = localStorage.getItem('userType'); // Obtém o tipo de usuário do localStorage

		// Define a URL inicial com base no tipo de usuário
		if (userType === 'prof') {
			initialUrl = '/prof/';
		}
	}

	// Cria a view principal com a URL inicial
	window.mainView = app.views.create('.view-main', { url: initialUrl });

	console.log(`Aplicativo inicializado com a URL: ${initialUrl}`);

	// Remove this duplicate line - the universal handler is already added in each page's pageInit
	// document.addEventListener("backbutton", handleUniversalBackButton, false);

	// Remove this duplicate deviceready listener
	// document.addEventListener("deviceready", onDeviceReady, false);

	// Adicionar tratamento especial para a rota da agenda
	app.views.main.router.on('routeChange', function (newRoute, previousRoute, router) {
		console.log('Mudança de rota detectada:', newRoute.path);

		if (newRoute.path === '/agenda/') {
			console.log('🗓️ Navegando para agenda - preparando inicialização...');

			// Aguardar um pouco para garantir que a página foi carregada
			setTimeout(() => {
				if (typeof window.initCalendario === 'function') {
					console.log('🗓️ Forçando inicialização do calendário via rota...');
					window.initCalendario();
				} else {
					console.warn('⚠️ Função initCalendario não encontrada');
				}
			}, 500);
		}
	});
}

window.app = new Framework7({
	// App root element
	el: '#app',
	// App Name
	name: 'ProAtleta',
	// App id
	id: 'com.myapp.test',
	// Enable swipe panel
	panel: {
		swipe: true,
	},
	dialog: {
		buttonOk: 'Ok',
		buttonCancel: 'Cancelar',
	},
	// Add default routes
	routes: [
		{
			path: '/inicio/',
			url: 'inicio.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida

					const cssId = 'inicio-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/inicio.css';
						link.media = 'all';
						head.appendChild(link);
					}

				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit({ page }) {
					// fazer algo quando a página for inicializada

					// Remove CSS antigo da agenda se existir
					const oldCss = document.getElementById('agenda-css');
					if (oldCss) {
						oldCss.parentNode.removeChild(oldCss);
					}

					const oldIndexCss = document.getElementById('index-css');
					if (oldIndexCss) {
						oldIndexCss.parentNode.removeChild(oldIndexCss);
					}

					const oldLoginCss = document.getElementById('login-css');
					if (oldLoginCss) {
						oldLoginCss.parentNode.removeChild(oldLoginCss);
					}

					const css = document.getElementById('login-css');
					if (css) css.remove();


					const cssId = 'inicio-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/inicio.css';
						link.media = 'all';
						head.appendChild(link);
					}

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// fazer algo antes da página ser removida do DOM

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}

					const css = document.getElementById('inicio-css');
					if (css) css.remove();
				},
			}
		},

		{
			path: '/login/',
			url: 'login.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit: function (event, page) {
					// fazer algo quando a página for inicializada

					// Remove CSS antigo da agenda se existir
					const oldCss = document.getElementById('agenda-css');
					if (oldCss) {
						oldCss.parentNode.removeChild(oldCss);
					}

					const oldIndexCss = document.getElementById('index-css');
					if (oldIndexCss) {
						oldIndexCss.parentNode.removeChild(oldIndexCss);
					}

					const css = document.getElementById('inicio-css');
					if (css) css.remove();

					const cssId = 'login-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/login.css';
						link.media = 'all';
						head.appendChild(link);
					}

					if (localStorage.getItem('loggedIn') === 'true') {
						app.views.main.router.navigate('/index/');
					}



					$.getScript('js/login.js');

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// fazer algo antes da página ser removida do DOM

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},

		{
			path: '/cadastro/',
			url: 'cadastro.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit({ page }) {
					// fazer algo quando a página for inicializada

					// Remove CSS antigo da agenda se existir
					const oldCss = document.getElementById('agenda-css');
					if (oldCss) {
						oldCss.parentNode.removeChild(oldCss);
					}

					const oldLoginCss = document.getElementById('login-css');
					if (oldLoginCss) {
						oldLoginCss.parentNode.removeChild(oldLoginCss);
					}

					const inicioCss = document.getElementById('inicio-css');
					if (inicioCss) inicioCss.remove();

					const cssId = 'cadastro-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/cadastro.css';
						link.media = 'all';
						head.appendChild(link);
					}

					$.getScript('js/cadastro.js')
					$.getScript('js/mascara_cadastro.js')

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},

				pageBeforeRemove: function (event, page) {
					// fazer algo antes da página ser removida do DOM

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}

					removeCSS('css/cadastro.css');
				},
			}
		},

		{
			path: '/cadastro_prof/',
			url: 'cadastro_prof.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit({ page }) {
					// fazer algo quando a página for inicializada

					// Remove CSS antigo da agenda se existir
					const oldCss = document.getElementById('agenda-css');
					if (oldCss) {
						oldCss.parentNode.removeChild(oldCss);
					}

					const oldLoginCss = document.getElementById('login-css');
					if (oldLoginCss) {
						oldLoginCss.parentNode.removeChild(oldLoginCss);
					}

					const inicioCss = document.getElementById('inicio-css');
					if (inicioCss) inicioCss.remove();

					const cssId = 'cadastro-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/cadastro.css';
						link.media = 'all';
						head.appendChild(link);
					}

					$.getScript('js/cadastro_prof.js')
					$.getScript('js/mascara_cadastro.js')

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},

				pageBeforeRemove: function (event, page) {
					// fazer algo antes da página ser removida do DOM

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}

					removeCSS('css/cadastro.css');
				},
			}
		},

		{
			path: '/cadastro_prof2/',
			url: 'cadastro_prof2.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit({ page }) {
					// Remove CSS antigo da agenda se existir
					const oldCss = document.getElementById('agenda-css');
					if (oldCss) {
						oldCss.parentNode.removeChild(oldCss);
					}

					const oldLoginCss = document.getElementById('login-css');
					if (oldLoginCss) {
						oldLoginCss.parentNode.removeChild(oldLoginCss);
					}

					const inicioCss = document.getElementById('inicio-css');
					if (inicioCss) inicioCss.remove();

					const cssId = 'cadastro-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/cadastro.css';
						link.media = 'all';
						head.appendChild(link);
					}

					$.getScript('js/cadastro2_prof.js')

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},

				pageBeforeRemove: function (event, page) {
					// fazer algo antes da página ser removida do DOM

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}

					removeCSS('css/cadastro.css');
				},
			}
		},

		{
			path: '/cadastro2/',
			url: 'cadastro2.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit({ page }) {
					// Remove CSS antigo da agenda se existir
					const oldCss = document.getElementById('agenda-css');
					if (oldCss) {
						oldCss.parentNode.removeChild(oldCss);
					}

					const oldLoginCss = document.getElementById('login-css');
					if (oldLoginCss) {
						oldLoginCss.parentNode.removeChild(oldLoginCss);
					}

					const inicioCss = document.getElementById('inicio-css');
					if (inicioCss) inicioCss.remove();

					const cssId = 'cadastro-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/cadastro.css';
						link.media = 'all';
						head.appendChild(link);
					}

					$.getScript('js/cadastro2.js')

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},

				pageBeforeRemove: function (event, page) {
					// fazer algo antes da página ser removida do DOM

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}

					removeCSS('css/cadastro.css');
				},
			}
		},

		{
			path: '/escolha_cadastro/',
			url: 'escolha_cadastro.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit: function (event, page) {
					// Remove CSS antigo da agenda se existir
					const oldCss = document.getElementById('agenda-css');
					if (oldCss) {
						oldCss.parentNode.removeChild(oldCss);
					}
					const oldLoginCss = document.getElementById('login-css');
					if (oldLoginCss) {
						oldLoginCss.parentNode.removeChild(oldLoginCss);
					}
					const inicioCss = document.getElementById('inicio-css');
					if (inicioCss) inicioCss.remove();

					const cssId = 'cadastro-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/cadastro.css';
						link.media = 'all';
						head.appendChild(link);
					}

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},

		{
			path: '/index/',
			url: 'index.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					// Limpa cache se mudou o tipo de usuário
					const currentUserType = localStorage.getItem('userType');
					const lastUserType = localStorage.getItem('lastUserType');

					console.log('pageBeforeIn /index/ - userType atual:', currentUserType, 'anterior:', lastUserType);

					if (currentUserType !== lastUserType) {
						limparCacheUsuario();
						localStorage.setItem('lastUserType', currentUserType);
					}
				},
				pageAfterIn: function (event, page) {
					// Força recarregamento dos dados do usuário
					console.log('pageAfterIn /index/ - carregando dados do aluno');
					setTimeout(() => carregarDadosUsuarioFresh('aluno'), 200);
				},
				pageInit: function (event, page) {

					const cssToRemove = [
						'login-css',
						'cadastro-css',
						'treino-css',
						'agenda-css',
						'perfil-aluno-css',
						'popup-solicitacoes-css',
						'popup-prof-css',
						'proatleta-plus-css',
						'popup-prof-css',
						'config-css',
						'chat-aluno-css',
						'ver-treinos-prof-css',
						'escolinhas-css',
					];

					cssToRemove.forEach(cssId => {
						const oldCss = document.getElementById(cssId);
						if (oldCss) {
							oldCss.parentNode.removeChild(oldCss);
							console.log(`Removido CSS antigo: ${cssId}`);
						}
					});

					const cssId = 'index-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/index.css';
						link.media = 'all';
						head.appendChild(link);
					}

					document.addEventListener('DOMContentLoaded', function () {
						atualizarTabbarPorTipoUsuario();
					});

					$.getScript('js/index.js');
					$.getScript('js/push.js');

					var swiper = new Swiper(".mySwiper", {
						slidesPerView: 1,
						spaceBetween: 30,
						autoplay: true,
						delay: 3000,
						loop: true,
						breakpoints: {
							0: {
								slidesPerView: 1,
								spaceBetween: 30
							},
							640: {
								slidesPerView: 2,
								spaceBetween: 30
							},
							992: {
								slidesPerView: 3,
								spaceBetween: 30
							},
							1200: {
								slidesPerView: 4,
								spaceBetween: 30
							},

						}
					});

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},
		{
			path: '/proatletaplus/',
			url: 'proatletaplus.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit: function (event, page) {

					const cssToRemove = [
						'inicio-css',
						'treino-css',
						'agenda-css',
						'perfil-aluno-css',
						'config-css',
						'escolinhas-css',
						'chat-aluno-css',
						'popup-solicitacoes-css',
						'popup-prof-css',
						'ver-treinos-prof-css',
					];

					cssToRemove.forEach(cssId => {
						const oldCss = document.getElementById(cssId);
						if (oldCss) {
							oldCss.parentNode.removeChild(oldCss);
							console.log(`Removido CSS antigo: ${cssId}`);
						}
					});

					const cssId = 'proatleta-plus-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/proatletaplus.css';
						link.media = 'all';
						head.appendChild(link);
					}

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},

		{
			path: '/treinos_aluno/',
			url: 'treinos_aluno.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit: function (event, page) {

					const cssToRemove = [
						'inicio-css',
						'proatleta-plus-css',
						'agenda-css',
						'perfil-aluno-css',
						'config-css',
						'escolinhas-css',
						'chat-aluno-css',
						'popup-solicitacoes-css',
						'popup-prof-css',
						'ver-treinos-prof-css',
					];

					cssToRemove.forEach(cssId => {
						const oldCss = document.getElementById(cssId);
						if (oldCss) {
							oldCss.parentNode.removeChild(oldCss);
							console.log(`Removido CSS antigo: ${cssId}`);
						}
					});

					const cssId = 'treinos-aluno-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/treinos_aluno.css';
						link.media = 'all';
						head.appendChild(link);
					}

					$.getScript('js/treinos_aluno.js');

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},
		{
			path: '/ver_treinos_prof/',
			url: 'ver_treinos_prof.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit: function (event, page) {
					// fazer algo quando a página for inicializada

					// Remover CSS específico ao sair
					const css = document.getElementById('ver-exercicios-prof-css');
					if (css) css.remove();

					const cssId = 'ver-treinos-prof-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/ver_treinos_prof.css';
						link.media = 'all';
						head.appendChild(link);
					}

					const cssIndexId = 'index-css';
					if (!document.getElementById(cssIndexId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssIndexId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/index.css';
						link.media = 'all';
						head.appendChild(link);
					}

					$.getScript('js/ver_treinos_prof.js');
				},
				pageBeforeRemove: function (event, page) {
					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},
		{
			path: '/ver_treinos_aluno/',
			url: 'ver_treinos_aluno.html',
			animate: false,
			on: {
				pageInit: function (event, page) {

					// Remover CSS específico ao sair
					const css = document.getElementById('ver-exercicios-aluno-css');
					if (css) css.remove();

					const cssId = 'ver-treinos-aluno-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/ver_treinos_aluno.css';
						link.media = 'all';
						head.appendChild(link);
					}

					const cssIndexId = 'index-css';
					if (!document.getElementById(cssIndexId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssIndexId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/index.css';
						link.media = 'all';
						head.appendChild(link);
					}

					$.getScript('js/ver_treinos_aluno.js')
				},
				pageBeforeRemove: function (event, page) {
					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},
		{
			path: '/ver_exercicios_prof/',
			url: 'ver_exercicios_prof.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit: function (event, page) {
					// fazer algo quando a página for inicializada

					// Remover CSS específico ao sair
					const css = document.getElementById('ver-exercicios-prof-css');
					if (css) css.remove();

					const cssId = 'ver-exercicios-prof-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/ver_exercicios_prof.css';
						link.media = 'all';
						head.appendChild(link);
					}

					const cssIndexId = 'index-css';
					if (!document.getElementById(cssIndexId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssIndexId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/index.css';
						link.media = 'all';
						head.appendChild(link);
					}

					$.getScript('js/ver_exercicios_prof.js');
				},
				pageBeforeRemove: function (event, page) {
					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},
		{
			path: '/ver_exercicios_aluno/',
			url: 'ver_exercicios_aluno.html',
			animate: false,
			on: {
				pageInit: function (event, page) {

					// Remover CSS da lista de treinos do aluno para evitar conflito
					const oldTreinosAlunoCss = document.getElementById('treinos-aluno-css');
					if (oldTreinosAlunoCss) {
						oldTreinosAlunoCss.parentNode.removeChild(oldTreinosAlunoCss);
					}

					// Carregar CSS correto da página de exercícios do aluno
					const cssId = 'ver-exercicios-aluno-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/ver_exercicios_aluno.css';
						link.media = 'all';
						head.appendChild(link);
					}

					// Garantir CSS base
					const cssIndexId = 'index-css';
					if (!document.getElementById(cssIndexId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssIndexId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/index.css';
						link.media = 'all';
						head.appendChild(link);
					}

					// Carregar JS correto da página de exercícios do aluno
					$.getScript('js/ver_exercicios_aluno.js');
				},
				pageBeforeRemove: function (event, page) {
					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},

		{
			path: '/agenda/',
			url: 'agenda.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					// Apenas log, sem inicialização aqui
					console.log('📱 Preparando página da agenda...');

					// Limpar variáveis globais para permitir nova inicialização
					if (typeof window.calendarioInstance !== 'undefined') {
						window.calendarioInstance = null;
					}
				},
				pageAfterIn: function (event, page) {
					// ÚNICA inicialização controlada após página estar visível
					console.log('📱 Página agenda totalmente carregada');
					setTimeout(() => {
						if (typeof window.initCalendario === 'function') {
							console.log('🗓️ Inicializando calendário via pageAfterIn...');
							window.initCalendario();
						} else {
							console.warn('⚠️ Função initCalendario não encontrada');
						}
					}, 300);
				},
				pageInit: function (event, page) {

					const cssToRemove = [
						'config-css',
						'agenda-css',
						'perfil-aluno-css',
						'popup-solicitacoes-css',
						'popup-prof-css',
						'popup-prof-css',
						'ver-treinos-prof-css',
						'escolinhas-css',
					];

					cssToRemove.forEach(cssId => {
						const oldCss = document.getElementById(cssId);
						if (oldCss) {
							oldCss.parentNode.removeChild(oldCss);
							console.log(`Removido CSS antigo: ${cssId}`);
						}
					});

					const cssId = 'agenda-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/agenda.css';
						link.media = 'all';
						head.appendChild(link);
					}

					// Verificar se o script já foi carregado anteriormente
					if (typeof window.initCalendario === 'function') {
						console.log('Script agenda.js já existe, aguardando pageAfterIn...');
						// NÃO inicializar aqui, deixar para pageAfterIn
					} else {
						console.log('Carregando script agenda.js...');
						// Carrega JavaScript da agenda com callback
						$.getScript('js/agenda.js')
							.done(function (script, textStatus) {
								console.log('Script agenda.js carregado com sucesso:', textStatus);
								// NÃO inicializar aqui, deixar para pageAfterIn
							})
							.fail(function (jqxhr, settings, exception) {
								console.error('Erro ao carregar agenda.js:', exception);
							});
					}

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					console.log('Agenda: pageBeforeRemove - Limpando recursos...');

					// Limpar completamente todas as instâncias e flags
					if (typeof window.calendarioInstance !== 'undefined') {
						window.calendarioInstance = null;
					}

					// Limpar flag de inicialização (se existir globalmente)
					if (typeof window.isInitializing !== 'undefined') {
						window.isInitializing = false;
					}

					// Remover apenas o CSS da agenda
					const agendaCss = document.getElementById('agenda-css');
					if (agendaCss) {
						agendaCss.parentNode.removeChild(agendaCss);
					}

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},
		{
			path: '/agenda_prof/',
			url: 'agenda_prof.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
				},
				pageAfterIn: function (event, page) {
				},
				pageInit: function (event, page) {

					const oldIndexCss = document.getElementById('index-prof-css');
					if (oldIndexCss) {
						oldIndexCss.parentNode.removeChild(oldIndexCss);
					}

					const oldAgendaAlunoCss = document.getElementById('agenda-aluno-css');
					if (oldAgendaAlunoCss) {
						oldAgendaAlunoCss.parentNode.removeChild(oldAgendaAlunoCss);
					}

					const oldPerfilCss = document.getElementById('perfil-css');
					if (oldPerfilCss) {
						oldPerfilCss.parentNode.removeChild(oldPerfilCss);
					}


					// Adiciona o CSS específico da agenda_prof
					const cssId = 'agenda-prof-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/agenda_prof.css';
						link.media = 'all';
						head.appendChild(link);
					}

					// Carrega o JS da agenda_prof
					$.getScript('js/agenda_prof.js')
						.done(function () {
							console.log('agenda_prof.js carregado');
						})
						.fail(function (jqxhr, settings, exception) {
							console.error('Erro ao carregar agenda_prof.js:', exception);
						});

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// Remove o CSS da agenda_prof ao sair da página

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},
		{
			path: '/link5/',
			url: 'link5.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {

				},
				pageInit: function (event, page) {

					const cssToRemove = [
						'config-css',
						'agenda-css',
						'treinos-aluno-css',
						'proatleta-plus-css',
						'index-css',
						'chat-aluno-css',
						'ver-treinos-prof-css',
						'escolinhas-css',
						'editar-aluno-css',
					];

					cssToRemove.forEach(cssId => {
						const oldCss = document.getElementById(cssId);
						if (oldCss) {
							oldCss.parentNode.removeChild(oldCss);
							console.log(`Removido CSS antigo: ${cssId}`);
						}
					});

					const cssId = 'perfil-aluno-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/perfil_aluno.css';
						link.media = 'all';
						head.appendChild(link);
					}

					const cssPopupId = 'popup-solicitacoes-css';
					if (!document.getElementById(cssPopupId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssPopupId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/popup_solicitacao.css';
						link.media = 'all';
						head.appendChild(link);
					}

					const cssPopupprof = 'popup-prof-css';
					if (!document.getElementById(cssPopupprof)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssPopupprof;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/popup_prof.css';
						link.media = 'all';
						head.appendChild(link);
					}


					// Scripts gerais da página
					$.getScript('js/config.js');
					$.getScript('js/salvar_foto.js');
					$.getScript('js/popup_solicitacoes.js');
					$.getScript('js/popup_associados.js');

					// Inicialização do Sheet Modal
					const btnprof = page.el.querySelector("#btnProfessores");
					const btnass = page.el.querySelector("#btnAssociados");
					const sheet = page.el.querySelector("#sheetProfessores");
					const sheet2 = page.el.querySelector("#sheetAssociado");
					const closeBtn = sheet ? sheet.querySelector(".close-sheet") : null;
					const closeBtn2 = sheet2 ? sheet2.querySelector(".close-sheet2") : null;

					if (btnprof && sheet && closeBtn) {
						btnprof.addEventListener("click", function (e) {
							e.preventDefault();
							app.sheet.open(sheet);
						});

						closeBtn.addEventListener("click", function () {
							app.sheet.close(sheet);
						});
					}

					if (btnass && sheet2 && closeBtn2) {
						btnass.addEventListener("click", function (e) {
							e.preventDefault();
							app.sheet.open(sheet2);
						});

						closeBtn2.addEventListener("click", function () {
							app.sheet.close(sheet2);
						});
					}

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageAfterIn: function (event, page) {

					const cssId = 'perfil-aluno-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/perfil_aluno.css';
						link.media = 'all';
						head.appendChild(link);
					}

				},
				pageBeforeRemove: function (event, page) {
					// Clean up any inline styles that might have been added
					document.querySelectorAll('link[href*="perfil"]').forEach(link => {
						if (link.id && (link.id.includes('perfil') || link.id.includes('popup'))) {
							link.remove();
						}
					});

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}

				},
			},
		},


		{
			path: '/config/',
			url: 'config.html',
			animate: true, // <- animação ativada
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida

					$.getScript('js/config.js');
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit: function (event, page) {
					// fazer algo quando a página for inicializada
					const cssToRemove = [
						'index-prof-css',
						'treino-prof-css',
						'perfil-css',
						'agenda-css'
					];

					cssToRemove.forEach(cssId => {
						const oldCss = document.getElementById(cssId);
						if (oldCss) {
							oldCss.parentNode.removeChild(oldCss);
							console.log(`Removido CSS antigo: ${cssId}`);
						}
					});

					const cssId = 'index-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/index.css';
						link.media = 'all';
						head.appendChild(link);
					}

					if (localStorage.getItem('loggedIn') !== 'true') {
						app.views.main.router.navigate('/inicio/');
						return;
					}
					// Exibe os dados do usuário na página, por exemplo:
					document.getElementById('nomeUsuario').textContent = localStorage.getItem('userNome') || 'Usuário';
					document.getElementById('emailUsuario').textContent = localStorage.getItem('userEmail') || '';

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// fazer algo antes da página ser removida do DOM

					const css = document.getElementById('index-css');
					if (css) css.remove();

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},
		{
			path: '/escolinhas/',
			url: 'escolinhas.html',
			animate: true, // <- animação ativada
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit: function (event, page) {
					// Remove CSS antigo da agenda se existir
					const oldCss = document.getElementById('agenda-css');
					if (oldCss) {
						oldCss.parentNode.removeChild(oldCss);
					}

					const cssId = 'escolinhas-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/escolinhas.css';
						link.media = 'all';
						head.appendChild(link);
					}

					$.getScript("js/escolinha.js");
					console.log('Página escolinhas carregada');

					const input = page.el.querySelector('#endereco');
					const resultados = page.el.querySelector('#resultados');
					const enderecoDiv = page.el.querySelector('#endereco-escolinha');
					const clearBtn = page.el.querySelector('.icon.clear');

					function toggleClear() {
						if (input.value.trim() !== '') {
							clearBtn.style.display = 'block';
						} else {
							clearBtn.style.display = 'none';
						}
					}

					function clearInput() {
						input.value = '';
						toggleClear();
						input.focus();
					}

					input.addEventListener('input', toggleClear);
					clearBtn.addEventListener('click', clearInput);

					input.addEventListener('keypress', (e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							buscarEscolinhas(page);
						}
					});

					const btnBuscar = page.el.querySelector('#btnBuscar');
					btnBuscar.addEventListener('click', () => {
						buscarEscolinhas(page);
					});
					
					// Expor função de geolocalização globalmente
					window.buscarPorLocalizacao = buscarPorLocalizacao;

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// fazer algo antes da página ser removida do DOM

					const css = document.getElementById('inicio-css');
					if (css) css.remove();

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},
		{
			path: '/esporte_escolinha/',
			url: 'esporte_escolinha.html',
			animate: true, // <- animação ativada
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit: function (event, page) {
					// Remove CSS antigo da agenda se existir
					const oldCss = document.getElementById('agenda-css');
					if (oldCss) {
						oldCss.parentNode.removeChild(oldCss);
					}

					const oldEscolinhasCss = document.getElementById('escolinhas-css');
					if (oldEscolinhasCss) {
						oldEscolinhasCss.parentNode.removeChild(oldEscolinhasCss);
					}

					const cssId = 'esporte-escolinha-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/index.css';
						link.media = 'all';
						head.appendChild(link);
					}

					// Lógica dos botões diretamente no pageInit
					const buttons = page.el.querySelectorAll('.sport-button');
					const linkContainer = page.el.querySelector('#goToEscolinhas');

					buttons.forEach(btn => {
						btn.addEventListener('click', () => {
							buttons.forEach(b => b.classList.remove('selected'));
							btn.classList.add('selected');
							const esporte = btn.dataset.sport;
							localStorage.setItem('esporteSelecionado', esporte);
							linkContainer.style.display = 'block';
						});
					});

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function () {
					// Remove o CSS da página ao sair dela
					const css = document.getElementById('esporte-escolinha-css');
					if (css) css.remove();
				},
			}
		},
		{
			path: '/peneiras/',
			url: 'peneiras.html',
			animate: true, // <- animação ativada
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit: function (event, page) {
					// Remove CSS antigo da agenda se existir
					const oldCss = document.getElementById('agenda-css');
					if (oldCss) {
						oldCss.parentNode.removeChild(oldCss);
					}

					// fazer algo quando a página for inicializada
				},
				pageBeforeRemove: function (event, page) {
					// fazer algo antes da página ser removida do DOM
				},
			}
		},
		{
			path: '/prof/',
			url: 'index_prof.html',
			animate: true,
			on: {
				pageBeforeIn: function (event, page) {
					// Limpa cache se mudou o tipo de usuário
					const currentUserType = localStorage.getItem('userType');
					const lastUserType = localStorage.getItem('lastUserType');

					console.log('pageBeforeIn /prof/ - userType atual:', currentUserType, 'anterior:', lastUserType);

					if (currentUserType !== lastUserType) {
						limparCacheUsuario();
						localStorage.setItem('lastUserType', currentUserType);
					}
				},
				pageAfterIn: function (event, page) {
					// Força recarregamento dos dados do usuário
					console.log('pageAfterIn /prof/ - carregando dados do professor');
					setTimeout(() => carregarDadosUsuarioFresh('prof'), 200);
				},
				pageInit: function (event, page) {
					// fazer algo quando a página for inicializada

					const cssToRemove = [
						'login-css',
						'cadastro-css',
						'inicio-css',
						'perfil-css',
						'agenda-prof-css'
					];

					cssToRemove.forEach(cssId => {
						const oldCss = document.getElementById(cssId);
						if (oldCss) {
							oldCss.parentNode.removeChild(oldCss);
							console.log(`Removido CSS antigo: ${cssId}`);
						}
					});


					const cssId = 'index-prof-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/index_prof.css';
						link.media = 'all';
						head.appendChild(link);
					}

					$.getScript('js/index_prof.js');

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},
		{
			path: '/teste/',
			url: 'teste.html',
			animate: true,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida
				},
				pageInit: function (event, page) {
					// fazer algo quando a página for inicializada
				},
				pageBeforeRemove: function (event, page) {
					// fazer algo antes da página ser removida do DOM
				},
			}
		},
		{
			path: '/perfil_prof/',
			url: 'perfil_prof.html',
			animate: true,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida

					const cssId = 'perfil-css';
					if (!document.getElementById(cssId)) {
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/perfil.css';
						link.media = 'all';
						link.addEventListener('load', () => queueFixBars()); // AJUSTE APÓS CSS
						document.head.appendChild(link);
					} else {
						queueFixBars();
					}

					const cssPopupAluno = 'popup_alunos-css';
					if (!document.getElementById(cssPopupAluno)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssPopupAluno;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/popup_alunos.css';
						link.media = 'all';
						head.appendChild(link);
					}

					const css = document.getElementById('agenda-prof-css');
					if (css) css.remove();

					const cssChatProf = document.getElementById('chat-prof-css');
					if (cssChatProf) cssChatProf.remove();

					const csseditar = document.getElementById('editar-prof-css');
					if (csseditar) csseditar.remove();

				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida

					queueFixBars();

					const cssId = 'perfil-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/perfil.css';
						link.media = 'all';
						head.appendChild(link);
					}

				},
				pageInit: function (event, page) {
					// fazer algo quando a página for inicializada

					const oldCss = document.getElementById('treinos-prof-css');
					if (oldCss) {
						oldCss.parentNode.removeChild(oldCss);
					}

					const oldAgendaCss = document.getElementById('agenda-prof-css');
					if (oldAgendaCss) {
						oldAgendaCss.parentNode.removeChild(oldAgendaCss);
					}

					const cssId = 'perfil-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/perfil.css';
						link.media = 'all';
						head.appendChild(link);
					}

					// Inicializa os scripts necessários
					$.getScript('js/config.js');
					$.getScript('js/foto_prof.js');
					$.getScript('js/solicitacao.js');
					$.getScript('js/popup_alunos.js');

					// Inicializa o Swiper
					var swiper1 = new Swiper(".mySwiper_prof", {
						slidesPerView: 1,
						spaceBetween: 30,
						loop: false,
						pagination: {
							el: ".swiper-pagination",
							clickable: true,
						},
						navigation: {
							nextEl: ".swiper-button-next",
							prevEl: ".swiper-button-prev",
						},
					});

					// Configura o botão para abrir o Sheet Modal
					const btnAlunos = page.el.querySelector("#btnAlunos");
					const sheetAlunos = page.el.querySelector("#sheetAlunos");
					const closeAlunos = sheetAlunos ? sheetAlunos.querySelector(".close-sheet2") : null;

					if (btnAlunos && sheetAlunos && closeAlunos) {
						btnAlunos.addEventListener("click", function (e) {
							e.preventDefault();
							app.sheet.open(sheetAlunos);
						});

						closeAlunos.addEventListener("click", function () {
							app.sheet.close(sheetAlunos);
						});
					}

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);
					page.backButtonHandler = handleBackButton;

					// GARANTA O AJUSTE APÓS MONTAR O DOM
					queueFixBars();
				},
				pageBeforeRemove: function (event, page) {
					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},
		{
			path: '/treinos_prof/',
			url: 'treinos_prof.html',
			animate: true,
			on: {
				pageBeforeIn: function (event, page) {

				},
				pageAfterIn: function (event, page) {

				},
				pageInit: function (event, page) {
					console.log('Página treinos_prof inicializando...');

					// Remove CSS antigo da agenda se existir - com mais CSS para limpar
					const cssToRemove = [
						'agenda-prof-css',
						'perfil-css',
						'adicionar-treino-css',
						'agenda-css'
					];

					cssToRemove.forEach(cssId => {
						const oldCss = document.getElementById(cssId);
						if (oldCss) {
							oldCss.parentNode.removeChild(oldCss);
							console.log(`Removido CSS antigo: ${cssId}`);
						}
					});

					// Garantir que o CSS correto está carregado
					const cssId = 'treinos-prof-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/treinos_prof.css';
						link.media = 'all';
						head.appendChild(link);
						console.log('CSS treinos_prof adicionado');
					}

					// Carregar o script treinos_prof.js
					$.getScript('js/treinos_prof.js')
						.done(function (script, textStatus) {
							console.log('treinos_prof.js carregado com sucesso:', textStatus);
						})
						.fail(function (jqxhr, settings, exception) {
							console.error('Erro ao carregar treinos_prof.js:', exception);

							// Fallback: executar lógica básica inline
							setTimeout(() => {
								carregarAlunosFallback();
							}, 500);
						});

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// NÃO remover o CSS aqui para evitar problemas quando voltando

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},
		// Rota para adicionar treino
		{
			path: '/adicionar_treino/',
			url: 'adicionar_treinos.html',
			animate: true,
			on: {
				pageBeforeIn: function (event, page) {
					console.log('adicionar_treino: pageBeforeIn');

					// Limpar CSS conflitantes antes de carregar a página
					const conflictingCss = [
						'treinos-prof-css',
						'ver-treinos-aluno-css',
						'ver-treinos-prof-css',
						'agenda-css',
						'perfil-css'
					];

					conflictingCss.forEach(cssId => {
						const element = document.getElementById(cssId);
						if (element) {
							element.parentNode.removeChild(element);
						}
					});
				},
				pageInit: function (event, page) {
					console.log('adicionar_treino: pageInit');

					// Carrega o script de adicionar treino
					$.getScript('js/adicionar_treino.js');

					// Remove CSS conflitantes
					const oldCss = document.getElementById('treinos-prof-css');
					if (oldCss) {
						oldCss.parentNode.removeChild(oldCss);
					}

					// Adiciona CSS específico
					const cssId = 'adicionar-treino-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/adicionar_treino.css';
						link.media = 'all';
						head.appendChild(link);
					}

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					console.log('adicionar_treino: pageBeforeRemove');
					// Limpar CSS específico ao sair
					const css = document.getElementById('adicionar-treino-css');
					if (css) {
						css.parentNode.removeChild(css);
					}

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				}
			}
		},



		{
			path: '/agenda_aluno/',
			url: 'agenda_aluno.html',
			animate: false,
			on: {
				pageBeforeIn: function (event, page) {
					console.log('Preparando para carregar agenda do aluno...');
				},
				pageAfterIn: function (event, page) {
					// Não inicializar imediatamente, deixar o loading screen aparecer primeiro
					console.log('Página agenda do aluno carregada, iniciando em 200ms...');
				},
				pageInit: function (event, page) {
					console.log('Inicializando página agenda_aluno...');

					// Remove CSS antigo se existir
					const oldCss = document.getElementById('agenda-aluno-css');
					if (oldCss) {
						oldCss.parentNode.removeChild(oldCss);
					}

					const oldAgendaProfCss = document.getElementById('agenda-prof-css');
					if (oldAgendaProfCss) {
						oldAgendaProfCss.parentNode.removeChild(oldAgendaProfCss);
					}

					const oldAgendaCss = document.getElementById('agenda-css');
					if (oldAgendaCss) {
						oldAgendaCss.parentNode.removeChild(oldAgendaCss);
					}

					// Adiciona o CSS específico da agenda do aluno
					const cssId = 'agenda-aluno-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/agenda_aluno.css';
						link.media = 'all';
						head.appendChild(link);
					}

					// Aguardar CSS carregar e então carregar o JS
					setTimeout(() => {
						$.getScript('js/agenda_aluno.js')
							.done(function () {
								console.log('agenda_aluno.js carregado com sucesso');

								// Aguardar mais um pouco para garantir que tudo está pronto
								setTimeout(() => {
									if (typeof initAgendaAluno === 'function') {
										console.log('Inicializando agenda do aluno...');
										initAgendaAluno();
									} else {
										console.error('Função initAgendaAluno não encontrada');
									}
								}, 100);
							})
							.fail(function (jqxhr, settings, exception) {
								console.error('Erro ao carregar agenda_aluno.js:', exception);

								// Mostrar erro de carregamento
								const overlay = document.getElementById('loadingOverlay');
								if (overlay) {
									overlay.innerHTML = `
										<div class="loading-content">
											<div class="loading-spinner" style="color: #ff4444;">
												<i class="ri-error-warning-line"></i>
											</div>
											<h3>Erro ao Carregar</h3>
											<p>Não foi possível carregar os recursos necessários</p>
											<button onclick="location.reload()" style="background: white; color: var(--laranja); border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 20px;">
												Tentar Novamente
											</button>
										</div>
									`;
								}
							});
					}, 200);
				},
				pageBeforeRemove: function (event, page) {
					console.log('Agenda Aluno: pageBeforeRemove');

					// Limpar instância
					if (typeof window.agendaAlunoInstance !== 'undefined') {
						window.agendaAlunoInstance = null;
					}

					// Remover CSS
					const css = document.getElementById('agenda-aluno-css');
					if (css) css.remove();

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}
				},
			}
		},

		{
			path: '/chat_aluno/',
			url: 'chat_aluno.html',
			animate: true,
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida
				},
				pageInit: function (event, page) {
					// Adiciona o CSS da página

					const css = document.getElementById('perfil_aluno-css');
					if (css) css.remove();

					const oldPerfilCss = document.getElementById('perfil-aluno-css');
					if (oldPerfilCss) {
						oldPerfilCss.parentNode.removeChild(oldPerfilCss);
					}

					const oldPopupSolicitacoesCss = document.getElementById('popup-solicitacoes-css');
					if (oldPopupSolicitacoesCss) {
						oldPopupSolicitacoesCss.parentNode.removeChild(oldPopupSolicitacoesCss);
					}

					const oldPopupProfCss = document.getElementById('popup-prof-css');
					if (oldPopupProfCss) {
						oldPopupProfCss.parentNode.removeChild(oldPopupProfCss);
					}

					const cssChatAluno = 'chat-aluno-css';
					if (!document.getElementById(cssChatAluno)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssChatAluno;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/chat_aluno.css';
						link.media = 'all';
						head.appendChild(link);
					}

					// Carrega o script da página
					$.getScript('js/chat_aluno.js');

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// Remove o CSS da página ao sair dela
				},
			}
		},

		{
			path: '/chat_prof/',
			url: 'chat_prof.html',
			animate: true,
			on: {
				pageInit: function (event, page) {

					const css = document.getElementById('perfil-css');
					if (css) css.remove();

					const cssId = 'chat-prof-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/chat_aluno.css';
						link.media = 'all';
						head.appendChild(link);
					}

					$.getScript('js/chat_prof.js');


					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function () {
					const css = document.getElementById('chat-prof-css');
					if (css) css.remove();

				},
			},
		},

		{
			path: '/editar_aluno/',
			url: 'editar_perfil_aluno.html',
			animate: true, // <- animação ativada
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida

					const css = document.getElementById('perfil-aluno-css');
					if (css) css.remove();

					queueFixBarsEditar();

				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida

					queueFixBarsEditar();

				},
				pageInit: function (event, page) {
					// fazer algo quando a página for inicializada

					const cssId = 'editar-aluno-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/editar_perfil.css';
						link.media = 'all';
						head.appendChild(link);
					}

					$.getScript('js/config.js');
					$.getScript('js/salvar_foto.js');
					$.getScript('js/editar_aluno.js');
					$.getScript('js/mascara_cadastro.js');

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					stabilizeEditarAluno();
					queueFixBarsEditar();


					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// fazer algo antes da página ser removida do DOM

					const css = document.getElementById('editar-aluno-css');

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}

					if (page.el.__aluno_stab_cleanup) page.el.__aluno_stab_cleanup();

				},
			}
		},

		{
			path: '/editar_prof/',
			url: 'editar_perfil_prof.html',
			animate: true, // <- animação ativada
			on: {
				pageBeforeIn: function (event, page) {
					// fazer algo antes da página ser exibida

					const css = document.getElementById('perfil-prof-css');
					if (css) css.remove();

					queueFixBarsEditar();

				},
				pageAfterIn: function (event, page) {
					// fazer algo depois da página ser exibida

					queueFixBarsEditar();

				},
				pageInit: function (event, page) {
					// fazer algo quando a página for inicializada

					const cssId = 'editar-prof-css';
					if (!document.getElementById(cssId)) {
						const head = document.head;
						const link = document.createElement('link');
						link.id = cssId;
						link.rel = 'stylesheet';
						link.type = 'text/css';
						link.href = 'css/editar_perfil.css';
						link.media = 'all';
						head.appendChild(link);
					}

					$.getScript('js/config.js');
					$.getScript('js/salvar_foto.js');
					$.getScript('js/editar_prof.js');
					$.getScript('js/mascara_cadastro.js');

					// Add back button listener for this page
					const handleBackButton = (e) => handleUniversalBackButton(e);
					document.addEventListener("backbutton", handleBackButton, false);

					queueFixBarsEditar();
					setupEditarGuards(page.el);

					// Store reference to remove later
					page.backButtonHandler = handleBackButton;
				},
				pageBeforeRemove: function (event, page) {
					// fazer algo antes da página ser removida do DOM

					const css = document.getElementById('editar-prof-css');

					// Remove back button listener
					if (page.backButtonHandler) {
						document.removeEventListener("backbutton", page.backButtonHandler, false);
					}

					teardownEditarGuards(page.el);

				},
			}
		},

	],

});

var tabbar = document.querySelector('.toolbar-bottom');


//Para testes direto no navegador
var mainView = app.views.create('.view-main', { url: '/index/' });

//EVENTO PARA SABER O ITEM DO MENU ATUAL
app.on('routeChange', function (route) {
	addToHistory(route.url);
	protegerRotas(route);

	const paginasSemTabbar = [
		'/inicio/', '/cadastro/', '/login/', '/chat_aluno/', '/chat_prof/',
		'/escolha_cadastro/', '/cadastro2/', '/cadastro_prof/', '/cadastro_prof2/'
	];
	if (tabbar) {
		tabbar.style.display = paginasSemTabbar.includes(route.url) ? 'none' : 'flex';
	}
	document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));
	const targetEl = document.querySelector('.tab-link[href="' + route.url + '"]');
	if (targetEl) targetEl.classList.add('active');

	if (route.url && route.url !== '/config/' && !route.url.startsWith('http')) {
		window.lastNonConfigRoute = route.url;
	}

	// use fila de ajustes para garantir após CSS/render
	queueFixBars(); // geral (ignora editar páginas)
	if (route.url === '/editar_aluno/' || route.url === '/editar_prof/') {
		queueFixBarsEditar();
	}

});

// ÚNICO listener do visualViewport
if (window.visualViewport) {
	window.visualViewport.addEventListener('resize', () => {
		setTimeout(fixBars, 40);
	});
}

// Guarda a última rota que não seja /config/
window.lastNonConfigRoute = '/index/';

function onDeviceReady() {
	let initialUrl = '/inicio/';
	if (localStorage.getItem('loggedIn') === 'true') {
		const userType = localStorage.getItem('userType');
		initialUrl = (userType === 'prof') ? '/prof/' : '/index/';
	}

	if (!window.mainView) {
		window.mainView = app.views.create('.view-main', { url: initialUrl });
	}
	setTimeout(fixBars, 60);

	app.views.main.router.on('routeChange', function (newRoute) {
		if (newRoute.path === '/agenda/') {
			setTimeout(() => {
				if (typeof window.initCalendario === 'function') {
					window.initCalendario();
				}
			}, 500);
		}
	});

	// Cria a view principal com a URL inicial
	window.mainView = app.views.create('.view-main', { url: initialUrl });

	// Adicionar tratamento especial para a rota da agenda
	app.views.main.router.on('routeChange', function (newRoute, previousRoute, router) {
		console.log('Mudança de rota detectada:', newRoute.path);

		if (newRoute.path === '/agenda/') {
			console.log('🗓️ Navegando para agenda - preparando inicialização...');

			// Aguardar um pouco para garantir que a página foi carregada
			setTimeout(() => {
				if (typeof window.initCalendario === 'function') {
					console.log('🗓️ Forçando inicialização do calendário via rota...');
					window.initCalendario();
				} else {
					console.warn('⚠️ Função initCalendario não encontrada');
				}
			}, 500);
		}
	});
}

function protegerRotas(route) {
	const paginasProtegidas = [
		'/adicionar_treino/',
		'/agenda_prof/',
		'/agenda/',
		'/agenda_aluno/',
		'/cadastro/',
		'/config/',
		'/escolinhas/',
		'/esporte_escolinha/',
		'/index_prof/',
		'/index/',
		'/inicio/',
		'/link5/',
		'/login/',
		'/peneiras/',
		'/perfil_prof/',
		'/proatletaplus/',
		'/treinos_aluno/',
		'/treinos_prof/',
		'/ver_treinos_aluno/',
		'/ver_treinos_prof/',
		'/ver_exercicios_prof/',
		'/ver_exercicios_aluno/',
		'/chat_aluno/',
		'/chat_prof/'
	];

	const estaLogado = localStorage.getItem('loggedIn') === 'true';

	if (paginasProtegidas.includes(route.url) && !estaLogado) {
		console.log('Tentativa de acesso sem login. Redirecionando para /inicio/');
		app.views.main.router.navigate('/inicio/', { clearPreviousHistory: true });
		return false;
	}
	return true;
}

// ========================================
// FUNÇÃO FALLBACK PARA TREINOS_PROF
// ========================================

// Expor funções globalmente para uso nos botões
window.carregarAlunos = carregarAlunos;
window.adicionarTreino = adicionarTreino;
window.verTreinos = verTreinos;
window.irParaPerfil = irParaPerfil;
window.filtrarAlunos = filtrarAlunos;

// Add this function after the existing functions
function limparCacheUsuario() {
	// Remove dados específicos do usuário anterior
	localStorage.removeItem('userFoto');
	localStorage.removeItem('userNome');
	console.log('Cache do usuário limpo');
}

function carregarDadosUsuarioFresh(userType) {
	const email = localStorage.getItem('userEmail');
	if (!email) return;

	console.log('Carregando dados frescos para:', userType);

	// Usar o mesmo endpoint dos perfis (sem /php/)
	fetch('https://proatleta.site/get_usuario.php?email=' + encodeURIComponent(email))
		.then(response => response.json())
		.then(data => {
			if (data.success && data.usuario) {
				// Atualiza localStorage com dados frescos
				localStorage.setItem('userNome', data.usuario.nome);
				localStorage.setItem('userFoto', data.usuario.foto || 'img/user.jpg');

				console.log('Dados atualizados:', data.usuario.nome, data.usuario.foto);

				// Força atualização da UI após 100ms para garantir que elementos existam
				setTimeout(() => {
					const nameEl = document.getElementById('welcomeUserName');
					const photoEl = document.getElementById('welcomeUserPhoto');

					if (nameEl) nameEl.textContent = data.usuario.nome;
					if (photoEl) photoEl.src = data.usuario.foto || 'img/user.jpg';

					console.log('UI atualizada com dados frescos');
				}, 100);
			}
		})
		.catch(error => {
			console.error('Erro ao carregar dados do usuário:', error);
		});

}


