# راه‌اندازی ایتا داخل همان کانتینر bale_sender

در این نسخه، EitaaBun، API پایتون و وب‌پنل همگی داخل یک کانتینر با نام `bale_sender` اجرا می‌شوند. کانتینر مستقل `eitaa-bun` و Docker Compose لازم نیست.

## ساخت و اجرا

ابتدا از داده‌های مهم پشتیبان بگیرید؛ این دستورات کانتینر قبلی را حذف و دوباره می‌سازند.

```bash
cd ~/bale_sender
git pull origin main
mkdir -p data/eitaa-state data/eitaa-sessions data/eitaa-media
docker rm -f bale_sender 2>/dev/null || true
docker rmi -f bale_sender:1.8 2>/dev/null || true
docker build --no-cache -t bale_sender:1.8 .
docker run -d \
  --name bale_sender \
  --restart unless-stopped \
  --network internal_net \
  -p 3002:8085 \
  -p 8005:8005 \
  -v "$PWD/data/eitaa-state:/app/data/eitaa-state" \
  -v "$PWD/data/eitaa-sessions:/root/eitaSessions" \
  -v "$PWD/data/eitaa-media:/shared/eitaa-media" \
  bale_sender:1.8
```

اگر شبکه internal_net وجود ندارد، پیش از اجرا `docker network create internal_net` را بزنید.

## بررسی
```bash
docker ps --filter name=bale_sender
docker logs --tail 100 bale_sender
docker exec bale_sender python -c "import requests; print(requests.get('http://127.0.0.1:1234/', timeout=5).status_code)"
docker exec bale_sender python -c "import requests; r=requests.get('http://127.0.0.1:8005/api/eitaa/health', timeout=10); print(r.status_code, r.text)"
```

ممکن است مسیر ریشه EitaaBun پاسخ 404 بدهد؛ این به‌تنهایی نشانه خرابی اتصال نیست. نشست‌ها و گزارش‌ها را از پوشه‌های data پاک نکنید مگر اینکه قصد حذف آن‌ها را دارید.

فقط برای مخاطبانی پیام ارسال کنید که رضایت دریافت آن را داده‌اند.
