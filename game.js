/**
 * WINGS MOTORCYCLE GAME ENGINE
 * Versão: 14.3 (Flow UX Update)
 * - UX: Tela de Instruções agora aparece SEMPRE ao iniciar o app.
 * - UX: Botão da Garagem detecta se é "Novo Jogo" ou "Continuar".
 * - Visual: Fonte das instruções aumentada para 16px.
 */

const CONFIG = {
    velocidadeCenario: 5, 
    velocidadeObstaculo: 5, 
    tempoFeedback: 1500, 
    zonaSeguraY: 0.33, 
    
    // CONFIGURAÇÃO DOS BLOCOS
    perguntasPorBloco: 10, 
    blocosPorNivel: 10, 
    notaMinima: 7,      
    
    timerTempo: 15, 
    saveKey: 'wings_save_v14_3_ux', 
    
    emailSuporte: 'wingsmotorcyclecourse@gmail.com',
    instagramUrl: 'https://www.instagram.com/wingsmotorcyclecourse/', 
    descontos: { 'Iniciante': 5, 'Intermediario': 10, 'Avancado': 15 }
};

const MOTO_CATALOG = [
    'moto_1_custom.png', 'moto_2_custom.png', 'moto_3_big trail BMW.png',
    'moto_4_big trail HD.png', 'moto_5_esportiva.png', 'moto_6_esportiva.png',
    'moto_7_sport touring.png', 'moto_8_Diavel.png', 'moto_9_naked.png',
    'moto_10_retro.png', 'moto_11_motoboy.png', 'moto_12_scooter.png',
    'moto_13_trike HD.png', 'moto_14_triciclo.png'
];

const ASSETS_PATH = {
    motos: MOTO_CATALOG.map(f => `assets/motos/${f}`),
    cenarios: ['assets/cenarios/terra_batida.png', 'assets/cenarios/asfalto_ruim.png', 'assets/cenarios/asfalto.png'],
    grama: 'assets/cenarios/grama.png',
    obstaculos: [
        'assets/obstaculos/ambulance.png', 'assets/obstaculos/buraco.png',
        'assets/obstaculos/caminhao.png', 'assets/obstaculos/caminhonete.png',
        'assets/obstaculos/carro.png', 'assets/obstaculos/cavalo_branco.png',
        'assets/obstaculos/cavalo.png', 'assets/obstaculos/chevy.png',
        'assets/obstaculos/cone.png', 'assets/obstaculos/fbi.png',
        'assets/obstaculos/muscle.png', 'assets/obstaculos/police.png',
        'assets/obstaculos/silver.png', 'assets/obstaculos/speed.png',
        'assets/obstaculos/vaca.png', 'assets/obstaculos/veloz.png'
    ],
    patentes: {
        'Recruta': 'assets/patentes/Recruta.png',
        'Piloto_consciente': 'assets/patentes/Piloto_consciente.png',
        'Piloto_tecnico': 'assets/patentes/Piloto_tecnico.png',
        'Instrutor_honorario': 'assets/patentes/Instrutor_honorario.png'
    },
    trofeus: {
        'Iniciante': 'assets/trofeus/iniciante.png',
        'Intermediario': 'assets/trofeus/intermediario.png',
        'Avancado': 'assets/trofeus/avancado.png'
    },
    explosaoGif: 'assets/explosao.gif'
};

let GameState = {
    motoSelecionada: 0, 
    nivelIndex: 0, 
    blocosConcluidos: 0, 
    niveisNomes: ['Iniciante', 'Intermediario', 'Avancado'],
    perguntaIndex: 0, 
    vidas: 3, 
    acertosBloco: 0, 
    errosBloco: 0,
    acertosGlobal: 0, 
    errosGlobal: 0, 
    totalPerguntasGlobal: 0,
    motoX: 0, 
    offsetY: 0, 
    faixaAtual: 1, 
    obstaculos: [], 
    shaking: false, 
    pausado: true, 
    respondendo: false,
    aguardandoConclusaoAnimacao: false, 
    resultadoPendente: null, 
    explodindo: false,
    timerInterval: null, 
    timerValue: 0,
    explosionPos: { x: 0, y: 0 }
};

let canvas, ctx, imagesCache = {}, dbPerguntas = null;

const Game = {
    async init() {
        console.log("Iniciando Wings Engine 14.3...");
        canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        try { if(typeof Fireworks !== 'undefined') Fireworks.init(); } catch(e){}

        this.carregarProgresso(); 
        await this.preloadImages();
        
        const sfxLose = document.getElementById('sfx-lose');
        const sfxWin = document.getElementById('sfx-win');
        if(sfxLose) sfxLose.load();
        if(sfxWin) sfxWin.load();

        await this.fetchPerguntas();

        // UX CHANGE: SEMPRE MOSTRA INTRO, INDEPENDENTE DO SAVE
        this.mostrarIntro();
        
        this.loop();
    },

    resize() {
        if(canvas.parentElement) {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        } else { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        GameState.motoX = canvas.width / 2;
        if(typeof Fireworks !== 'undefined' && Fireworks.canvas) {
            Fireworks.canvas.width = canvas.width;
            Fireworks.canvas.height = canvas.height;
        }
    },

    async preloadImages() {
        const urls = [
            ...ASSETS_PATH.motos, ...ASSETS_PATH.cenarios, ASSETS_PATH.grama, 
            ...ASSETS_PATH.obstaculos, ...Object.values(ASSETS_PATH.patentes),
            ...Object.values(ASSETS_PATH.trofeus)
        ];
        const promises = urls.map(u => new Promise(res => {
            const i = new Image(); i.src = u;
            i.onload = () => { imagesCache[u] = i; res(); };
            i.onerror = () => { res(); };
        }));
        await Promise.all(promises);
    },

    async fetchPerguntas() {
        try {
            const r = await fetch("https://raw.githubusercontent.com/HWA1982/perguntas/refs/heads/main/perguntas.json?v=" + Date.now());
            dbPerguntas = await r.json();
        } catch (e) { console.error("Erro BD", e); }
    },

    resetState() {
        GameState.vidas = 3; 
        GameState.nivelIndex = 0; 
        GameState.blocosConcluidos = 0;
        GameState.perguntaIndex = 0;
        GameState.acertosBloco = 0; GameState.errosBloco = 0;
        GameState.acertosGlobal = 0; GameState.errosGlobal = 0; GameState.totalPerguntasGlobal = 0;
        this.salvarProgresso();
    },

    mostrarIntro() {
        const intro = document.getElementById('screen-intro');
        const garage = document.getElementById('screen-garage');
        if(intro) intro.classList.remove('hidden');
        if(garage) garage.classList.add('hidden');
    },

    irParaGaragem() {
        document.getElementById('screen-intro').classList.add('hidden');
        this.renderizarGaragem();
    },

    renderizarGaragem() {
        const grid = document.getElementById('garage-grid');
        const screen = document.getElementById('screen-garage');
        if (!grid || !screen) return;
        
        screen.classList.remove('hidden');
        grid.innerHTML = ''; 
        
        ASSETS_PATH.motos.forEach((src, idx) => {
            const card = document.createElement('div');
            card.className = `moto-card ${GameState.motoSelecionada === idx ? 'selected' : ''}`;
            let label = "MOTO " + (idx+1);
            try { label = src.split('/').pop().replace('.png', '').replace(/moto_\d+_/, '').replace(/_/g, ' ').toUpperCase(); } catch(e){}
            card.innerHTML = `<img src="${src}"><div class="moto-name">${label}</div>`;
            card.onclick = () => {
                document.querySelectorAll('.moto-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected'); 
                GameState.motoSelecionada = idx;
                this.salvarProgresso();
            };
            grid.appendChild(card);
        });
        
        const btn = document.getElementById('btn-start-game');
        if (btn) {
            const emAndamento = (GameState.nivelIndex > 0 || GameState.blocosConcluidos > 0 || GameState.perguntaIndex > 0);
            btn.innerText = emAndamento ? "CONTINUAR VIAGEM" : "INICIAR TRAJETO";
            btn.onclick = () => {
                if (!emAndamento) this.iniciarJogoDoZero();
                else { screen.classList.add('hidden'); this.iniciarNivel(); }
            };
        }
    },

    iniciarJogoDoZero() {
        this.resetState();
        if(dbPerguntas) this.embaralharPerguntas(GameState.niveisNomes[0]);
        document.getElementById('screen-garage').classList.add('hidden');
        this.iniciarNivel();
    },

    iniciarNivel() {
        GameState.obstaculos = []; GameState.pausado = false; GameState.respondendo = false;
        GameState.aguardandoConclusaoAnimacao = false; GameState.explodindo = false;
        if(typeof Fireworks !== 'undefined') Fireworks.stop();
        this.carregarUI();
    },

    carregarUI() {
        const nivel = GameState.niveisNomes[GameState.nivelIndex];
        const perguntas = dbPerguntas ? dbPerguntas[nivel] : null;
        
        if (!perguntas) { setTimeout(() => this.carregarUI(), 500); return; }
        
        if (GameState.perguntaIndex >= perguntas.length) { 
            this.embaralharPerguntas(nivel);
            GameState.perguntaIndex = 0; 
        }
        
        const p = perguntas[GameState.perguntaIndex];
        
        document.getElementById('ui-nivel').innerText = `${nivel.toUpperCase()} (BLOCO ${GameState.blocosConcluidos + 1}/10)`;
        document.getElementById('ui-vidas').innerText = GameState.vidas;
        document.getElementById('question-text').innerText = p.pergunta;
        
        const progressoBloco = GameState.perguntaIndex + 1;
        document.getElementById('ui-progresso').innerText = `Questão ${progressoBloco}/${CONFIG.perguntasPorBloco}`;
        document.getElementById('progress-fill').style.width = `${(progressoBloco / CONFIG.perguntasPorBloco) * 100}%`;

        [0, 1, 2].forEach(i => {
            const btn = document.getElementById(`btn-opt-${i}`);
            if(btn) {
                btn.innerText = p.opcoes[i]; btn.className = 'btn-option'; btn.disabled = false;
                btn.classList.remove('btn-correct', 'btn-wrong');
            }
        });
        this.iniciarTimer();
    },

    iniciarTimer() {
        this.pararTimer(); 
        GameState.timerValue = CONFIG.timerTempo;
        const bar = document.getElementById('timer-bar');
        if(bar) { bar.style.width = '100%'; bar.style.backgroundColor = '#D4AF37'; }

        GameState.timerInterval = setInterval(() => {
            if (GameState.respondendo) return;
            GameState.timerValue--;
            if(bar) {
                const pct = (GameState.timerValue / CONFIG.timerTempo) * 100;
                bar.style.width = `${pct}%`;
                if (pct < 30) bar.style.backgroundColor = '#ff4444'; 
            }
            if (GameState.timerValue <= 0) { this.pararTimer(); this.responder(-1); }
        }, 1000);
    },

    pararTimer() { if (GameState.timerInterval) clearInterval(GameState.timerInterval); },

    responder(escolha) {
        if (GameState.respondendo) return;
        this.pararTimer(); 
        GameState.respondendo = true;
        GameState.aguardandoConclusaoAnimacao = true;

        const nivel = GameState.niveisNomes[GameState.nivelIndex];
        const p = dbPerguntas[nivel][GameState.perguntaIndex];
        const acertou = (escolha === p.correta);

        if (acertou) {
            const sfx = document.getElementById('sfx-win');
            if(sfx) { sfx.currentTime = 0; sfx.play().catch(()=>{}); }
            document.getElementById(`btn-opt-${escolha}`)?.classList.add('btn-correct');
            GameState.acertosBloco++; GameState.acertosGlobal++;
        } else {
            if (escolha !== -1) document.getElementById(`btn-opt-${escolha}`)?.classList.add('btn-wrong');
            document.getElementById(`btn-opt-${p.correta}`)?.classList.add('btn-correct');
            GameState.vidas--; GameState.errosBloco++; GameState.errosGlobal++;
            const v = document.getElementById('ui-vidas');
            if(v) { v.classList.add('life-lost-anim'); setTimeout(() => v.classList.remove('life-lost-anim'), 500); }
        }
        
        GameState.totalPerguntasGlobal++;
        this.salvarProgresso();
        GameState.faixaAtual = (escolha === -1) ? 1 : escolha; 
        
        let msgExplicacao = p.explicacao;
        if (escolha === -1) msgExplicacao = "TEMPO ESGOTADO! " + msgExplicacao;

        GameState.resultadoPendente = { acertou, titulo: acertou ? "EXCELENTE!" : "CUIDADO!", cor: acertou ? "#D4AF37" : "#ff4444", explicacao: msgExplicacao };

        [0, 1, 2].forEach(f => {
            if (f !== p.correta) { 
                const img = ASSETS_PATH.obstaculos[Math.floor(Math.random() * ASSETS_PATH.obstaculos.length)];
                GameState.obstaculos.push({ y: -350, faixa: f, img, colidiu: false });
            }
        });

        setTimeout(() => {
            if(GameState.respondendo && GameState.aguardandoConclusaoAnimacao) {
                GameState.aguardandoConclusaoAnimacao = false;
                if(GameState.vidas <= 0) this.finalizarBloco(false, true);
                else this.mostrarFeedbackModal();
            }
        }, 3000);
    },

    mostrarFeedbackModal() {
        const r = GameState.resultadoPendente; if(!r) return;
        const modal = document.getElementById('modal-feedback');
        const containerBtns = document.getElementById('action-buttons-container');
        
        containerBtns.innerHTML = ''; 
        
        modal.classList.remove('hidden');
        document.getElementById('feedback-icon').style.display = 'none';
        document.getElementById('feedback-title').innerText = r.titulo;
        document.getElementById('feedback-title').style.color = r.cor;
        document.getElementById('feedback-msg').innerText = r.explicacao;
        
        document.getElementById('btn-feedback-next').style.display = 'none'; 
        this.createBtn(containerBtns, 'CONTINUAR', 'btn-primary', () => this.proximaEtapa());
    },

    finalizarBloco(fimTotal = false, gameOver = false) {
        this.pararTimer();
        GameState.aguardandoConclusaoAnimacao = false;
        GameState.explodindo = false;
        
        const modal = document.getElementById('modal-feedback');
        const containerBtns = document.getElementById('action-buttons-container');
        const feedbackIcon = document.getElementById('feedback-icon');
        
        containerBtns.innerHTML = ''; 
        
        modal.classList.remove('hidden');
        feedbackIcon.style.display = 'block';
        feedbackIcon.className = ''; 

        const acertos = GameState.acertosBloco;
        const aprovadoNoBloco = (acertos >= CONFIG.notaMinima) && GameState.vidas > 0 && !gameOver;
        const nivelAtualStr = GameState.niveisNomes[GameState.nivelIndex];

        document.getElementById('btn-feedback-next').style.display = 'none';

        let patenteImg, patenteNome;
        if (!aprovadoNoBloco) {
            patenteImg = ASSETS_PATH.patentes['Recruta'];
            patenteNome = "RECRUTA (Reprovado)";
        } else {
            if (acertos === 7) { patenteNome = "RECRUTA"; patenteImg = ASSETS_PATH.patentes['Recruta']; }
            else if (acertos === 8) { patenteNome = "PILOTO CONSCIENTE"; patenteImg = ASSETS_PATH.patentes['Piloto_consciente']; }
            else if (acertos === 9) { patenteNome = "PILOTO TÉCNICO"; patenteImg = ASSETS_PATH.patentes['Piloto_tecnico']; }
            else { patenteNome = "INSTRUTOR HONORÁRIO"; patenteImg = ASSETS_PATH.patentes['Instrutor_honorario']; }
        }

        if (!aprovadoNoBloco) {
            feedbackIcon.src = ASSETS_PATH.patentes['Recruta'];
            document.getElementById('feedback-title').innerText = "BLOCO FALHOU";
            document.getElementById('feedback-title').style.color = "#ff4444";
            document.getElementById('feedback-msg').innerHTML = 
                `Você acertou ${acertos}/10.<br>Mínimo necessário: 7.<br>Tente este bloco novamente.`;
            
            this.createBtn(containerBtns, 'REINICIAR BLOCO', 'btn-primary', () => {
                GameState.vidas = 3; 
                GameState.acertosBloco = 0; GameState.errosBloco = 0;
                this.embaralharPerguntas(nivelAtualStr);
                GameState.perguntaIndex = 0; 
                modal.classList.add('hidden'); 
                this.salvarProgresso();
                this.iniciarNivel();
            });
            this.createBtn(containerBtns, 'TROCAR MOTO', 'btn-secondary', () => { modal.classList.add('hidden'); this.renderizarGaragem(); });

        } else {
            GameState.blocosConcluidos++; 
            
            if (GameState.blocosConcluidos >= CONFIG.blocosPorNivel) {
                if(typeof Fireworks !== 'undefined') Fireworks.start();
                
                feedbackIcon.src = ASSETS_PATH.trofeus[nivelAtualStr];
                feedbackIcon.classList.add('trophy-contour-glow');
                
                const desconto = CONFIG.descontos[nivelAtualStr];
                const chaveSeguranca = this.gerarChaveSeguranca(nivelAtualStr);

                document.getElementById('feedback-title').innerText = `NÍVEL ${nivelAtualStr.toUpperCase()} COMPLETO!`;
                document.getElementById('feedback-title').style.color = "#D4AF37";
                document.getElementById('feedback-msg').innerHTML = 
                    `Parabéns! Você completou 10 blocos!<br>
                    <strong>TROFÉU DESBLOQUEADO</strong><br>
                    Desconto: <span style="color:#D4AF37; font-size:18px">${desconto}% OFF</span>`;

                this.createBtn(containerBtns, 'ENVIAR COMPROVANTE (E-MAIL)', 'btn-primary', () => {
                    const subject = `Comprovante Wings - Nível ${nivelAtualStr}`;
                    const body = `Olá Wings!\n\nConcluí o nível ${nivelAtualStr} com sucesso.\nChave de Segurança: ${chaveSeguranca}\n\nSolicito meu desconto de ${desconto}%!`;
                    window.location.href = `mailto:${CONFIG.emailSuporte}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                });

                this.createBtn(containerBtns, 'COPIAR P/ INSTAGRAM', 'btn-secondary btn-insta', () => {
                    const textoInsta = `Concluí o nível ${nivelAtualStr} no App Wings! 🏆\nChave: ${chaveSeguranca}\nQuero meu desconto de ${desconto}%!`;
                    navigator.clipboard.writeText(textoInsta).then(() => {
                        alert("Texto copiado! Cole no Direct do Instagram.");
                        window.open(CONFIG.instagramUrl, '_blank');
                    });
                });
                
                if (GameState.nivelIndex < 2) {
                    this.createBtn(containerBtns, 'PRÓXIMO NÍVEL >>', 'btn-secondary', () => {
                        GameState.nivelIndex++;
                        GameState.blocosConcluidos = 0;
                        GameState.perguntaIndex = 0;
                        GameState.acertosBloco = 0; GameState.errosBloco = 0;
                        modal.classList.add('hidden');
                        this.salvarProgresso();
                        this.iniciarNivel();
                    });
                } else {
                    this.createBtn(containerBtns, 'ZERAR JOGO', 'btn-secondary', () => {
                        modal.classList.add('hidden');
                        this.iniciarJogoDoZero();
                    });
                }

            } else {
                feedbackIcon.src = patenteImg;
                document.getElementById('feedback-title').innerText = "BLOCO CONCLUÍDO";
                document.getElementById('feedback-title').style.color = "#2ecc71";
                document.getElementById('feedback-msg').innerHTML = 
                    `Bloco ${GameState.blocosConcluidos}/10 finalizado.<br>
                    Acertos: ${acertos}/10<br>
                    Patente: <strong>${patenteNome}</strong>`;
                
                this.createBtn(containerBtns, 'PRÓXIMO BLOCO', 'btn-primary', () => {
                    GameState.perguntaIndex = 0;
                    GameState.acertosBloco = 0; GameState.errosBloco = 0;
                    this.embaralharPerguntas(nivelAtualStr); 
                    modal.classList.add('hidden');
                    this.salvarProgresso();
                    this.iniciarNivel();
                });
            }
        }
    },

    createBtn(parent, text, cls, onClick) {
        const b = document.createElement('button');
        b.className = cls; b.innerText = text; b.onclick = onClick;
        parent.appendChild(b);
    },

    gerarChaveSeguranca(nivel) {
        const rand = Math.random().toString(36).substring(7).toUpperCase();
        return `WINGS-${nivel.toUpperCase()}-${rand}-${Date.now().toString().slice(-4)}`;
    },

    embaralharPerguntas(nivel) {
        if (!dbPerguntas || !dbPerguntas[nivel]) return;
        const arr = dbPerguntas[nivel];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    },

    salvarProgresso() { localStorage.setItem(CONFIG.saveKey, JSON.stringify(GameState)); },

    carregarProgresso() {
        const s = localStorage.getItem(CONFIG.saveKey);
        if (s) { try { Object.assign(GameState, JSON.parse(s)); if(GameState.vidas <= 0) GameState.vidas = 3; } catch(e){} }
    },

    proximaEtapa() {
        document.getElementById('modal-feedback').classList.add('hidden');
        GameState.perguntaIndex++;
        if (GameState.perguntaIndex >= CONFIG.perguntasPorBloco) {
            this.finalizarBloco();
        } else {
            this.iniciarNivel();
        }
    },

    loop() {
        requestAnimationFrame(() => this.loop());
        GameState.offsetY = (GameState.offsetY + CONFIG.velocidadeCenario) % canvas.height;
        const lFaixa = (canvas.width * 0.8) / 3;
        const targetX = (canvas.width / 2) + (GameState.faixaAtual - 1) * lFaixa;
        GameState.motoX += (targetX - GameState.motoX) * 0.1;

        GameState.obstaculos.forEach(obs => {
            obs.y += CONFIG.velocidadeObstaculo;
            const motoY = canvas.height * CONFIG.zonaSeguraY;
            if (!obs.colidiu && obs.faixa === GameState.faixaAtual) {
                if (obs.y + 60 > motoY + 20 && obs.y < motoY + 140) {
                    obs.colidiu = true;
                    GameState.explosionPos = { x: GameState.motoX, y: motoY + 60 };
                    this.triggerExplosion();
                }
            }
        });

        if (GameState.aguardandoConclusaoAnimacao && !GameState.explodindo) {
            const semObstaculos = GameState.obstaculos.every(o => o.y > canvas.height);
            if (semObstaculos) {
                GameState.aguardandoConclusaoAnimacao = false;
                if (GameState.vidas <= 0) this.finalizarBloco(false, true);
                else this.mostrarFeedbackModal();
            }
        }
        
        if(typeof Fireworks !== 'undefined') Fireworks.update();
        this.draw();
    },

    triggerExplosion() {
        const sfx = document.getElementById('sfx-lose');
        if(sfx) { sfx.currentTime = 0; sfx.play().catch(()=>{}); }
        GameState.explodindo = true; GameState.shaking = true;
        const boom = document.getElementById('explosion-effect');
        if (boom) {
            boom.style.left = GameState.explosionPos.x + 'px'; 
            boom.style.top = GameState.explosionPos.y + 'px';
            boom.src = ASSETS_PATH.explosaoGif + '?t=' + Date.now();
            boom.classList.remove('hidden');
        }
        document.getElementById('damage-overlay').style.opacity = "0.8";
        setTimeout(() => {
            if (boom) boom.classList.add('hidden');
            document.getElementById('damage-overlay').style.opacity = "0";
            GameState.shaking = false; GameState.explodindo = false;
        }, 800);
    },

    draw() {
        if(!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const W = canvas.width;
        const H = canvas.height;
        const imgGrama = imagesCache[ASSETS_PATH.grama];
        if (imgGrama) { ctx.drawImage(imgGrama, 0, GameState.offsetY - H, W, H); ctx.drawImage(imgGrama, 0, GameState.offsetY, W, H); }
        const larguraPista = W * 0.8;
        const xPista = (W - larguraPista) / 2;
        const imgPista = imagesCache[ASSETS_PATH.cenarios[GameState.nivelIndex]];
        if (imgPista) { ctx.drawImage(imgPista, xPista, GameState.offsetY - H, larguraPista, H); ctx.drawImage(imgPista, xPista, GameState.offsetY, larguraPista, H); }
        const larguraFaixa = larguraPista / 3;
        
        GameState.obstaculos.forEach(obs => {
            const img = imagesCache[obs.img];
            if (img && img.naturalWidth) {
                const ratio = img.naturalHeight / img.naturalWidth;
                const w = larguraFaixa * 0.85; const h = w * ratio; 
                const ox = xPista + (obs.faixa * larguraFaixa) + (larguraFaixa - w) / 2;
                ctx.drawImage(img, ox, obs.y, w, h);
            } else { 
                const ox = xPista + (obs.faixa * larguraFaixa) + (larguraFaixa/2) - 30;
                ctx.fillStyle = "red"; ctx.fillRect(ox, obs.y, 60, 60); 
            }
        });

        if (!GameState.explodindo) {
            let shakeX = 0, shakeY = 0;
            if (GameState.shaking) { shakeX = Math.random()*10 - 5; shakeY = Math.random()*10 - 5; }
            const motoImg = imagesCache[ASSETS_PATH.motos[GameState.motoSelecionada]];
            if (motoImg && motoImg.naturalWidth) {
                const ratio = motoImg.naturalHeight / motoImg.naturalWidth;
                const mw = 100; const mh = mw * ratio; 
                const my = H * CONFIG.zonaSeguraY;
                const mx = GameState.motoX - (mw/2) + shakeX;
                
                // SOMBRA
                ctx.save(); 
                ctx.translate(10, 20); 
                ctx.filter = "brightness(0) opacity(0.4)"; 
                ctx.drawImage(motoImg, mx, my+shakeY, mw, mh); 
                ctx.restore();
                
                ctx.drawImage(motoImg, mx, my+shakeY, mw, mh);
            }
        }
    }
};

window.onload = () => Game.init();