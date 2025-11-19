// Não criar Framework7 se já existir (routes.js já inicializa em seu projeto)
if (!window.app) {
    window.app = new Framework7({
        // ...existing code...
    });
} else {
    console.log('Framework7 já inicializado — reutilizando window.app');
}
// garantir referência local para o resto do arquivo
var app = window.app;

// Função principal para carregar dados (copiada exatamente de salvar_foto.js)
function carregarDadosUsuarioIndex() {
    const email = localStorage.getItem('userEmail');
    const welcomeNameEl = document.getElementById('welcomeUserName');
    const welcomePhotoEl = document.getElementById('welcomeUserPhoto');

    if (!email) return;

    // Busca os dados do usuário do servidor (usando o mesmo endpoint dos perfis)
    fetch('https://proatleta.site/get_usuario.php?email=' + encodeURIComponent(email))
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem('userFoto', data.usuario.foto); // foto do banco
                if (welcomePhotoEl) welcomePhotoEl.src = data.usuario.foto || 'img/user.jpg';
                if (welcomeNameEl) welcomeNameEl.textContent = data.usuario.nome || 'Atleta';
                
                // Atualiza localStorage também
                localStorage.setItem('userNome', data.usuario.nome || '');
            } else {
                // Se não achou, usa dados do localStorage ou default
                if (welcomePhotoEl) welcomePhotoEl.src = localStorage.getItem('userFoto') || 'img/user.jpg';
                if (welcomeNameEl) welcomeNameEl.textContent = localStorage.getItem('userNome') || 'Atleta';
            }
        })
        .catch(() => {
            // Em caso de erro, usa localStorage ou default
            if (welcomePhotoEl) welcomePhotoEl.src = localStorage.getItem('userFoto') || 'img/user.jpg';
            if (welcomeNameEl) welcomeNameEl.textContent = localStorage.getItem('userNome') || 'Atleta';
        });
}

// Executa quando a página for carregada
document.addEventListener('page:afterin', function (e) {
    if (e.detail.name === 'index') {
        console.log('Página index carregada - executando lógica dos perfis');
        carregarDadosUsuarioIndex();
    }
});

// Executa também no DOM ready para primeira carga
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM ready - executando carregamento de dados');
    setTimeout(carregarDadosUsuarioIndex, 100);
    atualizarTabbarPorTipoUsuario();
});

// Keep existing tabbar update function
function atualizarTabbarPorTipoUsuario() { 
    const userType = localStorage.getItem('userType');

    document.querySelectorAll('.aluno-link, .prof-link').forEach(el => {
        el.style.display = 'none';
    });

    if (userType === 'aluno') {
        document.querySelectorAll('.aluno-link').forEach(el => {
            el.style.display = 'flex';
        });
    } else if (userType === 'prof') {
        document.querySelectorAll('.prof-link').forEach(el => {
            el.style.display = 'flex';
        });
    }
}

// Funções de compatibilidade (mantidas para não quebrar outros códigos)
function atualizarDadosUsuario() {
    carregarDadosUsuarioIndex();
}

function carregarFotoUsuario() {
    carregarDadosUsuarioIndex();
}

// Expor função globalmente
window.carregarDadosUsuario = carregarDadosUsuarioIndex;