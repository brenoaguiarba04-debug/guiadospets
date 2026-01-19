import requests
from collections import defaultdict
import re

# Replicando a lógica do utils.ts (simplificada para Python)
def extrair_peso(nome):
    n = nome.lower()
    match_kg = re.search(r'(\d+[.,]?\d*)\s*kg', n)
    if match_kg: return f"{match_kg.group(1).replace(',', '.')}kg"
    
    match_mg = re.search(r'(\d+)\s*mg', n)
    if match_mg: return f"{match_mg.group(1)}mg"
    
    return "Ver"

def definir_grupo(nome):
    if not nome: return "Sem Nome"
    n = nome.lower()

    # Lógica de Marcas Específicas (Replicando utils.ts)
    if 'nexgard' in n:
        tipo = "Spectra" if 'spectra' in n else ""
        qtd = "3 Comp." if re.search(r'(?:3\s*uni|3\s*tab|3\s*comp|cx\s*3|pack\s*3)', n) else "1 Comp."
        return f"NexGard {tipo} {qtd}".strip()

    if 'bravecto' in n:
        tipo = "Transdermal" if any(x in n for x in ['transdermal', 'pipeta', 'topico']) else "Mastigável"
        especie = "Cães" if any(x in n for x in ['cão', 'cães', 'cachorro', 'dog']) else ("Gatos" if any(x in n for x in ['gato', 'felino']) else "")
        animal = f"para {especie}" if especie else ""
        return f"Bravecto {tipo} {animal}".strip()
    
    if 'simparic' in n:
        qtd = "3 Comp." if re.search(r'(?:3\s*uni|3\s*tab|3\s*comp)', n) else "1 Comp."
        return f"Simparic {qtd}".strip()
        
    if 'golden' in n:
        linha = ''
        if 'special' in n: linha = 'Special'
        elif 'formula' in n or 'fórmula' in n: linha = 'Fórmula'
        elif 'selecao' in n or 'seleção' in n: linha = 'Seleção Natural'
        elif 'mega' in n: linha = 'Mega'
        
        # Simplificação: Não vou replicar toda a lógica de sabor/porte aqui, 
        # mas o suficiente para ver se agrupa o principal
        return f"Ração Golden {linha}".strip()

    # Fallback genérico
    nome_grupo = re.sub(r'\d+[.,]?\d*\s*kg', '', nome, flags=re.IGNORECASE)
    nome_grupo = re.sub(r'\d+[.,]?\d*\s*g\b', '', nome_grupo, flags=re.IGNORECASE)
    nome_grupo = re.sub(r'\s+', ' ', nome_grupo).strip()
    return nome_grupo

# Config Supabase
SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def analyze():
    print("🔍 Baixando produtos...")
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/produtos?select=nome", headers=headers)
    products = resp.json()
    
    grupos = defaultdict(list)
    
    for p in products:
        nome = p['nome']
        grupo = definir_grupo(nome)
        grupos[grupo].append(nome)
        
    with open("grouping_analysis_utf8.txt", "w", encoding="utf-8") as f:
        f.write(f"📊 Análise de Agrupamento ({len(products)} produtos -> {len(grupos)} grupos)\n")
        f.write("-" * 50 + "\n")
        
        # Verificar grupos que "parecem" duplicados
        grupos_sorted = sorted(grupos.keys())
        
        possiveis_falhas = []
        
        for i in range(len(grupos_sorted) - 1):
            g1 = grupos_sorted[i]
            g2 = grupos_sorted[i+1]
            
            # Se os nomes dos grupos forem muito parecidos
            if g1 in g2 or g2 in g1: # Check simples de substring
                 possiveis_falhas.append((g1, g2))
                 
        # Verificar grupos com apenas 1 item (pode indicar falha se deveria estar agrupado)
        singles = [g for g, itens in grupos.items() if len(itens) == 1]
        
        f.write(f"🔸 Grupos com apenas 1 variação: {len(singles)} (Pode ser normal ou falha)\n")
        f.write(f"🔸 Possíveis duplicações de grupo (nomes parecidos): {len(possiveis_falhas)}\n")
        
        if possiveis_falhas:
            f.write("\n⚠️  Exemplos de possíveis falhas de agrupamento:\n")
            for g1, g2 in possiveis_falhas[:10]:
                f.write(f"   - '{g1}' vs '{g2}'\n")
                f.write(f"     (Ex: {grupos[g1][0]} vs {grupos[g2][0]})\n")
                
        f.write("\n✅ Exemplos de Sucesso:\n")
        multi_groups = {k:v for k,v in grupos.items() if len(v) > 1}
        for k in list(multi_groups.keys())[:5]:
            f.write(f"   - {k}: {len(multi_groups[k])} variações\n")
    
    print("Report written to grouping_analysis_utf8.txt")

if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    analyze()
