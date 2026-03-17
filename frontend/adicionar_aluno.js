// frontend/adicionar_aluno.js
// ✅ Este arquivo deve ficar em: frontend/adicionar_aluno.js (raiz do frontend)
const API_BASE_URL = 'http://127.0.0.1:8000/api';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addStudentForm');
    const statusEl = document.getElementById('formStatus');
    const resultadoDiv = document.getElementById('resultadoPredicao');
    const resultadoTexto = document.getElementById('resultadoTexto');

    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        statusEl.textContent = 'Enviando dados...';
        statusEl.style.color = '#333';

        // ✅ IDs corrigidos para bater exatamente com o HTML (minúsculos)
        const matricula = document.getElementById('matricula').value.trim();
        const nome = document.getElementById('nome').value.trim();
        const sexo = document.getElementById('sexo').value;
        const bairro = document.getElementById('bairro').value.trim();
        const escola = document.getElementById('escola').value.trim();
        const estado_civil = document.getElementById('estado_civil').value;
        const filhos = parseInt(document.getElementById('filhos').value) || 0;

        // ✅ Campos acadêmicos que o modelo de IA precisa
        const frequencia_media = parseFloat(document.getElementById('frequencia_media').value) || 0;
        const rendimento_medio = parseFloat(document.getElementById('rendimento_medio').value) || 0;
        const disciplinas_reprovadas = parseInt(document.getElementById('disciplinas_reprovadas').value) || 0;

        // ✅ Payload correto: dados_json contém TUDO que o modelo precisa
        const payload = {
            matricula: matricula,
            nome: nome,
            dados_json: {
                nome: nome,
                matricula: matricula,
                sexo: sexo,
                bairro: bairro,
                escola: escola,
                estado_civil: estado_civil,
                filhos: filhos,
                // Campos para o modelo de IA
                frequencia_media: frequencia_media,
                rendimento_medio: rendimento_medio,
                disciplinas_reprovadas: disciplinas_reprovadas,
            }
        };

        try {
            const response = await fetch(`${API_BASE_URL}/alunos/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const msgErro = errorData.erro || errorData.detail || `Erro ${response.status}`;
                throw new Error(msgErro);
            }

            const resultado = await response.json();

            statusEl.textContent = '✅ Aluno salvo e predição gerada com sucesso!';
            statusEl.style.color = 'green';

            // ✅ Exibe o resultado da predição se vier na resposta
            if (resultado.predicao) {
                const prob = (resultado.predicao.probabilidade * 100).toFixed(1);
                const risco = resultado.predicao.risco_evasao ? '🔴 ALTO RISCO' : '🟢 BAIXO RISCO';
                resultadoTexto.innerHTML = `
                    <strong>Aluno:</strong> ${nome}<br>
                    <strong>Probabilidade de Evasão:</strong> ${prob}%<br>
                    <strong>Classificação:</strong> ${risco}
                `;
                resultadoDiv.style.display = 'block';
            }

            form.reset();

        } catch (error) {
            console.error('Erro ao salvar aluno:', error);
            statusEl.textContent = `❌ Erro: ${error.message}`;
            statusEl.style.color = 'red';
        }
    });
});