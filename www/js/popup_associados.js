var userType = localStorage.getItem("userType");
var userId = localStorage.getItem("userId");
var alunoId = localStorage.getItem("aluno_id");
var professorId = localStorage.getItem("professor_id");

var finalIdAss = null;
if (userType === "aluno") {
  finalIdAss = alunoId || userId;
} else if (userType === "professor" || userType === "prof") {
  finalIdAss = professorId || userId;
}

if (!finalIdAss) {
  console.error("Nenhum Id encontrado no localStorage.");
} else {
  fetch("https://proatleta.site/get_associados.php?id=" + encodeURIComponent(finalIdAss))
    .then(function (res) {
      if (!res.ok) return res.text().then(t => { throw new Error("HTTP " + res.status + " " + t); });
      return res.json();
    })
    .then(function (data) {
      console.log("associados:", data);
      var container = document.getElementById("prof-container") || document.getElementById("associados-container");
      if (!container) { console.error("Container de associados não encontrado."); return; }
      container.innerHTML = "";
      if (!data || !data.success || !Array.isArray(data.associados) || data.associados.length === 0) {
        container.innerHTML = '<div class="align1"><p>Nenhum associado encontrado.</p></div>';
        return;
      }
      data.associados.forEach(function (p) {
        var div = document.createElement("div");
        div.className = "solicitacao-item";
        div.innerHTML = ''
          + '<div class="prof-actions">'
          +   '<img src="' + (p.foto || 'https://proatleta.site/padrao/user.jpg') + '" alt="Foto de ' + (p.nome_prof || 'Professor') + '" class="prof-foto" />'
          +   '<span class="prof-nome">' + (p.nome_prof || 'Nome não informado') + '</span>'
          + '</div>'
          + '<div class="alunos-botoes">'
          +   '<button class="btn-chat" data-prof-id="' + (p.id || '') + '" title="Abrir chat"><i class="ri-chat-3-line"></i></button>'
          + '</div>';
        container.appendChild(div);

        var chatBtn = div.querySelector('.btn-chat');
        if (chatBtn) {
          chatBtn.addEventListener('click', function (ev) {
            ev && ev.preventDefault && ev.preventDefault();
            ev && ev.stopPropagation && ev.stopPropagation();

            var profId = this.getAttribute('data-prof-id') || '';
            var profNome = p.nome_prof || '';
            var profFoto = p.foto || '';
            var profEmail = p.email || '';

            // grava várias chaves que o chat_aluno pode ler
            if (profId) {
              localStorage.setItem('chatProfessorId', profId);
              localStorage.setItem('chatWithId', profId);
              localStorage.setItem('chatProfId', profId);
              localStorage.setItem('professor_id', profId);
            } else {
              localStorage.removeItem('chatProfessorId');
              localStorage.removeItem('chatWithId');
              localStorage.removeItem('chatProfId');
              localStorage.removeItem('professor_id');
            }

            if (profNome) {
              localStorage.setItem('chatProfessorNome', profNome);
              localStorage.setItem('chatProfNome', profNome);
            } else {
              localStorage.removeItem('chatProfessorNome');
              localStorage.removeItem('chatProfNome');
            }

            if (profFoto) {
              localStorage.setItem('chatProfessorFoto', profFoto);
              localStorage.setItem('chatProfFoto', profFoto);
            } else {
              localStorage.removeItem('chatProfessorFoto');
              localStorage.removeItem('chatProfFoto');
            }

            if (profEmail) {
              localStorage.setItem('chatProfessorEmail', profEmail);
              localStorage.setItem('chatProfEmail', profEmail);
            } else {
              localStorage.removeItem('chatProfessorEmail');
              localStorage.removeItem('chatProfEmail');
            }

            // fecha sheet se existir
            try {
              var sheet = document.getElementById('sheetAssociado');
              if (sheet && window.app && app.sheet) {
                app.sheet.close(sheet);
              }
            } catch (err) {
              console.warn('Erro ao fechar sheet de associados:', err);
            }

            // navegação: força carregamento completo do arquivo HTML (garante que o input apareça)
            setTimeout(function () {
              if (window.app && app.views && app.views.main && app.views.main.router) {
                try {
                  app.views.main.router.navigate('/chat_aluno/', { query: { id: profId } });
                } catch (err) {
                  console.warn('Router navigate falhou, fallback para location.href:', err);
                  location.href = 'chat_aluno.html?id=' + encodeURIComponent(profId);
                }
              } else {
                location.href = 'chat_aluno.html?id=' + encodeURIComponent(profId);
              }
            }, 160); // 120-200ms geralmente suficiente
          });
        }
      });
    })
    .catch(function (err) {
      console.error("Erro ao buscar associados:", err);
    });
}