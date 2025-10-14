import json
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Aluno
from .serializers import AlunoSerializer
from .servicos import processar_predicao_aluno

class AlunoViewSet(viewsets.ModelViewSet):
    queryset = Aluno.objects.all().order_by('nome')
    serializer_class = AlunoSerializer

    # NOVO MÉTODO ADICIONADO
    # Este método é chamado automaticamente quando o frontend envia um POST para /api/alunos/
    def create(self, request, *args, **kwargs):
        """
        Cria um novo aluno a partir de dados de formulário,
        e dispara o processamento pelo modelo de IA.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Pega os dados validados
        data = serializer.validated_data
        matricula = data.get('matricula')
        dados_json = data.get('dados_json')

        # Reutiliza nossa função de serviço principal, que já chama a IA e salva tudo
        if matricula and dados_json:
            processar_predicao_aluno(matricula=matricula, dados_json=dados_json)
            return Response({"status": "Aluno processado com sucesso"}, status=status.HTTP_201_CREATED)
        
        return Response({"erro": "Matrícula ou dados JSON ausentes"}, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=False, methods=['post'], url_path='upload-json')
    def upload_json(self, request):
        """
        Endpoint para upload de arquivo JSON.
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