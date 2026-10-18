(function () {
  "use strict";

  window.openRubikaPersonalMessage = function () {
    const title = document.getElementById("headerTitle");
    const content = document.getElementById("settingsContent");
    if (title) title.textContent = "ارسال پیام شخصی روبیکا";
    if (content) {
      content.classList.remove("eitaa-broadcast-view");
      content.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">ارسال پیام شخصی روبیکا</h1>
          <p class="page-description">بخش رابط کاربری روبیکا</p>
        </div>
        <div class="card">
          <div class="card-body">
            <p>دکمه و صفحه این بخش اضافه شده است؛ اما سرویس بک‌اند و احراز هویت روبیکا هنوز در این پروژه پیاده‌سازی نشده است.</p>
            <p>برای فعال شدن ارسال واقعی، باید روش اتصال حساب روبیکا و API یا کتابخانه مورد استفاده مشخص و به بک‌اند متصل شود.</p>
          </div>
        </div>`;
    }
  };
})();
