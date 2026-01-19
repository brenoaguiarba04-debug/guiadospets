"""
Verifica se as URLs das imagens são acessíveis (200 OK)
"""
import requests
from concurrent.futures import ThreadPoolExecutor
import time

SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"

def supabase_request(method, table, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, params=params, timeout=10)
        return resp.json() if resp.text else None
    except:
        return None

def check_url(produto):
    url = produto.get('imagem_url')
    if not url: return None
    
    try:
        # Fake user agent to avoid blocking
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.head(url, headers=headers, timeout=5)
        
        if r.status_code != 200:
            # Tenta GET se HEAD falhar
            r = requests.get(url, headers=headers, timeout=5, stream=True)
            r.close()
            
        if r.status_code != 200:
            return (produto['id'], produto['nome'], url, r.status_code)
            
    except Exception as e:
        return (produto['id'], produto['nome'], url, str(e))
        
    return None

def main():
    print("🔍 Verificando acessibilidade das imagens...")
    
    all_products = []
    offset = 0
    while True:
        p = supabase_request("GET", "produtos", params={"select": "id,nome,imagem_url", "offset": f"{offset}", "limit": "1000"})
        if not p: break
        all_products.extend(p)
        offset += 1000
    
    print(f"📋 Total de produtos: {len(all_products)}")
    
    broken = []
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(check_url, p) for p in all_products if p.get('imagem_url')]
        
        for future in futures:
            res = future.result()
            if res:
                broken.append(res)
                print(f"❌ Quebrada: {res[1][:30]}... -> {res[3]}")
    
    print("-" * 50)
    print(f"✅ Válidas: {len(all_products) - len(broken)}")
    print(f"❌ Quebradas: {len(broken)}")
    
    if broken:
        print("\nExemplos de quebradas:")
        for b in broken[:5]:
            print(f"- {b[1]}: {b[2]} ({b[3]})")

if __name__ == "__main__":
    main()
