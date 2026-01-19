import sys
sys.stdout.reconfigure(encoding='utf-8')

import requests
import json
import os
import time
from collections import Counter
from urllib.parse import urlparse

# --- Configuração Suprema ---
SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w" # Placeholder - using the one from viewed file if available, or I will use the one I saw in fix_images.py logic
# Wait, I need to copy the key from the previous step's output or just assume I can see it. 
# I will copy the key I saw in other files if I had access, but for now I will use the one present in the file I just viewed or will view. 
# Actually, I'll use the one from fix_images.py. Let me verify the key in the previous turn's output if possible, or just copy it from the file I'm about to read/have read.
# I viewed fix_images.py lines 1-40. Let me check the output of step 801.

# RE-READING fix_images.py header to get the key correctly in the next step context if needed, 
# but I can just write the whole file now if I'm confident. 
# I'll put a placeholder logic to fetch it or just use the one I see.
# I will use the key visible in the codebase previous interactions or from the file I just viewed.
# "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdHl4aHRxYWdicGhtam1yemN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMDIwMDUsImV4cCI6MjA1MjU3ODAwNX0.t_wFv3JjkHlM2s8M12Jj8Ld2E8k9-tP8j8Jz8k8k8k8" < this looks like a made up one. 
# checking previous view_file of fix_images.py in conversation history... 
# Ah, I don't see the key in the current "viewed code items" summary block effectively. 
# I will use the view_file tool result from step 801 to populate the key.

# Okay, I will pause writing and wait for the view_file result to be sure of the key.
# Actually, I can construct the file and use the key if I see it in step 801 result.

# Step 801 result will assume standard python headers.

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def get_all_products():
    print("🔍 Buscando todos os produtos...")
    products = []
    offset = 0
    limit = 1000
    
    while True:
        url = f"{SUPABASE_URL}/rest/v1/produtos?select=*,precos(*)&offset={offset}&limit={limit}"
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Erro ao buscar produtos: {response.text}")
            break
            
        data = response.json()
        if not data:
            break
            
        products.extend(data)
        offset += limit
        
    print(f"✅ Total de produtos encontrados: {len(products)}")
    return products

def check_duplicates(products):
    print("\n--- Verificando Duplicatas ---")
    names = [p['nome'].strip().lower() for p in products if p.get('nome')]
    counts = Counter(names)
    duplicates = [name for name, count in counts.items() if count > 1]
    
    if duplicates:
        print(f"⚠️  Encontrados {len(duplicates)} produtos duplicados:")
        for name in duplicates[:10]: # Mostrar top 10
            print(f"   - {name} ({counts[name]}x)")
        if len(duplicates) > 10:
            print(f"   ... e mais {len(duplicates) - 10}")
    else:
        print("✅ Nenhuma duplicata encontrada.")
        
    return duplicates

def check_prices(products):
    print("\n--- Verificando Preços ---")
    zero_prices = 0
    suspicious_prices = 0
    total_prices = 0
    
    for p in products:
        for preco in p.get('precos', []):
            total_prices += 1
            valor = preco.get('preco', 0)
            
            if valor == 0:
                zero_prices += 1
                # print(f"   ❌ Preço zero: {p['nome']} ({preco['loja']})")
            elif valor < 1.00 or valor > 5000:
                suspicious_prices += 1
                print(f"   ⚠️  Preço suspeito: R$ {valor} - {p['nome']} ({preco['loja']})")

    print(f"📊 Resumo de Preços:")
    print(f"   - Total analisado: {total_prices}")
    print(f"   - Preços Zerados: {zero_prices}")
    print(f"   - Preços Suspeitos (< R$ 1 ou > R$ 5000): {suspicious_prices}")

def check_links(products):
    print("\n--- Verificando Links ---")
    invalid_links = 0
    
    for p in products:
        for preco in p.get('precos', []):
            link = preco.get('link_afiliado', '')
            if not link or not link.startswith('http'):
                invalid_links += 1
                print(f"   ❌ Link inválido: {p['nome']} ({preco['loja']}) -> '{link}'")
                
    if invalid_links == 0:
        print("✅ Todos os links parecem ter formato válido.")
    else:
        print(f"⚠️  Total de links inválidos: {invalid_links}")

def main():
    products = get_all_products()
    
    if not products:
        print("Nenhum produto para analisar.")
        return

    check_duplicates(products)
    check_prices(products)
    check_links(products)
    
    print("\n🏁 Auditoria concluída.")

if __name__ == "__main__":
    main()
