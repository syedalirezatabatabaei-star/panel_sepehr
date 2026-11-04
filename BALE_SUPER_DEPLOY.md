# اتصال BaleLink به پنل سپهر

## معماری

- پنل سپهر از طریق شبکه خصوصی Docker با آدرس `http://bale_super:8787` به Gateway متصل می‌شود.
- کانتینر `bale_super` به هر دو شبکه `internal_net` و `internet_net` وصل است؛ پنل فقط به `internal_net` نیاز دارد.
- پورت 8787 روی میزبان publish نمی‌شود و API فقط از شبکه Docker در دسترس است.
- نشست BaleLink در volume دائمی `bale-super-data` نگهداری می‌شود.
- اگر `BALELINK_API_KEY` و `BALELINK_GATEWAY_URL` در محیط پنل تنظیم باشند، ورود و ارسال از Gateway انجام می‌شود. در غیر این صورت مسیر قبلی Playwright باقی می‌ماند.

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

برای آزمایش پیش از ادغام، هر دو شاخه زیر را روی سرور checkout کنید:

```bash
# در پوشه panel_sepehr
git fetch origin
git checkout feature/bale-super-gateway

# در پوشه bale_super
git fetch origin
git checkout feature/docker-gateway
```

پس از ادغام هر دو PR، می‌توانید از شاخه `main` استفاده کنید.
