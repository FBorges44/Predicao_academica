# Arquivo: predicao/admin.py
from django.contrib import admin
from .models import Aluno, PredicaoEvasao

# Configuração para visualizar a tabela de Alunos
@admin.register(Aluno)
class AlunoAdmin(admin.ModelAdmin):
    list_display = ('matricula', 'nome', 'exibir_probabilidade')
    search_fields = ('nome', 'matricula')

    # Função auxiliar para mostrar a probabilidade na lista de alunos
    def exibir_probabilidade(self, obj):
        # Tenta pegar a predição se ela existir
        if hasattr(obj, 'predicao'):
            return f"{obj.predicao.probabilidade:.1%}"
        return "-"
    exibir_probabilidade.short_description = 'Probabilidade de Evasão'

# Configuração para visualizar a tabela de Predições
@admin.register(PredicaoEvasao)
class PredicaoEvasaoAdmin(admin.ModelAdmin):
    list_display = ('aluno', 'risco_evasao', 'probabilidade', 'data_predicao')
    list_filter = ('risco_evasao',)