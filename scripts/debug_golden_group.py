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

# COPIA DA LÓGICA DO UTILS.TS (Simplificada para rodar aqui)
def definir_grupo(nome):
    if not nome: return "Sem Nome"
    n = nome.lower()
    
    # 🚫 EXCLUSÕES
    blacklist = ['brinquedo', 'mordedor', 'pelúcia', 'pelucia', 'chaveiro', 'bandana', 'adesivo', 'capa para', 'pingente']
    for termo in blacklist:
        if termo in n:
            return "Acessórios"
    
    # Detecção de Componentes
    especie = ''
    if any(x in n for x in ['gato', 'felino', 'cat ', 'feline']): especie = 'Gatos'
    elif any(x in n for x in ['cão', 'cães', 'cachorro', 'dog', 'canino']): especie = 'Cães'

    fase = ''
    if any(x in n for x in ['filhote', 'puppy', 'kitten', 'junior']): fase = 'Filhotes'
    elif any(x in n for x in ['senior', 'idoso', '7+', 'mature']): fase = 'Sênior'
    elif any(x in n for x in ['castrado', 'sterili']): fase = 'Castrados'
    elif any(x in n for x in ['light', 'obeso', 'peso']): fase = 'Light'
    elif 'adult' in n: fase = 'Adultos'

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

    # Lógica específica marcas
    if 'nexgard' in n:
        if 'spectra' in n:
             partes = ['NexGard Spectra', porte]
             return ' '.join([p for p in partes if p])
        partes = ['NexGard', porte]
        return ' '.join([p for p in partes if p])

    if 'bravecto' in n:
        if 'transdermal' in n:
             partes = ['Bravecto Transdermal', especie, porte]
             return ' '.join([p for p in partes if p])
        partes = ['Bravecto', especie, porte]
        return ' '.join([p for p in partes if p])

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

def debug():
    sys.stdout.reconfigure(encoding='utf-8')
    print("🔍 Buscando produtos NexGard...")
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/produtos?nome=ilike.*nexgard*&select=id,nome,imagem_url", headers=headers)
    products = resp.json()
    
    target_group_keyword = "NexGard Spectra"
    print(f"🎯 Grupo Alvo (Simulado): '{target_group_keyword}'\n")
    
    found = []
    
    print(f"   (Atenção: 'definir_grupo' será rodado em tempo real em todos os produtos que contêm 'nexgard')")

    for p in products:
        grupo = definir_grupo(p['nome'])
        # Se contiver NexGard Spectra no nome do grupo gerado
        if 'nexgard' in grupo.lower() and 'spectra' in grupo.lower():
            found.append({'produto': p, 'grupo_gerado': grupo})
            
    if not found:
        print("❌ Nenhum produto gerou grupo NexGard Spectra.")
    else:
        print(f"✅ Encontrados {len(found)} produtos aglomerados em grupos NexGard Spectra:")
        # Agrupar por nome do grupo
        by_group = {}
        for item in found:
            g = item['grupo_gerado']
            if g not in by_group: by_group[g] = []
            by_group[g].append(item['produto'])
            
        with open("debug_report_nexgard.txt", "w", encoding="utf-8") as f:
            for gname, items in by_group.items():
                print(f"\n📁 GRUPO: [{gname}] ({len(items)} itens)")
                f.write(f"\n📁 GRUPO: [{gname}] ({len(items)} itens)\n")
                for item in items:
                    print(f"   - ID: {item['id']} | {item['nome']}")
                    f.write(f"   - ID: {item['id']} | {item['nome']}\n")
                    f.write(f"     🖼️ {item.get('imagem_url', '')}\n")
                    if 'brinquedo' in item['nome'].lower():
                         print(f"     🚨 BRINQUEDO DETECTADO!")
                         f.write(f"     🚨 BRINQUEDO DETECTADO!\n")

if __name__ == "__main__":
    debug()
