(function () {
	'use strict';

	// Verificar se já foi inicializado globalmente
	if (window.SistemaTreinosAluno) {
		console.log('Sistema já existe, reinicializando...');
		window.SistemaTreinosAluno.reinicializar();
		return;
	}

	// Criar o sistema como singleton global
	window.SistemaTreinosAluno = {
		config: {
			// getUserId tenta várias chaves comuns no localStorage para maior compatibilidade
			getUserId: function () {
				return localStorage.getItem('userId')
					|| localStorage.getItem('user_id')
					|| localStorage.getItem('id')
					|| localStorage.getItem('userID')
					|| null;
			},
			inicializado: false,
			intervalos: [],
			professoresData: [] // Armazenar dados dos professores
		},

		utils: {
			// Tenta localizar o elemento de lista em várias possíveis localizações
			getListaContainer: () => {
				return document.getElementById('lista-professores')
					|| document.querySelector('.page[data-name="link3"] #lista-professores')
					|| document.querySelector('.page[data-name="treinos_aluno"] #lista-professores')
					|| document.querySelector('.view-main .page #lista-professores')
					|| null;
			},

			// Insere HTML no container com retries caso a página ainda não esteja no DOM
			insertHtmlWithRetries: (html, attempts = 6, delay = 100) => {
				return new Promise((resolve, reject) => {
					let tries = 0;
					const tryInsert = () => {
						tries++;
						const container = window.SistemaTreinosAluno.utils.getListaContainer();
						if (container) {
							container.innerHTML = html;
							console.log('HTML inserido em #lista-professores após', tries, 'tentativa(s)');
							resolve(container);
							return;
						}
						if (tries >= attempts) {
							console.warn('Não foi possível encontrar #lista-professores para inserir HTML após', tries, 'tentativas');
							reject(new Error('Container não encontrado'));
							return;
						}
						setTimeout(tryInsert, delay);
					};
					tryInsert();
				});
			},

			mostrarListaVazia: () => {
				const container = window.SistemaTreinosAluno.utils.getListaContainer();
				if (container) {
					container.innerHTML = `
						<div class="empty-state">
							<i class="mdi mdi-account-group-outline"></i>
							<h3>Nenhum professor encontrado</h3>
							<p>Você ainda não tem professores vinculados</p>
						</div>
					`;
				} else {
					console.warn('mostrarListaVazia: container #lista-professores não encontrado');
				}
			},

			mostrarErro: (mensagem) => {
				const container = window.SistemaTreinosAluno.utils.getListaContainer();
				if (container) {
					container.innerHTML = `
						<div class="empty-state">
							<i class="mdi mdi-alert-circle-outline"></i>
							<h3>Erro</h3>
							<p>${mensagem}</p>
							<button class="button button-fill" onclick="window.SistemaTreinosAluno.actions.carregarProfessores()">
								Tentar Novamente
							</button>
						</div>
					`;
				} else {
					console.error('mostrarErro: container #lista-professores não encontrado. Mensagem:', mensagem);
				}
			},

			criarCardProfessor: (professor) => {
				// sanitização mínima para evitar quebra do HTML caso campos contenham apóstrofos
				const id = String(professor.id).replace(/'/g, "\\'");
				const nome = (professor.nome_prof || 'Nome não disponível').replace(/</g, '&lt;').replace(/>/g, '&gt;');
				const email = (professor.email || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
				const foto = professor.foto || 'img/user.jpg';

				return `
					<li>
						<a href="/ver_treinos_prof/" class="item-link item-content" onclick="window.SistemaTreinosAluno.actions.verTreinosProfessor('${id}')">
							<div class="item-media">
								<img src="${foto}" class="professor-avatar" width="44" onerror="this.src='img/user.jpg'"/>
							</div>
							<div class="item-inner">
								<div class="item-title-row">
									<div class="item-title">${nome}</div>
								</div>
							</div>
						</a>
					</li>
				`;
			}
		},

		actions: {
			verTreinosProfessor: (professorId) => {
				console.log('Navegando para treinos do professor:', professorId);

				// Garantir que o professorId seja armazenado corretamente
				localStorage.setItem('professorSelecionado', professorId);

				// Buscar dados do professor na lista atual
				const professores = window.SistemaTreinosAluno.config.professoresData || [];
				const professorSelecionado = professores.find(p => String(p.id) === String(professorId));

				if (professorSelecionado) {
					// Armazenar dados completos do professor
					localStorage.setItem('professor_id', professorId);
					localStorage.setItem('professorNomeSelecionado', professorSelecionado.nome_prof || '');
					localStorage.setItem('professorEmailSelecionado', professorSelecionado.email || '');
					localStorage.setItem('professorFotoSelecionada', professorSelecionado.foto || '');
				}

				// Navegar para a página de treinos do professor
				if (typeof app !== 'undefined' && app.views && app.views.main && app.views.main.router) {
					app.views.main.router.navigate(`/ver_treinos_professor/?professor_id=${encodeURIComponent(professorId)}`);
				} else if (typeof mainView !== 'undefined' && mainView.router) {
					// fallback para instâncias antigas
					mainView.router.navigate(`/ver_treinos_professor/?professor_id=${encodeURIComponent(professorId)}`);
				} else {
					console.error('Framework7 não disponível para navegação');
				}
			},

			carregarProfessores: () => {
				const sistema = window.SistemaTreinosAluno;

				// Resolve o userId dinamicamente (tenta várias chaves)
				const resolvedUserId = sistema.config.getUserId();
				console.log('carregarProfessores: resolvedUserId ->', resolvedUserId);
				if (!resolvedUserId) {
					const userEmail = localStorage.getItem('userEmail');
					// Se não houver userId, tentar fallback por email (se o backend suportar)
					if (userEmail) {
						console.warn('userId não encontrado — tentando fallback por email:', userEmail);
					} else {
						console.error('userId não encontrado em localStorage');
						sistema.utils.mostrarErro('ID do usuário não encontrado. Faça login novamente.');
						return;
					}
				}
				// Mostra loader
				if (typeof app !== 'undefined' && app.dialog && app.dialog.preloader) {
					app.dialog.preloader('Carregando professores...');
				} else {
					console.warn('Framework7 app.dialog não disponível, prosseguindo sem loader');
				}

				// Faz requisição com URL completa (usa id quando disponível, senão tenta email)
				let url;
				if (resolvedUserId) {
					url = `https://proatleta.site/get_associados.php?id=${encodeURIComponent(resolvedUserId)}`;
				} else {
					const userEmail = localStorage.getItem('userEmail') || '';
					url = `https://proatleta.site/get_associados.php?email=${encodeURIComponent(userEmail)}`;
				}
				console.log('Fetch professores ->', url);

				fetch(url, { cache: 'no-store' })
					.then(response => {
						if (!response.ok) throw new Error(`HTTP ${response.status}`);
						return response.json();
					})
					.then(data => {
						// Fecha loader
						if (typeof app !== 'undefined' && app.dialog && app.dialog.close) {
							app.dialog.close();
						}

						console.log('Resposta get_associados (raw):', data);

						// Extrair a lista de professores de forma robusta (vários formatos possíveis)
						let professores = [];
						if (!data) {
							professores = [];
						} else if (Array.isArray(data.professores)) {
							professores = data.professores;
						} else if (Array.isArray(data.associados)) {
							professores = data.associados;
						} else if (Array.isArray(data.result)) {
							professores = data.result;
						} else if (Array.isArray(data)) {
							professores = data;
						} else if (data.data && Array.isArray(data.data.professores)) {
							professores = data.data.professores;
						}

						console.log('Professores extraídos:', professores.length, professores.slice(0, 5));

						if (professores && professores.length > 0) {
							// Armazenar dados dos professores
							sistema.config.professoresData = professores;

							const html = professores
								.map(sistema.utils.criarCardProfessor)
								.join('');

							// Insere o HTML tentando várias vezes caso a página ainda não esteja no DOM
							sistema.utils.insertHtmlWithRetries(html)
								.then(() => {
									// Reconfigura o input de busca para os novos elementos
									sistema.actions.configurarBusca();
									console.log('Lista de professores atualizada na UI');
								})
								.catch(err => {
									console.error('Falha ao inserir HTML na página de treinos:', err);
									// Em último caso, mostra erro visual
									sistema.utils.mostrarErro('Erro ao atualizar a lista de professores na tela.');
								});
						} else {
							console.log('Nenhum professor válido encontrado no payload.');
							sistema.utils.mostrarListaVazia();
						}
					})
					.catch(error => {
						console.error('Erro ao carregar professores:', error);
						if (typeof app !== 'undefined' && app.dialog && app.dialog.close) {
							app.dialog.close();
						}
						// Mostra erro com mais contexto
						sistema.utils.mostrarErro('Erro ao conectar com o servidor. Verifique sua conexão ou faça login novamente.');
					});
			},

			filtrarProfessores: (termo) => {
				const termoBusca = String(termo || '').toLowerCase();
				const cards = document.querySelectorAll('.item-link');
				cards.forEach(card => {
					const titleEl = card.querySelector('.item-title');
					const subEl = card.querySelector('.item-subtitle');
					const nome = titleEl ? titleEl.textContent.toLowerCase() : '';
					const email = subEl ? subEl.textContent.toLowerCase() : '';

					if (nome.includes(termoBusca) || email.includes(termoBusca)) {
						card.style.display = '';
					} else {
						card.style.display = 'none';
					}
				});
			},

			configurarBusca: () => {
				const searchInput = document.getElementById('buscarProfessor');
				if (searchInput) {
					// remover listener antigo caso exista (para evitar duplicação)
					if (searchInput._sistemaBuscaHandler) {
						searchInput.removeEventListener('input', searchInput._sistemaBuscaHandler);
					}
					const handler = (e) => {
						window.SistemaTreinosAluno.actions.filtrarProfessores(e.target.value);
					};
					searchInput.addEventListener('input', handler);
					searchInput._sistemaBuscaHandler = handler;
				}
			}
		},

		inicializar: () => {
			const sistema = window.SistemaTreinosAluno;
			console.log('Inicializando sistema de treinos do aluno...');

			sistema.actions.configurarBusca();
			sistema.actions.carregarProfessores();
			sistema.config.inicializado = true;
		},

		reinicializar: () => {
			const sistema = window.SistemaTreinosAluno;
			sistema.config.inicializado = false;
			sistema.config.intervalos.forEach(id => clearInterval(id));
			sistema.config.intervalos = [];
			sistema.inicializar();
		}
	};

	// Modificar os eventos de inicialização
	const executarInicializacao = () => {
		const container = window.SistemaTreinosAluno.utils.getListaContainer();
		if (container && !window.SistemaTreinosAluno.config.inicializado) {
			window.SistemaTreinosAluno.inicializar();
		}
	};

	// Eventos padrão
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', executarInicializacao);
	} else {
		executarInicializacao();
	}

	// Eventos para SPAs e Framework7
	document.addEventListener('page:init', (e) => {
		// se a página tiver nome específico, inicializa
		if (e && e.detail && (e.detail.name === 'link3' || e.detail.name === 'treinos_aluno')) {
			setTimeout(executarInicializacao, 100);
		}
	});

	document.addEventListener('page:reinit', (e) => {
		if (e && e.detail && (e.detail.name === 'link3' || e.detail.name === 'treinos_aluno')) {
			setTimeout(executarInicializacao, 100);
		}
	});

	if (typeof app !== 'undefined' && app.on) {
		app.on('pageInit', (page) => {
			if (page && (page.name === 'link3' || page.name === 'treinos_aluno')) {
				setTimeout(executarInicializacao, 100);
			}
		});

		app.on('pageBeforeIn', (page) => {
			if (page && (page.name === 'link3' || page.name === 'treinos_aluno')) {
				setTimeout(executarInicializacao, 100);
			}
		});
	}

	console.log('Sistema de treinos do aluno inicializado');
})();