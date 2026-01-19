"""
Scraper PARALELO - 4 processos Chrome simultâneos
Cada loja tem sua própria instância do Chrome rodando em paralelo
Captura imagens dos produtos
"""
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from multiprocessing import Process, Queue, Manager
import time
import csv
import json
import re
import os
import requests
from datetime import datetime

# Config Supabase
SUPABASE_URL = "https://wgyosfpkctbpeoyxddec.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneW9zZnBrY3RicGVveXhkZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTMzMTEsImV4cCI6MjA4NDE4OTMxMX0.uQhOqsiVj2JUEjSyIBT5x1wzEMNIzHBzWk5m4L8XX8w"
CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "produtos_pets_200.csv")


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
            resp = requests.get(url, headers=headers, params=params, timeout=5)
        elif method == "POST":
            resp = requests.post(url, headers=headers, json=data, timeout=5)
        elif method == "PATCH":
            resp = requests.patch(url, headers=headers, json=data, params=params, timeout=5)
        return resp.json() if resp.text else None
    except:
        return None


def criar_driver():
    """Cria driver Chrome otimizado"""
    options = uc.ChromeOptions()
    options.add_argument("--window-size=1200,800")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-popup-blocking")
    
    # NÃO bloqueia imagens - precisamos delas!
    prefs = {
        "profile.default_content_setting_values.notifications": 2,
    }
    options.add_experimental_option("prefs", prefs)
    
    driver = uc.Chrome(options=options, use_subprocess=True)
    driver.set_page_load_timeout(15)
    driver.implicitly_wait(3)
    return driver


def extrair_preco(texto):
    if not texto:
        return None
    texto = texto.replace("A partir de", "").strip()
    match = re.search(r'R\$\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))', texto)
    if match:
        preco_str = match.group(1).replace('.', '').replace(',', '.')
        try:
            preco = float(preco_str)
            return preco if preco > 5 else None
        except:
            pass
    # Só número (ML)
    match = re.search(r'(\d{1,3}(?:\.\d{3})*,\d{2})', texto)
    if match:
        preco_str = match.group(1).replace('.', '').replace(',', '.')
        try:
            preco = float(preco_str)
            return preco if preco > 5 else None
        except:
            pass
    # Número sem vírgula (ML - só a parte inteira)
    match = re.search(r'^(\d+)$', texto.strip())
    if match:
        try:
            return float(match.group(1))
        except:
            pass
    return None


def worker_loja(loja, url_template, produtos_queue, resultados_queue):
    """Worker que roda em processo separado para uma loja específica"""
    print(f"🌐 [{loja}] Iniciando navegador...")
    
    try:
        driver = criar_driver()
        print(f"✅ [{loja}] Navegador pronto!")
        
        while True:
            try:
                # Pega próximo produto da fila
                item = produtos_queue.get(timeout=2)
                if item is None:  # Sinal para terminar
                    break
                
                idx, produto = item
                termo = produto['termo']
                codigo = produto['codigo']
                
                # Monta URL
                if loja == "ML":
                    url = f"https://lista.mercadolivre.com.br/{termo.replace(' ', '-')}"
                else:
                    url = url_template.format(termo=termo.replace(' ', '%20'))
                
                # Busca
                resultado = buscar_produto(driver, loja, url)
                
                if resultado:
                    resultado['codigo'] = codigo
                    resultado['idx'] = idx
                    resultados_queue.put(resultado)
                    print(f"   💰 [{loja}] R$ {resultado['preco']:.2f} - {resultado['nome'][:30]}...")
                    
            except Exception as e:
                if "Empty" in str(e):
                    continue
                    
    except Exception as e:
        print(f"❌ [{loja}] Erro: {e}")
    finally:
        try:
            driver.quit()
        except:
            pass
        print(f"🏁 [{loja}] Finalizado")


def buscar_produto(driver, loja, url):
    """Busca um produto em uma loja"""
    try:
        driver.get(url)
        time.sleep(1.5)
        
        driver.execute_script("window.scrollTo(0, 300);")
        time.sleep(0.5)
        
        # Seletores por loja
        if loja == "ML":
            items = driver.find_elements(By.CSS_SELECTOR, "li.ui-search-layout__item")
        else:
            items = driver.find_elements(By.CSS_SELECTOR, "[class*='ProductCard'], [class*='product-card'], article")
        
        if not items:
            return None
        
        item = items[0]
        
        # Nome
        nome = None
        for sel in ['h2', 'h3', '[class*="name"]', '[class*="title"]', '.ui-search-item__title']:
            try:
                el = item.find_element(By.CSS_SELECTOR, sel)
                if el.text.strip():
                    nome = el.text.strip()[:150]
                    break
            except:
                continue
        
        if not nome:
            return None
        
        # Preço
        preco = None
        if loja == "ML":
            try:
                el = item.find_element(By.CSS_SELECTOR, "span.andes-money-amount__fraction")
                texto = el.text.strip().replace('.', '')
                preco = float(texto) if texto else None
            except:
                pass
        else:
            for sel in ['[class*="price"]', '[class*="Price"]', '[class*="valor"]']:
                try:
                    els = item.find_elements(By.CSS_SELECTOR, sel)
                    for el in els:
                        preco = extrair_preco(el.text)
                        if preco:
                            break
                except:
                    continue
                if preco:
                    break
        
        if not preco:
            return None
        
        # Imagem
        imagem = None
        try:
            img_el = item.find_element(By.TAG_NAME, 'img')
            imagem = img_el.get_attribute('src')
            # Se for data:image ou muito pequena, tenta data-src
            if not imagem or 'data:image' in imagem or len(imagem) < 20:
                imagem = img_el.get_attribute('data-src') or img_el.get_attribute('data-lazy-src')
        except:
            pass
        
        # Link
        link = None
        try:
            link_el = item.find_element(By.TAG_NAME, 'a')
            link = link_el.get_attribute('href')
        except:
            pass
        
        return {'nome': nome, 'preco': preco, 'imagem': imagem, 'link': link, 'loja': loja}
        
    except:
        return None


def salvar_produto(produto_csv, resultados):
    """Salva produto e preços no Supabase"""
    try:
        codigo = produto_csv['codigo']
        
        # Busca produto existente
        params = {"codigo_unico": f"eq.{codigo}", "select": "*"}
        existentes = supabase_request("GET", "produtos", params=params)
        
        # Pega primeira imagem válida
        imagem = None
        for r in resultados:
            if r.get('imagem') and 'data:image' not in r['imagem']:
                imagem = r['imagem']
                break
        
        if existentes and len(existentes) > 0:
            produto_id = existentes[0]['id']
            # Atualiza imagem se não tiver
            if imagem and not existentes[0].get('imagem_url'):
                supabase_request("PATCH", "produtos", {"imagem_url": imagem}, {"id": f"eq.{produto_id}"})
        else:
            # Cria produto
            novo = supabase_request("POST", "produtos", {
                "nome": produto_csv['nome'],
                "marca": produto_csv['marca'],
                "categoria": produto_csv['categoria'],
                "codigo_unico": codigo,
                "imagem_url": imagem,
            })
            if novo and len(novo) > 0:
                produto_id = novo[0]['id']
            else:
                return 0
        
        # Salva preços
        count = 0
        for r in resultados:
            try:
                supabase_request("POST", "precos", {
                    "produto_id": produto_id,
                    "loja": r['loja'],
                    "preco": r['preco'],
                    "link_afiliado": r['link'],
                    "ultima_atualizacao": datetime.now().isoformat()
                })
                count += 1
            except:
                pass
        
        return count
    except:
        return 0


def carregar_csv():
    produtos = []
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Limpa termo
            termo = re.sub(r'[^\w\s]', ' ', row['nome'])
            termo = ' '.join(termo.split())
            row['termo'] = termo
            produtos.append(row)
    return produtos


def main():
    print("=" * 60)
    print("⚡ SCRAPER PARALELO - 4 Chromes simultâneos")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    produtos_csv = carregar_csv()
    print(f"\n📋 {len(produtos_csv)} produtos")
    
    # Filas para comunicação entre processos
    manager = Manager()
    produtos_queues = {
        "Petz": manager.Queue(),
        "Cobasi": manager.Queue(),
        "Petlove": manager.Queue(),
        "ML": manager.Queue(),
    }
    resultados_queue = manager.Queue()
    
    # URLs das lojas
    urls = {
        "Petz": "https://www.petz.com.br/busca?q={termo}",
        "Cobasi": "https://www.cobasi.com.br/busca?q={termo}",
        "Petlove": "https://www.petlove.com.br/busca?q={termo}",
        "ML": "https://lista.mercadolivre.com.br/{termo}",
    }
    
    # Inicia 4 processos (um por loja)
    print("\n🚀 Iniciando 4 processos Chrome...")
    processos = []
    for loja, url_template in urls.items():
        p = Process(target=worker_loja, args=(loja, url_template, produtos_queues[loja], resultados_queue))
        p.start()
        processos.append(p)
        time.sleep(2)  # Pequeno delay entre inicializações
    
    print("✅ Todos os processos iniciados!")
    
    inicio = time.time()
    total_produtos = 0
    total_precos = 0
    
    try:
        # Processa cada produto
        for i, produto in enumerate(produtos_csv, 1):
            t0 = time.time()
            
            codigo = produto['codigo']
            nome = produto['nome']
            
            print(f"\n[{i}/{len(produtos_csv)}] {codigo}: {nome[:40]}...")
            
            # Envia produto para TODAS as lojas ao mesmo tempo
            for loja, queue in produtos_queues.items():
                queue.put((i, produto))
            
            # Espera resultados (máximo 10s)
            resultados = []
            timeout = time.time() + 10
            while time.time() < timeout and len(resultados) < 4:
                try:
                    r = resultados_queue.get(timeout=0.5)
                    if r.get('idx') == i:
                        resultados.append(r)
                except:
                    pass
            
            # Salva resultados
            if resultados:
                count = salvar_produto(produto, resultados)
                total_precos += count
                
                for r in resultados:
                    print(f"   💰 {r['loja']}: R$ {r['preco']:.2f}")
                
                resultados.sort(key=lambda x: x['preco'])
                print(f"   ✅ Menor: R$ {resultados[0]['preco']:.2f} ({resultados[0]['loja']})")
                if resultados[0].get('imagem'):
                    print(f"   🖼️ Imagem: {resultados[0]['imagem'][:50]}...")
            else:
                print("   ⚠️ Nenhum preço")
            
            total_produtos += 1
            t1 = time.time()
            print(f"   ⏱️ {t1-t0:.1f}s")
            
            # Progresso
            if total_produtos % 10 == 0:
                tempo = time.time() - inicio
                vel = total_produtos / (tempo / 60)
                eta = (len(produtos_csv) - total_produtos) / vel if vel > 0 else 0
                print(f"\n📊 {total_produtos}/{len(produtos_csv)} | {vel:.1f}/min | ETA: {eta:.1f}min")
                
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrompido!")
    finally:
        # Sinaliza fim para todos os workers
        for loja, queue in produtos_queues.items():
            queue.put(None)
        
        # Espera processos terminarem
        for p in processos:
            p.join(timeout=5)
            if p.is_alive():
                p.terminate()
    
    tempo_total = time.time() - inicio
    
    print("\n" + "=" * 60)
    print("📊 RELATÓRIO")
    print("=" * 60)
    print(f"✅ Produtos: {total_produtos}")
    print(f"💰 Preços: {total_precos}")
    if total_produtos > 0:
        print(f"⏱️ {tempo_total/60:.1f}min ({tempo_total/total_produtos:.1f}s/prod)")
    
    print("\n🏁 Finalizado!")


if __name__ == "__main__":
    main()
