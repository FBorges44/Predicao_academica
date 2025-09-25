# predicao/servicos.py
import json

# --- SIMULAÇÃO DO SEU MODELO DE APRENDIZADO DE MÁQUINA (MAM) ---
# Substitua esta função pela chamada real ao seu modelo salvo (ex: .pkl, .h5)
def executar_modelo_preditivo(dados_aluno: dict) -> dict:
    """
    Esta função simula a execução do seu MAM.
    Ela recebe os dados de um aluno e retorna um dicionário com a predição.
    """
    print("Processando dados do aluno no modelo preditivo...")
    # Lógica de simulação: se a frequência for menor que 75%, considera risco.
    # Esta é uma regra simples, a sua será a lógica complexa do seu modelo.
    frequencia_media = dados_aluno.get('frequencia_media', 100)
    rendimento_medio = dados_aluno.get('rendimento_medio', 10)

    # Exemplo simples de lógica
    if frequencia_media < 75 or rendimento_medio < 5:
        probabilidade = 0.8
        risco = True
    else:
        probabilidade = 0.2
        risco = False

    print(f"Resultado da Predição: Risco={risco}, Probabilidade={probabilidade}")
    return {"risco_evasao": risco, "probabilidade": probabilidade}
# ----------------------------------------------------------------

def processar_predicao_aluno(matricula: str, dados_json: dict):
    """
    Orquestra o processo: salva o aluno e executa a predição.
    Isso corresponde à etapa de processamento de dados do seu TCC[cite: 220, 222].
    """
    from .models import Aluno, PredicaoEvasao

    # 1. Salva ou atualiza os dados do aluno
    aluno, criado = Aluno.objects.update_or_create(
        matricula=matricula,
        defaults={'nome': dados_json.get('nome', 'Nome não informado'), 'dados_json': dados_json}
    )

    # 2. Executa o modelo de aprendizado de máquina
    resultado_predicao = executar_modelo_preditivo(dados_json)

    # 3. Salva ou atualiza o resultado da predição no banco de dados
    PredicaoEvasao.objects.update_or_create(
        aluno=aluno,
        defaults={
            'risco_evasao': resultado_predicao['risco_evasao'],
            'probabilidade': resultado_predicao['probabilidade']
        }
    )

    return aluno