// ==========================================
// ⚽ CALCULADORA DE PROBABILIDADES FUTEBOL
// ==========================================

const MAX_GOALS = 6;

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

// Classificação focada no Time A e Gols
function classificarTendencia(prob, tipo) {
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

    // Médias Contextuais
    const ataqueA = media(golsA);
    const defesaA = media(sofridosA);
    const ataqueB = media(golsB);
    const defesaB = media(sofridosB);
    const hA = media(h2hA);
    const hB = media(h2hB);

    // λ (Lambda) - Expectativa Realista
    let lambdaA = (ataqueA + defesaB + hA) / 3;
    let lambdaB = (ataqueB + defesaA + hB) / 3;

    // Odds do Mercado para Ajuste
    const oddCasa = Number(document.getElementById("mercadoCasa").value);
    const oddFora = Number(document.getElementById("mercadoVisitante").value);

    if (oddCasa && oddFora) {
        const pMercadoA = probOdd(oddCasa);
        const pMercadoB = probOdd(oddFora);
        const total = pMercadoA + pMercadoB;
        const pesoA = pMercadoA / total;

        // Ajuste fino baseado na percepção do mercado (Money Line)
        lambdaA *= (1 + (pesoA - 0.5) * 0.25);
        lambdaB *= (1 - (pesoA - 0.5) * 0.15);
    }

    let pWinA = 0, pDraw = 0, pWinB = 0, pOver25 = 0, pBTTS = 0;
    let placares = [];

    for (let i = 0; i <= MAX_GOALS; i++) {
        const probA = poisson(i, lambdaA);
        for (let j = 0; j <= MAX_GOALS; j++) {
            const probB = poisson(j, lambdaB);
            const pP = probA * probB;

            placares.push({ p: `${i}x${j}`, val: pP * 100 });

            if (i > j) pWinA += pP;
            else if (i === j) pDraw += pP;
            else pWinB += pP;

            if (i + j > 2.5) pOver25 += pP;
            if (i > 0 && j > 0) pBTTS += pP;
        }
    }

    const resA = pWinA * 100;
    const resB = pWinB * 100;
    const resEmp = pDraw * 100;
    const resOver = pOver25 * 100;
    const resUnder = 100 - resOver;
    const resBTTS = pBTTS * 100;

    // Ordenar placares
    placares.sort((a, b) => b.val - a.val);

    // Saída de Dados focada no seu pedido
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
}

// Funções Preencher e Limpar permanecem iguais
function preencherExemplo() {
    const gA = [2, 3, 1, 4, 2]; const sA = [0, 1, 0, 1, 1];
    const gB = [0, 1, 0, 2, 0]; const sB = [3, 2, 4, 1, 2];
    const h2hA = [3, 2, 1, 2, 4]; const h2hB = [0, 1, 0, 1, 0];

    document.querySelectorAll(".golsA").forEach((e, i) => e.value = gA[i]);
    document.querySelectorAll(".golsSofridosA").forEach((e, i) => e.value = sA[i]);
    document.querySelectorAll(".golsB").forEach((e, i) => e.value = gB[i]);
    document.querySelectorAll(".golsSofridosB").forEach((e, i) => e.value = sB[i]);
    document.querySelectorAll(".h2hA").forEach((e, i) => e.value = h2hA[i]);
    document.querySelectorAll(".h2hB").forEach((e, i) => e.value = h2hB[i]);

    document.getElementById("mercadoCasa").value = 1.45;
    document.getElementById("mercadoEmpate").value = 4.20;
    document.getElementById("mercadoVisitante").value = 6.50;
    document.getElementById("mercadoOver").value = 1.70;
    document.getElementById("mercadoUnder").value = 2.15;
    document.getElementById("mercadoBTTS").value = 2.10;
}

function limpar() {
    document.querySelectorAll("input").forEach(e => e.value = "");
    document.getElementById("resultado").innerHTML = "Aguardando dados...";
}


