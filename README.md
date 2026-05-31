# Album 2026 - Controle de Figurinhas

App local para controlar figurinhas do album da Copa 2026.

Tambem esta preparado para uso online com GitHub, Vercel e Supabase. Veja
`DEPLOY.md` para publicar.

## Como usar localmente

Abra `index.html` no navegador. Os dados ficam salvos no proprio navegador via `localStorage`.

## Base inicial

A lista inicial foi montada a partir do PDF `Controle De Figurinhas 2026 (1).pdf`, com 994 codigos:

- `00`: 1 figurinha
- `FWC`: 19 figurinhas
- 48 selecoes com 20 figurinhas cada
- `CC`: 14 figurinhas especiais

## Backup

Use `BK` para exportar um arquivo JSON e `IM` para importar esse arquivo depois.

## Sincronizacao com Supabase

O app tambem pode salvar o progresso na nuvem para uso em celulares.

1. Crie um projeto no Supabase.
2. Abra o SQL Editor e execute o arquivo `supabase-schema.sql`.
3. Em Authentication, crie os usuarios da familia ou permita que eles usem o botao `Criar`.
4. Em Project Settings > API, copie a Project URL e a publishable/anon key.
5. Preencha `supabase-config.js` seguindo `supabase-config.example.js`:

```js
window.SUPABASE_CONFIG = {
  url: "https://seu-projeto.supabase.co",
  publishableKey: "sua-chave-publica",
  albumId: "familia"
};
```

Use apenas a publishable/anon public key. Nunca use a service_role key no app,
porque esse arquivo sera enviado ao navegador.

Quando a configuracao estiver preenchida, o app mostra login e sincroniza a tabela
`album_stickers`. Sem configuracao, ele continua funcionando em modo local.

O SQL inicial permite acesso a usuarios autenticados do projeto. Para uso familiar,
crie apenas as contas da familia ou desative novos cadastros depois de criar os
usuarios.

## Identificacao e imagens

O app inclui uma tabela em `sticker-images.js` com os 994 codigos do controle.
Os nomes oficiais foram cruzados com um catalogo JSON publico e as imagens foram
extraidas dos PDFs enviados.

Nesta versao, 776 codigos possuem imagem confiavel em `assets/cards`. Os demais
continuam identificados por nome/codigo, sem forcar uma imagem duvidosa.
