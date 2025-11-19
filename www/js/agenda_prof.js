// ========================================
// SISTEMA DE AGENDA - GESTÃO DE ALUNOS
// ========================================

// Sistema de gerenciamento de alunos para agenda
(function () {
    'use strict';

    window.SistemaAgenda = {
        config: {
            userType: localStorage.getItem("userType"),
            userId: localStorage.getItem("userId"),
            professorId: localStorage.getItem("professor_id"),
            get finalProfessorId() {
                return this.professorId || this.userId;
            },
            inicializado: false
        },

        utils: {
            // Ajustar busca de container
            getContainer() {
                return document.querySelector('[data-name="agenda-alunos"] #listaAlunosAgenda');
            },

            mostrarErro: (mensagem) => {
                const container = window.SistemaAgenda.utils.getContainer();
                if (container) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="mdi mdi-alert-circle-outline"></i>
                            <h3>Erro</h3>
                            <p>${mensagem}</p>
                            <button class="button-fill" onclick="window.SistemaAgenda.actions.carregarAlunos()">
                                Tentar Novamente
                            </button>
                        </div>`;
                }
            },

            mostrarListaVazia: () => {
                const container = window.SistemaAgenda.utils.getContainer();
                if (container) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="mdi mdi-account-group-outline"></i>
                            <h3>Nenhum aluno encontrado</h3>
                            <p>Você ainda não tem alunos vinculados</p>
                        </div>`;
                }
            },

            criarCardAluno: (aluno) => {
                const div = document.createElement("div");
                div.classList.add("aluno-card");
                div.setAttribute("data-aluno-id", aluno.id || '');
                div.setAttribute("data-email", aluno.email || '');

                // Define a foto do aluno, usando uma padrão se não tiver
                const fotoAluno = aluno.foto || 'img/user.jpg';

                div.innerHTML = `
                    <div class="aluno-foto">
                        <img src="${fotoAluno}" alt="Foto do aluno" onerror="this.src='img/user.jpg'">
                    </div>
                    <div class="aluno-info">
                        <div class="aluno-nome">${aluno.nome || 'Nome não disponível'}</div>
                    </div>
                    <div class="aluno-actions">
                        <button class="btn-agenda" onclick="window.SistemaAgenda.actions.irParaAgendaAluno(${aluno.id}, '${aluno.nome}')">
                            <i class="ri-calendar-line"></i> Ver
                        </button>
                    </div>
                `;

                return div;
            }
        },

        actions: {
            carregarAlunos: () => {
                const sistema = window.SistemaAgenda;
                const container = sistema.utils.getContainer();
                if (!container) {
                    console.log('Container agenda não presente (provavelmente fora da página).');
                    return;
                }

                console.log("Carregando alunos para agenda...");

                if (sistema.config.userType !== "prof") {
                    sistema.utils.mostrarErro("Acesso restrito a professores");
                    return;
                }

                if (!sistema.config.finalProfessorId) {
                    sistema.utils.mostrarErro("ID do professor não encontrado");
                    return;
                }

                fetch(`https://proatleta.site/get_alunos_professor.php?professor_id=${sistema.config.finalProfessorId}`)
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        container.innerHTML = "";

                        if (data.success && data.alunos && data.alunos.length > 0) {
                            data.alunos.forEach(aluno => {
                                container.appendChild(sistema.utils.criarCardAluno(aluno));
                            });
                        } else {
                            sistema.utils.mostrarListaVazia();
                        }
                    })
                    .catch(error => {
                        console.error("Erro ao buscar alunos:", error);
                        sistema.utils.mostrarErro('Erro ao conectar com o servidor: ' + error.message);
                    });
            },

            irParaAgendaAluno: (alunoId, nome) => {
                console.log('Navegando para agenda do aluno ID:', alunoId);
                localStorage.setItem('alunoSelecionadoId', alunoId);
                localStorage.setItem('nomeAlunoSelecionado', nome);

                // Navegar para a página da agenda do aluno
                if (typeof app !== 'undefined' && app.views && app.views.main) {
                    app.views.main.router.navigate('/agenda_aluno/');
                } else {
                    // Fallback para navegação direta
                    window.location.href = 'agenda_aluno.html';
                }
            },

            filtrarAlunos: (busca) => {
                const container = window.SistemaAgenda.utils.getContainer();
                if (!container) return;
                const cards = container.querySelectorAll('.aluno-card');
                const termoBusca = busca.toLowerCase();

                cards.forEach(card => {
                    const nome = card.querySelector('.aluno-nome').textContent.toLowerCase();

                    if (nome.includes(termoBusca)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
        },

        inicializar: () => {
            const sistema = window.SistemaAgenda;
            if (sistema.config.inicializado) return;
            const container = sistema.utils.getContainer();
            if (!container) return;
            const buscarInput = document.getElementById('buscarAlunoAgenda');
            if (buscarInput && !buscarInput.hasAttribute('data-agenda-listener')) {
                buscarInput.addEventListener('input', e => sistema.actions.filtrarAlunos(e.target.value));
                buscarInput.setAttribute('data-agenda-listener', 'true');
            }
            setTimeout(() => sistema.actions.carregarAlunos(), 100);
            sistema.config.inicializado = true;
        }
    };

    // Inicializar quando o DOM estiver pronto
    const tentarInit = () => {
        if (document.querySelector('[data-name="agenda-alunos"] #listaAlunosAgenda')) {
            window.SistemaAgenda.inicializar();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tentarInit);
    } else {
        tentarInit();
    }

    // Expor função globalmente
    window.carregarAlunosAgenda = window.SistemaAgenda.actions.carregarAlunos;

})();