var userType = localStorage.getItem("userType");
var userId = localStorage.getItem("userId");
var professorId = localStorage.getItem("professor_id");

var finalIdProf = null;
if (userType === "prof" || userType === "professor") {
  finalIdProf = professorId || userId;
} else if (userType === "aluno") {
  finalIdProf = professorId;
}

if (!finalIdProf) {
  console.error("Nenhum Id de professor encontrado no localStorage.");
  if (typeof app !== 'undefined' && app.dialog) {
    app.dialog.alert('Nenhum Id de professor encontrado no localStorage.', 'Erro');
  } else {
    alert('Nenhum Id de professor encontrado no localStorage.');
  }
} else {
  // envia professor_id explicitamente
  fetch("https://proatleta.site/get_alunos.php?professor_id=" + encodeURIComponent(finalIdProf))
    .then(response => response.json())
    .then(data => {
      console.log(data.alunos);
      var container = document.getElementById("prof-container");
      if (!container) return;

      container.innerHTML = "";

      if (data.success && data.alunos && data.alunos.length > 0) {
        data.alunos.forEach(function (aluno) {
          var div = document.createElement("div");
          div.className = "solicitacao-item";
          div.innerHTML = `
            <div class="prof-actions">
              <img src="${aluno.foto || 'https://proatleta.site/padrao/user.jpg'}" alt="Foto de ${aluno.nome_aluno}" class="prof-foto" />
              <span class="prof-nome">${aluno.nome_aluno}</span>
            </div>
            <div class="alunos-botoes">
              <button class="btn-chat" title="Abrir chat" data-aluno-id="${aluno.id}">
                <i class="ri-chat-3-line"></i>
              </button>
              <button class="btn-deletar" title="Remover aluno" data-aluno-id="${aluno.id}">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>`;
          container.appendChild(div);

          var chatButton = div.querySelector(".btn-chat");
          if (chatButton) {
            chatButton.addEventListener("click", function () {
              const alunoIdLocal = String(this.getAttribute("data-aluno-id") || aluno.id || '');
              const alunoNome = div.querySelector(".prof-nome").textContent;
              const alunoFoto = div.querySelector(".prof-foto").src;
              const alunoEmail = aluno.email || "email@exemplo.com";

              try {
                const sheet = document.getElementById('sheetAlunos');
                if (sheet && window.app && app.sheet) app.sheet.close(sheet);
              } catch (e) {}

              localStorage.setItem("chatAlunoId", alunoIdLocal);
              localStorage.setItem("chatAlunoNome", alunoNome);
              localStorage.setItem("chatAlunoFoto", alunoFoto);
              localStorage.setItem("chatAlunoEmail", alunoEmail);
              localStorage.setItem("chatAlunoEscolinha", aluno.escolinha || "Pendente");

              if (window.app && app.views && app.views.main && app.views.main.router) {
                app.views.main.router.navigate('/chat_prof/', { query: { id: alunoIdLocal } });
              } else {
                location.href = 'chat_prof.html?id=' + encodeURIComponent(alunoIdLocal);
              }
            });
          }

          var deleteButton = div.querySelector(".btn-deletar");
          if (deleteButton) {
            deleteButton.addEventListener("click", function () {
              var alunoIdLocal = this.getAttribute("data-aluno-id");
              function executarDelecao(id) {
                fetch("https://proatleta.site/delete_aluno_professor.php", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ Aluno_ID: id, Professor_ID: finalIdProf })
                })
                  .then(response => response.json())
                  .then(result => {
                    if (result.success) {
                      if (typeof app !== 'undefined' && app.dialog) app.dialog.alert("Aluno removido com sucesso!", "Sucesso");
                      else alert("Aluno removido com sucesso!");
                      div.remove();
                    } else {
                      const msg = "Erro ao remover aluno: " + (result.message || '');
                      if (typeof app !== 'undefined' && app.dialog) app.dialog.alert(msg, "Erro");
                      else alert(msg);
                    }
                  })
                  .catch(error => {
                    console.error("Erro ao deletar aluno:", error);
                    if (typeof app !== 'undefined' && app.dialog) app.dialog.alert("Erro ao deletar aluno.", "Erro");
                    else alert("Erro ao deletar aluno.");
                  });
              }
              var mensagem = `Tem certeza que deseja remover o aluno ${aluno.nome_aluno}?`;
              if (typeof app !== 'undefined' && app.dialog) app.dialog.confirm(mensagem, 'Confirmação', function () { executarDelecao(alunoIdLocal); });
              else if (confirm(mensagem)) executarDelecao(alunoIdLocal);
            });
          }
        });
      } else {
        container.innerHTML = "<p>Nenhum aluno encontrado.</p>";
      }
    })
    .catch(error => {
      console.error("Erro ao buscar alunos:", error);
      if (typeof app !== 'undefined' && app.dialog) app.dialog.alert("Erro ao buscar alunos.", "Erro");
      else alert("Erro ao buscar alunos.");
    });
}