document.addEventListener('DOMContentLoaded', function () {
    // Máscaras para CPF e Telefone
    const cpfInput = document.getElementById('cpf');
    const telefoneInput = document.getElementById('telefone');
    const nomeInput = document.getElementById('nome');
    const sobrenomeInput = document.getElementById('sobrenome');

    // Limitar tamanho dos inputs
    if (nomeInput) {
        nomeInput.addEventListener("input", function (event) {
            let input = event.target.value;
            if (input.length > 60) input = input.slice(0, 60);
            event.target.value = input;
        });
    }

    if (sobrenomeInput) {
        sobrenomeInput.addEventListener("input", function (event) {
            let input = event.target.value;
            if (input.length > 60) input = input.slice(0, 60);
            event.target.value = input;
        });
    }

    // Máscara CPF: 000.000.000-00
    if (cpfInput) {
        cpfInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            }
            e.target.value = value;
        });
    }

    // Máscara Telefone: (00) 00000-0000
    if (telefoneInput) {
        telefoneInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                value = value.replace(/(\d)(\d{4})$/, '$1-$2');
            }
            e.target.value = value;
        });
    }

    // Validação e salvamento dos dados
    const form = document.getElementById('cadastroForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // Validações
            const nome = document.getElementById('nome').value.trim();
            const sobrenome = document.getElementById('sobrenome').value.trim();
            const dataNascimento = document.getElementById('dataNascimento').value;
            const cpf = document.getElementById('cpf').value;
            const telefone = document.getElementById('telefone').value;

            if (!nome || !sobrenome || !dataNascimento || !cpf || !telefone) {
                app.dialog.alert('Por favor, preencha todos os campos!');
                return;
            }

            // Validar CPF (11 dígitos) - REMOVER MÁSCARA
            const cpfDigits = cpf.replace(/\D/g, '');
            if (cpfDigits.length !== 11) {
                app.dialog.alert('CPF inválido! Digite 11 dígitos.');
                return;
            }

            // Validar Telefone (10 ou 11 dígitos) - REMOVER MÁSCARA
            const telefoneDigits = telefone.replace(/\D/g, '');
            if (telefoneDigits.length < 10 || telefoneDigits.length > 11) {
                app.dialog.alert('Telefone inválido!');
                return;
            }

            // Validar data de nascimento (não pode ser futura)
            const dataNasc = new Date(dataNascimento);
            const hoje = new Date();
            if (dataNasc > hoje) {
                app.dialog.alert('Data de nascimento não pode ser no futuro!');
                return;
            }

            // Salvar dados no sessionStorage - SEM MÁSCARAS
            sessionStorage.setItem('cadastro_nome', nome);
            sessionStorage.setItem('cadastro_sobrenome', sobrenome);
            sessionStorage.setItem('cadastro_dataNascimento', dataNascimento);
            sessionStorage.setItem('cadastro_cpf', cpfDigits); // APENAS NÚMEROS
            sessionStorage.setItem('cadastro_telefone', telefoneDigits); // APENAS NÚMEROS

            // Ir para a próxima etapa
            window.location.href = 'cadastro_prof2.html';
        });
    }
});