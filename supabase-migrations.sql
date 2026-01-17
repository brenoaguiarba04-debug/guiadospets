-- Tabela para histórico de preços
CREATE TABLE IF NOT EXISTS historico_precos (
  id BIGSERIAL PRIMARY KEY,
  produto_id BIGINT REFERENCES produtos(id) ON DELETE CASCADE,
  loja TEXT NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  data_registro TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscas por produto e data
CREATE INDEX IF NOT EXISTS idx_historico_produto_data ON historico_precos(produto_id, data_registro);

-- Tabela para alertas de preço
CREATE TABLE IF NOT EXISTS alertas_preco (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  produto_id BIGINT REFERENCES produtos(id) ON DELETE CASCADE,
  preco_alvo DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  notificado_em TIMESTAMPTZ
);

-- Índice para alertas ativos
CREATE INDEX IF NOT EXISTS idx_alertas_ativos ON alertas_preco(ativo, produto_id);
