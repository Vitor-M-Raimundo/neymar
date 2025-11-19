(function () {
    'use strict';

    // Sistema global para adicionar treino
    window.SistemaAdicionarTreino = {
        config: {
            exercicioCounter: 0,
            inicializado: false,
            // Usar email como fonte principal
            emailAluno: localStorage.getItem('alunoSelecionado') || '',
            nomeAluno: localStorage.getItem('nomeAlunoSelecionado') || 'Aluno',
            alunoId: '',
            fotoAluno: null
        },

        init: () => {
            console.log('Inicializando sistema adicionar treino...');
            
            // Carregar dados do aluno selecionado
            window.SistemaAdicionarTreino.carregarDadosAluno();

            // Adicionar primeiro exercício automaticamente
            if (window.SistemaAdicionarTreino.config.exercicioCounter === 0) {
                adicionarExercicio();
            }

            window.SistemaAdicionarTreino.config.inicializado = true;
        },

        carregarDadosAluno: () => {
            const emailAluno = window.SistemaAdicionarTreino.config.emailAluno;
            
            if (!emailAluno) {
                console.warn('Email do aluno não encontrado');
                window.SistemaAdicionarTreino.atualizarInfoAluno();
                return;
            }

            console.log('Carregando dados do aluno por email:', emailAluno);

            // Usar dados básicos enquanto carrega dados completos
            window.SistemaAdicionarTreino.atualizarInfoAluno();

            // Buscar dados completos
            window.SistemaAdicionarTreino.buscarDadosCompletosAluno();
        },

        buscarDadosCompletosAluno: () => {
            const emailAluno = window.SistemaAdicionarTreino.config.emailAluno;
            
            console.log('Buscando dados completos do aluno por email:', emailAluno);

            fetch(`https://proatleta.site/get_usuario.php?email=${encodeURIComponent(emailAluno)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success && data.usuario) {
                        // Atualizar todos os dados
                        window.SistemaAdicionarTreino.config.alunoId = data.usuario.id;
                        window.SistemaAdicionarTreino.config.nomeAluno = data.usuario.nome || window.SistemaAdicionarTreino.config.nomeAluno;
                        window.SistemaAdicionarTreino.config.emailAluno = data.usuario.email || window.SistemaAdicionarTreino.config.emailAluno;
                        window.SistemaAdicionarTreino.config.fotoAluno = data.usuario.foto || 'img/user.jpg';
                        
                        // Salvar no localStorage para consistência
                        localStorage.setItem('alunoSelecionadoId', data.usuario.id);
                        localStorage.setItem('nomeAlunoSelecionado', data.usuario.nome);
                        
                        console.log('Dados completos carregados:', {
                            id: window.SistemaAdicionarTreino.config.alunoId,
                            nome: window.SistemaAdicionarTreino.config.nomeAluno,
                            email: window.SistemaAdicionarTreino.config.emailAluno,
                            foto: window.SistemaAdicionarTreino.config.fotoAluno
                        });
                    } else {
                        console.warn('Não foi possível carregar dados completos do aluno');
                        window.SistemaAdicionarTreino.config.fotoAluno = 'img/user.jpg';
                    }
                    
                    window.SistemaAdicionarTreino.atualizarInfoAluno();
                })
                .catch(error => {
                    console.error('Erro ao carregar dados completos do aluno:', error);
                    window.SistemaAdicionarTreino.config.fotoAluno = 'img/user.jpg';
                    window.SistemaAdicionarTreino.atualizarInfoAluno();
                });
        },

        atualizarInfoAluno: () => {
            const nomeElement = document.getElementById('nomeAlunoTreino');
            const emailElement = document.getElementById('emailAlunoTreino');
            const avatarElement = document.getElementById('alunoAvatarTreino');

            if (nomeElement) {
                nomeElement.textContent = window.SistemaAdicionarTreino.config.nomeAluno;
            }
            
            // Atualizar avatar
            if (avatarElement && window.SistemaAdicionarTreino.config.fotoAluno) {
                avatarElement.innerHTML = `<img src="${window.SistemaAdicionarTreino.config.fotoAluno}" alt="Foto do ${window.SistemaAdicionarTreino.config.nomeAluno}" onerror="this.src='img/user.jpg'">`;
            } else if (avatarElement) {
                avatarElement.innerHTML = '<i class="ri-user-line"></i>';
            }

            console.log('Interface do aluno atualizada:', {
                nome: window.SistemaAdicionarTreino.config.nomeAluno,
                email: window.SistemaAdicionarTreino.config.emailAluno
            });
        }
    };

    // Função global para adicionar exercício
    window.adicionarExercicio = function() {
        const exerciciosContainer = document.getElementById('exercicios-container');
        if (!exerciciosContainer) {
            console.error('Container de exercícios não encontrado');
            return;
        }

        window.SistemaAdicionarTreino.config.exercicioCounter++;
        const exercicioCount = window.SistemaAdicionarTreino.config.exercicioCounter;
        
        const exercicioHTML = `
            <div class="exercicio-item" data-exercicio="${exercicioCount}">
                <div class="exercicio-header">
                    <span class="exercicio-numero">${exercicioCount}</span>
                    <button type="button" class="btn-remover" onclick="removerExercicio(this)">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
                
                <div class="exercicio-form">
                    <div class="form-group">
                        <label>Nome do Exercício *</label>
                        <input type="text" name="exercicios[${exercicioCount}][nome]" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Séries *</label>
                            <input type="number" name="exercicios[${exercicioCount}][series]" min="1" required>
                        </div>
                        <div class="form-group">
                            <label>Repetições *</label>
                            <input type="text" name="exercicios[${exercicioCount}][repeticoes]" required>
                        </div>
                        <div class="form-group">
                            <label>Descanso (seg) *</label>
                            <input type="number" name="exercicios[${exercicioCount}][descanso]" value="60" min="0" required>
                        </div>
                    </div>
                    
                    <div class="video-input-group">
                        <label>
                            <i class="ri-video-line"></i>
                            Vídeo Demonstrativo (Opcional)
                        </label>
                        <div class="video-upload-area" id="video-upload-${exercicioCount}">
                            <input type="file" 
                                   id="video-file-${exercicioCount}"
                                   accept="video/mp4,video/webm,video/ogg,video/avi,video/mov"
                                   style="display: none;"
                                   onchange="handleVideoUpload(${exercicioCount}, this)">
                            <div class="upload-placeholder" onclick="document.getElementById('video-file-${exercicioCount}').click()">
                                <i class="ri-upload-cloud-2-line"></i>
                                <p>Clique para selecionar um vídeo</p>
                                <small>Máximo 50MB - Formatos: MP4, WEBM, OGG, AVI, MOV</small>
                            </div>
                        </div>
                        <div class="video-progress" id="progress-${exercicioCount}" style="display: none;">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 0%"></div>
                            </div>
                            <span class="progress-text">0%</span>
                        </div>
                        <input type="hidden" name="exercicios[${exercicioCount}][video_arquivo]" id="video-url-${exercicioCount}">
                    </div>
                    
                    <div class="form-group">
                        <label>Observações</label>
                        <textarea name="exercicios[${exercicioCount}][observacoes]" 
                                  rows="2" 
                                  placeholder="Dicas, forma de execução, etc..."></textarea>
                    </div>
                </div>
            </div>
        `;
        
        exerciciosContainer.insertAdjacentHTML('beforeend', exercicioHTML);
        
        // Animar a entrada do novo exercício
        const novoExercicio = exerciciosContainer.lastElementChild;
        novoExercicio.style.opacity = '0';
        novoExercicio.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            novoExercicio.style.transition = 'all 0.3s ease';
            novoExercicio.style.opacity = '1';
            novoExercicio.style.transform = 'translateY(0)';
        }, 10);
    };

    // Função global para remover exercício
    window.removerExercicio = function(button) {
        const exercicioItem = button.closest('.exercicio-item');
        if (exercicioItem) {
            // Verificar se é o único exercício
            const exerciciosContainer = document.getElementById('exercicios-container');
            const totalExercicios = exerciciosContainer.children.length;
            
            if (totalExercicios <= 1) {
                if (typeof app !== 'undefined' && app.toast) {
                    app.toast.create({
                        text: 'É necessário pelo menos um exercício no treino!',
                        position: 'center',
                        closeTimeout: 2000,
                    }).open();
                } else {
                    alert('É necessário pelo menos um exercício no treino!');
                }
                return;
            }
            
            // Animar saída
            exercicioItem.style.transition = 'all 0.3s ease';
            exercicioItem.style.opacity = '0';
            exercicioItem.style.transform = 'translateX(-100%)';
            
            setTimeout(() => {
                exercicioItem.remove();
                reordenarExercicios();
            }, 300);
        }
    };

    // Função para reordenar exercícios após remoção
    function reordenarExercicios() {
        const exercicios = document.querySelectorAll('.exercicio-item');
        window.SistemaAdicionarTreino.config.exercicioCounter = 0;
        
        exercicios.forEach((exercicio, index) => {
            const numero = index + 1;
            window.SistemaAdicionarTreino.config.exercicioCounter = numero;
            
            // Atualizar número visual
            const numeroSpan = exercicio.querySelector('.exercicio-numero');
            if (numeroSpan) {
                numeroSpan.textContent = numero;
            }
            
            // Atualizar atributo data
            exercicio.setAttribute('data-exercicio', numero);
            
            // Atualizar os nomes dos inputs
            const inputs = exercicio.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                if (input.name) {
                    input.name = input.name.replace(/\[(\d+)\]/, `[${numero}]`);
                }
                if (input.id && input.id.includes('-')) {
                    const parts = input.id.split('-');
                    if (parts.length > 1) {
                        parts[parts.length - 1] = numero.toString();
                        input.id = parts.join('-');
                    }
                }
            });
            
            // Atualizar onclick do botão de remover
            const btnRemover = exercicio.querySelector('.btn-remover');
            if (btnRemover) {
                btnRemover.setAttribute('onclick', 'removerExercicio(this)');
            }
            
            // Atualizar IDs dos elementos de vídeo
            const videoUpload = exercicio.querySelector('.video-upload-area');
            const videoProgress = exercicio.querySelector('.video-progress');
            const videoFile = exercicio.querySelector('input[type="file"]');
            const uploadPlaceholder = exercicio.querySelector('.upload-placeholder');
            
            if (videoUpload) videoUpload.id = `video-upload-${numero}`;
            if (videoProgress) videoProgress.id = `progress-${numero}`;
            if (videoFile) {
                videoFile.id = `video-file-${numero}`;
                videoFile.setAttribute('onchange', `handleVideoUpload(${numero}, this)`);
            }
            if (uploadPlaceholder) {
                uploadPlaceholder.setAttribute('onclick', `document.getElementById('video-file-${numero}').click()`);
            }
        });
    }

    // Função global para lidar com upload de vídeo
    window.handleVideoUpload = function(exercicioIndex, input) {
        const file = input.files[0];
        if (!file) return;
        
        console.log('Upload iniciado para exercício:', exercicioIndex, 'arquivo:', file.name);
        
        // Verificar tamanho (50MB)
        if (file.size > 50 * 1024 * 1024) {
            if (typeof app !== 'undefined' && app.dialog) {
                app.dialog.alert('Arquivo muito grande. Máximo permitido: 50MB', 'Erro');
            } else {
                alert('Arquivo muito grande. Máximo permitido: 50MB');
            }
            input.value = '';
            return;
        }
        
        // Mostrar progresso
        const progressDiv = document.getElementById(`progress-${exercicioIndex}`);
        const uploadArea = document.getElementById(`video-upload-${exercicioIndex}`);
        
        if (!progressDiv || !uploadArea) {
            console.error('Elementos de progresso não encontrados:', exercicioIndex);
            return;
        }
        
        const progressFill = progressDiv.querySelector('.progress-fill');
        const progressText = progressDiv.querySelector('.progress-text');
        const placeholder = uploadArea.querySelector('.upload-placeholder');
        
        progressDiv.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
        
        // Criar FormData
        const formData = new FormData();
        formData.append('video', file);
        
        console.log('Enviando arquivo para servidor...', {
            nome: file.name,
            tamanho: file.size,
            tipo: file.type
        });
        
        // Upload com progresso usando XMLHttpRequest
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                if (progressFill) progressFill.style.width = percentComplete + '%';
                if (progressText) progressText.textContent = Math.round(percentComplete) + '%';
                console.log(`Progresso: ${Math.round(percentComplete)}%`);
            }
        });
        
        xhr.addEventListener('load', () => {
            console.log('Upload concluído, status:', xhr.status);
            console.log('Resposta do servidor:', xhr.responseText);
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    console.log('Resposta parseada:', response);
                    
                    if (response.success) {
                        // Salvar URL do vídeo
                        const hiddenInput = document.getElementById(`video-url-${exercicioIndex}`);
                        if (hiddenInput) {
                            hiddenInput.value = response.video_url;
                            console.log('URL do vídeo salva:', response.video_url);
                        }
                        
                        // Mostrar preview
                        showVideoPreview(exercicioIndex, response.video_url, file.name);
                        
                        if (typeof app !== 'undefined' && app.toast) {
                            app.toast.create({
                                text: 'Vídeo enviado com sucesso!',
                                position: 'center',
                                closeTimeout: 2000,
                            }).open();
                        } else {
                            alert('Vídeo enviado com sucesso!');
                        }
                    } else {
                        throw new Error(response.message || 'Erro no upload');
                    }
                } catch (error) {
                    console.error('Erro ao processar resposta:', error);
                    if (typeof app !== 'undefined' && app.dialog) {
                        app.dialog.alert('Erro ao fazer upload do vídeo: ' + error.message, 'Erro');
                    } else {
                        alert('Erro ao fazer upload do vídeo: ' + error.message);
                    }
                    resetUploadArea(exercicioIndex);
                }
            } else {
                console.error('Erro HTTP:', xhr.status, xhr.statusText);
                if (typeof app !== 'undefined' && app.dialog) {
                    app.dialog.alert('Erro no servidor. Tente novamente.', 'Erro');
                } else {
                    alert('Erro no servidor. Tente novamente.');
                }
                resetUploadArea(exercicioIndex);
            }
        });
        
        xhr.addEventListener('error', (e) => {
            console.error('Erro na requisição:', e);
            if (typeof app !== 'undefined' && app.dialog) {
                app.dialog.alert('Erro de conexão. Tente novamente.', 'Erro');
            } else {
                alert('Erro de conexão. Tente novamente.');
            }
            resetUploadArea(exercicioIndex);
        });
        
        // Abrir conexão e enviar
        xhr.open('POST', 'https://proatleta.site/upload_video.php', true);
        xhr.send(formData);
    };

    function showVideoPreview(exercicioIndex, videoUrl, fileName) {
        const uploadArea = document.getElementById(`video-upload-${exercicioIndex}`);
        const progressDiv = document.getElementById(`progress-${exercicioIndex}`);
        
        if (!uploadArea) return;
        
        progressDiv.style.display = 'none';
        
        uploadArea.innerHTML = `
            <div class="video-preview-container">
                <video controls width="100%" height="200" preload="metadata">
                    <source src="${videoUrl}" type="video/mp4">
                    Seu navegador não suporta a reprodução de vídeos.
                </video>
                <div class="video-info">
                    <span class="video-name">${fileName}</span>
                    <button type="button" class="btn-remove-video" onclick="removeVideo(${exercicioIndex})">
                        <i class="ri-delete-bin-line"></i> Remover
                    </button>
                </div>
            </div>
        `;
    }

    window.removeVideo = function(exercicioIndex) {
        const uploadArea = document.getElementById(`video-upload-${exercicioIndex}`);
        const hiddenInput = document.getElementById(`video-url-${exercicioIndex}`);
        
        if (hiddenInput) hiddenInput.value = '';
        
        if (uploadArea) {
            uploadArea.innerHTML = `
                <input type="file" 
                       id="video-file-${exercicioIndex}"
                       accept="video/mp4,video/webm,video/ogg,video/avi,video/mov"
                       style="display: none;"
                       onchange="handleVideoUpload(${exercicioIndex}, this)">
                <div class="upload-placeholder" onclick="document.getElementById('video-file-${exercicioIndex}').click()">
                    <i class="ri-upload-cloud-2-line"></i>
                    <p>Clique para selecionar um vídeo</p>
                    <small>Máximo 50MB - Formatos: MP4, WEBM, OGG, AVI, MOV</small>
                </div>
            `;
        }
    };

    function resetUploadArea(exercicioIndex) {
        const uploadArea = document.getElementById(`video-upload-${exercicioIndex}`);
        const progressDiv = document.getElementById(`progress-${exercicioIndex}`);
        
        if (progressDiv) progressDiv.style.display = 'none';
        if (uploadArea) {
            const placeholder = uploadArea.querySelector('.upload-placeholder');
            if (placeholder) placeholder.style.display = 'block';
        }
        
        // Limpar input
        const fileInput = document.getElementById(`video-file-${exercicioIndex}`);
        if (fileInput) fileInput.value = '';
    }

    // Função global para salvar treino
    window.salvarTreino = function() {
        console.log('Iniciando salvamento do treino...');
        
        const form = document.getElementById('form-treino');
        if (!form) {
            console.error('Formulário não encontrado');
            return;
        }

        // Validar se há pelo menos um exercício
        const exercicios = form.querySelectorAll('.exercicio-item');
        if (exercicios.length === 0) {
            if (typeof app !== 'undefined' && app.dialog) {
                app.dialog.alert('Adicione pelo menos um exercício ao treino', 'Erro');
            } else {
                alert('Adicione pelo menos um exercício ao treino');
            }
            return;
        }

        // Criar FormData manualmente para garantir o formato correto
        const formData = new FormData();
        
        // Adicionar dados básicos do treino
        const emailAluno = localStorage.getItem('alunoSelecionado');
        const professorId = localStorage.getItem('userId');
        
        if (!emailAluno || !professorId) {
            if (typeof app !== 'undefined' && app.dialog) {
                app.dialog.alert('Dados do aluno ou professor não encontrados', 'Erro');
            } else {
                alert('Dados do aluno ou professor não encontrados');
            }
            return;
        }
        
        formData.append('email_aluno', emailAluno);
        formData.append('professor_id', professorId);
        formData.append('nome_treino', form.nome_treino.value);
        formData.append('tipo_treino', form.tipo_treino.value);
        formData.append('data_treino', form.data_treino.value);
        formData.append('observacoes', form.observacoes.value);
        
        // Coletar dados dos exercícios
        const exerciciosData = {};
        exercicios.forEach((exercicioElement, index) => {
            const exercicioNum = index + 1;
            const inputs = exercicioElement.querySelectorAll('input, textarea');
            
            exerciciosData[exercicioNum] = {};
            
            inputs.forEach(input => {
                if (input.name && input.name.includes(`[${exercicioNum}]`)) {
                    const fieldName = input.name.match(/\[(\w+)\]$/)[1];
                    exerciciosData[exercicioNum][fieldName] = input.value;
                }
            });
        });
        
        formData.append('exercicios', JSON.stringify(exerciciosData));
        
        console.log('Dados a serem enviados:', {
            email_aluno: emailAluno,
            professor_id: professorId,
            nome_treino: form.nome_treino.value,
            exercicios: exerciciosData
        });

        // Mostrar loading
        if (typeof app !== 'undefined' && app.dialog) {
            app.dialog.preloader('Salvando treino...');
        }

        fetch('https://proatleta.site/salvar_treino.php', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Status da resposta:', response.status);
            return response.text();
        })
        .then(text => {
            console.log('Resposta bruta do servidor:', text);
            try {
                const data = JSON.parse(text);
                console.log('Resposta parseada:', data);
                
                // Fechar loading
                if (typeof app !== 'undefined' && app.dialog) {
                    app.dialog.close();
                }

                if (data.success) {
                    if (typeof app !== 'undefined' && app.toast) {
                        app.toast.create({
                            text: 'Treino salvo com sucesso!',
                            position: 'center',
                            closeTimeout: 2000,
                        }).open();
                    } else {
                        alert('Treino salvo com sucesso!');
                    }
                    
                    // Voltar para página anterior após sucesso com limpeza forçada
                    setTimeout(() => {
                        // Limpar CSS da página atual antes de navegar
                        const currentCss = document.getElementById('adicionar-treino-css');
                        if (currentCss) {
                            currentCss.parentNode.removeChild(currentCss);
                        }
                        
                        if (typeof app !== 'undefined' && app.views && app.views.main) {
                            // Navegar explicitamente para treinos_prof em vez de usar back()
                            app.views.main.router.navigate('/treinos_prof/', {
                                force: true,
                                clearPreviousHistory: false
                            });
                        } else {
                            history.back();
                        }
                    }, 1000); // Aumentado para 1 segundo para dar tempo do toast
                } else {
                    throw new Error(data.message || 'Erro ao salvar treino');
                }
            } catch (parseError) {
                console.error('Erro ao fazer parse da resposta:', parseError);
                throw new Error('Resposta inválida do servidor: ' + text);
            }
        })
        .catch(error => {
            console.error('Erro ao salvar treino:', error);
            
            // Fechar loading
            if (typeof app !== 'undefined' && app.dialog) {
                app.dialog.close();
            }
            
            if (typeof app !== 'undefined' && app.dialog) {
                app.dialog.alert('Erro ao salvar treino: ' + error.message, 'Erro');
            } else {
                alert('Erro ao salvar treino: ' + error.message);
            }
        });
    };

    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.SistemaAdicionarTreino.init);
    } else {
        window.SistemaAdicionarTreino.init();
    }

    console.log('Sistema adicionar treino carregado');
})();