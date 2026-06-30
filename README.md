# GEOSOL Telemetry — INTEGRADrillMetrics-MG v5.6

Sistema IIoT de monitoramento preditivo de sondas de perfuração para a GEOSOL.

---

## Requisitos

- **Node.js** 16 ou superior
- **MySQL** 5.7 ou superior
- Navegador moderno com suporte a ES2017+

---

## Instalação

### 1. Banco de dados

```bash
mysql -u root -p < database.sql
```

### 2. Dependências

```bash
npm install
```

### 3. Variáveis de ambiente (opcional)

Crie um arquivo `.env` na raiz do projeto:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=geosol_db
PORT=3000
```

Se o `.env` não existir, os valores padrão acima são usados.

### 4. Iniciar

```bash
npm start
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Credenciais de Acesso (Padrão)

| Perfil        | E-mail                    | Senha    |
|---------------|---------------------------|----------|
| Administrador | admin@geosol.com          | admin123 |
| Operador      | operador@geosol.com       | op123    |

> **Aviso de Segurança:** Altere as senhas padrão antes de qualquer uso em ambiente de produção. Em produção, implemente hash de senhas com bcrypt.

---

## Funcionalidades

### Operador
- Dashboard de telemetria em tempo real (RPM, Torque, Pressão, Temperatura)
- Gráficos de linha com histórico de 60 pontos
- Recebimento e confirmação de alertas críticos com temporizador de 30s
- Escalada automática para central de operações caso o alerta não seja confirmado
- Log de eventos em tempo real por sonda
- Filtro de sondas por praça de perfuração

### Administrador
- Todas as funções do operador
- Simulação de falhas com controle de intensidade (Vazamento, Filtro, Gás H2S, Rocha Extrema)
- Configuração de limites operacionais por parâmetro e por sonda
- Cadastro de novos operadores

---

## Arquitetura

```
geosol/
├── server.js          # API RESTful (Node.js + Express)
├── database.sql       # Esquema e dados iniciais (MySQL)
├── package.json
└── public/
    ├── index.html     # Interface principal (Tailwind CSS + Bootstrap Icons)
    └── js/
        ├── app.js             # Lógica principal do frontend
        └── notifications.js   # Sistema de alertas e notificações
```

---

## Bugs Corrigidos (v5.6)

| # | Arquivo               | Bug                                                               |
|---|-----------------------|-------------------------------------------------------------------|
| 1 | `notifications.js`    | `logSystem()` chamada mas nunca definida — ReferenceError em runtime |
| 2 | `app.js`              | N+1 queries: 1 fetch de telemetria por sonda ao carregar a lista |
| 3 | `notifications.js`    | Timing bug no AudioContext: `now` capturado fora do `setTimeout` |
| 4 | `app.js`              | `histories[id]` poderia ser `undefined` ao abrir detalhe do gráfico |
| 5 | `app.js`              | `native alert()` em 3 locais — substituído por toast notifications |
| 6 | `database.sql`        | `parametros_config` ausente para sondas 2, 3 e 4                |
| 7 | `server.js`           | Sondas query usava interpolação de string; refatorado para query parametrizada |
| 8 | `server.js`           | Sem validação de entrada nas rotas de criação de usuário e configuração |
| 9 | `index.html`          | Font Awesome substituído por Bootstrap Icons (conforme requisito) |
| 10| `index.html`          | Emojis removidos (📍, ✓, 🚨, 📞) — substituídos por ícones BI   |
| 11| `index.html`          | Labels "(CPU)", "(RAM)", "(GPU)" nos KPIs removidos              |
| 12| `server.js`           | Callbacks aninhados refatorados para Promise helpers (`query()`) |
