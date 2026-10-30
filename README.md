# Portfólio Jogável · Ronaldo Avansini

Portfólio interativo de **Ronaldo Avansini** — Desenvolvedor Full Stack, Cloud & SRE e estudante de Ciência da Computação no Centro Universitário Barão de Mauá (8º semestre), baseado em Ribeirão Preto — SP.

O projeto une um **portfólio moderno, semântico e com design system cyberpunk refinado** com um **jogo de plataforma 2D em tempo real** onde o próprio DOM HTML funciona como a fase interativa ("A Descida").

---

## 🚀 Projetos em Destaque no Portfólio

Os projetos incorporados ao portfólio foram selecionados diretamente dos repositórios do autor no GitHub ([@Getsuga01](https://github.com/Getsuga01)), destacando competências de engenharia de software avançada:

1. **TechFix ERP** ([`github.com/Getsuga01/techfix-erp`](https://github.com/Getsuga01/techfix-erp))
   * Sistema ERP especializado para assistência técnica em eletrônicos.
   * Máquina de Estados Finita (FSM) rigorosa para ordens de serviço, baixa atômica de estoque em PostgreSQL, RBAC, laudos técnicos em PDF e 65 testes automatizados.
   * *Stack:* Node.js 22, TypeScript, Fastify, PostgreSQL 16 + Prisma ORM, React 19, Next.js 15, Docker.

2. **Chaos Engineering & Resiliência Multi-Região na AWS** ([`github.com/Getsuga01/projeto-7-chaos-engineering`](https://github.com/Getsuga01/projeto-7-chaos-engineering))
   * Laboratório ativo-ativo multi-região na AWS (us-east-1 / us-west-2) com DynamoDB Global Tables.
   * Injeção controlada de falhas com **AWS Fault Injection Service (FIS)** quebrando replicação de propósito para mensurar **RTO e RPO reais** (Game Day de SRE).
   * *Stack:* Python, AWS (Lambda, DynamoDB Global Tables, FIS), Terraform (IaC).

3. **Integração de Campo → ERP Oracle** ([`github.com/Getsuga01/erp-campo`](https://github.com/Getsuga01/erp-campo))
   * Pipeline de ingestão de apontamentos operacionais agrícolas (pesagem, horas de máquina e insumos).
   * Contratos de dados de schema, gestão de falhas com **Dead-Letter Queue (DLQ)**, fila de reprocessamento e painel analítico de conciliação com Oracle XE.
   * *Stack:* Python, FastAPI, Oracle Database XE, Event-Driven, Docker.

4. **Finnace_Tech · BaaS & Motor de Crédito** ([`github.com/Getsuga01/Finnace_Tech`](https://github.com/Getsuga01/Finnace_Tech))
   * Ecossistema completo de Banking-as-a-Service e infraestrutura financeira.
   * Simulador Pix BaaS, Motor de Análise e Decisão de Risco de Crédito, White-Label Multi-Tenant e esteira de infraestrutura automatizada com Terraform.
   * *Stack:* Python, FastAPI, Terraform (IaC), Docker, Shell.

5. **DataPulse · Monitoramento de Dados Públicos do BACEN** ([`github.com/Getsuga01/DashBoard_pub`](https://github.com/Getsuga01/DashBoard_pub))
   * Plataforma analítica de séries temporais da API do Banco Central (SGS) com cálculo de médias móveis (MM3/MM12), cache com Redis 7 e 21 testes unitários com Vitest.
   * *Stack:* Node.js 22, Fastify v5, Next.js 15, PostgreSQL 16, Redis 7, Vitest.

6. **Verity AI · Workspaces & Document RAG** ([`github.com/Getsuga01/AI_Verety`](https://github.com/Getsuga01/AI_Verety))
   * Aplicação com IA generativa para criação de workspaces e conversação contextualizada com documentos (PDF, TXT e Markdown) via RAG.

---

## 🎨 Design System: Cyberpunk Glassmorphism

* **Tipografia:** `Space Grotesk` (Headings/Display), `Outfit` (Títulos/Corpo) e `JetBrains Mono` (Código e Badges).
* **Paleta:** Fundo Dark Obsidian (`#07040d`), Neon Violet (`#b026ff`), Rosa Choque (`#ec4899`) e Verde Esmeralda Status (`#10b981`).
* **Componentes:** Cards com cantos arredondados (`14px`), borda translúcida com `backdrop-filter: blur(14px)`, linha de néon superior que reage ao personagem e efeito blueprint técnico nos números de fundo (`-webkit-text-stroke`).

---

## 🕹️ Como Executar Localmente

```bash
# Com Node.js / npx
npx serve .

# Ou com Python
python -m http.server 8000
```
Acesse `http://localhost:8000` ou a porta informada.

### Controles
* `Enter`: Iniciar modo jogável / Reiniciar
* `←` / `→` ou `A` / `D`: Andar
* `Espaço` ou `W` / `↑`: Pular (pulo duplo disponível)
* `↓` ou `S`: Descer plataformas / Soco de impacto no ar
* `M`: Áudio chiptune on/off
* `Esc`: Fechar painéis
