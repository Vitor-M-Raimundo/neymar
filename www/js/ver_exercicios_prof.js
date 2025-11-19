(function () {
	'use strict';

	// Helpers
	function qs(name) {
		const params = new URLSearchParams(window.location.search);
		return params.get(name);
	}
	function el(id) { return document.getElementById(id); }
	function showError(container, msg) {
		if (!container) return;
		container.innerHTML = `<div class="empty-state"><i class="mdi mdi-alert-circle-outline"></i><h3>Erro</h3><p>${msg}</p></div>`;
	}

	// UI rendering
	function criarExercicioHtml(ex) {
		const concluidoClass = ex.concluido ? 'concluido' : '';
		const concluidoChecked = ex.concluido ? 'checked' : '';
		const pesoBadge = ex.peso ? `<span class="badge peso-badge">${ex.peso}</span>` : '';
		const descansoBadge = ex.descanso ? `<span class="badge peso-badge">${ex.descanso}s descanso</span>` : '';
		
		// Formatar observações do exercício (se existirem)
		const observacoesHtml = ex.observacoes && ex.observacoes.trim() 
			? `<div class="observacoes-mini">
					<i class="ri-lightbulb-line"></i>
					<span class="obs-text">${ex.observacoes}</span>
				</div>`
			: '';
		
		// Adicionar vídeo se existir
		const videoHtml = ex.video_arquivo 
			? `<div class="exercicio-video" id="video-container-${ex.id}" style="display:none;">
					<video controls controlsList="nodownload" preload="metadata" style="width:100%; max-height:300px;">
						<source src="${ex.video_arquivo}" type="video/mp4">
						Seu navegador não suporta vídeos.
					</video>
				</div>`
			: '';
		
		return `
			<div class="exercicio-card ${concluidoClass}" data-exercicio-id="${ex.id}">
				<div class="exercicio-left">
					<div class="exercicio-ordem">${ex.ordem}.</div>
				</div>

				<div class="exercicio-body">
					<div class="exercicio-row">
						<div class="exercicio-titulo">${ex.nome}</div>
						<label class="exercicio-box-concluido" title="Marcar concluído">
							<input type="checkbox" class="marcar-ex" data-ex-id="${ex.id}" ${concluidoChecked}>
							<span class="checkbox-visual">
								<i class="ri-check-line"></i>
							</span>
						</label>
					</div>

					<div class="exercicio-badges">
						<span class="badge series-badge">${ex.series || 0} séries</span>
						<span class="badge reps-badge">${ex.repeticoes || 0} reps</span>
						${pesoBadge}
						${descansoBadge}
					</div>

					<div class="exercicio-actions-row">
						${observacoesHtml}
						${ex.video_arquivo ? `<button class="btn-play" data-video-id="${ex.id}" title="Ver vídeo"><i class="ri-play-line"></i></button>` : ''}
					</div>
					
					${videoHtml}
				</div>
			</div>
		`;
	}

	function bindCheckboxes(treinoObj) {
		document.querySelectorAll('.marcar-ex').forEach(chk => {
			if (chk.getAttribute('data-listener-bound')) return;
			chk.setAttribute('data-listener-bound', '1');
			chk.addEventListener('change', (e) => {
				const exId = e.target.getAttribute('data-ex-id');
				const itemEl = e.target.closest('.exercicio-card');
				const concluido = e.target.checked;
				
				if (concluido) {
					itemEl.classList.add('concluido');
				} else {
					itemEl.classList.remove('concluido');
				}
				
				marcarExercicioServidor(exId, concluido, e.target, itemEl, treinoObj);
			});
		});

		// Vincular botões de vídeo
		document.querySelectorAll('.btn-play').forEach(btn => {
			if (btn.getAttribute('data-listener-video')) return;
			btn.setAttribute('data-listener-video', '1');
			btn.addEventListener('click', (e) => {
				e.preventDefault();
				const videoId = btn.getAttribute('data-video-id');
				toggleVideo(videoId, btn);
			});
		});
	}

	// Nova função para mostrar/ocultar vídeo
	function toggleVideo(exercicioId, btnElement) {
		const videoContainer = document.getElementById(`video-container-${exercicioId}`);
		const videoElement = videoContainer ? videoContainer.querySelector('video') : null;
		const icon = btnElement.querySelector('i');
		
		if (!videoContainer || !videoElement) {
			console.warn('Vídeo não encontrado para exercício:', exercicioId);
			return;
		}
		
		// Toggle display
		if (videoContainer.style.display === 'none') {
			// Mostrar vídeo
			videoContainer.style.display = 'block';
			icon.className = 'ri-pause-line';
			
			// Scroll suave até o vídeo
			setTimeout(() => {
				videoContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			}, 100);
			
			// Auto-play (opcional)
			videoElement.play().catch(err => {
				console.warn('Auto-play bloqueado:', err);
			});
		} else {
			// Ocultar vídeo
			videoElement.pause();
			videoContainer.style.display = 'none';
			icon.className = 'ri-play-line';
		}
	}

	// Marca exercício no servidor
	function marcarExercicioServidor(exercicioId, concluido, checkboxEl, itemEl, treinoObj) {
		const userEmail = localStorage.getItem('userEmail');
		if (!userEmail) {
			alert('Email do usuário não encontrado');
			checkboxEl.checked = !concluido;
			return;
		}
		
		// Desabilitar checkbox durante requisição
		checkboxEl.disabled = true;

		const payload = {
			exercicio_id: exercicioId,
			concluido: concluido ? 1 : 0,
			aluno_email: userEmail
		};

		fetch('https://proatleta.site/marcar_exercicio_concluido.php', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		})
		.then(r => r.text())
		.then(txt => {
			let data;
			try { data = JSON.parse(txt); } catch (e) {
				throw new Error('Resposta inválida do servidor');
			}
			if (data.success) {
				// Atualizar estado visual
				if (concluido) {
					itemEl.classList.add('concluido');
				} else {
					itemEl.classList.remove('concluido');
				}

				// Atualizar dados do treino
				if (treinoObj && treinoObj.exercicios) {
					const exFind = treinoObj.exercicios.find(x => x.id == exercicioId);
					if (exFind) {
						exFind.concluido = concluido;
						exFind.concluido_em = data.concluido_em || null;
					}
					
					// Salvar no localStorage
					try { 
						localStorage.setItem('treinoSelecionado', JSON.stringify(treinoObj)); 
					} catch (e) {
						console.warn('Erro ao salvar no localStorage:', e);
					}
					
					// ATUALIZAR BARRA IMEDIATAMENTE
					atualizarBarraProgresso(treinoObj);
				}
				
				// Toast de sucesso
				if (typeof app !== 'undefined') {
					app.toast.create({ 
						text: data.message || 'Atualizado', 
						position: 'bottom', 
						closeTimeout: 2000 
					}).open();
				}
			} else {
				throw new Error(data.message || 'Erro ao marcar exercício');
			}
		})
		.catch(err => {
			console.error('Erro ao marcar exercício:', err);
			alert(err.message || 'Erro ao conectar com o servidor');
			// Reverter estado visual em caso de erro
			checkboxEl.checked = !concluido;
			if (concluido) {
				itemEl.classList.remove('concluido');
			} else {
				itemEl.classList.add('concluido');
			}
		})
		.finally(() => {
			// Reabilitar checkbox
			checkboxEl.disabled = false;
		});
	}

	// Renderiza treino na UI (ÚNICA FUNÇÃO)
	function renderTreino(treino) {
		const $obs = el('observacoesTreino');
		const $lista = el('listaExercicios');
		const $resumo = el('treinoResumo');
		
		if (!$lista) return;

		// Calcular progresso
		const total = treino.exercicios ? treino.exercicios.length : 0;
		const concluidos = treino.exercicios ? treino.exercicios.filter(ex => ex.concluido).length : 0;
		const percent = total > 0 ? Math.round((concluidos / total) * 100) : 0;

		// Recriar HTML completo do card (igual ver_treinos_prof.js)
		if ($resumo) {
			$resumo.innerHTML = `
				<div style="flex:1;">
					<h2 id="treinoTitulo" style="margin:0; font-size:16px; text-align:center;">${treino.nome_treino || 'Treino'}</h2>
					<div id="treinoMeta" style="color:#64748b; font-size:13px; text-align:center;">${treino.tipo_treino || 'Geral'}</div>
				</div>
				<div class="progress-section" style="display:flex; margin-top:12px; width:100%; align-items:center; gap:12px;">
					<div class="progress-track" style="flex:1; height:10px; border-radius:6px; background:#f1f5f9; overflow:hidden;">
						<div class="progress-fill" style="width:0%; height:100%; background:linear-gradient(90deg, #ff7a3d 0%, #f86100 100%); transition:width 300ms ease;"></div>
					</div>
					<div class="progress-text" style="min-width:44px; color:#f86100; font-weight:700; font-size:13px; text-align:right;">0/${total}</div>
				</div>
			`;
			$resumo.style.display = 'flex';
			$resumo.style.flexDirection = 'column';
			
			// Forçar atualização imediata da barra ANTES do setTimeout
			const progressFillElement = $resumo.querySelector('.progress-fill');
			const progressTextElement = $resumo.querySelector('.progress-text');
			
			if (progressFillElement && progressTextElement) {
				// Usar múltiplos requestAnimationFrame para garantir renderização
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						progressFillElement.style.width = `${percent}%`;
						progressTextElement.textContent = `${concluidos}/${total}`;
						console.log('Barra atualizada imediatamente:', percent + '%');
					});
				});
			}
		}

		// Observações
		if (treino.observacoes) {
			$obs.style.display = 'block';
			$obs.innerHTML = `<div class="observacoes-box"><i class="ri-information-line"></i> ${treino.observacoes}</div>`;
		} else {
			$obs.style.display = 'none';
			$obs.innerHTML = '';
		}

		// Lista de exercícios
		if (!treino.exercicios || treino.exercicios.length === 0) {
			$lista.innerHTML = `<div class="empty-state"><i class="mdi mdi-clipboard-text-outline"></i><h3>Nenhum exercício</h3></div>`;
			return;
		}

		// Gerar HTML dos exercícios (sem botão finalizar)
		const exerciciosHtml = treino.exercicios.map(ex => criarExercicioHtml(ex)).join('');
		
		// Inserir apenas os exercícios
		$lista.innerHTML = exerciciosHtml;

		// Usar requestAnimationFrame para garantir que o DOM foi atualizado antes de vincular eventos
		requestAnimationFrame(() => {
			// Vincular checkboxes e botões de vídeo
			bindCheckboxes(treino);
		});
		
		// BACKUP: Também atualizar após timeout (redundância)
		setTimeout(() => {
			atualizarBarraProgresso(treino);
		}, 100);
	}

	// Nova função para atualizar apenas a barra de progresso - MELHORADA
	function atualizarBarraProgresso(treino) {
		const total = treino.exercicios ? treino.exercicios.length : 0;
		const concluidos = treino.exercicios ? treino.exercicios.filter(ex => ex.concluido).length : 0;
		const percent = total > 0 ? Math.round((concluidos / total) * 100) : 0;

		console.log('Atualizando progresso:', concluidos, '/', total, '=', percent + '%');

		// Atualizar elemento fill
		const progressFill = document.querySelector('.progress-fill');
		if (progressFill) {
			// Forçar atualização com requestAnimationFrame para garantir renderização
			requestAnimationFrame(() => {
				progressFill.style.width = `${percent}%`;
			});
		} else {
			console.warn('Elemento .progress-fill não encontrado');
		}

		// Atualizar elemento text
		const progressText = document.querySelector('.progress-text');
		if (progressText) {
			progressText.textContent = `${concluidos}/${total}`;
		} else {
			console.warn('Elemento .progress-text não encontrado');
		}

		// Atualizar no container específico também (redundância para garantir)
		const resumoProgressFill = document.querySelector('#treinoResumo .progress-fill');
		const resumoProgressText = document.querySelector('#treinoResumo .progress-text');
		
		if (resumoProgressFill) {
			requestAnimationFrame(() => {
				resumoProgressFill.style.width = `${percent}%`;
			});
		}
		
		if (resumoProgressText) {
			resumoProgressText.textContent = `${concluidos}/${total}`;
		}
	}

	// Tentativa de obter treino localmente; se não, busca do servidor pela query string + userEmail/professor_id
	function carregarTreinoEExibir() {
		const $lista = el('listaExercicios');
		let treino = null;
		try {
			const raw = localStorage.getItem('treinoSelecionado');
			if (raw) treino = JSON.parse(raw);
		} catch (e) { treino = null; }

		const treinoIdQS = qs('treino_id');

		// Se existe localmente, renderiza
		if (treino) {
			renderTreino(treino);
			return;
		}

		// Se não há local e há treino_id, buscar do servidor (busca lista e filtra)
		if (treinoIdQS) {
			const userEmail = localStorage.getItem('userEmail');
			const professorId = localStorage.getItem('professor_id') || localStorage.getItem('professorSelecionado');
			if (!userEmail || !professorId) {
				showError($lista, 'Dados insuficientes para buscar treino (salve lista e abra novamente).');
				return;
			}
			$lista.innerHTML = `<div class="loader-container"><div class="preloader"></div><p style="margin-top:12px;color:#666;">Buscando treino...</p></div>`;
			fetch(`https://proatleta.site/get_treinos_aluno.php?email_aluno=${encodeURIComponent(userEmail)}&professor_id=${encodeURIComponent(professorId)}`)
				.then(res => res.json())
				.then(data => {
					if (data.success && data.treinos) {
						const found = data.treinos.find(t => String(t.id) === String(treinoIdQS));
						if (found) {
							try { localStorage.setItem('treinoSelecionado', JSON.stringify(found)); } catch (e) {}
							renderTreino(found);
						} else {
							showError($lista, 'Treino não encontrado no servidor. Volte à lista e abra novamente.');
						}
					} else {
						showError($lista, 'Nenhum treino retornado pelo servidor.');
					}
				})
				.catch(err => {
					console.error(err);
					showError($lista, 'Erro ao buscar treino no servidor.');
				});
			return;
		}

		// Nenhum treino disponível
		showError($lista, 'Nenhum treino selecionado. Volte à lista e selecione um treino.');
	}

	// Nova função: Finalizar treino
	function finalizarTreino() {
		const treino = obterTreinoAtual();
		if (!treino || !treino.id) {
			alert('Não foi possível identificar o treino para finalizar.');
			return;
		}

		// Confirmar ação
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
	}

	function executarFinalizacaoTreino(treinoId) {
		const btn = document.getElementById('btnFinalizarTreino');
		if (!btn) return;

		// Mostrar loading
		btn.classList.add('loading');
		btn.disabled = true;

		// Fazer requisição para finalizar treino
		fetch('https://proatleta.site/finalizar_treino.php', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ treino_id: treinoId })
		})
		.then(r => r.json())
		.then(data => {
			if (data.success) {
				// Remover treino do localStorage
				try {
					localStorage.removeItem('treinoSelecionado');
				} catch (e) {
					console.warn('Erro ao limpar localStorage:', e);
				}

				// Mostrar mensagem de sucesso
				if (typeof app !== 'undefined' && app.toast) {
					app.toast.create({
						text: 'Treino finalizado com sucesso!',
						position: 'bottom',
						closeTimeout: 2000,
						cssClass: 'toast-success'
					}).open();
				}

				// Aguardar um pouco e voltar para a lista de treinos
				setTimeout(() => {
					voltarParaListaTreinos();
				}, 1000);
			} else {
				throw new Error(data.message || 'Erro ao finalizar treino');
			}
		})
		.catch(err => {
			console.error('Erro ao finalizar treino:', err);
			alert(err.message || 'Erro ao finalizar treino. Tente novamente.');
			
			// Remover loading
			btn.classList.remove('loading');
			btn.disabled = false;
		});
	}

	function obterTreinoAtual() {
		try {
			const raw = localStorage.getItem('treinoSelecionado');
			return raw ? JSON.parse(raw) : null;
		} catch (e) {
			return null;
		}
	}

	function voltarParaListaTreinos() {
		// Tentar navegar usando Framework7
		if (typeof app !== 'undefined' && app.views && app.views.main && app.views.main.router) {
			try {
				app.views.main.router.back();
				return;
			} catch (e) {
				console.warn('app.views.main.router.back falhou:', e);
			}
		}

		// Fallback: history.back()
		if (window.history && window.history.length > 1) {
			history.back();
		} else {
			// Último fallback: redirecionar diretamente
			window.location.href = 'ver_treinos_prof.html';
		}
	}

	// Back button handler
	function initBackButton() {
		const btn = el('btnVoltar');
		if (!btn) return;
		btn.addEventListener('click', () => {
			if (typeof app !== 'undefined' && app.views && app.views.main && app.views.main.router) {
				try { app.views.main.router.back(); return; } catch (e) {}
			}
			if (window.history && window.history.length > 1) history.back();
			else window.location.href = 'ver_treinos_prof.html';
		});
	}

	// Inicializar botão de finalizar
	function initFinalizarButton() {
		const btn = document.getElementById('btnFinalizarTreino');
		if (!btn) return;
		
		// Remover listeners antigos
		if (btn._finalizarHandler) {
			btn.removeEventListener('click', btn._finalizarHandler);
		}
		
		// Adicionar novo listener
		const handler = () => finalizarTreino();
		btn.addEventListener('click', handler);
		btn._finalizarHandler = handler;
	}

	// Entrypoint
	function initPage() {
		initBackButton();
		initFinalizarButton();
		carregarTreinoEExibir();
	}

	// Suporta carregamento direto e via Framework7 page:init
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initPage);
	} else {
		initPage();
	}

	// Framework7 page:init fallback (rota)
	document.addEventListener('page:init', function (e) {
		// detectar pela rota/url ou nome
		if (e.detail && e.detail.route && (e.detail.route.path && e.detail.route.path.indexOf('/ver_exercicios_prof') === 0)) {
			// pequena tolerância para garantir DOM da página atual
			setTimeout(initPage, 50);
		}
	});
})();
