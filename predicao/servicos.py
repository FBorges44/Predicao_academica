# predicao/servicos.py
import joblib
import pandas as pd
import os
from django.conf import settings

# --- CARREGAMENTO DO MODELO DE IA ---
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
    Aceita tanto campos acadêmicos quanto socioeconômicos.
    Retorna { risco_evasao: bool, probabilidade: float }.
    """

    # --- SE O MODELO REAL ESTIVER DISPONÍVEL ---
    if MODELO_IA is not None:
        try:
            colunas_do_modelo = ['frequencia_media', 'rendimento_medio', 'disciplinas_reprovadas']
            dados_para_predicao = pd.DataFrame([dados_aluno])
            for col in colunas_do_modelo:
                if col not in dados_para_predicao.columns:
                    dados_para_predicao[col] = 0
            dados_para_predicao = dados_para_predicao[colunas_do_modelo]
            probabilidade = float(MODELO_IA.predict_proba(dados_para_predicao)[:, 1][0])
            risco = probabilidade >= 0.50
            print(f"📊 Predição real: prob={probabilidade:.2f}, risco={risco}")
            return {"risco_evasao": risco, "probabilidade": probabilidade}
        except Exception as e:
            print(f"⚠️  Erro na predição real, usando simulação. Detalhe: {e}")

    # --- SIMULAÇÃO INTELIGENTE ---
    # Combina campos acadêmicos (se existirem) com campos socioeconômicos
    score = 0.0

    # ── Campos acadêmicos (upload CSV / inserção manual legada) ──────────
    frequencia  = dados_aluno.get('frequencia_media')
    rendimento  = dados_aluno.get('rendimento_medio')
    reprovacoes = dados_aluno.get('disciplinas_reprovadas')

    if frequencia is not None:
        score += max(0.0, (75.0 - float(frequencia)) / 75.0) * 0.35
    if rendimento is not None:
        score += max(0.0, (5.0 - float(rendimento)) / 5.0) * 0.35
    if reprovacoes is not None:
        score += min(float(reprovacoes) * 0.08, 0.20)

    # ── Campos socioeconômicos (formulário "Adicionar Aluno") ─────────────
    # Renda familiar
    renda = dados_aluno.get('renda_familiar', '')
    if renda == 'ate_1sm':
        score += 0.20
    elif renda == '1_3sm':
        score += 0.10
    elif renda == 'acima_5sm':
        score -= 0.08

    # Situação de trabalho
    trabalho = dados_aluno.get('situacao_trabalho', '')
    if trabalho == 'estuda_trabalha_integral':
        score += 0.22
    elif trabalho == 'estuda_trabalha':
        score += 0.12
    elif trabalho == 'so_estuda':
        score -= 0.05

    # Escola de origem
    escola = dados_aluno.get('escola_tipo', '')
    if escola == 'publica':
        score += 0.10
    elif escola == 'privada':
        score -= 0.08

    # Distância
    distancia = dados_aluno.get('distancia', '')
    if distancia == 'acima_30km':
        score += 0.18
    elif distancia == '15_30km':
        score += 0.10
    elif distancia == '5_15km':
        score += 0.04
    elif distancia == 'ate_5km':
        score -= 0.05

    # Transporte
    transporte = dados_aluno.get('transporte', '')
    if transporte == 'publico':
        score += 0.08
    elif transporte == 'proprio':
        score -= 0.05

    # Filhos
    tem_filhos = dados_aluno.get('tem_filhos', 0)
    if int(tem_filhos) == 1:
        score += 0.10

    # Estado civil
    estado_civil = dados_aluno.get('estado_civil', '')
    if estado_civil == 'casado':
        score += 0.06

    # Idade
    idade = dados_aluno.get('idade', 18)
    if int(idade) >= 25:
        score += 0.07

    # Garante score entre 0.05 e 0.95 para não ter extremos irreais
    probabilidade = max(0.05, min(score, 0.95))
    risco = probabilidade >= 0.50

    print(f"📊 Predição simulada (socioeconômica): prob={probabilidade:.2f}, risco={risco}")
    return {"risco_evasao": risco, "probabilidade": probabilidade}


def processar_predicao_aluno(matricula: str, dados_json: dict):
    """
    Salva o aluno no banco e executa a predição.
    Retorna o objeto aluno com a predição associada.
    """
    from .models import Aluno, PredicaoEvasao

    aluno, criado = Aluno.objects.update_or_create(
        matricula=matricula,
        defaults={
            'nome': dados_json.get('nome', 'Nome não informado'),
            'dados_json': dados_json
        }
    )
    acao = "Criado" if criado else "Atualizado"
    print(f"💾 Aluno {acao}: {aluno.nome} ({matricula})")

    resultado = executar_modelo_preditivo(dados_json)

    PredicaoEvasao.objects.update_or_create(
        aluno=aluno,
        defaults={
            'risco_evasao': resultado['risco_evasao'],
            'probabilidade': resultado['probabilidade']
        }
    )

    return aluno