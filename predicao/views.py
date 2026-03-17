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


class AlunoViewSet(viewsets.ModelViewSet):
    queryset = Aluno.objects.all().order_by('nome')
    serializer_class = AlunoSerializer

    def create(self, request, *args, **kwargs):
        """POST /api/alunos/ — Formulário Adicionar Aluno"""
        matricula = request.data.get('matricula')
        nome = request.data.get('nome')
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
        """
        POST /api/alunos/upload-csv/
        Recebe um arquivo .csv, processa cada linha e salva no banco com predição.
        """
        arquivo = request.data.get('arquivo')
        if not arquivo:
            return Response({"erro": "Nenhum arquivo fornecido"}, status=status.HTTP_400_BAD_REQUEST)

        # Lê o arquivo como texto
        try:
            conteudo = arquivo.read().decode('utf-8-sig')  # utf-8-sig remove BOM se houver
        except Exception:
            return Response({"erro": "Erro ao ler o arquivo. Use UTF-8."}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(conteudo))

        # Valida se as colunas mínimas existem
        colunas_necessarias = {'matricula', 'nome'}
        if not colunas_necessarias.issubset(set(reader.fieldnames or [])):
            return Response(
                {"erro": f"CSV precisa ter as colunas: {colunas_necessarias}. Encontradas: {reader.fieldnames}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        processados = 0
        erros = []

        for i, linha in enumerate(reader, start=2):  # start=2 porque linha 1 é o cabeçalho
            matricula = str(linha.get('matricula', '')).strip()
            nome = str(linha.get('nome', '')).strip()

            if not matricula or not nome:
                erros.append(f"Linha {i}: matrícula ou nome vazio, ignorado.")
                continue

            # Monta o dados_json mapeando as colunas do seu CSV
            dados_json = {
                'matricula': matricula,
                'nome': nome,
                'sexo': linha.get('sexo', '').strip(),
                'bairro': linha.get('bairro', '').strip(),
                'escola_tipo': linha.get('escola_tipo', '').strip(),
                'estado_civil': linha.get('estado_civil', '').strip(),
                'filhos': _para_int(linha.get('filhos', 0)),

                # Campos usados pelo modelo de IA
                # O CSV usa 'frequencia_pct' → mapeamos para 'frequencia_media'
                'frequencia_media': _para_float(linha.get('frequencia_pct', linha.get('frequencia_media', 0))),
                'rendimento_medio': _para_float(linha.get('rendimento_medio', 0)),
                # 'disciplinas_reprovadas' vem como texto ("Matemática, Física") → contamos as vírgulas
                'disciplinas_reprovadas': _contar_disciplinas(linha.get('disciplinas_reprovadas', 'Nenhuma')),
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
            return Response({"erro": "Formato de JSON inválido"}, status=status.HTTP_400_BAD_REQUEST)

        alunos_a_processar = dados if isinstance(dados, list) else [dados]
        processados = 0
        erros = []

        for dados_aluno in alunos_a_processar:
            matricula = dados_aluno.get('matricula') or dados_aluno.get('student_id')
            if not matricula:
                erros.append("Aluno sem matrícula ignorado")
                continue
            try:
                dados_aluno['matricula'] = str(matricula)
                if 'nome' not in dados_aluno:
                    dados_aluno['nome'] = f"Aluno {matricula}"
                processar_predicao_aluno(str(matricula), dados_aluno)
                processados += 1
            except Exception as e:
                erros.append(f"Erro no aluno {matricula}: {str(e)}")

        resposta = {"status": f"{processados} aluno(s) processado(s) com sucesso."}
        if erros:
            resposta["avisos"] = erros
        return Response(resposta, status=status.HTTP_200_OK)


# ── Funções auxiliares ──────────────────────────────────────────────────────

def _para_float(valor):
    """Converte string para float com segurança."""
    try:
        return float(str(valor).replace(',', '.').strip())
    except (ValueError, TypeError):
        return 0.0

def _para_int(valor):
    """Converte string para int com segurança."""
    try:
        return int(str(valor).strip())
    except (ValueError, TypeError):
        return 0

def _contar_disciplinas(valor: str) -> int:
    """
    Converte o campo de disciplinas reprovadas para número.
    'Nenhuma' → 0
    'Matemática' → 1
    'Matemática, Física' → 2
    """
    valor = str(valor).strip()
    if not valor or valor.lower() == 'nenhuma':
        return 0
    return len([d for d in valor.split(',') if d.strip()])