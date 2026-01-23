import sys
sys.stdout.reconfigure(encoding='utf-8')
import requests
from collections import defaultdict
import time

SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal" 
}

def get_all_products():
    print("... Buscando produtos ...")
    products = []
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/produtos?select=id,nome&offset={offset}&limit={limit}"
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Erro ao buscar: {response.text}")
            break
        data = response.json()
        if not data:
            break
        products.extend(data)
        offset += limit
    return products

def remove_duplicates():
    products = get_all_products()
    
    # Agrupar por nome
    groups = defaultdict(list)
    for p in products:
        if p.get('nome'):
            groups[p['nome'].strip()].append(p['id'])
            
    duplicates_groups = {name: ids for name, ids in groups.items() if len(ids) > 1}
    
    print(f"\nEncontrados {len(duplicates_groups)} grupos de duplicatas.")
    
    total_removed = 0
    
    for name, ids in duplicates_groups.items():
        # Ordenar IDs para manter sempre o mesmo critério (ex: menor ID é o original)
        ids.sort()
        keep_id = ids[0]
        remove_ids = ids[1:]
        
        print(f"\nProcessando: {name}")
        print(f"   Manter: {keep_id}")
        print(f"   Remover: {remove_ids}")
        
        # 1. Mover precos dos duplicados para o original
        # UPDATE precos SET produto_id = keep_id WHERE produto_id IN (remove_ids)
        # Supabase REST não suporta IN muito bem em update com filtro complexo de uma vez só as vezes,
        # vamos fazer um loop ou usar filtro 'in'
        
        ids_str = f"({','.join(map(str, remove_ids))})"
        # Filter format for postgrest: produto_id=in.(id1,id2)
        filter_val = f"in.({','.join(map(str, remove_ids))})"
        
        url_update = f"{SUPABASE_URL}/rest/v1/precos?produto_id={filter_val}"
        payload = {"produto_id": keep_id}
        
        print("   -> Movendo preços...")
        resp_up = requests.patch(url_update, headers=headers, json=payload)
        
        if resp_up.status_code not in [200, 204]:
            print(f"   ❌ Erro ao mover preços: {resp_up.text}")
            continue
            
        # 2. Deletar produtos duplicados
        # DELETE FROM produtos WHERE id IN (remove_ids)
        url_delete = f"{SUPABASE_URL}/rest/v1/produtos?id={filter_val}"
        
        print("   -> Removendo produtos duplicados...")
        resp_del = requests.delete(url_delete, headers=headers)
        
        if resp_del.status_code not in [200, 204]:
            print(f"   ❌ Erro ao deletar produtos: {resp_del.text}")
        else:
            print(f"   ✅ Sucesso! {len(remove_ids)} removidos.")
            total_removed += len(remove_ids)
            
    print(f"\n🏁 Limpeza concluída. Total de produtos removidos: {total_removed}")

if __name__ == "__main__":
    remove_duplicates()
