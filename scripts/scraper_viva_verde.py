"""
Scraper dedicado para Areia Viva Verde
Busca em: Cobasi, Petlove, Petz, Mercado Livre
"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
import time
import requests
import re

# Configuração do Supabase
SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"

def supabase_request(method, table, data=None, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    if method == "GET":
        return requests.get(url, headers=headers, params=params).json()
    elif method == "POST":
        return requests.post(url, headers=headers, json=data).json()
    return None

def criar_driver():
    options = uc.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    # Comentado para ver o browser abrindo
    # options.add_argument("--headless") 
    driver = uc.Chrome(options=options, use_subprocess=True)
    return driver

def extrair_preco(texto):
    if not texto: return None
    match = re.search(r'(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))', texto.replace(' ', ''))
    if match:
        return float(match.group(1).replace('.', '').replace(',', '.'))
    return None

def buscar_loja(driver, nome_loja, url_busca, seletores):
    print(f"\n🔎 {nome_loja.upper()}: Buscando Viva Verde...")
    produtos = []
    
    try:
        driver.get(url_busca)
        time.sleep(5)
        driver.execute_script("window.scrollTo(0, 600);")
        time.sleep(2)
        
        items = []
        for sel in seletores:
            items = driver.find_elements(By.CSS_SELECTOR, sel)
            if items: break
            
        print(f"   Encontrados {len(items)} items na página")
            
        for item in items[:6]: # Pega os top 6
            try:
                # Nome
                nome = ""
                for tag in ['h2', 'h3', 'a[class*="name"]', 'p', 'span[class*="title"]']:
                    try:
                        el = item.find_element(By.CSS_SELECTOR, tag)
                        if "viva verde" in el.text.lower():
                            nome = el.text.strip()
                            break
                    except: continue
                
                if not nome: continue
                
                # Preço
                preco = None
                for tag in ["[class*='price']", "[class*='Price']", "[class*='valor']", "span.andes-money-amount__fraction"]:
                    try:
                        el = item.find_element(By.CSS_SELECTOR, tag)
                        p = extrair_preco(el.text)
                        if p and p > 20: # Areia viva verde custa mais que 20
                            preco = p
                            break
                    except: continue
                    
                if not preco: continue

                # Link
                link = None
                try:
                    # Tenta achar todos os links dentro do card
                    links_card = item.find_elements(By.TAG_NAME, 'a')
                    for l_el in links_card:
                        h = l_el.get_attribute('href')
                        if h and len(h) > 5 and "javascript" not in h and h != "#":
                            link = h
                            break # Achou um link válido
                    
                    # Se não achou dentro, verifica se o próprio item é um link
                    if not link and item.tag_name == 'a':
                       link = item.get_attribute('href')

                    if link:
                        if link.startswith('//'): link = "https:" + link
                        elif link.startswith('/'): 
                             if "cobasi" in url_busca: link = f"https://www.cobasi.com.br{link}"
                             elif "petz" in url_busca: link = f"https://www.petz.com.br{link}"
                             elif "petlove" in url_busca: link = f"https://www.petlove.com.br{link}"
                        
                        # Limpeza final
                        if not link.startswith('http'): link = None
                except: pass

                # Imagem
                img = None
                try:
                    el = item.find_element(By.TAG_NAME, 'img')
                    img = el.get_attribute('src')
                except: pass

                if nome and preco and link:
                    produtos.append({
                        'nome': nome,
                        'preco': preco,
                        'link': link,
                        'imagem': img,
                        'loja': nome_loja
                    })
                    print(f"   ✅ {nome_loja}: R$ {preco:.2f} - {nome[:30]}...")

            except Exception as e:
                continue
                
    except Exception as e:
        print(f"   ❌ Erro em {nome_loja}: {e}")
        
    return produtos

def salvar_produto(produto):
    # Tenta achar produto "Viva Verde" genérico ou cria
    params = {"nome": "ilike.*Viva Verde*", "select": "id"}
    existentes = supabase_request("GET", "produtos", params=params)
    
    produto_id = None
    if existentes:
        produto_id = existentes[0]['id']
    else:
        # Cria produto
        novo = supabase_request("POST", "produtos", {
            "nome": "Areia Higiênica Viva Verde", # Nome padronizado
            "marca": "Viva Verde",
            "categoria": "Higiene",
            "imagem_url": produto['imagem']
        })
        if novo: produto_id = novo[0]['id']
    
    if produto_id:
        # Salva preço
        supabase_request("POST", "precos", {
            "produto_id": produto_id,
            "loja": produto['loja'],
            "preco": produto['preco'],
            "link_afiliado": produto['link']
        })
        print(f"   💾 Preço salvo no banco!")

def main():
    print("=== BUSCA EXPRESSA: AREIA VIVA VERDE ===")
    driver = criar_driver()
    
    termo = "areia viva verde"
    
    try:
        # 1. Cobasi
        prods = buscar_loja(driver, "Cobasi", 
            f"https://www.cobasi.com.br/{termo.replace(' ', '%20')}",
            ["div[class*='ProductCard']", "article"])
        for p in prods: salvar_produto(p)

        # 2. Petlove (Estratégia Reforçada)
        print("\n🔎 PETLOVE: Buscando Viva Verde (Modo Reforçado)...")
        try:
            url_petlove = f"https://www.petlove.com.br/busca?q={termo.replace(' ', '%20')}"
            driver.get(url_petlove)
            time.sleep(8)
            driver.execute_script("window.scrollTo(0, 600);")
            time.sleep(2)
            
            # Tenta pegar qualquer card que tenha link
            cards = driver.find_elements(By.TAG_NAME, "a")  # Petlove usa o card inteiro como link as vezes
            print(f"   Encontrados {len(cards)} links candidatos")
            
            count_petlove = 0
            ids_vistos = set()
            
            for card in cards:
                try:
                    texto = card.text
                    href = card.get_attribute("href")
                    
                    if not href or "petlove.com.br" not in href: continue
                    if "viva" not in texto.lower() and "verde" not in texto.lower(): continue
                    if href in ids_vistos: continue
                    
                    # Se achou viva verde no texto ou link
                    nome = ""
                    if "viva verde" in texto.lower():
                        nome = texto.split('\n')[0] # Geralmente a primeira linha é o nome
                    else:
                        continue # Precisa ter o nome no card
                        
                    preco = extrair_preco(texto)
                    if not preco or preco < 20: continue # Filtro de lixo
                    
                    ids_vistos.add(href)
                    
                    p = {
                        'nome': nome[:100],
                        'preco': preco,
                        'link': href,
                        'imagem': None, # Imagem é difícil pegar assim, mas link+preço é o essencial
                        'loja': 'Petlove'
                    }
                    salvar_produto(p)
                    print(f"   ✅ Petlove: R$ {preco:.2f} - {nome[:30]}...")
                    count_petlove += 1
                    if count_petlove >= 3: break
                    
                except: continue
                
            if count_petlove == 0:
                print("   ⚠️ Petlove: Nenhum produto encontrado com estratégia reforçada")
                
        except Exception as e:
            print(f"   ❌ Erro Petlove: {e}")
        
        # 3. Petz
        prods = buscar_loja(driver, "Petz", 
            f"https://www.petz.com.br/busca?q={termo.replace(' ', '%20')}",
            ["div[class*='ProductCard']", "li[class*='product']"])
        for p in prods: salvar_produto(p)

        # 4. Mercado Livre
        prods = buscar_loja(driver, "Mercado Livre", 
            f"https://lista.mercadolivre.com.br/{termo.replace(' ', '-')}",
            ["li.ui-search-layout__item"])
        for p in prods: salvar_produto(p)

    finally:
        driver.quit()
        print("\n🏁 Finalizado!")

if __name__ == "__main__":
    main()
