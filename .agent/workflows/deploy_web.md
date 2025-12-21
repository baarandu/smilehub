---
description: Como colocar a versão web no ar usando a Vercel
---

# Implantando na Vercel (Recomendado)

A maneira mais fácil de colocar sua aplicação React/Vite no ar é usando a [Vercel](https://vercel.com).

## Opção 1: Via Painel da Vercel (Mais Fácil)

1.  Crie uma conta na [Vercel](https://vercel.com).
2.  No painel (Dashboard), clique em **"Add New..."** -> **"Project"**.
3.  Escolha seu repositório do GitHub (`baarandu/smilehub` ou similar).
4.  Clique em **Import**.
5.  Em **Environment Variables**, adicione as variáveis do seu `.env`:
    *   `VITE_SUPABASE_URL`: (Copie do seu arquivo .env)
    *   `VITE_SUPABASE_ANON_KEY`: (Copie do seu arquivo .env)
6.  Clique em **Deploy**.

## Opção 2: Via Terminal (CLI)

1.  Instale a CLI da Vercel:
    ```bash
    npm i -g vercel
    ```
2.  Na pasta do projeto, rode:
    ```bash
    vercel
    ```
3.  Siga os passos na tela (Logar, confirmar projeto, etc).
4.  Para configurar as variáveis de ambiente via CLI:
    ```bash
    vercel env add VITE_SUPABASE_URL
    vercel env add VITE_SUPABASE_ANON_KEY
    ```
5.  Para atualizar o deploy em produção:
    ```bash
    vercel --prod
    ```

## Configuração de Rotas (Importante)

Se você encontrar erros 404 ao atualizar a página, crie um arquivo chamado `vercel.json` na raiz do projeto com este conteúdo:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
Isso garante que o roteamento do React funcione corretamente.
