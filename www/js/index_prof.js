// Script responsável pelo bloco de boas-vindas da tela do professor

(function () {
    'use strict';

    // Função principal para carregar dados (copiada exatamente de foto_prof.js)
    function carregarDadosUsuarioProf() {
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
                    if (welcomeNameEl) welcomeNameEl.textContent = data.usuario.nome || 'Professor';
                    
                    // Atualiza localStorage também
                    localStorage.setItem('userNome', data.usuario.nome || '');
                } else {
                    // Se não achou, usa dados do localStorage ou default
                    if (welcomePhotoEl) welcomePhotoEl.src = localStorage.getItem('userFoto') || 'img/user.jpg';
                    if (welcomeNameEl) welcomeNameEl.textContent = localStorage.getItem('userNome') || 'Professor';
                }
            })
            .catch(() => {
                // Em caso de erro, usa localStorage ou default
                if (welcomePhotoEl) welcomePhotoEl.src = localStorage.getItem('userFoto') || 'img/user.jpg';
                if (welcomeNameEl) welcomeNameEl.textContent = localStorage.getItem('userNome') || 'Professor';
            });
    }

    // Executa quando a página for carregada
    document.addEventListener('page:afterin', function (e) {
        if (e.detail.name === 'index' || (e.detail.route && e.detail.route.path === '/prof/')) {
            console.log('Página professor carregada - executando lógica dos perfis');
            carregarDadosUsuarioProf();
            initSummaryBlock();
        }
    });

    // Executa também no DOM ready para primeira carga
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM ready prof - executando carregamento de dados');
        setTimeout(carregarDadosUsuarioProf, 100);
        initSummaryBlock();
    });

    // Inicialização imediata
    setTimeout(carregarDadosUsuarioProf, 100);

    function initSummaryBlock() {
        const countEl = document.getElementById('countAlunos');
        const perfilEmail = document.getElementById('perfilEmail');
        const nextEvent = document.getElementById('nextEvent');
        const ultimoTreino = document.getElementById('ultimoTreino');

        if (countEl) {
            const associados = localStorage.getItem('associados_count') || localStorage.getItem('associados') || '';
            countEl.textContent = associados ? (associados + ' alunos') : 'Abrir lista';
        }
        if (perfilEmail) perfilEmail.textContent = localStorage.getItem('userEmail') || 'Abrir perfil';
        if (nextEvent) nextEvent.textContent = localStorage.getItem('proximo_evento') || 'Sem eventos';
        if (ultimoTreino) ultimoTreino.textContent = localStorage.getItem('ultimo_treino_nome') || '—';

        // Keep navigation compatible with Framework7 SPA (no-op here, router will handle links)
        document.querySelectorAll('.summary-card.link').forEach(function (el) {
            el.addEventListener('click', function () {
                // placeholder: left intentionally empty to preserve default link behavior
            });
        });
    }

    // Expose simple refresh if needed
    window.indexProfSummaryRefresh = initSummaryBlock;
})();