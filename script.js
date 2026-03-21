// ==========================================
// ⚽ CALCULADORA DE PROBABILIDADES FUTEBOL
// ==========================================

const MAX_GOALS = 6;
let graficoPlacaresInstancia = null;

// ===============================
// HELPERS
// ===============================
function media(arr) {
    const valid = arr.filter(v => !isNaN(v));
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function pegarValores(classe) {
    return [...document.querySelectorAll("." + classe)]
        .map(e => (e.value === "" ? NaN : Number(e.value)))
        .filter(v => !isNaN(v));
}

function fatorial(n) {
    if (n === 0) return 1;
    let r = 1;
    for (let i = 1; i <= n; i++) r *= i;
    return r;
}

function poisson(k, lambda) {
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / fatorial(k);
}

function probOdd(odd) {
    return odd > 0 ? (1 / odd) * 100 : 0;
}

function classificarTendencia(prob) {
    if (prob >= 65) return "🔥 MUITO FORTE";
    if (prob >= 55) return "⚡ BOA PROBABILIDADE";
    if (prob >= 45) return "⚠️ MODERADO";
    return "❌ BAIXA PROBABILIDADE";
}

// ===============================
// CORE: CALCULAR
// ===============================

function calcular() {
    const golsA = pegarValores("golsA");
    const sofridosA = pegarValores("golsSofridosA");
    const golsB = pegarValores("golsB");
    const sofridosB = pegarValores("golsSofridosB");
    const h2hA = pegarValores("h2hA");
    const h2hB = pegarValores("h2hB");

    const ataqueA = media(golsA), defesaA = media(sofridosA);
    const ataqueB = media(golsB), defesaB = media(sofridosB);
    const hA = media(h2hA), hB = media(h2hB);

    let lambdaA = (ataqueA + defesaB + hA) / 3;
    let lambdaB = (ataqueB + defesaA + hB) / 3;

    // Captura de Inputs do Mercado
    const oddCasa = Number(document.getElementById("mercadoCasa").value);
    const oddFora = Number(document.getElementById("mercadoVisitante").value);
    const bancaTotal = Number(document.getElementById("valorApostaTotal")?.value) || 10;

    const oddsMercado = {
        empate: Number(document.getElementById("mercadoEmpate").value),
        over: Number(document.getElementById("mercadoOver").value),
        btts: Number(document.getElementById("mercadoBTTS").value)
    };

    // Ajuste de Eficiência de Mercado
    if (oddCasa && oddFora) {
        const pMercadoA = probOdd(oddCasa);
        const pMercadoB = probOdd(oddFora);
        const total = pMercadoA + pMercadoB;
        const pesoA = pMercadoA / total;
        lambdaA *= (1 + (pesoA - 0.5) * 0.25);
        lambdaB *= (1 - (pesoA - 0.5) * 0.15);
    }

    let pWinA = 0, pDraw = 0, pWinB = 0, pOver25 = 0, pBTTS = 0;
    let placares = [];

    // Distribuição de Poisson
    for (let i = 0; i <= MAX_GOALS; i++) {
        for (let j = 0; j <= MAX_GOALS; j++) {
            const pP = poisson(i, lambdaA) * poisson(j, lambdaB);
            placares.push({ p: `${i}x${j}`, val: pP * 100 });
            if (i > j) pWinA += pP; else if (i === j) pDraw += pP; else pWinB += pP;
            if (i + j > 2.5) pOver25 += pP;
            if (i > 0 && j > 0) pBTTS += pP;
        }
    }

    const resA = pWinA * 100, resB = pWinB * 100, resEmp = pDraw * 100;
    const resOver = pOver25 * 100, resUnder = 100 - resOver, resBTTS = pBTTS * 100;

    placares.sort((a, b) => b.val - a.val);

    // Renderização dos Resultados Principais
    document.getElementById("resultado").innerHTML = `
        <div class="res-section">
            <h3 style="color: #2196F3;">🛡️ ANÁLISE DO TIME A (CASA)</h3>
            Chance de Vitória: <b>${resA.toFixed(1)}%</b> [${classificarTendencia(resA)}]<br>
            Chance de Derrota: <b>${resB.toFixed(1)}%</b><br>
            Chance de Empate: <b>${resEmp.toFixed(1)}%</b>
        </div>
        <div class="res-section">
            <h3 style="color: #FF9800;">⚽ MERCADO DE GOLS</h3>
            Over 2.5: <b>${resOver.toFixed(1)}%</b> [${classificarTendencia(resOver)}]<br>
            Under 2.5: <b>${resUnder.toFixed(1)}%</b> [${classificarTendencia(resUnder)}]<br>
            <b>BTTS SIM: ${resBTTS.toFixed(1)}%</b> [${classificarTendencia(resBTTS)}]
        </div>
        <div class="res-section">
            <h3 style="color: #4CAF50;">🎯 PLACARES MAIS PROVÁVEIS</h3>
            ${placares.slice(0, 5).map(p => `• ${p.p} ➔ <b>${p.val.toFixed(1)}%</b>`).join('<br>')}
        </div>
    `;

    // ==========================================
    // LÓGICA DE COBERTURA DINÂMICA PRO
    // ==========================================
    const divCobertura = document.getElementById("cobertura");
    divCobertura.style.display = "block";

    // 1. Scanner: Seleciona o melhor mercado para proteção baseado na probabilidade
    let melhorHedge = { nome: "Empate", odd: oddsMercado.empate, prob: resEmp };

    if (resOver > resEmp && resOver > 50 && oddsMercado.over > 1) {
        melhorHedge = { nome: "Over 2.5 Gols", odd: oddsMercado.over, prob: resOver };
    } else if (resBTTS > resEmp && resBTTS > 50 && oddsMercado.btts > 1) {
        melhorHedge = { nome: "BTTS Sim", odd: oddsMercado.btts, prob: resBTTS };
    }

    // 2. Cálculo de Stake e Viabilidade
    if (oddCasa > 1 && melhorHedge.odd > 1) {
        const stakeHedge = (bancaTotal / melhorHedge.odd).toFixed(2);
        const stakePrincipal = (bancaTotal - stakeHedge).toFixed(2);
        const retornoPrincipal = (stakePrincipal * oddCasa).toFixed(2);
        const retornoHedge = (stakeHedge * melhorHedge.odd).toFixed(2);
        const lucroSeVencer = (retornoPrincipal - bancaTotal).toFixed(2);

        // 3. Índice de Confiança
        const confianca = (resA * 0.7 + (100 - resB) * 0.3).toFixed(0);
        let corConfianca = confianca > 60 ? "#2e7d32" : (confianca > 45 ? "#f9a825" : "#d32f2f");

        // Cores Dinâmicas para o Box de Resultado
        const corFundoPositivo = "#e8f5e9"; // Verde bem clarinho
        const corTextoPositivo = "#2e7d32"; // Verde escuro
        const corFundoNegativo = "#28df6e"; // Vermelho bem clarinho
        const corTextoNegativo = "#c62828"; // Vermelho escuro

        const estiloBox = lucroSeVencer > 0
            ? `background: ${corFundoPositivo}; color: ${corTextoPositivo}; border: 1px solid #c0d31b;`
            : `background: ${corFundoNegativo}; color: ${corTextoNegativo}; border: 1px solid #d1d420;`;

        document.getElementById("coberturaTexto").innerHTML = `
            <div style="font-family: sans-serif; line-height: 1.4;">
                <div style="float:right; text-align:center; padding: 5px; border: 1px solid #71da40; border-radius: 5px; background: #fff;">
                    <span style="font-size:0.7em; color:#666; display:block;">CONFIANÇA</span>
                    <b style="font-size:1.3em; color:${corConfianca};">${confianca}%</b>
                </div>
                
                <h4 style="margin:0 0 10px 0; color: #fff; font-size: 1.1em;">🛡️ Hedge: ${melhorHedge.nome}</h4>
                
                <p style="margin:5px 0; color: #fff;">🎯 <b>Principal:</b> R$ ${stakePrincipal} <span style="font-size:0.9em;">(Vitória)</span></p>
                <p style="margin:5px 0; color: #fff;">🛡️ <b>Proteção:</b> R$ ${stakeHedge} <span style="font-size:0.9em;">(${melhorHedge.nome})</span></p>
                
                <div style="margin-top:12px; padding:12px; border-radius:6px; ${estiloBox}">
                    <b style="font-size: 1em; display: block; margin-bottom: 4px;">
                        ${lucroSeVencer > 0 ? '✅ LUCRO ESTIMADO: R$ ' + lucroSeVencer : '⚠️ ALERTA DE PREJUÍZO: R$ ' + Math.abs(lucroSeVencer)}
                    </b>
                    <span style="font-size: 0.85em; opacity: 0.9;">
                        Se der apenas a proteção, você recupera <b>R$ ${retornoHedge}</b> (Banca Protegida).
                    </span>
                </div>
            </div>
        `;
    } else {
        document.getElementById("coberturaTexto").innerHTML = "<div style='color:#666; padding:10px;'>⚠️ Insira as Odds e a Stake para calcular o Hedge.</div>";
    }


    renderizarGrafico(placares.slice(0, 6));
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById('graficoPlacares').getContext('2d');
    if (graficoPlacaresInstancia) graficoPlacaresInstancia.destroy();
    graficoPlacaresInstancia = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dados.map(d => d.p),
            datasets: [{
                label: 'Probabilidade (%)',
                data: dados.map(d => d.val.toFixed(1)),
                backgroundColor: '#4CAF50'
            }]
        },
        options: { responsive: true }
    });
}

function preencherExemplo() {
    // Dados Realistas: Time A (Favorito em Casa) vs Time B (Visitante equilibrado)
    const gA = [2, 1, 3, 0, 2]; // Gols Marcados Casa
    const sA = [0, 1, 1, 0, 1]; // Gols Sofridos Casa
    const gB = [1, 0, 2, 1, 0]; // Gols Marcados Fora
    const sB = [2, 1, 0, 2, 0]; // Gols Sofridos Fora
    const h2hA = [2, 1, 1, 3, 0]; // Confronto Direto (Time A)
    const h2hB = [0, 1, 0, 1, 0]; // Confronto Direto (Time B)

    // Preenchendo as tabelas de gols
    document.querySelectorAll(".golsA").forEach((e, i) => e.value = gA[i]);
    document.querySelectorAll(".golsSofridosA").forEach((e, i) => e.value = sA[i]);
    document.querySelectorAll(".golsB").forEach((e, i) => e.value = gB[i]);
    document.querySelectorAll(".golsSofridosB").forEach((e, i) => e.value = sB[i]);
    document.querySelectorAll(".h2hA").forEach((e, i) => e.value = h2hA[i]);
    document.querySelectorAll(".h2hB").forEach((e, i) => e.value = h2hB[i]);

    // Preenchendo TODOS os campos de mercado (Odds)
    document.getElementById("mercadoCasa").value = 1.85;
    document.getElementById("mercadoEmpate").value = 3.50;
    document.getElementById("mercadoVisitante").value = 4.20;
    document.getElementById("mercadoOver").value = 2.05;
    document.getElementById("mercadoUnder").value = 1.80;
    document.getElementById("mercadoBTTS").value = 1.95;

    // Valor da Aposta (Stake)
    const campoStake = document.getElementById("valorApostaTotal");
    if (campoStake) campoStake.value = 10;

    console.log("✅ Exemplo preenchido com sucesso!");
}


function limpar() {
    document.querySelectorAll("input").forEach(e => e.value = "");
    document.getElementById("resultado").innerHTML = "Aguardando dados...";
    document.getElementById("cobertura").style.display = "none";
    if (graficoPlacaresInstancia) graficoPlacaresInstancia.destroy();
}



