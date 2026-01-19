import requests
import json
import sys

SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"
headers = { "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}" }

def check():
    sys.stdout.reconfigure(encoding='utf-8')
    ids = [2, 71] # 2 (Shopee/Senior?), 71 (Amazon/Adult?)
    
    print(f"Verificando lojas para IDs: {ids}")
    
    for pid in ids:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/produtos?id=eq.{pid}&select=nome,precos(loja,preco,link_afiliado)", headers=headers)
        data = r.json()
        if data:
            p = data[0]
            print(f"\nID {pid}: {p['nome']}")
            for preco in p.get('precos', []):
                print(f"   - Loja: '{preco['loja']}' | R$ {preco['preco']}")

if __name__ == "__main__":
    check()
