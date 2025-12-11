# i18n կառուցվածք (draft)

## Թղթապանակներ
- `locales/`
  - `en/`
    - `common.json` — գլոբալ UI/հեդեր/ֆուտեր/կոճակներ։
    - `home.json` — Home էջի հատուկ տեքստեր (`hero_title`, `hero_subtitle` և այլն)։
    - `product.json` — Product էջի ստատիկ պիտակներ (`details_title`, `related_products_title` և այլն)։
    - `products.json` — Product-ների տեքստեր ըստ id (`title`, `shortDescription`, `longDescription`)։
    - `attributes.json` — Ատրիբուտների ցուցադրելի պիտակներ ըստ code խմբի (`color`, `size` ...)։
  - `hy/` — նույն կառուցվածքով ֆայլեր, արժեքները հայերեն։

## Օգնականներ (helpers)
- `t(lang, path)`  
  - Path = `namespace.key` (namespace = ֆայլի անունը՝ `common`, `home`, `product`)։  
  - Լեզվային fallback: բացակայող բանալու դեպքում վերադարձնել path կամ դատարկ տող։
- `getProductText(lang, productId, field)`  
  - Կարդում է տվյալ լեզվի `products.json`, վերցնում id (ստրինգ) → field (`title`, `shortDescription`, `longDescription`)։  
  - Fallback: դատարկ տող։
- `getAttributeLabel(lang, type, value)`  
  - Կարդում է `attributes.json`, type (`color`, `size` ...) → value code։  
  - Fallback: վերադարձնում է code-ը։

## Օգտագործման կանոններ
- Բոլոր կոմպոնենտներում և էջերում կոշտ տեքստեր չպետք է մնան; օգտագործել `t(lang, "...")` համապատասխան namespace-ով։
- Ապրանքի վերնագրերը/նկարագրությունները չեն գալիս ԲԴ-ից կամ կոշտ տեքստից, այլ `getProductText`-ով։
- Ատրիբուտների user-facing պիտակները ցույց տալ `getAttributeLabel`-ով (գույն, չափ և այլն)։
- Նույն բանալիները պահել բոլոր լեզուներում՝ keys parity ապահովելու համար։

## Լեզվի աղբյուր
- Պարզաբանել/վերօգտագործել ընթացիկ `lang` որոշման մեխանիզմը (URL prefix, query, context) և փոխանցել ներքև կոմպոնենտներին։

## Ստուգումներ
- Build հաջողվում է։
- en ↔ hy փոփոխելիս փոխվում են ստատիկ տեքստերը, ապրանքի վերնագիր/նկարագրություն, ատրիբուտ պիտակներ։

