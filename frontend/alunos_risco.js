// frontend/alunos_risco.js
const API_BASE_URL = 'http://127.0.0.1:8000/api';

function getProb(aluno) {
    return aluno.predicao?.probabilidade ?? 0;
}

function getDetalhes(aluno) {
    const d = aluno.dados_json || {};

    // Campos acadêmicos (upload CSV)
    if (d.frequencia_media != null || d.rendimento_medio != null) {
        const freq  = d.frequencia_media  != null ? `Freq: ${parseFloat(d.frequencia_media).toFixed(1)}%` : null;
        const rend  = d.rendimento_medio  != null ? `Rend: ${parseFloat(d.rendimento_medio).toFixed(1)}` : null;
        const repro = d.disciplinas_reprovadas != null ? `Reprov: ${d.disciplinas_reprovadas}` : null;
        return [freq, rend, repro].filter(Boolean).join(' / ') || '—';
    }

    // Campos socioeconômicos (formulário Adicionar Aluno)
    const trabalho = {
        'so_estuda': 'Só estuda',
        'estuda_trabalha': 'Trabalha parcial',
        'estuda_trabalha_integral': 'Trabalha integral',
    }[d.situacao_trabalho] || d.situacao_trabalho || '—';

    const renda = {
        'ate_1sm': '≤1SM',
        '1_3sm': '1–3SM',
        '3_5sm': '3–5SM',
        'acima_5sm': '>5SM',
    }[d.renda_familiar] || d.renda_familiar || '—';

    const escola = d.escola_tipo === 'publica' ? 'Pública'
                 : d.escola_tipo === 'privada'  ? 'Privada' : '—';

    const distancia = {
        'ate_5km':    '≤5km',
        '5_15km':     '5–15km',
        '15_30km':    '15–30km',
        'acima_30km': '>30km',
    }[d.distancia] || d.distancia || '—';

    return `Renda: ${renda} | ${trabalho} | ${escola} | Dist: ${distancia}`;
}

async function fetchRiskData() {
    const tbody = document.getElementById('riskStudentTable');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Carregando dados...</td></tr>`;

    try {
        const response = await fetch(`${API_BASE_URL}/alunos/`);
        if (!response.ok) throw new Error('Falha ao carregar dados do backend.');

        const students = await response.json();

        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">
                Nenhum aluno encontrado. Adicione alunos pelo formulário ou faça upload de um arquivo.
            </td></tr>`;
            return;
        }

        // Ordena do maior para o menor risco
        students.sort((a, b) => getProb(b) - getProb(a));
        tbody.innerHTML = '';

        students.forEach(student => {
            const prob = getProb(student);
            const pct  = (prob * 100).toFixed(1);

            let riskLevel, riskClass;
            if (prob >= 0.70) {
                riskLevel = 'Alto';   riskClass = 'status-high';
            } else if (prob >= 0.40) {
                riskLevel = 'Médio';  riskClass = 'status-medium';
            } else {
                riskLevel = 'Baixo';  riskClass = 'status-low';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    ${student.nome}
                    <span style="color:#9ca3af;font-size:0.85em">(${student.matricula})</span>
                </td>
                <td><strong>${pct}%</strong></td>
                <td><span class="status-badge ${riskClass}">${riskLevel}</span></td>
                <td style="font-size:0.88em;color:#6b7280">${getDetalhes(student)}</td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Erro:", error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">
            Erro ao carregar. Verifique se o servidor Django está rodando.
        </td></tr>`;
    }
}

function setupUploadModal() {
    const modal   = document.getElementById('uploadModal');
    const openBtn = document.getElementById('openUploadModalBtn');
    const closeBtn = document.querySelector('.close-button');
    const uploadBtn = document.getElementById('uploadBtn');

    if (!openBtn || !modal) return;

    openBtn.onclick  = () => modal.style.display = 'flex';
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick   = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    uploadBtn.addEventListener('click', async () => {
        const fileInput = document.getElementById('jsonFile');
        const statusEl  = document.getElementById('uploadStatus');
        if (fileInput.files.length === 0) { statusEl.textContent = 'Selecione um arquivo.'; return; }

        const file    = fileInput.files[0];
        const isCsv   = file.name.endsWith('.csv');
        const endpoint = isCsv ? 'upload-csv' : 'upload-json';

        const formData = new FormData();
        formData.append('arquivo', file);
        statusEl.textContent = `⏳ Processando ${isCsv ? 'CSV' : 'JSON'}...`;

        try {
            const response = await fetch(`${API_BASE_URL}/alunos/${endpoint}/`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error('Erro no upload');
            const result = await response.json();
            statusEl.textContent = '✅ ' + result.status;
            setTimeout(() => { modal.style.display = 'none'; fetchRiskData(); }, 1500);
        } catch (error) {
            statusEl.textContent = '❌ Falha no upload.';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchRiskData();
    setupUploadModal();
});