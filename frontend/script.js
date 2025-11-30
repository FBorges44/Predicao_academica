// Arquivo: frontend/script.js (Versão API / Banco de Dados)
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Configuração do Modal de Upload (para arquivos JSON)
function setupUploadModal() {
    const openBtn = document.getElementById('openUploadModalBtn');
    const modal = document.getElementById('uploadModal');
    if (!openBtn || !modal) return;

    openBtn.onclick = () => modal.style.display = 'flex';
    const closeBtn = document.querySelector('.close-button');
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target == modal) modal.style.display = 'none'; };

    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const fileInput = document.getElementById('jsonFile');
            const statusEl = document.getElementById('uploadStatus');
            if (fileInput.files.length === 0) {
                statusEl.textContent = 'Selecione um arquivo.'; return;
            }
            
            const formData = new FormData();
            formData.append('arquivo', fileInput.files[0]);
            statusEl.textContent = 'Processando...';

            try {
                const response = await fetch(`${API_BASE_URL}/alunos/upload-json/`, {
                    method: 'POST', body: formData
                });
                if (!response.ok) throw new Error('Erro no upload');
                
                statusEl.textContent = 'Sucesso!';
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                statusEl.textContent = 'Falha no upload.';
            }
        });
    }
}

// Busca os alunos do Banco de Dados e preenche a tabela
async function carregarAlunosDoBanco() {
    const tbody = document.getElementById('studentTable');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center;">Buscando dados no servidor...</td></tr>`;

    try {
        const response = await fetch(`${API_BASE_URL}/alunos/`);
        const alunos = await response.json();

        if (alunos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center;">Nenhum aluno no banco de dados.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        // Ordena por maior probabilidade de evasão
        alunos.sort((a, b) => (b.predicao?.probabilidade || 0) - (a.predicao?.probabilidade || 0));

        alunos.forEach(aluno => {
            const row = document.createElement('tr');
            const prob = aluno.predicao ? (aluno.predicao.probabilidade * 100).toFixed(1) : '0.0';
            const risco = aluno.predicao?.risco_evasao ? 'Alto Risco' : 'Baixo Risco';
            const cor = aluno.predicao?.risco_evasao ? 'red' : 'green';

            row.innerHTML = `
                <td>${aluno.nome} (${aluno.matricula})</td>
                <td><strong>${prob}%</strong></td>
                <td style="color: ${cor}; font-weight: bold;">${risco}</td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Erro API:", error);
        tbody.innerHTML = `<tr><td colspan="3">Erro ao conectar com o banco de dados.</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupUploadModal();
    carregarAlunosDoBanco();
});