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
  return !!u?.permissions?.[page]?.read;
}

function canWrite(page) {
  const u = getCurrentUser();
  return !!u?.permissions?.[page]?.write;
}

/** مپ صفحه → دکمه سایدبار / تنظیمات */
const PAGE_MENU_MAP = {
  // سایدبار اصلی
  bale:        'button.sidebar-item[onclick*="openBaleMessaging"]',
  bale_chat:   'button.sidebar-item[onclick*="openBaleChatPage"]',
  eita:        'button.sidebar-item[onclick*="openEitaaChatPage"]',
  settings:    'button.sidebar-item[onclick*="navigateTo(\'overview\')"]',

  // منوی تنظیمات (data-page)
  overview:               '[data-page="overview"]',
  "registration-requests":'[data-page="registration-requests"]',
  users:                  '[data-page="users"]',
  roles:                  '[data-page="roles"]',
  notifications:          '[data-page="notifications"]',
  "audit-logs":           '[data-page="audit-logs"]',
  activities:             '[data-page="activities"]',
  security:               '[data-page="security"]',
  "my-account":           '[data-page="my-account"]',
  "system-settings":      '[data-page="system-settings"]',
};

function applyMenuPermissions() {
  Object.entries(PAGE_MENU_MAP).forEach(([page, selector]) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.style.display = canRead(page) ? "" : "none";
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
    if (typeof showToast === "function") {
      showToast("به این بخش دسترسی ندارید", "error");
    }
    return false;
  }
  return true;
}

window.canRead = canRead;
window.canWrite = canWrite;
window.applyMenuPermissions = applyMenuPermissions;
window.applyWritePermissions = applyWritePermissions;
window.guardPage = guardPage;
