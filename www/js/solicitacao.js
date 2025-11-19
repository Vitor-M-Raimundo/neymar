(function () {
    const form = document.getElementById('buscarAlunoForm');
    if (!form) return;
    if (form.__bound) return;
    form.__bound = true;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const emailAluno = document.getElementById('busca_email')?.value?.trim() || '';
        const idProfessor = parseInt(localStorage.getItem('professor_id'), 10);

        if (emailAluno.length === 0) {
            app.dialog.alert('Digite o email do aluno.', 'Aviso');
            return;
        }

        if (isNaN(idProfessor)) {
            app.dialog.alert('ID do professor inválido. Faça login novamente.', 'Erro');
            return;
        }

        const params = new URLSearchParams();
        params.append('busca_email', emailAluno);
        params.append('id_professor', idProfessor);

        fetch('https://proatleta.site/solicitacao.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        })
        .then(r => {
            if (!r.ok) throw new Error('Falha na rede');
            return r.json();
        })
        .then(data => {
            app.dialog.alert(data.message, data.success ? 'Sucesso' : 'Erro');
        })
        .catch(() => {
            app.dialog.alert('Ocorreu um erro ao enviar os dados.', 'Erro');
        });
    });
})();