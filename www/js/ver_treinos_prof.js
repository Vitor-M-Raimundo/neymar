(function () {
    'use strict';

    // Verificar se já foi inicializado globalmente
    if (window.SistemaVerTreinosProfessor) {
        console.log('Sistema já existe, reinicializando...');
        window.SistemaVerTreinosProfessor.reinicializar();
        return;
    }

    // Criar o sistema como singleton global
    window.SistemaVerTreinosProfessor = {
        config: {
            treinosData: [],
            treinosFiltrados: [],
            inicializado: false
        },

        utils: {
            mostrarLoader: () => {
                const container = document.getElementById('listaTreinosProfessor');
                if (container) {
                    container.innerHTML = `
                        <div class="loader-container">
                            <div class="preloader"></div>
                            <p style="margin-top: 15px; color: #666;">Carregando treinos...</p>
                        </div>
                    `;
                }
            },

            mostrarListaVazia: () => {
                const container = document.getElementById('listaTreinosProfessor');
                if (container) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="mdi mdi-clipboard-text-outline"></i>
                            <h3>Nenhum treino encontrado</h3>
                            <p>Este professor ainda não criou treinos para você.</p>
                        </div>
                    `;
                }
            },

            mostrarErro: (mensagem) => {
                const container = document.getElementById('listaTreinosProfessor');
                if (container) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="mdi mdi-alert-circle-outline"></i>
                            <h3>Erro</h3>
                            <p>${mensagem}</p>
                            <button class="button button-fill" onclick="window.SistemaVerTreinosProfessor.actions.carregarTreinos()">
                                Tentar Novamente
                            </button>
                        </div>
                    `;
                }
            },

            // Substituído: não mostrar contadores no info card
            atualizarEstatisticas: (treinos) => {
                // Não exibir número de treinos/exercícios no professor-info-card.
                // Limpa qualquer elemento existente para garantir que não apareça.
                const professorDados = document.querySelector('.professor-dados');
                if (!professorDados) return;
                const resumoExistente = professorDados.querySelector('.professor-resumo');
                if (resumoExistente) {
                    resumoExistente.remove();
                }
                // Não faz mais nada (intencionalmente vazio)
            },

            formatarData: (data) => {
                if (!data) return 'Sem data';
                return new Date(data).toLocaleDateString('pt-BR');
            },

            // Substituído: criarCardTreino (novo layout com progresso + botão Iniciar)
			criarCardTreino: (treino, index) => {
				const dataFormatada = window.SistemaVerTreinosProfessor.utils.formatarData(treino.data_treino);
				const tipoClass = `tipo-${(treino.tipo_treino || 'outro').toLowerCase()}`;
				const total = treino.exercicios ? treino.exercicios.length : 0;
				const concluidos = treino.exercicios ? treino.exercicios.filter(ex => ex.concluido).length : 0;
				const percent = total > 0 ? Math.round((concluidos / total) * 100) : 0;

				return `
					<div class="treino-card" data-treino-id="${treino.id}" data-treino-index="${index}">
						<div class="treino-header">
							<div class="treino-titulo">
								<h3>${treino.nome_treino}</h3>
							</div>
							<div class="treino-meta">
								<span class="tipo-badge ${tipoClass}">${treino.tipo_treino || 'Geral'}</span>
								<span style="margin-left: auto;"><i class="ri-calendar-line"></i> ${dataFormatada}</span>
							</div>
						</div>

						${treino.observacoes ? `
							<div class="observacoes-box" style="margin:8px 12px;">
								<i class="ri-information-line"></i> ${treino.observacoes}
							</div>
						` : ''}

						<div style="padding: 12px 16px 18px;">
							<div class="progress-row" style="display:flex;align-items:center;gap:12px;">
								<div class="progress-track" style="flex:1; height:10px; border-radius:6px; background:#f1f5f9; overflow:hidden;">
									<div class="progress-fill" style="width:${percent}%; height:100%; background:#f86100;"></div>
								</div>
								<div style="min-width:44px; color:#f86100; font-weight:700; font-size:13px; text-align:right;">
									${concluidos}/${total}
								</div>
							</div>

							<div style="margin-top:12px; display:flex; justify-content:center;">
								<button class="button button-fill" style="width:90%; padding:8px 12px; border-radius:10px;" onclick="window.SistemaVerTreinosProfessor.actions.abrirDetalhesTreino(${index})">
									Iniciar
								</button>
							</div>
						</div>
					</div>
				`;
			},

            renderizarTreinos: (treinos) => {
                const container = document.getElementById('listaTreinosProfessor');
                
                if (!treinos || treinos.length === 0) {
                    window.SistemaVerTreinosProfessor.utils.mostrarListaVazia();
                    // garantir que o resumo também reflita zero
                    window.SistemaVerTreinosProfessor.utils.atualizarEstatisticas([]);
                    return;
                }

                // Atualiza resumo (substitui o antigo stats-container)
                window.SistemaVerTreinosProfessor.utils.atualizarEstatisticas(treinos);

                const html = treinos.map((treino, index) => 
                    window.SistemaVerTreinosProfessor.utils.criarCardTreino(treino, index)
                ).join('');
                
                container.innerHTML = html;
                // mantenho chamada para compatibilidade (atualizarEstatisticas já executada)
            },

            // Novo: atualizar informações do professor no topo da página
            atualizarInfoProfessor: () => {
                const nome = localStorage.getItem('professorNomeSelecionado') || localStorage.getItem('professorNome') || 'Professor';
                const foto = localStorage.getItem('professorFotoSelecionada') || localStorage.getItem('professorFoto') || '';
                const email = localStorage.getItem('professorEmailSelecionado') || '';

                const nomeEl = document.getElementById('nomeProfessorTreinos');
                const avatarEl = document.getElementById('professorAvatarTreinos');
                const emailEl = document.getElementById('emailProfessorTreinos');

                if (nomeEl) nomeEl.textContent = nome;
                if (emailEl) {
                    if (email) {
                        emailEl.textContent = email;
                        emailEl.style.display = 'block';
                    } else {
                        emailEl.style.display = 'none';
                    }
                }

                if (avatarEl) {
                    if (foto) {
                        avatarEl.innerHTML = `<img src="${foto}" alt="Foto do ${nome}" onerror="this.src='img/user.jpg'">`;
                    } else {
                        avatarEl.innerHTML = '<i class="ri-user-line"></i>';
                    }
                }
            }

        },

        actions: {
            obterProfessorId: () => {
                // Tentar obter o ID do professor de várias fontes
                const urlParams = new URLSearchParams(window.location.search);
                const professorId = urlParams.get('professor_id') || 
                                  localStorage.getItem('professor_id') || 
                                  localStorage.getItem('professorSelecionado');
                
                console.log('Professor ID obtido:', professorId); // Debug
                return professorId;
            },

            carregarTreinos: () => {
                const sistema = window.SistemaVerTreinosProfessor;
                
                // Obter ID do professor primeiro
                const professorId = sistema.actions.obterProfessorId();
                console.log('Carregando treinos do professor:', professorId); // Debug
                
                if (!professorId) {
                    sistema.utils.mostrarErro('Professor não identificado');
                    return;
                }

                // Usar o email do usuário logado
                const userEmail = localStorage.getItem('userEmail');
                if (!userEmail) {
                    sistema.utils.mostrarErro('Email do usuário não encontrado');
                    return;
                }

                sistema.utils.mostrarLoader();

                // Fazer requisição com o professor_id
                fetch(`https://proatleta.site/get_treinos_aluno.php?email_aluno=${encodeURIComponent(userEmail)}&professor_id=${professorId}`)
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        console.log('Resposta API:', data); // Debug
                        if (data.success && data.treinos) {
                            sistema.config.treinosData = data.treinos;
                            sistema.config.treinosFiltrados = [...data.treinos];
                            sistema.utils.renderizarTreinos(data.treinos);
                        } else {
                            sistema.utils.mostrarListaVazia();
                            sistema.utils.atualizarEstatisticas([]);
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao carregar treinos:', error);
                        sistema.utils.mostrarErro('Erro ao conectar com o servidor');
                    });
            },

            toggleExercicios: (index) => {
                const container = document.getElementById(`exercicios-${index}`);
                const arrow = document.getElementById(`arrow-${index}`);
                const icon = document.getElementById(`icon-${index}`);
                
                if (!container) return;

                container.classList.toggle('show');
                
                if (container.classList.contains('show')) {
                    arrow.style.transform = 'rotate(180deg)';
                    icon.className = 'ri-list-check';
                } else {
                    arrow.style.transform = 'rotate(0deg)';
                    icon.className = 'ri-list-unordered';
                }
            },

            filtrarTreinos: (termo) => {
                const sistema = window.SistemaVerTreinosProfessor;
                
                if (!termo.trim()) {
                    sistema.config.treinosFiltrados = [...sistema.config.treinosData];
                } else {
                    const termoLower = termo.toLowerCase();
                    sistema.config.treinosFiltrados = sistema.config.treinosData.filter(treino => {
                        return treino.nome_treino.toLowerCase().includes(termoLower) ||
                               treino.tipo_treino?.toLowerCase().includes(termoLower) ||
                               (treino.observacoes && treino.observacoes.toLowerCase().includes(termoLower)) ||
                               (treino.exercicios && treino.exercicios.some(ex => 
                                   ex.nome.toLowerCase().includes(termoLower)
                               ));
                    });
                }
                
                sistema.utils.renderizarTreinos(sistema.config.treinosFiltrados);
            },

            configurarBusca: () => {
                const searchInput = document.getElementById('searchTreinos');
                if (searchInput && !searchInput.hasAttribute('data-listener-added')) {
                    searchInput.addEventListener('input', (e) => {
                        window.SistemaVerTreinosProfessor.actions.filtrarTreinos(e.target.value);
                    });
                    searchInput.setAttribute('data-listener-added', 'true');
                }
            },

            marcarExercicio: (exercicioId, concluido) => {
                const sistema = window.SistemaVerTreinosProfessor;
                const userEmail = localStorage.getItem('userEmail');
                
                if (!userEmail) {
                    console.error('Email do usuário não encontrado');
                    if (typeof app !== 'undefined') {
                        app.toast.create({
                            text: 'Email do usuário não encontrado',
                            position: 'bottom',
                            closeTimeout: 3000
                        }).open();
                    }
                    return;
                }

                // Encontrar o checkbox para mostrar loading
                const checkbox = document.querySelector(`input[onchange*="${exercicioId}"]`);
                const checkboxContainer = checkbox?.parentElement;
                
                if (checkboxContainer) {
                    checkboxContainer.classList.add('loading');
                }

                const payload = {
                    exercicio_id: exercicioId,
                    concluido: concluido ? 1 : 0,
                    aluno_email: userEmail
                };

                console.log('Enviando dados:', payload);

                fetch('https://proatleta.site/marcar_exercicio_concluido.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    console.log('Status da resposta:', response.status);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    return response.text(); // Primeiro pegar como texto para debug
                })
                .then(responseText => {
                    console.log('Resposta do servidor (texto):', responseText);
                    
                    let data;
                    try {
                        data = JSON.parse(responseText);
                    } catch (e) {
                        console.error('Erro ao fazer parse do JSON:', e);
                        console.error('Resposta recebida:', responseText);
                        throw new Error('Resposta inválida do servidor');
                    }
                    
                    console.log('Dados parseados:', data);
                    
                    if (data.success) {
                        // Atualizar o estado no objeto de dados
                        sistema.config.treinosData.forEach(treino => {
                            if (treino.exercicios) {
                                const exercicio = treino.exercicios.find(ex => ex.id === exercicioId);
                                if (exercicio) {
                                    exercicio.concluido = concluido;
                                    exercicio.concluido_em = data.concluido_em;
                                }
                            }
                        });

                        // Atualizar visualmente
                        const exercicioItem = document.querySelector(`[data-exercicio-id="${exercicioId}"]`);
                        if (exercicioItem) {
                            if (concluido) {
                                exercicioItem.classList.add('concluido');
                                
                                // Adicionar info de conclusão se não existir
                                let infoElement = exercicioItem.querySelector('.exercicio-concluido-info');
                                if (!infoElement && data.concluido_em) {
                                    const detailsElement = exercicioItem.querySelector('.exercicio-details');
                                    const infoHtml = `
                                        <div class="exercicio-concluido-info">
                                            ✓ Concluído em ${new Date(data.concluido_em).toLocaleString('pt-BR')}
                                        </div>
                                    `;
                                    detailsElement.insertAdjacentHTML('afterend', infoHtml);
                                }
                            } else {
                                exercicioItem.classList.remove('concluido');
                                // Remover info de conclusão
                                const infoElement = exercicioItem.querySelector('.exercicio-concluido-info');
                                if (infoElement) {
                                    infoElement.remove();
                                }
                            }
                        }

                        // Atualizar contador de exercícios concluídos
                        sistema.actions.atualizarContadores();
                        
                        // Mostrar feedback de sucesso
                        if (typeof app !== 'undefined') {
                            app.toast.create({
                                text: data.message,
                                position: 'bottom',
                                closeTimeout: 2000
                            }).open();
                        }
                    } else {
                        console.error('Erro retornado pela API:', data.message);
                        
                        // Reverter checkbox em caso de erro
                        if (checkbox) {
                            checkbox.checked = !concluido;
                        }
                        
                        // Mostrar erro ao usuário
                        if (typeof app !== 'undefined') {
                            app.toast.create({
                                text: data.message || 'Erro ao marcar exercício',
                                position: 'bottom',
                                closeTimeout: 3000
                            }).open();
                        }
                    }
                })
                .catch(error => {
                    console.error('Erro na requisição:', error);
                    
                    // Reverter checkbox em caso de erro
                    if (checkbox) {
                        checkbox.checked = !concluido;
                    }
                    
                    // Mostrar erro ao usuário
                    let errorMessage = 'Erro ao conectar com o servidor';
                    if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    if (typeof app !== 'undefined') {
                        app.toast.create({
                            text: errorMessage,
                            position: 'bottom',
                            closeTimeout: 4000
                        }).open();
                    }
                })
                .finally(() => {
                    // Remover loading
                    if (checkboxContainer) {
                        checkboxContainer.classList.remove('loading');
                    }
                });
            },

            // Novo: ao iniciar, salva treino selecionado e navega para a página de exercícios
            abrirDetalhesTreino: (index) => {
                const sistema = window.SistemaVerTreinosProfessor;
                const treino = sistema.config.treinosFiltrados[index] || sistema.config.treinosData[index];
                if (!treino) {
                    console.warn('Treino não encontrado para index:', index);
                    return;
                }

                // Salva o objeto do treino localmente para que a página de exercícios o use
                try {
                    localStorage.setItem('treinoSelecionado', JSON.stringify(treino));
                    // também garantir professor_id salvo (compatibilidade)
                    const professorId = sistema.actions.obterProfessorId();
                    if (professorId) localStorage.setItem('professor_id', professorId);
                } catch (e) {
                    console.warn('Erro ao salvar treino no localStorage:', e);
                }

                // Monta query string
                const treinoId = encodeURIComponent(treino.id);
                const routePath = `/ver_exercicios_prof/?treino_id=${treinoId}`;

                // Usar mesmo padrão que treinos_aluno.js: app.views.main.router.navigate(...)
                if (typeof app !== 'undefined' && app.views && app.views.main && app.views.main.router) {
                    try {
                        app.views.main.router.navigate(routePath);
                        return;
                    } catch (err) {
                        console.warn('app.views.main.router.navigate falhou:', err);
                    }
                }

                // Tentar window.mainView se existir
                if (window.mainView && window.mainView.router) {
                    try {
                        window.mainView.router.navigate(routePath);
                        return;
                    } catch (err) {
                        console.warn('window.mainView.router.navigate falhou:', err);
                    }
                }

                // Fallback: abrir arquivo diretamente
                window.location.href = `ver_exercicios_prof.html?treino_id=${treinoId}`;
            },

            atualizarContadores: () => {
                // Atualizar contadores nos cards de treino
                document.querySelectorAll('.treino-card').forEach((card, index) => {
                    const treino = window.SistemaVerTreinosProfessor.config.treinosFiltrados[index];
                    if (treino && treino.exercicios) {
                        const concluidos = treino.exercicios.filter(ex => ex.concluido).length;
                        const total = treino.exercicios.length;
                        const metaElement = card.querySelector('.treino-meta');
                        
                        // Atualizar contador existente
                        const contadorExistente = metaElement.querySelector('span:last-child');
                        if (contadorExistente && contadorExistente.innerHTML.includes('concluídos')) {
                            contadorExistente.innerHTML = `<i class="ri-checkbox-circle-line"></i> ${concluidos} concluídos`;
                        }
                    }
                });
            }

        },

        inicializar: () => {
            const sistema = window.SistemaVerTreinosProfessor;
            console.log('Inicializando sistema de treinos do professor...');
            
            sistema.actions.configurarBusca();
            // Atualiza info do professor antes de carregar os treinos
            sistema.utils.atualizarInfoProfessor();
            sistema.actions.carregarTreinos();
            sistema.config.inicializado = true;
        },

        reinicializar: () => {
            const sistema = window.SistemaVerTreinosProfessor;
            sistema.config.inicializado = false;
            sistema.config.treinosData = [];
            sistema.config.treinosFiltrados = [];
            
            // Verificar se estamos na página correta
            const container = document.getElementById('listaTreinosProfessor');
            if (container) {
                sistema.inicializar();
            }
        }
    };

    // Eventos de inicialização
    const executarInicializacao = () => {
        const container = document.getElementById('listaTreinosProfessor');
        if (container && !window.SistemaVerTreinosProfessor.config.inicializado) {
            window.SistemaVerTreinosProfessor.inicializar();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', executarInicializacao);
    } else {
        executarInicializacao();
    }

    // Eventos para SPAs
    document.addEventListener('page:init', (e) => {
        if (e.detail.name === 'ver_treinos_professor') {
            window.SistemaVerTreinosProfessor.inicializar();
        }
    });

    // Eventos Framework7
    if (typeof app !== 'undefined') {
        app.on('pageInit', (page) => {
            if (page.name === 'ver_treinos_professor') {
                window.SistemaVerTreinosProfessor.inicializar();
            }
        });

        app.on('pageBeforeIn', (page) => {
            if (page.name === 'ver_treinos_professor') {
                setTimeout(() => window.SistemaVerTreinosProfessor.inicializar(), 100);
            }
        });
    }

    console.log('Sistema de treinos do professor inicializado');
})();