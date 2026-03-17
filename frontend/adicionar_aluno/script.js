// Arquivo: frontend/adicionar_aluno/script.js
const API_BASE_URL = 'http://127.0.0.1:8000/api';

/**
 * Função auxiliar para capturar o CSRF Token do Django.
 * Necessário para autenticar requisições POST ao servidor.
 */
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

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addStudentForm');
    const statusEl = document.getElementById('formStatus');

    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o recarregamento da página

        // 1. Coleta os dados dos campos do formulário
        const matricula = document.getElementById('matricula').value;
        const nome = document.getElementById('nome').value;
        
        // Campos extras (usando verificação para evitar erros caso não existam no HTML)
        const sexo = document.getElementById('Sexo') ? document.getElementById('Sexo').value : '';
        const bairro = document.getElementById('Bairro') ? document.getElementById('Bairro').value : '';

        // 2. Cria o objeto para SALVAMENTO LOCAL (localStorage)
        // Isso garante que o aluno apareça na "Visão Geral" mesmo se o servidor falhar
        const novoAlunoLocal = {
            matricula: matricula,
            nome: nome,
            dados_json: {
                sexo: sexo,
                bairro: bairro,
                frequencia_media: 100, // Valores padrão para exibição inicial
                rendimento_medio: 0
            },
            predicao: { 
                probabilidade: 0, 
                risco_evasao: false 
            }
        };

        // Executa o salvamento no navegador
        const alunosLocais = JSON.parse(localStorage.getItem('alunos_custom') || '[]');
        // Evita duplicatas locais antes de adicionar
        if (!alunosLocais.some(a => a.matricula === matricula)) {
            alunosLocais.push(novoAlunoLocal);
            localStorage.setItem('alunos_custom', JSON.stringify(alunosLocais));
        }

        // 3. Prepara o pacote de dados (Payload) para o SERVIDOR
        const payload = {
            matricula: matricula,
            nome: nome,
            dados_json: {
                sexo: sexo,
                bairro: bairro,
                nome: nome,
                matricula: matricula
            }
        };

        statusEl.textContent = 'Salvo localmente. Sincronizando com o servidor...';
        statusEl.style.color = '#333';

        // 4. Envio para a API Django
        const csrftoken = getCookie('csrftoken');

        try {
            const response = await fetch(`${API_BASE_URL}/alunos/`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const msgErro = errorData.erro || errorData.detail || `Erro ${response.status}`;
                throw new Error(msgErro);
            }

            statusEl.textContent = 'Sucesso! Aluno salvo no banco e localmente.';
            statusEl.style.color = 'green';
            form.reset(); // Limpa os campos após o sucesso

        } catch (error) {
            console.error('Erro na sincronização:', error);
            // Aviso de que funcionou apenas no navegador por enquanto
            statusEl.textContent = `Salvo apenas localmente (Servidor Offline ou Erro: ${error.message})`;
            statusEl.style.color = 'orange';
        }
    });
});