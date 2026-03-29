// frontend/adicionar_aluno.js
const API = 'http://127.0.0.1:8000/api';
const el  = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    el('addForm').addEventListener('submit', async e => {
        e.preventDefault();
        showStatus('⏳ Salvando e processando predição...', 'loading');
        el('predResult').classList.remove('show', 'high', 'low', 'medium');

        // ── Lê todos os campos do formulário ──────────────────────────────
        const matricula = el('matricula').value.trim();
        const nome      = el('nome').value.trim();

        if (!matricula || !nome) {
            showStatus('❌ Matrícula e Nome são obrigatórios.', 'error');
            return;
        }

        // dados_json contém todos os campos usados pelo modelo e pela exibição
        const dados_json = {
            matricula,
            nome,
            sexo:              el('sexo').value,
            idade:             parseInt(el('idade').value) || 18,
            renda_familiar:    el('renda_familiar').value,
            estado_civil:      el('estado_civil').value,
            tem_filhos:        parseInt(el('tem_filhos').value),
            situacao_trabalho: el('situacao_trabalho').value,
            escola_tipo:       el('escola_tipo').value,
            bairro:            el('bairro').value.trim(),
            distancia:         el('distancia').value,
            transporte:        el('transporte').value,
        };

        // Payload que o backend espera em POST /api/alunos/
        const payload = {
            matricula,
            nome,
            dados_json,
        };

        try {
            const res = await fetch(`${API}/alunos/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.erro || `Erro ${res.status}`);
            }

            showStatus('✅ Aluno salvo com sucesso! Ele já aparece na Visão Geral e Alunos em Risco.', 'success');
            mostrarPredicao(data, dados_json);
            el('addForm').reset();

        } catch (err) {
            showStatus(`❌ ${err.message}`, 'error');
        }
    });
});

// ── Exibe o resultado da predição ────────────────────────────────────────────
function mostrarPredicao(data, dados) {
    const pred = data.predicao;
    if (!pred) return;

    const p      = pred.probabilidade;
    const pct    = (p * 100).toFixed(1);
    const nivel  = p >= 0.70 ? 'high' : p >= 0.40 ? 'medium' : 'low';
    const icone  = p >= 0.70 ? '🔴' : p >= 0.40 ? '🟡' : '🟢';
    const rotulo = p >= 0.70 ? 'Alto Risco de Evasão'
                 : p >= 0.40 ? 'Risco Moderado de Evasão'
                 : 'Baixo Risco de Evasão';
    const corMap = {
        high:   'var(--risk-high)',
        medium: 'var(--risk-med)',
        low:    'var(--risk-low)',
    };

    el('predIcon').textContent  = icone;
    el('predLabel').textContent = rotulo;
    el('predLabel').style.color = corMap[nivel];
    el('predProb').textContent  = `Probabilidade estimada: ${pct}%`;

    const fatores = gerarFatores(dados, p);
    el('predFactors').innerHTML = fatores.map(f =>
        `<div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:4px">
           <span style="color:${f.cor};font-weight:bold">${f.icone}</span> ${f.texto}
         </div>`
    ).join('');

    const box = el('predResult');
    box.className = `prediction-result show ${nivel}`;
}

// ── Gera lista de fatores que influenciaram a predição ───────────────────────
function gerarFatores(d, prob) {
    const fatores = [];

    // Fatores de risco
    if (d.escola_tipo === 'publica')
        fatores.push({ icone: '↑', cor: 'var(--risk-high)', texto: 'Escola pública de origem' });
    if (d.situacao_trabalho === 'estuda_trabalha_integral')
        fatores.push({ icone: '↑', cor: 'var(--risk-high)', texto: 'Trabalha em tempo integral' });
    else if (d.situacao_trabalho === 'estuda_trabalha')
        fatores.push({ icone: '↑', cor: 'var(--risk-med)',  texto: 'Trabalha e estuda' });
    if (d.renda_familiar === 'ate_1sm')
        fatores.push({ icone: '↑', cor: 'var(--risk-high)', texto: 'Renda familiar até 1 salário mínimo' });
    else if (d.renda_familiar === '1_3sm')
        fatores.push({ icone: '↑', cor: 'var(--risk-med)',  texto: 'Renda familiar entre 1 e 3 salários' });
    if (d.distancia === 'acima_30km')
        fatores.push({ icone: '↑', cor: 'var(--risk-high)', texto: 'Distância acima de 30 km da faculdade' });
    else if (d.distancia === '15_30km')
        fatores.push({ icone: '↑', cor: 'var(--risk-med)',  texto: 'Distância entre 15 e 30 km' });
    if (d.transporte === 'publico')
        fatores.push({ icone: '↑', cor: 'var(--risk-med)',  texto: 'Depende de transporte público' });
    if (d.tem_filhos === 1)
        fatores.push({ icone: '↑', cor: 'var(--risk-med)',  texto: 'Possui filhos' });
    if (d.estado_civil === 'casado')
        fatores.push({ icone: '↑', cor: 'var(--risk-med)',  texto: 'Casado(a)' });
    if (d.idade >= 25)
        fatores.push({ icone: '↑', cor: 'var(--risk-med)',  texto: `Ingressou com ${d.idade} anos` });

    // Fatores protetores
    if (d.escola_tipo === 'privada')
        fatores.push({ icone: '↓', cor: 'var(--risk-low)', texto: 'Escola privada de origem' });
    if (d.situacao_trabalho === 'so_estuda')
        fatores.push({ icone: '↓', cor: 'var(--risk-low)', texto: 'Dedicação exclusiva aos estudos' });
    if (d.renda_familiar === 'acima_5sm')
        fatores.push({ icone: '↓', cor: 'var(--risk-low)', texto: 'Renda familiar acima de 5 salários' });
    if (d.transporte === 'proprio')
        fatores.push({ icone: '↓', cor: 'var(--risk-low)', texto: 'Possui transporte próprio' });
    if (d.distancia === 'ate_5km')
        fatores.push({ icone: '↓', cor: 'var(--risk-low)', texto: 'Mora próximo à faculdade' });

    return fatores.slice(0, 6);
}

// ── Exibe mensagem de status ──────────────────────────────────────────────────
function showStatus(msg, type) {
    const s = el('statusMsg');
    s.textContent = msg;
    s.className   = `status-msg show ${type}`;
}