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
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function canRead(page) {

    const u = getCurrentUser();

    if (Number(u?.accessLevel) === 3) {
        return true;
    }

    if (!u?.permissions) return false;


    return !!u.permissions[page + ".read"]?.read;
}

function canWrite(page) {

    const u = getCurrentUser();

    if (Number(u?.accessLevel) === 3) {
        return true;
    }

    if (!u?.permissions) return false;


    return !!u.permissions[page + ".write"]?.write;
}
function applyMenuPermissions() {

    Object.entries(PAGE_MENU_MAP).forEach(([page, selector]) => {

        document.querySelectorAll(selector).forEach((el) => {

            const permission = MENU_PERMISSIONS[page];

            // Owner همه چیز را می‌بیند
            const u = getCurrentUser();

            if (Number(u?.accessLevel) === 3) {
                el.style.display = "";
                return;
            }

            if (!permission) {
                el.style.display = "";
                return;
            }

            el.style.display =
                canRead(permission)
                ? ""
                : "none";

        });

    });
}

function applyWritePermissions() {
  // مثال: دکمه ارسال بله
  const baleSend = document.getElementById("baleSendButton");
  if (baleSend) baleSend.disabled = !canWrite("bale");

  document.querySelectorAll("[data-permission-write]").forEach((el) => {
    const page = el.getAttribute("data-permission-write");
    el.disabled = !canWrite(page);
  });
}

function guardPage(page) {

    if (!canRead(page)) {

        showPermissionDenied();

        return false;
    }

    return true;
}

window.canRead = canRead;
window.canWrite = canWrite;
window.applyMenuPermissions = applyMenuPermissions;
window.applyWritePermissions = applyWritePermissions;
window.guardPage = guardPage;
