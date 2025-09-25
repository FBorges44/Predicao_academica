"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# backend/urls.py
# backend/backend/urls.py

# backend/backend/urls.py

from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView # <-- Verifique se o import está aqui

urlpatterns = [
    # Verifique se esta linha está aqui para servir o index.html
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
     # ADICIONE ESTA NOVA LINHA
    path('alunos_risco/', TemplateView.as_view(template_name='alunos_risco.html'), name='alunos_risco'),
    
    path('admin/', admin.site.urls),
    path('api/', include('predicao.urls')),
]
