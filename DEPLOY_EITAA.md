# راه‌اندازی ایتا با Docker Run (بدون Compose)

قابلیت ایتا از پروژه مستقل EitaaBun (https://github.com/ghaemifard/EitaaBun) استفاده می‌کند. پنل فعلی bale_sender و سرویس ایتا در دو کانتینر مستقل می‌مانند و با شبکه Docker به هم متصل می‌شوند. سرویس ایتا روی میزبان پورت منتشر نمی‌کند.

## استقرار روی سرور فعلی

ابتدا از اطلاعات مهم نسخه پشتیبان بگیرید. سپس این دستورها را در سروری اجرا کنید که مخزن پنل در ~/bale_sender قرار دارد:

    cd ~/bale_sender
    git pull origin main

    mkdir -p data/eitaa-state data/eitaa-media data/eitaa-sessions
    docker network inspect internal_net >/dev/null 2>&1 || docker network create internal_net

### 1. ساخت و اجرای سرویس مستقل EitaaBun

    docker rm -f eitaa-bun 2>/dev/null || true
    docker rmi -f eitaa-bun:1.0 2>/dev/null || true
    docker build --no-cache -t eitaa-bun:1.0 ./eitaa-service

    docker run -d \
      --name eitaa-bun \
      --restart unless-stopped \
      --network internal_net \
      -v "$PWD/data/eitaa-sessions:/root/eitaSessions" \
      -v "$PWD/data/eitaa-media:/shared/eitaa-media" \
      eitaa-bun:1.0

### 2. بازسازی پنل فعلی با پشتیبانی ایتا

این همان روال فعلی شماست، با متغیرهای محیطی و volumeهای لازم برای ایتا اضافه‌شده:

    docker rm -f bale_sender 2>/dev/null || true
    docker rmi -f bale_sender:1.8 2>/dev/null || true
    docker build --no-cache -t bale_sender:1.8 .

    docker run -d \
      --name bale_sender \
      --restart unless-stopped \
      --network internal_net \
      -p 3002:8085 \
      -p 8005:8005 \
      -e EITAA_SERVICE_URL=http://eitaa-bun:1234 \
      -e EITAA_STATE_DIR=/app/data/eitaa-state \
      -e EITAA_MEDIA_DIR=/shared/eitaa-media \
      -v "$PWD/data/eitaa-state:/app/data/eitaa-state" \
      -v "$PWD/data/eitaa-media:/shared/eitaa-media" \
      bale_sender:1.8

دقت کنید که دستورهای بالا کانتینر فعلی پنل را حذف و از نو می‌سازند؛ قبل از اجرا از داده‌ها و تنظیمات مهم بکاپ بگیرید. پورت‌های پنل همچنان 3002 و 8005 هستند. پورت 1234 فقط داخل شبکه internal_net در دسترس است.

## بررسی اجرا

    docker ps --filter name=eitaa-bun
    docker logs --tail 100 eitaa-bun
    docker logs --tail 100 bale_sender
    docker exec bale_sender python -c "import requests; print(requests.get('http://eitaa-bun:1234/', timeout=5).text)"

اگر دستور آخر Eitaa Manager را نشان دهد، ارتباط شبکه‌ای پنل با سرویس EitaaBun برقرار است.

## قابلیت‌ها و محدودیت‌ها

- ورود با شماره، کد ورود و رمز دومرحله‌ای، ذخیره نشست، فایل Excel مخاطبان، ارسال متن/رسانه، نمایش پیشرفت و خروجی Excel پیاده‌سازی شده است.
- نشست‌های ایتا در data/eitaa-sessions، گزارش‌ها و وضعیت در data/eitaa-state و رسانه‌های موقت در data/eitaa-media نگهداری می‌شوند. این مسیرها را پاک نکنید مگر اینکه عمداً بخواهید داده‌ها حذف شوند.
- وابستگی requests برای API ایتا به API/requirements.txt اضافه شده و هنگام build پنل نصب می‌شود. وابستگی‌های TypeScript/Bun داخل image جداگانه EitaaBun در زمان build نصب می‌شوند.
- فایل مخاطبان باید xlsx یا xlsm باشد؛ برای هر ارسال حداکثر ۵۰۰۰ مخاطب پذیرفته می‌شود. فقط به مخاطبانی پیام ارسال کنید که رضایت دریافت پیام را داده‌اند.
- تصویر به شکل عکس ارسال می‌شود؛ در API upstream فعلی، ویدئو به صورت فایل پیوست ارسال می‌شود، نه نوع رسانه ویدئویی اختصاصی.
- ابتدا با یک مخاطب آزمایشی که رضایت داده است ورود و ارسال را بررسی کنید.
