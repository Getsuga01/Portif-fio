# Portfólio interativo — Ronaldo Avansini

Portfólio pessoal de **Ronaldo Avansini**, bacharel em Ciência da Computação pelo Centro Universitário Barão de Mauá (formação concluída em agosto de 2026).

O site combina uma apresentação profissional com um jogo de plataforma em JavaScript Canvas. A navegação tradicional continua disponível, inclusive em telas menores, para que recrutadores encontrem rapidamente perfil, competências, projetos e contato.

**Posicionamento:** Desenvolvimento Full Stack com ênfase em Backend, Integração de Sistemas e Dados.

> Os projetos apresentados são projetos de portfólio, demonstrações técnicas ou laboratórios. Não devem ser interpretados como sistemas comerciais em produção ou como experiências de emprego, salvo quando explicitamente indicado.

## Conteúdo

- Perfil e formação acadêmica
- Competências por domínio tecnológico
- Jornada de aprendizado e projetos (não é histórico de emprego)
- Estudos de caso e fluxos conceituais
- Links para repositórios
- Contato e currículo em PDF

## Projetos em destaque

### 1. TechFix ERP — gestão para assistência técnica
Repositório: https://github.com/Getsuga01/techfix-erp

Sistema de gestão para assistência técnica de eletrônicos. O projeto descreve fluxo de ordens de serviço baseado em Máquina de Estados Finita (FSM), controle de acesso por papéis (RBAC), baixa de estoque em transação e emissão de laudos em PDF.

**Stack descrita:** Node.js 22, TypeScript, Fastify, PostgreSQL 16, Prisma ORM, React 19, Next.js 15 e Docker.

O README do projeto informa 65 testes automatizados. Consulte o repositório para conferir a implementação, os cenários cobertos e as instruções de execução.

### 2. DataPulse — dados públicos do Banco Central
Repositório: https://github.com/Getsuga01/DashBoard_pub

Aplicação analítica de séries temporais da API SGS do Banco Central, com indicadores e cache.

**Stack descrita:** Node.js, Fastify, Next.js, PostgreSQL, Redis e Vitest. O README do projeto informa 21 testes unitários.

### 3. Integração de Campo → ERP Oracle
Repositório: https://github.com/Getsuga01/erp-campo

Projeto demonstrativo de ingestão de apontamentos operacionais, validação de contratos de dados, tratamento de falhas, reprocessamento e conciliação com Oracle Database XE.

**Stack descrita:** Python, FastAPI, Oracle XE, Docker e processamento orientado a eventos.

### 4. Chaos Engineering & SRE
Repositório: https://github.com/Getsuga01/projeto-7-chaos-engineering

Laboratório de resiliência em arquitetura multi-região AWS, com DynamoDB Global Tables, AWS Fault Injection Service e infraestrutura como código.

**Stack descrita:** AWS, Python e Terraform. Os resultados de experimentos, parâmetros e métricas devem ser consultados no repositório.

### 5. Finnace_Tech — BaaS e crédito
Repositório: https://github.com/Getsuga01/Finnace_Tech

Projeto demonstrativo com módulos de simulação de pagamentos, análise de risco de crédito, multi-tenancy e infraestrutura automatizada.

**Stack descrita:** Python, FastAPI, Terraform e Docker.

### 6. Verity AI — workspaces e RAG
Repositório: https://github.com/Getsuga01/AI_Verety

Aplicação de IA generativa com workspaces e recuperação contextual de conteúdo de documentos.

## Tecnologias

As tecnologias aparecem agrupadas por domínio; a lista não representa domínio especialista em todas elas.

- **Principais:** TypeScript, JavaScript, Node.js, React e SQL
- **Backend:** Fastify, Java/Spring Boot e C#/.NET
- **Dados:** PostgreSQL, MySQL, SQL Server, Oracle e Python
- **Complementares:** Vue.js, Next.js, C++, Docker, Git/GitHub e Terraform
- **Outros estudos:** Microsoft Dynamics 365 F&O / X++

## Estrutura do projeto

```text
Portifolionwe/
├── assets/
│   ├── Curriculo-Ronaldo-Avansini.pdf
│   └── ronaldo-profile.png
├── css/
│   └── estilo.css
├── js/
│   ├── cena3d.js
│   ├── desempenho.js
│   ├── efeitos3d.js
│   ├── fundo.js
│   ├── jogo.js
│   ├── mundo.js
│   ├── site.js
│   ├── som.js
│   └── sprites.js
└── index.html
```

## Executar localmente

Não há etapa de build obrigatória. Na pasta do projeto, execute um servidor HTTP local:

```bash
python -m http.server 8000
```

Abra http://localhost:8000 no navegador.

Também é possível usar:

```bash
npx serve .
```

## Controles do modo jogo

- `Enter`: iniciar / reiniciar
- `←` / `→` ou `A` / `D`: mover
- `Espaço`, `W` ou `↑`: pular
- `↓` ou `S`: descer plataformas / ação no ar
- `M`: áudio
- `Esc`: fechar painéis

A navegação convencional por links permanece disponível. Em telas menores, use o menu **Seções**.

## Acessibilidade e desempenho

- Link para pular diretamente ao conteúdo
- Navegação compacta em telas menores
- Estados de foco visíveis para teclado
- Respeito à preferência `prefers-reduced-motion` nos efeitos de interface
- Qualidade gráfica adaptativa para dispositivos com diferentes capacidades

## Contato

- E-mail: contato.ronaldoavansini@outlook.com
- LinkedIn: https://linkedin.com/in/ronaldo-avansini
- GitHub: https://github.com/Getsuga01

---

Atualizado em novembro de 2026.
