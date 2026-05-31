# Publicar o app

Este projeto e um site estatico. Ele pode ser publicado na Vercel direto pelo GitHub.

## 1. Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Cole e execute o conteudo de `supabase-schema.sql`.
4. Em Authentication > Users, crie os usuarios da familia.
5. Em Authentication > Providers > Email, deixe cadastro publico ligado apenas se quiser que o app permita criar contas pela tela inicial.
6. Em Project Settings > API, copie:
   - Project URL
   - publishable key ou anon public key
7. Preencha `supabase-config.js` com esses valores.

Nao use a service_role key. Ela e secreta e nunca deve ficar em arquivo enviado
ao navegador.

Exemplo:

```js
window.SUPABASE_CONFIG = {
  url: "https://seu-projeto.supabase.co",
  publishableKey: "sua-chave-publica",
  albumId: "familia"
};
```

## 2. GitHub

1. Crie um repositorio no GitHub.
2. Envie a pasta `album-figurinhas-2026`.
3. A pasta `tmp/` fica fora do envio porque contem arquivos temporarios de extracao.

## 3. Vercel

1. Entre na Vercel.
2. Clique em Add New > Project.
3. Importe o repositorio do GitHub.
4. Framework Preset: Other.
5. Build Command: deixe vazio.
6. Output Directory: deixe vazio ou use `.` se a Vercel pedir.
7. Clique em Deploy.

Depois do deploy, a Vercel gera um link publico. Esse link pode ser aberto nos celulares.

## Como os dados ficam salvos

Com Supabase configurado, as quantidades ficam na tabela `album_stickers`.
Todos os usuarios autenticados do projeto veem o album indicado em `albumId`.

Se o Supabase nao estiver configurado, o app continua funcionando em modo local,
salvando apenas no navegador usado.
