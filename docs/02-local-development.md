# 02 — Desenvolvimento local

## O que é este guia?

Passo a passo para rodar o **editor Eko Print Studio** na sua máquina e, opcionalmente, conectá-lo a um **WordPress + WooCommerce** local.

## Por que existe?

Sem um ambiente local você não consegue:

- Validar o editor (Vite)
- Testar o botão **Personalizar**
- Depurar REST / postMessage / carrinho

## Quando utilizar?

Sempre que for desenvolver features, integrar o plugin, ou reproduzir um bug antes de ir a produção.

---

## Requisitos

| Ferramenta | Versão sugerida | Para quê |
|------------|-----------------|----------|
| **Node.js** | 20 LTS ou 22+ | App do editor (Vite) |
| **npm** | 10+ (vem com Node) | Instalar deps e scripts |
| **Git** | qualquer | Clonar o repo |
| **PHP** | 8.0+ | Plugin WooCommerce |
| **WordPress** | 6.0+ | Host da loja |
| **WooCommerce** | 7.0+ (testado até 9.x no header do plugin) | Carrinho / pedido |

> **Dica:** o repositório usa **npm**, não Yarn. Se preferir Yarn, use os mesmos scripts (`yarn dev` ≈ `npm run dev`).

### Opcional

| Ferramenta | Uso |
|------------|-----|
| LocalWP / XAMPP / Docker / Laravel Herd | WordPress local |
| Ngrok / Cloudflare Tunnel | Expor o editor Vite para um Woo remoto |

---

## Estrutura de pastas (visão prática)

```text
Eko-Print-Studio/
├── src/                          # Editor + Core + SDK + UI
│   ├── adapters/woocommerce/     # Adapter TypeScript (roda no app do editor)
│   ├── sdk/                      # API pública
│   ├── core/                     # Domínio (não importar no plugin)
│   └── App.tsx                   # Shell do Creator
├── integrations/woocommerce/
│   └── eko-print-studio/         # Plugin WordPress (copiar para wp-content/plugins)
├── docs/                         # Esta documentação
├── package.json
└── vite.config.ts                # a confirmar nome exato no seu clone
```

---

## 1. Clonar e instalar o editor

```bash
git clone <url-do-seu-repositorio>
cd Eko-Print-Studio
npm install
```

**Resultado esperado:** pasta `node_modules/` criada sem erros.

---

## 2. Executar em desenvolvimento

```bash
npm run dev
```

**O que o comando faz:** sobe o servidor Vite com HMR.

**Resultado esperado:** URL local (tipicamente `http://localhost:5173`). Abra no navegador e veja o editor carregar um template de demonstração.

> ![Screenshot 01 — Editor local](./assets/screenshots/01-editor-home.png)

### Validar o editor

1. A página não fica em branco
2. Existe canvas com elementos
3. Undo / Redo / Zoom / Save (download JSON) respondem

```bash
# Em outro terminal — suite de testes
npm test
```

**Resultado esperado:** todos os testes Vitest passam (ex.: 205 testes na base documentada).

---

## 3. Typecheck e build

```bash
# Só verificação TypeScript
npx tsc --noEmit

# Build de produção do app
npm run build
```

**O que `npm run build` faz:**

1. `tsc --noEmit` — falha se houver erros de tipo
2. `vite build` — gera artefatos estáticos (pasta `dist/`)

**Resultado esperado:** pasta `dist/` com `index.html` e assets.

```bash
# Preview do build localmente
npm run preview
```

---

## 4. WordPress + WooCommerce (para integração)

### Por que WordPress precisa existir?

O plugin em `integrations/woocommerce/eko-print-studio/` é um **plugin WP**. Sem WordPress/Woo, você só testa o editor isolado.

### Passos

1. Instale WordPress local (LocalWP, Docker, etc.)
2. Instale e ative o plugin **WooCommerce**
3. Copie o plugin Eko:

```bash
# Exemplo (ajuste o caminho do seu WordPress)
cp -r integrations/woocommerce/eko-print-studio /caminho/para/wp-content/plugins/eko-print-studio
```

No Windows (PowerShell):

```powershell
Copy-Item -Recurse `
  .\integrations\woocommerce\eko-print-studio `
  C:\caminho\para\wp-content\plugins\eko-print-studio
```

4. Em **Plugins**, ative **Eko Print Studio for WooCommerce**
5. Se o plugin reclamar que WooCommerce não está ativo, ative o Woo primeiro

### Permalinks

1. Vá em **Configurações → Links permanentes**
2. Clique em **Salvar alterações** (mesmo sem mudar nada)

Isso registra a rota `/eko-print-studio/editor/`.

---

## 5. Conectar o plugin ao editor local

1. Rode `npm run dev` e anote a URL (ex.: `http://localhost:5173`)
2. Em WP: **WooCommerce → Eko Print Studio**
3. Campo **URL do Editor** = essa URL
4. **Modo de abertura** = `Modal` (mais fácil para testar)
5. **Ambiente** = `Development`
6. **Debug** = ligado (grava auditoria)

> **Atenção — CORS / cookies:** se o WordPress roda em outro host (ex. `mysite.local`) e o editor em `localhost:5173`, o navegador trata origens diferentes. O fluxo usa **iframe + postMessage**; configure **Target Origin** no plugin (ex. `http://localhost:5173`) em vez de `*` em ambientes sensíveis. Detalhes em [Troubleshooting](./05-troubleshooting.md).

---

## 6. Produto de teste

1. Crie um produto simples no WooCommerce
2. Em **Dados do produto**, preencha **Eko Template ID** com:

```text
template_caneca-brasil
```

3. Publique o produto
4. Abra a página do produto na loja
5. Clique **Personalizar**

> ![Screenshot 02 — Botão Personalizar](./assets/screenshots/02-personalizar.png)

**Resultado esperado:** modal/iframe com o editor; ao salvar no modo commerce, o item entra no carrinho com meta de personalização.

---

## Comandos — resumo

| Comando | Função |
|---------|--------|
| `npm install` | Instala dependências |
| `npm run dev` | Editor em desenvolvimento |
| `npm run build` | Typecheck + build Vite |
| `npm run preview` | Serve o `dist/` |
| `npm test` | Vitest (uma passagem) |
| `npm run test:watch` | Vitest em watch |
| `npx tsc --noEmit` | Só TypeScript |

---

## Lacunas conhecidas (instalação)

| Lacuna | Status |
|--------|--------|
| Pacote npm público (`npm i eko-print-studio`) | **Pendente** — o projeto é `private` no `package.json` |
| Docker Compose oficial WP+Woo+Editor | **Pendente de implementação** |
| Script único `npm run setup:woo` | **Pendente de implementação** |
| Yarn obrigatório | Não usado; npm é o padrão |

---

## Checklist

### O que deve funcionar

- [ ] `npm run dev` abre o editor
- [ ] `npm test` passa
- [ ] Plugin aparece em WP após cópia + ativação
- [ ] Template ID no produto exibe o botão Personalizar

### Como validar

- [ ] Console do navegador sem erros fatais no editor
- [ ] Network: `GET /wp-json/eko-print/v1/product-context/{id}` retorna 200 ao personalizar

### Erros mais comuns

- Plugin exige WooCommerce ativo
- Permalinks não salvos → rota do editor 404
- URL do Editor vazia → shell mostra mensagem de configuração
- Ver [05 — Troubleshooting](./05-troubleshooting.md)
