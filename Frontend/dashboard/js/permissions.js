function showPermissionDenied() {

    const message = `
        <div style="
            text-align:center;
            padding:20px;
            direction:rtl;
        ">

            <img
                src="img/miti-komon.png"
                alt="میتی کومان"
                style="
                    width:180px;
                    max-width:80%;
                    margin-bottom:15px;
                    border-radius:12px;
                "
            >

            <div style="
                font-size:20px;
                font-weight:bold;
                margin-bottom:10px;
            ">
                اینجا برای شما بسته است 
            </div>

            <div style="
                font-size:15px;
                line-height:2;
            ">
                ظاهراً هنوز اجازه ورود به این بخش رو نداری.
                <br>
                برای دریافت دسترسی، ابتدا تأیید مدیرعامل رو بگیر
                و بعد به مسئول واحد تحول دیجیتال،
                 مراجعه کن.
            </div>

            <div style="
                margin-top:12px;
                font-size:14px;
            ">
                البته با اعصای پول (زیر میزی ) ب آقای طبطبائی کار حل میشود
            </div>


        </div>
    `;

    if (typeof showToast === "function") {
        showToast(message, "error");
    }
}
function getCurrentUser() {
  if (window.CURRENT_USER) return window.CURRENT_USER;
  try { return JSON.parse(localStorage.getItem("user") || "null"); }
  catch { return null; }
}

function canRead(page) {
  const u = getCurrentUser();
  if (Number(u?.accessLevel ?? u?.access_level) === 3) return true;
  if (!u?.permissions) return false;
  return !!(u.permissions[page]?.read || u.permissions[page + ".read"]?.read);
}

function canWrite(page) {
  const u = getCurrentUser();
  if (Number(u?.accessLevel ?? u?.access_level) === 3) return true;
  if (!u?.permissions) return false;
  return !!(u.permissions[page]?.write || u.permissions[page + ".write"]?.write);
}

function guardFeature(permissionCode, action = "read") {
  const allowed = action === "write" ? canWrite(permissionCode) : canRead(permissionCode);
  if (!allowed) {
    showPermissionDenied();
    return false;
  }
  return true;
}

function applyMenuPermissions() {
  // Intentionally do not hide navigation icons. Protected actions call guardFeature/guardPage
  // and display the existing denial message when the user lacks permission.
}

function applyWritePermissions() {
  // مثال: دکمه ارسال بله
  const baleSend = document.getElementById("baleSendButton");
  if (baleSend) baleSend.disabled = !canWrite("bale.personal_message");

  document.querySelectorAll("[data-permission-write]").forEach((el) => {
    const page = el.getAttribute("data-permission-write");
    el.disabled = !canWrite(page);
  });
}

function guardPage(page, action = "read") {

    if (action === "write" ? !canWrite(page) : !canRead(page)) {

        showPermissionDenied();

        return false;
    }

    return true;
}

window.canRead = canRead;
window.guardFeature = guardFeature;
window.canWrite = canWrite;
window.applyMenuPermissions = applyMenuPermissions;
window.applyWritePermissions = applyWritePermissions;
window.guardPage = guardPage;

/*
 * Global fallbacks prevent a missing/stale permissions.js from crashing inline
 * handlers. This is only a UI safety net; the API remains authoritative.
 */
if (typeof window.guardFeature !== "function") {
  window.guardFeature = function (permissionCode, action = "read") {
    const user = window.CURRENT_USER || (() => {
      try { return JSON.parse(localStorage.getItem("user") || "null"); }
      catch (_) { return null; }
    })();
    if (Number(user?.accessLevel ?? user?.access_level) === 3) return true;
    const permissions = user?.permissions;
    const entry = permissions?.[permissionCode] || permissions?.[permissionCode + "." + action];
    const allowed = action === "write" ? !!(entry?.write || entry?.can_write) : !!(entry?.read || entry?.can_read);
    if (!allowed) {
      if (typeof window.showPermissionDenied === "function") window.showPermissionDenied();
      else if (typeof window.showToast === "function") window.showToast("شما اجازه دسترسی به این قابلیت را ندارید.", "error");
      return false;
    }
    return true;
  };
}
if (typeof window.guardPage !== "function") {
  window.guardPage = function (permissionCode, action = "read") {
    return window.guardFeature(permissionCode, action);
  };
}
