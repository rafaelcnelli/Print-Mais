# PrintMais — Gestão & Precificação de Impressão 3D

**PrintMais** é uma aplicação web completa (SPA) para gestão, precificação técnica e controle financeiro de manufatura aditiva (Impressão 3D FDM e Resina SLA/DLP).

## Funcionalidades Principais

1. **Calculadora de Custos & Criação de Produtos (`Calculadora`)**
   - Cálculo preciso de custo real unitário e em lote (Material, Energia kWh, Depreciação da Impressora, Mão de Obra Humana e Taxa de Risco de Falha).
   - Comparativo entre precificação ingênua (apenas peso + margem) e preço real recomendado.
   - Criação direta de produtos para o catálogo da oficina com código SKU, categoria, tempo de impressão, gramas por peça e estoque inicial.

2. **Catálogo de Produtos & Registro de Vendas (`Produtos & Vendas`)**
   - Gestão do catálogo de peças impressas em 3D com controle de estoque.
   - Registro de vendas com múltiplos produtos, quantidades, data, horário, cliente, forma de pagamento e canal de venda.
   - Lançamento automático de todas as vendas realizadas no Fluxo de Caixa.

3. **Montador de Orçamentos & Conversão em Pedidos (`Orçamentos`)**
   - Criação de orçamentos selecionando produtos do catálogo e suas respectivas quantidades.
   - Exportação em **PDF comercial** pronto para impressão ou salvamento e geração de **texto formatado para WhatsApp** com cópia em 1 clique.
   - Conversão de orçamentos aprovados em **Pedidos Realizados**, baixando estoque e lançando a receita no Fluxo de Caixa.

4. **Fluxo de Caixa & Estoque de Bobinas (`Caixa & Estoque`)**
   - Controle de entradas e saídas operacionais (filamentos, resinas, energia, bicos, manutenção).
   - Controle de bobinas/carretéis com barra de nível restante e alerta de estoque crítico.

5. **Dashboard Financeiro, Relatórios & Previsões (`Dashboard`)**
   - Visão Geral Inicial com cartões de Saldo Total, Orçamentos Pendentes e Consumo de Filamento, acompanhados de gráficos de tendência mensal (Recharts + D3).
   - Análise de Breakeven (ponto de equilíbrio mensal) e Simulador de Expansão de Fazenda 3D.

---

## Como Rodar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento (porta 3000)
npm run dev

# 3. Gerar build de produção para GitHub Pages
npm run build:gh-pages
```

---

## Como Publicar no GitHub e GitHub Pages

O projeto já está configurado com caminhos relativos (`base: './'` no `vite.config.ts`), `.nojekyll`, `favicon.svg` e workflow automatizado do **GitHub Actions** (`.github/workflows/deploy.yml`).

### Passo a Passo:

1. **Suba o código para um repositório no GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit PrintMais"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/printmais.git
   git push -u origin main
   ```

2. **Ative o GitHub Pages no repositório:**
   - Acesse o seu repositório no GitHub e clique em **Settings** > **Pages** (no menu lateral esquerdo).
   - Em **Build and deployment** > **Source**, selecione **GitHub Actions**.
   - A workflow `Deploy PrintMais to GitHub Pages` será executada automaticamente a cada `push` na branch `main` (ou pode ser acionada manualmente na aba **Actions**).
   - Após concluir o deploy, seu app estará disponível em: `https://SEU_USUARIO.github.io/printmais/`
