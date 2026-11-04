# اتصال BaleLink به پنل سپهر

## معماری

- پنل سپهر از طریق شبکه خصوصی Docker با آدرس `http://bale_super:8787` به Gateway متصل می‌شود.
- کانتینر `bale_super` به هر دو شبکه `internal_net` و `internet_net` وصل است؛ پنل فقط به `internal_net` نیاز دارد.
- پورت 8787 روی میزبان publish نمی‌شود و API فقط از شبکه Docker در دسترس است.
- نشست BaleLink در volume دائمی `bale-super-data` نگهداری می‌شود.
- فقط دکمه `super` در منوی «ارسال پیام شخصی بله» از مسیر مستقل `/api/bale-super` و Gateway استفاده می‌کند. مسیرهای قدیمی `/api/bale` و سایر پیام‌رسان‌ها به Gateway وصل نشده‌اند و دست‌نخورده باقی مانده‌اند.

## آماده‌سازی سرور

هر دو مخزن را در مسیرهای مشخص clone کنید. به‌صورت پیش‌فرض Compose فرض می‌کند پوشه‌های `panel_sepehr` و `bale_super` کنار یکدیگر هستند:

```text
deploy/
  panel_sepehr/
  bale_super/
```

شبکه‌های موردنیاز باید از قبل وجود داشته باشند:

```bash
docker network inspect internal_net
docker network inspect internet_net
```

اگر شبکه‌ای وجود ندارد، آن را مطابق معماری فعلی سرور ایجاد کنید؛ شبکه موجود را بدون بررسی حذف یا بازسازی نکنید.

در فایل `.env` سمت سرور پنل این مقادیر را اضافه کنید. کلید را فقط روی سرور بسازید و در Git commit نکنید:

```dotenv
BALELINK_API_KEY=یک_کلید_تصادفی_قوی_و_خصوصی
BALELINK_GATEWAY_URL=http://bale_super:8787
BALELINK_SESSION=sepehr
```

برای تولید کلید تصادفی می‌توانید اجرا کنید:

```bash
openssl rand -hex 32
```

اگر مسیر دو مخزن کنار هم نیست، مقدار `BALE_SUPER_BUILD_CONTEXT` را در فایل `.env` پنل به مسیر مطلق پوشه `bale_super` تنظیم کنید.

## ساخت و اجرا

از پوشه `panel_sepehr`:

```bash
docker compose build bale_super panel_sepehr
docker compose up -d bale_super panel_sepehr
docker compose ps
docker compose logs --tail=100 bale_super panel_sepehr
```

بررسی سلامت Gateway از داخل شبکه Docker:

```bash
docker exec panel_sepehr python -c "import urllib.request; print(urllib.request.urlopen('http://bale_super:8787/health', timeout=5).read().decode())"
```

این endpoint سلامت عمومی است؛ برای endpointهای حساب و ارسال، کلید API به‌صورت خودکار توسط پنل ارسال می‌شود.

## رفتار ارسال

- Excel، اعتبارسنجی شماره‌ها، progress، وضعیت تک‌تک گیرنده‌ها و خروجی گزارش اکسل در پنل حفظ می‌شوند.
- در حالت Gateway، شماره موبایل مستقیماً مقصد ارسال است و افزودن مخاطب در رابط وب لازم نیست.
- متن، تصویر و ویدئو از endpointهای مستند Gateway ارسال می‌شوند.
- با حذف تنظیمات Gateway از محیط پنل، مسیر قبلی Playwright قابل استفاده خواهد بود.

## نکات عملیاتی

- پوشه/volume داده Gateway حاوی نشست ورود است؛ آن را عمومی نکنید و در Git قرار ندهید.
- پورت 8787 را به اینترنت publish نکنید.
- BaleLink یک کلاینت غیررسمی و در مرحله Alpha است؛ ابتدا با حساب و مخاطبان آزمایشی محدود تست کنید و قوانین و محدودیت‌های بله را رعایت کنید.
- این تغییرات به‌تنهایی به معنی deploy شدن روی سرور نیست؛ دستورات بالا باید روی میزبان اجرا شوند.

## وضعیت تغییرات GitHub

تغییرات فعلاً در دو Pull Request پیش‌نویس قرار دارند و هنوز به `main` ادغام نشده‌اند:

- پنل سپهر: https://github.com/syedalirezatabaei-star/panel_sepehr/pull/22
- Dockerfile سرویس BaleLink: https://github.com/syedalirezatabaei-star/bale_super/pull/1

برای دریافت نسخه آماده آزمایش، هر دو مخزن را در کنار هم قرار دهید و شاخه‌های زیر را checkout کنید. اگر مخزن‌ها از قبل clone شده‌اند، دستورات را در پوشه همان مخزن اجرا کنید:

```bash
# داخل پوشه panel_sepehr
git fetch origin
git checkout -B feature/bale-super-gateway origin/feature/bale-super-gateway

# داخل پوشه bale_super (کنار panel_sepehr)
git fetch origin
git checkout -B feature/docker-gateway origin/feature/docker-gateway
```

ساختار مسیر باید به این شکل باشد تا build context پیش‌فرض Compose درست کار کند:

```text
deploy/
  panel_sepehr/
  bale_super/
```

در فایل `.env` پوشه `panel_sepehr` مقدار `BALELINK_API_KEY` را با یک مقدار تصادفی قوی پر کنید. همان کلید به پنل و کانتینر Gateway داده می‌شود. سپس از همان پوشه اجرا کنید:

```bash
docker compose config
docker compose build panel_sepehr bale_super
docker compose up -d panel_sepehr bale_super
docker compose ps
docker compose logs --tail=100 panel_sepehr bale_super
```

قبل از اجرا مطمئن شوید شبکه‌های Docker موجودند و build context به پوشه واقعی `bale_super` اشاره می‌کند. این نسخه هنوز روی سرور و حساب واقعی بله smoke-test نشده است؛ ابتدا ورود و ارسال محدود به شماره آزمایشی انجام دهید.


## بررسی اتصال API مستقل

پس از بالا آمدن هر دو کانتینر، endpoint زیر وضعیت اتصال را بررسی می‌کند:

```text
GET /api/bale-super/connection
```

این مسیر از احراز هویت پنل و مجوز `bale.personal_message` عبور می‌کند و بررسی می‌کند:
- تنظیمات URL و API Key کامل باشند.
- پنل از طریق شبکه خصوصی Docker به `bale_super:8787/health` دسترسی داشته باشد.
- API Key با یک درخواست احراز هویت‌شده به Gateway معتبر باشد.
- وضعیت نشست حساب بله مشخص شود.

مقدار API Key در پاسخ نمایش داده نمی‌شود. برای تست endpoint باید در پنل وارد شده باشید و مجوز ارسال پیام شخصی بله را داشته باشید.
