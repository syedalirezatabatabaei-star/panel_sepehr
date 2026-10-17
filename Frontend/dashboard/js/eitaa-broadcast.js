(function () {
  "use strict";
  const API = window.location.protocol + "//" + window.location.hostname + ":8005/api/eitaa";
  let activeJob = null, pollTimer = null, pendingPhone = "";

  function el(id) { return document.getElementById(id); }
  function toast(message, type) {
    if (typeof window.showToast === "function") window.showToast(message, type || "info");
    else alert(message);
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  async function api(path, options) {
    const response = await fetch(API + path, options || {});
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.detail || data.message || "خطا در ارتباط با سرویس ایتا");
    return data;
  }
  function render(html) {
    const content = el("settingsContent");
    if (content) {
      content.classList.toggle("eitaa-broadcast-view", html.indexOf("eitaa-broadcast-page") !== -1);
      content.innerHTML = html;
    }
  }
  function header(text) {
    const target = el("headerTitle");
    if (target) target.textContent = text;
  }

  window.openEitaaBroadcast = function () {
    header("ارسال پیام شخصی ایتا");
    render('<div class="page-header"><h1 class="page-title">ارسال پیام شخصی ایتا</h1><p class="page-description">ورود مستقل ایتا، مخاطبان Excel، ارسال رسانه و گزارش</p></div><div class="card"><div class="card-body" id="eitaaBroadcastBody">در حال بررسی حساب ایتا...</div></div>');
    api("/account").then(function (data) {
      if (data.exists) showSendPage(data.phone);
      else showLoginPage();
    }).catch(function () {
      const target = el("eitaaBroadcastBody");
      if (target) target.innerHTML = '<p style="color:#b91c1c">سرویس EitaaBun در دسترس نیست. وضعیت Docker و لاگ سرویس را بررسی کنید.</p><button class="btn btn-secondary" onclick="openEitaaBroadcast()">تلاش مجدد</button>';
    });
  };

  function showLoginPage() {
    render('<div class="page-header"><h1 class="page-title">ورود به حساب ایتا</h1><p class="page-description">نشست این بخش از حساب بله جداست.</p></div><div class="card"><div class="card-body"><form id="eitaaSendCodeForm"><div class="form-group"><label>شماره موبایل</label><input class="form-control" id="eitaaPhone" type="tel" placeholder="09123456789" required dir="ltr"></div><div class="form-actions"><button class="btn btn-primary" type="submit">دریافت کد ورود</button></div></form><form id="eitaaLoginForm" style="display:none;margin-top:20px"><div class="form-group"><label>کد ورود</label><input class="form-control" id="eitaaCode" required inputmode="numeric" dir="ltr"></div><div class="form-group" id="eitaaPasswordGroup" style="display:none"><label>رمز دومرحله‌ای ایتا</label><input class="form-control" id="eitaaPassword" type="password" autocomplete="current-password"></div><div class="form-actions"><button class="btn btn-primary" type="submit">ورود</button></div></form><p id="eitaaLoginMessage" role="status"></p></div></div>');
    el("eitaaSendCodeForm").addEventListener("submit", async function (event) {
      event.preventDefault();
      const phone = el("eitaaPhone").value.trim();
      try {
        const result = await api("/auth/send-code", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:phone})});
        pendingPhone = result.phone || phone;
        el("eitaaLoginForm").style.display = "block";
        el("eitaaLoginMessage").textContent = "درخواست کد ارسال شد؛ پیام یا تماس ایتا را بررسی کنید.";
      } catch (error) { el("eitaaLoginMessage").textContent = error.message; }
    });
    el("eitaaLoginForm").addEventListener("submit", async function (event) {
      event.preventDefault();
      const code = el("eitaaCode").value.trim(), password = el("eitaaPassword").value;
      try {
        let result;
        if (el("eitaaPasswordGroup").style.display !== "none") {
          result = await api("/auth/login-password", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:pendingPhone,code:code,password:password})});
        } else {
          result = await api("/auth/login", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:pendingPhone,code:code})});
        }
        if (result.requires_password) {
          el("eitaaPasswordGroup").style.display = "block";
          el("eitaaPassword").required = true;
          el("eitaaLoginMessage").textContent = "این حساب رمز دومرحله‌ای دارد؛ رمز را وارد کنید و دوباره ورود را بزنید.";
          return;
        }
        showSendPage(result.phone || pendingPhone);
      } catch (error) { el("eitaaLoginMessage").textContent = error.message; }
    });
  }

  function showSendPage(phone) {
    render('<div class="eitaa-broadcast-page"><div class="page-header"><h1 class="page-title">ارسال پیام شخصی ایتا</h1><p class="page-description">حساب فعال: <b dir="ltr">' + esc(phone) + '</b></p></div><div class="card eitaa-send-card"><div class="card-body"><form id="eitaaBroadcastForm" class="eitaa-send-form"><div class="form-group eitaa-field"><label for="eitaaExcel">فایل Excel مخاطبان</label><input id="eitaaExcel" type="file" accept=".xlsx,.xlsm" required><small>ستون شماره تلفن الزامی و نام اختیاری است. بدون عنوان ستون، ستون اول شماره و ستون دوم نام است.</small></div><div class="form-group eitaa-field eitaa-caption-field"><label for="eitaaMessage">متن پیام یا کپشن</label><textarea id="eitaaMessage" rows="5" placeholder="متن پیام یا کپشن را اینجا بنویسید..."></textarea></div><div class="form-group eitaa-field"><label for="eitaaMedia">رسانه (اختیاری)</label><input id="eitaaMedia" type="file" accept="image/*,video/mp4,video/quicktime,.pdf,.doc,.docx"><small>تصویر به‌صورت عکس ارسال می‌شود. حجم ویدئو حداکثر ۲۰ مگابایت است.</small><p id="eitaaMediaError" class="eitaa-media-error" role="alert" hidden></p></div><div class="eitaa-actions"><button class="btn btn-primary" id="eitaaStartButton" type="submit">شروع ارسال</button><button class="btn btn-secondary" type="button" onclick="eitaaResetAccount()">خروج / تغییر حساب</button></div></form></div></div><div class="card eitaa-job-card"><div class="card-body" id="eitaaJobPanel">پس از شروع، پیشرفت و نتیجه هر مخاطب نمایش داده می‌شود.</div></div></div>');
    el("eitaaBroadcastForm").addEventListener("submit", startSend);
    el("eitaaMedia").addEventListener("change", validateEitaaMedia);
  }

  function validateEitaaMedia() {
    const fileInput = el("eitaaMedia");
    const error = el("eitaaMediaError");
    if (!fileInput || !error) return true;
    const file = fileInput.files && fileInput.files[0];
    const isVideo = !!file && (/^video\//i.test(file.type) || /\.(mp4|mov|m4v|webm)$/i.test(file.name));
    if (isVideo && file.size > 20 * 1024 * 1024) {
      error.textContent = "حجم ویدئو نباید بیشتر از ۲۰ مگابایت باشد.";
      error.hidden = false;
      fileInput.value = "";
      return false;
    }
    error.hidden = true;
    error.textContent = "";
    return true;
  }

  async function startSend(event) {
    event.preventDefault();
    if (activeJob) return;
    if (!validateEitaaMedia()) return;
    const mediaFile = el("eitaaMedia").files[0];
    const message = el("eitaaMessage").value.trim();
    if (!message && !mediaFile) {
      toast("متن پیام یا یک فایل رسانه‌ای انتخاب کنید.", "error");
      return;
    }
    const formData = new FormData();
    formData.append("excel", el("eitaaExcel").files[0]);
    formData.append("message", el("eitaaMessage").value);
    if (mediaFile) formData.append("media", mediaFile);
    // ارسال بدون مکث اجباری بین مخاطبان؛ سرور مقدار صفر را می‌پذیرد.
    formData.append("delay_seconds", "0");
    const button = el("eitaaStartButton");
    button.disabled = true;
    button.textContent = "در حال شروع...";
    try {
      const result = await api("/send", {method:"POST",body:formData});
      activeJob = result.job_id;
      renderJob({job_id:activeJob,status:"queued",total:result.total,processed:0,success:0,failed:0,results:[]});
      pollJob();
    } catch (error) {
      toast(error.message, "error");
      button.disabled = false;
      button.textContent = "شروع ارسال";
    }
  }

  async function pollJob() {
    if (!activeJob) return;
    try {
      const job = await api("/send/status/" + encodeURIComponent(activeJob));
      renderJob(job);
      if (job.status === "completed") {
        activeJob = null;
        if (el("eitaaStartButton")) {
          el("eitaaStartButton").disabled = false;
          el("eitaaStartButton").textContent = "شروع ارسال جدید";
        }
        return;
      }
    } catch (error) {
      const panel = el("eitaaJobPanel");
      if (panel) panel.insertAdjacentHTML("beforeend", '<p style="color:#b91c1c">' + esc(error.message) + '</p>');
    }
    pollTimer = window.setTimeout(pollJob, 1800);
  }

  function renderJob(job) {
    const panel = el("eitaaJobPanel");
    if (!panel) return;
    const total = Number(job.total || 0), processed = Number(job.processed || 0);
    const percent = total ? Math.round(processed * 100 / total) : 0;
    const rows = (job.results || []).slice(-100).map(function (row) {
      const ok = row.status === "success";
      return '<tr><td dir="ltr">' + esc(row.phone) + '</td><td>' + esc(row.name) + '</td><td style="color:' + (ok ? '#15803d' : '#b91c1c') + '">' + (ok ? "موفق" : "ناموفق") + '</td><td>' + esc(row.detail) + '</td></tr>';
    }).join("");
    let html = '<h3>وضعیت ارسال: ' + esc(job.status) + '</h3><p>پیشرفت: ' + processed + ' از ' + total + ' (' + percent + '%) — موفق: ' + Number(job.success || 0) + ' — ناموفق: ' + Number(job.failed || 0) + '</p><div style="height:10px;background:#e5e7eb;border-radius:8px;overflow:hidden"><div style="height:10px;width:' + percent + '%;background:#2563eb"></div></div>';
    if (job.status === "completed") html += '<p>ارسال پایان یافت.</p><a class="btn btn-primary" href="' + API + '/send/export/' + encodeURIComponent(job.job_id) + '">دانلود گزارش Excel</a>';
    if (rows) html += '<div style="overflow:auto;margin-top:16px"><table class="table"><thead><tr><th>شماره</th><th>نام</th><th>نتیجه</th><th>توضیحات</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    panel.innerHTML = html;
  }

  window.eitaaResetAccount = async function () {
    if (!window.confirm("از حساب ایتا خارج می‌شوید؟")) return;
    try { await api("/account/reset", {method:"POST"}); }
    catch (error) { toast(error.message, "error"); }
    activeJob = null;
    if (pollTimer) window.clearTimeout(pollTimer);
    showLoginPage();
  };
})();