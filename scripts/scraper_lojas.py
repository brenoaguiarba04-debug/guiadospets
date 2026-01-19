"""
Scraper robusto para Cobasi, Petlove e Petz
Usa undetected-chromedriver para bypass de proteções anti-bot
"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import json
import re
import os

# Configuração do Supabase via REST API
SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"

import requests

def supabase_request(method, table, data=None, params=None):
    """Faz requisição para Supabase REST API"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    if method == "GET":
        resp = requests.get(url, headers=headers, params=params)
    elif method == "POST":
        resp = requests.post(url, headers=headers, json=data)
    elif method == "PATCH":
        resp = requests.patch(url, headers=headers, json=data, params=params)
    
    return resp.json() if resp.text else None


def criar_driver():
    """Cria driver Chrome com undetected-chromedriver"""
    options = uc.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    # Não usar headless para melhor compatibilidade
    
    driver = uc.Chrome(options=options, use_subprocess=True)
    driver.implicitly_wait(10)
    return driver


def extrair_preco(texto):
    """Extrai preço de um texto"""
    if not texto:
        return None
    # Remove R$ e normaliza
    match = re.search(r'(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))', texto.replace(' ', ''))
    if match:
        preco_str = match.group(1)
        # Normaliza para float
        preco_str = preco_str.replace('.', '').replace(',', '.')
        try:
            return float(preco_str)
        except:
            return None
    return None


def buscar_cobasi(driver, termo):
    """Busca produtos na Cobasi"""
    print(f"\n🔎 COBASI: '{termo}'")
    produtos = []
    
    try:
        url = f"https://www.cobasi.com.br/{termo.replace(' ', '%20')}"
        driver.get(url)
        time.sleep(5)
        
        # Scroll para carregar produtos
        driver.execute_script("window.scrollTo(0, 500);")
        time.sleep(2)
        
        # Tenta múltiplos seletores
        seletores = [
            "div[class*='ProductCard']",
            "div[class*='product-card']",
            "article[class*='product']",
            "li[class*='product']",
            "[data-testid*='product']"
        ]
        
        items = []
        for sel in seletores:
            try:
                items = driver.find_elements(By.CSS_SELECTOR, sel)
                if len(items) > 0:
                    print(f"   Seletor: {sel} → {len(items)} items")
                    break
            except:
                continue
        
        for item in items[:5]:
            try:
                # Nome
                nome_el = None
                for tag in ['h2', 'h3', 'a[class*="name"]', 'span[class*="name"]', 'p']:
                    try:
                        nome_el = item.find_element(By.CSS_SELECTOR, tag)
                        if nome_el.text.strip():
                            break
                    except:
                        continue
                
                if not nome_el or not nome_el.text.strip():
                    continue
                
                # Preço
                preco = None
                preco_els = item.find_elements(By.CSS_SELECTOR, "[class*='price'], [class*='Price'], [class*='valor']")
                for pel in preco_els:
                    preco = extrair_preco(pel.text)
                    if preco and preco > 5:
                        break
                
                if not preco:
                    continue
                
                # Imagem
                img = None
                try:
                    img_el = item.find_element(By.TAG_NAME, 'img')
                    img = img_el.get_attribute('src')
                except:
                    pass
                
                # Link
                link = None
                try:
                    link_el = item.find_element(By.TAG_NAME, 'a')
                    link = link_el.get_attribute('href')
                except:
                    pass
                
                produtos.append({
                    'nome': nome_el.text.strip()[:200],
                    'preco': preco,
                    'imagem': img,
                    'link': link,
                    'loja': 'Cobasi'
                })
                print(f"   ✅ R$ {preco:.2f} - {nome_el.text.strip()[:40]}...")
                
            except Exception as e:
                continue
        
        if not produtos:
            print("   ⚠️ Nenhum produto encontrado")
            driver.save_screenshot(f"debug_cobasi_{int(time.time())}.png")
            
    except Exception as e:
        print(f"   ❌ Erro: {e}")
    
    return produtos


def buscar_petlove(driver, termo):
    """Busca produtos na Petlove"""
    print(f"\n🔎 PETLOVE: '{termo}'")
    produtos = []
    
    try:
        url = f"https://www.petlove.com.br/busca?q={termo.replace(' ', '%20')}"
        driver.get(url)
        time.sleep(5)
        
        driver.execute_script("window.scrollTo(0, 600);")
        time.sleep(2)
        
        seletores = [
            "div[class*='ProductCard']",
            "article",
            "div[class*='product-card']",
            "[data-testid='product-card']",
            "li[class*='product']"
        ]
        
        items = []
        for sel in seletores:
            try:
                items = driver.find_elements(By.CSS_SELECTOR, sel)
                if len(items) > 0:
                    print(f"   Seletor: {sel} → {len(items)} items")
                    break
            except:
                continue
        
        for item in items[:5]:
            try:
                nome_el = None
                for tag in ['h2', 'h3', 'a[class*="name"]', 'p[class*="name"]']:
                    try:
                        nome_el = item.find_element(By.CSS_SELECTOR, tag)
                        if nome_el.text.strip():
                            break
                    except:
                        continue
                
                if not nome_el or not nome_el.text.strip():
                    continue
                
                preco = None
                preco_els = item.find_elements(By.CSS_SELECTOR, "[class*='price'], [class*='Price']")
                for pel in preco_els:
                    preco = extrair_preco(pel.text)
                    if preco and preco > 5:
                        break
                
                if not preco:
                    continue
                
                img = None
                try:
                    img_el = item.find_element(By.TAG_NAME, 'img')
                    img = img_el.get_attribute('src')
                except:
                    pass
                
                link = None
                try:
                    link_el = item.find_element(By.TAG_NAME, 'a')
                    href = link_el.get_attribute('href')
                    link = href if href.startswith('http') else f"https://www.petlove.com.br{href}"
                except:
                    pass
                
                produtos.append({
                    'nome': nome_el.text.strip()[:200],
                    'preco': preco,
                    'imagem': img,
                    'link': link,
                    'loja': 'Petlove'
                })
                print(f"   ✅ R$ {preco:.2f} - {nome_el.text.strip()[:40]}...")
                
            except:
                continue
        
        if not produtos:
            print("   ⚠️ Nenhum produto encontrado")
            driver.save_screenshot(f"debug_petlove_{int(time.time())}.png")
            
    except Exception as e:
        print(f"   ❌ Erro: {e}")
    
    return produtos


def buscar_petz(driver, termo):
    """Busca produtos na Petz"""
    print(f"\n🔎 PETZ: '{termo}'")
    produtos = []
    
    try:
        url = f"https://www.petz.com.br/busca?q={termo.replace(' ', '%20')}"
        driver.get(url)
        time.sleep(5)
        
        driver.execute_script("window.scrollTo(0, 600);")
        time.sleep(2)
        
        seletores = [
            "div[class*='ProductCard']",
            "article[class*='product']",
            "div[class*='product-card']",
            "li[class*='product']"
        ]
        
        items = []
        for sel in seletores:
            try:
                items = driver.find_elements(By.CSS_SELECTOR, sel)
                if len(items) > 0:
                    print(f"   Seletor: {sel} → {len(items)} items")
                    break
            except:
                continue
        
        for item in items[:5]:
            try:
                nome_el = None
                for tag in ['h2', 'h3', 'a[class*="name"]', 'p']:
                    try:
                        nome_el = item.find_element(By.CSS_SELECTOR, tag)
                        if nome_el.text.strip():
                            break
                    except:
                        continue
                
                if not nome_el or not nome_el.text.strip():
                    continue
                
                preco = None
                preco_els = item.find_elements(By.CSS_SELECTOR, "[class*='price'], [class*='Price']")
                for pel in preco_els:
                    preco = extrair_preco(pel.text)
                    if preco and preco > 5:
                        break
                
                if not preco:
                    continue
                
                img = None
                try:
                    img_el = item.find_element(By.TAG_NAME, 'img')
                    img = img_el.get_attribute('src')
                except:
                    pass
                
                link = None
                try:
                    link_el = item.find_element(By.TAG_NAME, 'a')
                    href = link_el.get_attribute('href')
                    link = href if href.startswith('http') else f"https://www.petz.com.br{href}"
                except:
                    pass
                
                produtos.append({
                    'nome': nome_el.text.strip()[:200],
                    'preco': preco,
                    'imagem': img,
                    'link': link,
                    'loja': 'Petz'
                })
                print(f"   ✅ R$ {preco:.2f} - {nome_el.text.strip()[:40]}...")
                
            except:
                continue
        
        if not produtos:
            print("   ⚠️ Nenhum produto encontrado")
            driver.save_screenshot(f"debug_petz_{int(time.time())}.png")
            
    except Exception as e:
        print(f"   ❌ Erro: {e}")
    
    return produtos


def buscar_mercadolivre(driver, termo):
    """Busca produtos no Mercado Livre"""
    print(f"\n🔎 MERCADO LIVRE: '{termo}'")
    produtos = []
    
    try:
        url = f"https://lista.mercadolivre.com.br/{termo.replace(' ', '-')}"
        driver.get(url)
        time.sleep(5)
        
        driver.execute_script("window.scrollTo(0, 600);")
        time.sleep(2)
        
        # Seletores do Mercado Livre
        seletores = [
            "li.ui-search-layout__item",
            "div.ui-search-result__wrapper",
            "[class*='ui-search-layout__item']",
            "article",
        ]
        
        items = []
        for sel in seletores:
            try:
                items = driver.find_elements(By.CSS_SELECTOR, sel)
                if len(items) > 0:
                    print(f"   Seletor: {sel} → {len(items)} items")
                    break
            except:
                continue
        
        for item in items[:5]:
            try:
                # Nome
                nome_el = None
                for tag in ['h2', 'a.ui-search-link__title-card', 'a[class*="title"]', 'h2.ui-search-item__title']:
                    try:
                        nome_el = item.find_element(By.CSS_SELECTOR, tag)
                        if nome_el.text.strip():
                            break
                    except:
                        continue
                
                if not nome_el or not nome_el.text.strip():
                    continue
                
                # Preço
                preco = None
                preco_els = item.find_elements(By.CSS_SELECTOR, "[class*='price'], span.andes-money-amount__fraction")
                for pel in preco_els:
                    preco = extrair_preco(pel.text)
                    if preco and preco > 5:
                        break
                
                if not preco:
                    continue
                
                # Imagem
                img = None
                try:
                    img_el = item.find_element(By.TAG_NAME, 'img')
                    img = img_el.get_attribute('src')
                except:
                    pass
                
                # Link
                link = None
                try:
                    link_el = item.find_element(By.CSS_SELECTOR, 'a')
                    link = link_el.get_attribute('href')
                except:
                    pass
                
                produtos.append({
                    'nome': nome_el.text.strip()[:200],
                    'preco': preco,
                    'imagem': img,
                    'link': link,
                    'loja': 'Mercado Livre'
                })
                print(f"   ✅ R$ {preco:.2f} - {nome_el.text.strip()[:40]}...")
                
            except:
                continue
        
        if not produtos:
            print("   ⚠️ Nenhum produto encontrado")
            driver.save_screenshot(f"debug_ml_{int(time.time())}.png")
            
    except Exception as e:
        print(f"   ❌ Erro: {e}")
    
    return produtos


def salvar_produto(produto, categoria, marca):
    """Salva produto no Supabase"""
    # Busca produto existente
    params = {"nome": f"ilike.*{produto['nome'][:25]}*", "select": "id"}
    existentes = supabase_request("GET", "produtos", params=params)
    
    if existentes and len(existentes) > 0:
        produto_id = existentes[0]['id']
        
        # Verifica se já tem preço dessa loja
        params = {
            "produto_id": f"eq.{produto_id}",
            "loja": f"eq.{produto['loja']}",
            "select": "id"
        }
        preco_existe = supabase_request("GET", "precos", params=params)
        
        if not preco_existe or len(preco_existe) == 0:
            # Adiciona preço
            supabase_request("POST", "precos", {
                "produto_id": produto_id,
                "loja": produto['loja'],
                "preco": produto['preco'],
                "link_afiliado": produto['link']
            })
            print(f"   💾 Preço {produto['loja']} adicionado")
            return True
        return False
    
    # Cria novo produto
    novo = supabase_request("POST", "produtos", {
        "nome": produto['nome'],
        "marca": marca,
        "categoria": categoria,
        "imagem_url": produto['imagem']
    })
    
    if novo and len(novo) > 0:
        supabase_request("POST", "precos", {
            "produto_id": novo[0]['id'],
            "loja": produto['loja'],
            "preco": produto['preco'],
            "link_afiliado": produto['link']
        })
        print(f"   ✅ Novo produto criado")
        return True
    
    return False


def main():
    print("=" * 50)
    print("SCRAPER ROBUSTO - Cobasi, Petlove, Petz, Mercado Livre")
    print("Usando undetected-chromedriver")
    print("=" * 50)
    
    # Termos de busca
    buscas = [
        {"termo": "ração golden", "categoria": "Ração", "marca": "Golden"},
        {"termo": "ração premier", "categoria": "Ração", "marca": "Premier"},
        {"termo": "bravecto", "categoria": "Antipulgas", "marca": "MSD"},
        {"termo": "nexgard", "categoria": "Antipulgas", "marca": "Boehringer"},
        {"termo": "simparic", "categoria": "Antipulgas", "marca": "Zoetis"},
        {"termo": "areia gato", "categoria": "Higiene", "marca": "Vários"},
        {"termo": "viva verde areia", "categoria": "Higiene", "marca": "Viva Verde"},
    ]
    
    driver = criar_driver()
    total_adicionados = 0
    
    try:
        for busca in buscas:
            termo = busca["termo"]
            categoria = busca["categoria"]
            marca = busca["marca"]
            
            # Cobasi
            produtos = buscar_cobasi(driver, termo)
            for p in produtos:
                if salvar_produto(p, categoria, marca):
                    total_adicionados += 1
            time.sleep(3)
            
            # Petlove
            produtos = buscar_petlove(driver, termo)
            for p in produtos:
                if salvar_produto(p, categoria, marca):
                    total_adicionados += 1
            time.sleep(3)
            
            # Petz
            produtos = buscar_petz(driver, termo)
            for p in produtos:
                if salvar_produto(p, categoria, marca):
                    total_adicionados += 1
            time.sleep(3)
            
            # Mercado Livre
            produtos = buscar_mercadolivre(driver, termo)
            for p in produtos:
                if salvar_produto(p, categoria, marca):
                    total_adicionados += 1
            time.sleep(3)
            
    finally:
        driver.quit()
    
    print("\n" + "=" * 50)
    print(f"🏁 FINALIZADO! {total_adicionados} produtos/preços adicionados")
    print("=" * 50)


if __name__ == "__main__":
    main()

