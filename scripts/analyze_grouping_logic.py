import sys
sys.stdout.reconfigure(encoding='utf-8')
import requests
from collections import defaultdict
import re

# ==========================================
# LÓGICA REPLICADA DE: src/lib/utils.ts
# ==========================================

def definir_grupo(nome):
    if not nome: return "Produto Sem Nome"
    n = nome.lower()

    # Espécie
    especie = ''
    if any(x in n for x in ['gato', 'felino', 'cat ', 'feline']): especie = 'Gatos'
    elif any(x in n for x in ['cão', 'cães', 'cachorro', 'dog', 'canino']): especie = 'Cães'

    # Fase
    fase = ''
    if any(x in n for x in ['filhote', 'puppy', 'kitten', 'junior']): fase = 'Filhotes'
    elif any(x in n for x in ['senior', 'idoso', '7+', 'mature']): fase = 'Sênior'
    elif any(x in n for x in ['castrado', 'sterili']): fase = 'Castrados'
    elif any(x in n for x in ['light', 'obeso', 'peso']): fase = 'Light'
    elif 'adult' in n: fase = 'Adultos'

    # Porte (cães)
    porte = ''
    if any(x in n for x in ['pequeno', 'small', 'mini', 'toy']): porte = 'Peq.'
    elif any(x in n for x in ['médio', 'medio', 'medium']): porte = 'Méd.'
    elif any(x in n for x in ['gigante', 'giant', 'maxi']): porte = 'Gig.'
    elif any(x in n for x in ['grande', 'large']): porte = 'Gde.'

    # Sabor
    sabor = ''
    sabores_map = {
        'frango': 'Frango', 'carne': 'Carne', 'salmão': 'Salmão', 'salmon': 'Salmão',
        'cordeiro': 'Cordeiro', 'peru': 'Peru', 'peixe': 'Peixe', 'vegetal': 'Vegetais',
        'arroz': 'Arroz'
    }
    for k, v in sabores_map.items():
        if k in n:
            sabor = v
            break

    # === MARCAS ===

    if 'nexgard' in n:
        tipo = "Spectra" if 'spectra' in n else ""
        is3Pack = bool(re.search(r'(?:3\s*(?:uni|tab|comp|dos|caps)|cx\s*3|pack\s*3|c\/\s*3|c\/3)', n))
        qtd = "3 Comp." if is3Pack else "1 Comp."
        return f"NexGard {tipo} {qtd}".strip()

    if 'bravecto' in n:
        tipo = "Transdermal" if any(x in n for x in ['transdermal', 'pipeta', 'topico']) else "Mastigável"
        animal = f"para {especie}" if especie else ""
        return f"Bravecto {tipo} {animal}".strip()

    if 'simparic' in n:
        is3Pack = bool(re.search(r'(?:3\s*(?:uni|tab|comp|dos|caps)|cx\s*3|pack\s*3|c\/\s*3|c\/3)', n))
        qtd = "3 Comp." if is3Pack else "1 Comp."
        return f"Simparic {qtd}"

    if 'golden' in n:
        linha = ''
        if 'special' in n: linha = 'Special'
        elif 'formula' in n or 'fórmula' in n: linha = 'Fórmula'
        elif 'selecao' in n or 'seleção' in n: linha = 'Seleção Natural'
        elif 'mega' in n: linha = 'Mega'
        
        partes = ['Ração Golden', linha, sabor, fase, porte, f"para {especie}" if especie else '']
        return ' '.join([p for p in partes if p])

    if 'premier' in n:
        linha = ''
        if 'formula' in n or 'fórmula' in n: linha = 'Fórmula'
        elif 'especifica' in n or 'raça' in n: linha = 'Raças Específicas'
        elif 'nattu' in n: linha = 'Nattu'
        elif 'cookie' in n: linha = 'Cookie'
        
        partes = ['Ração Premier', linha, sabor, fase, porte, f"para {especie}" if especie else '']
        return ' '.join([p for p in partes if p])

    # Fallback básico
    nome_grupo = n
    nome_grupo = re.sub(r'\d+[.,]?\d*\s*kg', '', nome_grupo)
    nome_grupo = re.sub(r'\d+[.,]?\d*\s*g\b', '', nome_grupo)
    return nome_grupo.strip().title()

# ==========================================
# END LOGIC REPLICATION
# ==========================================

SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def analyze():
    print("🔍 Baixando produtos para análise...")
    offset = 0
    limit = 1000
    products = []
    
    while True:
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/produtos?select=nome&offset={offset}&limit={limit}", headers=headers)
        if resp.status_code != 200: break
        data = resp.json()
        if not data: break
        products.extend(data)
        offset += limit

    print(f"✅ {len(products)} produtos baixados.")
    
    grupos = defaultdict(list)
    for p in products:
        nome = p['nome']
        g = definir_grupo(nome)
        grupos[g].append(nome)

    # Análise de Grupos suspeitos (Heterogêneos)
    print("\n🧐 Analisando consistência dos grupos...")
    
    suspicious_groups = []
    
    for g_nome, items in grupos.items():
        if len(items) < 2: continue
        
        # Heurística: Se um grupo tem itens muito diferentes entre si
        # Ex: "Ração X" e "Shampoo X" (improvável com a lógica atual, mas possível)
        # Ou marcas diferentes
        
        first = items[0].lower()
        if 'cão' in first:
            if any('gato' in x.lower() for x in items):
                suspicious_groups.append((g_nome, "Mistura Cão/Gato", items))
                continue
                
        if 'ração' in first:
            if any('shampoo' in x.lower() or 'brinquedo' in x.lower() for x in items):
                suspicious_groups.append((g_nome, "Mistura Tipo Produto", items))
                continue

    # Gerar Relatório Visual
    with open("grouping_report.txt", "w", encoding="utf-8") as f:
        f.write("📊 RELATÓRIO DE AGRUPAMENTO\n")
        f.write("="*50 + "\n\n")
        
        if suspicious_groups:
            f.write(f"⚠️  GRUPOS SUSPEITOS ({len(suspicious_groups)}):\n")
            for g, motivo, items in suspicious_groups:
                f.write(f"\n📛 Grupo: [{g}] ({motivo})\n")
                for i in items[:5]:
                    f.write(f"   - {i}\n")
                if len(items) > 5: f.write("   ...\n")
        else:
            f.write("✅ Nenhum erro óbvio de mistura de espécies ou tipos encontrado.\n\n")
            
        f.write("🔍 AMOSTRA DE GRUPOS (Para validação visual):\n")
        sorted_groups = sorted(grupos.items(), key=lambda x: len(x[1]), reverse=True)
        
        for g, items in sorted_groups[:20]:
            f.write(f"\n📂 Grupo: [{g}] ({len(items)} itens)\n")
            # Mostrar itens únicos para facilitar leitura
            unique_items = sorted(list(set(items)))
            for i in unique_items[:10]:
                f.write(f"   - {i}\n")
            if len(unique_items) > 10:
                f.write(f"   ... (+{len(unique_items)-10})\n")

    print("\n✅ Relatório gerado em 'grouping_report.txt'. Leia este arquivo para ver os exemplos.")

if __name__ == "__main__":
    analyze()
