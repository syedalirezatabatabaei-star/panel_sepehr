# اجرای EitaaBun در کانتینر مستقل

EitaaBun در مخزن جداگانه `eitasrc` و کانتینر `eitaa-service` اجرا می‌شود. پنل فقط از شبکه داخلی Docker به آن متصل می‌شود؛ پورت 1234 روی میزبان منتشر نمی‌شود.

## 1) ساخت شبکه مشترک

اگر شبکه از قبل وجود دارد، این مرحله را رد کنید:

```bash
docker network create internal_net
```

## 2) ساخت و اجرای سرویس ایتا

```bash
git clone https://github.com/syedalirezatabatabaei-star/eitasrc.git
cd eitasrc
docker compose up -d --build
docker logs --tail 100 eitaa-service
```

اگر مخزن را قبلاً دریافت کرده‌اید، به پوشه آن بروید و `git pull` بزنید.

## 3) اتصال پنل به سرویس جدا

در مخزن پنل:

```bash
cd ~/bale_sender
git pull origin main
docker build --no-cache -t bale_sender:latest .
```

کانتینر پنل باید روی شبکه `internal_net` باشد و متغیر `EITAA_SERVICE_URL=http://eitaa-service:1234` را داشته باشد. اگر کانتینر قبلی را با `docker run` می‌سازید، هنگام اجرای مجدد آن این گزینه‌ها را اضافه کنید:

```bash
-e EITAA_SERVICE_URL=http://eitaa-service:1234
--network internal_net
```

نمونه اجرای پنل (مسیر داده‌ها را با محل واقعی داده‌های خودتان هماهنگ کنید):

```bash
docker rm -f bale_sender 2>/dev/null || true
docker run -d \
  --name bale_sender \
  --restart unless-stopped \
  --network internal_net \
  -e EITAA_SERVICE_URL=http://eitaa-service:1234 \
  -p 3002:8085 \
  -p 8005:8005 \
  -v "$PWD/data/eitaa-state:/app/data/eitaa-state" \
  -v "$PWD/data/eitaa-media:/shared/eitaa-media" \
  bale_sender:latest
```

قبل از حذف کانتینر قبلی، از داده‌های مهم نسخه پشتیبان بگیرید. مسیر نشست‌ها و فایل‌های موجود را بدون بررسی حذف یا جابه‌جا نکنید.

## 4) بررسی اتصال و خطاها

```bash
docker ps
docker logs --tail 100 eitaa-service
docker logs --tail 100 bale_sender
docker exec bale_sender python -c "import requests; r=requests.get('http://eitaa-service:1234/', timeout=5); print(r.status_code, r.text[:200])"
docker exec bale_sender python -c "import requests; r=requests.get('http://127.0.0.1:8005/api/eitaa/health', timeout=10); print(r.status_code, r.text)"
```

در لاگ سرویس مستقل، خطاهای احراز هویت با پیشوندهای `[EITAA SEND CODE RPC ERROR]` و `[EITAA SEND CODE EXCEPTION]` قابل جست‌وجو هستند. اگر خطای محدودیت یا `FLOOD_WAIT` مشاهده شد، درخواست کد را پشت سر هم تکرار نکنید.
