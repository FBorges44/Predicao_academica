# predicao/serializers.py
from rest_framework import serializers
from .models import Aluno, PredicaoEvasao

class PredicaoEvasaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredicaoEvasao
        fields = ['risco_evasao', 'probabilidade', 'data_predicao']

class AlunoSerializer(serializers.ModelSerializer):
    # 'predicao' é o 'related_name' que definimos no modelo PredicaoEvasao
    predicao = PredicaoEvasaoSerializer(read_only=True)

    class Meta:
        model = Aluno
        fields = ['matricula', 'nome', 'dados_json', 'predicao']