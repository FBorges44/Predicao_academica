import json
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Aluno
from .serializers import AlunoSerializer
from .servicos import processar_predicao_aluno

# aqui são oas views do meu prpjetp
def alunos_risco(request):
    return render(request, 'alunos_risco/alunos_risco.html')

# Um ViewSet agrupa toda a lógica para um modelo específico.
# Ele é a peça central que o Router (nas URLs) irá usar.
class AlunoViewSet(viewsets.ModelViewSet):
    """
    API para visualizar e gerenciar dados de alunos e suas predições.
    """
    # Define o conjunto de dados que esta view irá manipular (todos os alunos)
    queryset = Aluno.objects.all().order_by('nome')
    # Define o serializador para converter os dados para JSON
    serializer_class = AlunoSerializer

    # A anotação @action cria uma nova rota personalizada dentro deste ViewSet.
    # Neste caso, ela cria a URL para o upload do arquivo JSON.
    @action(detail=False, methods=['post'], url_path='upload-json')
    def upload_json(self, request):
        """
        Endpoint para receber um arquivo JSON com dados de um ou mais alunos,
        processá-los e disparar a predição.
        """
        arquivo_json = request.data.get('arquivo')
        if not arquivo_json:
            return Response({"erro": "Nenhum arquivo JSON fornecido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if isinstance(arquivo_json, str):
                dados = json.loads(arquivo_json)
            else:
                dados = json.load(arquivo_json)
        except json.JSONDecodeError:
             return Response({"erro": "Formato de JSON inválido"}, status=status.HTTP_400_BAD_REQUEST)

        alunos_a_processar = dados if isinstance(dados, list) else [dados]

        for dados_aluno in alunos_a_processar:
            matricula = dados_aluno.get('matricula')
            if not matricula:
                continue
            processar_predicao_aluno(matricula, dados_aluno)

        return Response({"status": "Dados processados com sucesso"}, status=status.HTTP_200_OK)

