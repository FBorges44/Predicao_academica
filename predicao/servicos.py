# predicao/servicos.py
import json
import joblib  # Use joblib ou pickle, dependendo de como salvou o modelo
import pandas as pd
import os
from django.conf import settings

# --- CARREGAMENTO DO MODELO DE IA ---
# Construa o caminho completo para o arquivo do modelo
CAMINHO_MODELO = os.path.join(settings.BASE_DIR, 'predicao', 'modelo_evasao.pkl')
try:
    MODELO_IA = joblib.load(CAMINHO_MODELO)
    print(f"Modelo de IA carregado com sucesso de {CAMINHO_MODELO}")
except FileNotFoundError:
    print(f"ERRO: Arquivo do modelo não encontrado em {CAMINHO_MODELO}")
    MODELO_IA = None
# ------------------------------------

# --- SIMULAÇÃO DO SEU MODELO (AGORA SERÁ A FUNÇÃO REAL) ---
def executar_modelo_preditivo(dados_aluno: dict) -> dict:
    """
    Esta função executa o modelo de IA real.
    Ela recebe os dados de um aluno e retorna um dicionário com a predição.
    """
    if not MODELO_IA:
        print("Modelo de IA não carregado. Retornando predição padrão.")
        return {"risco_evasao": False, "probabilidade": 0.0}

    print("Processando dados do aluno no modelo preditivo REAL...")
    
    # --- ETAPA CRÍTICA: PRÉ-PROCESSAMENTO ---
    # O seu modelo não foi treinado com um dicionário Python.
    # Ele foi treinado com dados pré-processados (ex: um DataFrame ou NumPy array).
    # Você DEVE replicar esse pré-processamento aqui.
    
    # Exemplo: Se seu modelo espera um DataFrame com colunas específicas:
    try:
        # 1. Crie o DataFrame a partir dos dados_json
        # Use [dados_aluno] para criar um DataFrame de uma linha
        dados_para_predicao = pd.DataFrame([dados_aluno]) 
        
        # 2. Garanta que as colunas estejam na ordem correta
        # (Ex: se seu modelo foi treinado com estas colunas)
        colunas_do_modelo = ['frequencia_media', 'rendimento_medio', 'disciplinas_reprovadas'] 
        dados_para_predicao = dados_para_predicao[colunas_do_modelo]
        
        # (Se você fez One-Hot Encoding ou Scaling, precisa aplicar isso aqui também)

        # 3. Execute a predição
        # .predict_proba() é geralmente melhor, pois dá a probabilidade
        # O [:, 1] pega a probabilidade da classe "1" (evasão)
        probabilidade = MODELO_IA.predict_proba(dados_para_predicao)[:, 1][0] 
        
        # 4. Defina o risco com base em um limiar (ex: 50%)
        risco = bool(probabilidade >= 0.50) 
        
        print(f"Resultado da Predição: Risco={risco}, Probabilidade={probabilidade}")
        return {"risco_evasao": risco, "probabilidade": float(probabilidade)}

    except Exception as e:
        print(f"Erro ao processar dados no modelo: {e}")
        # Se falhar, retorna um valor seguro
        return {"risco_evasao": False, "probabilidade": 0.0}
# ----------------------------------------------------------------

def processar_predicao_aluno(matricula: str, dados_json: dict):
    """
    Orquestra o processo: salva o aluno e executa a predição REAL.
    """
    from .models import Aluno, PredicaoEvasao

    # 1. Salva ou atualiza os dados do aluno (igual a antes)
    aluno, criado = Aluno.objects.update_or_create(
        matricula=matricula,
        defaults={'nome': dados_json.get('nome', 'Nome não informado'), 'dados_json': dados_json}
    )

    # --- ETAPA REATIVADA ---
    # 2. Executa o modelo de aprendizado de máquina (AGORA CHAMA A FUNÇÃO REAL)
    resultado_predicao = executar_modelo_preditivo(dados_json)

    # 3. Salva ou atualiza o resultado REAL da predição no banco
    PredicaoEvasao.objects.update_or_create(
        aluno=aluno,
        defaults={
            'risco_evasao': resultado_predicao['risco_evasao'],
            'probabilidade': resultado_predicao['probabilidade']
        }
    )
    # -----------------------

    return aluno