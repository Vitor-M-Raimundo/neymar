// ========================================
// SISTEMA DE TREINOS - VERSÃO PERSISTENTE
// ========================================

// Criar um wrapper que persiste entre navegações
(function () {
    'use strict';

    // Verificar se já foi inicializado globalmente
    if (window.SistemaTreinos) {
        console.log('Sistema já existe, reinicializando...');
        window.SistemaTreinos.reinicializar();
        return;
    }

    // Criar o sistema como singleton global
    window.SistemaTreinos = {
        config: {
            userType: localStorage.getItem("userType"),
            userId: localStorage.getItem("userId"),
            professorId: localStorage.getItem("professor_id"),
            get finalProfessorId() {
                return this.professorId || this.userId;
            },
            statusInfo: null,
            inicializado: false,
            intervalos: []
        },

        utils: {
            updateStatus: (message, type = 'info') => {
                const config = window.SistemaTreinos.config;
                if (config.statusInfo) {
                    config.statusInfo.innerHTML = `<strong>${type.toUpperCase()}:</strong> ${message}`;
                    config.statusInfo.className = `status-info ${type}`;
                }
                console.log(`[${type}]`, message);
            },

            getContainer() {
                return document.querySelector('[data-name="treinos_prof"] #listaAlunos');
            },
            mostrarErro: (mensagem) => {
                const container = window.SistemaTreinos.utils.getContainer();
                if (container) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="mdi mdi-alert-circle-outline"></i>
                            <h3>Erro</h3>
                            <p>${mensagem}</p>
                            <button class="button button-outline" onclick="window.SistemaTreinos.actions.carregarAlunos()">
                                Tentar Novamente
                            </button>
                        </div>`;
                }
            },
            mostrarListaVazia: () => {
                const container = window.SistemaTreinos.utils.getContainer();
                if (container) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="mdi mdi-account-group-outline"></i>
                            <h3>Nenhum aluno encontrado</h3>
                            <p>Você ainda não tem alunos vinculados</p>
                            <button class="button button-fill" onclick="window.SistemaTreinos.actions.irParaPerfil()">
                                Ir para Perfil
                            </button>
                        </div>`;
                }
            },

            criarCardAluno: (aluno) => {
                const div = document.createElement("div");
                div.classList.add("aluno-card");
                div.setAttribute("data-email", aluno.email || '');

                // Define a foto do aluno, usando uma padrão se não tiver
                const fotoAluno = aluno.foto || 'img/user.jpg';

                div.innerHTML = `
                    <div class="aluno-foto">
                        <img src="${fotoAluno}" alt="Foto do aluno" onerror="this.src='img/user.jpg'">
                    </div>
                    <div class="aluno-info">
                        <div class="aluno-nome">${aluno.nome || 'Nome não disponível'}</div>
                        <small style="color: #666;">Treinos: ${aluno.total_treinos || 0}</small>
                    </div>
                    <div class="aluno-actions">
                        <button class="btn-action btn-adicionar" onclick="window.SistemaTreinos.actions.adicionarTreino('${aluno.email}')">
                            <i class="mdi mdi-plus"></i> Adicionar
                        </button>
                        <button class="btn-action btn-ver" onclick="window.SistemaTreinos.actions.verTreinos('${aluno.email}')">
                            <i class="mdi mdi-eye"></i> Ver
                        </button>
                    </div>
                `;

                return div;
            }
        },

        actions: {
            carregarAlunos: () => {
                const sistema = window.SistemaTreinos;
                const container = sistema.utils.getContainer();
                if (!container) {
                    console.log('Container treinos não presente (fora da página).');
                    return;
                }
                console.log("Iniciando carregamento de alunos...");

                // Verificar se é professor
                if (sistema.config.userType !== "prof") {
                    console.error("Usuário não é professor");
                    sistema.utils.mostrarErro("Acesso restrito a professores");
                    return;
                }

                // Verificar ID
                if (!sistema.config.finalProfessorId) {
                    console.error("ID do professor não encontrado");
                    sistema.utils.mostrarErro("ID do professor não encontrado");
                    return;
                }

                sistema.utils.updateStatus('Buscando alunos...', 'info');

                // Fazer requisição
                fetch(`https://proatleta.site/get_alunos_professor.php?professor_id=${sistema.config.finalProfessorId}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log("Resposta recebida:", data);

                        // Limpar container
                        container.innerHTML = "";

                        // Processar resposta
                        if (data.success && data.alunos && data.alunos.length > 0) {
                            sistema.utils.updateStatus(`${data.alunos.length} alunos encontrados`, 'success');

                            // Criar cards dos alunos
                            data.alunos.forEach(aluno => {
                                container.appendChild(sistema.utils.criarCardAluno(aluno));
                            });
                        } else {
                            // Lista vazia
                            sistema.utils.updateStatus('Nenhum aluno encontrado', 'warning');
                            sistema.utils.mostrarListaVazia();
                        }
                    })
                    .catch(error => {
                        console.error("Erro ao buscar alunos:", error);
                        sistema.utils.updateStatus('Erro na conexão', 'error');
                        sistema.utils.mostrarErro('Erro ao conectar com o servidor: ' + error.message);
                    });
            },

            adicionarTreino: (email) => {
                console.log('Adicionando treino para:', email);
                localStorage.setItem('alunoSelecionado', email);

                // salvar também nome
                const card = document.querySelector(`.aluno-card[data-email="${email}"] .aluno-nome`);
                if (card) {
                    localStorage.setItem('nomeAlunoSelecionado', card.textContent);
                }

                if (typeof app !== 'undefined' && app.views && app.views.main) {
                    app.views.main.router.navigate('/adicionar_treino/');
                } else {
                    console.error('Framework7 não disponível');
                }
            },

            verTreinos: (email) => {
                console.log('Visualizando treinos para:', email);
                localStorage.setItem('alunoSelecionado', email);

                if (typeof app !== 'undefined' && app.views && app.views.main) {
                    app.views.main.router.navigate('/ver_treinos_aluno/');
                } else {
                    console.error('Framework7 não disponível');
                }
            },

            irParaPerfil: () => {
                console.log('Navegando para perfil');

                if (typeof app !== 'undefined' && app.views && app.views.main) {
                    app.views.main.router.navigate('/perfil_prof/');
                } else {
                    console.error('Framework7 não disponível');
                }
            },

            filtrarAlunos: (busca) => {
                const container = window.SistemaTreinos.utils.getContainer();
                if (!container) return;
                const cards = container.querySelectorAll('.aluno-card');
                const termoBusca = busca.toLowerCase();
                let encontrados = 0;

                cards.forEach(card => {
                    const nome = card.querySelector('.aluno-nome').textContent.toLowerCase();

                    if (nome.includes(termoBusca)) {
                        card.style.display = 'flex';
                        encontrados++;
                    } else {
                        card.style.display = 'none';
                    }
                });

                // Atualizar status
                if (busca && encontrados === 0) {
                    window.SistemaTreinos.utils.updateStatus('Nenhum aluno encontrado com esse nome', 'warning');
                } else if (busca) {
                    window.SistemaTreinos.utils.updateStatus(`${encontrados} aluno(s) encontrado(s)`, 'info');
                }
            }
        },

        inicializar: () => {
            const sistema = window.SistemaTreinos;
            if (sistema.config.inicializado) return;
            const container = sistema.utils.getContainer();
            if (!container) return;
            const buscarInput = document.querySelector('[data-name="treinos_prof"] #buscarAluno');
            if (buscarInput && !buscarInput.hasAttribute('data-listener-added')) {
                buscarInput.addEventListener('input', (e) => sistema.actions.filtrarAlunos(e.target.value));
                buscarInput.setAttribute('data-listener-added', 'true');
            }
            setTimeout(() => sistema.actions.carregarAlunos(), 100);
            sistema.config.inicializado = true;
        },

        reinicializar: () => {
            const sistema = window.SistemaTreinos;
            console.log('Reinicializando sistema...');

            // Limpar intervalos anteriores
            sistema.config.intervalos.forEach(id => clearInterval(id));
            sistema.config.intervalos = [];

            // Resetar flag
            sistema.config.inicializado = false;

            // Verificar se está na página correta
            const listaAlunos = document.getElementById('listaAlunos');
            if (listaAlunos) {
                // Forçar recarregamento do CSS se necessário
                setTimeout(() => {
                    const cssElement = document.getElementById('treinos-prof-css');
                    if (!cssElement) {
                        const head = document.head;
                        const link = document.createElement('link');
                        link.id = 'treinos-prof-css';
                        link.rel = 'stylesheet';
                        link.type = 'text/css';
                        link.href = 'css/treinos_prof.css?v=' + Date.now();
                        link.media = 'all';
                        head.appendChild(link);
                        console.log('CSS treinos_prof recarregado via reinicializar');
                    }
                    sistema.inicializar();
                }, 100);
            }
        },

        // Monitorar mudanças de página
        monitorarPagina: () => {
            const sistema = window.SistemaTreinos;
            const intervaloMonitoramento = setInterval(() => {
                const container = sistema.utils.getContainer();
                const buscarInput = document.querySelector('[data-name="treinos_prof"] #buscarAluno');
                if (container && buscarInput && !sistema.config.inicializado) {
                    console.log('Detectada página de treinos, inicializando...');
                    sistema.inicializar();
                } else if (!container && sistema.config.inicializado) {
                    console.log('Saiu da página de treinos');
                    sistema.config.inicializado = false;
                }
            }, 1000);
            sistema.config.intervalos.push(intervaloMonitoramento);
        }
    };

    // Expor funções globalmente para compatibilidade
    window.carregarAlunos = window.SistemaTreinos.actions.carregarAlunos;
    window.adicionarTreino = window.SistemaTreinos.actions.adicionarTreino;
    window.verTreinos = window.SistemaTreinos.actions.verTreinos;
    window.irParaPerfil = window.SistemaTreinos.actions.irParaPerfil;
    window.filtrarAlunos = window.SistemaTreinos.actions.filtrarAlunos;

    // Inicializar eventos de monitoramento
    window.SistemaTreinos.monitorarPagina();

    // Múltiplos eventos para capturar diferentes situações
    const executarInicializacao = () => {
        const listaAlunos = document.getElementById('listaAlunos');
        if (listaAlunos && !window.SistemaTreinos.config.inicializado) {
            window.SistemaTreinos.inicializar();
        }
    };

    // Eventos padrão
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', executarInicializacao);
    } else {
        executarInicializacao();
    }

    // Eventos para SPAs
    document.addEventListener('page:init', executarInicializacao);
    document.addEventListener('page:reinit', executarInicializacao);

    // Eventos Framework7
    if (typeof app !== 'undefined') {
        app.on('pageInit', (page) => {
            setTimeout(executarInicializacao, 50);
        });

        app.on('pageBeforeIn', (page) => {
            setTimeout(executarInicializacao, 100);
        });
    }

    console.log('Sistema de treinos persistente inicializado');
})();