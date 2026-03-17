# predicao/servicos.py
import joblib
import pandas as pd
import os
from django.conf import settings

# --- CARREGAMENTO DO MODELO DE IA ---
# ✅ Nome do arquivo corrigido: era 'modelo_evasao.pkl', é 'modelo_predicao.pkl'
CAMINHO_MODELO = os.path.join(settings.BASE_DIR, 'predicao', 'modelo_predicao.pkl')

try:
    MODELO_IA = joblib.load(CAMINHO_MODELO)
    print(f"✅ Modelo de IA carregado com sucesso: {CAMINHO_MODELO}")
except FileNotFoundError:
    print(f"⚠️  Modelo não encontrado em {CAMINHO_MODELO}. Usando predição simulada.")
    MODELO_IA = None
except Exception as e:
    print(f"⚠️  Erro ao carregar modelo: {e}. Usando predição simulada.")
    MODELO_IA = None


def executar_modelo_preditivo(dados_aluno: dict) -> dict:
    """
    Executa o modelo de IA (ou simulação se o modelo não estiver carregado).
    Recebe os dados_json do aluno e retorna { risco_evasao, probabilidade }.
    """

    # --- SE O MODELO REAL ESTIVER DISPONÍVEL ---
    if MODELO_IA is not None:
        try:
            # ✅ Colunas que o modelo espera - ajuste conforme seu treinamento
            # Estas devem ser AS MESMAS usadas no treinamento do modelo
            colunas_do_modelo = ['frequencia_media', 'rendimento_medio', 'disciplinas_reprovadas']

            dados_para_predicao = pd.DataFrame([dados_aluno])

            # Preenche colunas ausentes com 0 para evitar KeyError
            for col in colunas_do_modelo:
                if col not in dados_para_predicao.columns:
                    dados_para_predicao[col] = 0

            dados_para_predicao = dados_para_predicao[colunas_do_modelo]

            # .predict_proba()[:, 1] retorna a probabilidade da classe "evasão"
            probabilidade = float(MODELO_IA.predict_proba(dados_para_predicao)[:, 1][0])
            risco = probabilidade >= 0.50

            print(f"📊 Predição real: prob={probabilidade:.2f}, risco={risco}")
            return {"risco_evasao": risco, "probabilidade": probabilidade}

        except Exception as e:
            print(f"⚠️  Erro na predição real, usando simulação. Detalhe: {e}")
            # Cai para a simulação abaixo

    # --- SIMULAÇÃO (quando o modelo não está disponível) ---
    # Usa uma fórmula simples baseada nos dados disponíveis
    frequencia = dados_aluno.get('frequencia_media', 100)
    rendimento = dados_aluno.get('rendimento_medio', 7)
    reprovacoes = dados_aluno.get('disciplinas_reprovadas', 0)

    # Quanto menor a frequência e rendimento, maior o risco
    score = 0.0
    score += max(0, (75 - frequencia) / 75) * 0.4   # frequência abaixo de 75% aumenta risco
    score += max(0, (5 - rendimento) / 5) * 0.4      # rendimento abaixo de 5 aumenta risco
    score += min(reprovacoes * 0.1, 0.2)              # cada reprovação adiciona 10% (máx 20%)

    probabilidade = min(score, 0.99)
    risco = probabilidade >= 0.50

    print(f"📊 Predição simulada: prob={probabilidade:.2f}, risco={risco}")
    return {"risco_evasao": risco, "probabilidade": probabilidade}


def processar_predicao_aluno(matricula: str, dados_json: dict):
    """
    Salva o aluno no banco e executa a predição.
    Retorna o objeto aluno com a predição associada.
    """
    from .models import Aluno, PredicaoEvasao

    # 1. Salva ou atualiza o aluno no banco
    aluno, criado = Aluno.objects.update_or_create(
        matricula=matricula,
        defaults={
            'nome': dados_json.get('nome', 'Nome não informado'),
            'dados_json': dados_json
        }
    )
    acao = "Criado" if criado else "Atualizado"
    print(f"💾 Aluno {acao}: {aluno.nome} ({matricula})")

    # 2. Executa o modelo de IA
    resultado = executar_modelo_preditivo(dados_json)

    # 3. Salva a predição no banco
    PredicaoEvasao.objects.update_or_create(
        aluno=aluno,
        defaults={
            'risco_evasao': resultado['risco_evasao'],
            'probabilidade': resultado['probabilidade']
        }
    )

    return aluno