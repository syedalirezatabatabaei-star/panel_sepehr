/* =========================================================
   APP JS
   ========================================================= */

/* =========================
   config
   ========================= */

const API_BASE = '';

/* =========================
   state
   ========================= */

let CURRENT_USER = null;

let USERS = [];
let ROLES = [];
let PERMISSIONS = [];
let PERMISSION_GROUPS = [];

let NOTIFICATIONS = [];
let ACTIVITIES = [];
let SECURITY_EVENTS = [];
let AUDIT_LOGS = [];
let SYSTEM_SETTINGS = {};

const AppState = {
    currentPage: 'overview',

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


/* =========================
   current user
   ========================= */

async function loadCurrentUser() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/me`);

        if (!response.ok) {
            throw new Error('خطا در گرفتن کاربر');
        }

        const data = await response.json();

        if (data.user) {
            CURRENT_USER = {
                id: data.user.id,
                username: data.user.username,
                firstName: data.user.first_name,
                lastName: data.user.last_name,
                email: data.user.email,
                phone: data.user.phone,
                role: data.user.role,
                level: data.user.level,
                organizationalPosition: data.user.organizational_position,
                isActive: data.user.is_active,
                avatar: data.user.avatar
            };

            updateUserUI();
        }

    } catch (error) {
        console.error('loadCurrentUser:', error);
    }
}


/* =========================
   users
   ========================= */

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/users`);

        if (!response.ok) {
            throw new Error('خطا در گرفتن کاربران');
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            USERS = data;
        } else if (Array.isArray(data.users)) {
            USERS = data.users;
        } else {
            USERS = [];
        }

        updateUserUI();

    } catch (error) {
        console.error('loadUsers:', error);
    }
}


function updateUserUI() {
    if (!CURRENT_USER) return;

    const name =
        `${CURRENT_USER.firstName || ''} ${CURRENT_USER.lastName || ''}`.trim();

    const userNameElements = document.querySelectorAll(
        '[data-current-user-name], .current-user-name'
    );

    userNameElements.forEach(el => {
        el.textContent = name || CURRENT_USER.username || 'کاربر';
    });

    const userRoleElements = document.querySelectorAll(
        '[data-current-user-role], .current-user-role'
    );

    userRoleElements.forEach(el => {
        el.textContent = CURRENT_USER.role || '';
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


function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');

    if (!dropdown) return;

    dropdown.classList.toggle('show');
}


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
