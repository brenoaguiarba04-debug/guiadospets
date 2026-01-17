-- Inserir produtos populares de pets
-- Rações
INSERT INTO produtos (nome, marca, categoria, imagem_url, palavras_chave) VALUES
('Ração Golden Special Cães Adultos Frango e Carne 15kg', 'Golden', 'Ração', 'https://images.tcdn.com.br/img/img_prod/785887/racao_golden_special_caes_adultos_frango_e_carne_15kg_1_c3f8db8fcd79aeb18d60c3b2c6c3c97f.jpg', 'ração golden special cachorro adulto frango carne 15kg'),
('Ração Golden Special Cães Adultos Frango e Carne 10.1kg', 'Golden', 'Ração', 'https://images.tcdn.com.br/img/img_prod/785887/racao_golden_special_caes_adultos_frango_e_carne_15kg_1_c3f8db8fcd79aeb18d60c3b2c6c3c97f.jpg', 'ração golden special cachorro adulto frango carne 10kg'),
('Ração Golden Special Cães Adultos Frango e Carne 3kg', 'Golden', 'Ração', 'https://images.tcdn.com.br/img/img_prod/785887/racao_golden_special_caes_adultos_frango_e_carne_15kg_1_c3f8db8fcd79aeb18d60c3b2c6c3c97f.jpg', 'ração golden special cachorro adulto frango carne 3kg'),
('Ração Premier Formula Cães Adultos Raças Pequenas 15kg', 'Premier', 'Ração', 'https://www.petz.com.br/fotos/1607703832519.jpg', 'ração premier formula adulto raças pequenas 15kg'),
('Ração Premier Formula Cães Adultos Raças Grandes 15kg', 'Premier', 'Ração', 'https://www.petz.com.br/fotos/1607703832519.jpg', 'ração premier formula adulto raças grandes 15kg');

-- Antipulgas
INSERT INTO produtos (nome, marca, categoria, imagem_url, palavras_chave) VALUES
('Bravecto Cães 10 a 20kg 1 Comprimido', 'MSD', 'Antipulgas', 'https://www.petz.com.br/fotos/1607703832520.jpg', 'bravecto antipulgas carrapatos 10 20 kg comprimido'),
('Bravecto Cães 20 a 40kg 1 Comprimido', 'MSD', 'Antipulgas', 'https://www.petz.com.br/fotos/1607703832520.jpg', 'bravecto antipulgas carrapatos 20 40 kg comprimido'),
('Bravecto Cães 4.5 a 10kg 1 Comprimido', 'MSD', 'Antipulgas', 'https://www.petz.com.br/fotos/1607703832520.jpg', 'bravecto antipulgas carrapatos 4 10 kg comprimido'),
('NexGard Spectra Cães 3.6 a 7.5kg 1 Tablete', 'Boehringer', 'Antipulgas', 'https://www.petz.com.br/fotos/1585080054187.jpg', 'nexgard spectra antipulgas 3 7 kg tablete'),
('NexGard Spectra Cães 7.6 a 15kg 1 Tablete', 'Boehringer', 'Antipulgas', 'https://www.petz.com.br/fotos/1585080054187.jpg', 'nexgard spectra antipulgas 7 15 kg tablete'),
('NexGard Spectra Cães 15 a 30kg 1 Tablete', 'Boehringer', 'Antipulgas', 'https://www.petz.com.br/fotos/1585080054187.jpg', 'nexgard spectra antipulgas 15 30 kg tablete'),
('Simparic 20mg Cães 5 a 10kg 1 Comprimido', 'Zoetis', 'Antipulgas', 'https://images.tcdn.com.br/img/img_prod/785887/simparic_20mg_1_comprimido_caes_5_a_10kg_1_1_20190614153203.jpg', 'simparic antipulgas 5 10 kg comprimido'),
('Simparic 40mg Cães 10 a 20kg 1 Comprimido', 'Zoetis', 'Antipulgas', 'https://images.tcdn.com.br/img/img_prod/785887/simparic_20mg_1_comprimido_caes_5_a_10kg_1_1_20190614153203.jpg', 'simparic antipulgas 10 20 kg comprimido');

-- Inserir preços
INSERT INTO precos (produto_id, loja, preco, link_afiliado, ultima_atualizacao) VALUES
(1, 'Amazon', 179.90, 'https://amazon.com.br', NOW()),
(1, 'Petz', 189.90, 'https://petz.com.br', NOW()),
(1, 'Shopee', 169.90, 'https://shopee.com.br', NOW()),
(2, 'Amazon', 139.90, 'https://amazon.com.br', NOW()),
(2, 'Petz', 149.90, 'https://petz.com.br', NOW()),
(3, 'Amazon', 59.90, 'https://amazon.com.br', NOW()),
(3, 'Shopee', 54.90, 'https://shopee.com.br', NOW()),
(4, 'Petz', 249.90, 'https://petz.com.br', NOW()),
(4, 'Petlove', 239.90, 'https://petlove.com.br', NOW()),
(5, 'Petz', 259.90, 'https://petz.com.br', NOW()),
(5, 'Cobasi', 254.90, 'https://cobasi.com.br', NOW()),
(6, 'Amazon', 159.90, 'https://amazon.com.br', NOW()),
(6, 'Petz', 169.90, 'https://petz.com.br', NOW()),
(6, 'Shopee', 149.90, 'https://shopee.com.br', NOW()),
(7, 'Amazon', 179.90, 'https://amazon.com.br', NOW()),
(7, 'Petlove', 189.90, 'https://petlove.com.br', NOW()),
(8, 'Amazon', 139.90, 'https://amazon.com.br', NOW()),
(8, 'Petz', 149.90, 'https://petz.com.br', NOW()),
(9, 'Amazon', 119.90, 'https://amazon.com.br', NOW()),
(9, 'Petz', 129.90, 'https://petz.com.br', NOW()),
(9, 'Shopee', 109.90, 'https://shopee.com.br', NOW()),
(10, 'Amazon', 129.90, 'https://amazon.com.br', NOW()),
(10, 'Petlove', 139.90, 'https://petlove.com.br', NOW()),
(11, 'Petz', 149.90, 'https://petz.com.br', NOW()),
(11, 'Cobasi', 144.90, 'https://cobasi.com.br', NOW()),
(12, 'Amazon', 89.90, 'https://amazon.com.br', NOW()),
(12, 'Petz', 99.90, 'https://petz.com.br', NOW()),
(13, 'Amazon', 109.90, 'https://amazon.com.br', NOW()),
(13, 'Shopee', 99.90, 'https://shopee.com.br', NOW());
