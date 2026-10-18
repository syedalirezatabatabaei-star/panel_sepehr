# اجرای EitaaBun و پنل با پوشه رسانه مشترک

EitaaBun در مخزن جداگانه `eitasrc` و کانتینر `eitaa-service` اجرا می‌شود. پنل و سرویس باید روی شبکه `internal_net` باشند و **هر دو باید همان Volume را در مسیر یکسان `/shared/eitaa-media` mount کنند**. در غیر این صورت ارسال عکس و ویدئو با خطای پیدا نشدن فایل (ENOENT) شکست می‌خورد.

## 1) ساخت شبکه و Volume مشترک

این دستورات تکرارپذیر هستند و داده‌های Volumeهای موجود را حذف نمی‌کنند:

```bash
docker network inspect internal_net >/dev/null 2>&1 || docker network create internal_net
docker volume create eitasrc-data
docker volume create eitaa-media-shared
```

## 2) ساخت ایمیج EitaaBun

```bash
cd ~/eitasrc
docker build -t eitaa-service:latest .
```

## 3) اجرای سرویس ایتا

اگر کانتینر قدیمی با این نام وجود دارد، ابتدا مطمئن شوید از همان Volume نشست‌ها استفاده می‌کند. دستور زیر کانتینر را بازسازی می‌کند اما Volume نشست‌ها و رسانه‌ها را حذف نمی‌کند:

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

اگر نشست‌های فعلی در Volume دیگری ذخیره شده‌اند، به‌جای `eitasrc-data` نام همان Volume قبلی را استفاده کنید. Volume نشست‌ها را حذف نکنید.

## 4) اتصال پنل به همان Volume رسانه

در مخزن پنل، ابتدا ایمیج را بسازید:

```bash
cd ~/bale_sender
docker build -t bale_sender:latest .
```

قبل از حذف کانتینر پنل فعلی، اطلاعاتی که فقط داخل کانتینر است را پشتیبان بگیرید. برای مثال:

```bash
mkdir -p data/eitaa-state data/eitaa-media
docker cp bale_sender:/app/data/eitaa-state/. data/eitaa-state/ 2>/dev/null || true
```

سپس اجرا کنید:

```bash
docker rm -f bale_sender
docker run -d \
  --name bale_sender \
  --restart unless-stopped \
  --network internal_net \
  -e EITAA_SERVICE_URL=http://eitaa-service:1234 \
  -e EITAA_STATE_DIR=/app/data/eitaa-state \
  -e EITAA_MEDIA_DIR=/shared/eitaa-media \
  -p 3002:8085 \
  -p 8005:8005 \
  -v "$PWD/data/eitaa-state:/app/data/eitaa-state" \
  -v eitaa-media-shared:/shared/eitaa-media \
  bale_sender:latest
```

**مهم:** دستور اجرای پنل را از پوشه `~/bale_sender` اجرا کنید تا `$PWD` مسیر درست باشد. اگر پورت‌های فعلی پنل متفاوت‌اند، همان پورت‌های قبلی را حفظ کنید.

## 5) بررسی اتصال و فایل‌ها

```bash
docker ps --filter name=eitaa-service --filter name=bale_sender
docker logs --tail 80 eitaa-service
docker exec bale_sender python -c "import requests; r=requests.get('http://eitaa-service:1234/', timeout=5); print(r.status_code, r.text[:200])"
docker exec bale_sender sh -c 'touch /shared/eitaa-media/.mount-test && ls -la /shared/eitaa-media/.mount-test'
docker exec eitaa-service sh -c 'ls -la /shared/eitaa-media'
```

فایل آزمایشی باید از هر دو کانتینر دیده شود. بعد از تست می‌توان آن را حذف کرد:

```bash
docker exec bale_sender rm -f /shared/eitaa-media/.mount-test
```

رسانه‌های آپلودشده توسط پنل با مسیر `/shared/eitaa-media/...` به سرویس ایتا فرستاده می‌شوند؛ به همین دلیل mount مشترک با مسیر یکسان برای هر دو کانتینر ضروری است.
