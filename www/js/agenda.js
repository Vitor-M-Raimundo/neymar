// =================================================================
// AGENDA.JS - AGENDA PESSOAL DO ALUNO LOGADO
// =================================================================

console.log('=== AGENDA.JS CARREGADO ===');

// Classe principal do calendário do aluno
class CalendarioAluno {
    constructor() {
        console.log('Inicializando CalendarioAluno...');

        // Loading state management
        this.isLoading = true;
        this.loadingSteps = {
            dadosAluno: false,
            calendario: false,
            eventos: false,
            interface: false
        };

        this.hoje = new Date();
        this.mesAtual = this.hoje.getMonth();
        this.anoAtual = this.hoje.getFullYear();
        this.diaSelecionado = this.hoje.getDate();

        this.meses = [
            'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
            'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
        ];

        // Dados do aluno logado - USAR ID DO ALUNO
        this.alunoId = localStorage.getItem('userId') || ''; // Usar userId como alunoId
        this.emailAluno = localStorage.getItem('userEmail') || '';
        this.nomeAluno = localStorage.getItem('userNome') || 'Aluno';
        
        console.log('Dados do aluno logado:', {
            alunoId: this.alunoId,
            email: this.emailAluno,
            nome: this.nomeAluno
        });

        // Sistema de eventos do aluno
        this.eventos = {};
        this.eventosCarregados = {};

        // Inicializar com loading
        this.mostrarLoading();
        setTimeout(() => this.init(), 100);
    }

    mostrarLoading() {
        const overlay = document.getElementById('loadingOverlay');
        const pageContent = document.getElementById('pageContent');
        
        if (overlay) overlay.style.display = 'flex';
        if (pageContent) pageContent.style.display = 'none';
        
        this.atualizarProgresso(10);
    }

    atualizarProgresso(percent) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
    }

    verificarCarregamentoCompleto() {
        const todosCarregados = Object.values(this.loadingSteps).every(step => step === true);
        
        if (todosCarregados && this.isLoading) {
            this.isLoading = false;
            this.esconderLoading();
        }
    }

    esconderLoading() {
        this.atualizarProgresso(100);
        
        setTimeout(() => {
            const overlay = document.getElementById('loadingOverlay');
            const pageContent = document.getElementById('pageContent');
            
            if (overlay) {
                overlay.classList.add('hide');
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 500);
            }
            
            if (pageContent) {
                pageContent.classList.add('show');
            }
            
            console.log('✅ Agenda totalmente carregada');
        }, 500);
    }

    init() {
        console.log('Inicializando calendário do aluno...');

        // Verificar se dados necessários existem
        if (!this.alunoId) {
            console.error('ID do aluno não encontrado');
            this.mostrarErroCarregamento('Dados do usuário não encontrados. Faça login novamente.');
            return;
        }

        this.atualizarProgresso(20);

        // Atualizar informações do aluno na interface
        this.atualizarInfoAluno();
        this.loadingSteps.dadosAluno = true;

        this.atualizarProgresso(40);

        // Verificar se elementos essenciais existem
        const elementos = ['diaAtual', 'mesAtual', 'anoAtual', 'diasGrid', 'eventosContainer'];
        const todosExistem = elementos.every(id => {
            const elemento = document.getElementById(id);
            if (!elemento) {
                console.warn(`Elemento ${id} não encontrado`);
            }
            return elemento;
        });

        if (!todosExistem) {
            console.log('Elementos não prontos, tentando novamente...');
            setTimeout(() => this.init(), 100);
            return;
        }

        console.log('✅ Todos elementos encontrados, inicializando...');

        this.atualizarProgresso(60);

        // Inicializar componentes
        this.atualizarDisplay();
        this.gerarCalendario();
        this.loadingSteps.calendario = true;
        this.loadingSteps.interface = true;

        this.atualizarProgresso(80);

        // Carregar eventos (async)
        this.carregarEventosAluno();

        console.log('✅ Calendário do aluno inicializado com sucesso');
    }

    mostrarErroCarregamento(mensagem) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner" style="color: #ff4444;">
                        <i class="ri-error-warning-line"></i>
                    </div>
                    <h3>Erro ao Carregar</h3>
                    <p>${mensagem}</p>
                    <button onclick="location.reload()" style="background: white; color: var(--laranja); border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 20px;">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    atualizarInfoAluno() {
        const nomeElement = document.getElementById('nomeAlunoLogado');
        const emailElement = document.getElementById('emailAlunoLogado');

        if (nomeElement) nomeElement.textContent = `Minha Agenda - ${this.nomeAluno.split(' ')[0]}`;
        if (emailElement) emailElement.textContent = this.emailAluno;
    }

    mostrarErro(mensagem) {
        const container = document.getElementById('eventosContainer');
        if (container) {
            container.innerHTML = `
                <div class="sem-eventos" style="color: #e53e3e;">
                    <i class="ri-error-warning-line"></i>
                    ${mensagem}
                </div>
            `;
        }
    }

    atualizarDisplay() {
        const diaElement = document.getElementById('diaAtual');
        const mesElement = document.getElementById('mesAtual');
        const anoElement = document.getElementById('anoAtual');

        if (diaElement && mesElement && anoElement) {
            // Forçar limpeza e atualização
            diaElement.innerHTML = '';
            mesElement.innerHTML = '';
            anoElement.innerHTML = '';

            // Pequeno delay para forçar repaint
            setTimeout(() => {
                diaElement.textContent = this.diaSelecionado.toString().padStart(2, '0');
                mesElement.textContent = this.meses[this.mesAtual];
                anoElement.textContent = this.anoAtual.toString();

                console.log('Display atualizado:', {
                    dia: this.diaSelecionado,
                    mes: this.meses[this.mesAtual],
                    ano: this.anoAtual
                });
            }, 10);
        } else {
            console.error('Elementos de display não encontrados');
        }
    }

    mudarMes(direcao) {
        console.log('Mudando mês:', direcao);

        this.mesAtual += direcao;

        if (this.mesAtual > 11) {
            this.mesAtual = 0;
            this.anoAtual++;
        } else if (this.mesAtual < 0) {
            this.mesAtual = 11;
            this.anoAtual--;
        }

        // Ajustar dia selecionado se necessário
        const diasNoNovoMes = new Date(this.anoAtual, this.mesAtual + 1, 0).getDate();
        if (this.diaSelecionado > diasNoNovoMes) {
            this.diaSelecionado = diasNoNovoMes;
        }

        this.atualizarDisplay();
        this.gerarCalendario();
        this.carregarEventosAluno();
        this.mostrarEventos();
    }

    gerarCalendario() {
        const diasGrid = document.getElementById('diasGrid');
        if (!diasGrid) {
            console.error('Elemento diasGrid não encontrado');
            return;
        }

        diasGrid.innerHTML = '';

        const primeiroDia = new Date(this.anoAtual, this.mesAtual, 1);
        const ultimoDia = new Date(this.anoAtual, this.mesAtual + 1, 0);
        const diasNoMes = ultimoDia.getDate();
        const diaSemanaInicio = primeiroDia.getDay();

        // Dias do mês anterior
        const mesAnterior = new Date(this.anoAtual, this.mesAtual, 0);
        const diasMesAnterior = mesAnterior.getDate();

        for (let i = diaSemanaInicio - 1; i >= 0; i--) {
            const dia = this.criarDia(diasMesAnterior - i, 'mes-anterior');
            diasGrid.appendChild(dia);
        }

        // Dias do mês atual
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const classes = [];
            const dataKey = `${this.anoAtual}-${(this.mesAtual + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;

            // Verificar se é hoje
            if (dia === this.hoje.getDate() &&
                this.mesAtual === this.hoje.getMonth() &&
                this.anoAtual === this.hoje.getFullYear()) {
                classes.push('hoje');
            }

            // Verificar se está selecionado
            if (dia === this.diaSelecionado) {
                classes.push('selecionado');
            }

            // Verificar se tem eventos
            if (this.eventos[dataKey] && this.eventos[dataKey].length > 0) {
                classes.push('com-evento');
            }

            const diaElement = this.criarDia(dia, classes.join(' '));
            diaElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selecionarDia(dia, e.target);
            });
            diasGrid.appendChild(diaElement);
        }

        // Dias do próximo mês para completar o grid
        const totalCelulas = diasGrid.children.length;
        const celulasFaltantes = 42 - totalCelulas; // 6 semanas x 7 dias

        for (let dia = 1; dia <= Math.min(celulasFaltantes, 14); dia++) {
            const diaElement = this.criarDia(dia, 'proximo-mes');
            diasGrid.appendChild(diaElement);
        }
    }

    criarDia(numero, classes = '') {
        const dia = document.createElement('div');
        dia.className = `dia ${classes}`.trim();
        dia.textContent = numero;
        dia.style.display = 'flex';
        return dia;
    }

    selecionarDia(dia, elemento) {
        // Remove seleção anterior
        document.querySelectorAll('.dia.selecionado').forEach(el => {
            el.classList.remove('selecionado');
        });

        // Adiciona nova seleção
        if (elemento) {
            elemento.classList.add('selecionado');
        }

        this.diaSelecionado = dia;
        this.atualizarDisplay();
        this.mostrarEventos();
    }

    carregarEventosAluno() {
        if (!this.alunoId) {
            console.warn('ID do aluno não encontrado para carregar eventos');
            this.loadingSteps.eventos = true;
            this.verificarCarregamentoCompleto();
            return;
        }

        const mesChave = `${this.anoAtual}-${(this.mesAtual + 1).toString().padStart(2, '0')}`;
        
        // Verificar se já carregamos este mês
        if (this.eventosCarregados[mesChave]) {
            this.mostrarEventos();
            this.loadingSteps.eventos = true;
            this.verificarCarregamentoCompleto();
            return;
        }

        console.log('Carregando TODOS os eventos para aluno ID:', this.alunoId, 'mês:', mesChave);

        // BUSCAR TODOS OS EVENTOS DO ALUNO - USANDO ALUNO_ID
        const url = `https://proatleta.site/get_eventos_aluno.php?aluno_id=${encodeURIComponent(this.alunoId)}&mes=${mesChave}`;

        console.log('URL da requisição:', url);

        fetch(url)
            .then(response => {
                console.log('Status da resposta:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Resposta do servidor:', data);

                if (data.success) {
                    // Limpar eventos do mês atual
                    Object.keys(this.eventos).forEach(key => {
                        if (key.startsWith(mesChave)) {
                            delete this.eventos[key];
                        }
                    });

                    // Organizar eventos por data
                    if (data.eventos && data.eventos.length > 0) {
                        console.log(`✅ Encontrados ${data.eventos.length} eventos para o mês ${mesChave}`);
                        
                        data.eventos.forEach(evento => {
                            console.log('Processando evento:', evento);
                            if (!this.eventos[evento.data]) {
                                this.eventos[evento.data] = [];
                            }
                            this.eventos[evento.data].push(evento);
                        });
                    } else {
                        console.log('📅 Nenhum evento encontrado para este mês');
                    }

                    // Marcar como carregado
                    this.eventosCarregados[mesChave] = true;

                    // Atualizar interface
                    this.gerarCalendario(); // Regerar para mostrar dias com eventos
                    this.mostrarEventos();
                    
                    console.log('✅ Eventos carregados e interface atualizada');
                } else {
                    console.warn('Resposta não bem-sucedida:', data.message);
                    this.mostrarSemEventos();
                }
                
                this.loadingSteps.eventos = true;
                this.verificarCarregamentoCompleto();
            })
            .catch(error => {
                console.error('❌ Erro ao carregar eventos:', error);
                this.mostrarSemEventos();
                this.loadingSteps.eventos = true;
                this.verificarCarregamentoCompleto();
            });
    }

    mostrarSemEventos() {
        const container = document.getElementById('eventosContainer');
        if (container) {
            container.innerHTML = `
                <div class="sem-eventos">
                    <i class="ri-calendar-line"></i>
                    <h3>Nenhum evento hoje</h3>
                    <p>Você não possui eventos agendados para este dia.</p>
                </div>
            `;
        }
    }

    mostrarEventos() {
        const container = document.getElementById('eventosContainer');
        if (!container) return;

        const dataKey = `${this.anoAtual}-${(this.mesAtual + 1).toString().padStart(2, '0')}-${this.diaSelecionado.toString().padStart(2, '0')}`;
        const eventosDoDia = this.eventos[dataKey] || [];

        console.log(`Mostrando eventos para ${dataKey}:`, eventosDoDia);

        if (eventosDoDia.length === 0) {
            container.innerHTML = `
                <div class="sem-eventos">
                    <i class="ri-calendar-line"></i>
                    <h3>Nenhum evento hoje</h3>
                    <p>Você não possui eventos agendados para este dia.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = eventosDoDia.map(evento => `
            <div class="evento-item">
                <div class="evento-info">
                    <div class="evento-titulo">${evento.titulo}</div>
                    <div class="evento-detalhes">
                        <div class="evento-horario">
                            <i class="ri-time-line"></i>
                            <span>${evento.horario}</span>
                        </div>
                        <div class="evento-local">
                            <i class="ri-map-pin-line"></i>
                            <span>${evento.local}</span>
                        </div>
                    </div>
                    ${evento.descricao ? `<div class="evento-descricao">${evento.descricao}</div>` : ''}
                </div>
            </div>
        `).join('');
    }
}

// =================================================================
// VARIÁVEIS GLOBAIS E INSTÂNCIA DO CALENDÁRIO
// =================================================================

// Instância global do calendário
let calendarioInstance = null;

// =================================================================
// FUNÇÕES GLOBAIS CHAMADAS PELOS BOTÕES HTML
// =================================================================

function voltar() {
    console.log('Voltando para página anterior');
    if (typeof app !== 'undefined' && app.views && app.views.main) {
        app.views.main.router.back();
    } else if (window.history.length > 1) {
        window.history.back();
    } else {
        console.log('Não há página anterior');
    }
}

function mudarMes(direcao) {
    console.log('Função mudarMes chamada:', direcao);
    if (calendarioInstance && typeof calendarioInstance.mudarMes === 'function') {
        calendarioInstance.mudarMes(direcao);
    } else {
        console.error('Calendário não inicializado');
        // Tentar reinicializar
        initCalendario();
        setTimeout(() => {
            if (calendarioInstance) {
                calendarioInstance.mudarMes(direcao);
            }
        }, 200);
    }
}

function toggleFiltros() {
    console.log('Toggle filtros');
    if (typeof app !== 'undefined' && app.dialog) {
        app.dialog.alert('Filtros estão disponíveis apenas na versão do professor!', 'Info');
    } else {
        alert('Filtros estão disponíveis apenas na versão do professor!');
    }
}

function adicionarEvento() {
    console.log('Adicionar evento - apenas professor pode adicionar');
    if (typeof app !== 'undefined' && app.dialog) {
        app.dialog.alert('Apenas seu professor pode adicionar eventos à sua agenda!', 'Informação');
    } else {
        alert('Apenas seu professor pode adicionar eventos à sua agenda!');
    }
}

function irPara(rota) {
    console.log('Navegando para:', rota);
    if (typeof app !== 'undefined' && app.views && app.views.main) {
        app.views.main.router.navigate(rota);
    } else {
        console.log(`Tentativa de navegar para: ${rota}`);
    }
}

// =================================================================
// FUNÇÃO DE INICIALIZAÇÃO PRINCIPAL
// =================================================================

function initCalendario() {
    console.log('=== INIT CALENDÁRIO ALUNO CHAMADO ===');

    try {
        // Limpar instância anterior se existir
        calendarioInstance = null;

        // Criar nova instância do calendário
        console.log('✅ Criando nova instância do calendário do aluno...');
        calendarioInstance = new CalendarioAluno();

        console.log('✅ Calendário do aluno inicializado com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao inicializar calendário:', error);

        // Mostrar erro de carregamento
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner" style="color: #ff4444;">
                        <i class="ri-error-warning-line"></i>
                    </div>
                    <h3>Erro ao Carregar</h3>
                    <p>Ocorreu um erro ao inicializar o calendário</p>
                    <button onclick="location.reload()" style="background: white; color: var(--laranja); border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 20px;">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
}

// =================================================================
// FUNÇÃO PARA ATUALIZAR CALENDÁRIO EXISTENTE
// =================================================================

function updateCalendario() {
    console.log('=== UPDATE CALENDÁRIO CHAMADO ===');

    if (calendarioInstance) {
        console.log('📱 Atualizando calendário existente...');
        try {
            calendarioInstance.atualizarDisplay();
            calendarioInstance.gerarCalendario();
            calendarioInstance.mostrarEventos();
            console.log('✅ Calendário atualizado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao atualizar calendário:', error);
            // Se falhar, reinicializar
            initCalendario();
        }
    } else {
        console.log('📱 Calendário não existe, inicializando...');
        initCalendario();
    }
}

// =================================================================
// EXPOR FUNÇÕES PARA O WINDOW (FRAMEWORK7 PRECISA DISSO)
// =================================================================

window.initCalendario = initCalendario;
window.updateCalendario = updateCalendario;
window.calendarioInstance = calendarioInstance;
window.voltar = voltar;
window.mudarMes = mudarMes;
window.toggleFiltros = toggleFiltros;
window.adicionarEvento = adicionarEvento;
window.irPara = irPara;

// =================================================================
// AUTO-INICIALIZAÇÃO COM FORÇA
// =================================================================

console.log('🚀 Script agenda.js (versão aluno independente) carregado...');

// FORÇAR INICIALIZAÇÃO INDEPENDENTE DE ROTAS
setTimeout(() => {
    console.log('🚀 Auto-inicializando calendário do aluno (forçado)...');
    initCalendario();
}, 200);

// TAMBÉM TENTAR QUANDO DOCUMENT READY
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Ready - Tentando inicializar calendário...');
    setTimeout(() => {
        if (!calendarioInstance) {
            console.log('📄 Inicializando via DOMContentLoaded...');
            initCalendario();
        }
    }, 300);
});

// ESCUTAR EVENTO DE PÁGINA MOSTRADA (FRAMEWORK7)
document.addEventListener('page:init', function (e) {
    if (e.detail.name === 'agenda') {
        console.log('📱 Página agenda inicializada via Framework7');
        setTimeout(() => {
            initCalendario();
        }, 100);
    }
});

console.log('=== FIM AGENDA.JS ===');