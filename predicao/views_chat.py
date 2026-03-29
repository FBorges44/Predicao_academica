import json
import os
from google import genai  # Nova biblioteca 2026
from google.genai import types
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import Aluno, PredicaoEvasao

# --- FUNÇÃO DE RESUMO (MANTIDA) ---
def _resumo_alunos() -> str:
    alunos = Aluno.objects.select_related('predicao').all()
    if not alunos.exists():
        return "Nenhum aluno cadastrado no sistema ainda."

    total = alunos.count()
    em_risco = sum(1 for a in alunos if hasattr(a, 'predicao') and a.predicao.risco_evasao)
    linhas = []

    for a in alunos:
        pred = getattr(a, 'predicao', None)
        prob = pred.probabilidade if pred else 0.0
        risco = "ALTO RISCO" if (pred and pred.risco_evasao) else "baixo risco"
        d = a.dados_json or {}
        
        linha = (
            f"- {a.nome} (matrícula: {a.matricula}): "
            f"probabilidade {prob*100:.1f}% [{risco}] | "
            f"trabalho: {d.get('situacao_trabalho','N/A')} | "
            f"renda: {d.get('renda_familiar','N/A')} | "
            f"escola: {d.get('escola_tipo','N/A')}"
        )
        linhas.append(linha)

    return f"RESUMO: Total {total}, Em risco {em_risco}\n\nLISTA:\n" + "\n".join(linhas)

# --- CONFIGURAÇÃO ---
SYSTEM_PROMPT = """Você é o Assistente de Predição Acadêmica do IFPI (Instituto Federal do Piauí).
Responda sempre em português, use os dados reais fornecidos e ajude na tomada de decisão contra evasão."""

@csrf_exempt
@require_http_methods(["POST"])
def chat_view(request):
    try:
        body = json.loads(request.body)
        mensagem = body.get('mensagem', '').strip()
        historico = body.get('historico', []) 

        if not mensagem:
            return JsonResponse({"erro": "Mensagem vazia."}, status=400)

        # 1. Nova forma de inicializar o Cliente
        api_key = os.environ.get('GOOGLE_API_KEY', 'AIzaSyCfeV0dNSSvTOgdAPg5IBQxIobmA6Bs-kc')
        client = genai.Client(api_key=api_key)

        # 2. Converte o histórico para o formato do novo SDK
        # user -> user | assistant -> model
        contents = []
        for msg in historico[-10:]:
            role = "user" if msg['role'] == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg['content'])]))

        # 3. Adiciona a mensagem atual com o contexto injetado
        contexto_real = _resumo_alunos()
        prompt_final = f"DADOS DO SISTEMA:\n{contexto_real}\n\nPERGUNTA: {mensagem}"
        contents.append(types.Content(role="user", parts=[types.Part(text=prompt_final)]))

        # 4. Gera a resposta usando o novo método
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=1024,
            )
        )
        
        return JsonResponse({"resposta": response.text})

    except Exception as e:
        print(f"Erro no Chat: {str(e)}")
        return JsonResponse({
            "resposta": "⚠️ Erro ao processar. Verifique se o GOOGLE_API_KEY está correto."
        })