"""
Inspeciona produtos no Supabase para ver o estado das imagens
"""
import requests
import json

SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"

def inspect():
    url = f"{SUPABASE_URL}/rest/v1/produtos"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    # Pega os primeiros 50 produtos
    resp = requests.get(url, headers=headers, params={"select": "id,nome,imagem_url", "limit": "50"})
    produtos = resp.json()
    
    print(f"Total inspecionado: {len(produtos)}")
    print("-" * 50)
    
    sem_foto = 0
    com_foto = 0
    urls_estranhas = 0
    
    for p in produtos:
        img = p.get('imagem_url')
        print(f"[{p['id']}] {p['nome'][:30]}... -> {img}")
        
        if not img:
            sem_foto += 1
        elif len(str(img)) < 20 or "data:image" in str(img):
            urls_estranhas += 1
        else:
            com_foto += 1
            
    print("-" * 50)
    print(f"Sem foto (None/Empty): {sem_foto}")
    print(f"Com foto válida: {com_foto}")
    print(f"URLs suspeitas: {urls_estranhas}")

if __name__ == "__main__":
    inspect()
