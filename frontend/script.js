// LÓGICA JAVASCRIPT
const API_BASE_URL = 'http://127.0.0.1:8000/api';
let lineChartInstance, donutChartInstance;

// Função principal que busca os dados da API e chama as outras funções
async function initializeDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/alunos/`);
        if (!response.ok) throw new Error('Falha ao carregar dados do backend.');
        
        const studentsFromAPI = await response.json();
        
        // 1. AJUSTE AQUI: Mapeia os dados da API, INCLUINDO o JSON original
        const alunos = studentsFromAPI.map(s => ({
            nome: s.nome,
            risco: s.predicao ? (s.predicao.probabilidade * 100) : 0,
            detalhes: s.dados_json // <-- Passa o JSON completo para a próxima função
        })).filter(s => s.nome);

        // Chama as suas funções com os dados reais
        atualizarKPIs(alunos);
        carregarTabela(alunos); // Esta função foi atualizada abaixo
        carregarAlertas(alunos);
        graficoLinha();
        graficoDonut(alunos);

    } catch (error)
    {
        console.error("Erro ao inicializar o dashboard:", error);
        document.getElementById('studentTable').innerHTML = `<tr><td colspan="4">Erro ao carregar dados. Verifique se o servidor Django está rodando.</td></tr>`;
    }
}

// ... (a função atualizarKPIs continua a mesma) ...
function atualizarKPIs(alunos) {
    if (alunos.length === 0) {
        document.getElementById("avg-risk").textContent = `0%`;
        document.getElementById("students-risk").textContent = 0;
        document.getElementById("retention-rate").textContent = `100%`;
        document.getElementById("alerts-count").textContent = 0;
        return;
    };

    const riscos = alunos.map(a => a.risco);
    const media = (riscos.reduce((a, b) => a + b, 0) / riscos.length);
    const emRisco = alunos.filter(a => a.risco >= 70).length;
    const permanencia = 100 - media;
    const alertas = emRisco;

    document.getElementById("avg-risk").textContent = `${media.toFixed(1)}%`;
    document.getElementById("students-risk").textContent = emRisco;
    document.getElementById("retention-rate").textContent = `${permanencia.toFixed(1)}%`;
    document.getElementById("alerts-count").textContent = alertas;
}


// 2. ATUALIZE A FUNÇÃO carregarTabela
function carregarTabela(alunos) {
    const tbody = document.getElementById("studentTable");
    tbody.innerHTML = '';
    
    if (alunos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Nenhum aluno para exibir. Carregue um arquivo de dados.</td></tr>`;
        return;
    }
    
    alunos.sort((a, b) => b.risco - a.risco);

    alunos.forEach(aluno => {
        const row = document.createElement("tr");

        // Formata os detalhes do JSON para exibição
        let detalhesFormatados = `
            Freq: ${aluno.detalhes.frequencia_media || 'N/A'}% <br>
            Rend: ${aluno.detalhes.rendimento_medio || 'N/A'} <br>
            Reprov: ${aluno.detalhes.disciplinas_reprovadas !== undefined ? aluno.detalhes.disciplinas_reprovadas : 'N/A'}
        `;

        row.innerHTML = `
            <td>${aluno.nome}</td>
            <td>${aluno.risco.toFixed(1)}%</td>
            <td>
                <span class="status-text" style="color: ${aluno.risco >= 70 ? 'var(--risk-high)' : 'var(--risk-low)'}">
                    ${aluno.risco >= 70 ? "Em Risco" : "Estável"}
                </span>
            </td>
            <td>${detalhesFormatados}</td> 
        `; // <-- Adiciona a nova célula com os detalhes
        tbody.appendChild(row);
    });
}


// ... (o restante das funções continua o mesmo) ...
function carregarAlertas(alunos) {
    const container = document.getElementById("alertsList");
    container.innerHTML = '';
    const alunosEmRisco = alunos.filter(a => a.risco >= 70);
    
    if (alunosEmRisco.length === 0) {
        container.textContent = "Nenhum alerta ativo.";
        return;
    }

    alunosEmRisco.forEach(aluno => {
        const alert = document.createElement("div");
        alert.classList.add("alert-item");
        alert.innerHTML = `⚠️ <strong>${aluno.nome}</strong> com risco de <strong>${aluno.risco.toFixed(1)}%</strong>`;
        container.appendChild(alert);
    });
}

function graficoLinha() {
    const ctx = document.getElementById("lineChart").getContext("2d");
    if(lineChartInstance) lineChartInstance.destroy();
    lineChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: ["2020", "2021", "2022", "2023", "2024"],
            datasets: [{
                label: "Probabilidade Média (%)",
                data: [40, 55, 60, 65, 70], // Dados simulados
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                tension: 0.3,
                fill: true
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

function graficoDonut(alunos) {
    const ctx = document.getElementById("donutChart").getContext("2d");
    const baixo = alunos.filter(a => a.risco < 40).length;
    const medio = alunos.filter(a => a.risco >= 40 && a.risco < 70).length;
    const alto = alunos.filter(a => a.risco >= 70).length;
    
    if(donutChartInstance) donutChartInstance.destroy();
    donutChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Baixo Risco", "Médio Risco", "Alto Risco"],
            datasets: [{
                data: [baixo, medio, alto],
                backgroundColor: ["var(--risk-low)", "var(--risk-medium)", "var(--risk-high)"]
            }]
        },
        options: { responsive: true, cutout: '60%' }
    });
}

// Lógica do Modal de Upload
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
            statusEl.textContent = 'Por favor, selecione um arquivo.';
            return;
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
                initializeDashboard(); // Atualiza o dashboard com os novos dados
            }, 1500);
        } catch (error) {
            console.error('Falha no upload:', error);
            statusEl.textContent = 'Falha no upload. Verifique o console.';
        }
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupUploadModal();
});