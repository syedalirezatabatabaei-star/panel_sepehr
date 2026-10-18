(function () {
  "use strict";
  const API = window.location.protocol + "//" + window.location.hostname + ":8005/api/eitaa";
  let activeJob = null, pollTimer = null, pendingPhone = "", pollFailures = 0;

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
    render('<div class="eitaa-broadcast-page"><div class="page-header"><h1 class="page-title">ارسال پیام شخصی ایتا</h1><p class="page-description">حساب فعال: <b dir="ltr">' + esc(phone) + '</b></p></div><div class="card eitaa-send-card"><div class="card-body"><form id="eitaaBroadcastForm" class="eitaa-send-form"><div class="form-group eitaa-field"><label for="eitaaExcel">فایل Excel مخاطبان</label><input id="eitaaExcel" type="file" accept=".xlsx,.xlsm" required><small>ستون شماره تلفن الزامی و نام اختیاری است. بدون عنوان ستون، ستون اول شماره و ستون دوم نام است.</small></div><div class="form-group eitaa-field eitaa-caption-field"><label for="eitaaMessage">متن پیام یا کپشن</label><textarea id="eitaaMessage" rows="5" placeholder="متن پیام یا کپشن را اینجا بنویسید..."></textarea></div><div class="form-group eitaa-field"><label for="eitaaDelaySeconds">فاصله بین هر پیام (ثانیه)</label><input id="eitaaDelaySeconds" type="number" min="0" max="30" step="1" value="0" inputmode="numeric"><small>۰ یعنی بدون مکث؛ حداکثر ۳۰ ثانیه.</small></div><div class="form-group eitaa-field"><label for="eitaaMedia">رسانه (اختیاری)</label><input id="eitaaMedia" type="file" accept="image/*,video/mp4,video/quicktime,.pdf,.doc,.docx"><small>تصویر به‌صورت عکس ارسال می‌شود. حجم ویدئو حداکثر ۲۰ مگابایت است.</small><p id="eitaaMediaError" class="eitaa-media-error" role="alert" hidden></p></div><div class="eitaa-actions"><button class="btn btn-primary" id="eitaaStartButton" type="submit">شروع ارسال</button><button class="btn btn-secondary" type="button" onclick="eitaaResetAccount()">خروج / تغییر حساب</button></div></form></div></div><div class="card eitaa-job-card"><div class="card-body" id="eitaaJobPanel">پس از شروع، پیشرفت و نتیجه هر مخاطب نمایش داده می‌شود.</div></div></div>');
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
    const delayInput = el("eitaaDelaySeconds");
    const rawDelay = delayInput ? Number.parseInt(delayInput.value, 10) : 0;
    const delaySeconds = Number.isFinite(rawDelay) ? Math.max(0, Math.min(30, rawDelay)) : 0;
    formData.append("delay_seconds", String(delaySeconds));
    // ارسال بدون مکث اجباری بین مخاطبان؛ سرور مقدار صفر را می‌پذیرد.
    formData.append("delay_seconds", "0");
    const button = el("eitaaStartButton");
    button.disabled = true;
    button.textContent = "در حال شروع...";
    try {
      const result = await api("/send", {method:"POST",body:formData});
      activeJob = result.job_id;
      pollFailures = 0;
      renderJob({job_id:activeJob,status:"queued",phase:"در صف انتظار",progress:0,total:result.total,processed:0,success:0,failed:0,results:[]});
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
      pollFailures = 0;
      renderJob(job);
      if (job.status === "completed") {
        activeJob = null;
        if (el("eitaaStartButton")) {
          el("eitaaStartButton").disabled = false;
          el("eitaaStartButton").textContent = "شروع ارسال جدید";
        }
        return;
      }
      pollTimer = window.setTimeout(pollJob, 1800);
    } catch (error) {
      pollFailures += 1;
      const panel = el("eitaaJobPanel");
      if (panel) {
        let log = panel.querySelector("#eitaaRefreshErrorLog");
        if (!log) {
          log = document.createElement("div");
          log.id = "eitaaRefreshErrorLog";
          log.style.cssText = "margin-top:12px;padding:12px;border:1px solid #fecaca;background:#fff7f7;border-radius:10px;color:#991b1b;line-height:1.8";
          panel.appendChild(log);
        }
        const line = document.createElement("div");
        line.textContent = "[" + new Date().toLocaleString("fa-IR") + "] خطای رفرش " + pollFailures + "/۵: " + (error.message || "خطای نامشخص");
        log.appendChild(line);
        if (pollFailures >= 5) {
          line.textContent += " — تلاش مجدد متوقف شد.";
          log.insertAdjacentHTML("beforeend", '<div style="display:flex;align-items:center;gap:12px;margin-top:10px"><img src="/dashboard/img/patrik.jpg" alt="" style="width:90px;height:90px;object-fit:cover;border-radius:8px" onerror="this.style.display=\'none\'"><strong>پیام بله خراب شده بالا نمیاد</strong></div>');
          const button = el("eitaaStartButton");
          if (button) { button.disabled = false; button.textContent = "شروع ارسال جدید"; }
          activeJob = null;
          return;
        }
        const note = document.createElement("div");
        note.textContent = "تلاش بعدی برای رفرش حداقل یک دقیقه دیگر انجام می‌شود.";
        log.appendChild(note);
      }
      pollTimer = window.setTimeout(pollJob, 60000);
    }
  }

  function getEitaaResultGroup(row) {
    const contact = String(row.contact_status || "").toLowerCase();
    const detail = String(row.detail || "").toLowerCase();
    if (["not_registered", "no_account", "not_found"].includes(contact) ||
        detail.includes("حساب ایتا ندارد") || detail.includes("مخاطب در ایتا پیدا نشد") ||
        detail.includes("user not found") || detail.includes("not found")) return "no_account";
    if (row.status === "success") return "success";
    return "failed";
  }

  function getEitaaContactLabel(row) {
    const group = getEitaaResultGroup(row);
    if (group === "no_account") return "حساب ایتا ندارد / پیدا نشد";
    if (row.contact_status === "success") return "موجود / افزوده شد";
    return "افزودن ناموفق";
  }

  function renderJob(job) {
    const panel = el("eitaaJobPanel");
    if (!panel) return;
    const total = Number(job.total || 0), processed = Number(job.processed || 0);
    const fallbackPercent = total ? Math.round(processed * 100 / total) : 0;
    const percent = Math.max(0, Math.min(100, Number.isFinite(Number(job.progress)) ? Number(job.progress) : fallbackPercent));
    const results = Array.isArray(job.results) ? job.results : [];
    const groups = { success: [], failed: [], no_account: [] };
    results.forEach(function (row) { groups[getEitaaResultGroup(row)].push(row); });
    const activeFilter = ["success", "failed", "no_account"].includes(window.__eitaaResultsFilter)
      ? window.__eitaaResultsFilter : "success";
    const selected = groups[activeFilter];
    const rows = selected.map(function (row, index) {
      const group = getEitaaResultGroup(row);
      const contactLabel = getEitaaContactLabel(row);
      const messageLabel = row.status === "success" ? "موفق" : (group === "no_account" ? "ارسال نشد" : "ناموفق");
      const color = group === "success" ? "#166534" : (group === "no_account" ? "#92400e" : "#991b1b");
      return '<tr style="background:' + (index % 2 ? '#f8fafc' : '#fff') + '">' +
        '<td style="padding:10px;border-bottom:1px solid #e2e8f0">' + (index + 1) + '</td>' +
        '<td dir="ltr" style="padding:10px;white-space:nowrap;border-bottom:1px solid #e2e8f0">' + esc(row.phone || "") + '</td>' +
        '<td style="padding:10px;border-bottom:1px solid #e2e8f0">' + esc(row.name || "") + '</td>' +
        '<td style="padding:10px;border-bottom:1px solid #e2e8f0">' + esc(contactLabel) + '</td>' +
        '<td style="padding:10px;min-width:220px;white-space:normal;border-bottom:1px solid #e2e8f0">' + esc(row.add_notification || "") + '</td>' +
        '<td style="padding:10px;color:' + color + ';font-weight:700;border-bottom:1px solid #e2e8f0">' + messageLabel + '</td>' +
        '<td style="padding:10px;min-width:220px;white-space:normal;border-bottom:1px solid #e2e8f0">' + esc(row.detail || "—") + '</td></tr>';
    }).join("");
    let html = '<h3>وضعیت ارسال: ' + esc(job.status) + '</h3>' +
      '<p>مرحله: ' + esc(job.phase || job.status) + ' — پیشرفت: ' + percent + '% (' + processed + ' از ' + total + ') — موفق: ' + Number(job.success || 0) + ' — ناموفق: ' + Number(job.failed || 0) + '</p>' +
      '<div style="height:12px;background:#e5e7eb;border-radius:8px;overflow:hidden"><div style="height:12px;width:' + percent + '%;background:linear-gradient(90deg,#2563eb,#22c55e);transition:width .3s"></div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 12px">' +
      '<button type="button" data-eitaa-filter="success">موفق (' + groups.success.length + ')</button>' +
      '<button type="button" data-eitaa-filter="failed">ناموفق (' + groups.failed.length + ')</button>' +
      '<button type="button" data-eitaa-filter="no_account">حساب ایتا نداشته‌اند (' + groups.no_account.length + ')</button></div>';
    if (job.status === "completed") {
      const successRate = total ? Number(job.success || 0) * 100 / total : 0;
      const outcomeText = successRate < 50 ? "ما تمام تلاش خودمون رو کردیم اما نشد :(" : "شد بالاخره شد :)";
      const outcomeImage = successRate < 50 ? "/dashboard/img/patrik.jpg" : "/dashboard/img/babesfanch.jpg";
      html += '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:18px 0;padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc">' +
        '<img src="' + outcomeImage + '" alt="" style="width:100px;height:100px;object-fit:cover;border-radius:10px" onerror="this.style.display=\'none\'">' +
        '<strong style="font-size:17px">' + outcomeText + '</strong></div>' +
        '<p>ارسال پایان یافت.</p><a class="btn btn-primary" href="' + API + '/send/export/' + encodeURIComponent(job.job_id) + '">دانلود گزارش Excel</a>';
    }
    html += '<div style="width:100%;overflow-x:auto;margin-top:16px;border:1px solid #e2e8f0;border-radius:12px;background:#fff"><table style="width:100%;min-width:1050px;border-collapse:collapse;text-align:right;font-size:13px;line-height:1.8"><thead style="background:#f1f5f9"><tr>' +
      '<th style="padding:11px">ردیف</th><th style="padding:11px">شماره</th><th style="padding:11px">نام</th><th style="padding:11px">وضعیت مخاطب</th><th style="padding:11px">پیغام لحظه‌ای ایتا هنگام افزودن</th><th style="padding:11px">وضعیت پیام</th><th style="padding:11px">توضیحات</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="7" style="padding:18px;text-align:center;color:#64748b">موردی در این دسته وجود ندارد.</td></tr>') +
      '</tbody></table></div>';
    panel.innerHTML = html;
    panel.querySelectorAll("[data-eitaa-filter]").forEach(function (button) {
      button.style.cssText = "padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer";
      if (button.dataset.eitaaFilter === activeFilter) button.style.background = "#dbeafe";
      button.addEventListener("click", function () {
        window.__eitaaResultsFilter = button.dataset.eitaaFilter;
        renderJob(job);
      });
    });
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