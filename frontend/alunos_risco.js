// frontend/alunos_risco.js
const API_BASE_URL = 'http://127.0.0.1:8000/api';

async function fetchRiskData() {
    const tbody = document.getElementById('riskStudentTable');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Carregando dados...</td></tr>`;

    try {
        const response = await fetch(`${API_BASE_URL}/alunos/`);
        if (!response.ok) throw new Error('Falha ao carregar dados do backend.');

        const students = await response.json();

        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Nenhum aluno encontrado.</td></tr>`;
            return;
        }

        students.sort((a, b) => (b.predicao?.probabilidade || 0) - (a.predicao?.probabilidade || 0));
        tbody.innerHTML = '';

        students.forEach(student => {
            const probability = (student.predicao?.probabilidade || 0) * 100;
            let riskLevel, riskClass;

            if (probability >= 70) {
                riskLevel = 'Alto'; riskClass = 'status-high';
            } else if (probability >= 40) {
                riskLevel = 'Médio'; riskClass = 'status-medium';
            } else {
                riskLevel = 'Baixo'; riskClass = 'status-low';
            }

            const d = student.dados_json || {};
            const details = `Freq: ${d.frequencia_media ?? 'N/A'}% / Rend: ${d.rendimento_medio ?? 'N/A'} / Reprov: ${d.disciplinas_reprovadas ?? 'N/A'}`;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.nome} (${student.matricula})</td>
                <td><strong>${probability.toFixed(1)}%</strong></td>
                <td><span class="status-badge ${riskClass}">${riskLevel}</span></td>
                <td>${details}</td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Erro:", error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Erro ao carregar. Verifique se o servidor está rodando.</td></tr>`;
    }
}

function setupUploadModal() {
    const modal = document.getElementById('uploadModal');
    const openBtn = document.getElementById('openUploadModalBtn');
    const closeBtn = document.querySelector('.close-button');
    const uploadBtn = document.getElementById('uploadBtn');

    if (!openBtn || !modal) return;

    openBtn.onclick = () => modal.style.display = 'flex';
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    uploadBtn.addEventListener('click', async () => {
        const fileInput = document.getElementById('jsonFile');
        const statusEl = document.getElementById('uploadStatus');
        if (fileInput.files.length === 0) { statusEl.textContent = 'Selecione um arquivo.'; return; }

        const formData = new FormData();
        formData.append('arquivo', fileInput.files[0]);
        statusEl.textContent = 'Processando...';

        try {
            const response = await fetch(`${API_BASE_URL}/alunos/upload-json/`, { method: 'POST', body: formData });
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