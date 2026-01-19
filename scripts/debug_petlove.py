import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
import time

def main():
    print("=== DEBUG PETLOVE: AREIA VIVA VERDE ===")
    
    options = uc.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    # Sem headless para vermos o erro
    
    driver = uc.Chrome(options=options, use_subprocess=True)
    
    try:
        url = "https://www.petlove.com.br/busca?q=areia%20viva%20verde"
        print(f"Acessando: {url}")
        driver.get(url)
        time.sleep(10) # Tempo extra para cloudflare/antibot
        
        print("Buscando seletores...")
        items = driver.find_elements(By.CSS_SELECTOR, "div[data-testid='product-card']")
        print(f"Encontrados via data-testid: {len(items)}")
        
        if len(items) == 0:
            print("Tentando seletor alternativo...")
            items = driver.find_elements(By.CSS_SELECTOR, "div[class*='product-card']")
            print(f"Encontrados via class: {len(items)}")
            
        print("\nAnalisando primeiros itens:")
        for i, item in enumerate(items[:3]):
            print(f"\nItem {i+1}:")
            print(f"HTML parcial: {item.get_attribute('outerHTML')[:200]}...")
            print(f"Texto completo: {item.text}")
            
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
        
    finally:
        print("Tirando screenshot...")
        driver.save_screenshot("debug_petlove_vivaverde.png")
        driver.quit()

if __name__ == "__main__":
    main()
