# backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    # A página principal continua igual
    path('', TemplateView.as_view(template_name='Index.html'), name='home'),
    
    # CORREÇÃO: Especificamos o caminho completo para o template
    path('alunos_risco/', TemplateView.as_view(template_name='alunos_risco/alunos_risco.html'), name='alunos_risco'),
    path('relatorios/', TemplateView.as_view(template_name='relatorios/relatorios.html'), name='relatorios'),
    path('configuracoes/', TemplateView.as_view(template_name='configuracoes/configuracoes.html'), name='relatorios'),
    path('adicionar_aluno/', TemplateView.as_view(template_name='adicionar_aluno/adicionar_aluno.html'), name='adicionar_aluno'),


    
    path('admin/', admin.site.urls),
    path('api/', include('predicao.urls')),
]