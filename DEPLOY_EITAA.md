# استقرار و عیب‌یابی اتصال پنل به سرویس ایتا

سرویس EitaaBun در مخزن جداگانه `eitasrc` و کانتینر `eitaa-service` اجرا می‌شود. پنل واقعی این مخزن با نام کانتینر `panel_sepehr` اجرا می‌شود. برای ارسال رسانه، هر دو کانتینر باید **همان Docker volume با نام `eitaa-media-shared` را در مسیر دقیق `/shared/eitaa-media` mount کنند**.

> خطای `Media file is not accessible inside eitaa-service` معمولاً یعنی Volume در کانتینر سرویس ایتا mount نشده، Volume متفاوتی متصل است، یا فایل هنگام اجرای درخواست دیگر در آن Volume وجود ندارد. ساختن پوشه با همین نام بدون Volume مشترک کافی نیست.

## 1) بررسی شبکه و Volume

این دستورات Volume موجود را حذف نمی‌کنند:

```bash
docker network inspect internal_net >/dev/null 2>&1 || docker network create internal_net
docker volume inspect eitaa-media-shared >/dev/null 2>&1 || docker volume create eitaa-media-shared
docker volume inspect eitasrc-data >/dev/null 2>&1 || docker volume create eitasrc-data
```

## 2) ساخت و اجرای سرویس ایتا

```bash
cd ~/eitasrc
git pull origin main
docker build -t eitaa-service:latest .
```

قبل از بازسازی کانتینر، مطمئن شوید Volume نشست واقعی حساب همان `eitasrc-data` است. اگر نشست‌ها در Volume دیگری هستند، نام همان Volume را در دستور `-v` نگه دارید؛ **Volume نشست‌ها را حذف نکنید**.

```bash
docker rm -f eitaa-service 2>/dev/null || true
docker run -d \
  --name eitaa-service \
  --restart unless-stopped \
  --network internal_net \
  -v eitasrc-data:/data \
  -v eitaa-media-shared:/shared/eitaa-media \
  eitaa-service:latest
```

## 3) ساخت و راه‌اندازی پنل

در این مخزن، `docker-compose.yml` از قبل Volume خارجی `eitaa-media-shared` را برای سرویس `panel_sepehr` تعریف کرده است. پس از اطمینان از مقدارهای صحیح فایل `.env`:

```bash
cd ~/panel_sepehr
git pull origin main
docker compose up -d --build panel_sepehr
```

اگر روی سرور Docker Compose نصب نیست، کانتینر پنل را با همان تنظیمات فعلی‌اش بازسازی کنید و حتماً این mount را داشته باشد:

```bash
-v eitaa-media-shared:/shared/eitaa-media
```

متغیرهای محیطی لازم پنل:

```bash
EITAA_SERVICE_URL=http://eitaa-service:1234
EITAA_MEDIA_DIR=/shared/eitaa-media
```

## 4) آزمون قطعی Volume مشترک

این تست یک فایل آزمایشی در Volume می‌سازد و بررسی می‌کند که هر دو کانتینر همان فایل را ببینند:

```bash
docker exec panel_sepehr sh -lc 'touch /shared/eitaa-media/.mount-test && ls -l /shared/eitaa-media/.mount-test'
docker exec eitaa-service sh -lc 'ls -l /shared/eitaa-media/.mount-test'
docker exec panel_sepehr rm -f /shared/eitaa-media/.mount-test
```

هر دو دستور اول باید فایل `.mount-test` را نمایش دهند. اگر کانتینر پنل شما نام دیگری دارد، `panel_sepehr` را با نام واقعی جایگزین کنید.

برای تأیید تنظیمات واقعی Mount:

```bash
docker inspect panel_sepehr --format '{{json .Mounts}}'
docker inspect eitaa-service --format '{{json .Mounts}}'
```

در خروجی هر دو باید مقصد `/shared/eitaa-media` و Volume یکسان `eitaa-media-shared` باشد.

## 5) خطای `CONTACT_NOT_RESOLVED`

این خطا جدا از Mount رسانه است. یعنی پنل نتوانسته مخاطب را به شناسه‌ای تبدیل کند که سرویس بتواند به آن پیام بفرستد؛ این خطا به‌تنهایی ثابت نمی‌کند که شماره در ایتا حساب ندارد.

در کد فعلی پنل، خطای نامشخص در مرحله تبدیل مخاطب باید به‌عنوان «عضویت تأیید نشد» ثبت شود. اگر همچنان دقیقاً `CONTACT_NOT_RESOLVED` می‌بینید، نسخه اجراشده پنل یا سرویس ایتا احتمالاً با سورس فعلی متفاوت است، یا این کد از مسیر دیگری می‌آید. برای تشخیص، نسخه‌های فعلی و لاگ هر دو کانتینر را بررسی کنید:

```bash
docker logs --tail 150 eitaa-service
docker logs --tail 150 panel_sepehr
docker inspect eitaa-service --format '{{.Image}}'
docker inspect panel_sepehr --format '{{.Image}}'
```

لاگ‌ها ممکن است حاوی اطلاعات نشست یا شماره باشند؛ پیش از به‌اشتراک‌گذاری، اطلاعات حساس را حذف کنید.
