const API_BASE_URL = 'http://127.0.0.1:8000/api';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addStudentForm');
    const statusEl = document.getElementById('formStatus');

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o recarregamento da página

        // 1. Coleta os dados do formulário
        const matricula = document.getElementById('matricula').value;
        const nome = document.getElementById('nome').value;
        const Sexo = parseFloat(document.getElementById('Sexo').value);
        const Bairro = parseInt(document.getElementById('Bairro').value);

        statusEl.textContent = 'Enviando dados para processamento...';
        statusEl.style.color = '#333';

        // 2. Monta o payload (carga de dados) que a API espera
        const payload = {
            matricula: matricula,
            nome: nome,
            // O backend espera um campo 'dados_json', então agrupamos os outros dados aqui
            dados_json: {
                nome: nome,
                matricula: matricula,
                frequencia_media: frequencia,
                rendimento_medio: rendimento,
                disciplinas_reprovadas: reprovacoes
            }
        };

        // 3. Envia os dados para o backend via POST
        try {
            const response = await fetch(`${API_BASE_URL}/alunos/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // Tenta extrair uma mensagem de erro do backend
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ocorreu um erro no servidor.');
            }

            const result = await response.json();
            statusEl.textContent = `Sucesso! Aluno ${nome} foi adicionado e analisado.`;
            statusEl.style.color = 'green';
            form.reset(); // Limpa o formulário

        } catch (error) {
            console.error('Falha ao adicionar aluno:', error);
            statusEl.textContent = `Erro: ${error.message}`;
            statusEl.style.color = 'red';
        }
    });
});