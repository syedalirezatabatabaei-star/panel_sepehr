# راه‌اندازی ارسال شخصی ایتا

این قابلیت از پروژه مستقل [EitaaBun](https://github.com/ghaemifard/EitaaBun) استفاده می‌کند. سرویس Bun در کانتینر جدا اجرا می‌شود؛ نشست‌ها، گزارش‌ها و فایل‌های موقت ایتا از بله جدا هستند. نسخه upstream با commit مشخص pin شده است.

## راه‌اندازی Docker

از ریشه مخزن اجرا کنید:

    docker compose -f docker-compose.eitaa.yml up -d --build
    docker compose -f docker-compose.eitaa.yml ps
    docker compose -f docker-compose.eitaa.yml logs -f eitaa-bun
    docker compose -f docker-compose.eitaa.yml logs -f panel

پنل روی پورت‌های پیش‌فرض 3002 (وب) و 8005 (API) منتشر می‌شود. برای تغییر آن‌ها می‌توانید PANEL_WEB_PORT و PANEL_API_PORT را در محیط تنظیم کنید. سرویس EitaaBun فقط در شبکه داخلی Docker و روی پورت 1234 در دسترس است.

## نکات استقرار

- اگر پنل فعلی با کانتینر دیگری روی پورت‌های 3002 یا 8005 اجراست، قبل از اجرای compose از تداخل پورت‌ها جلوگیری کنید. این فایل compose کل پنل را نیز می‌سازد؛ ابتدا از داده‌ها و تنظیمات نصب فعلی نسخه پشتیبان بگیرید.
- سه volume مجزا برای نشست‌های ایتا، وضعیت/گزارش‌ها و رسانه‌های موقت تعریف شده‌اند. حذف آن‌ها می‌تواند نشست یا گزارش‌ها را از بین ببرد.
- وابستگی‌های EitaaBun از package.json خود پروژه و در مرحله build با bun install نصب می‌شوند؛ به requirements پایتون اضافه نشده‌اند.
- فایل Excel باید xlsx یا xlsm باشد. نام ستون شماره می‌تواند شماره، موبایل، phone یا mobile باشد. بدون سرستون، ستون اول شماره و ستون دوم نام است.
- تصویر به‌صورت عکس ارسال می‌شود. API فعلی EitaaBun ویدئو را به‌صورت media type مستقل پیاده نکرده؛ بنابراین ویدئو و سایر فایل‌های پشتیبانی‌شده به شکل پیوست فایل فرستاده می‌شوند.
- حداقل فاصله ارسال ۲ ثانیه است و هر job حداکثر ۵۰۰۰ مخاطب می‌پذیرد. فقط برای مخاطبانی پیام بفرستید که رضایت دریافت آن را دارند و قوانین و محدودیت‌های ایتا را رعایت کنید.
- ابتدا با یک حساب و یک مخاطب آزمایشی اعتبارسنجی کنید.

## APIهای اضافه‌شده

- GET /api/eitaa/health
- GET /api/eitaa/account
- POST /api/eitaa/auth/send-code
- POST /api/eitaa/auth/login
- POST /api/eitaa/auth/login-password
- POST /api/eitaa/account/reset
- POST /api/eitaa/send
- GET /api/eitaa/send/status/{job_id}
- GET /api/eitaa/send/export/{job_id}
