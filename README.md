# Cruzeiro InData

Painel simples do Brasileirão Série A (calendário, classificação e artilheiros),
com foco no Cruzeiro Esporte Clube. Projeto hobby de aprendizado, sem fins
comerciais.

Site estático (HTML/CSS/JS puro, sem libs de gráfico), publicado via GitHub
Pages.

## Fonte de dados

Todos os dados vêm da [football-data.org](https://www.football-data.org/),
API oficial cujos termos autorizam uso não-comercial com atribuição.

> Football data provided by the Football-Data.org API

Os arquivos em `data/*.json` são exportados a partir de um banco local que não
faz parte deste repositório — este repositório contém só o site e os dados já
exportados, prontos para o front-end consumir.

## Estrutura

```
index.html       — página única, 3 abas (Partidas, Classificação, Artilheiros)
css/style.css     — estilos
js/app.js         — lógica do front-end (fetch dos JSON, tabelas ordenáveis)
data/*.json       — dados exportados (calendário, classificação, artilheiros)
```

## Publicação

Deploy automático via GitHub Actions (`.github/workflows/deploy-pages.yml`) a
cada push na branch `main`.
