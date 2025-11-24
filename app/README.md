# Shop App - Development Server

Այս folder-ը թույլ է տալիս միաժամանակ աշխատացնել backend-ը և frontend-ը:

## Օգտագործում

### Development Mode (Backend + Frontend միասին)
```bash
npm run dev
```

Սա կաշխատացնի:
- **Backend API** - `http://localhost:3001`
- **Frontend Web** - `http://localhost:3000`

### Առանձին աշխատացնել

**Միայն Backend:**
```bash
npm run dev:api
```

**Միայն Frontend:**
```bash
npm run dev:web
```

### Build (Production)

**Երկուսն էլ build:**
```bash
npm run build
```

**Առանձին build:**
```bash
npm run build:api
npm run build:web
```

### Start (Production)

**Երկուսն էլ start:**
```bash
npm start
```

### Database Seed
```bash
npm run db:seed
```

## Նշումներ

- Backend-ը աշխատում է `apps/api` folder-ում
- Frontend-ը աշխատում է `apps/web` folder-ում
- Երկու server-ները աշխատում են միաժամանակ `concurrently`-ի օգնությամբ
- Console-ում կտեսնեք `[API]` և `[WEB]` prefix-ներով log-երը


