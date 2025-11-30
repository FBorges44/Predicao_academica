// Arquivo: frontend/adicionar_aluno/script.js
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// --- Função Auxiliar para pegar o CSRF Token do Django ---
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
// ---------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addStudentForm');
    const statusEl = document.getElementById('formStatus');

    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // 1. Coleta os dados
        const matricula = document.getElementById('matricula').value;
        const nome = document.getElementById('nome').value;
        const sexo = document.getElementById('Sexo').value;
        const bairro = document.getElementById('Bairro').value;

        statusEl.textContent = 'Enviando para o Banco de Dados...';
        statusEl.style.color = '#333';

        // 2. Monta o pacote de dados
        const payload = {
            matricula: matricula,
            nome: nome,
            dados_json: {
                nome: nome,
                matricula: matricula,
                sexo: sexo,
                bairro: bairro
                // Adicione outros campos necessários aqui
            }
        };

        // Pega o token de segurança
        const csrftoken = getCookie('csrftoken');

        // 3. Envia para a API (Backend)
        try {
            const response = await fetch(`${API_BASE_URL}/alunos/`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken // <--- AQUI ESTÁ A CHAVE MÁGICA
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // Se der erro, tenta ler a mensagem do servidor
                const errorData = await response.json().catch(() => ({}));
                const msgErro = errorData.erro || errorData.detail || `Erro ${response.status}`;
                throw new Error(msgErro);
            }

            statusEl.textContent = 'Sucesso! Aluno salvo no banco.';
            statusEl.style.color = 'green';
            form.reset();

        } catch (error) {
            console.error('Erro na requisição:', error);
            statusEl.textContent = `Erro ao salvar: ${error.message}`;
            statusEl.style.color = 'red';
        }
    });
});