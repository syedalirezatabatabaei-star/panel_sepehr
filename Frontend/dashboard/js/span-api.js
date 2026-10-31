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
  function providerButtons() {
    return Object.keys(labels).filter(p => typeof window.canRead !== "function" || window.canRead(permission(p)))
      .map(p => '<button type="button" class="btn btn-primary" data-span-provider="' + p + '" style="min-width:150px;padding:18px">' + labels[p] + '</button>').join("");
  }
  window.openSpanApiMessaging = function () {
    if (typeof window.hideSettingsNav === "function") window.hideSettingsNav();
    selected = null; activeJob = null; challengeId = ""; pendingPhone = "";
    if (pollTimer) clearTimeout(pollTimer);
    header("ارسال پیام شخصی داخل Span API");
    const buttons = providerButtons();
    render('<div class="page-header"><h1 class="page-title">ارسال پیام شخصی داخل Span API</h1><p class="page-description">اتصال مستقل از طریق GoOmni؛ نشست بله، ایتا و روبیکا جداگانه نگهداری می‌شود.</p></div><div class="card"><div class="card-body"><div style="display:flex;gap:12px;flex-wrap:wrap">' +
      (buttons || '<p>برای استفاده از Span API دسترسی مستقلی از مدیر دریافت کنید.</p>') +
      '</div></div></div><div id="spanProviderContent"></div>');
    document.querySelectorAll("[data-span-provider]").forEach(button => button.addEventListener("click", () => openProvider(button.dataset.spanProvider)));
  };
  async function openProvider(p) {
    if (!labels[p] || (typeof window.guardFeature === "function" && !window.guardFeature(permission(p)))) return;
    selected = p; challengeId = ""; pendingPhone = ""; activeJob = null;
    header("ارسال پیام شخصی " + labels[p] + " | Span API");
    const target = el("spanProviderContent");
    if (!target) return;
    target.innerHTML = '<div class="card"><div class="card-body">در حال بررسی اتصال ' + labels[p] + ' در GoOmni...</div></div>';
    try {
      const status = await api("/account");
      if (status.exists) sendPage(status);
      else loginPage();
    } catch (error) {
      target.innerHTML = '<div class="card"><div class="card-body"><p style="color:#b91c1c">' + esc(error.message) + '</p><button class="btn btn-secondary" id="spanRetry">تلاش مجدد</button></div></div>';
      el("spanRetry").onclick = () => openProvider(p);
    }
  }
  function loginPage() {
    const target = el("spanProviderContent");
    if (!target) return;
    target.innerHTML = '<div class="card"><div class="card-body"><h2>اتصال حساب ' + labels[selected] + ' از طریق Span API</h2><p>این نشست با نسخه مستقیم بله و ایتا مشترک نیست.</p><form id="spanPhoneForm"><label>شماره تلفن</label><input id="spanPhone" class="form-control" type="tel" autocomplete="tel" required dir="ltr"><button class="btn btn-primary" type="submit">دریافت کد ورود</button></form><form id="spanCodeForm" style="display:none;margin-top:18px"><label>کد ورود</label><input id="spanCode" class="form-control" required inputmode="numeric" dir="ltr"><div id="spanPasswordGroup" style="display:none;margin-top:12px"><label>رمز دومرحله‌ای</label><input id="spanPassword" class="form-control" type="password" autocomplete="current-password"></div><button class="btn btn-primary" type="submit">تأیید و ورود</button></form><p id="spanAuthMessage" role="status"></p></div></div>';
    el("spanPhoneForm").onsubmit = async event => {
      event.preventDefault();
      pendingPhone = el("spanPhone").value.trim();
      const button = event.submitter; if (button) button.disabled = true;
      try {
        const result = await api("/auth/send-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:pendingPhone})});
        challengeId = result.challenge_id || "";
        el("spanCodeForm").style.display = "block";
        el("spanAuthMessage").textContent = result.message || "درخواست کد ورود ثبت شد.";
      } catch (error) { el("spanAuthMessage").textContent = error.message; }
      finally { if (button) button.disabled = false; }
    };
    el("spanCodeForm").onsubmit = async event => {
      event.preventDefault();
      const passwordMode = el("spanPasswordGroup").style.display !== "none";
      try {
        const path = passwordMode ? "/auth/login-password" : "/auth/login";
        const body = passwordMode ? {challenge_id:challengeId,password:el("spanPassword").value} : {challenge_id:challengeId,code:el("spanCode").value.trim()};
        const result = await api(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
        if (result.requires_password) {
          el("spanPasswordGroup").style.display = "block";
          el("spanPassword").required = true;
          el("spanAuthMessage").textContent = "رمز دومرحله‌ای این حساب را وارد کنید.";
          return;
        }
        sendPage({phone:result.phone || pendingPhone,state:result.state,exists:true});
      } catch (error) { el("spanAuthMessage").textContent = error.message; }
    };
  }
  function sendPage(status) {
    const target = el("spanProviderContent");
    if (!target) return;
    target.innerHTML = '<div class="page-header"><h2 class="page-title">ارسال پیام شخصی ' + labels[selected] + ' از طریق Span API</h2><p>حساب متصل: <b dir="ltr">' + esc(status.phone || "متصل") + '</b> | وضعیت: ' + esc(status.state || "authenticated") + '</p></div><div class="card"><div class="card-body"><form id="spanSendForm"><div class="form-group"><label>فایل Excel مخاطبان</label><input id="spanExcel" class="form-control" type="file" accept=".xlsx,.xlsm" required><small>برای بله: ستون phone یا «شماره موبایل» (مثلاً 0912...) و اختیاری name؛ برای ایتا و روبیکا: peer_id و اختیاری peer_type و name. برای روبیکا فعلاً peer_type باید user باشد.</small></div><div class="form-group"><label>نوع پیام</label><select id="spanMediaType" class="form-control"><option value="text">متنی</option><option value="image">تصویر</option><option value="video">ویدئو</option><option value="file">فایل</option></select></div><div class="form-group"><label>متن پیام / کپشن</label><textarea id="spanMessage" class="form-control" rows="4" placeholder="متن پیام یا کپشن..."></textarea></div><div class="form-group" id="spanMediaGroup" style="display:none"><label>فایل رسانه</label><input id="spanMedia" class="form-control" type="file"></div><div class="form-group"><label>تأخیر بین ارسال‌ها (ثانیه)</label><input id="spanDelay" class="form-control" type="number" min="0" max="30" value="2"></div><button id="spanStart" class="btn btn-primary" type="submit">شروع ارسال</button><button class="btn btn-secondary" type="button" id="spanChangeAccount">بازگشت به انتخاب پیام‌رسان</button></form></div></div><div class="card"><div class="card-body" id="spanJobPanel">پس از شروع ارسال، وضعیت و گزارش در این قسمت نمایش داده می‌شود.</div></div>';
    el("spanMediaType").onchange = () => {
      const type = el("spanMediaType").value;
      el("spanMediaGroup").style.display = type === "text" ? "none" : "block";
      el("spanMedia").value = "";
      el("spanMedia").accept = type === "image" ? ".jpg,.jpeg,.png,.webp" : type === "video" ? ".mp4,.mov,.m4v" : ".pdf,.doc,.docx,.zip";
    };
    el("spanChangeAccount").onclick = window.openSpanApiMessaging;
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