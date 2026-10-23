/* =========================================================
   APP JS
   ========================================================= */

/* =========================
   config
   ========================= */

const API_BASE = `${window.location.protocol}//${window.location.hostname}:8005`;
let CURRENT_USER = null;

/* =========================
   state
   ========================= */

const AppState = {
    currentPage: 'my-account',

    selectedUserId: null,
    selectedRoleId: null,

    userSearch: '',
    userFilter: 'all',

    currentPageUsers: 1,
    usersPerPage: 10,

    permSearch: '',

    currentLogsPage: 1,
    logsPerPage: 10,

    notificationSearch: '',
    notificationFilter: 'all'
};
async function loadCurrentUser() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'GET',
            credentials: 'include'
        });

        const text = await response.text();

       //console.log('ME STATUS:', response.status);
        //console.log('ME RESPONSE:', text);

        if (!response.ok) {
            throw new Error(`ME API ${response.status}: ${text}`);
        }

        const data = JSON.parse(text);

        if (data.user) {

    CURRENT_USER = {
        id: data.user.id,
        username: data.user.username,
        firstName: data.user.first_name,
        lastName: data.user.last_name,
        accessLevel: data.user.access_level,
        organizationalPosition: data.user.organizational_position,
        isActive: data.user.is_active,
        permissions: data.user.permissions
    };


    window.CURRENT_USER = CURRENT_USER;

    localStorage.setItem(
        "user",
        JSON.stringify(CURRENT_USER)
    );


    updateUserUI();


    if (typeof applyMenuPermissions === "function") {
        applyMenuPermissions();
    }


    if (typeof applyWritePermissions === "function") {
        applyWritePermissions();
    }
}

    } catch (error) {
        console.error('loadCurrentUser:', error);
    }
}


async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/users`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (_) {
            throw new Error(`پاسخ نامعتبر از API کاربران (HTTP ${response.status})`);
        }

        if (!response.ok || data.success === false) {
            throw new Error(data.detail || data.message || `خطا در دریافت کاربران (HTTP ${response.status})`);
        }

        const rows = Array.isArray(data) ? data : data.users;
        if (!Array.isArray(rows)) {
            throw new Error('ساختار پاسخ API کاربران معتبر نیست');
        }

        USERS = rows.map(user => ({
            ...user,
            id: Number(user.id),
            firstName: String(user.firstName ?? user.first_name ?? ''),
            lastName: String(user.lastName ?? user.last_name ?? ''),
            username: String(user.username ?? ''),
            organizationalPosition: String(user.organizationalPosition ?? user.organizational_position ?? user.role ?? '-'),
            role: String(user.role ?? user.organizationalPosition ?? user.organizational_position ?? '-'),
            status: user.status ?? ((user.is_active ?? user.isActive) ? 'active' : 'inactive'),
            level: Number(user.level ?? user.access_level ?? user.accessLevel ?? 1),
            createdAt: user.createdAt ?? user.created_at ?? ''
        }));

        if (typeof updateUserUI === 'function') updateUserUI();
        if (AppState.currentPage === 'users' && typeof renderPage === 'function') {
            renderPage('users');
        }
        return USERS;
    } catch (error) {
        console.error('loadUsers:', error);
        if (typeof showToast === 'function') {
            showToast(error.message || 'دریافت کاربران از دیتابیس ناموفق بود', 'error');
        }
        throw error;
    }
}

/*=============================

up user namaesh

=============================*/
function updateUserUI() {
    console.log('CURRENT_USER:', CURRENT_USER);

    if (!CURRENT_USER) return;

    const fullName =
        `${CURRENT_USER.firstName || ''} ${CURRENT_USER.lastName || ''}`.trim();

    const name =
        fullName || CURRENT_USER.username || 'کاربر';

    const role =
        CURRENT_USER.organizationalPosition ||
        CURRENT_USER.role ||
        '';

    document.querySelectorAll('.user-name').forEach(el => {
        el.textContent = name;
    });

    document.querySelectorAll('.user-role').forEach(el => {
        el.textContent = role;
    });

    document.querySelectorAll('.name').forEach(el => {
        el.textContent = name;
    });

    document.querySelectorAll('.role-badge').forEach(el => {
        el.textContent = role;
    });
}
/* =========================
   helper ها
   ========================= */

function formatTimeAgo(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return timestamp;
    }

    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) {
        return 'همین الان';
    }

    if (diff < 3600) {
        return `${Math.floor(diff / 60)} دقیقه پیش`;
    }

    if (diff < 86400) {
        return `${Math.floor(diff / 3600)} ساعت پیش`;
    }

    if (diff < 604800) {
        return `${Math.floor(diff / 86400)} روز پیش`;
    }

    return date.toLocaleDateString('fa-IR');
}


function getEffectivePermissionsDetail(userId) {
    const user = USERS.find(u => u.id === userId);

    if (!user) {
        return [];
    }

    const role = ROLES.find(r => r.id === user.role);

    const rolePermissions = role?.permissions || [];
    const customPermissions = user.customPermissions || [];

    const permissionIds = [
        ...new Set([
            ...rolePermissions,
            ...customPermissions
        ])
    ];

    return PERMISSIONS.filter(permission =>
        permissionIds.includes(permission.id)
    );
}


function generateNotifId() {
    return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}


/* =========================
   sidebar
   ========================= */

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');

    if (!sidebar) return;

    sidebar.classList.toggle('open');
}


function toggleUserDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('userDropdown');
    const trigger = document.querySelector('.header-user');
    if (!dropdown) return;
    const opening = !dropdown.classList.contains('show');
    dropdown.classList.toggle('show', opening);
    if (trigger) trigger.setAttribute('aria-expanded', String(opening));
}

function closeUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    const trigger = document.querySelector('.header-user');
    if (dropdown) dropdown.classList.remove('show');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

async function logoutFromDashboard(event) {
    if (event) event.stopPropagation();
    closeUserDropdown();
    const button = event && event.currentTarget;
    if (button) {
        button.disabled = true;
        button.textContent = 'در حال خروج…';
    }
    try {
        const headers = { Accept: 'application/json' };
        const token = sessionStorage.getItem('access_token');
        if (token) headers.Authorization = 'Bearer ' + token;
        const response = await fetch(`${API_BASE}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers,
            cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        console.error('logoutFromDashboard:', error);
    } finally {
        sessionStorage.removeItem('access_token');
        localStorage.removeItem('user');
        localStorage.removeItem('bale_account');
        window.location.replace('/login/index.html');
    }
}

document.addEventListener('click', event => {
    const profile = document.querySelector('.header-user');
    if (profile && !profile.contains(event.target)) closeUserDropdown();
    const actions = document.querySelector('.header-actions');
    if (actions && !actions.contains(event.target)) closeNotificationDropdown();
});

function toggleNotificationDropdown(event) {
    if (event) event.stopPropagation();
    const panel = document.getElementById('notificationDropdown');
    const trigger = document.getElementById('notificationTrigger');
    if (!panel) return;
    const opening = panel.hidden;
    panel.hidden = !opening;
    if (trigger) trigger.setAttribute('aria-expanded', String(opening));
    if (opening) refreshNotificationDropdown();
}

function closeNotificationDropdown() {
    const panel = document.getElementById('notificationDropdown');
    const trigger = document.getElementById('notificationTrigger');
    if (panel) panel.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

async function refreshNotificationDropdown(event) {
    if (event) event.stopPropagation();
    const list = document.getElementById('notificationDropdownList');
    if (!list) return;
    list.innerHTML = '<div class="notification-dropdown-empty">در حال دریافت اعلان‌ها…</div>';
    try {
        if (typeof loadPersistentNotifications !== 'function') {
            throw new Error('سرویس اعلان‌ها بارگذاری نشده است.');
        }
        const notifications = await loadPersistentNotifications(false);
        renderNotificationDropdownItems(notifications);
    } catch (error) {
        list.innerHTML = `<div class="notification-dropdown-empty notification-dropdown-error">${escapeHtml(error.message || 'دریافت اعلان‌ها ناموفق بود')}</div>`;
    }
}

function renderNotificationDropdownItems(notifications) {
    const list = document.getElementById('notificationDropdownList');
    if (!list) return;
    const active = (Array.isArray(notifications) ? notifications : []).filter(item =>
        item.is_active === undefined || item.is_active === true || Number(item.is_active) === 1
    );
    if (!active.length) {
        list.innerHTML = '<div class="notification-dropdown-empty">اعلانی برای نمایش وجود ندارد.</div>';
        return;
    }
    list.innerHTML = active.slice(0, 20).map(item => {
        const title = escapeHtml(item.title || 'اعلان');
        const message = escapeHtml(item.message || '');
        const created = escapeHtml(item.created_at || '');
        const type = item.visibility === 'private' ? 'خصوصی' : 'عمومی';
        return `<article class="notification-dropdown-item">
          <div class="notification-dropdown-item-top"><strong>${title}</strong><span>${type}</span></div>
          <p>${message}</p>
          ${created ? `<time>${created}</time>` : ''}
        </article>`;
    }).join('');
}

window.toggleNotificationDropdown = toggleNotificationDropdown;
window.refreshNotificationDropdown = refreshNotificationDropdown;
window.renderNotificationDropdownItems = renderNotificationDropdownItems;
window.toggleUserDropdown = toggleUserDropdown;
window.closeUserDropdown = closeUserDropdown;
window.logoutFromDashboard = logoutFromDashboard;


function toggleUserStatus(userId) {
    const user = USERS.find(u => u.id === userId);

    if (!user) return;

    user.status =
        user.status === 'active'
            ? 'inactive'
            : 'active';

    user.isActive = user.status === 'active';

    if (typeof showToast === 'function') {
        showToast(
            user.status === 'active'
                ? 'کاربر فعال شد'
                : 'کاربر غیرفعال شد',
            'success'
        );
    }

    if (AppState.currentPage === 'users') {
        if (typeof renderPage === 'function') {
            renderPage('users');
        }
    }
}


/* =========================
   init
   ========================= */

document.addEventListener('DOMContentLoaded', () => {

    loadCurrentUser();
    loadUsers();

});

