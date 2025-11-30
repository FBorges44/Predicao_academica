# Arquivo: predicao/views.py (Versão Corrigida e Unificada)

import json
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Aluno
from .serializers import AlunoSerializer
from .servicos import processar_predicao_aluno # Certifique-se que seu serviço está sendo importado

class AlunoViewSet(viewsets.ModelViewSet):
    """
    API para visualizar e gerenciar dados de alunos e suas predições.
    """
    queryset = Aluno.objects.all().order_by('nome')
    serializer_class = AlunoSerializer

    # --- MÉTODO RESTAURADO ---
    # Esta função é essencial para a página "Adicionar Aluno" e estava no arquivo -Junior.
    def create(self, request, *args, **kwargs):
        """
        Cria um novo aluno a partir de dados de formulário (da página Adicionar Aluno),
        e dispara o processamento.
        """
        # A lógica abaixo valida os dados recebidos do frontend
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Pega os dados validados
        data = serializer.validated_data
        matricula = data.get('matricula')
        dados_json = data.get('dados_json')

        # Reutiliza nossa função de serviço principal
        if matricula and dados_json:
            # Chama a função que salva o aluno e cria a predição (falsa, por enquanto)
            processar_predicao_aluno(matricula=matricula, dados_json=dados_json)
            # Retorna uma resposta de sucesso para o frontend
            return Response({"status": "Aluno processado com sucesso"}, status=status.HTTP_201_CREATED)
        
        # Se os dados estiverem incompletos, retorna um erro
        return Response({"erro": "Matrícula ou dados JSON ausentes"}, status=status.HTTP_400_BAD_REQUEST)

    # --- AÇÃO DE UPLOAD (JÁ EXISTENTE) ---
    # Esta função é para o botão "Carregar Dados"
    # Em predicao/views.py

    @action(detail=False, methods=['post'], url_path='upload-json')
    def upload_json(self, request):
        """
        Endpoint para receber um arquivo JSON com dados de um ou mais alunos,
        processá-los e disparar a predição.
        
        AGORA COM TRATAMENTO DE ERRO EXPLÍCITO.
        """
        arquivo_json = request.data.get('arquivo')
        if not arquivo_json:
            return Response({"erro": "Nenhum arquivo JSON fornecido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dados = json.load(arquivo_json)
        except json.JSONDecodeError:
             return Response({"erro": "Formato de JSON inválido"}, status=status.HTTP_400_BAD_REQUEST)

        alunos_a_processar = dados if isinstance(dados, list) else [dados]
        
        # --- NOVO BLOCO TRY...EXCEPT ---
        # Vamos envolver o processamento para capturar o erro que está acontecendo
        try:
            for dados_aluno in alunos_a_processar:
                matricula = dados_aluno.get('matricula')
                if not matricula:
                    continue
                
                # Esta é a função que está falhando silenciosamente
                processar_predicao_aluno(matricula, dados_aluno)

            # Se tudo correu bem, retorna sucesso
            return Response({"status": "Dados processados com sucesso"}, status=status.HTTP_200_OK)
        
        except Exception as e:
            # Se qualquer aluno falhar, pare tudo e retorne o erro real!
            # Isso fará o frontend exibir uma mensagem de falha.
            print(f"ERRO CRÍTICO NO PROCESSAMENTO: {str(e)}")
            return Response(
                {"erro": f"Falha ao processar os dados no backend. Detalhe: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        # --- FIM DO NOVO BLOCO ---