# 🦷 Organiza Odonto (Smile Care Hub)

Sistema completo para gestão de clínicas odontológicas com suporte multi-tenant, controle financeiro, agendamento e muito mais.

## 📱 Plataformas

| Plataforma | Tecnologia | Status |
|------------|------------|--------|
| **Web** | React + Vite + Tailwind | ✅ Produção |
| **Mobile** | React Native (Expo) | ✅ Produção |
| **Backend** | Supabase (PostgreSQL + Auth) | ✅ Produção |

## ✨ Funcionalidades

### 👥 Gestão de Pacientes
- Cadastro completo com histórico
- Anamnese detalhada
- Exames e documentos
- Orçamentos e procedimentos

### 📅 Agendamento
- Calendário visual
- Confirmação via WhatsApp
- Alertas de retorno

### 💰 Financeiro
- Receitas e despesas
- Fechamento por período
- Taxas de cartão e impostos
- Relatórios por unidade

### 🔔 Alertas
- Aniversariantes
- Retornos pendentes
- Confirmações de consulta
- Lembretes personalizados

### 🏢 Multi-tenant
- Isolamento por clínica
- Gestão de equipe
- Convites por e-mail
- Controle de permissões

---

## 🚀 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou bun
- Conta no [Supabase](https://supabase.com)

### Web (Vite)

```bash
# 1. Clone o repositório
git clone <YOUR_GIT_URL>
cd smile-care-hub-main

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais Supabase

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

### Mobile (Expo)

```bash
# 1. Entre na pasta mobile
cd mobile

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais Supabase

# 4. Inicie o Expo
npx expo start
```

---

## 🗄️ Banco de Dados (Supabase)

### Configuração Inicial

1. Crie um projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Execute os scripts SQL da pasta `supabase/migrations/` em ordem
3. Configure as políticas RLS (Row Level Security)
4. Copie as credenciais para `.env`

### Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

---

## 📁 Estrutura do Projeto

```
smile-care-hub-main/
├── src/                    # Código web (React + Vite)
│   ├── components/         # Componentes React
│   ├── pages/              # Páginas da aplicação
│   ├── services/           # Serviços (Supabase, APIs)
│   ├── hooks/              # Custom hooks
│   ├── types/              # Definições TypeScript
│   └── lib/                # Utilitários
│
├── mobile/                 # Código mobile (Expo)
│   ├── app/                # Telas (file-based routing)
│   ├── src/
│   │   ├── components/     # Componentes React Native
│   │   ├── services/       # Serviços
│   │   └── types/          # Tipos TypeScript
│   └── assets/             # Imagens e fontes
│
├── supabase/               # Migrações e configuração
│   └── migrations/         # Scripts SQL
│
└── public/                 # Assets estáticos web
```

---

## 🛠️ Tecnologias

### Web
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix)
- **State**: React Query (TanStack)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts

### Mobile
- **Framework**: React Native (Expo SDK 53)
- **Styling**: NativeWind (Tailwind)
- **Navigation**: Expo Router
- **Icons**: Lucide React Native

### Backend
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Functions**: Supabase Edge Functions

---

## 📦 Scripts Disponíveis

### Web
```bash
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de produção
npm run preview    # Preview do build
npm run lint       # Verificar ESLint
npm run test       # Executar testes
```

### Mobile
```bash
cd mobile
npx expo start     # Iniciar Expo Dev Server
npx expo run:ios   # Executar no iOS
npx expo run:android # Executar no Android
```

---

## 🚀 Deploy

### Web (Vercel)
O projeto está configurado para deploy na Vercel. Basta conectar o repositório e definir as variáveis de ambiente.

### Mobile (EAS)
```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Build para iOS
eas build --platform ios

# Build para Android
eas build --platform android
```

---

## 📄 Documentos Adicionais

- [IMPROVEMENTS.md](./IMPROVEMENTS.md) - Melhorias planejadas
- [SECURITY_ASSESSMENT.md](./SECURITY_ASSESSMENT.md) - Avaliação de segurança

---

## 📝 Licença

Projeto privado. Todos os direitos reservados.
