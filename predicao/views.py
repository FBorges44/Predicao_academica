# predicao/views.py
import json
import csv
import io
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Aluno
from .serializers import AlunoSerializer
from .servicos import processar_predicao_aluno
from django.shortcuts import render


class AlunoViewSet(viewsets.ModelViewSet):
    queryset = Aluno.objects.all().order_by('nome')
    serializer_class = AlunoSerializer

    def create(self, request, *args, **kwargs):
        """POST /api/alunos/ — Formulário Adicionar Aluno"""
        matricula  = request.data.get('matricula')
        nome       = request.data.get('nome')
        dados_json = request.data.get('dados_json')

        if not matricula or not nome or not dados_json:
            return Response(
                {"erro": "Campos obrigatórios ausentes: matricula, nome, dados_json"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            aluno = processar_predicao_aluno(matricula=matricula, dados_json=dados_json)
            serializer = self.get_serializer(aluno)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='upload-csv')
    def upload_csv(self, request):
        """POST /api/alunos/upload-csv/ — Upload de arquivo CSV de ingressantes"""
        arquivo = request.data.get('arquivo')
        if not arquivo:
            return Response({"erro": "Nenhum arquivo fornecido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            conteudo = arquivo.read().decode('utf-8-sig')
        except Exception:
            return Response({"erro": "Erro ao ler arquivo. Use UTF-8."}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(conteudo))

        if not {'matricula', 'nome'}.issubset(set(reader.fieldnames or [])):
            return Response(
                {"erro": f"CSV precisa ter pelo menos: matricula, nome. Encontradas: {reader.fieldnames}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        processados, erros = 0, []

        for i, linha in enumerate(reader, start=2):
            matricula = str(linha.get('matricula', '')).strip()
            nome      = str(linha.get('nome', '')).strip()

            if not matricula or not nome:
                erros.append(f"Linha {i}: matrícula ou nome vazio, ignorado.")
                continue

            # ── Monta dados_json com todos os campos do ingressante ──
            dados_json = {
                'matricula':          matricula,
                'nome':               nome,
                'sexo':               linha.get('sexo', '').strip(),
                'idade':              _para_int(linha.get('idade', 18)),
                'renda_familiar':     linha.get('renda_familiar', '1_3sm').strip(),
                'estado_civil':       linha.get('estado_civil', 'solteiro').strip(),
                'tem_filhos':         _para_int(linha.get('tem_filhos', 0)),
                'situacao_trabalho':  linha.get('situacao_trabalho', 'so_estuda').strip(),
                'escola_tipo':        linha.get('escola_tipo', 'publica').strip(),
                'bairro':             linha.get('bairro', '').strip(),
                'distancia':          linha.get('distancia', '5_15km').strip(),
                'transporte':         linha.get('transporte', 'publico').strip(),
            }

            try:
                processar_predicao_aluno(matricula, dados_json)
                processados += 1
            except Exception as e:
                erros.append(f"Linha {i} ({nome}): {str(e)}")

        resposta = {"status": f"{processados} aluno(s) processado(s) com sucesso."}
        if erros:
            resposta["avisos"] = erros
        return Response(resposta, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='upload-json')
    def upload_json(self, request):
        """POST /api/alunos/upload-json/ — Upload de arquivo JSON"""
        arquivo_json = request.data.get('arquivo')
        if not arquivo_json:
            return Response({"erro": "Nenhum arquivo fornecido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dados = json.load(arquivo_json)
        except json.JSONDecodeError:
            return Response({"erro": "JSON inválido"}, status=status.HTTP_400_BAD_REQUEST)

        alunos_a_processar = dados if isinstance(dados, list) else [dados]
        processados, erros = 0, []

        for d in alunos_a_processar:
            matricula = d.get('matricula') or d.get('student_id')
            if not matricula:
                erros.append("Aluno sem matrícula ignorado")
                continue
            try:
                d['matricula'] = str(matricula)
                if 'nome' not in d:
                    d['nome'] = f"Aluno {matricula}"
                processar_predicao_aluno(str(matricula), d)
                processados += 1
            except Exception as e:
                erros.append(f"Erro no aluno {matricula}: {str(e)}")

        resposta = {"status": f"{processados} aluno(s) processado(s) com sucesso."}
        if erros:
            resposta["avisos"] = erros
        return Response(resposta, status=status.HTTP_200_OK)


# ── Helpers ──────────────────────────────────────────
def _para_int(valor):
    try:
        return int(str(valor).strip())
    except (ValueError, TypeError):
        return 0
# ── Helpers ──────────────────────────────────────────
def _para_int(valor):
    try:
        return int(str(valor).strip())
    except (ValueError, TypeError):
        return 0
def pagina_assistente(request):
    return render (request, 'assistente.html') # Sem a pasta 'assistente/' na frente