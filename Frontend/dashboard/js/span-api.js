(function () {
  "use strict";
  const BASE = "/api/span/";
  const labels = {bale:"بله",eitaa:"ایتا",rubika:"روبیکا"};
  let selected = null, challengeId = "", pendingPhone = "", activeJob = null, pollTimer = null;
  const el = id => document.getElementById(id);
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const notify = (message,type) => window.showToast ? window.showToast(message,type || "info") : alert(message);
  const permission = p => "span." + p + ".personal_message";
  async function api(path, options) {
    const response = await fetch(BASE + selected + path, options || {});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data.detail && typeof data.detail === "object" ? data.detail.message : data.detail;
      throw new Error(detail || data.message || ("خطای API (" + response.status + ")"));
    }
    return data;
  }
  function render(html) {
    const target = el("settingsContent");
    if (target) target.innerHTML = html;
  }
  function header(text) {
    const target = el("headerTitle");
    if (target) target.textContent = text;
  }
  function injectSpanStyles() {
    if (document.getElementById("spanApiStyles")) return;
    const style = document.createElement("style");
    style.id = "spanApiStyles";
    style.textContent = [
      ".span-shell{max-width:1120px;margin:0 auto;padding:8px 4px 34px;direction:rtl}",
      ".span-hero{overflow:hidden;border:1px solid #e5eaf2;border-radius:22px;background:linear-gradient(135deg,#f8fbff,#eef4ff 58%,#fdf2f8);padding:26px 28px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:22px;min-height:140px}",
      ".span-hero-copy{max-width:650px}.span-hero h1,.span-hero h2{margin:0 0 9px;font-size:22px;font-weight:800;color:#172554}.span-hero p{margin:0;color:#64748b;line-height:1.9}",
      ".span-hero-art,.span-auth-art{display:flex;align-items:center;justify-content:center;gap:9px;flex:0 0 auto}.span-hero-art img{width:78px;height:78px;object-fit:contain;filter:drop-shadow(0 8px 12px #33415520)}.span-hero-art img:last-child{width:94px;height:94px}",
      ".span-provider-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;margin:18px 0}.span-provider-card{min-height:108px;border:1px solid #e2e8f0;background:#fff;border-radius:17px;padding:18px;display:flex;align-items:center;gap:13px;text-align:right;cursor:pointer;transition:.18s;color:#0f172a}.span-provider-card:hover{transform:translateY(-3px);border-color:#93c5fd;box-shadow:0 12px 26px #0f172a0d}.span-provider-icon{width:46px;height:46px;border-radius:14px;background:#eff6ff;display:grid;place-items:center;font-size:22px;flex:0 0 auto}.span-provider-card strong{display:block;font-size:16px}.span-provider-card small{display:block;color:#64748b;margin-top:5px}",
      ".span-card{background:#fff;border:1px solid #e5eaf2;border-radius:19px;padding:23px;box-shadow:0 8px 24px #0f172a08;margin:17px 0}.span-card h3{margin:0 0 18px;color:#172554;font-size:18px}.span-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.span-field{display:flex;flex-direction:column;gap:8px;min-width:0}.span-field.span-wide{grid-column:1/-1}.span-field label{font-weight:700;color:#334155;font-size:13px}.span-field .form-control{width:100%;min-height:44px;border:1px solid #dbe3ef;border-radius:11px;padding:10px 12px;box-sizing:border-box}.span-field small{color:#64748b;line-height:1.8}",
      ".span-actions{display:flex;justify-content:center;align-items:center;gap:13px;flex-wrap:wrap;margin:25px auto 3px}.span-actions .btn{min-width:150px;min-height:44px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;margin:0!important}.span-btn-danger{background:#fff1f2!important;color:#be123c!important;border:1px solid #fecdd3!important}.span-btn-quiet{background:#f1f5f9!important;color:#334155!important;border:1px solid #e2e8f0!important}",
      ".span-account-pill{display:inline-flex;align-items:center;gap:8px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:8px 13px;font-size:13px;font-weight:700;direction:ltr;margin-top:12px}.span-account-dot{width:8px;height:8px;border-radius:50%;background:#10b981}",
      ".span-auth-art{padding:2px 0 18px}.span-auth-art img{width:96px;height:96px;object-fit:contain;filter:drop-shadow(0 9px 12px #33415520)}.span-auth-art img:last-child{width:110px;height:110px}",
      ".span-status{margin-top:14px;min-height:22px;color:#475569;line-height:1.8}.span-status.error{color:#be123c}.span-status.success{color:#047857}",
      ".span-job-table{width:100%;min-width:650px;border-collapse:collapse}.span-job-table th,.span-job-table td{padding:11px 12px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top}.span-job-table th{background:#f8fafc;color:#475569;font-size:12px}",
      "@media(max-width:720px){.span-hero{padding:18px;align-items:flex-start}.span-hero-art img{width:54px;height:54px}.span-hero-art img:last-child{width:65px;height:65px}.span-provider-grid{grid-template-columns:1fr}.span-form-grid{grid-template-columns:1fr}.span-field.span-wide{grid-column:auto}.span-card{padding:17px}.span-actions{flex-direction:column}.span-actions .btn{width:100%}}"
    ].join("");
    document.head.appendChild(style);
  }
  function providerButtons() {
    const icons = {bale:"💬",eitaa:"✉️",rubika:"🟣"};
    return Object.keys(labels).filter(p => typeof window.canRead !== "function" || window.canRead(permission(p)))
      .map(p => '<button type="button" class="span-provider-card" data-span-provider="' + p + '"><span class="span-provider-icon">' + icons[p] + '</span><span><strong>' + labels[p] + '</strong><small>ورود و مدیریت حساب</small></span></button>').join("");
  }
  function artMarkup() {
    return '<div class="span-hero-art"><img src="./img/patrik.jpg" alt="پاتریک"><img src="./img/babesfanch.jpg" alt="باب اسفنجی"></div>';
  }
  function setStatus(message, kind) {
    const node = el("spanAuthMessage");
    if (!node) return;
    node.textContent = message || "";
    node.className = "span-status" + (kind ? " " + kind : "");
  }
  window.openSpanApiMessaging = function () {
    injectSpanStyles();
    if (typeof window.hideSettingsNav === "function") window.hideSettingsNav();
    selected = null; activeJob = null; challengeId = ""; pendingPhone = "";
    if (pollTimer) clearTimeout(pollTimer);
    header("ارسال پیام شخصی");
    const buttons = providerButtons();
    render('<div class="span-shell"><section class="span-hero"><div class="span-hero-copy"><h1>مدیریت پیام‌رسان‌ها</h1><p>پیام‌رسان موردنظر را انتخاب کنید تا وارد حساب شوید یا حساب متصل را تغییر دهید.</p></div>' + artMarkup() + '</section><div class="span-provider-grid">' +
      (buttons || '<p>برای استفاده از این بخش دسترسی مستقلی از مدیر دریافت کنید.</p>') +
      '</div><div id="spanProviderContent"></div></div>');
    document.querySelectorAll("[data-span-provider]").forEach(button => button.addEventListener("click", () => openProvider(button.dataset.spanProvider)));
  };
  async function openProvider(p) {
    if (!labels[p] || (typeof window.guardFeature === "function" && !window.guardFeature(permission(p)))) return;
    selected = p; challengeId = ""; pendingPhone = ""; activeJob = null;
    if (pollTimer) clearTimeout(pollTimer);
    header("ارسال پیام شخصی " + labels[p]);
    const target = el("spanProviderContent");
    if (!target) return;
    target.innerHTML = '<div class="span-card">در حال بررسی وضعیت حساب ' + labels[p] + '...</div>';
    try {
      const status = await api("/account");
      if (status.exists) sendPage(status);
      else loginPage();
    } catch (error) {
      target.innerHTML = '<div class="span-card"><p class="span-status error">' + esc(error.message) + '</p><div class="span-actions"><button class="btn btn-primary" id="spanRetry" type="button">تلاش مجدد</button><button class="btn span-btn-quiet" id="spanBack" type="button">بازگشت</button></div></div>';
      el("spanRetry").onclick = () => openProvider(p);
      el("spanBack").onclick = window.openSpanApiMessaging;
    }
  }
  function loginPage() {
    const target = el("spanProviderContent");
    if (!target) return;
    target.innerHTML = '<section class="span-hero"><div class="span-hero-copy"><h2>ورود به حساب ' + labels[selected] + '</h2><p>شماره تلفن حساب را وارد کنید و کد تأیید را برای اتصال دریافت کنید.</p></div>' + artMarkup() + '</section>' +
      '<div class="span-card"><div class="span-auth-art"><img src="./img/patrik.jpg" alt="پاتریک"><img src="./img/babesfanch.jpg" alt="باب اسفنجی"></div>' +
      '<form id="spanPhoneForm"><div class="span-field"><label for="spanPhone">شماره تلفن</label><input id="spanPhone" class="form-control" type="tel" autocomplete="tel" inputmode="tel" required dir="ltr" placeholder="98912xxxxxxx"></div><div class="span-actions"><button class="btn btn-primary" type="submit">دریافت کد ورود</button><button class="btn span-btn-quiet" id="spanLoginBack" type="button">بازگشت</button></div></form>' +
      '<form id="spanCodeForm" style="display:none;margin-top:22px"><div class="span-form-grid"><div class="span-field"><label for="spanCode">کد ورود</label><input id="spanCode" class="form-control" required inputmode="numeric" dir="ltr" autocomplete="one-time-code"></div><div class="span-field" id="spanPasswordGroup" style="display:none"><label for="spanPassword">رمز دومرحله‌ای</label><input id="spanPassword" class="form-control" type="password" autocomplete="current-password"></div></div><div class="span-actions"><button class="btn btn-primary" type="submit">تأیید و ورود</button></div></form><p id="spanAuthMessage" class="span-status" role="status" aria-live="polite"></p></div>';
    el("spanLoginBack").onclick = window.openSpanApiMessaging;
    el("spanPhoneForm").onsubmit = async event => {
      event.preventDefault();
      pendingPhone = el("spanPhone").value.trim();
      const button = event.submitter; if (button) {button.disabled = true;button.textContent = "در حال ارسال...";}
      setStatus("");
      try {
        const result = await api("/auth/send-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:pendingPhone})});
        challengeId = result.challenge_id || "";
        el("spanCodeForm").style.display = "block";
        setStatus(result.message || "درخواست کد ورود ثبت شد.","success");
      } catch (error) { setStatus(error.message,"error"); }
      finally { if (button) {button.disabled = false;button.textContent = "دریافت کد ورود";} }
    };
    el("spanCodeForm").onsubmit = async event => {
      event.preventDefault();
      const passwordMode = el("spanPasswordGroup").style.display !== "none";
      const button = event.submitter; if (button) button.disabled = true;
      setStatus("");
      try {
        const path = passwordMode ? "/auth/login-password" : "/auth/login";
        const body = passwordMode ? {challenge_id:challengeId,password:el("spanPassword").value} : {challenge_id:challengeId,code:el("spanCode").value.trim()};
        const result = await api(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
        if (result.requires_password) {
          el("spanPasswordGroup").style.display = "flex";
          el("spanPassword").required = true;
          setStatus("رمز دومرحله‌ای این حساب را وارد کنید.");
          return;
        }
        sendPage({phone:result.phone || pendingPhone,state:result.state,exists:true});
      } catch (error) { setStatus(error.message,"error"); }
      finally { if (button) button.disabled = false; }
    };
  }
  async function logoutAccount() {
    if (!selected || !window.confirm("از حساب " + labels[selected] + " خارج می‌شوید؟ نشست همین پیام‌رسان قطع می‌شود.")) return;
    const button = el("spanLogout");
    if (button) {button.disabled = true;button.textContent = "در حال خروج...";}
    try {
      await api("/account/logout",{method:"POST"});
      challengeId = ""; pendingPhone = ""; activeJob = null;
      if (pollTimer) clearTimeout(pollTimer);
      loginPage();
      setStatus("از حساب خارج شدید. اکنون می‌توانید با شماره دیگری وارد شوید.","success");
    } catch (error) {
      if (button) {button.disabled = false;button.textContent = "خروج از حساب";}
      notify("خروج انجام نشد: " + error.message,"error");
    }
  }
  function sendPage(status) {
    const target = el("spanProviderContent");
    if (!target) return;
    target.innerHTML = '<section class="span-hero"><div class="span-hero-copy"><h2>ارسال پیام شخصی ' + labels[selected] + '</h2><p>حساب متصل و آماده ارسال است.</p><div class="span-account-pill"><span class="span-account-dot"></span>' + esc(status.phone || "حساب متصل") + '</div></div>' + artMarkup() + '</section>' +
      '<div class="span-card"><h3>تنظیم ارسال</h3><form id="spanSendForm"><div class="span-form-grid">' +
      '<div class="span-field span-wide"><label for="spanExcel">فایل Excel مخاطبان</label><input id="spanExcel" class="form-control" type="file" accept=".xlsx,.xlsm" required><small>برای بله: ستون phone یا «شماره موبایل» و اختیاری name؛ برای ایتا و روبیکا: peer_id و اختیاری peer_type و name.</small></div>' +
      '<div class="span-field"><label for="spanMediaType">نوع پیام</label><select id="spanMediaType" class="form-control"><option value="text">متنی</option><option value="image">تصویر</option><option value="video">ویدئو</option><option value="file">فایل</option></select></div>' +
      '<div class="span-field"><label for="spanDelay">تأخیر بین ارسال‌ها (ثانیه)</label><input id="spanDelay" class="form-control" type="number" min="0" max="30" value="2"></div>' +
      '<div class="span-field span-wide"><label for="spanMessage">متن پیام / کپشن</label><textarea id="spanMessage" class="form-control" rows="4" placeholder="متن پیام یا کپشن..."></textarea></div>' +
      '<div class="span-field span-wide" id="spanMediaGroup" style="display:none"><label for="spanMedia">فایل رسانه</label><input id="spanMedia" class="form-control" type="file"></div></div>' +
      '<div class="span-actions"><button id="spanStart" class="btn btn-primary" type="submit">شروع ارسال</button><button class="btn span-btn-danger" type="button" id="spanLogout">خروج از حساب</button><button class="btn span-btn-quiet" type="button" id="spanChangeAccount">تغییر پیام‌رسان</button></div></form></div>' +
      '<div class="span-card"><div id="spanJobPanel">پس از شروع ارسال، وضعیت و گزارش در این قسمت نمایش داده می‌شود.</div></div>';
    el("spanMediaType").onchange = () => {
      const type = el("spanMediaType").value;
      el("spanMediaGroup").style.display = type === "text" ? "none" : "flex";
      el("spanMedia").value = "";
      el("spanMedia").accept = type === "image" ? ".jpg,.jpeg,.png,.webp" : type === "video" ? ".mp4,.mov,.m4v" : ".pdf,.doc,.docx,.zip";
    };
    el("spanChangeAccount").onclick = window.openSpanApiMessaging;
    el("spanLogout").onclick = logoutAccount;
    el("spanSendForm").onsubmit = startSend;
  }
  async function startSend(event) {
    event.preventDefault();
    if (activeJob) return;
    const type = el("spanMediaType").value, message = el("spanMessage").value;
    const media = type === "text" ? null : el("spanMedia").files[0];
    if (type === "text" && !message.trim()) return notify("متن پیام الزامی است.","error");
    if (type !== "text" && !media) return notify("فایل رسانه را انتخاب کنید.","error");
    const excel = el("spanExcel").files[0];
    if (!excel) return notify("فایل Excel مخاطبان الزامی است.","error");
    const form = new FormData();
    form.append("excel",excel); form.append("message",message); form.append("media_type",type);
    if (media) form.append("media",media);
    form.append("delay_seconds",String(Math.max(0,Math.min(30,Number(el("spanDelay").value)||0))));
    const button = el("spanStart"); button.disabled = true; button.textContent = "در حال ثبت ارسال...";
    try {
      const result = await api("/send",{method:"POST",body:form});
      activeJob = result.job_id;
      poll();
    } catch (error) { notify(error.message,"error"); button.disabled = false; button.textContent = "شروع ارسال"; }
  }
  async function poll() {
    if (!activeJob) return;
    const current = activeJob;
    try {
      const result = await api("/send/status/" + encodeURIComponent(current));
      renderJob(result);
      if (result.status === "completed" || result.status === "interrupted") { activeJob = null; const button = el("spanStart"); if (button) {button.disabled=false;button.textContent=result.status === "interrupted" ? "ارسال جدید پس از بررسی دستی" : "ارسال جدید";} return; }
      pollTimer = setTimeout(poll,1800);
    } catch (_) { pollTimer = setTimeout(poll,6000); }
  }
  function renderJob(job) {
    const panel = el("spanJobPanel"); if (!panel) return;
    const rows = (job.results || []).map((row,index) => '<tr><td>'+(index+1)+'</td><td dir="ltr">'+esc(row.phone || row.peer_id || "")+'</td><td>'+esc(row.name)+'</td><td>'+esc(({success:"موفق",error:"ناموفق",unknown:"نامشخص؛ ارسال را تکرار نکنید"})[row.status] || row.status)+'</td><td>'+esc(row.detail || "")+'</td></tr>').join("");
    const report = job.status === "completed" ? '<p><a class="btn btn-primary" href="'+BASE+selected+'/send/export/'+encodeURIComponent(job.job_id)+'">دانلود خروجی Excel</a></p>' : "";
    panel.innerHTML = '<h3>وضعیت: '+esc(job.status)+'</h3><p>'+esc(job.phase || "")+' — '+Number(job.progress || 0)+'% — کل: '+Number(job.total || 0)+' — پردازش‌شده: '+Number(job.processed || 0)+' — موفق: '+Number(job.success || 0)+' — ناموفق: '+Number(job.failed || 0)+' — نامشخص: '+Number(job.unknown || 0)+'</p><div style="height:10px;background:#e5e7eb;border-radius:8px;overflow:hidden"><div style="height:10px;width:'+Math.max(0,Math.min(100,Number(job.progress || 0)))+'%;background:#2563eb"></div></div>'+report+'<div style="overflow:auto;margin-top:16px"><table style="width:100%;min-width:650px"><thead><tr><th>ردیف</th><th>شماره تلفن / شناسه مخاطب</th><th>نام</th><th>وضعیت</th><th>توضیحات</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }
})();