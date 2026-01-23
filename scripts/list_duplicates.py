import sys
sys.stdout.reconfigure(encoding='utf-8')
import requests
from collections import Counter

SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def get_all_products():
    print("... Buscando produtos ...")
    products = []
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/produtos?select=nome&offset={offset}&limit={limit}"
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            break
        data = response.json()
        if not data:
            break
        products.extend(data)
        offset += limit
    return products

def list_duplicates():
    products = get_all_products()
    names = [p['nome'].strip() for p in products if p.get('nome')]
    counts = Counter(names)
    duplicates = sorted([name for name, count in counts.items() if count > 1])
    
    print(f"\nTotal de duplicatas: {len(duplicates)}")
    print("-" * 40)
    for name in duplicates:
        print(f"- {name} ({counts[name]}x)")
    print("-" * 40)

if __name__ == "__main__":
    list_duplicates()
