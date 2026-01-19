"""
Script para corrigir imagens faltantes no Supabase
Busca produtos sem imagem e tenta encontrar fotos novas
"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from multiprocessing import Process, Queue, Manager
import time
import json
import re
import os
import requests
from datetime import datetime

# Config Supabase
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
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, params=params, timeout=10)
        elif method == "POST":
            resp = requests.post(url, headers=headers, json=data, timeout=10)
        elif method == "PATCH":
            resp = requests.patch(url, headers=headers, json=data, params=params, timeout=10)
        return resp.json() if resp.text else None
    except:
        return None

def criar_driver():
    options = uc.ChromeOptions()
    options.add_argument("--window-size=1200,800")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-popup-blocking")
    
    prefs = {"profile.default_content_setting_values.notifications": 2}
    options.add_experimental_option("prefs", prefs)
    
    driver = uc.Chrome(options=options, use_subprocess=True)
    driver.set_page_load_timeout(20)
    driver.implicitly_wait(3)
    return driver

def worker_imagem(loja, url_template, queue_in, queue_out):
    print(f"📷 [{loja}] Iniciando buscador de imagens...")
    driver = None
    try:
        driver = criar_driver()
        
        while True:
            item = queue_in.get()
            if item is None:
                break
                
            produto_id, termo = item
            
            try:
                if loja == "ML":
                    url = f"https://lista.mercadolivre.com.br/{termo.replace(' ', '-')}"
                else:
                    url = url_template.format(termo=termo.replace(' ', '%20'))
                
                driver.get(url)
                time.sleep(1.5)
                driver.execute_script("window.scrollTo(0, 300);")
                time.sleep(0.5)
                
                imagem = None
                
                # Seletores de produto
                seletores = [
                    "[class*='ProductCard'] img", 
                    "[class*='product-card'] img", 
                    "article img",
                    "li.ui-search-layout__item img",
                    "[data-testid*='product'] img"
                ]
                
                for sel in seletores:
                    imgs = driver.find_elements(By.CSS_SELECTOR, sel)
                    for img_el in imgs:
                        if not img_el.is_displayed(): continue
                        
                        src = img_el.get_attribute('src')
                        if not src or 'data:image' in src or len(src) < 50:
                            src = img_el.get_attribute('data-src') or img_el.get_attribute('data-lazy-src')
                        
                        if src and 'http' in src and 'data:image' not in src:
                            # Filtra icones pequenos
                            if 'icon' not in src and 'logo' not in src:
                                imagem = src
                                break
                    if imagem: break
                
                if imagem:
                    queue_out.put((produto_id, imagem, loja))
                    print(f"   🖼️ [{loja}] Imagem encontrada!")
                else:
                    queue_out.put((produto_id, None, loja))
                    
            except Exception as e:
                print(f"❌ Erro ao buscar imagem: {e}")
                queue_out.put((produto_id, None, loja))
                
    except Exception as e:
        print(f"❌ Erro fatal no worker {loja}: {e}")
    finally:
        if driver: driver.quit()

def main():
    print("=" * 60)
    print("🔧 CORRETOR DE IMAGENS FALTANTES")
    print("=" * 60)
    
    display_count = 0
    
    # 1. Buscar TODOS os produtos e filtrar localmente (mais confiável)
    print("🔍 Baixando todos os produtos para verificação...")
    all_products = []
    offset = 0
    while True:
        p = supabase_request("GET", "produtos", params={"select": "id,nome,codigo_unico,imagem_url", "offset": f"{offset}", "limit": "1000"})
        if not p: break
        all_products.extend(p)
        offset += 1000
    
    produtos_unicos = []
    print("🧪 Testando acessibilidade das imagens (pode demorar)...")
    
    def is_image_broken(p):
        img = str(p.get('imagem_url') or '')
        
        # 1. Checagem estática
        if (not img or 
            img.lower() == 'none' or 
            img.strip() == '' or 
            len(img) < 20 or 
            'data:image' in img):
            return True
            
        # 2. Checagem dinâmica (HTTP)
        try:
            h = {'User-Agent': 'Mozilla/5.0'}
            r = requests.head(img, headers=h, timeout=3)
            if r.status_code != 200:
                # Tenta GET
                r = requests.get(img, headers=h, timeout=3, stream=True)
                r.close()
                if r.status_code != 200:
                    return True
        except:
            return True
            
        return False

    # Verifica em paralelo para ser rápido
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=20) as exc:
        results = list(exc.map(is_image_broken, all_products))
    
    for i, broken in enumerate(results):
        if broken:
            produtos_unicos.append(all_products[i])
    
    print(f"📋 Total de produtos analisados: {len(all_products)}")
    print(f"⚠️ Produtos com imagem inválida/quebrada: {len(produtos_unicos)}")
    
    if not produtos_unicos:
        print("✅ Nenhuma imagem faltando!")
        return

    # Filas
    manager = Manager()
    q_petz = manager.Queue()
    q_cobasi = manager.Queue()
    q_petlove = manager.Queue()
    q_ml = manager.Queue()
    q_out = manager.Queue()
    
    queues = [q_petz, q_cobasi, q_petlove, q_ml]
    
    # Inicia Workers
    workers = [
        Process(target=worker_imagem, args=("Petz", "https://www.petz.com.br/busca?q={termo}", q_petz, q_out)),
        Process(target=worker_imagem, args=("Cobasi", "https://www.cobasi.com.br/busca?q={termo}", q_cobasi, q_out)),
        Process(target=worker_imagem, args=("Petlove", "https://www.petlove.com.br/busca?q={termo}", q_petlove, q_out)),
        Process(target=worker_imagem, args=("ML", "https://lista.mercadolivre.com.br/{termo}", q_ml, q_out))
    ]
    
    for p in workers:
        p.start()
    
    # Distribui trabalho
    for p in produtos_unicos:
        # Tenta distribuir balanceado
        q_petlove.put((p['id'], p['nome']))
        q_petz.put((p['id'], p['nome'])) # Manda para mais de um para garantir
        
    total_corrigidos = 0
    
    # Processa resultados
    # Esperamos receber pelo menos 1 tentativa por produto (simplificado)
    # Na verdade, vamos processar por tempo ou até esvaziar
    
    start = time.time()
    processed_ids = set()
    
    while len(processed_ids) < len(produtos_unicos) and (time.time() - start) < (len(produtos_unicos) * 15):
        try:
            pid, img, loja = q_out.get(timeout=5)
            
            if pid not in processed_ids:
                if img:
                    # Atualiza no banco
                    print(f"💾 Atualizando produto {pid} com imagem da {loja}...")
                    supabase_request("PATCH", "produtos", {"imagem_url": img}, {"id": f"eq.{pid}"})
                    total_corrigidos += 1
                    processed_ids.add(pid)
                    print(f"   ✅ Sucesso! ({total_corrigidos}/{len(produtos_unicos)})")
                else:
                    # Se falhar em uma loja, poderíamos esperar outra, mas por simplicidade vamos deixar rolando
                    pass
        except:
            if len(processed_ids) >= len(produtos_unicos):
                break
            pass
            
    # Manda parar
    for q in queues:
        q.put(None)
        
    for p in workers:
        p.join(timeout=5)
        if p.is_alive(): p.terminate()
        
    print("\n" + "=" * 60)
    print(f"🏁 Finalizado! Imagens corrigidas: {total_corrigidos}/{len(produtos_unicos)}")

if __name__ == "__main__":
    main()
