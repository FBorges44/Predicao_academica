const API_BASE_URL = 'http://127.0.0.1:8000/api';

/**
 * Busca os dados dos alunos da API e popula a tabela de risco.
 */
async function fetchRiskData() {
    const tbody = document.getElementById('riskStudentTable');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Carregando dados...</td></tr>`;

    try {
        const response = await fetch(`${API_BASE_URL}/alunos/`);
        if (!response.ok) throw new Error('Falha ao carregar dados do backend.');
        
        const studentsFromAPI = await response.json();

        if (studentsFromAPI.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Nenhum aluno encontrado. Carregue um arquivo de dados.</td></tr>`;
            return;
        }

        // Ordena os alunos pela probabilidade de evasão (do maior para o menor)
        studentsFromAPI.sort((a, b) => (b.predicao?.probabilidade || 0) - (a.predicao?.probabilidade || 0));

        // Limpa a tabela antes de preencher
        tbody.innerHTML = '';

        studentsFromAPI.forEach(student => {
            const row = document.createElement('tr');
            const probability = student.predicao ? student.predicao.probabilidade * 100 : 0;
            
            let riskLevel = '';
            let riskClass = '';

            if (probability >= 70) {
                riskLevel = 'Alto';
                riskClass = 'status-high'; // Usa as classes do seu CSS
            } else if (probability >= 40) {
                riskLevel = 'Médio';
                riskClass = 'status-medium';
            } else {
                riskLevel = 'Baixo';
                riskClass = 'status-low';
            }
            
            const details = student.dados_json ? `
                Freq: ${student.dados_json.frequencia_media || 'N/A'}% / 
                Rend: ${student.dados_json.rendimento_medio || 'N/A'} / 
                Reprov: ${student.dados_json.disciplinas_reprovadas !== undefined ? student.dados_json.disciplinas_reprovadas : 'N/A'}
            ` : 'N/A';

            row.innerHTML = `
                <td>${student.nome} (${student.matricula})</td>
                <td><strong>${probability.toFixed(1)}%</strong></td>
                <td><span class="status-badge ${riskClass}">${riskLevel}</span></td>
                <td>${details}</td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Erro ao buscar dados dos alunos:", error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Erro ao carregar dados.</td></tr>`;
    }
}


/**
 * Configura a lógica para o modal de upload de arquivos.
 * Esta função é uma cópia da que está no script.js principal.
 */
function setupUploadModal() {
    const modal = document.getElementById('uploadModal');
    const openBtn = document.getElementById('openUploadModalBtn');
    const closeBtn = document.querySelector('.close-button');
    const uploadBtn = document.getElementById('uploadBtn');

    openBtn.onclick = () => modal.style.display = 'flex';
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = 'none';
    }
    
    uploadBtn.addEventListener('click', async () => {
        const fileInput = document.getElementById('jsonFile');
        const statusEl = document.getElementById('uploadStatus');
        if (fileInput.files.length === 0) {
            statusEl.textContent = 'Por favor, selecione um arquivo.'; return;
        }
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('arquivo', file);
        statusEl.textContent = 'Enviando e processando...';

        try {
            const response = await fetch(`${API_BASE_URL}/alunos/upload-json/`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error(`Erro: ${response.statusText}`);
            const result = await response.json();
            statusEl.textContent = 'Sucesso! ' + result.status;
            setTimeout(() => {
                modal.style.display = 'none';
                fileInput.value = '';
                statusEl.textContent = '';
                fetchRiskData(); // Atualiza a tabela da página atual
            }, 1500);
        } catch (error) {
            console.error('Falha no upload:', error);
            statusEl.textContent = 'Falha no upload. Verifique o console.';
        }
    });
}

// Inicialização da página
document.addEventListener('DOMContentLoaded', () => {
    fetchRiskData();
    setupUploadModal();
});