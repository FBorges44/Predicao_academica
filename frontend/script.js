// frontend/script.js
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// ── Modal de Upload ──────────────────────────────────────────────────────────
function setupUploadModal() {
    const openBtn = document.getElementById('openUploadModalBtn');
    const modal = document.getElementById('uploadModal');
    if (!openBtn || !modal) return;

    openBtn.onclick = () => modal.style.display = 'flex';
    document.querySelector('.close-button').onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    document.getElementById('uploadBtn').addEventListener('click', async () => {
        const fileInput = document.getElementById('jsonFile');
        const statusEl = document.getElementById('uploadStatus');

        if (fileInput.files.length === 0) {
            statusEl.textContent = 'Selecione um arquivo.';
            return;
        }

        const file = fileInput.files[0];
        const isCsv = file.name.endsWith('.csv');
        const endpoint = isCsv ? 'upload-csv' : 'upload-json';

        const formData = new FormData();
        formData.append('arquivo', file);
        statusEl.textContent = `⏳ Processando ${isCsv ? 'CSV' : 'JSON'}...`;

        try {
            const response = await fetch(`${API_BASE_URL}/alunos/${endpoint}/`, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.erro || `Erro ${response.status}`);

            let msg = '✅ ' + result.status;
            if (result.avisos && result.avisos.length > 0) {
                msg += ` (${result.avisos.length} aviso(s))`;
                console.warn('Avisos do upload:', result.avisos);
            }
            statusEl.textContent = msg;
            statusEl.style.color = 'green';

            setTimeout(() => {
                modal.style.display = 'none';
                fileInput.value = '';
                statusEl.textContent = '';
                carregarDashboard();
            }, 1500);

        } catch (error) {
            console.error('Falha no upload:', error);
            statusEl.textContent = '❌ ' + error.message;
            statusEl.style.color = 'red';
        }
    });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getProb(aluno) {
    return aluno.predicao?.probabilidade ?? 0;
}

function getNivel(prob) {
    if (prob >= 0.70) return 'alto';
    if (prob >= 0.40) return 'medio';
    return 'baixo';
}

// Monta string de detalhes independente do tipo de aluno (acadêmico ou socioeconômico)
function getDetalhes(aluno) {
    const d = aluno.dados_json || {};

    // Campos acadêmicos
    if (d.frequencia_media != null || d.rendimento_medio != null) {
        const freq  = d.frequencia_media  != null ? `Freq: ${parseFloat(d.frequencia_media).toFixed(1)}%` : null;
        const rend  = d.rendimento_medio  != null ? `Rend: ${parseFloat(d.rendimento_medio).toFixed(1)}` : null;
        const repro = d.disciplinas_reprovadas != null ? `Reprov: ${d.disciplinas_reprovadas}` : null;
        return [freq, rend, repro].filter(Boolean).join(' | ') || '—';
    }

    // Campos socioeconômicos (formulário Adicionar Aluno)
    const trabalho = {
        'so_estuda': 'Só estuda',
        'estuda_trabalha': 'Trabalha parcial',
        'estuda_trabalha_integral': 'Trabalha integral',
    }[d.situacao_trabalho] || d.situacao_trabalho || '—';

    const renda = {
        'ate_1sm': '≤1SM',
        '1_3sm': '1-3SM',
        '3_5sm': '3-5SM',
        'acima_5sm': '>5SM',
    }[d.renda_familiar] || d.renda_familiar || '—';

    const escola = d.escola_tipo === 'publica' ? 'Pública' : d.escola_tipo === 'privada' ? 'Privada' : '—';

    return `Renda: ${renda} | ${trabalho} | ${escola}`;
}

// ── Carrega alunos e preenche tabela + KPIs ──────────────────────────────────
async function carregarDashboard() {
    const tbody = document.getElementById('studentTable');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Carregando...</td></tr>`;

    try {
        const response = await fetch(`${API_BASE_URL}/alunos/`);
        if (!response.ok) throw new Error('Servidor offline ou erro na API.');
        const alunos = await response.json();

        const total    = alunos.length;
        const emRisco  = alunos.filter(a => getProb(a) >= 0.50).length;
        const probMedia = total > 0
            ? alunos.reduce((s, a) => s + getProb(a), 0) / total
            : 0;
        const taxaPermanencia = total > 0 ? ((total - emRisco) / total) * 100 : 0;

        const el = (id) => document.getElementById(id);
        if (el('avg-risk'))       el('avg-risk').textContent       = `${(probMedia * 100).toFixed(1)}%`;
        if (el('students-risk'))  el('students-risk').textContent  = emRisco;
        if (el('retention-rate')) el('retention-rate').textContent = `${taxaPermanencia.toFixed(1)}%`;
        if (el('alerts-count'))   el('alerts-count').textContent   = emRisco;

        if (total === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">
                Nenhum aluno. Use "Carregar Dados" ou "Adicionar Aluno" para começar.
            </td></tr>`;
            atualizarGraficos([]);
            return;
        }

        // Ordena do maior para o menor risco
        alunos.sort((a, b) => getProb(b) - getProb(a));
        tbody.innerHTML = '';

        alunos.forEach(aluno => {
            const prob  = getProb(aluno);
            const pct   = (prob * 100).toFixed(1);
            const nivel = getNivel(prob);
            const cor   = nivel === 'alto' ? 'var(--risk-high)'
                        : nivel === 'medio' ? '#d97706'
                        : 'var(--risk-low)';
            const label = nivel === 'alto' ? 'Alto Risco'
                        : nivel === 'medio' ? 'Risco Médio'
                        : 'Baixo Risco';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${aluno.nome} <span style="color:#9ca3af;font-size:0.85em">(${aluno.matricula})</span></td>
                <td><strong>${pct}%</strong></td>
                <td style="color:${cor}; font-weight:bold;">${label}</td>
            `;
            tbody.appendChild(row);
        });

        // ── Alertas ──────────────────────────────────────────────────────
        const alertasDiv = document.getElementById('alertsList');
        if (alertasDiv) {
            const alunosRisco = alunos.filter(a => getProb(a) >= 0.70);
            alertasDiv.innerHTML = alunosRisco.length === 0
                ? '<p>Nenhum aluno em risco crítico no momento.</p>'
                : alunosRisco.slice(0, 5).map(a => `
                    <div class="alert-item">
                        <strong>⚠️ ${a.nome}</strong>
                        — ${(getProb(a) * 100).toFixed(1)}% de probabilidade de evasão
                        <br><small style="color:#9ca3af">${getDetalhes(a)}</small>
                    </div>`).join('');
        }

        atualizarGraficos(alunos);

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">
            Erro ao conectar com o servidor. Verifique se o Django está rodando.
        </td></tr>`;
    }
}

// ── Gráficos ─────────────────────────────────────────────────────────────────
let lineChartInstance = null;
let donutChartInstance = null;

function atualizarGraficos(alunos) {
    const alto  = alunos.filter(a => getProb(a) >= 0.70).length;
    const medio = alunos.filter(a => { const p = getProb(a); return p >= 0.40 && p < 0.70; }).length;
    const baixo = alunos.filter(a => getProb(a) < 0.40).length;

    const donutCtx = document.getElementById('donutChart');
    if (donutCtx) {
        if (donutChartInstance) donutChartInstance.destroy();
        donutChartInstance = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: ['Alto Risco (≥70%)', 'Médio Risco (40-70%)', 'Baixo Risco (<40%)'],
                datasets: [{
                    data: [alto, medio, baixo],
                    backgroundColor: ['#ef4444', '#facc15', '#34d399'],
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    const faixas = ['0–20%', '20–40%', '40–60%', '60–80%', '80–100%'];
    const contagens = [0, 0, 0, 0, 0];
    alunos.forEach(a => {
        const p = getProb(a) * 100;
        if      (p < 20) contagens[0]++;
        else if (p < 40) contagens[1]++;
        else if (p < 60) contagens[2]++;
        else if (p < 80) contagens[3]++;
        else             contagens[4]++;
    });

    const lineCtx = document.getElementById('lineChart');
    if (lineCtx) {
        if (lineChartInstance) lineChartInstance.destroy();
        lineChartInstance = new Chart(lineCtx, {
            type: 'bar',
            data: {
                labels: faixas,
                datasets: [{
                    label: 'Quantidade de alunos',
                    data: contagens,
                    backgroundColor: ['#34d399', '#86efac', '#facc15', '#fb923c', '#ef4444'],
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setupUploadModal();
    carregarDashboard();
});