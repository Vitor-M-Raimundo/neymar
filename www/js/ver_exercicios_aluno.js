(function () {
    'use strict';

    if (window.SistemaVerExerciciosAluno) {
        console.log('Sistema já existe, reinicializando...');
        window.SistemaVerExerciciosAluno.reinicializar();
        return;
    }

    window.SistemaVerExerciciosAluno = {
        config: {
            treino: null,
            treinoId: null,
            inicializado: false
        },

        utils: {
            formatarData: (data) => {
                if (!data) return 'Sem data';
                return new Date(data).toLocaleDateString('pt-BR');
            },

            criarCardExercicio: (exercicio, ordem) => {
                // Garantir que exercícios reativados apareçam desmarcados
                const concluido = exercicio.concluido || false;
                const concluidoClass = concluido ? 'concluido' : '';
                const concluidoChecked = concluido ? 'checked' : '';

                return `
                    <div class="exercicio-card ${concluidoClass}" data-exercicio-id="${exercicio.id}">
                        <div class="exercicio-left">
                            <div class="exercicio-ordem">${ordem}</div>
                        </div>
                        <div class="exercicio-body">
                            <div class="exercicio-row">
                                <div class="exercicio-titulo">${exercicio.nome}</div>
                                <button class="btn-edit-exercicio" onclick="window.SistemaVerExerciciosAluno.actions.editarExercicio(${exercicio.id})">
                                    <i class="ri-edit-line"></i>
                                </button>
                            </div>
                            
                            <div class="exercicio-badges">
                                <span class="badge">${exercicio.series} séries</span>
                                <span class="badge">${exercicio.repeticoes} reps</span>
                                ${exercicio.descanso ? `<span class="badge peso-badge">${exercicio.descanso}s descanso</span>` : ''}
                            </div>

                            ${exercicio.observacoes ? `
                                <div class="exercicio-actions-row">
                                    <div class="observacoes-mini">
                                        <i class="ri-lightbulb-line"></i>
                                        <span class="obs-text">${exercicio.observacoes}</span>
                                    </div>
                                </div>
                            ` : ''}

                            ${exercicio.video_arquivo ? `
                                <div class="exercicio-actions-row" style="margin-top: 8px;">
                                    <button class="btn-play" onclick="window.SistemaVerExerciciosAluno.actions.abrirVideo('${exercicio.video_arquivo}')">
                                        <i class="ri-play-circle-line"></i> Ver vídeo
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            },

            renderizarExercicios: (treino) => {
                const container = document.getElementById('listaExercicios');
                
                if (!treino || !treino.exercicios || treino.exercicios.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="mdi mdi-dumbbell"></i>
                            <h3>Nenhum exercício</h3>
                            <p>Este treino ainda não possui exercícios cadastrados.</p>
                        </div>
                    `;
                    return;
                }

                const html = treino.exercicios.map((ex, index) => 
                    window.SistemaVerExerciciosAluno.utils.criarCardExercicio(ex, index + 1)
                ).join('');

                container.innerHTML = html;
            },

            atualizarInfoTreino: (treino) => {
                const tituloElement = document.getElementById('treinoTitulo');
                const metaElement = document.getElementById('treinoMeta');
                const obsContainer = document.getElementById('observacoesTreino');

                if (tituloElement) tituloElement.textContent = treino.nome_treino || 'Treino';
                if (metaElement) metaElement.textContent = treino.tipo_treino || 'Geral';

                if (obsContainer && treino.observacoes) {
                    obsContainer.innerHTML = `
                        <div class="observacoes-box" style="margin:8px 12px;">
                            <i class="ri-information-line"></i> ${treino.observacoes}
                        </div>
                    `;
                    obsContainer.style.display = 'block';
                } else if (obsContainer) {
                    obsContainer.innerHTML = '';
                    obsContainer.style.display = 'none';
                }
            }
        },

        actions: {
            obterTreinoId: () => {
                // SEMPRE priorizar URL
                const urlParams = new URLSearchParams(window.location.search);
                let treinoId = urlParams.get('treino_id');
                
                console.log('=== OBTENDO ID DO TREINO ===');
                console.log('URL completa:', window.location.href);
                console.log('Query params:', window.location.search);
                console.log('ID da URL:', treinoId);
                
                // Se não tem na URL, tentar localStorage
                if (!treinoId) {
                    treinoId = localStorage.getItem('treinoIdSelecionado');
                    console.log('ID do localStorage:', treinoId);
                }
                
                // Limpar espaços e garantir que é string
                if (treinoId) {
                    treinoId = String(treinoId).trim();
                    console.log('ID final (limpo):', treinoId);
                }
                
                console.log('=== FIM LOG ID ===');
                return treinoId;
            },

            carregarTreino: () => {
                const sistema = window.SistemaVerExerciciosAluno;
                
                if (!sistema || !sistema.config) {
                    console.error('Sistema não inicializado');
                    return;
                }

                const treinoId = sistema.actions.obterTreinoId();
                console.log('=== CARREGANDO TREINO ===');
                console.log('Treino ID a buscar:', treinoId);
                console.log('Tipo do ID:', typeof treinoId);

                if (!treinoId) {
                    console.error('ID do treino não encontrado');
                    const container = document.getElementById('listaExercicios');
                    if (container) {
                        container.innerHTML = `
                            <div class="empty-state">
                                <i class="mdi mdi-alert-circle-outline"></i>
                                <h3>Erro</h3>
                                <p>Treino não identificado</p>
                                <button class="button button-fill" onclick="history.back()">
                                    Voltar
                                </button>
                            </div>
                        `;
                    }
                    return;
                }

                // Salvar ID no config
                sistema.config.treinoId = treinoId;

                // Mostrar loading
                const container = document.getElementById('listaExercicios');
                if (container) {
                    container.innerHTML = `
                        <div class="loader-container">
                            <div class="preloader"></div>
                            <p style="margin-top: 15px; color: #666;">Carregando treino ${treinoId}...</p>
                        </div>
                    `;
                }

                // Buscar do servidor
                const url = `https://proatleta.site/get_treino_por_id.php?treino_id=${treinoId}`;
                console.log('Fazendo requisição:', url);

                fetch(url)
                    .then(response => {
                        console.log('Status HTTP:', response.status);
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log('=== RESPOSTA DO SERVIDOR ===');
                        console.log('Success:', data.success);
                        console.log('Treino recebido:', data.treino);
                        
                        if (data.success && data.treino) {
                            // Garantir que exercícios estejam com estado correto
                            if (data.treino.exercicios) {
                                data.treino.exercicios.forEach(ex => {
                                    // Converter para booleano explicitamente
                                    ex.concluido = Boolean(ex.concluido);
                                });
                            }

                            console.log('✅ Treino ID recebido:', data.treino.id);
                            console.log('✅ Nome do treino:', data.treino.nome_treino);
                            console.log('✅ Total de exercícios:', data.treino.exercicios.length);
                            console.log('=== FIM RESPOSTA ===');
                            
                            sistema.config.treino = data.treino;
                            sistema.utils.atualizarInfoTreino(data.treino);
                            sistema.utils.renderizarExercicios(data.treino);
                            
                            // Salvar no localStorage como backup
                            try {
                                localStorage.setItem('treinoSelecionado', JSON.stringify(data.treino));
                            } catch (e) {
                                console.warn('Erro ao salvar no localStorage:', e);
                            }
                        } else {
                            throw new Error(data.message || 'Treino não encontrado');
                        }
                    })
                    .catch(error => {
                        console.error('❌ Erro ao carregar treino:', error);
                        if (container) {
                            container.innerHTML = `
                                <div class="empty-state">
                                    <i class="mdi mdi-alert-circle-outline"></i>
                                    <h3>Erro</h3>
                                    <p>Não foi possível carregar o treino ${treinoId}</p>
                                    <p style="font-size: 14px; color: #999;">${error.message}</p>
                                    <button class="button button-fill" onclick="window.SistemaVerExerciciosAluno.actions.carregarTreino()">
                                        <i class="ri-refresh-line"></i> Tentar Novamente
                                    </button>
                                    <button class="button button-outline" onclick="history.back()" style="margin-top: 10px;">
                                        Voltar
                                    </button>
                                </div>
                            `;
                        }
                    });
            },

            marcarExercicio: (exercicioId, concluido) => {
                const sistema = window.SistemaVerExerciciosAluno;
                const userEmail = localStorage.getItem('userEmail');
                
                if (!userEmail) {
                    console.error('Email do usuário não encontrado');
                    return;
                }

                const exercicioCard = document.querySelector(`[data-exercicio-id="${exercicioId}"]`);
                const checkbox = exercicioCard?.querySelector('input[type="checkbox"]');

                fetch('https://proatleta.site/marcar_exercicio_concluido.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        exercicio_id: exercicioId,
                        concluido: concluido ? 1 : 0,
                        aluno_email: userEmail
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Atualizar estado local
                        if (sistema.config.treino && sistema.config.treino.exercicios) {
                            const exercicio = sistema.config.treino.exercicios.find(ex => ex.id === exercicioId);
                            if (exercicio) {
                                exercicio.concluido = concluido;
                                exercicio.concluido_em = data.concluido_em;
                            }
                        }

                        // Atualizar UI
                        if (exercicioCard) {
                            const checkboxVisual = exercicioCard.querySelector('.checkbox-visual');
                            if (concluido) {
                                exercicioCard.classList.add('concluido');
                                if (checkboxVisual) {
                                    checkboxVisual.innerHTML = '<i class="ri-check-line"></i>';
                                }
                            } else {
                                exercicioCard.classList.remove('concluido');
                                if (checkboxVisual) {
                                    checkboxVisual.innerHTML = '';
                                }
                            }
                        }

                        if (typeof app !== 'undefined') {
                            app.toast.create({
                                text: data.message || 'Exercício atualizado',
                                position: 'bottom',
                                closeTimeout: 2000
                            }).open();
                        }
                    } else {
                        if (checkbox) checkbox.checked = !concluido;
                        if (typeof app !== 'undefined') {
                            app.toast.create({
                                text: data.message || 'Erro ao atualizar exercício',
                                position: 'bottom',
                                closeTimeout: 3000
                            }).open();
                        }
                    }
                })
                .catch(error => {
                    console.error('Erro:', error);
                    if (checkbox) checkbox.checked = !concluido;
                });
            },

            abrirVideo: (videoUrl) => {
                console.log('Abrir vídeo:', videoUrl);
                if (typeof app !== 'undefined') {
                    app.toast.create({
                        text: 'Funcionalidade de vídeo em desenvolvimento',
                        position: 'bottom',
                        closeTimeout: 2000
                    }).open();
                }
            },

            editarExercicio: (exercicioId) => {
                const sistema = window.SistemaVerExerciciosAluno;
                
                if (!sistema.config.treino || !sistema.config.treino.exercicios) {
                    console.error('Treino não carregado');
                    return;
                }

                const exercicio = sistema.config.treino.exercicios.find(ex => ex.id === exercicioId);
                
                if (!exercicio) {
                    console.error('Exercício não encontrado:', exercicioId);
                    return;
                }

                console.log('Editar exercício:', exercicio);

                // Criar popup de edição com campo de vídeo
                if (typeof app !== 'undefined') {
                    const videoPreviewHtml = exercicio.video_arquivo ? `
                        <div class="video-preview-edit" id="video-preview-edit-${exercicioId}" style="margin-top: 12px;">
                            <video controls style="width: 100%; max-height: 200px; border-radius: 8px; background: #000;">
                                <source src="${exercicio.video_arquivo}" type="video/mp4">
                            </video>
                            <button type="button" class="btn-remove-video-edit" onclick="window.SistemaVerExerciciosAluno.actions.removerVideoEdicao(${exercicioId})"
                                style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 6px; margin-top: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                                <i class="ri-delete-bin-line"></i> Remover Vídeo
                            </button>
                        </div>
                    ` : '';

                    const popup = app.popup.create({
                        content: `
                            <div class="popup" style="background: #f4f4f4;">
                                <div class="page">
                                    <div class="navbar" style="background: white;">
                                        <div class="navbar-bg"></div>
                                        <div class="navbar-inner">
                                            <div class="title" style="font-weight: 600; color: #333;">Editar Exercício</div>
                                            <div class="right">
                                                <a href="#" class="link popup-close" style="color: #f86100;">Fechar</a>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="page-content" style="background: #f4f4f4; padding: 80px 15px 100px 15px;">
                                        <div class="block" style="margin: 0;">
                                            <form id="form-editar-exercicio" style="background: white; border-radius: 12px; padding: 20px; margin: 0;">
                                                <div class="form-group" style="margin-bottom: 20px;">
                                                    <label style="display: block; font-weight: 600; color: #333; margin-bottom: 8px; font-size: 16px;">Nome do Exercício *</label>
                                                    <input type="text" name="nome" value="${exercicio.nome}" required 
                                                        style="width: 100%; border: 1px solid #ddd; padding: 13px; border-radius: 8px; font-size: 16px; outline: none; transition: border-color 0.2s; background: white;">
                                                </div>
                                                
                                                <div class="form-group" style="margin-bottom: 20px;">
                                                    <label style="display: block; font-weight: 600; color: #333; margin-bottom: 8px; font-size: 16px;">Séries *</label>
                                                    <input type="number" name="series" value="${exercicio.series}" min="1" required
                                                        style="width: 100%; border: 1px solid #ddd; padding: 13px; border-radius: 8px; font-size: 16px; outline: none; transition: border-color 0.2s; background: white;">
                                                </div>
                                                
                                                <div class="form-group" style="margin-bottom: 20px;">
                                                    <label style="display: block; font-weight: 600; color: #333; margin-bottom: 8px; font-size: 16px;">Repetições *</label>
                                                    <input type="text" name="repeticoes" value="${exercicio.repeticoes}" required
                                                        style="width: 100%; border: 1px solid #ddd; padding: 13px; border-radius: 8px; font-size: 16px; outline: none; transition: border-color 0.2s; background: white;">
                                                </div>
                                                
                                                <div class="form-group" style="margin-bottom: 20px;">
                                                    <label style="display: block; font-weight: 600; color: #333; margin-bottom: 8px; font-size: 16px;">Descanso (seg) *</label>
                                                    <input type="number" name="descanso" value="${exercicio.descanso || 60}" min="0" required
                                                        style="width: 100%; border: 1px solid #ddd; padding: 13px; border-radius: 8px; font-size: 16px; outline: none; transition: border-color 0.2s; background: white;">
                                                </div>
                                                
                                                <div class="form-group" style="margin-bottom: 20px;">
                                                    <label style="display: block; font-weight: 600; color: #333; margin-bottom: 8px; font-size: 16px;">
                                                        <i class="ri-video-line"></i> Vídeo Demonstrativo
                                                    </label>
                                                    <input type="file" id="video-edit-${exercicioId}" accept="video/mp4,video/webm,video/ogg" 
                                                        style="display: none;"
                                                        onchange="window.SistemaVerExerciciosAluno.actions.handleVideoUploadEdicao(${exercicioId}, this)">
                                                    <div id="video-upload-area-${exercicioId}" onclick="document.getElementById('video-edit-${exercicioId}').click()"
                                                        style="border: 2px dashed #ddd; border-radius: 8px; padding: 20px; text-align: center; background: #f8f9fa; cursor: pointer; transition: all 0.3s;">
                                                        <i class="ri-upload-cloud-2-line" style="font-size: 48px; color: #999; margin-bottom: 12px;"></i>
                                                        <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 500; color: #333;">
                                                            ${exercicio.video_arquivo ? 'Alterar Vídeo' : 'Clique para adicionar vídeo'}
                                                        </p>
                                                        <small style="color: #666; font-size: 12px;">Máximo 50MB - MP4, WEBM, OGG</small>
                                                    </div>
                                                    ${videoPreviewHtml}
                                                    <div id="video-progress-edit-${exercicioId}" style="display: none; margin-top: 12px;">
                                                        <div style="width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                                                            <div id="video-progress-bar-${exercicioId}" style="height: 100%; background: #f86100; width: 0%; transition: width 0.3s;"></div>
                                                        </div>
                                                        <span id="video-progress-text-${exercicioId}" style="font-size: 14px; font-weight: 600; color: #f86100;">0%</span>
                                                    </div>
                                                    <input type="hidden" id="video-url-edit-${exercicioId}" value="${exercicio.video_arquivo || ''}">
                                                </div>
                                                
                                                <div class="form-group" style="margin-bottom: 20px;">
                                                    <label style="display: block; font-weight: 600; color: #333; margin-bottom: 8px; font-size: 16px;">Observações</label>
                                                    <textarea name="observacoes" rows="3" placeholder="Dicas, forma de execução, etc..."
                                                        style="width: 100%; border: 1px solid #ddd; padding: 13px; border-radius: 8px; font-size: 16px; outline: none; transition: border-color 0.2s; background: white; resize: vertical;">${exercicio.observacoes || ''}</textarea>
                                                </div>
                                                
                                                <button type="button" class="btn-salvar" onclick="window.SistemaVerExerciciosAluno.actions.salvarEdicaoExercicio(${exercicioId})"
                                                    style="background: #f86100; color: white; border: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                                    <i class="ri-save-line"></i>
                                                    Salvar Alterações
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `,
                        on: {
                            opened: function() {
                                console.log('Popup de edição aberto');
                                
                                // Adicionar eventos de foco nos inputs
                                const inputs = document.querySelectorAll('#form-editar-exercicio input, #form-editar-exercicio textarea');
                                inputs.forEach(input => {
                                    input.addEventListener('focus', function() {
                                        this.style.borderColor = '#f86100';
                                        this.style.boxShadow = '0 0 0 2px rgba(248, 97, 0, 0.1)';
                                    });
                                    input.addEventListener('blur', function() {
                                        this.style.borderColor = '#ddd';
                                        this.style.boxShadow = 'none';
                                    });
                                });
                                
                                // Hover na área de upload
                                const uploadArea = document.getElementById(`video-upload-area-${exercicioId}`);
                                if (uploadArea) {
                                    uploadArea.addEventListener('mouseenter', function() {
                                        this.style.borderColor = '#f86100';
                                        this.style.background = '#fff';
                                    });
                                    uploadArea.addEventListener('mouseleave', function() {
                                        this.style.borderColor = '#ddd';
                                        this.style.background = '#f8f9fa';
                                    });
                                }
                            }
                        }
                    });
                    
                    popup.open();
                }
            },

            handleVideoUploadEdicao: (exercicioId, input) => {
                const file = input.files[0];
                if (!file) return;

                const maxSize = 50 * 1024 * 1024; // 50MB
                if (file.size > maxSize) {
                    alert('Arquivo muito grande! Máximo: 50MB');
                    input.value = '';
                    return;
                }

                const progressDiv = document.getElementById(`video-progress-edit-${exercicioId}`);
                const progressBar = document.getElementById(`video-progress-bar-${exercicioId}`);
                const progressText = document.getElementById(`video-progress-text-${exercicioId}`);
                const uploadArea = document.getElementById(`video-upload-area-${exercicioId}`);

                progressDiv.style.display = 'block';
                uploadArea.style.display = 'none';

                const formData = new FormData();
                formData.append('video', file);

                const xhr = new XMLHttpRequest();

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        progressBar.style.width = percent + '%';
                        progressText.textContent = percent + '%';
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            if (response.success) {
                                document.getElementById(`video-url-edit-${exercicioId}`).value = response.video_url;
                                
                                // Mostrar preview do novo vídeo
                                const videoPreview = document.getElementById(`video-preview-edit-${exercicioId}`);
                                if (videoPreview) {
                                    videoPreview.remove();
                                }
                                
                                progressDiv.insertAdjacentHTML('afterend', `
                                    <div class="video-preview-edit" id="video-preview-edit-${exercicioId}" style="margin-top: 12px;">
                                        <video controls style="width: 100%; max-height: 200px; border-radius: 8px; background: #000;">
                                            <source src="${response.video_url}" type="video/mp4">
                                        </video>
                                        <button type="button" class="btn-remove-video-edit" onclick="window.SistemaVerExerciciosAluno.actions.removerVideoEdicao(${exercicioId})"
                                            style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 6px; margin-top: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                                            <i class="ri-delete-bin-line"></i> Remover Vídeo
                                        </button>
                                    </div>
                                `);
                                
                                progressDiv.style.display = 'none';
                                uploadArea.style.display = 'block';
                                uploadArea.querySelector('p').textContent = 'Alterar Vídeo';
                                
                                if (typeof app !== 'undefined') {
                                    app.toast.create({
                                        text: 'Vídeo enviado com sucesso!',
                                        position: 'bottom',
                                        closeTimeout: 2000
                                    }).open();
                                }
                            } else {
                                throw new Error(response.message || 'Erro ao fazer upload');
                            }
                        } catch (e) {
                            console.error('Erro ao processar resposta:', e);
                            alert('Erro ao processar upload do vídeo');
                        }
                    } else {
                        alert('Erro ao enviar vídeo. Tente novamente.');
                    }
                    progressDiv.style.display = 'none';
                    uploadArea.style.display = 'block';
                    input.value = '';
                });

                xhr.addEventListener('error', () => {
                    alert('Erro na conexão. Verifique sua internet.');
                    progressDiv.style.display = 'none';
                    uploadArea.style.display = 'block';
                    input.value = '';
                });

                xhr.open('POST', 'https://proatleta.site/upload_video.php', true);
                xhr.send(formData);
            },

            removerVideoEdicao: (exercicioId) => {
                if (confirm('Tem certeza que deseja remover este vídeo?')) {
                    // Limpar campo hidden imediatamente para garantir que não seja enviado
                    const videoUrlInput = document.getElementById(`video-url-edit-${exercicioId}`);
                    if (videoUrlInput) {
                        videoUrlInput.value = '';
                    }
                    
                    // Remover preview visual
                    const videoPreview = document.getElementById(`video-preview-edit-${exercicioId}`);
                    if (videoPreview) {
                        videoPreview.remove();
                    }
                    
                    // Atualizar texto do botão de upload
                    const uploadArea = document.getElementById(`video-upload-area-${exercicioId}`);
                    if (uploadArea) {
                        const uploadText = uploadArea.querySelector('p');
                        if (uploadText) {
                            uploadText.textContent = 'Clique para adicionar vídeo';
                        }
                    }
                    
                    if (typeof app !== 'undefined') {
                        app.toast.create({
                            text: 'Vídeo será removido ao salvar',
                            position: 'bottom',
                            closeTimeout: 2000
                        }).open();
                    }
                }
            },

            salvarEdicaoExercicio: (exercicioId) => {
                const form = document.getElementById('form-editar-exercicio');
                
                if (!form) {
                    console.error('Formulário não encontrado');
                    return;
                }

                const formData = new FormData(form);
                const videoUrlInput = document.getElementById(`video-url-edit-${exercicioId}`);
                
                const dadosAtualizados = {
                    exercicio_id: exercicioId,
                    nome: formData.get('nome'),
                    series: formData.get('series'),
                    repeticoes: formData.get('repeticoes'),
                    descanso: formData.get('descanso'),
                    observacoes: formData.get('observacoes'),
                    // Se o campo está vazio, enviar null para remover do banco
                    video_arquivo: videoUrlInput && videoUrlInput.value ? videoUrlInput.value : null
                };

                console.log('Salvando edição:', dadosAtualizados);

                // Mostrar loading
                if (typeof app !== 'undefined') {
                    app.dialog.preloader('Salvando...');
                }

                fetch('https://proatleta.site/editar_exercicio.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dadosAtualizados)
                })
                .then(response => response.json())
                .then(data => {
                    if (typeof app !== 'undefined') {
                        app.dialog.close();
                    }

                    if (data.success) {
                        // Atualizar dados locais
                        const sistema = window.SistemaVerExerciciosAluno;
                        if (sistema.config.treino && sistema.config.treino.exercicios) {
                            const exercicio = sistema.config.treino.exercicios.find(ex => ex.id === exercicioId);
                            if (exercicio) {
                                Object.assign(exercicio, {
                                    nome: dadosAtualizados.nome,
                                    series: dadosAtualizados.series,
                                    repeticoes: dadosAtualizados.repeticoes,
                                    descanso: dadosAtualizados.descanso,
                                    observacoes: dadosAtualizados.observacoes,
                                    video_arquivo: dadosAtualizados.video_arquivo
                                });
                            }
                        }

                        // Recarregar lista de exercícios
                        sistema.utils.renderizarExercicios(sistema.config.treino);

                        // Fechar popup
                        if (typeof app !== 'undefined') {
                            app.popup.close();
                            app.toast.create({
                                text: 'Exercício atualizado com sucesso!',
                                position: 'bottom',
                                closeTimeout: 2000
                            }).open();
                        }
                    } else {
                        throw new Error(data.message || 'Erro ao salvar exercício');
                    }
                })
                .catch(error => {
                    console.error('Erro ao salvar edição:', error);
                    
                    if (typeof app !== 'undefined') {
                        app.dialog.close();
                        app.toast.create({
                            text: error.message || 'Erro ao salvar exercício',
                            position: 'bottom',
                            closeTimeout: 3000
                        }).open();
                    }
                });
            },

            finalizarTreino: () => {
                const treino = window.SistemaVerExerciciosAluno.config.treino;
                if (!treino || !treino.id) {
                    alert('Não foi possível identificar o treino para finalizar.');
                    return;
                }

                if (typeof app !== 'undefined' && app.dialog) {
                    app.dialog.confirm(
                        'Tem certeza que deseja finalizar este treino? Ele será marcado como inativo.',
                        'Finalizar Treino',
                        function() {
                            executarFinalizacaoTreino(treino.id);
                        }
                    );
                } else {
                    if (confirm('Tem certeza que deseja finalizar este treino? Ele será marcado como inativo.')) {
                        executarFinalizacaoTreino(treino.id);
                    }
                }

                function executarFinalizacaoTreino(treinoId) {
                    const btn = document.getElementById('btnFinalizarTreino');
                    if (btn) {
                        btn.classList.add('loading');
                        btn.disabled = true;
                    }

                    fetch('https://proatleta.site/finalizar_treino.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ treino_id: treinoId })
                    })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            try {
                                localStorage.removeItem('treinoSelecionado');
                            } catch (e) {
                                console.warn('Erro ao limpar localStorage:', e);
                            }

                            if (typeof app !== 'undefined' && app.toast) {
                                app.toast.create({
                                    text: 'Treino finalizado com sucesso!',
                                    position: 'bottom',
                                    closeTimeout: 2000,
                                }).open();
                            }

                            setTimeout(() => {
                                if (typeof app !== 'undefined' && app.views && app.views.main && app.views.main.router) {
                                    try { app.views.main.router.back(); return; } catch (e) {}
                                }
                                if (window.history && window.history.length > 1) history.back();
                                else window.location.href = 'ver_treinos_aluno.html';
                            }, 1000);
                        } else {
                            throw new Error(data.message || 'Erro ao finalizar treino');
                        }
                    })
                    .catch(err => {
                        console.error('Erro ao finalizar treino:', err);
                        alert(err.message || 'Erro ao finalizar treino. Tente novamente.');
                        
                        if (btn) {
                            btn.classList.remove('loading');
                            btn.disabled = false;
                        }
                    });
                }
            }
        },

        inicializar: () => {
            const sistema = window.SistemaVerExerciciosAluno;
            
            if (!sistema || !sistema.config) {
                console.error('Sistema não pode ser inicializado');
                return;
            }

            console.log('Inicializando sistema de exercícios do aluno...');
            
            // Inicializar botão voltar
            const btnVoltar = document.getElementById('btnVoltar');
            if (btnVoltar) {
                btnVoltar.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof app !== 'undefined' && app.views && app.views.main && app.views.main.router) {
                        try { app.views.main.router.back(); return; } catch (e) {}
                    }
                    if (window.history && window.history.length > 1) history.back();
                    else window.location.href = 'ver_treinos_aluno.html';
                });
            }
            
            sistema.actions.carregarTreino();
            sistema.config.inicializado = true;
        },

        reinicializar: () => {
            const sistema = window.SistemaVerExerciciosAluno;
            
            if (!sistema || !sistema.config) {
                console.error('Sistema não pode ser reinicializado');
                return;
            }

            sistema.config.inicializado = false;
            sistema.config.treino = null;
            sistema.config.treinoId = null;
            
            const container = document.getElementById('listaExercicios');
            if (container) {
                sistema.inicializar();
            }
        }
    };

    // Inicialização
    const executarInicializacao = () => {
        const container = document.getElementById('listaExercicios');
        if (container && !window.SistemaVerExerciciosAluno.config.inicializado) {
            window.SistemaVerExerciciosAluno.inicializar();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', executarInicializacao);
    } else {
        executarInicializacao();
    }

    document.addEventListener('page:init', (e) => {
        if (e.detail.name === 'ver_exercicios_aluno') {
            window.SistemaVerExerciciosAluno.inicializar();
        }
    });

    if (typeof app !== 'undefined') {
        app.on('pageInit', (page) => {
            if (page.name === 'ver_exercicios_aluno') {
                window.SistemaVerExerciciosAluno.inicializar();
            }
        });
    }

    console.log('Sistema de exercícios do aluno inicializado');
})();
