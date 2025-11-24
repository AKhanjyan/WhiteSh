# 🗄️ Տվյալների բազայի ստեղծում

## Նկարագրություն

Այս փաստաթուղթը բացատրում է, թե ինչպես ստեղծել նոր տվյալների բազա հին բազայի նման:

## 📋 Ինչ է ստեղծվում

`seed.js` սկրիպտը ստեղծում է:

1. **Օգտատերեր (2)**
   - Admin user: `admin@shop.am` / `admin123`
   - Test user: `test@shop.am` / `test123`

2. **Բրենդներ (4)**
   - Apple
   - Samsung
   - Nike
   - Adidas

3. **Կատեգորիաներ (6)**
   - Electronics (էլեկտրոնիկա)
     - Smartphones (սմարթֆոններ)
     - Tablets (պլանշետներ)
   - Clothing (հագուստ)
     - Shoes (կոշիկ)
     - Sportswear (սպորտային հագուստ)

4. **Ատրիբուտներ (2)**
   - Color (գույն): Black, White, Red, Blue
   - Size (չափ): S, M, L, XL

5. **Ապրանքներ (9)**
   - iPhone 15 Pro (2 variants)
   - Samsung Galaxy S24 (2 variants)
   - iPad Pro 12.9" (1 variant)
   - Nike Air Max 270 (2 variants)
   - Adidas Ultraboost 22 (2 variants)
   - Nike Dri-FIT T-Shirt (2 variants)
   - Adidas Climalite T-Shirt (2 variants)
   - iPhone 14 (2 variants)
   - Samsung Galaxy Tab S9 (1 variant)

## 🚀 Օգտագործում

### 1. Ստուգեք MongoDB-ի միացումը

Նախ համոզվեք, որ MongoDB-ն աշխատում է:

```bash
# Windows PowerShell
Test-NetConnection -ComputerName localhost -Port 27017

# Կամ MongoDB Compass-ով միացեք
mongodb://localhost:27017
```

### 2. Ստուգեք .env ֆայլը

Համոզվեք, որ `.env` ֆայլում կա MongoDB connection string:

```env
MONGODB_URI=mongodb://localhost:27017/shop_dev
```

### 3. Գործարկեք seed script-ը

```bash
cd WhiteShop/apps/api
node src/seed.js
```

Կամ root directory-ից:

```bash
cd WhiteShop
npm run db:seed
```

## 📊 Արդյունք

Script-ը կտպի մանրամասն տեղեկություններ ստեղծված տվյալների մասին:

```
🌱 Starting database seed...

🔌 Connecting to MongoDB...
✅ Connected to MongoDB

🗑️  Clearing existing data...
✅ Database cleared

👤 Creating users...
✅ Admin user created: admin@shop.am
✅ Test user created: test@shop.am

🏷️  Creating brands...
✅ Created 4 brands

📁 Creating categories...
✅ Created 6 categories

🎨 Creating attributes...
✅ Created 2 attributes (Color, Size)

📦 Creating products...
✅ Created 9 products with variants

==================================================
✅ Database seed completed successfully!
==================================================

📊 Summary:
   👤 Users: 2 (admin@shop.am, test@shop.am)
   🏷️  Brands: 4 (Apple, Samsung, Nike, Adidas)
   📁 Categories: 6 (with hierarchy)
   🎨 Attributes: 2 (Color, Size)
   📦 Products: 9 (with variants)

🔐 Login credentials:
   Admin: admin@shop.am / admin123
   Test:  test@shop.am / test123
```

## ⚠️ Զգուշացում

- Script-ը **կջնջի** բոլոր գոյություն ունեցող տվյալները (Users, Brands, Categories, Attributes, Products)
- Եթե ցանկանում եք պահպանել գոյություն ունեցող տվյալները, մեկնաբանեք `clearDatabase()` ֆունկցիայի կանչը `seed.js`-ում

## 🔧 Troubleshooting

### MongoDB connection error

Եթե ստանում եք connection error:

1. Ստուգեք, որ MongoDB-ն աշխատում է:
   ```bash
   # Windows
   net start MongoDB
   
   # Linux/Mac
   sudo systemctl start mongod
   
   # Docker
   docker start mongodb
   ```

2. Ստուգեք `.env` ֆայլի `MONGODB_URI`-ն

3. Ստուգեք MongoDB port-ը:
   ```bash
   # Windows PowerShell
   Test-NetConnection -ComputerName localhost -Port 27017
   ```

### Duplicate key error

Եթե ստանում եք duplicate key error, դա նշանակում է, որ որոշ տվյալներ արդեն գոյություն ունեն: Script-ը կջնջի գոյություն ունեցող տվյալները, բայց եթե դա չի աշխատում, ձեռքով ջնջեք collections-ները:

```bash
# MongoDB shell-ով
mongosh "mongodb://localhost:27017/shop_dev"
> use shop_dev
> db.users.deleteMany({})
> db.brands.deleteMany({})
> db.categories.deleteMany({})
> db.attributes.deleteMany({})
> db.products.deleteMany({})
```

## 📝 Հավելյալ տեղեկություն

- Seed script-ը գտնվում է `apps/api/src/seed.js`
- Script-ը օգտագործում է Mongoose models-ը `apps/api/src/models/` directory-ից
- Բոլոր տվյալները ստեղծվում են անգլերեն և հայերեն լեզուներով

## 🔄 Կրկին աշխատեցնել

Եթե ցանկանում եք կրկին աշխատեցնել seed script-ը:

```bash
cd WhiteShop/apps/api
node src/seed.js
```

Script-ը ավտոմատ կջնջի գոյություն ունեցող տվյալները և կստեղծի նորերը:




