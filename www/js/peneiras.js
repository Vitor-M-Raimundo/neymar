// Dados mock para fallback (caso a API falhe)
const PENEIRAS_MOCK = [
    {
        titulo: "Peneira Flamengo Sub-17",
        resumo: "O Flamengo abre inscrições para peneira da categoria sub-17. Venha fazer parte do time mais querido do Brasil!",
        data: "2024-02-15",
        link: "https://www.flamengo.com.br/peneiras"
    },
    {
        titulo: "Seleção Palmeiras Base",
        resumo: "Palmeiras realiza peneira para categorias de base. Inscrições abertas para atletas de 14 a 16 anos.",
        data: "2024-02-20",
        link: "https://www.palmeiras.com.br/peneiras"
    },
    {
        titulo: "Teste São Paulo FC",
        resumo: "São Paulo Futebol Clube abre vagas para testes nas categorias sub-15 e sub-17. Não perca essa oportunidade!",
        data: "2024-02-25",
        link: "https://www.saopaulofc.net/peneiras"
    }
];

async function carregarPeneiras() {
    const container = document.getElementById('peneirasContainer');
    
    if (!container) {
        console.error('Container peneirasContainer não encontrado');
        return;
    }
    
    // Mostrar loading
    container.innerHTML = `
        <div class="loading-peneiras">
            <i class="ri-loader-4-line"></i>
            <p>Carregando peneiras...</p>
        </div>
    `;

    try {
        console.log('Iniciando busca de peneiras...');
        
        const apiUrl = 'https://api-proatleta.onrender.com/peneiras';
        
        const response = await fetch(apiUrl);
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        let data = await response.json();
        
        console.log('Dados recebidos:', data);
        console.log('Tipo de dados:', typeof data);
        console.log('É array?', Array.isArray(data));
        
        // A API pode retornar um objeto com a propriedade 'peneiras' ou diretamente um array
        let peneiras;
        
        if (Array.isArray(data)) {
            peneiras = data;
        } else if (data.peneiras && Array.isArray(data.peneiras)) {
            peneiras = data.peneiras;
        } else if (data.data && Array.isArray(data.data)) {
            peneiras = data.data;
        } else {
            console.error('Formato de resposta inesperado:', data);
            throw new Error('Formato de resposta inválido');
        }
        
        console.log('Peneiras processadas:', peneiras);
        console.log('Total de peneiras:', peneiras.length);

        if (!peneiras || peneiras.length === 0) {
            mostrarEstadoVazio(container);
            return;
        }

        renderizarPeneiras(container, peneiras);

    } catch (error) {
        console.error('Erro ao carregar peneiras:', error);
        
        container.innerHTML = `
            <div class="error-state">
                <i class="ri-wifi-off-line"></i>
                <h3>Erro ao carregar</h3>
                <p>Não foi possível processar as peneiras. ${error.message}</p>
            </div>
        `;
    }
}

function renderizarPeneiras(container, peneiras) {
    container.innerHTML = peneiras.map(peneira => `
        <div class="peneira-card">
            <div class="peneira-header">
                <div>
                    <h3 class="peneira-title">${escapeHtml(peneira.titulo || 'Sem título')}</h3>
                </div>
                <span class="peneira-date">
                    <i class="ri-calendar-line"></i> ${formatarData(peneira.dataPublicacao || peneira.data)}
                </span>
            </div>
            <p class="peneira-resumo">${escapeHtml(peneira.resumo || 'Sem descrição disponível')}</p>
            ${peneira.link ? `
                <a href="#" class="peneira-link" onclick="abrirLink(event, '${escapeHtml(peneira.link)}')">
                    <i class="ri-external-link-line"></i>
                    Ver mais informações
                </a>
            ` : ''}
        </div>
    `).join('');
}

function mostrarEstadoVazio(container) {
    container.innerHTML = `
        <div class="empty-state">
            <i class="ri-calendar-close-line"></i>
            <h3>Nenhuma peneira disponível</h3>
            <p>Não há peneiras cadastradas no momento</p>
        </div>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatarData(dataString) {
    if (!dataString) return 'Data não informada';
    
    try {
        const data = new Date(dataString);
        
        // Verifica se a data é válida
        if (isNaN(data.getTime())) {
            return dataString;
        }
        
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        return `${dia}/${mes}/${ano}`;
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return dataString;
    }
}

function abrirLink(event, url) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Tentando abrir link:', url);
    
    if (!url) {
        console.error('URL vazia ou inválida');
        return;
    }
    
    // Adiciona protocolo se não tiver
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    console.log('URL formatada:', url);
    
    // Tenta abrir com InAppBrowser do Cordova
    if (typeof window.cordova !== 'undefined') {
        console.log('Cordova detectado, usando InAppBrowser');
        
        // Aguarda o dispositivo estar pronto
        document.addEventListener('deviceready', function() {
            if (window.cordova.InAppBrowser) {
                console.log('Abrindo com cordova.InAppBrowser.open');
                window.cordova.InAppBrowser.open(url, '_system', 'location=yes');
            } else {
                console.log('Abrindo com cordova.InAppBrowser direto');
                cordova.InAppBrowser.open(url, '_system', 'location=yes');
            }
        }, false);
        
        // Se já está pronto, abre direto
        if (window.cordova.InAppBrowser) {
            console.log('Device já pronto, abrindo direto');
            window.cordova.InAppBrowser.open(url, '_system', 'location=yes');
        }
    } else {
        // Fallback para navegador web
        console.log('Cordova não detectado, usando window.open');
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

// Expor função globalmente
window.carregarPeneiras = carregarPeneiras;
window.abrirLink = abrirLink;

console.log('✅ Script peneiras.js carregado e pronto');
