document.addEventListener('DOMContentLoaded', function () {
    // Verificar se há dados da etapa 1
    if (!sessionStorage.getItem('cadastro_nome')) {
        app.dialog.alert('Por favor, complete a primeira etapa do cadastro!', function () {
            window.location.href = 'cadastro.html';
        });
        return;
    }

    // Preencher campos ocultos com dados da etapa 1
    document.getElementById('hidden_nome').value = sessionStorage.getItem('cadastro_nome');
    document.getElementById('hidden_sobrenome').value = sessionStorage.getItem('cadastro_sobrenome');
    document.getElementById('hidden_dataNascimento').value = sessionStorage.getItem('cadastro_dataNascimento');
    document.getElementById('hidden_cpf').value = sessionStorage.getItem('cadastro_cpf');
    document.getElementById('hidden_telefone').value = sessionStorage.getItem('cadastro_telefone');

    // Limitar tamanho dos inputs
    const senhaInput = document.getElementById("senha");
    const emailInput = document.getElementById("email");
    const confirmarInput = document.getElementById("confirmar");

    if (senhaInput) {
        senhaInput.addEventListener("input", function (event) {
            let input = event.target.value;
            if (input.length > 14) input = input.slice(0, 14);
            event.target.value = input;
        });
    }

    if (emailInput) {
        emailInput.addEventListener("input", function (event) {
            let input = event.target.value;
            if (input.length > 60) input = input.slice(0, 60);
            event.target.value = input;
        });
    }

    if (confirmarInput) {
        confirmarInput.addEventListener("input", function (event) {
            let input = event.target.value;
            if (input.length > 14) input = input.slice(0, 14);
            event.target.value = input;
        });
    }

    // Toggle de visualização de senha
    function attachToggle(iconEl, targetInput) {
        if (!iconEl || !targetInput) return;
        if (iconEl.dataset.toggleAttached === '1') return;

        iconEl.addEventListener('click', function () {
            const type = targetInput.getAttribute('type') === 'password' ? 'text' : 'password';
            targetInput.setAttribute('type', type);
            iconEl.classList.toggle('ri-eye-line');
            iconEl.classList.toggle('ri-eye-off-line');
        });
        iconEl.dataset.toggleAttached = '1';
    }

    const viewPassword = document.getElementById('viewPassword');
    const viewPassword3 = document.getElementById('viewPassword3');

    attachToggle(viewPassword, senhaInput);
    attachToggle(viewPassword3, confirmarInput);

    // Fallback delegação para ícones dinâmicos
    document.addEventListener('click', function (e) {
        const icon = e.target.closest && e.target.closest('.password-toggle-icon');
        if (!icon || icon.dataset.toggleAttached === '1') return;

        let wrap = icon.closest('.item-input-wrap');
        let input = wrap ? wrap.querySelector('input') : null;

        if (!input) {
            const targetId = icon.getAttribute('data-target');
            if (targetId) input = document.getElementById(targetId);
        }

        if (!input) return;

        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        icon.classList.toggle('ri-eye-line');
        icon.classList.toggle('ri-eye-off-line');
    });

    // Validação e envio do formulário
    const form = document.getElementById('cadastroStep2Form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // Leitura robusta do email
            const emailInputEl = document.getElementById('email');
            let emailRaw = '';

            try {
                emailRaw = (emailInputEl && emailInputEl.value) ? String(emailInputEl.value) : '';
            } catch (err) {
                emailRaw = '';
            }

            if (!emailRaw && emailInputEl) {
                emailRaw = emailInputEl.getAttribute('value') || emailInputEl.defaultValue || '';
            }

            if (!emailRaw && form) {
                try {
                    const fd = new FormData(form);
                    const fEmail = fd.get('email');
                    if (fEmail) emailRaw = String(fEmail);
                } catch (err) { }
            }

            if (!emailRaw && form) {
                try {
                    const el = form.elements ? form.elements['email'] : null;
                    if (el && el.value) emailRaw = String(el.value);
                } catch (err) { }
            }

            if (!emailRaw) {
                const q = document.querySelector('input[name="email"], input#email');
                if (q && q.value) emailRaw = String(q.value);
            }

            emailRaw = (emailRaw || '').replace(/[\u200B\u200C\u200D\uFEFF\u00A0]/g, '').trim();
            const email = emailRaw.toLowerCase();

            // Log de depuração
            console.log('--- Depuração leitura email ---');
            console.log('Email lido:', JSON.stringify(emailRaw), 'len:', emailRaw.length);
            console.log('--- Fim depuração ---');

            if (!emailRaw) {
                app.dialog.alert('Não foi possível ler o e-mail preenchido.', 'Erro no E-mail');
                return;
            }

            // Validação de email
            function isValidEmail(e) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
            }

            if (!isValidEmail(email)) {
                app.dialog.alert('E-mail inválido. Verifique o endereço.', 'Erro no E-mail');
                return;
            }

            // Leitura robusta das senhas
            let senha = (senhaInput && senhaInput.value) || '';
            let confirmar = (confirmarInput && confirmarInput.value) || '';
            let valorFonte = 'direct';

            if (!senha && form) {
                try {
                    const fd = new FormData(form);
                    const fSenha = fd.get('senha');
                    const fConfirmar = fd.get('confirmar');
                    if (fSenha) { senha = fSenha; valorFonte = 'formdata'; }
                    if (fConfirmar) { confirmar = fConfirmar; }
                } catch (e) { }
            }

            if (!senha) {
                const byName = document.querySelector('input[name="senha"]');
                if (byName && byName.value) { senha = byName.value; valorFonte = 'query'; }
            }

            senha = (senha || '').trim();
            confirmar = (confirmar || '').trim();

            console.log('Fonte da senha lida:', valorFonte);

            if (!email || !senha || !confirmar) {
                app.dialog.alert('Por favor, preencha todos os campos!');
                return;
            }

            if (senha !== confirmar) {
                app.dialog.alert('As senhas não coincidem!');
                return;
            }

            if (senha.length < 6) {
                app.dialog.alert('A senha deve ter no mínimo 6 caracteres!');
                return;
            }

            // Verificação Unicode-aware de maiúscula e número
            let temMaiuscula = false;
            let temNumero = false;
            try {
                temMaiuscula = /\p{Lu}/u.test(senha);
                temNumero = /\p{Nd}/u.test(senha);
            } catch (e) {
                temMaiuscula = /[A-Z]/.test(senha);
                temNumero = /[0-9]/.test(senha);
            }

            console.log('Senha comprimento:', senha.length, 'temMaiuscula:', temMaiuscula, 'temNumero:', temNumero);

            if (!temMaiuscula || !temNumero) {
                app.dialog.alert('A senha deve conter pelo menos uma letra maiúscula e um número.', 'Erro na Senha');
                return;
            }

            // Preparar dados para envio - NOME E SOBRENOME SEPARADOS
            const nome = document.getElementById('hidden_nome').value.trim();
            const sobrenome = document.getElementById('hidden_sobrenome').value.trim();
            const dataNascimento = document.getElementById('hidden_dataNascimento').value;
            const cpf = document.getElementById('hidden_cpf').value;
            const telefone = document.getElementById('hidden_telefone').value;

            // LOG DE DEPURAÇÃO - Ver todos os dados antes de enviar
            console.log('=== DADOS SENDO ENVIADOS ===');
            console.log('Nome:', nome);
            console.log('Sobrenome:', sobrenome);
            console.log('Data Nascimento:', dataNascimento);
            console.log('CPF:', cpf);
            console.log('Telefone:', telefone);
            console.log('Email:', email);
            console.log('Senha:', senha ? '***' : '(vazio)');
            console.log('============================');

            // Verificar se todos os campos estão preenchidos ANTES de enviar
            if (!nome || !sobrenome || !dataNascimento || !cpf || !telefone) {
                app.dialog.alert('Dados da primeira etapa incompletos. Por favor, volte e preencha novamente.', 'Erro');
                return;
            }

            // Enviar para o servidor
            fetch('https://proatleta.site/cadastro_aluno.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `nome=${encodeURIComponent(nome)}&sobrenome=${encodeURIComponent(sobrenome)}&data_nascimento=${encodeURIComponent(dataNascimento)}&cpf=${encodeURIComponent(cpf)}&telefone=${encodeURIComponent(telefone)}&email=${encodeURIComponent(email)}&senha=${encodeURIComponent(senha)}`
            })
                .then(response => response.text())
                .then(text => {
                    console.log("Resposta bruta:", text);

                    try {
                        const data = JSON.parse(text);

                        if (data.success) {
                            // Limpar sessionStorage
                            sessionStorage.removeItem('cadastro_nome');
                            sessionStorage.removeItem('cadastro_sobrenome');
                            sessionStorage.removeItem('cadastro_dataNascimento');
                            sessionStorage.removeItem('cadastro_cpf');
                            sessionStorage.removeItem('cadastro_telefone');

                            app.dialog.create({
                                title: 'Verifique seu E-Mail',
                                text: 'Um link de verificação foi enviado para o seu e-mail. Clique nele para ativar sua conta.',
                                buttons: [
                                    {
                                        text: 'OK',
                                        onClick: function () {
                                            window.location.href = 'index.html';
                                        }
                                    }
                                ]
                            }).open();
                        } else {
                            app.dialog.alert(data.message || 'Erro ao cadastrar.', 'Erro');
                        }
                    } catch (e) {
                        console.error('Erro ao converter resposta em JSON:', e);
                        app.dialog.alert('Erro inesperado na resposta do servidor.', 'Erro');
                    }
                })
                .catch(error => {
                    console.error(error);
                    app.dialog.alert('Erro ao enviar dados. Verifique sua conexão.', 'Erro');
                });
        });
    }
});