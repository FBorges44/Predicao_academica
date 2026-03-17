import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from predicao.models import Aluno, PredicaoEvasao

# Lista de alunos de teste
alunos_teste = [
    {
        "matricula": "20231001",
        "nome": "João Silva",
        "dados": {
            "frequencia_media": 45.5,
            "rendimento_medio": 4.2,
            "disciplinas_reprovadas": 3,
            "sexo": "M",
            "bairro": "Centro"
        },
        "probabilidade": 0.85,
        "risco": True
    },
    {
        "matricula": "20231002",
        "nome": "Maria Santos",
        "dados": {
            "frequencia_media": 92.0,
            "rendimento_medio": 8.5,
            "disciplinas_reprovadas": 0,
            "sexo": "F",
            "bairro": "Zona Sul"
        },
        "probabilidade": 0.15,
        "risco": False
    },
    {
        "matricula": "20231003",
        "nome": "Pedro Oliveira",
        "dados": {
            "frequencia_media": 65.0,
            "rendimento_medio": 6.0,
            "disciplinas_reprovadas": 1,
            "sexo": "M",
            "bairro": "Zona Norte"
        },
        "probabilidade": 0.52,
        "risco": True
    },
    {
        "matricula": "20231004",
        "nome": "Ana Costa",
        "dados": {
            "frequencia_media": 88.0,
            "rendimento_medio": 7.8,
            "disciplinas_reprovadas": 0,
            "sexo": "F",
            "bairro": "Zona Leste"
        },
        "probabilidade": 0.22,
        "risco": False
    },
    {
        "matricula": "20231005",
        "nome": "Carlos Mendes",
        "dados": {
            "frequencia_media": 38.0,
            "rendimento_medio": 3.5,
            "disciplinas_reprovadas": 4,
            "sexo": "M",
            "bairro": "Subúrbio"
        },
        "probabilidade": 0.92,
        "risco": True
    },
    {
        "matricula": "20231006",
        "nome": "Beatriz Lima",
        "dados": {
            "frequencia_media": 95.0,
            "rendimento_medio": 9.2,
            "disciplinas_reprovadas": 0,
            "sexo": "F",
            "bairro": "Centro"
        },
        "probabilidade": 0.08,
        "risco": False
    },
    {
        "matricula": "20231007",
        "nome": "Rafael Souza",
        "dados": {
            "frequencia_media": 58.0,
            "rendimento_medio": 5.5,
            "disciplinas_reprovadas": 2,
            "sexo": "M",
            "bairro": "Zona Oeste"
        },
        "probabilidade": 0.68,
        "risco": True
    },
    {
        "matricula": "20231008",
        "nome": "Juliana Ferreira",
        "dados": {
            "frequencia_media": 82.0,
            "rendimento_medio": 7.2,
            "disciplinas_reprovadas": 1,
            "sexo": "F",
            "bairro": "Zona Sul"
        },
        "probabilidade": 0.35,
        "risco": False
    },
]

def inserir_dados():
    print("🔄 Iniciando inserção de dados de teste...\n")
    
    # Limpar dados anteriores (opcional - remova se quiser manter dados existentes)
    # PredicaoEvasao.objects.all().delete()
    # Aluno.objects.all().delete()
    # print("✅ Dados anteriores removidos\n")
    
    for aluno_data in alunos_teste:
        # Criar ou atualizar aluno
        aluno, criado = Aluno.objects.update_or_create(
            matricula=aluno_data["matricula"],
            defaults={
                'nome': aluno_data["nome"],
                'dados_json': aluno_data["dados"]
            }
        )
        
        # Criar ou atualizar predição
        predicao, criado_pred = PredicaoEvasao.objects.update_or_create(
            aluno=aluno,
            defaults={
                'risco_evasao': aluno_data["risco"],
                'probabilidade': aluno_data["probabilidade"]
            }
        )
        
        status = "✨ CRIADO" if criado else "🔄 ATUALIZADO"
        risco_emoji = "🔴" if aluno_data["risco"] else "🟢"
        
        print(f"{status} - {aluno_data['nome']} ({aluno_data['matricula']})")
        print(f"   {risco_emoji} Probabilidade: {aluno_data['probabilidade']*100:.1f}%")
        print(f"   📊 Freq: {aluno_data['dados']['frequencia_media']}% | "
              f"Rend: {aluno_data['dados']['rendimento_medio']} | "
              f"Reprov: {aluno_data['dados']['disciplinas_reprovadas']}\n")
    
    print("=" * 60)
    print(f"✅ CONCLUÍDO! {len(alunos_teste)} alunos inseridos com sucesso!")
    print(f"🔴 Alto Risco: {sum(1 for a in alunos_teste if a['risco'])} alunos")
    print(f"🟢 Baixo Risco: {sum(1 for a in alunos_teste if not a['risco'])} alunos")
    print("=" * 60)
    print("\n🌐 Acesse: http://localhost:8000/ para visualizar no dashboard")

if __name__ == "__main__":
    inserir_dados()