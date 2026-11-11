# استقرار GoOmni و پنل سپهر با بله، ایتا و روبیکا

این راهنما برای اجرای سه سرویس پیام‌رسان در کنار پنل سپهر است.

## معماری و پورت‌ها

- GoOmni داخل Docker روی پورت `3000` گوش می‌دهد.
- پورت میزبان فقط روی loopback با `127.0.0.1:1598` منتشر می‌شود.
- Backend سپهر از طریق Docker DNS به `http://goomni:3000` متصل می‌شود؛ در ارتباط داخلی از پورت 1598 استفاده نکنید.
- هر دو Compose باید به شبکه خارجی `internal_net` وصل باشند.
- Bale در GoOmni به‌صورت پیش‌فرض فعال است؛ `EITAA_ENABLED=true` و `RUBIKA_ENABLED=true` دو آداپتر دیگر را فعال می‌کنند.

## 1. آماده‌سازی شبکه و فایل‌ها

ابتدا از مسیرهای فعلی و نام Volumeهای موجود اطمینان بگیرید. هیچ Volume موجودی را حذف نکنید.

```bash
docker network inspect internal_net >/dev/null 2>&1 || docker network create internal_net
mkdir -p ~/goomni
cd ~/goomni
git clone https://github.com/syedalirezatabatabaei-star/rubika-bale-eita.git .
cp .env.example .env
chmod 600 .env
```

اگر پوشه `~/goomni` از قبل clone شده است، دوباره clone نکنید؛ فقط در همان پوشه `git pull origin main` بزنید.

## 2. تنظیم امن GoOmni

یک کلید رمزنگاری ۳۲ بایتی Base64 و یک رمز طولانی بسازید:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

خروجی اول را در `APP_MASTER_KEY` و خروجی دوم را به‌عنوان رمز بعد از `admin:` در `APP_BASIC_AUTH` قرار دهید. فایل `.env` را با ویرایشگر امن تغییر دهید و مجوزش را حفظ کنید:

```bash
chmod 600 .env
```

در `.env` این مقادیر باید برقرار باشند:

```dotenv
APP_PORT=1598
APP_BASIC_AUTH=admin:YOUR_LONG_RANDOM_PASSWORD
APP_MASTER_KEY=YOUR_BASE64_32_BYTE_KEY
EITAA_ENABLED=true
RUBIKA_ENABLED=true
```

مقدار `BALE_APP_ID=0` و `BALE_API_KEY=` در قالب نمونه، هویت کلاینت بله را کامل نمی‌کند. اگر ورود بله در این استقرار به هویت کلاینت نیاز دارد، مقادیر معتبر مورد تأیید GoOmni را در همان فایل تنظیم کنید. هر سه آداپتر روشن بودنشان با موفقیت ورود حساب و ارسال واقعی یکسان نیست؛ هر provider را جداگانه تست کنید.

## 3. Build و Up سرویس GoOmni

```bash
cd ~/goomni
docker network inspect internal_net >/dev/null
docker compose config --quiet
docker compose build --pull goomni
docker compose up -d goomni
docker compose ps
docker compose logs --tail=100 goomni
```

بررسی اینکه پورت میزبان درست منتشر شده است:

```bash
docker port goomni
curl -I http://127.0.0.1:1598/
```

ممکن است مسیر ریشه پاسخ UI یا redirect بدهد؛ مهم این است که اتصال TCP/HTTP برقرار شود. اطلاعات Basic Auth را در دستور curl یا لاگ عمومی قرار ندهید.

## 4. تنظیم پنل سپهر

در فایل `~/panel_sepehr/.env` این متغیرها را تنظیم کنید. مقدار Basic Auth باید دقیقاً همان مقدار GoOmni باشد:

```dotenv
GOOMNI_URL=http://goomni:3000
GOOMNI_BASIC_AUTH=admin:THE_SAME_LONG_RANDOM_PASSWORD
RUBIKA_DEVICE_ID=sepehr-rubika
```

از آنجا که Compose پنل از قبل به `internal_net` متصل است، نیازی به انتشار پورت 3000 روی IP عمومی سرور نیست.

## 5. Build و Up پنل سپهر

```bash
cd ~/panel_sepehr
git pull origin main
docker compose config --quiet
docker compose build --pull panel_sepehr
docker compose up -d panel_sepehr
docker compose ps
docker logs --tail=150 panel_sepehr
```

اگر سرویس‌های فعلی ایتا و بله جداگانه اجرا می‌شوند، آن‌ها را حذف یا بازسازی نکنید. قبل از هر تغییر، نام کانتینرها و Volumeهای فعلی را بررسی کنید.

## 6. تست اتصال داخلی

```bash
docker exec panel_sepehr python -c "import urllib.request; print(urllib.request.urlopen('http://goomni:3000/health', timeout=5).status)"
```

اگر مسیر `/health` در نسخه نصب‌شده ارائه نشده باشد، این تست ممکن است 404 بدهد؛ در آن صورت لاگ GoOmni و مسیرهای health مستند همان نسخه را بررسی کنید. برای بررسی صرف DNS:

```bash
docker exec panel_sepehr getent hosts goomni
```

## 7. تست عملی هر پیام‌رسان

1. وارد UI مدیریتی GoOmni از روی سرور یا تونل امن شوید؛ آدرس محلی آن `http://127.0.0.1:1598/ui/` است.
2. برای هر provider یک device مستقل بسازید و با حساب آزمایشی مجاز وارد شوید.
3. از `GET /app/providers` و capabilityهای هر device، نوع ارسال پشتیبانی‌شده را بخوانید.
4. ابتدا برای هر سه سرویس یک پیام متنی به مخاطب آزمایشی بفرستید؛ سپس تصویر و ویدیو را جداگانه امتحان کنید.
5. بعد از موفقیت تست Gateway، مسیرهای متن/رسانه و گزارش را از پنل سپهر تست کنید.

## نکات مهم

- پورت 1598 فقط روی `127.0.0.1` منتشر می‌شود؛ برای دسترسی مدیریتی از SSH tunnel یا reverse proxy دارای TLS و احراز هویت استفاده کنید.
- هیچ‌گاه `APP_BASIC_AUTH`، `APP_MASTER_KEY` یا فایل `.env` را در GitHub قرار ندهید.
- `docker compose down -v` اجرا نکنید و Volumeهای `goomni-data`، `eitaa-media-shared`، `eitasrc-data` یا هر Volume نشست موجود را حذف نکنید.
- پاسخ 200 از API فقط پذیرش/موفقیت عملیات در سطح API را نشان می‌دهد؛ تحویل یا خواندن پیام توسط مخاطب را تضمین نمی‌کند.
- در نتیجه نامشخص (unknown) پیام را با کلید جدید دوباره ارسال نکنید؛ ابتدا وضعیت همان عملیات را بررسی کنید.
