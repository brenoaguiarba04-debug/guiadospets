# GuiaDoPet - Next.js

Comparador de preços para produtos pet migrado para Next.js 14.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **Styling**: Tailwind CSS
- **Deploy**: Vercel

## Configuração

### 1. Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em **SQL Editor** e execute:

```sql
-- Tabela de produtos
CREATE TABLE produtos (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  marca TEXT,
  categoria TEXT,
  imagem_url TEXT,
  palavras_chave TEXT,
  codigo_unico TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de preços
CREATE TABLE precos (
  id BIGSERIAL PRIMARY KEY,
  produto_id BIGINT REFERENCES produtos(id) ON DELETE CASCADE,
  loja TEXT NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  link_afiliado TEXT,
  ultima_atualizacao TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_precos_produto ON precos(produto_id);
```

4. Copie a **URL** e **anon key** de **Settings > API**

### 2. Clerk

1. Crie uma conta em [clerk.com](https://clerk.com)
2. Crie uma nova aplicação
3. Copie as chaves:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### 3. Variáveis de Ambiente

Edite o arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 4. Rodar o Projeto

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Estrutura

```
src/
├── app/
│   ├── page.tsx              # Página inicial
│   ├── produto/[id]/page.tsx # Detalhes do produto
│   ├── admin/page.tsx        # Painel admin (protegido)
│   ├── api/produtos/route.ts # API CRUD
│   └── sign-in, sign-up/     # Autenticação
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── ProductCard.tsx
│   ├── AdminForm.tsx
│   └── DeleteButton.tsx
└── lib/
    ├── supabase.ts           # Cliente Supabase
    └── utils.ts              # Funções de agrupamento
```

## Deploy na Vercel

1. Faça push do código para GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Importe o repositório
4. Adicione as variáveis de ambiente
5. Deploy!
