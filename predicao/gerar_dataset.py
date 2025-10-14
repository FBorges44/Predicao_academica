import numpy as np
import pandas as pd

def generate_synthetic_student_data(n=1000, random_seed=42):
    np.random.seed(random_seed)
    # Demografia
    genders = np.random.choice(['M', 'F'], size=n, p=[0.55, 0.45])
    ages = np.random.randint(17, 31, size=n)
    enrollment_year = np.random.choice([2019, 2020, 2021, 2022, 2023, 2024], size=n,
                                       p=[0.05, 0.05, 0.15, 0.25, 0.30, 0.20])
    socioeconomic_status = np.random.choice(['low', 'medium', 'high'], size=n, p=[0.35, 0.45, 0.20])
    parental_education = np.random.choice(['none', 'primary', 'secondary', 'bachelor', 'master+'],
                                          size=n, p=[0.05, 0.25, 0.35, 0.25, 0.10])
    internet_access = np.random.choice([0, 1], size=n, p=[0.15, 0.85])
    scholarship = np.random.choice([0, 1], size=n, p=[0.80, 0.20])
    extracurricular = np.random.choice([0, 1], size=n, p=[0.60, 0.40])

    # Acadêmicos / uso da plataforma
    gpa = np.clip(np.round(np.random.normal(2.8, 0.8, size=n), 2), 0, 4.0)
    attendance = np.clip(np.round(np.random.normal(0.82, 0.12, size=n), 2), 0, 1.0)
    failed_courses = np.random.poisson(lam=0.6, size=n)
    study_hours = np.clip(np.round(np.random.normal(12, 6, size=n), 1), 0, 60)
    commute_mins = np.clip(np.random.normal(25, 18, size=n).astype(int), 0, 240)

    # Novas colunas de uso de plataforma / engajamento
    num_forum_posts = np.random.poisson(lam=5, size=n)  # média de postagens
    assignments_submitted = np.random.randint(0, 20, size=n)  # quantas atividades entregues
    last_login_days_ago = np.random.randint(0, 60, size=n)  # dias desde o último login

    # Gerar probabilidade de evasão (modelo simples)
    risk_raw = (
        (2.5 - gpa) * 1.6
        + (0.85 - attendance) * 2.0
        + failed_courses * 0.7
        + (socioeconomic_status == 'low') * 1.0
        - (socioeconomic_status == 'high') * 0.6
        + (internet_access == 0) * 0.9
        + (study_hours < 5) * 0.8
        + (scholarship == 1) * -0.4
        + (num_forum_posts < 2) * 0.5  # quem quase não posta no fórum tem risco adicional
        + (assignments_submitted < 3) * 0.7
        + (last_login_days_ago > 30) * 0.8
    )
    prob = 1 / (1 + np.exp(-0.9 * (risk_raw - 0.7)))
    dropout = (np.random.rand(n) < prob).astype(int)

    # Montar DataFrame
    df = pd.DataFrame({
        'student_id': [f"S{100000 + i}" for i in range(n)],
        'gender': genders,
        'age': ages,
        'enrollment_year': enrollment_year,
        'socioeconomic_status': socioeconomic_status,
        'parental_education': parental_education,
        'internet_access': internet_access,
        'scholarship': scholarship,
        'extracurricular': extracurricular,
        'gpa': gpa,
        'attendance_rate': attendance,
        'failed_courses': failed_courses,
        'study_hours_per_week': study_hours,
        'commute_minutes': commute_mins,
        'num_forum_posts': num_forum_posts,
        'assignments_submitted': assignments_submitted,
        'last_login_days_ago': last_login_days_ago,
        'dropout': dropout
    })

    return df

if __name__ == '__main__':
    df = generate_synthetic_student_data(n=1000)
    output_path = 'synthetic_student_dropout_full.csv'
    df.to_csv(output_path, index=False)
    print(f"Arquivo salvo em: {output_path}")
    print(df.head(10))
    print("\nDistribuição do rótulo dropout:")
    print(df['dropout'].value_counts())
