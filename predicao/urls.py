# predicao/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlunoViewSet
from .views_chat import chat_view

router = DefaultRouter()
router.register(r'alunos', AlunoViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('chat/', chat_view, name='chat'),  # ← /api/chat/
]