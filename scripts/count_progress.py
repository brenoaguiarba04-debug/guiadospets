import requests

SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"

def check():
    url = f"{SUPABASE_URL}/rest/v1/produtos"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    
    # Busca apenas id e imagem
    all_products = []
    offset = 0
    while True:
        r = requests.get(url, headers=headers, params={"select": "id,imagem_url", "offset": f"{offset}", "limit": "1000"})
        data = r.json()
        if not data: break
        all_products.extend(data)
        offset += 1000
    
    valid = 0
    invalid = 0
    
    for p in all_products:
        img = str(p.get('imagem_url') or '')
        if (not img or img.lower() == 'none' or img.strip() == '' or len(img) < 20 or 'data:image' in img):
             invalid += 1
        else:
             valid += 1
             
    print(f"Total: {len(all_products)}")
    print(f"Válidas (formato): {valid}")
    print(f"Inválidas/Faltantes (formato): {invalid}")

if __name__ == "__main__":
    check()
