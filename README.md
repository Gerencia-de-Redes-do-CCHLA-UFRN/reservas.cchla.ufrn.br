# Sistema de Reservas de Auditórios — CCHLA/UFRN

Sistema de gestão de reservas dos 5 auditórios do Centro de Ciências Humanas, Letras e Artes (CCHLA) da UFRN.

## Estrutura

```
├── backend/               # API Node.js + Express + MongoDB
│   ├── controllers/       # Lógica das rotas
│   ├── middleware/         # Autenticação JWT
│   ├── models/            # Mongoose schemas
│   ├── services/          # Nodemailer (notificações por e-mail)
│   └── scripts/           # Utilitários (seed-admin)
├── app-formulario/        # SPA — Solicitação de reservas (público)
├── app-painel/            # SPA — Gestão administrativa (secretaria)
├── app-acompanhamento/    # SPA — Acompanhamento via ticket (público)
├── app-calendario/        # SPA — Calendário de ocupação (público)
├── app-manutencao/        # Página de manutenção / 404
├── docs/                  # Documentação do sistema
├── docker-compose.yml     # Ambiente completo (MongoDB + API + Frontend)
├── frontend.Dockerfile    # Nginx servindo as SPAs
└── nginx.conf             # Proxy reverso, rotas das SPAs e API
```

## Rodar localmente

Requer Docker Desktop.

```bash
# Crie seu .env a partir do exemplo
cp .env.example .env
# Edite o .env com suas credenciais

# Suba os containers
docker compose up -d
```

Serviços:

| Serviço           | URL                          |
|-------------------|------------------------------|
| Calendário        | http://localhost             |
| Formulário        | http://localhost/formulario  |
| Acompanhamento    | http://localhost/acompanhamento |
| Painel Admin      | http://localhost/admin       |
| Adminer (banco)   | http://localhost/db-admin    |

### Primeiro acesso ao painel

1. Crie um administrador inicial:
```bash
docker compose exec backend node scripts/seed-admin.js
```
2. Acesse http://localhost/admin e faça login.

### Variáveis de ambiente (`.env`)

| Variável          | Descrição                        |
|-------------------|----------------------------------|
| `MONGO_USER`      | Usuário do MongoDB               |
| `MONGO_PASSWORD`  | Senha do MongoDB                 |
| `JWT_SECRET`      | Chave secreta para tokens JWT    |
| `RECAPTCHA_SECRET`| Chave secreta do Google reCAPTCHA|
| `EMAIL_USER`      | E-mail remetente (SMTP)          |
| `EMAIL_PASS`      | Senha de app do e-mail           |

### Parar / resetar

```bash
docker compose down        # para os containers (mantém os dados)
docker compose down -v     # apaga tudo, incluindo o banco
```

## SPAs (Single Page Applications)

- **Calendário** — Visualização mensal/semanal/diária das reservas aprovadas, com tooltips, modal de detalhes, legenda por auditório e botão de solicitação.
- **Formulário** — Solicitação de reserva com seleção de auditórios, calendário semanal, reCAPTCHA, verificação de conflitos em tempo real, geração de ticket e envio de e-mail de confirmação.
- **Acompanhamento** — Consulta pública por ticket, com tabela paginada, exibição de status, tooltip de motivo de reprovação e impressão.
- **Painel Admin** — Gestão completa: CRUD de reservas, aprovação/reprovação com notificação por e-mail, cadastro manual pela secretaria, gestão de feriados/manutenções, usuários e módulo de segurança (CCHLAfense).
- **Manutenção** — Página exibida quando o sistema está em manutenção.

## API (Backend)

Backend em Node.js + Express, 18 endpoints REST:

- **Públicos** — consulta de disponibilidade, envio de solicitação, eventos do calendário, consulta de ticket, login
- **Protegidos (admin)** — CRUD de reservas, notificação por e-mail, alteração de senha
- **Protegidos (root)** — estatísticas e configurações de segurança, CRUD de usuários

Mais detalhes em `docs/doc-api.html`.

## Segurança

- JWT com expiração de 24h para autenticação do painel
- reCAPTCHA no formulário público (proteção contra bots)
- Rate limit de login (5 tentativas em 15 minutos)
- CORS restrito a domínios autorizados
- Middleware de rastreamento configurável (CCHLAfense)
- Senhas armazenadas com bcrypt
- Deleção restrita a nível root

Mais detalhes em `docs/doc-seguranca.html`.
