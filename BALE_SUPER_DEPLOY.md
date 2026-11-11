# اتصال BaleLink به پنل سپهر

## مسیرهای واقعی روی سرور

دایرکتوری‌ها باید به این صورت باشند:

```text
/root/
  bale_sender/   # مخزن پنل سپهر
  bale_super/    # مخزن Gateway بله سوپر
```

نام دایرکتوری پنل روی سرور `bale_sender` است. نام سرویس و کانتینر Docker در Compose فعلی `panel_sepehr` باقی می‌ماند؛ این دو نام یکی نیستند.

## معماری

- پنل از طریق شبکه خصوصی Docker با آدرس `http://bale_super:8787` به Gateway متصل می‌شود.
- کانتینر `bale_super` به شبکه‌های `internal_net` و `internet_net` وصل است.
- پورت 8787 روی میزبان publish نمی‌شود.
- نشست BaleLink در volume دائمی `bale-super-data` نگهداری می‌شود.
- فقط دکمه Super از مسیر مستقل `/api/bale-super` استفاده می‌کند؛ API قدیمی `/api/bale` و سایر پیام‌رسان‌ها مستقل می‌مانند.

## تنظیمات محیطی

در فایل `/root/bale_sender/.env` این مقادیر را تنظیم کنید:

```dotenv
BALE_SUPER_BUILD_CONTEXT=/root/bale_super
BALELINK_API_KEY=کلید_تصادفی_قوی_و_خصوصی
BALELINK_GATEWAY_URL=http://bale_super:8787
BALELINK_SESSION=sepehr
```

کلید را روی سرور تولید کنید و در Git یا چت قرار ندهید:

```bash
openssl rand -hex 32
```

## دریافت شاخه‌های آزمایشی

ابتدا وضعیت تغییرات محلی را بررسی کنید. اگر تغییر محلی دارید، بدون بررسی آن را بازنویسی نکنید.

```bash
cd /root/bale_sender
git status
git fetch origin
git checkout -B feature/bale-super-gateway origin/feature/bale-super-gateway

cd /root/bale_super
git status
git fetch origin
git checkout -B feature/docker-gateway origin/feature/docker-gateway
```

## Build و اجرا

شبکه‌ها باید از قبل موجود باشند:

```bash
docker network inspect internal_net
docker network inspect internet_net
```

سپس از مسیر پنل اجرا کنید:

```bash
cd /root/bale_sender
docker compose config
docker compose build bale_super
docker compose up -d --no-deps bale_super
docker compose ps
docker compose logs --tail=100 bale_super
```

پس از اطمینان از سلامت Gateway، پنل را نیز با شاخه آزمایشی Build و اجرا کنید:

```bash
docker compose build panel_sepehr
docker compose up -d panel_sepehr
docker compose ps
docker compose logs --tail=100 panel_sepehr
```

## تست ارتباط

از داخل کانتینر پنل:

```bash
docker exec panel_sepehr python -c "import urllib.request; print(urllib.request.urlopen('http://bale_super:8787/health', timeout=5).read().decode())"
```

این فقط سلامت Gateway را بررسی می‌کند. برای بررسی احراز هویت و نشست حساب، پس از ورود به پنل و داشتن مجوز `bale.personal_message`، مسیر زیر را فراخوانی کنید:

```text
GET /api/bale-super/connection
```

## نکات عملیاتی

- پورت 8787 را به اینترنت publish نکنید.
- volume داده Gateway حاوی نشست ورود است؛ آن را عمومی نکنید.
- BaleLink کلاینت غیررسمی و Alpha است؛ ابتدا ورود و ارسال محدود به شماره آزمایشی را بررسی کنید.
- اجرای دستورات روی سرور هنوز لازم است؛ تغییرات GitHub به معنی deploy شدن نیست.

## Pull Requestها

- پنل سپهر: https://github.com/syedalirezatabatabaei-star/panel_sepehr/pull/22
- Gateway بله سوپر: https://github.com/syedalirezatabatabaei-star/bale_super/pull/1
