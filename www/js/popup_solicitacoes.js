var userType = localStorage.getItem("userType");
var userId = localStorage.getItem("userId");
var alunoId = localStorage.getItem("aluno_id");
var professorId = localStorage.getItem("professor_id");

var finalId = null;
if (userType === "aluno") {
    finalId = alunoId || userId;
} else if (userType === "prof" || userType === "professor") {
    finalId = professorId || userId;
}

console.log("popup_solicitacoes finalId:", finalId, "userType:", userType, "aluno_id:", alunoId, "professor_id:", professorId);

if (!finalId) {
    console.error("Nenhum ID encontrado no localStorage.");
} else {
    fetch("https://proatleta.site/get_solicitacoes.php?id=" + encodeURIComponent(finalId))
        .then(function (response) {
            if (!response.ok) {
                return response.text().then(function (txt) {
                    console.error("Erro HTTP ao buscar solicitações:", response.status, txt);
                    throw new Error("Erro HTTP: " + response.status);
                });
            }
            return response.json();
        })
        .then(function (data) {
            console.log("get_solicitacoes response:", data);

            var container = document.getElementById("solicitacoes-container");
            if (!container) {
                console.error("Elemento #solicitacoes-container não encontrado.");
                return;
            }

            container.innerHTML = "";

            if (!data || !data.success || !Array.isArray(data.solicitacoes) || data.solicitacoes.length === 0) {
                container.innerHTML = '<div class="align1"><p>Nenhuma solicitação encontrada.</p></div>';
                return;
            }

            var fotoFallback = "https://proatleta.site/padrao/user.jpg";

            data.solicitacoes.forEach(function (solicitacao) {
                console.log("SOLICITACAO RAW:", solicitacao);

                var nome = (solicitacao.nome_prof || "").trim();
                var email = (solicitacao.email_professor || "").trim();
                var foto = (solicitacao.foto || "").trim();
                if (!foto) foto = fotoFallback;
                else if (!/^https?:\/\//i.test(foto)) foto = "https://proatleta.site/" + foto.replace(/^\/+/, "");

                var ID = solicitacao.ID !== undefined ? solicitacao.ID : (solicitacao.id !== undefined ? solicitacao.id : null);
                var professorIdResp = solicitacao.professor_id !== undefined ? solicitacao.professor_id : null;
                var status = solicitacao.status || '';

                var div = document.createElement("div");
                div.className = "solicitacao-item";
                div.setAttribute("data-solicitacao-id", ID || "");
                div.innerHTML = ''
                    + '<div class="solicitacao-info">'
                    +   '<img src="' + foto + '" alt="Foto de ' + (nome || 'Professor') + '" class="solicitacao-foto" onerror="this.onerror=null;this.src=\'' + fotoFallback + '\';" />'
                    +   '<div class="solicitacao-dados">'
                    +     '<span class="solicitacao-nome">' + (nome || 'Nome não informado') + '</span>'
                    +     '<span class="solicitacao-email">' + (email || '')
                    +   '</div>'
                    + '</div>'
                    + '<div class="solicitacao-actions">'
                    +   '<button class="btn-recusar" data-id="' + ID + '">X</button>'
                    +   '<button class="btn-aceitar" data-id="' + ID + '">✔</button>'
                    + '</div>';

                container.appendChild(div);

                var btnRecusar = div.querySelector(".btn-recusar");
                if (btnRecusar) {
                    btnRecusar.addEventListener("click", function () {
                        var idToDelete = this.getAttribute("data-id") || ID;
                        app.dialog.create({
                            title: 'Confirmação',
                            text: 'Deseja realmente recusar esta solicitação?',
                            buttons: [
                                { text: 'Cancelar' },
                                {
                                    text: 'Sim',
                                    onClick: function () {
                                        fetch("https://proatleta.site/delete_solicitacao.php", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ ID: idToDelete })
                                        })
                                            .then(function (res) { return res.json(); })
                                            .then(function (result) {
                                                if (result.success) {
                                                    div.remove();
                                                    app.dialog.alert('Solicitação recusada com sucesso!', 'Sucesso');
                                                } else {
                                                    app.dialog.alert('Erro ao recusar a solicitação: ' + (result.message || ''), 'Erro');
                                                }
                                            })
                                            .catch(function (err) {
                                                console.error("Erro ao apagar solicitação:", err);
                                                app.dialog.alert('Erro inesperado ao apagar solicitação.', 'Erro');
                                            });
                                    }
                                }
                            ]
                        }).open();
                    });
                }

                var btnAceitar = div.querySelector(".btn-aceitar");
                if (btnAceitar) {
                    btnAceitar.addEventListener("click", function () {
                        var idToAccept = this.getAttribute("data-id") || ID;
                        app.dialog.create({
                            title: 'Confirmação',
                            text: 'Deseja realmente aceitar esta solicitação?',
                            buttons: [
                                { text: 'Cancelar' },
                                {
                                    text: 'Sim',
                                    onClick: function () {
                                        fetch("https://proatleta.site/aceitar_solicitacao.php", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ ID: idToAccept })
                                        })
                                            .then(function (res) { return res.json(); })
                                            .then(function (result) {
                                                if (result.success) {
                                                    div.remove();
                                                    app.dialog.alert('Solicitação aceita com sucesso!', 'Sucesso');
                                                } else {
                                                    app.dialog.alert('Erro ao aceitar a solicitação: ' + (result.message || ''), 'Erro');
                                                }
                                            })
                                            .catch(function (err) {
                                                console.error("Erro ao aceitar solicitação:", err);
                                                app.dialog.alert('Erro inesperado ao aceitar solicitação.', 'Erro');
                                            });
                                    }
                                }
                            ]
                        }).open();
                    });
                }
            });
        })
        .catch(function (error) {
            console.error("Erro ao buscar solicitações:", error);
        });
}