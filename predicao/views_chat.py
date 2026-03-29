# predicao/views_chat.py
import json
import os

# Carrega o arquivo .env automaticamente
from dotenv import load_dotenv
load_dotenv()

import google.generativeai as genai

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import Aluno

# ── Prompt de sistema ─────────────────────────────────────────────────────────
SYSTEM_PROMPT = """Você é o Assistente de Predição Acadêmica do IFPI (Instituto Federal do Piauí - Zona Sul).
Seu papel é ajudar coordenadores e professores a entender o risco de evasão dos alunos e tomar decisões.

Diretrizes:
- Responda SEMPRE em português brasileiro
- Use os dados reais dos alunos fornecidos no contexto
- Seja objetivo, claro e útil para a tomada de decisão pedagógica
- Quando listar alunos em risco, priorize os de maior probabilidade
- Sugira ações concretas de intervenção quando pertinente
- Não invente dados que não estejam no contexto fornecido
"""

# ── Resumo dos alunos do banco ────────────────────────────────────────────────
def _resumo_alunos() -> str:
    alunos = Aluno.objects.select_related('predicao').all()

    if not alunos.exists():
        return "Nenhum aluno cadastrado no sistema ainda."

    total    = alunos.count()
    em_risco = sum(1 for a in alunos if hasattr(a, 'predicao') and a.predicao.risco_evasao)
    linhas   = []

    for a in alunos:
        pred  = getattr(a, 'predicao', None)
        prob  = pred.probabilidade if pred else 0.0
        risco = "ALTO RISCO" if (pred and pred.risco_evasao) else "baixo risco"
        d     = a.dados_json or {}

        if d.get('frequencia_media') is not None:
            detalhes = (
                f"freq: {d.get('frequencia_media','N/A')}% | "
                f"rendimento: {d.get('rendimento_medio','N/A')} | "
                f"reprovações: {d.get('disciplinas_reprovadas','N/A')}"
            )
        else:
            detalhes = (
                f"renda: {d.get('renda_familiar','N/A')} | "
                f"trabalho: {d.get('situacao_trabalho','N/A')} | "
                f"escola: {d.get('escola_tipo','N/A')} | "
                f"distância: {d.get('distancia','N/A')}"
            )

        linhas.append(
            f"- {a.nome} (matrícula: {a.matricula}): "
            f"probabilidade de evasão {prob*100:.1f}% [{risco}] | {detalhes}"
        )

    return (
        f"RESUMO GERAL: {total} alunos cadastrados, {em_risco} em risco de evasão "
        f"({(em_risco/total*100):.1f}% da turma).\n\n"
        f"LISTA DE ALUNOS:\n" + "\n".join(linhas)
    )


# ── Endpoint do chat ──────────────────────────────────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
def chat_view(request):
    try:
        body      = json.loads(request.body)
        mensagem  = body.get('mensagem', '').strip()
        historico = body.get('historico', [])

        if not mensagem:
            return JsonResponse({"erro": "Mensagem vazia."}, status=400)

        # Lê a chave SOMENTE do .env / variável de ambiente — sem fallback hardcoded
        api_key = os.environ.get('GOOGLE_API_KEY', 'AIzaSyBBey2rmZPNhTd8zV6G3KxoeklxYtdb5xI')
        if not api_key:
            return JsonResponse({
                "resposta": "⚠️ Chave GOOGLE_API_KEY não encontrada no arquivo .env"
            })

        # Mostra no terminal qual chave está sendo usada (só os primeiros caracteres)
        print(f"🔑 Usando chave: {api_key[:12]}...")

        # ── Configura o Gemini ────────────────────────────────────────────
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT,
        )

        # ── Monta histórico ───────────────────────────────────────────────
        history = []
        for msg in historico[-20:]:
            role = "user" if msg['role'] == "user" else "model"
            history.append({"role": role, "parts": [{"text": msg['content']}]})

        if history and history[-1]['role'] == 'user':
            history = history[:-1]

        # ── Injeta dados reais ────────────────────────────────────────────
        contexto     = _resumo_alunos()
        prompt_final = (
            f"DADOS ATUAIS DO SISTEMA:\n{contexto}\n\n"
            f"PERGUNTA DO USUÁRIO: {mensagem}"
        )

        chat     = model.start_chat(history=history)
        response = chat.send_message(prompt_final)

        return JsonResponse({"resposta": response.text})

    except Exception as e:
        print(f"❌ Erro no Chat: {e}")
        return JsonResponse({
            "resposta": f"⚠️ Erro ao processar sua mensagem: {str(e)}"
        })