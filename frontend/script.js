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

            if (!response.ok) {
                throw new Error(result.erro || `Erro ${response.status}`);
            }

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
                carregarDashboard();  // Atualiza tudo na página
            }, 1500);

        } catch (error) {
            console.error('Falha no upload:', error);
            statusEl.textContent = '❌ ' + error.message;
            statusEl.style.color = 'red';
        }
    });
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

        // ── KPIs ────────────────────────────────────────────────────────────
        const total = alunos.length;
        const emRisco = alunos.filter(a => a.predicao?.risco_evasao).length;
        const probMedia = total > 0
            ? alunos.reduce((s, a) => s + (a.predicao?.probabilidade || 0), 0) / total
            : 0;
        const taxaPermancencia = total > 0 ? ((total - emRisco) / total) * 100 : 0;

        const el = (id) => document.getElementById(id);
        if (el('avg-risk'))        el('avg-risk').textContent        = `${(probMedia * 100).toFixed(1)}%`;
        if (el('students-risk'))   el('students-risk').textContent   = emRisco;
        if (el('retention-rate'))  el('retention-rate').textContent  = `${taxaPermancencia.toFixed(1)}%`;
        if (el('alerts-count'))    el('alerts-count').textContent    = emRisco;

        // ── Tabela ───────────────────────────────────────────────────────────
        if (total === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Nenhum aluno. Use "Carregar Dados" para importar um CSV.</td></tr>`;
            atualizarGraficos([]);
            return;
        }

        alunos.sort((a, b) => (b.predicao?.probabilidade || 0) - (a.predicao?.probabilidade || 0));
        tbody.innerHTML = '';

        alunos.forEach(aluno => {
            const prob = ((aluno.predicao?.probabilidade || 0) * 100).toFixed(1);
            const risco = aluno.predicao?.risco_evasao;
            const cor = risco ? 'var(--risk-high)' : 'var(--risk-low)';
            const label = risco ? 'Alto Risco' : 'Baixo Risco';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${aluno.nome} (${aluno.matricula})</td>
                <td><strong>${prob}%</strong></td>
                <td style="color:${cor}; font-weight:bold;">${label}</td>
            `;
            tbody.appendChild(row);
        });

        // ── Alertas ──────────────────────────────────────────────────────────
        const alertasDiv = document.getElementById('alertsList');
        if (alertasDiv) {
            const alunosRisco = alunos.filter(a => a.predicao?.risco_evasao);
            alertasDiv.innerHTML = alunosRisco.length === 0
                ? '<p>Nenhum aluno em risco crítico no momento.</p>'
                : alunosRisco.slice(0, 5).map(a => `
                    <div class="alert-item">
                        <strong>⚠️ ${a.nome}</strong> — ${((a.predicao.probabilidade) * 100).toFixed(1)}% de probabilidade de evasão
                    </div>`).join('');
        }

        atualizarGraficos(alunos);

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Erro ao conectar com o servidor.</td></tr>`;
    }
}

// ── Gráficos ─────────────────────────────────────────────────────────────────
let lineChartInstance = null;
let donutChartInstance = null;

function atualizarGraficos(alunos) {
    // Donut — distribuição de risco
    const alto  = alunos.filter(a => (a.predicao?.probabilidade || 0) >= 0.70).length;
    const medio = alunos.filter(a => { const p = a.predicao?.probabilidade || 0; return p >= 0.40 && p < 0.70; }).length;
    const baixo = alunos.filter(a => (a.predicao?.probabilidade || 0) < 0.40).length;

    const donutCtx = document.getElementById('donutChart');
    if (donutCtx) {
        if (donutChartInstance) donutChartInstance.destroy();
        donutChartInstance = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: ['Alto Risco', 'Médio Risco', 'Baixo Risco'],
                datasets: [{
                    data: [alto, medio, baixo],
                    backgroundColor: ['#ef4444', '#facc15', '#34d399'],
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }

    // Line — distribuição de probabilidades em faixas
    const faixas = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'];
    const contagens = [0, 0, 0, 0, 0];
    alunos.forEach(a => {
        const p = (a.predicao?.probabilidade || 0) * 100;
        if (p < 20) contagens[0]++;
        else if (p < 40) contagens[1]++;
        else if (p < 60) contagens[2]++;
        else if (p < 80) contagens[3]++;
        else contagens[4]++;
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