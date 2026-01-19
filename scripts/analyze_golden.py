import requests
import re
import sys

# Config Supabase
SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

# Copiando logica exata do utils.ts/analyze_grouping_logic.py
def definir_grupo(nome):
    if not nome: return "Sem Nome"
    n = nome.lower()
    
    # Detecção de Componentes
    especie = ''
    if any(x in n for x in ['gato', 'felino', 'cat ', 'feline']): especie = 'Gatos'
    elif any(x in n for x in ['cão', 'cães', 'cachorro', 'dog', 'canino']): especie = 'Cães'

    fase = ''
    if any(x in n for x in ['filhote', 'puppy', 'kitten', 'junior']): fase = 'Filhotes'
    elif any(x in n for x in ['senior', 'idoso', '7+', 'mature']): fase = 'Sênior'

    porte = ''
    if any(x in n for x in ['pequeno', 'small', 'mini', 'toy']): porte = 'Peq.'
    elif any(x in n for x in ['médio', 'medio', 'medium']): porte = 'Méd.'
    elif any(x in n for x in ['gigante', 'giant', 'maxi']): porte = 'Gig.'
    elif any(x in n for x in ['grande', 'large']): porte = 'Gde.'

    sabor = ''
    sabores = [
        ('frango', 'Frango'), ('carne', 'Carne'), ('salmão', 'Salmão'), 
        ('salmon', 'Salmão'), ('cordeiro', 'Cordeiro'), ('peru', 'Peru'), 
        ('peixe', 'Peixe'), ('vegetal', 'Vegetais'), ('arroz', 'Arroz')
    ]
    for termo, label in sabores:
        if termo in n:
            sabor = label
            break

    # Lógica específica Golden
    if 'golden' in n:
        linha = ''
        if 'special' in n: linha = 'Special'
        elif 'formula' in n or 'fórmula' in n: linha = 'Fórmula'
        elif 'selecao' in n or 'seleção' in n: linha = 'Seleção Natural'
        elif 'mega' in n: linha = 'Mega'

        partes = ['Ração Golden', linha, sabor, fase, porte, f"para {especie}" if especie else '']
        return ' '.join([p for p in partes if p])

    return "Outros"

def analyze():
    print("🔍 Buscando produtos Golden Special...")
    # Busca um pouco mais ampla para garantir
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/produtos?nome=ilike.*golden*&select=nome", headers=headers)
    products = resp.json()
    
    # Filtra apenas Special (e "Especial" por segurança)
    golden_special = [p for p in products if 'special' in p['nome'].lower() or 'especial' in p['nome'].lower()]
    
    print(f"📦 Encontrados {len(golden_special)} produtos 'Golden Special'.\n")
    
    # Agrupar
    grupos = {}
    for p in golden_special:
        nome_original = p['nome']
        nome_grupo = definir_grupo(nome_original)
        
        if nome_grupo not in grupos:
            grupos[nome_grupo] = []
        grupos[nome_grupo].append(nome_original)
        
    # Relatório detalhado
    with open("golden_analysis.txt", "w", encoding="utf-8") as f:
        f.write(f"📊 Detalhe Golden Special ({len(golden_special)} itens)\n")
        f.write("=" * 60 + "\n\n")
        
        for grupo, itens in grupos.items():
            f.write(f"🛑 GRUPO FINAL: [{grupo}]\n")
            f.write(f"   Quantidade: {len(itens)} cards agrupados aqui\n")
            f.write("   Itens Originais:\n")
            for item in itens:
                f.write(f"     - {item}\n")
            f.write("-" * 40 + "\n")

    print("✅ Relatório salvo em 'golden_analysis.txt'")

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    analyze()
