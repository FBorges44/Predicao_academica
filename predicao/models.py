# predicao/models.py
from django.db import models

class Aluno(models.Model):
    # Informações básicas do aluno
    matricula = models.CharField(max_length=50, unique=True, primary_key=True)
    nome = models.CharField(max_length=255)
    dados_json = models.JSONField(help_text="Armazena os dados brutos do aluno do arquivo JSON")

    def __str__(self):
        return f"{self.nome} ({self.matricula})"

class PredicaoEvasao(models.Model):
    # Armazena o resultado da predição para um aluno
    aluno = models.OneToOneField(Aluno, on_delete=models.CASCADE, related_name='predicao')
    risco_evasao = models.BooleanField(default=False)
    probabilidade = models.FloatField(help_text="Probabilidade de evasão (ex: 0.75 para 75%)")
    data_predicao = models.DateTimeField(auto_now_add=True)
    # Você pode adicionar mais campos aqui, como os fatores que mais influenciaram

    def __str__(self):
        return f"Predição para {self.aluno.nome} - Risco: {self.risco_evasao}"