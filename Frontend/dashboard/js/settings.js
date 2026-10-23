/* =========================================================
   SETTINGS
   ========================================================= */

/* =========================================================
   SETTINGS NAV
   فقط وقتی کاربر داخل صفحات تنظیمات است در DOM ساخته می‌شود.
   بله / ایتا از settingsContent داخل settings-layout استفاده می‌کنند؛
   پس layout همیشه باید بماند و فقط خود nav حذف/ساخته شود.
   ========================================================= */

const SETTINGS_NAV_ITEMS = [
    { page: 'overview', icon: '&#128202;', label: 'داشبورد و اطلاعات کلی' },
    { page: 'access-control', icon: '&#128272;', label: 'مدیریت دسترسی‌ها' },
    { page: 'registration-requests', icon: '&#128221;', label: 'درخواست کاربران جدید' },
    { page: 'users', icon: '&#128101;', label: 'مدیریت کاربران' },
    { page: 'notifications', icon: '&#128276;', label: 'اعلان‌ها' },
    { page: 'audit-logs', icon: '&#128220;', label: 'لاگ‌های سیستم' },
    { page: 'activities', icon: '&#128203;', label: 'فعالیت کاربران' },
    { page: 'security', icon: '&#128274;', label: 'امنیت' },
    { page: 'my-account', icon: '&#128100;', label: 'حساب من' },
    { page: 'system-settings', icon: '&#128295;', label: 'تنظیمات سیستم' }
];

/** true فقط وقتی کاربر در صفحات تنظیمات است (نه بله/ایتا) */
let settingsSectionOpen = false;

/** صفحات واقعی تنظیمات */
const SETTINGS_PAGES = new Set([
    'overview', 'users', 'registration-requests', 'user-details',
    'user-permissions', 'edit-user', 'roles', 'role-permissions',
    'notifications', 'audit-logs', 'activities', 'security',
    'my-account', 'system-settings', 'access-control'
]);

/** ساخت و تزریق منوی تنظیمات در DOM */
function ensureSettingsNav() {
    const container = document.getElementById('settingsNavContainer');
    if (!container) return;

    if (document.getElementById('settingsNav')) return;

    const itemsHtml = SETTINGS_NAV_ITEMS.map(item => `
        <button class="settings-nav-item" data-page="${item.page}" onclick="navigateTo('${item.page}')">
            <span class="icon">${item.icon}</span>
            <span>${item.label}</span>
        </button>
    `).join('');

    container.innerHTML = `
        <nav class="settings-nav" id="settingsNav">
            <div class="settings-nav-header">
                <span class="settings-nav-title">تنظیمات</span>
                <button class="settings-nav-close" onclick="toggleSettingsNav()">✕</button>
            </div>
            ${itemsHtml}
        </nav>
    `;
}

/**
 * حذف کامل nav از DOM + بستن پنل موبایل.
 * layout و settingsContent دست نخورده می‌مانند (برای بله/ایتا لازم است).
 */
function destroySettingsNav() {
    const container = document.getElementById('settingsNavContainer');
    if (container) {
        container.innerHTML = '';
    }

    const overlay = document.getElementById('settingsNavOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        overlay.style.display = '';
    }

    const toggleBtn = document.getElementById('settingsToggleBtn');
    if (toggleBtn) {
        toggleBtn.style.display = 'none';
    }

    settingsSectionOpen = false;
}

/** نمایش layout (اگر مخفی بود) — برای بله/ایتا و تنظیمات */
function ensureSettingsLayoutVisible() {
    const layout = document.querySelector('.settings-layout');
    if (layout) {
        layout.style.display = '';
    }
}

/** باز کردن بخش تنظیمات: layout + nav + دکمه موبایل */
function openSettingsSection() {
    ensureSettingsLayoutVisible();
    ensureSettingsNav();
    settingsSectionOpen = true;

    const toggleBtn = document.getElementById('settingsToggleBtn');
    if (toggleBtn) {
        toggleBtn.style.display = '';
    }

    // کلاس‌های چت بله/ایتا را پاک کن تا nav دیده شود
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.classList.remove('bale-chat-host', 'eitaa-chat-host');
    }
    const layout = document.querySelector('.settings-layout');
    if (layout) {
        layout.classList.remove('bale-chat-active', 'eitaa-chat-active');
    }

    document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-section') === 'settings');
    });
}

/**
 * خروج از صفحات تنظیمات:
 * فقط nav حذف می‌شود. layout می‌ماند تا بله/ایتا کار کنند.
 * توسط سایدبار و hideSettingsNav صدا زده می‌شود.
 */
function leaveSettingsSection() {
    destroySettingsNav();

    document.querySelectorAll('.sidebar-item').forEach(el => {
        if (el.getAttribute('data-section') === 'settings') {
            el.classList.remove('active');
        }
    });
}

/** بستن پنل کشویی موبایل (بدون حذف nav) */
function closeSettingsNav() {
    const nav = document.getElementById('settingsNav');
    const overlay = document.getElementById('settingsNavOverlay');

    if (nav) {
        nav.classList.remove('open');
    }
    if (overlay) {
        overlay.classList.remove('show');
    }
}

/**
 * سازگار با bale.js / bale-UI.js / eita-ui.js
 * وقتی بخش‌های غیرتنظیمات باز می‌شوند، nav را کامل حذف می‌کند.
 */
function hideSettingsNav() {
    leaveSettingsSection();
    ensureSettingsLayoutVisible();
}

function toggleSettingsNav() {
    if (!settingsSectionOpen) {
        openSettingsSection();
        const page = (typeof AppState !== 'undefined' && AppState.currentPage && SETTINGS_PAGES.has(AppState.currentPage))
            ? AppState.currentPage
            : 'overview';
        navigateTo(page);
        return;
    }

    ensureSettingsNav();

    const nav = document.getElementById('settingsNav');
    const overlay = document.getElementById('settingsNavOverlay');
    if (!nav) return;

    nav.classList.toggle('open');
    if (overlay) {
        overlay.classList.toggle('show');
    }
}

window.hideSettingsNav = hideSettingsNav;
window.leaveSettingsSection = leaveSettingsSection;
window.openSettingsSection = openSettingsSection;
window.destroySettingsNav = destroySettingsNav;
window.toggleSettingsNav = toggleSettingsNav;
window.closeSettingsNav = closeSettingsNav;

document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('settingsNavOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeSettingsNav);
    }

    // در شروع: nav نباشد، ولی layout برای محتوای بعدی آماده باشد
    destroySettingsNav();
    ensureSettingsLayoutVisible();

    // کلیک روی آیتم‌های غیر تنظیمات سایدبار → حذف nav
    document.querySelectorAll('.sidebar-item').forEach(btn => {
        if (btn.getAttribute('data-section') === 'settings') return;
        btn.addEventListener('click', function () {
            leaveSettingsSection();
            ensureSettingsLayoutVisible();
        });
    });
});


/* =========================================================
   SETTINGS NAVIGATION
   ========================================================= */

function navigateTo(page, data) {
    // Only the genuinely privileged settings pages are restricted here.
    // The old blanket check blocked every settings page for non-admin users,
    // including the dashboard and notifications. Other pages rely on their
    // page-specific UI checks and server-side API authorization.
    const administratorOnlyPages = new Set([
        'system-settings',
        'access-control'
    ]);
    if (administratorOnlyPages.has(page) && !isSettingsAdministrator()) {
        showPermissionDenied();
        return;
    }
    // ورود به صفحات تنظیمات → nav ساخته شود
    openSettingsSection();

    const previousPage = AppState.currentPage;
    AppState.currentPage = page;

    closeSettingsNav();

    if (data) {
        if (data.userId !== undefined) {
            AppState.selectedUserId = data.userId;
        }
        if (data.roleId !== undefined) {
            AppState.selectedRoleId = data.roleId;
        }
    }

    document.querySelectorAll('.settings-nav-item').forEach(el => {
        el.classList.toggle(
            'active',
            el.dataset.page === page ||
            (page === 'user-permissions' && el.dataset.page === 'users') ||
            (page === 'role-permissions' && el.dataset.page === 'roles') ||
            (page === 'user-details' && el.dataset.page === 'users') ||
            (page === 'edit-user' && el.dataset.page === 'users')
        );
    });

    const titles = {
        'overview': 'تنظیمات سیستم',
        'users': 'مدیریت کاربران',
        'registration-requests': 'درخواست کاربران جدید',
        'user-details': 'مشاهده کاربر',
        'user-permissions': 'مدیریت دسترسی کاربر',
        'edit-user': 'ویرایش کاربر',
        'roles': 'مدیریت نقش',
        'role-permissions': 'ویرایش نقش',
        'notifications': 'مدیریت اعلان‌ها',
        'audit-logs': 'لاگ‌های سیستم',
        'activities': 'فعالیت کاربران',
        'security': 'امنیت',
        'my-account': 'حساب من',
        'system-settings': 'تنظیمات سیستم',
        'access-control': 'مدیریت دسترسی‌ها'
    };

    const headerTitle = document.getElementById('headerTitle');
    if (headerTitle) {
        headerTitle.textContent = titles[page] || 'تنظیمات';
    }

    renderPage(page);
    if (page === 'users' && typeof loadUsers === 'function') {
        loadUsers().catch(() => {});
    }
}

function isSettingsAdministrator() {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : (window.CURRENT_USER || {});
    return Number(user?.accessLevel ?? user?.access_level) === 3;
}

function renderPage(page) {
    const content = document.getElementById('settingsContent');

    if (!content) return;

    const renderers = {
        'overview': renderOverview,
        'users': renderUsers,
        'registration-requests': renderRegistrationRequests,
        'user-details': renderUserDetails,
        'user-permissions': renderAccessControl,
        'edit-user': renderEditUser,
        'roles': renderRoles,
        'role-permissions': renderRolePermissions,
        'notifications': renderNotifications,
        'audit-logs': renderAuditLogs,
        'activities': renderActivities,
        'security': renderSecurity,
        'my-account': renderMyAccount,
        'system-settings': renderSystemSettings,
        'access-control': renderAccessControl
    };

    const renderer = renderers[page];

    if (renderer) {
        content.innerHTML = renderer();

        initPageInteractions();

        if (page === 'registration-requests') {
            loadRegistrationRequests();
        }
        if (page === 'access-control' || page === 'user-permissions') {
            loadAccessControl();
        }
        if (page === 'notifications') {
            refreshNotificationsPage();
        }
        if ((page === 'audit-logs' || page === 'activities' || page === 'overview' || page === 'security') && !window.__auditLoadedForPage?.[page]) {
            loadPersistentAuditData(page);
        }
        if (page === 'system-settings') {
            loadPersistentSystemSettings();
        }
    }
}

function renderAccessControl() {
    if (!isSettingsAdministrator()) {
        setTimeout(() => showPermissionDenied(), 0);
        return '<div class="card"><h2>دسترسی محدود است</h2></div>';
    }
    return `
      <div class="page-header">
        <h1>مدیریت دسترسی‌ها</h1>
        <p>برای هر کاربر، مجوز استفاده، مشاهده و ویرایش را جداگانه تنظیم کنید.</p>
      </div>
      <div class="card mb-6">
        <label class="form-label" for="permissionUserSelect">انتخاب کاربر</label>
        <select id="permissionUserSelect" class="form-select" onchange="loadSelectedUserPermissions()">
          <option value="">در حال دریافت کاربران...</option>
        </select>
        <p id="permissionSaveStatus" role="status" style="margin-top:12px"></p>
      </div>
      <div id="permissionEditorRoot" class="card">
        در حال دریافت فهرست مجوزها...
      </div>
      <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="saveSelectedUserPermissions()">ذخیره تغییرات</button>
      </div>
    `;
}

let accessControlCatalog = [];
let accessControlValues = {};

async function loadAccessControl() {
    if (!isSettingsAdministrator()) {
        showPermissionDenied();
        return;
    }
    const status = document.getElementById("permissionSaveStatus");
    try {
        const [usersResponse, catalogResponse] = await Promise.all([
            fetch(`${API_BASE}/api/admin/permissions/users`, {credentials:"include", cache:"no-store"}),
            fetch(`${API_BASE}/api/admin/permissions/catalog`, {credentials:"include", cache:"no-store"})
        ]);
        const usersData = await usersResponse.json();
        const catalogData = await catalogResponse.json();
        if (!usersResponse.ok || !catalogResponse.ok) throw new Error(catalogData.detail?.message || catalogData.detail || "دریافت مجوزها ناموفق بود");
        accessControlCatalog = catalogData.permissions || [];
        const select = document.getElementById("permissionUserSelect");
        if (!select) return;
        const previous = select.value;
        select.innerHTML = '<option value="">یک کاربر انتخاب کنید</option>' + (usersData.users || []).map(u =>
          `<option value="${Number(u.id)}">${escapePermissionText([u.first_name,u.last_name].filter(Boolean).join(" ") || u.username)} — ${escapePermissionText(u.username || "")}</option>`
        ).join("");
        if (previous && [...select.options].some(o => o.value === previous)) select.value = previous;
        else if (AppState.selectedUserId && [...select.options].some(o => o.value === String(AppState.selectedUserId))) {
            select.value = String(AppState.selectedUserId);
        }
        if (!select.value && select.options.length > 1) select.selectedIndex = 1;
        await loadSelectedUserPermissions();
        if (status) status.textContent = "";
    } catch (error) {
        if (status) status.textContent = error.message || "خطا در دریافت مجوزها";
        const root = document.getElementById("permissionEditorRoot");
        if (root) root.textContent = error.message || "خطا در دریافت مجوزها";
    }
}

function escapePermissionText(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[char]);
}

async function loadSelectedUserPermissions() {
    const select = document.getElementById("permissionUserSelect");
    const root = document.getElementById("permissionEditorRoot");
    if (!select || !root || !select.value) {
        if (root) root.textContent = "ابتدا کاربر را انتخاب کنید.";
        return;
    }
    root.textContent = "در حال دریافت...";
    try {
        const response = await fetch(`${API_BASE}/api/admin/permissions/users/${encodeURIComponent(select.value)}`, {credentials:"include", cache:"no-store"});
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail?.message || data.detail || "دریافت دسترسی کاربر ناموفق بود");
        accessControlValues = {};
        for (const p of data.permissions || []) {
            accessControlValues[p.code] = {can_read: !!p.can_read, can_write: !!p.can_write};
        }
        const groups = {};
        for (const p of accessControlCatalog) (groups[p.group] ||= []).push(p);
        root.innerHTML = Object.entries(groups).map(([group, items]) => `
          <section style="margin-bottom:22px">
            <h3 style="margin-bottom:12px">${escapePermissionText(group)}</h3>
            ${items.map(p => {
              const value = accessControlValues[p.code] || {can_read:false,can_write:false};
              const registered = p.registered;
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:1px solid var(--gray-200);padding:12px 0">
                  <div>
                    <div>${escapePermissionText(p.label)}</div>
                    <small style="color:var(--gray-500)">${escapePermissionText(p.code)}${registered ? "" : " — نیازمند اجرای migration"}</small>
                  </div>
                  <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
                    ${p.mode === "toggle" ? `
                      <label><input type="checkbox" data-permission-code="${p.code}" data-permission-field="can_read" ${value.can_read ? "checked" : ""} ${registered ? "" : "disabled"}> استفاده شود</label>
                    ` : `
                      <label><input type="checkbox" data-permission-code="${p.code}" data-permission-field="can_read" ${value.can_read ? "checked" : ""} ${registered ? "" : "disabled"}> مشاهده</label>
                      <label><input type="checkbox" data-permission-code="${p.code}" data-permission-field="can_write" ${value.can_write ? "checked" : ""} ${registered ? "" : "disabled"}> ویرایش</label>
                    `}
                  </div>
                </div>`;
            }).join("")}
          </section>`
        ).join("");
        root.querySelectorAll("input[data-permission-code]").forEach(input => {
          input.addEventListener("change", () => {
            const code = input.dataset.permissionCode;
            const field = input.dataset.permissionField;
            accessControlValues[code] ||= {can_read:false, can_write:false};
            accessControlValues[code][field] = input.checked;
            const item = accessControlCatalog.find(p => p.code === code);
            if (item?.mode === "toggle") {
              accessControlValues[code].can_write = input.checked;
            }
            if (field === "can_read" && item?.mode === "toggle") {
              const counterpart = root.querySelector(`input[data-permission-code="${code}"][data-permission-field="can_write"]`);
              if (counterpart) counterpart.checked = input.checked;
            }
          });
        });
    } catch (error) {
        root.textContent = error.message || "خطا در دریافت مجوزها";
    }
}

async function saveSelectedUserPermissions() {
    if (!isSettingsAdministrator()) {
        showPermissionDenied();
        return;
    }
    const select = document.getElementById("permissionUserSelect");
    const status = document.getElementById("permissionSaveStatus");
    if (!select?.value) {
        if (status) status.textContent = "ابتدا یک کاربر انتخاب کنید.";
        return;
    }
    const permissions = accessControlCatalog.filter(p => p.registered).map(p => ({
        code: p.code,
        can_read: !!accessControlValues[p.code]?.can_read,
        can_write: !!accessControlValues[p.code]?.can_write
    }));
    try {
        const response = await fetch(`${API_BASE}/api/admin/permissions/users/${encodeURIComponent(select.value)}`, {
            method:"PUT",
            credentials:"include",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({permissions})
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail?.message || data.detail || "ذخیره مجوزها ناموفق بود");
        if (status) status.textContent = "مجوزهای کاربر ذخیره شد.";
        if (typeof showToast === "function") showToast("مجوزهای کاربر ذخیره شد", "success");
    } catch (error) {
        if (status) status.textContent = error.message || "ذخیره مجوزها ناموفق بود";
    }
}

function initPageInteractions() {
    document.querySelectorAll('.perm-group-header').forEach(header => {
        header.addEventListener('click', () => {
            const group = header.parentElement;
            group.classList.toggle('open');
        });
    });
}


/* =========================================================
   SETTINGS HELPERS
   ========================================================= */

function avatarColor(id) {
    const colors = [
        '#2563eb',
        '#7c3aed',
        '#db2777',
        '#dc2626',
        '#ea580c',
        '#16a34a',
        '#0891b2',
        '#4f46e5'
    ];

    return colors[id % colors.length];
}

function renderAvatar(user, size = 'md') {
    const firstName = String(user.firstName || '');
    const lastName = String(user.lastName || '');
    const initials = (firstName.charAt(0) || lastName.charAt(0) || '?') +
        (firstName && lastName ? ' ' + lastName.charAt(0) : '');

    return `
        <div
            class="avatar ${size}"
            style="background: ${avatarColor(user.id)}"
        >
            ${initials}
        </div>
    `;
}

function statusBadge(status) {
    if (status === 'active') {
        return '<span class="badge badge-success">فعال</span>';
    }

    return '<span class="badge badge-danger">غیرفعال</span>';
}

function levelBadge(level) {
    const colors = {
        1: 'badge-gray',
        2: 'badge-info',
        3: 'badge-danger'
    };

    return `
        <span class="badge ${colors[level] || 'badge-gray'}">
            سطح ${level}
        </span>
    `;
}

function renderPagination(currentPage, totalPages, onPageChange) {
    if (totalPages <= 1) return '';

    let html = '<div class="pagination-btns">';

    html += `
        <button
            class="pagination-btn"
            onclick="${onPageChange}(${currentPage - 1})"
            ${currentPage === 1 ? 'disabled' : ''}
        >
            ›
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {

        if (
            totalPages > 7 &&
            i > 2 &&
            i < totalPages - 1 &&
            Math.abs(i - currentPage) > 1
        ) {
            if (i === 3 || i === totalPages - 2) {
                html += `
                    <span style="padding: 0 4px; color: var(--gray-400)">
                        ...
                    </span>
                `;
            }

            continue;
        }

        html += `
            <button
                class="pagination-btn ${i === currentPage ? 'active' : ''}"
                onclick="${onPageChange}(${i})"
            >
                ${i}
            </button>
        `;
    }

    html += `
        <button
            class="pagination-btn"
            onclick="${onPageChange}(${currentPage + 1})"
            ${currentPage === totalPages ? 'disabled' : ''}
        >
            ‹
        </button>
    `;

    html += '</div>';

    return html;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/* =========================================================
   PAGE: OVERVIEW
   ========================================================= */

function renderOverview() {
    const activeUsers =
        USERS.filter(u => u.status === 'active').length;

    const inactiveUsers =
        USERS.filter(u => u.status === 'inactive').length;

    const totalPerms = PERMISSIONS.length;

    const recentActivities =
        ACTIVITIES.slice(0, 5);

    const recentLogs =
        AUDIT_LOGS.slice(0, 5);

    const recentPermChanges =
        AUDIT_LOGS
            .filter(
                l =>
                    l.action === 'permission_change' ||
                    l.action === 'change_role'
            )
            .slice(0, 4);

    const securityAlerts =
        AUDIT_LOGS
            .filter(l => l.action === 'login_failed')
            .slice(0, 3);

    return `
        <div class="page-header">
            <div class="breadcrumb">
                <a
                    href="#"
                    onclick="navigateTo('overview'); return false;"
                >
                    تنظیمات
                </a>

                <span class="separator">/</span>

                <span class="current">
                    نمای کلی
                </span>
            </div>

            <h1>
                نمای کلی تنظیمات
            </h1>

            <p>
                مروری بر وضعیت کلی سیستم، کاربران و فعالیت‌ها
            </p>
        </div>

        <div class="stats-grid">

            <div class="stat-card">
                <div
                    class="stat-icon"
                    style="background: var(--success-light); color: var(--success)"
                >
                    👥
                </div>

                <div class="stat-value">
                    ${activeUsers}
                </div>

                <div class="stat-label">
                    کاربران فعال
                </div>
            </div>

            <div class="stat-card">
                <div
                    class="stat-icon"
                    style="background: var(--danger-light); color: var(--danger)"
                >
                    🚫
                </div>

                <div class="stat-value">
                    ${inactiveUsers}
                </div>

                <div class="stat-label">
                    کاربران غیرفعال
                </div>
            </div>

            <div class="stat-card">
                <div
                    class="stat-icon"
                    style="background: var(--purple-light); color: var(--purple)"
                >
                    🛡️
                </div>

                <div class="stat-value">
                    ${ROLES.length}
                </div>

                <div class="stat-label">
                    نقش‌ها
                </div>
            </div>

            <div class="stat-card">
                <div
                    class="stat-icon"
                    style="background: var(--info-light); color: var(--info)"
                >
                    🔑
                </div>

                <div class="stat-value">
                    ${totalPerms}
                </div>

                <div class="stat-label">
                    Permissionها
                </div>
            </div>

            <div class="stat-card">
                <div
                    class="stat-icon"
                    style="background: var(--warning-light); color: var(--warning)"
                >
                    🔐
                </div>

                <div class="stat-value">
                    ${
                        SECURITY_EVENTS.filter(
                            e =>
                                e.type === 'login' &&
                                e.status === 'success'
                        ).length
                    }
                </div>

                <div class="stat-label">
                    ورودهای امروز
                </div>
            </div>

            <div class="stat-card">
                <div
                    class="stat-icon"
                    style="background: var(--primary-100); color: var(--primary)"
                >
                    📋
                </div>

                <div class="stat-value">
                    ${ACTIVITIES.length}
                </div>

                <div class="stat-label">
                    فعالیت‌های امروز
                </div>
            </div>

        </div>

        <div class="two-col">

            <div class="card">

                <div class="card-header">

                    <div class="card-title">
                        آخرین فعالیت‌ها
                    </div>

                    <button
                        class="btn btn-ghost btn-sm"
                        onclick="navigateTo('activities')"
                    >
                        مشاهده همه →
                    </button>

                </div>

                <div class="activity-list">

                    ${recentActivities.map(a => `
                        <div class="activity-item">

                            <div
                                class="activity-icon"
                                style="background: ${a.color}15; color: ${a.color}"
                            >
                                ${a.icon}
                            </div>

                            <div class="activity-body">

                                <div class="activity-user">
                                    ${a.userName}
                                </div>

                                <div class="activity-action">
                                    ${a.action}
                                </div>

                                <div class="activity-time">
                                    ${formatTimeAgo(a.timestamp)}
                                </div>

                            </div>

                        </div>
                    `).join('')}

                </div>

            </div>

            <div class="card">

                <div class="card-header">

                    <div class="card-title">
                        آخرین تغییرات Permission
                    </div>

                </div>

                <div class="activity-list">

                    ${
                        recentPermChanges.length > 0
                            ? recentPermChanges.map(l => `
                                <div class="activity-item">

                                    <div
                                        class="activity-icon"
                                        style="background: var(--warning-light); color: var(--warning)"
                                    >
                                        🔑
                                    </div>

                                    <div class="activity-body">

                                        <div class="activity-user">
                                            ${l.userName}
                                        </div>

                                        <div class="activity-action">
                                            ${l.description}
                                        </div>

                                        <div class="activity-time">
                                            ${l.timestamp}
                                        </div>

                                    </div>

                                </div>
                            `).join('')
                            : `
                                <div
                                    class="empty-state"
                                    style="padding: var(--space-8)"
                                >
                                    <div class="icon">🔑</div>
                                    <div class="title">
                                        تغییری ثبت نشده
                                    </div>
                                </div>
                            `
                    }

                </div>

            </div>

        </div>

        <div class="card mt-6">

            <div class="card-header">

                <div class="card-title">
                    هشدارهای امنیتی
                </div>

                <button
                    class="btn btn-ghost btn-sm"
                    onclick="navigateTo('security')"
                >
                    مشاهده همه →
                </button>

            </div>

            ${
                securityAlerts.length > 0
                    ? `
                        <div class="table-container">

                            <table class="data-table">

                                <thead>
                                    <tr>
                                        <th>کاربر</th>
                                        <th>عملیات</th>
                                        <th>زمان</th>
                                        <th>آدرس IP</th>
                                        <th>نتیجه</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    ${securityAlerts.map(e => `
                                        <tr>

                                            <td>
                                                <div class="user-cell">
                                                    <span class="user-name">
                                                        ${e.userName}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                ${
                                                    e.type === 'login_failed'
                                                        ? 'ورود ناموفق'
                                                        : 'ورود موفق'
                                                }
                                            </td>

                                            <td>
                                                ${e.timestamp}
                                            </td>

                                            <td>
                                                <code class="font-mono">
                                                    ${e.ip}
                                                </code>
                                            </td>

                                            <td>
                                                <span class="log-result ${e.status}">
                                                    ${
                                                        e.status === 'success'
                                                            ? '✓ موفق'
                                                            : '✗ ناموفق'
                                                    }
                                                </span>
                                            </td>

                                        </tr>
                                    `).join('')}

                                </tbody>

                            </table>

                        </div>
                    `
                    : `
                        <div class="empty-state">
                            <div class="icon">🔒</div>
                            <div class="title">
                                هشدار امنیتی وجود ندارد
                            </div>
                        </div>
                    `
            }

        </div>
    `;
}


/* =========================================================
   PAGE: REGISTRATION REQUESTS
   ========================================================= */

function getRequestLevel(r) {
    return Number(
        r.requested_access_level ??
        r.access_level ??
        r.level ??
        1
    );
}

function renderRegistrationRequests() {
    return `
        <div class="page-header">
            <div class="breadcrumb">
                <a href="#" onclick="navigateTo('overview'); return false;">تنظیمات</a>
                <span class="separator">/</span>
                <span class="current">درخواست کاربران جدید</span>
            </div>
            <h1>درخواست کاربران جدید</h1>
            <p>تایید یا رد درخواست‌های ثبت‌نام از دیتابیس</p>
        </div>

        <div class="stats-grid" id="registrationStats">
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--warning-light); color: var(--warning)">⏳</div>
                <div class="stat-value" id="pendingRegistrationCount">0</div>
                <div class="stat-label">در انتظار بررسی</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--success-light); color: var(--success)">✓</div>
                <div class="stat-value" id="approvedRegistrationCount">0</div>
                <div class="stat-label">تأیید شده</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--danger-light); color: var(--danger)">✕</div>
                <div class="stat-value" id="rejectedRegistrationCount">0</div>
                <div class="stat-label">رد شده</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-title">درخواست‌ها</div>
            </div>
            <div class="table-container" id="registrationRequestsTable">
                <div class="empty-state">
                    <div class="icon">⏳</div>
                    <div class="title">در حال دریافت درخواست‌ها...</div>
                </div>
            </div>
        </div>
    `;
}

async function loadRegistrationRequests() {
    const box = document.getElementById("registrationRequestsTable");
    if (!box) return;

    box.innerHTML = `
        <div class="empty-state">
            <div class="icon">⏳</div>
            <div class="title">در حال دریافت درخواست‌ها...</div>
        </div>
    `;

    try {
        const res = await fetch(
            `${API_BASE}/api/admin/registration-requests`,
            {
                credentials: "include",
                headers: { Accept: "application/json" }
            }
        );

        const data = await res.json();
        console.log("REG REQUESTS:", res.status, data);

        if (!res.ok || data.success === false) {
            const detail = data.detail;
            const msg =
                (detail && (detail.message || detail)) ||
                data.message ||
                "خطا در دریافت درخواست‌ها";
            throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
        }

        // admin.py → data | registration_admin.py → requests
        const list = data.requests || data.results || data.data || [];
        window.__lastRegRequests = list;

        updateRegistrationStats(list);

        if (!list.length) {
            box.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📭</div>
                    <div class="title">درخواستی وجود ندارد</div>
                </div>
            `;
            return;
        }

        box.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>نام</th>
                        <th>نام کاربری</th>
                        <th>سطح درخواستی</th>
                        <th>سمت</th>
                        <th>تاریخ</th>
                        <th>وضعیت</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map((r) => {
                        const lvl = getRequestLevel(r);
                        const pending = r.status === "pending";
                        const statusHtml =
                            r.status === "approved"
                                ? '<span class="badge badge-success">تأیید شده</span>'
                                : r.status === "rejected"
                                ? '<span class="badge badge-danger">رد شده</span>'
                                : '<span class="badge badge-warning">در انتظار</span>';

                        return `
                        <tr>
                            <td>
                                <div class="user-cell">
                                    <span class="user-name">
                                        ${escapeHtml(r.first_name || "")}
                                        ${escapeHtml(r.last_name || "")}
                                    </span>
                                </div>
                            </td>
                            <td>@${escapeHtml(r.username || "-")}</td>
                            <td>${levelBadge(lvl)}</td>
                            <td>${escapeHtml(r.organizational_position || "-")}</td>
                            <td>${escapeHtml(r.created_at || "-")}</td>
                            <td>${statusHtml}</td>
                            <td>
                                <div class="actions-cell">
                                    ${
                                        pending
                                            ? `
                                        <button
                                            class="btn btn-ghost btn-icon sm"
                                            title="تأیید"
                                            onclick="approveRegistrationRequest(${r.id}, ${lvl})"
                                        >✓</button>
                                        <button
                                            class="btn btn-ghost btn-icon sm"
                                            title="رد"
                                            onclick="rejectRegistrationRequest(${r.id})"
                                        >✕</button>
                                    `
                                            : "-"
                                    }
                                </div>
                            </td>
                        </tr>`;
                    }).join("")}
                </tbody>
            </table>
        `;
    } catch (e) {
        console.error("LOAD REGISTRATION REQUESTS ERROR:", e);
        box.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <div class="title">خطا در دریافت درخواست‌ها</div>
                <div class="description">${escapeHtml(e.message || String(e))}</div>
            </div>
        `;
    }
}

function updateRegistrationStats(list) {
    const arr = Array.isArray(list) ? list : [];
    const p = arr.filter((r) => r.status === "pending").length;
    const a = arr.filter((r) => r.status === "approved").length;
    const j = arr.filter((r) => r.status === "rejected").length;

    const set = (id, n) => {
        const el = document.getElementById(id);
        if (el) el.textContent = n;
    };
    set("pendingRegistrationCount", p);
    set("approvedRegistrationCount", a);
    set("rejectedRegistrationCount", j);
}
async function approveRegistrationRequest(id, level) {
    let row = (window.__lastRegRequests || []).find(
        (r) => Number(r.id) === Number(id)
    );

    // اگر در لیست نبود، از API بگیر
    if (!row) {
        try {
            const res = await fetch(
                `${API_BASE}/api/admin/registration-requests/${id}`,
                { credentials: "include", headers: { Accept: "application/json" } }
            );
            const data = await res.json();
            row = data.request || data.data || data;
        } catch (e) {
            console.error(e);
            row = {};
        }
    }

    const lvl = Number(
        level ||
        row.requested_access_level ||
        row.access_level ||
        1
    );

    showModal(
        "تأیید و ویرایش درخواست",
        `
        <div class="form-group">
            <label class="form-label">نام</label>
            <input class="form-input" id="apFirstName"
                value="${escapeHtml(row.first_name || "")}">
        </div>
        <div class="form-group">
            <label class="form-label">نام خانوادگی</label>
            <input class="form-input" id="apLastName"
                value="${escapeHtml(row.last_name || "")}">
        </div>
        <div class="form-group">
            <label class="form-label">نام کاربری</label>
            <input class="form-input" id="apUsername" dir="ltr"
                value="${escapeHtml(row.username || "")}">
        </div>
        <div class="form-group">
            <label class="form-label">سمت سازمانی</label>
            <input class="form-input" id="apPosition"
                value="${escapeHtml(row.organizational_position || "")}">
        </div>
        <div class="form-group">
            <label class="form-label">سطح دسترسی</label>
            <select class="form-select" id="apAccessLevel">
                <option value="1" ${lvl === 1 ? "selected" : ""}>سطح ۱</option>
                <option value="2" ${lvl === 2 ? "selected" : ""}>سطح ۲</option>
                <option value="3" ${lvl === 3 ? "selected" : ""}>سطح ۳</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">آیدی عددی بله</label>
            <input class="form-input" id="apBaleUserId" dir="ltr"
                inputmode="numeric" placeholder="مثلاً 123456789">
        </div>
        `,
        [
            { label: "انصراف", class: "btn-secondary", action: "closeModalDirect()" },
            {
                label: "تأیید و ذخیره",
                class: "btn-primary",
                action: `submitApproveRegistration(${id})`
            }
        ]
    );
}

async function submitApproveRegistration(id) {
    const first_name = document.getElementById("apFirstName")?.value.trim() || "";
    const last_name = document.getElementById("apLastName")?.value.trim() || "";
    const username = document.getElementById("apUsername")?.value.trim() || "";
    const organizational_position = document.getElementById("apPosition")?.value.trim() || null;
    const access_level = Number(document.getElementById("apAccessLevel")?.value || 1);
    const bale_user_id = document.getElementById("apBaleUserId")?.value.trim() || "";

    if (!first_name || !last_name || !username) {
        alert("نام، نام خانوادگی و نام کاربری الزامی است");
        return;
    }
    if (!bale_user_id || !/^\d+$/.test(bale_user_id)) {
        alert("آیدی بله باید عدد باشد");
        return;
    }

    try {
        const res = await fetch(
            `${API_BASE}/api/admin/registration-requests/${id}/approve`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    first_name,
                    last_name,
                    username,
                    organizational_position,
                    access_level,
                    bale_user_id: Number(bale_user_id),
                    bale_first_name: first_name,
                    bale_last_name: last_name
                })
            }
        );
        const data = await res.json();
        if (!res.ok || data.success === false) {
            throw new Error(data.detail || data.message || "تأیید ناموفق");
        }
        closeModalDirect();
        showToast("کاربر تأیید و به بله وصل شد", "success");
        await loadRegistrationRequests();
        if (typeof loadUsers === "function") await loadUsers();
    } catch (e) {
        console.error(e);
        showToast(e.message || "خطا", "error");
    }
}

function rejectRegistrationRequest(id) {
    if (!confirm("رد این درخواست؟")) return;
    submitRejectRegistration(id);
}

async function submitRejectRegistration(id) {
    try {
        const res = await fetch(
            `${API_BASE}/api/admin/registration-requests/${id}/reject`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({ reason: "" })
            }
        );
        const data = await res.json();
        console.log("REJECT:", res.status, data);

        if (!res.ok || data.success === false) {
            const detail = data.detail;
            throw new Error(
                (detail && (detail.message || detail)) ||
                data.message ||
                "رد ناموفق بود"
            );
        }

        if (typeof showToast === "function") {
            showToast("درخواست رد شد", "success");
        }
        await loadRegistrationRequests();
    } catch (e) {
        console.error("REJECT ERROR:", e);
        if (typeof showToast === "function") {
            showToast(e.message || "خطا در رد", "error");
        } else {
            alert(e.message || "خطا در رد");
        }
    }
}

window.loadRegistrationRequests = loadRegistrationRequests;
window.approveRegistrationRequest = approveRegistrationRequest;
window.rejectRegistrationRequest = rejectRegistrationRequest;
window.submitApproveRegistration = submitApproveRegistration;
window.submitRejectRegistration = submitRejectRegistration;
window.__lastRegRequests = window.__lastRegRequests || [];

/* =========================================================
   PAGE: USERS
   ========================================================= */

function renderUsers() {
    let filtered = [...USERS];

    if (AppState.userSearch) {
        const q =
            AppState.userSearch.toLowerCase();

        filtered =
            filtered.filter(user =>
                String(user.firstName || '').toLowerCase().includes(q) ||
                String(user.lastName || '').toLowerCase().includes(q) ||
                String(user.username || '').toLowerCase().includes(q)
            );
    }

    if (AppState.userFilter !== 'all') {
        filtered =
            filtered.filter(
                user =>
                    user.status ===
                    AppState.userFilter
            );
    }

    const totalPages =
        Math.ceil(
            filtered.length /
            AppState.usersPerPage
        );

    const start =
        (AppState.currentPageUsers - 1) *
        AppState.usersPerPage;

    const pageUsers =
        filtered.slice(
            start,
            start + AppState.usersPerPage
        );

    return `
        <div class="page-header">

            <div class="breadcrumb">

                <a
                    href="#"
                    onclick="navigateTo('overview'); return false;"
                >
                    تنظیمات
                </a>

                <span class="separator">/</span>

                <span class="current">
                    مدیریت کاربران
                </span>

            </div>

            <div
                style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                "
            >

                <div>

                    <h1>
                        مدیریت کاربران
                    </h1>

                    <p>
                        مدیریت کاربران و سطح دسترسی آن‌ها
                    </p>

                </div>

                <button
                    class="btn btn-primary"
                    onclick="showCreateUserModal()"
                >
                    + کاربر جدید
                </button>

            </div>

        </div>

        <div class="toolbar">

            <div class="search-box">

                <span class="search-icon">
                    🔍
                </span>

                <input
                    type="text"
                    placeholder="جستجوی کاربر..."
                    value="${AppState.userSearch}"
                    oninput="
                        AppState.userSearch = this.value;
                        AppState.currentPageUsers = 1;
                        navigateTo('users')
                    "
                >

            </div>

            <button
                class="filter-btn ${AppState.userFilter === 'all' ? 'active' : ''}"
                onclick="
                    AppState.userFilter='all';
                    AppState.currentPageUsers=1;
                    navigateTo('users')
                "
            >
                همه
            </button>

            <button
                class="filter-btn ${AppState.userFilter === 'active' ? 'active' : ''}"
                onclick="
                    AppState.userFilter='active';
                    AppState.currentPageUsers=1;
                    navigateTo('users')
                "
            >
                فعال
            </button>

            <button
                class="filter-btn ${AppState.userFilter === 'inactive' ? 'active' : ''}"
                onclick="
                    AppState.userFilter='inactive';
                    AppState.currentPageUsers=1;
                    navigateTo('users')
                "
            >
                غیرفعال
            </button>

        </div>

        <div class="table-container">

            <table class="data-table">

                <thead>

                    <tr>
                        <th>کاربر</th>
                        <th>نام کاربری</th>
                        <th>نقش</th>
                        <th>سطح</th>
                        <th>وضعیت</th>
                        <th>عملیات</th>
                    </tr>

                </thead>

                <tbody>

                    ${
                        pageUsers.length
                            ? pageUsers.map(user => `
                                <tr>

                                    <td>

                                        <div class="user-cell">

                                            ${renderAvatar(user, 'sm')}

                                            <div>

                                                <div class="user-name">
                                                    ${user.firstName}
                                                    ${user.lastName}
                                                </div>

                                                <div
                                                    style="
                                                        font-size:var(--font-size-xs);
                                                        color:var(--gray-500);
                                                    "
                                                >
                                                    ${user.organizationalPosition || '-'}
                                                </div>

                                            </div>

                                        </div>

                                    </td>

                                    <td>
                                        @${user.username}
                                    </td>

                                    <td>
                                        ${
                                            (() => {
                                                const role =
                                                    ROLES.find(
                                                        r =>
                                                            r.id ===
                                                            user.role
                                                    );

                                                return role
                                                    ? `<span class="badge badge-primary">${role.label}</span>`
                                                    : '-';
                                            })()
                                        }
                                    </td>

                                    <td>
                                        ${levelBadge(user.level)}
                                    </td>

                                    <td>
                                        ${statusBadge(user.status)}
                                    </td>

                                    <td>

                                        <div class="actions-cell">

                                            <button
                                                class="btn btn-ghost btn-icon sm"
                                                title="مشاهده"
                                                onclick="
                                                    navigateTo(
                                                        'user-details',
                                                        { userId: ${user.id} }
                                                    )
                                                "
                                            >
                                                👁️
                                            </button>

                                            <button
                                                class="btn btn-ghost btn-icon sm"
                                                title="Permission"
                                                onclick="
                                                    navigateTo(
                                                        'user-permissions',
                                                        { userId: ${user.id} }
                                                    )
                                                "
                                            >
                                                🔑
                                            </button>

                                            <button
                                                class="btn btn-ghost btn-icon sm"
                                                title="ویرایش"
                                                onclick="
                                                    navigateTo(
                                                        'edit-user',
                                                        { userId: ${user.id} }
                                                    )
                                                "
                                            >
                                                ✏️
                                            </button>

                                            <button
                                                class="btn btn-ghost btn-icon sm"
                                                title="فعال/غیرفعال"
                                                onclick="
                                                    toggleUserStatus(${user.id})
                                                "
                                            >
                                                ${
                                                    user.status === 'active'
                                                        ? '⏸️'
                                                        : '▶️'
                                                }
                                            </button>

                                        </div>

                                    </td>

                                </tr>
                            `).join('')
                            : `
                                <tr>
                                    <td
                                        colspan="6"
                                        style="text-align:center;"
                                    >
                                        <div class="empty-state">
                                            <div class="icon">
                                                👥
                                            </div>

                                            <div class="title">
                                                کاربری یافت نشد
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            `
                    }

                </tbody>

            </table>

        </div>

        <div class="pagination">

            <div class="pagination-info">
                نمایش
                ${filtered.length ? start + 1 : 0}
                -
                ${Math.min(
                    start + AppState.usersPerPage,
                    filtered.length
                )}
                از
                ${filtered.length}
                کاربر
            </div>

            ${renderPagination(
                AppState.currentPageUsers,
                totalPages,
                'goToUsersPage'
            )}

        </div>
    `;
}

function goToUsersPage(page) {
    const totalPages =
        Math.ceil(
            USERS.length /
            AppState.usersPerPage
        );

    if (
        page >= 1 &&
        page <= totalPages
    ) {
        AppState.currentPageUsers = page;
        navigateTo('users');
    }
}


/* =========================================================
   USER DETAILS
   ========================================================= */

function renderUserDetails() {
    const user =
        USERS.find(
            u =>
                u.id ===
                AppState.selectedUserId
        );

    if (!user) {
        return `
            <div class="empty-state">
                <div class="icon">👤</div>
                <div class="title">
                    کاربر یافت نشد
                </div>
            </div>
        `;
    }

    const role =
        ROLES.find(
            r => r.id === user.role
        );

    return `
        <div class="page-header">

            <div class="breadcrumb">

                <a
                    href="#"
                    onclick="navigateTo('overview'); return false;"
                >
                    تنظیمات
                </a>

                <span class="separator">/</span>

                <a
                    href="#"
                    onclick="navigateTo('users'); return false;"
                >
                    کاربران
                </a>

                <span class="separator">/</span>

                <span class="current">
                    ${user.firstName}
                    ${user.lastName}
                </span>

            </div>

            <h1>
                مشاهده کاربر
            </h1>

            <p>
                اطلاعات کامل کاربر
            </p>

        </div>

        <div class="card">

            <div class="card-header">

                <div class="card-title">
                    اطلاعات کاربر
                </div>

                ${statusBadge(user.status)}

            </div>

            <div class="account-grid">

                <label>
                    نام
                </label>

                <input
                    readonly
                    value="${user.firstName || '-'}"
                >

                <label>
                    نام خانوادگی
                </label>

                <input
                    readonly
                    value="${user.lastName || '-'}"
                >

                <label>
                    نام کاربری
                </label>

                <input
                    readonly
                    value="@${user.username || '-'}"
                >

                <label>
                    سمت سازمانی
                </label>

                <input
                    readonly
                    value="${user.organizationalPosition || '-'}"
                >

                <label>
                    نقش
                </label>

                <input
                    readonly
                    value="${role ? role.label : '-'}"
                >

                <label>
                    سطح دسترسی
                </label>

                <input
                    readonly
                    value="${user.level || '-'}"
                >

                <label>
                    وضعیت
                </label>

                <input
                    readonly
                    value="${user.status || '-'}"
                >

            </div>

            <div
                style="
                    display:flex;
                    gap:var(--space-3);
                    margin-top:var(--space-6);
                "
            >

                <button
                    class="btn btn-primary"
                    onclick="
                        navigateTo(
                            'user-permissions',
                            { userId: ${user.id} }
                        )
                    "
                >
                    🔑 مدیریت Permission
                </button>

                <button
                    class="btn btn-secondary"
                    onclick="
                        navigateTo(
                            'edit-user',
                            { userId: ${user.id} }
                        )
                    "
                >
                    ✏️ ویرایش
                </button>

                <button
                    class="btn btn-secondary"
                    onclick="navigateTo('users')"
                >
                    بازگشت
                </button>

            </div>

        </div>
    `;
}


/* =========================================================
   USER PERMISSIONS
   ========================================================= */

function renderUserPermissions() {
    const user =
        USERS.find(
            u =>
                u.id ===
                AppState.selectedUserId
        );

    if (!user) {
        return `
            <div class="empty-state">
                <div class="icon">👤</div>
                <div class="title">
                    کاربر یافت نشد
                </div>
            </div>
        `;
    }

    const role =
        ROLES.find(
            r => r.id === user.role
        );

    const effectivePermissions =
        getEffectivePermissionsDetail(user.id);

    return `
        <div class="page-header">

            <div class="breadcrumb">

                <a
                    href="#"
                    onclick="navigateTo('overview'); return false;"
                >
                    تنظیمات
                </a>

                <span class="separator">/</span>

                <a
                    href="#"
                    onclick="navigateTo('users'); return false;"
                >
                    کاربران
                </a>

                <span class="separator">/</span>

                <span class="current">
                    Permission
                </span>

            </div>

            <h1>
                مدیریت دسترسی کاربر
            </h1>

            <p>
                ${user.firstName}
                ${user.lastName}
                ·
                ${role ? role.label : 'بدون نقش'}
            </p>

        </div>

        <div class="card mb-6">

            <div
                style="
                    display:flex;
                    align-items:center;
                    gap:var(--space-4);
                    flex-wrap:wrap;
                "
            >

                <div>
                    <span
                        style="
                            font-size:var(--font-size-sm);
                            color:var(--gray-500);
                        "
                    >
                        نقش:
                    </span>

                    ${
                        role
                            ? `<span class="badge badge-primary">${role.label}</span>`
                            : '<span class="badge badge-gray">بدون نقش</span>'
                    }
                </div>

                <div>
                    <span
                        style="
                            font-size:var(--font-size-sm);
                            color:var(--gray-500);
                        "
                    >
                        Permission فعال:
                    </span>

                    <span class="badge badge-success">
                        ${effectivePermissions.length}
                    </span>
                </div>

            </div>

        </div>

        <div class="toolbar">

            <div class="search-box">

                <span class="search-icon">
                    🔍
                </span>

                <input
                    type="text"
                    placeholder="جستجوی Permission..."
                    value="${AppState.permSearch || ''}"
                    oninput="
                        AppState.permSearch = this.value;
                        navigateTo(
                            'user-permissions',
                            { userId: ${user.id} }
                        )
                    "
                >

            </div>

            <button
                class="btn btn-secondary btn-sm"
                onclick="selectAllPerms(${user.id})"
            >
                انتخاب همه
            </button>

            <button
                class="btn btn-secondary btn-sm"
                onclick="deselectAllPerms(${user.id})"
            >
                حذف همه
            </button>

        </div>

        ${
            Object.entries(PERMISSION_GROUPS)
                .map(([groupKey, group]) => {

                    let groupPerms =
                        PERMISSIONS.filter(
                            p =>
                                p.group ===
                                groupKey
                        );

                    if (AppState.permSearch) {
                        const q =
                            AppState.permSearch
                                .toLowerCase();

                        groupPerms =
                            groupPerms.filter(
                                p =>
                                    p.label
                                        .toLowerCase()
                                        .includes(q) ||
                                    p.id
                                        .toLowerCase()
                                        .includes(q)
                            );
                    }

                    if (!groupPerms.length) {
                        return '';
                    }

                    const enabledCount =
                        groupPerms.filter(
                            p =>
                                effectivePermissions.includes(
                                    p.id
                                )
                        ).length;

                    return `
                        <div class="perm-group open">

                            <div class="perm-group-header">

                                <span class="perm-group-icon">
                                    ${group.icon}
                                </span>

                                <span class="perm-group-title">
                                    ${group.label}
                                </span>

                                <span class="perm-group-count">
                                    ${enabledCount}/${groupPerms.length}
                                </span>

                                <span class="perm-group-toggle">
                                    ▼
                                </span>

                            </div>

                            <div class="perm-group-body">

                                ${groupPerms.map(p => `
                                    <div class="perm-item">

                                        <div class="perm-item-info">

                                            <label class="checkbox">

                                                <input
                                                    type="checkbox"
                                                    ${
                                                        effectivePermissions.includes(p.id)
                                                            ? 'checked'
                                                            : ''
                                                    }
                                                    onchange="
                                                        toggleUserPermission(
                                                            ${user.id},
                                                            '${p.id}',
                                                            this.checked
                                                        )
                                                    "
                                                >

                                                <span class="checkbox-mark"></span>

                                            </label>

                                            <div>

                                                <div class="perm-item-label">
                                                    ${p.label}
                                                </div>

                                                <div class="perm-item-id">
                                                    ${p.id}
                                                </div>

                                            </div>

                                        </div>

                                    </div>
                                `).join('')}

                            </div>

                        </div>
                    `;

                })
                .join('')
        }

        <div
            class="mt-6"
            style="
                display:flex;
                gap:var(--space-3);
            "
        >

            <button
                class="btn btn-primary"
                onclick="
                    showToast(
                        'Permissionهای کاربر ذخیره شد',
                        'success'
                    )
                "
            >
                💾 ذخیره تغییرات
            </button>

            <button
                class="btn btn-secondary"
                onclick="navigateTo('users')"
            >
                انصراف
            </button>

        </div>
    `;
}

function toggleUserPermission(userId, permId, checked) {
    const user =
        USERS.find(
            u => u.id === userId
        );

    if (!user) return;

    const idx =
        user.customPermissions.indexOf(
            permId
        );

    if (idx >= 0) {
        user.customPermissions.splice(
            idx,
            1
        );
    } else {
        user.customPermissions.push(
            permId
        );
    }
}

function changeUserRole(userId, roleId) {
    const user =
        USERS.find(
            u => u.id === userId
        );

    if (!user) return;

    const role =
        ROLES.find(
            r => r.id === roleId
        );

    user.role = roleId;

    user.level =
        role
            ? role.level
            : 1;

    showToast(
        `نقش کاربر به ${role.name} تغییر کرد`,
        'success'
    );

    navigateTo(
        'user-permissions',
        { userId }
    );
}

function selectAllPerms(userId) {
    const user =
        USERS.find(
            u => u.id === userId
        );

    if (!user) return;

    user.customPermissions =
        PERMISSIONS.map(
            p => p.id
        );

    navigateTo(
        'user-permissions',
        { userId }
    );

    showToast(
        'همه Permissionها انتخاب شد',
        'success'
    );
}

function deselectAllPerms(userId) {
    const user =
        USERS.find(
            u => u.id === userId
        );

    if (!user) return;

    user.customPermissions = [];

    navigateTo(
        'user-permissions',
        { userId }
    );

    showToast(
        'همه Permissionها حذف شد',
        'info'
    );
}


/* =========================================================
   EDIT USER
   ========================================================= */

function renderEditUser() {
    const user =
        USERS.find(
            u =>
                u.id ===
                AppState.selectedUserId
        );

    if (!user) {
        return `
            <div class="empty-state">
                <div class="icon">👤</div>
                <div class="title">
                    کاربر یافت نشد
                </div>
            </div>
        `;
    }

    return `
        <div class="page-header">

            <div class="breadcrumb">

                <a
                    href="#"
                    onclick="navigateTo('overview'); return false;"
                >
                    تنظیمات
                </a>

                <span class="separator">/</span>

                <a
                    href="#"
                    onclick="navigateTo('users'); return false;"
                >
                    کاربران
                </a>

                <span class="separator">/</span>

                <span class="current">
                    ویرایش
                </span>

            </div>

            <h1>
                ویرایش کاربر
            </h1>

            <p>
                ویرایش اطلاعات کاربر
            </p>

        </div>

        <div class="card">

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        نام
                    </label>

                    <input
                        type="text"
                        class="form-input"
                        id="editFirstName"
                        value="${user.firstName || ''}"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label">
                        نام خانوادگی
                    </label>

                    <input
                        type="text"
                        class="form-input"
                        id="editLastName"
                        value="${user.lastName || ''}"
                    >

                </div>

            </div>

            <div class="form-group">

                <label class="form-label">
                    نام کاربری
                </label>

                <input
                    type="text"
                    class="form-input"
                    id="editUsername"
                    value="${user.username || ''}"
                    dir="ltr"
                >

            </div>

            <div class="form-group">

                <label class="form-label">
                    رمز عبور جدید
                </label>

                <input
                    type="password"
                    class="form-input"
                    id="editPassword"
                    placeholder="در صورت عدم تغییر خالی بگذارید"
                >

            </div>

            <div class="form-group">

                <label class="form-label">
                    سمت سازمانی
                </label>

                <input
                    type="text"
                    class="form-input"
                    id="editOrganizationalPosition"
                    value="${user.organizationalPosition || ''}"
                >

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        سطح دسترسی
                    </label>

                    <select
                        class="form-select"
                        id="editAccessLevel"
                    >
                        <option
                            value="1"
                            ${user.level === 1 ? 'selected' : ''}
                        >
                            سطح ۱
                        </option>

                        <option
                            value="2"
                            ${user.level === 2 ? 'selected' : ''}
                        >
                            سطح ۲
                        </option>

                        <option
                            value="3"
                            ${user.level === 3 ? 'selected' : ''}
                        >
                            سطح ۳
                        </option>
                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        وضعیت
                    </label>

                    <label class="toggle">

                        <input
                            type="checkbox"
                            id="editIsActive"
                            ${user.status === 'active' ? 'checked' : ''}
                        >

                        <span class="toggle-track">
                            <span class="toggle-thumb"></span>
                        </span>

                    </label>

                </div>

            </div>

            <div
                style="
                    display:flex;
                    gap:var(--space-3);
                    margin-top:var(--space-6);
                "
            >

                <button
                    class="btn btn-primary"
                    onclick="saveUserEdit(${user.id})"
                >
                    💾 ذخیره تغییرات
                </button>

                <button
                    class="btn btn-secondary"
                    onclick="navigateTo('users')"
                >
                    انصراف
                </button>

                <button
                    class="btn btn-danger"
                    onclick="confirmDeleteUser(${user.id})"
                >
                    🗑️ حذف کاربر
                </button>

            </div>

        </div>
    `;
}

async function saveUserEdit(userId) {
    const user =
        USERS.find(
            u => u.id === userId
        );

    if (!user) return;

    const firstName =
        document
            .getElementById('editFirstName')
            .value
            .trim();

    const lastName =
        document
            .getElementById('editLastName')
            .value
            .trim();

    const username =
        document
            .getElementById('editUsername')
            .value
            .trim();

    const password =
        document
            .getElementById('editPassword')
            .value;

    const organizationalPosition =
        document
            .getElementById('editOrganizationalPosition')
            .value
            .trim();

    const accessLevel =
        Number(
            document
                .getElementById('editAccessLevel')
                .value
        );

    const isActive =
        document
            .getElementById('editIsActive')
            .checked;

    try {

        const response =
            await fetch(
                `${API_BASE}/api/admin/users/${userId}`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        first_name: firstName,
                        last_name: lastName,
                        username,
                        new_password: password,
                        organizational_position:
                            organizationalPosition || null,
                        access_level: accessLevel,
                        is_active: isActive
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            alert(
                data.detail ||
                data.message ||
                'ویرایش کاربر ناموفق بود'
            );

            return;
        }

        user.firstName = firstName;
        user.lastName = lastName;
        user.username = username;
        user.organizationalPosition =
            organizationalPosition;

        user.level =
            accessLevel;

        user.status =
            isActive
                ? 'active'
                : 'inactive';

        showToast(
            'اطلاعات کاربر ذخیره شد',
            'success'
        );

        navigateTo(
            'user-details',
            { userId }
        );

    } catch (error) {

        console.error(
            'UPDATE USER ERROR:',
            error
        );

        alert(
            'خطا در ارتباط با سرور'
        );
    }
}

function confirmDeleteUser(userId) {
    const user =
        USERS.find(
            u => u.id === userId
        );

    if (!user) return;

    showModal(
        'حذف کاربر',
        `
            <p style="color:var(--gray-600);">
                آیا از حذف کاربر
                <strong>
                    ${user.firstName}
                    ${user.lastName}
                </strong>
                اطمینان دارید؟
            </p>
        `,
        [
            {
                label: 'انصراف',
                class: 'btn-secondary',
                action: 'closeModalDirect()'
            },
            {
                label: 'حذف',
                class: 'btn-danger',
                action: `deleteUser(${userId})`
            }
        ]
    );
}

async function deleteUser(userId) {
    const user = USERS.find(u => Number(u.id) === Number(userId));
    if (!user) return;

    try {
        const response = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(userId)}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        const raw = await response.text();
        let data = {};
        try {
            data = raw ? JSON.parse(raw) : {};
        } catch (_) {
            throw new Error(`پاسخ نامعتبر از سرور (HTTP ${response.status})`);
        }

        if (!response.ok || data.success !== true) {
            const detail = typeof data.detail === 'string'
                ? data.detail
                : data.detail?.message;
            throw new Error(detail || data.message || 'حذف کاربر ناموفق بود');
        }

        closeModalDirect();
        showToast(data.message || 'کاربر با موفقیت حذف شد', 'success');
        navigateTo('users');
    } catch (error) {
        console.error('DELETE USER ERROR:', error);
        showToast(error.message || 'خطا در حذف کاربر از دیتابیس', 'error');
    }
}


/* =========================================================
   PAGE: ROLES
   ========================================================= */

function renderRoles() {
    return `
        <div class="page-header">

            <div class="breadcrumb">

                <a
                    href="#"
                    onclick="navigateTo('overview'); return false;"
                >
                    تنظیمات
                </a>

                <span class="separator">/</span>

                <span class="current">
                    مدیریت نقش‌ها
                </span>

            </div>

            <div
                style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                "
            >

                <div>

                    <h1>
                        مدیریت نقش‌ها
                    </h1>

                    <p>
                        تعریف و مدیریت نقش‌های سیستم و Permissionهای پیش‌فرض آن‌ها
                    </p>

                </div>

                <button
                    class="btn btn-primary"
                    onclick="showCreateRoleModal()"
                >
                    + نقش جدید
                </button>

            </div>

        </div>

        <div class="table-container mb-6">

            <table class="data-table">

                <thead>

                    <tr>
                        <th>نقش</th>
                        <th>سطح</th>
                        <th>توضیحات</th>
                        <th>تعداد کاربران</th>
                        <th>Permissionها</th>
                        <th>عملیات</th>
                    </tr>

                </thead>

                <tbody>

                    ${ROLES.map(role => `
                        <tr>

                            <td>

                                <div
                                    style="
                                        display:flex;
                                        align-items:center;
                                        gap:var(--space-3);
                                    "
                                >

                                    <div
                                        style="
                                            width:12px;
                                            height:12px;
                                            border-radius:var(--radius-full);
                                            background:${role.color};
                                        "
                                    ></div>

                                    <div>

                                        <div class="font-bold">
                                            ${role.name}
                                        </div>

                                        <div
                                            style="
                                                font-size:var(--font-size-xs);
                                                color:var(--gray-500);
                                            "
                                        >
                                            ${role.label}
                                        </div>

                                    </div>

                                </div>

                            </td>

                            <td>
                                ${levelBadge(role.level)}
                            </td>

                            <td
                                style="
                                    max-width:250px;
                                    font-size:var(--font-size-sm);
                                    color:var(--gray-600);
                                "
                            >
                                ${role.description}
                            </td>

                            <td>
                                <span class="badge badge-gray">
                                    ${role.userCount} کاربر
                                </span>
                            </td>

                            <td>
                                <span class="badge badge-primary">
                                    ${role.permissions.length} Permission
                                </span>
                            </td>

                            <td>

                                <div class="actions-cell">

                                    <button
                                        class="btn btn-ghost btn-icon sm"
                                        title="مشاهده Permissionها"
                                        onclick="
                                            navigateTo(
                                                'role-permissions',
                                                { roleId: '${role.id}' }
                                            )
                                        "
                                    >
                                        👁️
                                    </button>

                                    ${
                                        !role.isSystem
                                            ? `
                                                <button
                                                    class="btn btn-ghost btn-icon sm"
                                                    title="ویرایش"
                                                    onclick="
                                                        navigateTo(
                                                            'role-permissions',
                                                            { roleId: '${role.id}' }
                                                        )
                                                    "
                                                >
                                                    ✏️
                                                </button>
                                            `
                                            : ''
                                    }

                                </div>

                            </td>

                        </tr>
                    `).join('')}

                </tbody>

            </table>

        </div>

        <h2
            style="
                font-size:var(--font-size-lg);
                font-weight:700;
                margin-bottom:var(--space-4);
            "
        >
            نمای کارتی نقش‌ها
        </h2>

        <div class="roles-grid">

            ${ROLES.map(role => `
                <div class="role-card">

                    <div
                        class="role-color-bar"
                        style="background:${role.color};"
                    ></div>

                    <div class="role-name">
                        ${role.name}
                    </div>

                    <div class="role-label">
                        ${role.label}
                    </div>

                    <div class="role-meta">

                        <div>
                            ${levelBadge(role.level)}
                        </div>

                        <div class="role-perm-count">
                            🔑 ${role.permissions.length} Permission
                        </div>

                        <div>
                            👥 ${role.userCount} کاربر
                        </div>

                    </div>

                    <div class="role-actions">

                        <button
                            class="btn btn-secondary btn-sm flex-1"
                            onclick="
                                navigateTo(
                                    'role-permissions',
                                    { roleId: '${role.id}' }
                                )
                            "
                        >
                            🔑 Permissionها
                        </button>

                    </div>

                </div>
            `).join('')}

        </div>
    `;
}


/* =========================================================
   ROLE PERMISSIONS
   ========================================================= */

function renderRolePermissions() {
    const role =
        ROLES.find(
            r =>
                r.id ===
                AppState.selectedRoleId
        );

    if (!role) {
        return `
            <div class="empty-state">
                <div class="icon">🏷️</div>
                <div class="title">
                    نقش یافت نشد
                </div>
            </div>
        `;
    }

    return `
        <div class="page-header">

            <div class="breadcrumb">

                <a
                    href="#"
                    onclick="navigateTo('overview'); return false;"
                >
                    تنظیمات
                </a>

                <span class="separator">/</span>

                <a
                    href="#"
                    onclick="navigateTo('roles'); return false;"
                >
                    نقش‌ها
                </a>

                <span class="separator">/</span>

                <span class="current">
                    ${role.name}
                </span>

            </div>

            <div
                style="
                    display:flex;
                    align-items:center;
                    gap:var(--space-3);
                "
            >

                <div
                    style="
                        width:16px;
                        height:16px;
                        border-radius:var(--radius-full);
                        background:${role.color};
                    "
                ></div>

                <div>

                    <h1>
                        ویرایش Permission نقش ${role.name}
                    </h1>

                    <p>
                        ${role.label}
                        ·
                        ${role.description}
                    </p>

                </div>

            </div>

        </div>

        <div class="card mb-6">

            <div
                style="
                    display:flex;
                    align-items:center;
                    gap:var(--space-6);
                    flex-wrap:wrap;
                "
            >

                <div>

                    <span
                        style="
                            font-size:var(--font-size-sm);
                            color:var(--gray-500);
                        "
                    >
                        سطح:
                    </span>

                    ${levelBadge(role.level)}

                </div>

                <div>

                    <span
                        style="
                            font-size:var(--font-size-sm);
                            color:var(--gray-500);
                        "
                    >
                        تعداد کاربران:
                    </span>

                    <span class="badge badge-gray">
                        ${role.userCount} کاربر
                    </span>

                </div>

                <div>

                    <span
                        style="
                            font-size:var(--font-size-sm);
                            color:var(--gray-500);
                        "
                    >
                        Permissionها:
                    </span>

                    <span class="badge badge-primary">
                        ${role.permissions.length} فعال
                    </span>

                </div>

            </div>

        </div>

        <div class="toolbar">

            <button
                class="btn btn-secondary btn-sm"
                onclick="
                    selectAllRolePerms('${role.id}')
                "
            >
                انتخاب همه
            </button>

            <button
                class="btn btn-secondary btn-sm"
                onclick="
                    deselectAllRolePerms('${role.id}')
                "
            >
                حذف همه
            </button>

        </div>

        ${
            Object.entries(PERMISSION_GROUPS)
                .map(([groupKey, group]) => {

                    const groupPerms =
                        PERMISSIONS.filter(
                            p =>
                                p.group ===
                                groupKey
                        );

                    const enabledCount =
                        groupPerms.filter(
                            p =>
                                role.permissions.includes(
                                    p.id
                                )
                        ).length;

                    return `
                        <div class="perm-group open">

                            <div class="perm-group-header">

                                <span class="perm-group-icon">
                                    ${group.icon}
                                </span>

                                <span class="perm-group-title">
                                    ${group.label}
                                </span>

                                <span class="perm-group-count">
                                    ${enabledCount}/${groupPerms.length}
                                </span>

                                <span class="perm-group-toggle">
                                    ▼
                                </span>

                            </div>

                            <div class="perm-group-body">

                                ${groupPerms.map(p => `
                                    <div class="perm-item">

                                        <div class="perm-item-info">

                                            <label class="checkbox">

                                                <input
                                                    type="checkbox"
                                                    ${
                                                        role.permissions.includes(p.id)
                                                            ? 'checked'
                                                            : ''
                                                    }
                                                    onchange="
                                                        toggleRolePermission(
                                                            '${role.id}',
                                                            '${p.id}',
                                                            this.checked
                                                        )
                                                    "
                                                >

                                                <span class="checkbox-mark"></span>

                                            </label>

                                            <div>

                                                <div class="perm-item-label">
                                                    ${p.label}
                                                </div>

                                                <div class="perm-item-id">
                                                    ${p.id}
                                                </div>

                                            </div>

                                        </div>

                                    </div>
                                `).join('')}

                            </div>

                        </div>
                    `;

                })
                .join('')
        }

        <div
            class="mt-6"
            style="
                display:flex;
                gap:var(--space-3);
            "
        >

            <button
                class="btn btn-primary"
                onclick="
                    showToast(
                        'Permissionهای نقش ذخیره شد',
                        'success'
                    )
                "
            >
                💾 ذخیره تغییرات
            </button>

            <button
                class="btn btn-secondary"
                onclick="navigateTo('roles')"
            >
                انصراف
            </button>

        </div>
    `;
}

function toggleRolePermission(
    roleId,
    permId,
    checked
) {
    const role =
        ROLES.find(
            r => r.id === roleId
        );

    if (!role) return;

    if (checked) {

        if (
            !role.permissions.includes(
                permId
            )
        ) {
            role.permissions.push(
                permId
            );
        }

    } else {

        const idx =
            role.permissions.indexOf(
                permId
            );

        if (idx >= 0) {
            role.permissions.splice(
                idx,
                1
            );
        }
    }
}

function selectAllRolePerms(roleId) {
    const role =
        ROLES.find(
            r => r.id === roleId
        );

    if (!role) return;

    role.permissions =
        PERMISSIONS.map(
            p => p.id
        );

    navigateTo(
        'role-permissions',
        { roleId }
    );
}

function deselectAllRolePerms(roleId) {
    const role =
        ROLES.find(
            r => r.id === roleId
        );

    if (!role) return;

    role.permissions = [];

    navigateTo(
        'role-permissions',
        { roleId }
    );
}


/* =========================================================
   PAGE: NOTIFICATIONS
   ========================================================= */

async function loadPersistentNotifications() {
    const admin = isSettingsAdministrator();
    const endpoint = admin ? "/api/admin/notifications" : "/api/notifications";
    const response = await fetch(`${API_BASE}${endpoint}`, { credentials: "include", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail?.message || data.detail || "دریافت اعلان‌ها ناموفق بود");
    window.PERSISTENT_NOTIFICATIONS = data.notifications || [];
    const badge = document.getElementById("notificationBadge");
    if (badge) {
        const count = window.PERSISTENT_NOTIFICATIONS.length;
        badge.textContent = String(count);
        badge.hidden = count === 0;
    }
    return window.PERSISTENT_NOTIFICATIONS;
}
function renderNotifications() {
    const list = window.PERSISTENT_NOTIFICATIONS || [];
    return `
      <div class="page-header">
        <h1>اعلان‌ها</h1><p>اعلان‌های عمومی و اعلان‌های خصوصی مخصوص هر کاربر</p>
        ${isSettingsAdministrator() ? '<button class="btn btn-primary" onclick="showCreateNotificationModal()">+ اعلان جدید</button>' : ''}
      </div>
      <div class="card">
        <div class="table-container"><table class="data-table">
          <thead><tr><th>عنوان</th><th>پیام</th><th>نوع</th><th>گیرنده</th><th>تاریخ</th><th>عملیات</th></tr></thead>
          <tbody>${list.length ? list.map(n => `<tr>
            <td>${escapeHtml(n.title)}</td><td>${escapeHtml(n.message)}</td>
            <td>${n.visibility === "private" ? "خصوصی" : "عمومی"}</td>
            <td>${escapeHtml(n.recipient_username || (n.recipient_user_id ? ("کاربر #" + n.recipient_user_id) : "همه کاربران"))}</td>
            <td>${escapeHtml(n.created_at || "-")}</td>
            <td>${isSettingsAdministrator() && n.is_active ? `<button class="btn btn-danger btn-sm" onclick="deactivatePersistentNotification(${Number(n.id)})">غیرفعال‌سازی</button>` : "—"}</td>
          </tr>`).join("") : '<tr><td colspan="6">اعلانی ثبت نشده است.</td></tr>'}</tbody>
        </table></div>
      </div>`;
}
async function refreshNotificationsPage() {
    try { await loadPersistentNotifications(); }
    catch (e) { showToast(e.message || "خطا در دریافت اعلان‌ها", "error"); }
    if (AppState.currentPage === "notifications") renderPage("notifications");
}
function showCreateNotificationModal() {
    if (!isSettingsAdministrator()) return showPermissionDenied();
    const activeUsers = (Array.isArray(USERS) ? USERS : []).filter(u => u.status !== "inactive");
    showModal("اعلان جدید", `
      <div class="form-group"><label class="form-label">عنوان</label><input id="persistentNotificationTitle" class="form-input" maxlength="200" required></div>
      <div class="form-group"><label class="form-label">متن اعلان</label><textarea id="persistentNotificationMessage" class="form-textarea" maxlength="10000" required></textarea></div>
      <div class="form-group"><label class="form-label">نوع اعلان</label><select id="persistentNotificationVisibility" class="form-select" onchange="document.getElementById('persistentNotificationRecipientWrap').hidden=this.value!=='private'"><option value="public">عمومی برای همه کاربران</option><option value="private">خصوصی برای یک کاربر</option></select></div>
      <div class="form-group" id="persistentNotificationRecipientWrap" hidden><label class="form-label">کاربر مقصد</label><select id="persistentNotificationRecipient" class="form-select"><option value="">انتخاب کنید</option>${activeUsers.map(u => `<option value="${Number(u.id)}">${escapeHtml(u.firstName + " " + u.lastName + " @" + u.username)}</option>`).join("")}</select></div>
    `, [
      {label:"انصراف",class:"btn-secondary",action:"closeModalDirect()"},
      {label:"ذخیره اعلان",class:"btn-primary",action:"savePersistentNotification()"}
    ]);
}
async function savePersistentNotification() {
    const title = document.getElementById("persistentNotificationTitle")?.value.trim();
    const message = document.getElementById("persistentNotificationMessage")?.value.trim();
    const visibility = document.getElementById("persistentNotificationVisibility")?.value;
    const recipient = document.getElementById("persistentNotificationRecipient")?.value;
    if (!title || !message) return showToast("عنوان و متن اعلان الزامی است", "error");
    if (visibility === "private" && !recipient) return showToast("کاربر مقصد را انتخاب کنید", "error");
    try {
      const response = await fetch(`${API_BASE}/api/admin/notifications`, {
        method:"POST", credentials:"include", headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify({title,message,visibility,recipient_user_id:visibility==="private"?Number(recipient):null,is_active:true})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail?.message || data.detail || "ذخیره اعلان ناموفق بود");
      closeModalDirect(); showToast("اعلان در دیتابیس ذخیره شد", "success");
      await loadPersistentNotifications(); renderPage("notifications");
    } catch(e) { showToast(e.message || "ذخیره اعلان ناموفق بود", "error"); }
}
async function deactivatePersistentNotification(id) {
    if (!isSettingsAdministrator() || !confirm("این اعلان غیرفعال شود؟")) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin/notifications/${Number(id)}`, {method:"DELETE",credentials:"include"});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail?.message || data.detail || "عملیات ناموفق بود");
      await loadPersistentNotifications(); renderPage("notifications");
      showToast("اعلان غیرفعال شد", "success");
    } catch(e) { showToast(e.message || "خطا", "error"); }
}
window.loadPersistentNotifications = loadPersistentNotifications;
window.showCreateNotificationModal = showCreateNotificationModal;
window.savePersistentNotification = savePersistentNotification;
window.deactivatePersistentNotification = deactivatePersistentNotification;

/* =========================================================
   PAGE: AUDIT LOGS
   ========================================================= */

function renderAuditLogs() {
    let filtered =
        [...AUDIT_LOGS];

    if (
        AppState.auditFilter !==
        'all'
    ) {
        filtered =
            filtered.filter(
                l =>
                    l.result ===
                    AppState.auditFilter
            );
    }

    if (
        AppState.auditSearch
    ) {
        const q =
            AppState.auditSearch
                .toLowerCase();

        filtered =
            filtered.filter(
                l =>
                    l.userName.includes(q) ||
                    l.description.includes(q) ||
                    l.ip.includes(q)
            );
    }

    const totalPages =
        Math.ceil(
            filtered.length /
            AppState.logsPerPage
        );

    const start =
        (AppState.currentPageLogs - 1) *
        AppState.logsPerPage;

    const pageLogs =
        filtered.slice(
            start,
            start +
                AppState.logsPerPage
        );

    return `
        <div class="page-header">

            <div class="breadcrumb">

                <a
                    href="#"
                    onclick="navigateTo('overview'); return false;"
                >
                    تنظیمات
                </a>

                <span class="separator">/</span>

                <span class="current">
                    لاگ‌های سیستم
                </span>

            </div>

            <h1>
                لاگ‌های سیستم
            </h1>

            <p>
                مشاهده و جستجوی لاگ‌های مدیریتی سیستم
            </p>

        </div>

        <div class="toolbar">

            <div class="search-box">

                <span class="search-icon">
                    🔍
                </span>

                <input
                    type="text"
                    placeholder="جستجو در لاگ‌ها..."
                    value="${AppState.auditSearch}"
                    oninput="
                        AppState.auditSearch = this.value;
                        AppState.currentPageLogs = 1;
                        navigateTo('audit-logs')
                    "
                >

            </div>

            <button
                class="filter-btn ${AppState.auditFilter === 'all' ? 'active' : ''}"
                onclick="
                    AppState.auditFilter='all';
                    AppState.currentPageLogs=1;
                    navigateTo('audit-logs')
                "
            >
                همه
            </button>

            <button
                class="filter-btn ${AppState.auditFilter === 'success' ? 'active' : ''}"
                onclick="
                    AppState.auditFilter='success';
                    AppState.currentPageLogs=1;
                    navigateTo('audit-logs')
                "
            >
                ✓ موفق
            </button>

            <button
                class="filter-btn ${AppState.auditFilter === 'failure' ? 'active' : ''}"
                onclick="
                    AppState.auditFilter='failure';
                    AppState.currentPageLogs=1;
                    navigateTo('audit-logs')
                "
            >
                ✗ ناموفق
            </button>

            <button
                class="btn btn-secondary"
                onclick="
                    showToast(
                        'خروجی با موفقیت دانلود شد',
                        'success'
                    )
                "
            >
                📥 Export
            </button>

        </div>

        <div class="table-container">

            <table class="data-table">

                <thead>

                    <tr>
                        <th>کاربر</th>
                        <th>عملیات</th>
                        <th>توضیحات</th>
                        <th>زمان</th>
                        <th>آدرس IP</th>
                        <th>نتیجه</th>
                    </tr>

                </thead>

                <tbody>

                    ${pageLogs.map(log => {

                        const logType =
                            AUDIT_LOG_TYPES.find(
                                t =>
                                    t.id ===
                                    log.action
                            );

                        const user =
                            USERS.find(
                                u =>
                                    u.id ===
                                    log.userId
                            );

                        return `
                            <tr>

                                <td>

                                    <div class="user-cell">

                                        ${
                                            user
                                                ? renderAvatar(
                                                    user,
                                                    'sm'
                                                )
                                                : `
                                                    <div
                                                        class="avatar sm"
                                                        style="
                                                            background:var(--gray-400)
                                                        "
                                                    >
                                                        ؟
                                                    </div>
                                                `
                                        }

                                        <span class="user-name">
                                            ${log.userName}
                                        </span>

                                    </div>

                                </td>

                                <td>

                                    <span
                                        style="
                                            display:inline-flex;
                                            align-items:center;
                                            gap:var(--space-1);
                                            font-size:var(--font-size-xs);
                                        "
                                    >
                                        ${
                                            logType
                                                ? logType.icon
                                                : '📋'
                                        }

                                        ${
                                            logType
                                                ? logType.label
                                                : log.action
                                        }
                                    </span>

                                </td>

                                <td
                                    style="
                                        max-width:300px;
                                        font-size:var(--font-size-xs);
                                        color:var(--gray-600);
                                    "
                                >
                                    ${log.description}
                                </td>

                                <td>

                                    <span
                                        style="
                                            font-size:var(--font-size-xs);
                                            color:var(--gray-500);
                                            white-space:nowrap;
                                        "
                                    >
                                        ${log.timestamp}
                                    </span>

                                </td>

                                <td>

                                    <code
                                        class="font-mono"
                                        style="
                                            font-size:var(--font-size-xs);
                                        "
                                    >
                                        ${log.ip}
                                    </code>

                                </td>

                                <td>

                                    <span
                                        class="log-result ${log.result}"
                                    >
                                        ${
                                            log.result === 'success'
                                                ? '✓ موفق'
                                                : '✗ ناموفق'
                                        }
                                    </span>

                                </td>

                            </tr>
                        `;

                    }).join('')}

                </tbody>

            </table>

        </div>

        <div class="pagination">

            <div class="pagination-info">
                نمایش
                ${filtered.length ? start + 1 : 0}
                -
                ${Math.min(
                    start + AppState.logsPerPage,
                    filtered.length
                )}
                از
                ${filtered.length}
                لاگ
            </div>

            ${renderPagination(
                AppState.currentPageLogs,
                totalPages,
                'goToLogsPage'
            )}

        </div>
    `;
}

function goToLogsPage(page) {
    const totalPages =
        Math.ceil(
            AUDIT_LOGS.length /
            AppState.logsPerPage
        );

    if (
        page >= 1 &&
        page <= totalPages
    ) {
        AppState.currentPageLogs = page;
        navigateTo('audit-logs');
    }
}


/* =========================================================
   PAGE: ACTIVITIES
   ========================================================= */

function renderActivities() {
    let filtered =
        [...ACTIVITIES];

    if (
        AppState.activityFilter !==
        'all'
    ) {
        filtered =
            filtered.filter(
                a =>
                    a.category ===
                    AppState.activityFilter
            );
    }

    return `
        <div class="page-header">

            <div class="breadcrumb">

                <a
                    href="#"
                    onclick="navigateTo('overview'); return false;"
                >
                    تنظیمات
                </a>

                <span class="separator">/</span>

                <span class="current">
                    فعالیت کاربران
                </span>

            </div>

            <h1>
                فعالیت کاربران
            </h1>

            <p>
                مشاهده آخرین فعالیت‌های انجام‌شده توسط کاربران
            </p>

        </div>

        <div class="toolbar">

            <button
                class="filter-btn ${AppState.activityFilter === 'all' ? 'active' : ''}"
                onclick="
                    AppState.activityFilter='all';
                    navigateTo('activities')
                "
            >
                همه
            </button>

            <button
                class="filter-btn ${AppState.activityFilter === 'auth' ? 'active' : ''}"
                onclick="
                    AppState.activityFilter='auth';
                    navigateTo('activities')
                "
            >
                🔐 احراز هویت
            </button>

            <button
                class="filter-btn ${AppState.activityFilter === 'report' ? 'active' : ''}"
                onclick="
                    AppState.activityFilter='report';
                    navigateTo('activities')
                "
            >
                📋 گزارش
            </button>

            <button
                class="filter-btn ${AppState.activityFilter === 'notification' ? 'active' : ''}"
                onclick="
                    AppState.activityFilter='notification';
                    navigateTo('activities')
                "
            >
                🔔 اعلان
            </button>

            <button
                class="filter-btn ${AppState.activityFilter === 'permission' ? 'active' : ''}"
                onclick="
                    AppState.activityFilter='permission';
                    navigateTo('activities')
                "
            >
                🔑 دسترسی
            </button>

            <button
                class="filter-btn ${AppState.activityFilter === 'dashboard' ? 'active' : ''}"
                onclick="
                    AppState.activityFilter='dashboard';
                    navigateTo('activities')
                "
            >
                📊 داشبورد
            </button>

        </div>

        <div class="card">

            <div class="card-header">

                <div class="card-title">
                    آخرین فعالیت‌ها
                </div>

                <span class="badge badge-gray">
                    ${filtered.length} فعالیت
                </span>

            </div>

            <div class="activity-list">

                ${filtered.map(a => `
                    <div class="activity-item">

                        <div
                            class="activity-icon"
                            style="
                                background:${a.color}15;
                                color:${a.color}
                            "
                        >
                            ${a.icon}
                        </div>

                        <div class="activity-body">

                            <div class="activity-user">
                                ${a.userName}
                            </div>

                            <div class="activity-action">
                                ${a.action}
                            </div>

                            <div class="activity-time">
                                ${formatTimeAgo(a.timestamp)}
                            </div>

                        </div>

                    </div>
                `).join('')}

            </div>

        </div>
    `;
}


/* =========================================================
   PAGE: SECURITY
   ========================================================= */

function renderSecurity() {
    const activeSessions =
        SECURITY_EVENTS.filter(
            e =>
                e.type === 'session' &&
                e.status === 'active'
        );

    const failedLogins =
        SECURITY_EVENTS.filter(
            e =>
                e.type ===
                'login_failed'
        );

    return `
        <div class="page-header">

            <div class="breadcrumb">

                <a
                    href="#"
                    onclick="navigateTo('overview'); return false;"
                >
                    تنظیمات
                </a>

                <span class="separator">/</span>

                <span class="current">
                    امنیت
                </span>

            </div>

            <h1>
                امنیت
            </h1>

            <p>
                مدیریت امنیت سیستم، نشست‌ها و تنظیمات امنیتی
            </p>

        </div>

        <div class="security-card">

            <div
                class="security-icon"
                style="
                    background:var(--info-light);
                    color:var(--info);
                "
            >
                🔐
            </div>

            <div class="security-info">

                <div class="security-title">
                    تاریخچه ورودها
                </div>

                <div class="security-desc">
                    ${
                        SECURITY_EVENTS.filter(
                            e => e.type === 'login'
                        ).length
                    }
                    ورود ثبت شده
                </div>

            </div>

            <div class="security-action">

                <button
                    class="btn btn-secondary btn-sm"
                    onclick="showLoginHistory()"
                >
                    مشاهده
                </button>

            </div>

        </div>

        <div class="security-card">

            <div
                class="security-icon"
                style="
                    background:var(--danger-light);
                    color:var(--danger);
                "
            >
                ❌
            </div>

            <div class="security-info">

                <div class="security-title">
                    ورودهای ناموفق
                </div>

                <div class="security-desc">
                    ${failedLogins.length}
                    ورود ناموفق ثبت شده
                </div>

            </div>

            <div class="security-action">

                <button
                    class="btn btn-secondary btn-sm"
                    onclick="showFailedLogins()"
                >
                    مشاهده
                </button>

            </div>

        </div>

        <div class="security-card">

            <div
                class="security-icon"
                style="
                    background:var(--success-light);
                    color:var(--success);
                "
            >
                🖥️
            </div>

            <div class="security-info">

                <div class="security-title">
                    Sessionهای فعال
                </div>

                <div class="security-desc">
                    ${activeSessions.length}
                    نشست فعال در حال حاضر
                </div>

            </div>

            <div class="security-action">

                <button
                    class="btn btn-secondary btn-sm"
                    onclick="showActiveSessions()"
                >
                    مشاهده
                </button>

            </div>

        </div>

        <div class="security-card">

            <div
                class="security-icon"
                style="
                    background:var(--warning-light);
                    color:var(--warning);
                "
            >
                🚪
            </div>

            <div class="security-info">

                <div class="security-title">
                    خروج از Sessionها
                </div>

                <div class="security-desc">
                    غیرفعال کردن نشست‌های فعال سایر کاربران
                </div>

            </div>

            <div class="security-action">

                <button
                    class="btn btn-danger btn-sm"
                    onclick="
                        showToast(
                            'عملیات با موفقیت انجام شد',
                            'success'
                        )
                    "
                >
                    مدیریت
                </button>

            </div>

        </div>

        <div class="security-card">

            <div
                class="security-icon"
                style="
                    background:var(--purple-light);
                    color:var(--purple);
                "
            >
                🔑
            </div>

            <div class="security-info">

                <div class="security-title">
                    تغییر رمز عبور
                </div>

                <div class="security-desc">
                    تغییر رمز عبور حساب خود
                </div>

            </div>

            <div class="security-action">

                <button
                    class="btn btn-secondary btn-sm"
                    onclick="showChangePasswordModal()"
                >
                    تغییر
                </button>

            </div>

        </div>

            `;
}


/* =========================================================
   PAGE: MY ACCOUNT
   ========================================================= */

function renderMyAccount() {
    return `
        <div class="account-container">

            <h2>
                اطلاعات حساب کاربری
            </h2>

            <div class="account-grid">

                <label>
                    نام
                </label>

                <input
                    readonly
                    value="${CURRENT_USER.firstName || '-'}"
                >

                <label>
                    نام خانوادگی
                </label>

                <input
                    readonly
                    value="${CURRENT_USER.lastName || '-'}"
                >

                <label>
                    نام کاربری
                </label>

                <input
                    readonly
                    value="@${CURRENT_USER.username || '-'}"
                >

                <label>
                    سمت سازمانی
                </label>

                <input
                    readonly
                    value="${CURRENT_USER.organizationalPosition || '-'}"
                >

                <label>
                    سطح دسترسی
                </label>

                <input
                    readonly
                    value="${CURRENT_USER.level || '-'}"
                >

                <label>
                    وضعیت
                </label>

                <input
                    readonly
                    value="${CURRENT_USER.status || '-'}"
                >

                <label>
                    تاریخ عضویت
                </label>

                <input
                    readonly
                    value="${CURRENT_USER.createdAt || '-'}"
                >

            </div>

            <hr>

            <h2>
                تغییر رمز عبور
            </h2>

            <input
                type="password"
                id="oldPassword"
                placeholder="رمز فعلی"
            >

            <input
                type="password"
                id="newPassword"
                placeholder="رمز جدید"
            >

            <input
                type="password"
                id="confirmPassword"
                placeholder="تکرار رمز جدید"
            >

            <button
                onclick="changePassword()"
            >
                تغییر رمز عبور
            </button>

        </div>
    `;
}

async function changePassword() {

    const oldPassword =
        document.getElementById(
            'oldPassword'
        ).value;

    const newPassword =
        document.getElementById(
            'newPassword'
        ).value;

    const confirmPassword =
        document.getElementById(
            'confirmPassword'
        ).value;

    if (
        newPassword !==
        confirmPassword
    ) {
        alert(
            'رمز جدید با تکرار آن یکسان نیست'
        );

        return;
    }

    const res =
        await fetch(
            `${API_BASE}/api/auth/change-password`,
            {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    old_password:
                        oldPassword,
                    new_password:
                        newPassword
                })
            }
        );

    const data =
        await res.json();

    if (data.success) {

        alert(
            'رمز عبور تغییر کرد'
        );

    } else {

        alert(
            data.message
        );
    }
}


/* =========================================================
   PAGE: SYSTEM SETTINGS
   ========================================================= */

function renderSystemSettings() {
    if (!isSettingsAdministrator()) {
        setTimeout(() => showPermissionDenied(), 0);
        return '<div class="card">دسترسی محدود است</div>';
    }
    return `
      <div class="page-header">
        <h1>تنظیمات سیستم</h1>
        <p>تنظیمات عمومی پنل در دیتابیس ذخیره می‌شوند.</p>
      </div>
      <div class="card">
        <div class="form-row">
          <div class="form-group"><label class="form-label">نام سایت</label><input class="form-input" value="${escapeHtml(SYSTEM_SETTINGS.general.siteName || '')}"></div>
          <div class="form-group"><label class="form-label">آدرس سایت</label><input class="form-input" dir="ltr" value="${escapeHtml(SYSTEM_SETTINGS.general.siteUrl || '')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">ایمیل پشتیبانی</label><input class="form-input" type="email" dir="ltr" value="${escapeHtml(SYSTEM_SETTINGS.general.supportEmail || '')}"></div>
          <div class="form-group"><label class="form-label">منطقه زمانی</label><select class="form-select"><option>Asia/Tehran</option><option>UTC</option></select></div>
        </div>
        <div class="form-group"><label class="form-label">زبان</label><select class="form-select"><option>فارسی</option><option>English</option></select></div>
        <button class="btn btn-primary mt-4" onclick="savePersistentSystemSettings()">ذخیره تنظیمات</button>
      </div>
      <div class="card mt-4">
        <h2>تنظیمات امنیت حساب</h2>
        <div class="form-group"><label class="form-label">حداکثر تلاش ورود</label><input class="form-input" type="number" min="1" max="20" value="${escapeHtml(SYSTEM_SETTINGS.security.maxLoginAttempts || 5)}"></div>
        <div class="form-group"><label class="form-label">مدت قفل شدن (دقیقه)</label><input class="form-input" type="number" min="1" max="1440" value="${escapeHtml(SYSTEM_SETTINGS.security.lockoutDuration || 15)}"></div>
        <div class="form-group"><label class="form-label">حداقل طول رمز عبور</label><input class="form-input" type="number" min="8" max="128" value="${escapeHtml(SYSTEM_SETTINGS.security.passwordMinLength || 8)}"></div>
        <button class="btn btn-primary mt-4" onclick="savePersistentSystemSettings()">ذخیره تنظیمات امنیتی</button>
      </div>`;
}

function showEditNotificationModal(
    notifId
) {

    const n =
        NOTIFICATIONS.find(
            not =>
                not.id ===
                notifId
        );

    if (!n) return;

    showModal(
        `ویرایش اعلان: ${n.title}`,
        `
            <div class="form-group">

                <label class="form-label">
                    عنوان
                </label>

                <input
                    type="text"
                    class="form-input"
                    id="editNotifTitle"
                    value="${n.title}"
                >

            </div>

            <div class="form-group">

                <label class="form-label">
                    متن
                </label>

                <textarea
                    class="form-textarea"
                    id="editNotifMessage"
                >${n.message}</textarea>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        وضعیت
                    </label>

                    <select
                        class="form-select"
                        id="editNotifStatus"
                    >

                        <option
                            value="active"
                            ${n.status === 'active' ? 'selected' : ''}
                        >
                            فعال
                        </option>

                        <option
                            value="inactive"
                            ${n.status === 'inactive' ? 'selected' : ''}
                        >
                            غیرفعال
                        </option>

                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        اولویت
                    </label>

                    <select
                        class="form-select"
                        id="editNotifPriority"
                    >

                        <option
                            value="low"
                            ${n.priority === 'low' ? 'selected' : ''}
                        >
                            پایین
                        </option>

                        <option
                            value="medium"
                            ${n.priority === 'medium' ? 'selected' : ''}
                        >
                            متوسط
                        </option>

                        <option
                            value="high"
                            ${n.priority === 'high' ? 'selected' : ''}
                        >
                            بالا
                        </option>

                        <option
                            value="critical"
                            ${n.priority === 'critical' ? 'selected' : ''}
                        >
                            بحرانی
                        </option>

                    </select>

                </div>

            </div>
        `,
        [
            {
                label: 'انصراف',
                class: 'btn-secondary',
                action: 'closeModalDirect()'
            },
            {
                label: 'ذخیره',
                class: 'btn-primary',
                action:
                    `saveNotification(${notifId})`
            }
        ]
    );
}

function saveNotification(
    notifId
) {

    const n =
        NOTIFICATIONS.find(
            not =>
                not.id ===
                notifId
        );

    if (!n) return;

    n.title =
        document
            .getElementById(
                'editNotifTitle'
            )
            .value
            .trim();

    n.message =
        document
            .getElementById(
                'editNotifMessage'
            )
            .value
            .trim();

    n.status =
        document
            .getElementById(
                'editNotifStatus'
            )
            .value;

    n.priority =
        document
            .getElementById(
                'editNotifPriority'
            )
            .value;

    closeModalDirect();

    showToast(
        'اعلان ذخیره شد',
        'success'
    );

    navigateTo(
        'notifications'
    );
}

function confirmDeleteNotification(
    notifId
) {

    showModal(
        'حذف اعلان',
        `
            <p
                style="
                    color:var(--gray-600);
                "
            >
                آیا از حذف این اعلان اطمینان دارید؟
            </p>
        `,
        [
            {
                label: 'انصراف',
                class: 'btn-secondary',
                action: 'closeModalDirect()'
            },
            {
                label: 'حذف',
                class: 'btn-danger',
                action:
                    `deleteNotification(${notifId})`
            }
        ]
    );
}

function deleteNotification(
    notifId
) {

    const idx =
        NOTIFICATIONS.findIndex(
            n =>
                n.id ===
                notifId
        );

    if (idx >= 0) {
        NOTIFICATIONS.splice(
            idx,
            1
        );
    }

    closeModalDirect();

    showToast(
        'اعلان حذف شد',
        'success'
    );

    navigateTo(
        'notifications'
    );
}


/* =========================================================
   RESET PASSWORD
   ========================================================= */

function showResetPasswordModal(
    userId
) {

    const user =
        USERS.find(
            u =>
                u.id ===
                userId
        );

    if (!user) return;

    showModal(
        'بازنشانی رمز عبور',
        `
            <p
                style="
                    color:var(--gray-600);
                    margin-bottom:var(--space-4);
                "
            >
                رمز عبور کاربر
                <strong>
                    ${user.firstName}
                    ${user.lastName}
                </strong>
                بازنشانی خواهد شد.
            </p>

            <div class="form-group">

                <label class="form-label">
                    رمز عبور جدید
                </label>

                <input
                    type="password"
                    class="form-input"
                    id="resetPasswordValue"
                    placeholder="رمز عبور جدید"
                >

            </div>
        `,
        [
            {
                label: 'انصراف',
                class: 'btn-secondary',
                action: 'closeModalDirect()'
            },
            {
                label: 'بازنشانی',
                class: 'btn-danger',
                action:
                    `doResetPassword(${userId})`
            }
        ]
    );
}

function doResetPassword(
    userId
) {
    closeModalDirect();

    showToast(
        'رمز عبور با موفقیت بازنشانی شد',
        'success'
    );
}


/* =========================================================
   SECURITY MODALS
   ========================================================= */

function showLoginHistory() {

    const logins =
        SECURITY_EVENTS.filter(
            e =>
                e.type ===
                'login'
        );

    showModal(
        'تاریخچه ورودها',
        `
            <div class="table-container">

                <table class="data-table">

                    <thead>

                        <tr>
                            <th>کاربر</th>
                            <th>زمان</th>
                            <th>IP</th>
                            <th>دستگاه</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${logins.map(l => `
                            <tr>

                                <td>
                                    ${l.userName}
                                </td>

                                <td
                                    style="
                                        font-size:var(--font-size-xs);
                                    "
                                >
                                    ${l.timestamp}
                                </td>

                                <td>

                                    <code
                                        class="font-mono"
                                        style="
                                            font-size:var(--font-size-xs);
                                        "
                                    >
                                        ${l.ip}
                                    </code>

                                </td>

                                <td
                                    style="
                                        font-size:var(--font-size-xs);
                                    "
                                >
                                    ${l.device}
                                </td>

                            </tr>
                        `).join('')}

                    </tbody>

                </table>

            </div>
        `,
        [
            {
                label: 'بستن',
                class: 'btn-secondary',
                action: 'closeModalDirect()'
            }
        ]
    );
}

function showFailedLogins() {

    const failed =
        SECURITY_EVENTS.filter(
            e =>
                e.type ===
                'login_failed'
        );

    showModal(
        'ورودهای ناموفق',
        `
            <div class="table-container">

                <table class="data-table">

                    <thead>

                        <tr>
                            <th>کاربر</th>
                            <th>زمان</th>
                            <th>IP</th>
                            <th>دلیل</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${failed.map(l => `
                            <tr>

                                <td>
                                    ${l.userName}
                                </td>

                                <td
                                    style="
                                        font-size:var(--font-size-xs);
                                    "
                                >
                                    ${l.timestamp}
                                </td>

                                <td>

                                    <code
                                        class="font-mono"
                                        style="
                                            font-size:var(--font-size-xs);
                                        "
                                    >
                                        ${l.ip}
                                    </code>

                                </td>

                                <td
                                    style="
                                        font-size:var(--font-size-xs);
                                        color:var(--danger);
                                    "
                                >
                                    ${l.reason}
                                </td>

                            </tr>
                        `).join('')}

                    </tbody>

                </table>

            </div>
        `,
        [
            {
                label: 'بستن',
                class: 'btn-secondary',
                action: 'closeModalDirect()'
            }
        ]
    );
}

function showActiveSessions() {

    const sessions =
        SECURITY_EVENTS.filter(
            e =>
                e.type ===
                    'session' &&
                e.status ===
                    'active'
        );

    showModal(
        'Sessionهای فعال',
        `
            <div
                style="
                    display:flex;
                    flex-direction:column;
                    gap:var(--space-4);
                "
            >

                ${sessions.map(s => `
                    <div
                        style="
                            display:flex;
                            align-items:center;
                            justify-content:space-between;
                            padding:var(--space-3);
                            background:var(--gray-50);
                            border-radius:var(--radius-md);
                        "
                    >

                        <div>

                            <div
                                style="
                                    font-weight:600;
                                    font-size:var(--font-size-sm);
                                "
                            >
                                ${s.userName}
                            </div>

                            <div
                                style="
                                    font-size:var(--font-size-xs);
                                    color:var(--gray-500);
                                "
                            >
                                ${s.device}
                                ·
                                <code class="font-mono">
                                    ${s.ip}
                                </code>
                            </div>

                            <div
                                style="
                                    font-size:var(--font-size-xs);
                                    color:var(--gray-400);
                                "
                            >
                                ${s.timestamp}
                            </div>

                        </div>

                        <button
                            class="btn btn-danger btn-sm"
                            onclick="
                                showToast(
                                    'نشست پایان یافت',
                                    'success'
                                )
                            "
                        >
                            پایان نشست
                        </button>

                    </div>
                `).join('')}

            </div>
        `,
        [
            {
                label: 'بستن',
                class: 'btn-secondary',
                action: 'closeModalDirect()'
            }
        ]
    );
}

function showChangePasswordModal() {

    showModal(
        'تغییر رمز عبور',
        `
            <div class="form-group">

                <label class="form-label">
                    رمز عبور فعلی
                </label>

                <input
                    type="password"
                    class="form-input"
                    placeholder="رمز عبور فعلی"
                >

            </div>

            <div class="form-group">

                <label class="form-label">
                    رمز عبور جدید
                </label>

                <input
                    type="password"
                    class="form-input"
                    placeholder="رمز عبور جدید"
                >

            </div>

            <div class="form-group">

                <label class="form-label">
                    تأیید رمز عبور جدید
                </label>

                <input
                    type="password"
                    class="form-input"
                    placeholder="تأیید رمز عبور"
                >

            </div>
        `,
        [
            {
                label: 'انصراف',
                class: 'btn-secondary',
                action: 'closeModalDirect()'
            },
            {
                label: 'تغییر رمز',
                class: 'btn-primary',
                action:
                    "closeModalDirect(); showToast('رمز عبور تغییر کرد', 'success')"
            }
        ]
    );
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message,
    type = 'info'
) {

    const container =
        document.getElementById(
            'toastContainer'
        );

    if (!container) return;

    const toast =
        document.createElement(
            'div'
        );

    toast.className =
        `toast ${type}`;

    toast.innerHTML = `
        <span>
            ${
                type === 'success'
                    ? '✅'
                    : type === 'error'
                        ? '❌'
                        : type === 'warning'
                            ? '⚠️'
                            : 'ℹ️'
            }
        </span>

        <span>
            ${message}
        </span>
    `;

    container.appendChild(
        toast
    );

    setTimeout(() => {

        toast.style.animation =
            'slideOut 0.3s ease forwards';

        setTimeout(() => {
            toast.remove();
        }, 300);

    }, 3000);
}


/* =========================================================
   USER STATUS
   ========================================================= */

async function toggleUserStatus(userId) {
    const user = USERS.find(u => Number(u.id) === Number(userId));
    if (!user) return;

    const isActive = user.status !== 'active';

    try {
        const response = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(userId)}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                first_name: user.firstName || '',
                last_name: user.lastName || '',
                username: user.username || '',
                new_password: null,
                organizational_position: user.organizationalPosition || user.role || null,
                access_level: Number(user.level || user.access_level || 1),
                is_active: isActive ? 1 : 0
            })
        });

        const raw = await response.text();
        let data = {};
        try {
            data = raw ? JSON.parse(raw) : {};
        } catch (_) {
            throw new Error(`پاسخ نامعتبر از سرور (HTTP ${response.status})`);
        }

        if (!response.ok || data.success !== true) {
            const detail = typeof data.detail === 'string'
                ? data.detail
                : data.detail?.message;
            throw new Error(detail || data.message || 'تغییر وضعیت کاربر ناموفق بود');
        }

        // وضعیت را از دیتابیس دوباره می‌خوانیم تا UI فقط بعد از موفقیت API به‌روز شود.
        await loadUsers();
        showToast(
            `کاربر ${user.firstName} ${user.lastName} ${isActive ? 'فعال' : 'غیرفعال'} شد`,
            'success'
        );
    } catch (error) {
        console.error('TOGGLE USER STATUS ERROR:', error);
        showToast(error.message || 'خطا در تغییر وضعیت کاربر در دیتابیس', 'error');
    }
}



function systemSettingKey(element) {
    const row = element.closest(".form-group, .setting-row");
    const label = row?.querySelector(".form-label, .setting-row-title, label");
    return (label?.textContent || "").trim().replace(/\\s+/g, " ");
}
async function loadPersistentSystemSettings() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/system-settings`, {credentials:"include", cache:"no-store"});
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail?.message || data.detail || "دریافت تنظیمات ناموفق بود");
        const saved = data.settings || {};
        document.querySelectorAll("#settingsContent input, #settingsContent select, #settingsContent textarea").forEach(el => {
            const key = systemSettingKey(el);
            if (!key || !Object.prototype.hasOwnProperty.call(saved, key)) return;
            if (el.type === "checkbox") el.checked = !!saved[key];
            else el.value = String(saved[key] ?? "");
        });
    } catch (e) {
        showToast(e.message || "تنظیمات سیستم دریافت نشد", "error");
    }
}
async function savePersistentSystemSettings() {
    if (!isSettingsAdministrator()) return showPermissionDenied();
    const settings = {};
    document.querySelectorAll("#settingsContent input, #settingsContent select, #settingsContent textarea").forEach(el => {
        const key = systemSettingKey(el);
        if (!key || el.type === "password" || el.type === "file") return;
        settings[key] = el.type === "checkbox" ? el.checked : el.value;
    });
    try {
        const response = await fetch(`${API_BASE}/api/admin/system-settings`, {
            method:"PUT", credentials:"include",
            headers:{"Content-Type":"application/json","Accept":"application/json"},
            body:JSON.stringify({settings})
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail?.message || data.detail || "ذخیره تنظیمات ناموفق بود");
        showToast("تنظیمات در دیتابیس ذخیره شد", "success");
    } catch(e) {
        showToast(e.message || "ذخیره تنظیمات ناموفق بود", "error");
    }
}
window.loadPersistentSystemSettings = loadPersistentSystemSettings;
window.savePersistentSystemSettings = savePersistentSystemSettings;



async function loadPersistentAuditData(page) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/audit-logs?limit=300`, {credentials:"include",cache:"no-store"});
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail?.message || data.detail || "دریافت لاگ‌ها ناموفق بود");
        const rows = (data.logs || []).map(row => ({
            id: Number(row.id),
            userName: String(row.username || ("کاربر #" + row.user_id)),
            description: row.login_status === "success" ? "ورود موفق" : "ورود ناموفق" + (row.failure_reason ? " — " + row.failure_reason : ""),
            action: row.login_status === "success" ? "login" : "login_failed",
            result: row.login_status === "success" ? "success" : "failed",
            ip: String(row.ip_address || "-"),
            timestamp: String(row.created_at || ""),
            userAgent: String(row.user_agent || ""),
            category: "auth",
            type: row.login_status === "success" ? "login" : "login_failed",
            status: row.login_status === "success" ? "success" : "failed"
        }));
        if (Array.isArray(AUDIT_LOGS)) AUDIT_LOGS.splice(0, AUDIT_LOGS.length, ...rows);
        if (Array.isArray(ACTIVITIES)) ACTIVITIES.splice(0, ACTIVITIES.length, ...rows);
        if (Array.isArray(SECURITY_EVENTS)) SECURITY_EVENTS.splice(0, SECURITY_EVENTS.length, ...rows);
        if (AppState.currentPage === page) {
            window.__auditLoadedForPage = window.__auditLoadedForPage || {};
            window.__auditLoadedForPage[page] = true;
            renderPage(page);
            delete window.__auditLoadedForPage[page];
        }
    } catch (e) {
        console.error("loadPersistentAuditData:", e);
        if (page === "audit-logs" || page === "activities") showToast(e.message || "دریافت فعالیت‌ها ناموفق بود", "error");
    }
}
window.loadPersistentAuditData = loadPersistentAuditData;



document.addEventListener("DOMContentLoaded", () => {
    fetch(`${API_BASE}/api/notifications`, {credentials:"include",cache:"no-store"})
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return;
        const badge = document.getElementById("notificationBadge");
        if (badge) {
          const count = Array.isArray(data.notifications) ? data.notifications.length : 0;
          badge.textContent = String(count);
          badge.hidden = count === 0;
        }
      })
      .catch(() => {});
});
