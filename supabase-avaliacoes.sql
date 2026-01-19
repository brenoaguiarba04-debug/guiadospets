-- Tabela de avaliações de produtos
CREATE TABLE IF NOT EXISTS avaliacoes (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
    usuario_nome VARCHAR(100) NOT NULL,
    usuario_email VARCHAR(255),
    nota INTEGER CHECK (nota >= 1 AND nota <= 5) NOT NULL,
    titulo VARCHAR(200),
    comentario TEXT,
    pros TEXT[], -- Array de pontos positivos
    contras TEXT[], -- Array de pontos negativos
    recomenda BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_avaliacoes_produto ON avaliacoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_nota ON avaliacoes(nota);

-- Função para calcular média de avaliações
CREATE OR REPLACE FUNCTION calcular_media_avaliacoes(p_produto_id INTEGER)
RETURNS TABLE(media NUMERIC, total INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(AVG(nota)::NUMERIC(3,2), 0) as media,
        COUNT(*)::INTEGER as total
    FROM avaliacoes
    WHERE produto_id = p_produto_id;
END;
$$ LANGUAGE plpgsql;

-- Política RLS para permitir leitura pública
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avaliacoes são públicas para leitura"
    ON avaliacoes FOR SELECT
    USING (true);

CREATE POLICY "Qualquer um pode criar avaliação"
    ON avaliacoes FOR INSERT
    WITH CHECK (true);
