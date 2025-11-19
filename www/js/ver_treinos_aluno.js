(function () {
    'use strict';

    // Verificar se já foi inicializado globalmente
    if (window.SistemaVerTreinos) {
        console.log('Sistema já existe, reinicializando...');
        window.SistemaVerTreinos.reinicializar();
        return;
    }

    // Criar o sistema como singleton global
    window.SistemaVerTreinos = {
        config: {
            userId: localStorage.getItem("userId"),
            professorId: localStorage.getItem("professor_id"),
            treinosData: [],
            inicializado: false,
            // Dados do aluno - usar email como fonte principal
            emailAluno: localStorage.getItem('alunoSelecionado') || '',
            nomeAluno: localStorage.getItem('nomeAlunoSelecionado') || 'Aluno',
            alunoId: '',
            fotoAluno: null
        },

        utils: {
            mostrarListaVazia: () => {
                const container = document.getElementById('listaTreinos');
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="mdi mdi-clipboard-text-outline"></i>
                        <h3>Nenhum treino encontrado</h3>
                        <p>Este aluno ainda não possui treinos cadastrados.</p>
                        <button class="button button-fill" onclick="window.SistemaVerTreinos.actions.adicionarNovoTreino()">
                            <i class="ri-add-line"></i> Adicionar Primeiro Treino
                        </button>
                    </div>
                `;
            },

            mostrarErro: (mensagem) => {
                const container = document.getElementById('listaTreinos');
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="mdi mdi-alert-circle-outline"></i>
                        <h3>Erro</h3>
                        <p>${mensagem}</p>
                    </div>
                `;
            },

            mostrarTreinos: (treinos) => {
                const container = document.getElementById('listaTreinos');

                if (treinos.length === 0) {
                    window.SistemaVerTreinos.utils.mostrarListaVazia();
                    return;
                }

                let html = '';
                treinos.forEach((treino, index) => {
                    const dataFormatada = treino.data_treino ? new Date(treino.data_treino).toLocaleDateString('pt-BR') : 'Sem data';
                    const tipoClass = `tipo-${(treino.tipo_treino || 'outro').toLowerCase()}`;
                    const isInativo = !treino.ativo;
                    const inativoClass = isInativo ? 'treino-finalizado' : '';
                    const inativoStyle = isInativo ? 'opacity: 0.7; border: 2px solid #4CAF50;' : '';

                    html += `
                        <div class="treino-card ${inativoClass}" data-treino-id="${treino.id}" data-treino-index="${index}" style="${inativoStyle}">
                            ${isInativo ? '<div class="badge-finalizado" style="position: absolute; top: 10px; right: 10px; background: #4CAF50; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;"><i class="ri-check-line"></i> Finalizado</div>' : ''}
                            
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
                                <div class="observacoes-box">
                                    <i class="ri-information-line"></i> ${treino.observacoes}
                                </div>
                            ` : ''}

                            <div style="padding: 12px 16px 18px;">
                                <div style="display:flex; gap:10px; align-items:center;">
                                    ${isInativo ? `
                                        <button class="button button-fill" style="flex:1; padding:8px 12px; border-radius:10px; background:#4CAF50;" onclick="window.SistemaVerTreinos.actions.reativarTreino(${treino.id})">
                                            <i class="ri-restart-line"></i> Reativar Treino
                                        </button>
                                    ` : `
                                        <button class="button button-fill" style="flex:1; padding:8px 12px; border-radius:10px; background:#f86100;" onclick="window.SistemaVerTreinos.actions.abrirDetalhesTreino(${index})">
                                            Ver Exercícios
                                        </button>
                                        <button class="btn-icon btn-edit" onclick="window.SistemaVerTreinos.actions.editarTreino(${treino.id})">
                                            <i class="ri-edit-line"></i>
                                        </button>
                                    `}
                                    <button class="btn-icon btn-delete" onclick="window.SistemaVerTreinos.actions.deletarTreino(${treino.id})">
                                        <i class="ri-delete-bin-line"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="exercicios-container" id="exercicios-${index}">
                                ${treino.exercicios.map(ex => `
                                    <div class="exercicio-item">
                                        <div class="exercicio-nome">${ex.ordem}. ${ex.nome}</div>
                                        <div class="exercicio-details">
                                            <span class="exercicio-detail">
                                                <i class="ri-repeat-line"></i> ${ex.series} séries
                                            </span>
                                            <span class="exercicio-detail">
                                                <i class="ri-number-1"></i> ${ex.repeticoes} reps
                                            </span>
                                            <span class="exercicio-detail">
                                                <i class="ri-timer-line"></i> ${ex.descanso}s
                                            </span>
                                        </div>
                                        ${ex.observacoes ? `<div style="margin-top: 8px; font-size: 13px; color: #888;">${ex.observacoes}</div>` : ''}
                                        ${ex.video_arquivo ? `
                                            <div class="exercicio-video">
                                                <video controls width="100%" height="200" preload="metadata">
                                                    <source src="${ex.video_arquivo}" type="video/mp4">
                                                    Seu navegador não suporta a reprodução de vídeos.
                                                </video>
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                });

                container.innerHTML = html;
            },

            atualizarInfoAluno: () => {
                const nomeElement = document.getElementById('nomeAlunoTreinos');
                const avatarElement = document.getElementById('alunoAvatarTreinos');

                if (nomeElement) {
                    nomeElement.textContent = window.SistemaVerTreinos.config.nomeAluno;
                }

                // Atualizar avatar
                if (avatarElement && window.SistemaVerTreinos.config.fotoAluno) {
                    avatarElement.innerHTML = `<img src="${window.SistemaVerTreinos.config.fotoAluno}" alt="Foto do ${window.SistemaVerTreinos.config.nomeAluno}" onerror="this.src='img/user.jpg'">`;
                } else if (avatarElement) {
                    avatarElement.innerHTML = '<i class="ri-user-line"></i>';
                }

                console.log('Interface do aluno atualizada:', {
                    nome: window.SistemaVerTreinos.config.nomeAluno,
                    email: window.SistemaVerTreinos.config.emailAluno
                });
            },

            carregarDadosCompletosAluno: () => {
                const emailAluno = window.SistemaVerTreinos.config.emailAluno;

                if (!emailAluno) {
                    console.warn('Email do aluno não encontrado');
                    window.SistemaVerTreinos.utils.atualizarInfoAluno();
                    return;
                }

                console.log('Buscando dados completos do aluno por email:', emailAluno);

                fetch(`https://proatleta.site/get_usuario.php?email=${encodeURIComponent(emailAluno)}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.success && data.usuario) {
                            // Atualizar todos os dados do aluno
                            window.SistemaVerTreinos.config.alunoId = data.usuario.id;
                            window.SistemaVerTreinos.config.nomeAluno = data.usuario.nome || window.SistemaVerTreinos.config.nomeAluno;
                            window.SistemaVerTreinos.config.emailAluno = data.usuario.email || window.SistemaVerTreinos.config.emailAluno;
                            window.SistemaVerTreinos.config.fotoAluno = data.usuario.foto || 'img/user.jpg';

                            // Salvar dados atualizados no localStorage para consistência
                            localStorage.setItem('alunoSelecionadoId', data.usuario.id);
                            localStorage.setItem('nomeAlunoSelecionado', data.usuario.nome);

                            console.log('Dados completos do aluno carregados:', {
                                id: window.SistemaVerTreinos.config.alunoId,
                                nome: window.SistemaVerTreinos.config.nomeAluno,
                                email: window.SistemaVerTreinos.config.emailAluno,
                                foto: window.SistemaVerTreinos.config.fotoAluno
                            });
                        } else {
                            console.warn('Não foi possível carregar dados completos do aluno');
                            window.SistemaVerTreinos.config.fotoAluno = 'img/user.jpg';
                        }

                        window.SistemaVerTreinos.utils.atualizarInfoAluno();
                    })
                    .catch(error => {
                        console.error('Erro ao carregar dados completos do aluno:', error);
                        window.SistemaVerTreinos.config.fotoAluno = 'img/user.jpg';
                        window.SistemaVerTreinos.utils.atualizarInfoAluno();
                    });
            }
        },

        actions: {
            carregarTreinos: () => {
                const emailAluno = window.SistemaVerTreinos.config.emailAluno;
                const professorId = localStorage.getItem('professor_id');

                if (!emailAluno) {
                    window.SistemaVerTreinos.utils.mostrarErro('Email do aluno não encontrado');
                    return;
                }

                console.log('Carregando treinos para aluno:', emailAluno);

                // Carregar dados completos do aluno primeiro
                window.SistemaVerTreinos.utils.carregarDadosCompletosAluno();

                // Busca treinos INCLUINDO INATIVOS para o professor poder visualizar
                fetch(`https://proatleta.site/get_treinos_aluno.php?email_aluno=${encodeURIComponent(emailAluno)}&professor_id=${professorId}&incluir_inativos=true`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.treinos) {
                            window.SistemaVerTreinos.config.treinosData = data.treinos;
                            window.SistemaVerTreinos.utils.mostrarTreinos(data.treinos);
                        } else {
                            window.SistemaVerTreinos.utils.mostrarListaVazia();
                        }
                    })
                    .catch(error => {
                        console.error('Erro:', error);
                        window.SistemaVerTreinos.utils.mostrarErro('Erro ao carregar treinos');
                    });
            },

            toggleExercicios: (index) => {
                const container = document.getElementById(`exercicios-${index}`);
                const arrow = document.getElementById(`arrow-${index}`);

                container.classList.toggle('show');

                if (container.classList.contains('show')) {
                    arrow.style.transform = 'rotate(180deg)';
                } else {
                    arrow.style.transform = 'rotate(0deg)';
                }
            },

            deletarTreino: (treinoId) => {
                // Mostra diálogo de confirmação com Framework7
                app.dialog.confirm(
                    'Tem certeza que deseja deletar este treino?',
                    'Confirmar Exclusão',
                    function () {
                        // Mostra loader
                        app.dialog.preloader('Deletando treino...');

                        const professorId = localStorage.getItem('professor_id');

                        // Faz requisição para deletar usando fetch com URLSearchParams
                        fetch('https://proatleta.site/deletar_treino.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: new URLSearchParams({
                                'treino_id': treinoId,
                                'professor_id': professorId
                            })
                        })
                            .then(response => response.json())
                            .then(data => {
                                // Fecha loader
                                app.dialog.close();

                                if (data.success) {
                                    // Mostra toast de sucesso
                                    app.toast.create({
                                        text: 'Treino deletado com sucesso!',
                                        position: 'center',
                                        closeTimeout: 2000,
                                    }).open();

                                    // Remove o treino do array local
                                    window.SistemaVerTreinos.config.treinosData =
                                        window.SistemaVerTreinos.config.treinosData.filter(t => t.id !== treinoId);

                                    // Atualiza a interface
                                    window.SistemaVerTreinos.utils.mostrarTreinos(window.SistemaVerTreinos.config.treinosData);
                                } else {
                                    throw new Error(data.message || 'Erro ao deletar treino');
                                }
                            })
                            .catch(error => {
                                // Fecha loader
                                app.dialog.close();

                                // Mostra erro
                                app.dialog.alert(
                                    'Não foi possível deletar o treino. Tente novamente mais tarde.',
                                    'Erro'
                                );
                                console.error('Erro ao deletar treino:', error);
                            });
                    },
                    function () {
                        // Usuário cancelou a exclusão
                        app.toast.create({
                            text: 'Operação cancelada',
                            position: 'center',
                            closeTimeout: 2000,
                        }).open();
                    }
                );
            },

            adicionarNovoTreino: () => {
                app.views.main.router.navigate('/adicionar_treino/');
            },

            abrirDetalhesTreino: (index) => {
                const sistema = window.SistemaVerTreinos;
                const treino = sistema.config.treinosData[index];
                if (!treino) {
                    console.warn('Treino não encontrado para index:', index);
                    return;
                }

                console.log('=== ABRINDO DETALHES DO TREINO ===');
                console.log('Treino selecionado:', treino);
                console.log('ID do treino:', treino.id);
                console.log('Nome do treino:', treino.nome_treino);

                // IMPORTANTE: Salvar APENAS o ID no localStorage para query string
                localStorage.setItem('treinoIdSelecionado', String(treino.id));

                // Salvar treino completo como backup (mas não usar para ID)
                try {
                    localStorage.setItem('treinoSelecionado', JSON.stringify(treino));
                } catch (e) {
                    console.warn('Erro ao salvar treino no localStorage:', e);
                }

                // Garantir professor_id salvo
                const professorId = localStorage.getItem('professor_id');
                if (professorId) {
                    localStorage.setItem('professor_id', professorId);
                }

                // Monta query string usando APENAS o ID
                const treinoId = treino.id;
                const routePath = `/ver_exercicios_aluno/?treino_id=${treinoId}`;

                console.log('Navegando para:', routePath);
                console.log('=== FIM LOG ABERTURA ===');

                // Tentar navegar
                if (typeof app !== 'undefined' && app.views && app.views.main && app.views.main.router) {
                    try {
                        app.views.main.router.navigate(routePath);
                        return;
                    } catch (err) {
                        console.warn('app.views.main.router.navigate falhou:', err);
                    }
                }

                if (window.mainView && window.mainView.router) {
                    try {
                        window.mainView.router.navigate(routePath);
                        return;
                    } catch (err) {
                        console.warn('window.mainView.router.navigate falhou:', err);
                    }
                }

                // Fallback
                window.location.href = `ver_exercicios_aluno.html?treino_id=${treinoId}`;
            },

            editarTreino: (treinoId) => {
                console.log('editarTreino chamado com ID:', treinoId);

                const sistema = window.SistemaVerTreinos;

                // Verificar se o sistema está inicializado
                if (!sistema || !sistema.config.treinosData) {
                    console.error('Sistema não inicializado');
                    return;
                }

                const treino = sistema.config.treinosData.find(t => t.id == treinoId);

                if (!treino) {
                    console.warn('Treino não encontrado para edição:', treinoId);
                    if (typeof app !== 'undefined') {
                        app.dialog.alert('Treino não encontrado', 'Erro');
                    }
                    return;
                }

                console.log('Treino encontrado:', treino);

                // SOLUÇÃO: Garantir que o popup existe no DOM
                let popup = document.getElementById('popupEditTreino');
                
                if (!popup) {
                    console.warn('Popup não encontrado, criando dinamicamente...');
                    
                    // Criar popup dinamicamente
                    const popupHTML = `
                        <div id="popupEditTreino" class="popup-edit-treino">
                            <div class="popup-edit-content">
                                <div class="popup-edit-header">
                                    <h3>Editar Treino</h3>
                                    <button type="button" class="popup-close-btn" onclick="window.SistemaVerTreinos.actions.fecharPopupEdicao()">
                                        <i class="ri-close-line"></i>
                                    </button>
                                </div>
                                <form id="formEditTreino" onsubmit="return false;">
                                    <input type="hidden" id="editTreinoId">
                                    
                                    <div class="form-group-edit">
                                        <label for="editNomeTreino">Nome do Treino *</label>
                                        <input type="text" id="editNomeTreino" required placeholder="Ex: Treino A - Peito e Tríceps">
                                    </div>

                                    <div class="form-group-edit">
                                        <label for="editTipoTreino">Tipo de Treino</label>
                                        <select id="editTipoTreino">
                                            <option value="musculacao">Musculação</option>
                                            <option value="cardio">Cardio</option>
                                            <option value="funcional">Funcional</option>
                                            <option value="esporte">Esporte</option>
                                            <option value="outro">Outro</option>
                                        </select>
                                    </div>

                                    <div class="form-group-edit">
                                        <label for="editDataTreino">Data do Treino</label>
                                        <input type="date" id="editDataTreino">
                                    </div>

                                    <div class="form-group-edit">
                                        <label for="editObservacoes">Observações Gerais</label>
                                        <textarea id="editObservacoes" rows="3" placeholder="Observações sobre o treino..."></textarea>
                                    </div>

                                    <div class="popup-actions">
                                        <button type="button" class="btn-cancel-edit" onclick="window.SistemaVerTreinos.actions.fecharPopupEdicao()">
                                            Cancelar
                                        </button>
                                        <button type="button" class="btn-save-edit" onclick="window.SistemaVerTreinos.actions.salvarEdicaoTreino()">
                                            Salvar Alterações
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    `;
                    
                    // Adicionar ao body
                    document.body.insertAdjacentHTML('beforeend', popupHTML);
                    popup = document.getElementById('popupEditTreino');
                }

                // Aguardar um tick para garantir que o DOM foi atualizado
                setTimeout(() => {
                    const form = document.getElementById('formEditTreino');
                    
                    if (!form) {
                        console.error('Formulário de edição não encontrado após criação');
                        if (typeof app !== 'undefined') {
                            app.dialog.alert('Erro ao abrir formulário de edição', 'Erro');
                        }
                        return;
                    }

                    // Preencher o formulário com os dados do treino
                    const elements = {
                        editTreinoId: document.getElementById('editTreinoId'),
                        editNomeTreino: document.getElementById('editNomeTreino'),
                        editTipoTreino: document.getElementById('editTipoTreino'),
                        editDataTreino: document.getElementById('editDataTreino'),
                        editObservacoes: document.getElementById('editObservacoes')
                    };

                    // Verificar se todos os elementos existem
                    const missingElements = Object.keys(elements).filter(key => !elements[key]);
                    if (missingElements.length > 0) {
                        console.error('Elementos não encontrados:', missingElements);
                        return;
                    }

                    // Preencher campos
                    elements.editTreinoId.value = treino.id;
                    elements.editNomeTreino.value = treino.nome_treino || '';
                    elements.editTipoTreino.value = treino.tipo_treino || 'outro';
                    elements.editDataTreino.value = treino.data_treino || '';
                    elements.editObservacoes.value = treino.observacoes || '';

                    console.log('Formulário preenchido, abrindo popup...');

                    // Abrir o popup
                    if (popup) {
                        popup.classList.add('active');
                        console.log('Popup aberto com sucesso');
                    } else {
                        console.error('Elemento popup não encontrado');
                    }
                }, 10);
            },

            fecharPopupEdicao: () => {
                const popup = document.getElementById('popupEditTreino');
                if (popup) {
                    popup.classList.remove('active');
                }
            },

            salvarEdicaoTreino: () => {
                const sistema = window.SistemaVerTreinos;
                const treinoId = document.getElementById('editTreinoId').value;
                const nomeTreino = document.getElementById('editNomeTreino').value.trim();

                if (!nomeTreino) {
                    app.dialog.alert('Por favor, informe o nome do treino', 'Erro');
                    return;
                }

                const btnSave = document.querySelector('.btn-save-edit');
                btnSave.disabled = true;
                btnSave.textContent = 'Salvando...';

                const dados = {
                    treino_id: treinoId,
                    nome_treino: nomeTreino,
                    tipo_treino: document.getElementById('editTipoTreino').value,
                    data_treino: document.getElementById('editDataTreino').value,
                    observacoes: document.getElementById('editObservacoes').value.trim(),
                    professor_id: localStorage.getItem('professor_id')
                };

                fetch('https://proatleta.site/editar_treino.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dados)
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            app.toast.create({
                                text: 'Treino atualizado com sucesso!',
                                position: 'center',
                                closeTimeout: 2000,
                            }).open();

                            sistema.actions.fecharPopupEdicao();
                            sistema.actions.carregarTreinos();
                        } else {
                            throw new Error(data.message || 'Erro ao atualizar treino');
                        }
                    })
                    .catch(error => {
                        console.error('Erro:', error);
                        app.dialog.alert(error.message || 'Erro ao atualizar treino', 'Erro');
                    })
                    .finally(() => {
                        btnSave.disabled = false;
                        btnSave.textContent = 'Salvar Alterações';
                    });
            },

            reativarTreino: (treinoId) => {
                // Usar app.dialog.confirm ao invés de confirm nativo
                if (typeof app !== 'undefined' && app.dialog) {
                    app.dialog.confirm(
                        'Todos os exercícios serão desmarcados.',
                        'Deseja reativar este treino?',
                        function() {
                            // Usuário confirmou - executar reativação
                            executarReativacao(treinoId);
                        },
                        function() {
                            // Usuário cancelou - não fazer nada
                            console.log('Reativação cancelada pelo usuário');
                        }
                    );
                } else {
                    // Fallback para navegadores sem Framework7
                    if (confirm('Deseja reativar este treino? Todos os exercícios serão desmarcados.')) {
                        executarReativacao(treinoId);
                    }
                }

                function executarReativacao(treinoId) {
                    const professorId = localStorage.getItem('professor_id');

                    if (typeof app !== 'undefined') {
                        app.dialog.preloader('Reativando treino...');
                    }

                    fetch('https://proatleta.site/reativar_treino.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            treino_id: treinoId,
                            professor_id: professorId
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (typeof app !== 'undefined') {
                            app.dialog.close();
                        }

                        if (data.success) {
                            const mensagem = data.exercicios_desmarcados > 0 
                                ? `Treino reativado! ${data.exercicios_desmarcados} exercício(s) desmarcado(s).`
                                : 'Treino reativado com sucesso!';

                            if (typeof app !== 'undefined') {
                                app.toast.create({
                                    text: mensagem,
                                    position: 'center',
                                    closeTimeout: 3000
                                }).open();
                            }

                            // Limpar cache do treino reativado no localStorage
                            try {
                                const treinoCache = localStorage.getItem('treinoSelecionado');
                                if (treinoCache) {
                                    const treino = JSON.parse(treinoCache);
                                    if (treino.id === treinoId) {
                                        localStorage.removeItem('treinoSelecionado');
                                    }
                                }
                            } catch (e) {
                                console.warn('Erro ao limpar cache:', e);
                            }

                            // Recarregar lista de treinos
                            window.SistemaVerTreinos.actions.carregarTreinos();
                        } else {
                            throw new Error(data.message || 'Erro ao reativar treino');
                        }
                    })
                    .catch(error => {
                        if (typeof app !== 'undefined') {
                            app.dialog.close();
                            app.toast.create({
                                text: error.message || 'Erro ao reativar treino',
                                position: 'center',
                                closeTimeout: 3000
                            }).open();
                        }
                        console.error('Erro:', error);
                    });
                }
            },
        },

        inicializar: () => {
            const sistema = window.SistemaVerTreinos;
            console.log('Inicializando sistema de visualização de treinos...');

            sistema.actions.carregarTreinos();
            sistema.config.inicializado = true;
        },

        reinicializar: () => {
            const sistema = window.SistemaVerTreinos;
            sistema.config.inicializado = false;
            sistema.config.treinosData = [];

            // Resetar dados do aluno usando email como fonte principal
            sistema.config.emailAluno = localStorage.getItem('alunoSelecionado') || '';
            sistema.config.nomeAluno = localStorage.getItem('nomeAlunoSelecionado') || 'Aluno';
            sistema.config.alunoId = '';
            sistema.config.fotoAluno = null;

            sistema.inicializar();
        }
    };

    // Eventos de inicialização
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.SistemaVerTreinos.inicializar);
    } else {
        window.SistemaVerTreinos.inicializar();
    }

    // Eventos Framework7
    if (typeof app !== 'undefined') {
        app.on('pageInit', (page) => {
            if (page.name === 'ver_treinos_aluno') {
                window.SistemaVerTreinos.inicializar();
            }
        });
    }

    console.log('Sistema de visualização de treinos inicializado');
})();