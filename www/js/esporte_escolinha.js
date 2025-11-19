document.addEventListener('pageInit', function (e) {
  const page = e.detail.page;
  
  // Garante que o código só roda na página esporte_escolinha
  if (page.name === 'esporte_escolinha') {
    const buttons = page.el.querySelectorAll('.sport-button');
    const linkContainer = page.el.querySelector('#goToEscolinhas');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remover seleção anterior
        buttons.forEach(b => b.classList.remove('selected'));

        // Selecionar atual
        btn.classList.add('selected');

        // Salvar no localStorage
        const esporte = btn.dataset.sport;
        localStorage.setItem('esporteSelecionado', esporte);

        // Mostrar link
        linkContainer.style.display = 'block';
      });
    });
  }
});
