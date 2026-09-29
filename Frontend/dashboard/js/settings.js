/* =========================================================
   SETTINGS
   ========================================================= */

/* =========================================================
   SETTINGS NAV
   ========================================================= */

function toggleSettingsNav() {

    const nav = document.getElementById('settingsNav');
    const overlay = document.getElementById('settingsNavOverlay');

    if (!nav) {
        console.error('settingsNav not found');
        return;
    }

    const isOpen = nav.classList.contains('open');

    if (isOpen) {

        nav.classList.remove('open');

        if (overlay) {
            overlay.classList.remove('show');
        }

    } else {

        nav.classList.add('open');

        if (overlay) {
            overlay.classList.add('show');
        }

    }
}

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

document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('settingsNavOverlay');

    if (overlay) {
        overlay.addEventListener('click', closeSettingsNav);
    }
});


/* =========================================================
   SETTINGS NAVIGATION
   ========================================================= */

function navigateTo(page, data) {
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
        'system-settings': 'تنظیمات سیستم'
    };

    const headerTitle = document.getElementById('headerTitle');

    if (headerTitle) {
        headerTitle.textContent = titles[page] || 'تنظیمات';
    }

    renderPage(page);
}

function renderPage(page) {
    const content = document.getElementById('settingsContent');

    if (!content) return;

    const renderers = {
        'overview': renderOverview,
        'users': renderUsers,
        'registration-requests': renderRegistrationRequests,
        'user-details': renderUserDetails,
        'user-permissions': renderUserPermissions,
        'edit-user': renderEditUser,
        'roles': renderRoles,
        'role-permissions': renderRolePermissions,
        'notifications': renderNotifications,
        'audit-logs': renderAuditLogs,
        'activities': renderActivities,
        'security': renderSecurity,
        'my-account': renderMyAccount,
        'system-settings': renderSystemSettings
    };

    const renderer = renderers[page];

    if (renderer) {
        content.innerHTML = renderer();

        initPageInteractions();

        if (page === 'registration-requests') {
            loadRegistrationRequests();
        }
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
    const initials =
        user.firstName.charAt(0) +
        ' ' +
        user.lastName.charAt(0);

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

function renderRegistrationRequests() {
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
                    درخواست کاربران جدید
                </span>
            </div>

            <h1>
                درخواست کاربران جدید
            </h1>

            <p>
                مدیریت درخواست‌های ثبت‌نام کاربران
            </p>
        </div>

        <div class="stats-grid" id="registrationStats">

            <div class="stat-card">
                <div
                    class="stat-icon"
                    style="background: var(--warning-light); color: var(--warning)"
                >
                    ⏳
                </div>

                <div
                    class="stat-value"
                    id="pendingRegistrationCount"
                >
                    0
                </div>

                <div class="stat-label">
                    در انتظار بررسی
                </div>
            </div>

            <div class="stat-card">
                <div
                    class="stat-icon"
                    style="background: var(--success-light); color: var(--success)"
                >
                    ✓
                </div>

                <div
                    class="stat-value"
                    id="approvedRegistrationCount"
                >
                    0
                </div>

                <div class="stat-label">
                    تأیید شده
                </div>
            </div>

            <div class="stat-card">
                <div
                    class="stat-icon"
                    style="background: var(--danger-light); color: var(--danger)"
                >
                    ✕
                </div>

                <div
                    class="stat-value"
                    id="rejectedRegistrationCount"
                >
                    0
                </div>

                <div class="stat-label">
                    رد شده
                </div>
            </div>

        </div>

        <div class="card">

            <div class="card-header">
                <div class="card-title">
                    درخواست‌ها
                </div>
            </div>

            <div
                class="table-container"
                id="registrationRequestsTable"
            >
                <div class="empty-state">
                    <div class="icon">⏳</div>
                    <div class="title">
                        در حال دریافت درخواست‌ها...
                    </div>
                </div>
            </div>

        </div>
    `;
}

async function loadRegistrationRequests() {
    const container =
        document.getElementById('registrationRequestsTable');

    if (!container) return;

    try {
        const response = await fetch(
            `${API_BASE}/api/admin/registration-requests`,
            {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.detail ||
                data.message ||
                'خطا در دریافت درخواست‌ها'
            );
        }

        const requests =
            data.requests ||
            data.results ||
            [];

        updateRegistrationStats(requests);

        if (!requests.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📭</div>
                    <div class="title">
                        درخواستی وجود ندارد
                    </div>
                </div>
            `;

            return;
        }

        container.innerHTML = `
            <table class="data-table">

                <thead>
                    <tr>
                        <th>نام</th>
                        <th>نام کاربری</th>
                        <th>سطح دسترسی</th>
                        <th>تاریخ درخواست</th>
                        <th>وضعیت</th>
                        <th>عملیات</th>
                    </tr>
                </thead>

                <tbody>

                    ${requests.map(request => `
                        <tr>

                            <td>
                                <div class="user-cell">
                                    <span class="user-name">
                                        ${
                                            escapeHtml(
                                                request.first_name ||
                                                request.firstName ||
                                                '-'
                                            )
                                        }
                                        ${
                                            escapeHtml(
                                                request.last_name ||
                                                request.lastName ||
                                                ''
                                            )
                                        }
                                    </span>
                                </div>
                            </td>

                            <td>
                                @${escapeHtml(
                                    request.username || '-'
                                )}
                            </td>

                            <td>
                                ${levelBadge(
                                    request.access_level ||
                                    request.level ||
                                    1
                                )}
                            </td>

                            <td>
                                ${
                                    escapeHtml(
                                        request.created_at ||
                                        request.createdAt ||
                                        '-'
                                    )
                                }
                            </td>

                            <td>
                                ${
                                    request.status === 'approved'
                                        ? '<span class="badge badge-success">تأیید شده</span>'
                                        : request.status === 'rejected'
                                            ? '<span class="badge badge-danger">رد شده</span>'
                                            : '<span class="badge badge-warning">در انتظار</span>'
                                }
                            </td>

                            <td>

                                <div class="actions-cell">

                                    <button
                                        class="btn btn-ghost btn-icon sm"
                                        title="مشاهده"
                                        onclick="viewRegistrationRequest(${request.id})"
                                    >
                                        👁️
                                    </button>

                                    ${
                                        request.status === 'pending'
                                            ? `
                                                <button
                                                    class="btn btn-ghost btn-icon sm"
                                                    title="تأیید"
                                                    onclick="approveRegistrationRequest(${request.id})"
                                                >
                                                    ✓
                                                </button>

                                                <button
                                                    class="btn btn-ghost btn-icon sm"
                                                    title="رد"
                                                    onclick="rejectRegistrationRequest(${request.id})"
                                                >
                                                    ✕
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
        `;

    } catch (error) {
        console.error(
            'LOAD REGISTRATION REQUESTS ERROR:',
            error
        );

        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <div class="title">
                    خطا در دریافت درخواست‌ها
                </div>
                <div class="description">
                    ${escapeHtml(error.message)}
                </div>
            </div>
        `;
    }
}

function updateRegistrationStats(requests) {
    const pending =
        requests.filter(
            r => r.status === 'pending'
        ).length;

    const approved =
        requests.filter(
            r => r.status === 'approved'
        ).length;

    const rejected =
        requests.filter(
            r => r.status === 'rejected'
        ).length;

    const pendingEl =
        document.getElementById(
            'pendingRegistrationCount'
        );

    const approvedEl =
        document.getElementById(
            'approvedRegistrationCount'
        );

    const rejectedEl =
        document.getElementById(
            'rejectedRegistrationCount'
        );

    if (pendingEl) pendingEl.textContent = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (rejectedEl) rejectedEl.textContent = rejected;
}

async function viewRegistrationRequest(requestId) {
    try {
        const response = await fetch(
            `${API_BASE}/api/admin/registration-requests/${requestId}`,
            {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.detail ||
                data.message ||
                'خطا در دریافت درخواست'
            );
        }

        const request =
            data.request ||
            data;

        showModal(
            'جزئیات درخواست ثبت‌نام',
            `
                <div
                    style="
                        display:flex;
                        flex-direction:column;
                        gap:var(--space-4);
                    "
                >

                    <div>
                        <div class="form-label">
                            نام و نام خانوادگی
                        </div>

                        <div>
                            ${
                                escapeHtml(
                                    request.first_name ||
                                    request.firstName ||
                                    '-'
                                )
                            }
                            ${
                                escapeHtml(
                                    request.last_name ||
                                    request.lastName ||
                                    ''
                                )
                            }
                        </div>
                    </div>

                    <div>
                        <div class="form-label">
                            نام کاربری
                        </div>

                        <div dir="ltr">
                            @${escapeHtml(
                                request.username || '-'
                            )}
                        </div>
                    </div>

                    <div>
                        <div class="form-label">
                            سطح دسترسی
                        </div>

                        <div>
                            ${levelBadge(
                                request.access_level ||
                                request.level ||
                                1
                            )}
                        </div>
                    </div>

                    <div>
                        <div class="form-label">
                            سمت سازمانی
                        </div>

                        <div>
                            ${
                                escapeHtml(
                                    request.organizational_position ||
                                    request.organizationalPosition ||
                                    '-'
                                )
                            }
                        </div>
                    </div>

                    <div>
                        <div class="form-label">
                            وضعیت
                        </div>

                        <div>
                            ${
                                request.status === 'approved'
                                    ? '<span class="badge badge-success">تأیید شده</span>'
                                    : request.status === 'rejected'
                                        ? '<span class="badge badge-danger">رد شده</span>'
                                        : '<span class="badge badge-warning">در انتظار</span>'
                            }
                        </div>
                    </div>

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

    } catch (error) {
        console.error(
            'VIEW REGISTRATION REQUEST ERROR:',
            error
        );

        showToast(
            error.message ||
            'خطا در دریافت درخواست',
            'error'
        );
    }
}

function approveRegistrationRequest(requestId) {
    showModal(
        'تأیید درخواست',
        `
            <p style="color:var(--gray-600);">
                آیا از تأیید این درخواست اطمینان دارید؟
            </p>

            <div class="form-group">
                <label class="form-label">
                    سطح دسترسی
                </label>

                <select
                    class="form-select"
                    id="approveAccessLevel"
                >
                    <option value="1">
                        سطح ۱
                    </option>

                    <option value="2">
                        سطح ۲
                    </option>

                    <option value="3">
                        سطح ۳
                    </option>
                </select>
            </div>
        `,
        [
            {
                label: 'انصراف',
                class: 'btn-secondary',
                action: 'closeApproveRegistrationModal()'
            },
            {
                label: 'تأیید',
                class: 'btn-primary',
                action: `submitApproveRegistration(${requestId})`
            }
        ]
    );
}

function closeApproveRegistrationModal() {
    closeModalDirect();
}

async function submitApproveRegistration(requestId) {
    const levelEl =
        document.getElementById(
            'approveAccessLevel'
        );

    const accessLevel =
        levelEl
            ? Number(levelEl.value)
            : 1;

    try {
        const response = await fetch(
            `${API_BASE}/api/admin/registration-requests/${requestId}/approve`,
            {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    access_level: accessLevel
                })
            }
        );

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.detail ||
                data.message ||
                'تأیید درخواست ناموفق بود'
            );
        }

        closeModalDirect();

        showToast(
            'درخواست با موفقیت تأیید شد',
            'success'
        );

        await loadRegistrationRequests();

        await loadUsers();

    } catch (error) {
        console.error(
            'APPROVE REGISTRATION ERROR:',
            error
        );

        showToast(
            error.message ||
            'خطا در تأیید درخواست',
            'error'
        );
    }
}

function rejectRegistrationRequest(requestId) {
    showModal(
        'رد درخواست',
        `
            <p style="color:var(--gray-600);">
                آیا از رد این درخواست اطمینان دارید؟
            </p>

            <div class="form-group">
                <label class="form-label">
                    دلیل رد
                </label>

                <textarea
                    class="form-textarea"
                    id="rejectReason"
                    placeholder="دلیل رد درخواست..."
                ></textarea>
            </div>
        `,
        [
            {
                label: 'انصراف',
                class: 'btn-secondary',
                action: 'closeRejectRegistrationModal()'
            },
            {
                label: 'رد درخواست',
                class: 'btn-danger',
                action: `submitRejectRegistration(${requestId})`
            }
        ]
    );
}

function closeRejectRegistrationModal() {
    closeModalDirect();
}

async function submitRejectRegistration(requestId) {
    const reasonEl =
        document.getElementById(
            'rejectReason'
        );

    const reason =
        reasonEl
            ? reasonEl.value.trim()
            : '';

    try {
        const response = await fetch(
            `${API_BASE}/api/admin/registration-requests/${requestId}/reject`,
            {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    reason
                })
            }
        );

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.detail ||
                data.message ||
                'رد درخواست ناموفق بود'
            );
        }

        closeModalDirect();

        showToast(
            'درخواست رد شد',
            'success'
        );

        await loadRegistrationRequests();

    } catch (error) {
        console.error(
            'REJECT REGISTRATION ERROR:',
            error
        );

        showToast(
            error.message ||
            'خطا در رد درخواست',
            'error'
        );
    }
}


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
                user.firstName.toLowerCase().includes(q) ||
                user.lastName.toLowerCase().includes(q) ||
                user.username.toLowerCase().includes(q)
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

function deleteUser(userId) {
    const idx =
        USERS.findIndex(
            u => u.id === userId
        );

    if (idx >= 0) {
        USERS.splice(idx, 1);
    }

    closeModalDirect();

    showToast(
        'کاربر حذف شد',
        'success'
    );

    navigateTo('users');
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

function renderNotifications() {
    let filtered =
        [...NOTIFICATIONS];

    if (
        AppState.notificationFilter !==
        'all'
    ) {
        filtered =
            filtered.filter(
                n =>
                    n.status ===
                    AppState.notificationFilter
            );
    }

    if (
        AppState.notificationSearch
    ) {
        const q =
            AppState.notificationSearch
                .toLowerCase();

        filtered =
            filtered.filter(
                n =>
                    n.title.includes(q) ||
                    n.message.includes(q)
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
                    اعلان‌ها
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
                        مدیریت اعلان‌ها
                    </h1>

                    <p>
                        ایجاد، ویرایش و مدیریت اعلان‌های سیستم
                    </p>

                </div>

                <button
                    class="btn btn-primary"
                    onclick="showCreateNotificationModal()"
                >
                    + اعلان جدید
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
                    placeholder="جستجوی اعلان..."
                    value="${AppState.notificationSearch}"
                    oninput="
                        AppState.notificationSearch = this.value;
                        navigateTo('notifications')
                    "
                >

            </div>

            <button
                class="filter-btn ${AppState.notificationFilter === 'all' ? 'active' : ''}"
                onclick="
                    AppState.notificationFilter='all';
                    navigateTo('notifications')
                "
            >
                همه
            </button>

            <button
                class="filter-btn ${AppState.notificationFilter === 'active' ? 'active' : ''}"
                onclick="
                    AppState.notificationFilter='active';
                    navigateTo('notifications')
                "
            >
                فعال
            </button>

            <button
                class="filter-btn ${AppState.notificationFilter === 'inactive' ? 'active' : ''}"
                onclick="
                    AppState.notificationFilter='inactive';
                    navigateTo('notifications')
                "
            >
                غیرفعال
            </button>

        </div>

        <div class="table-container">

            <table class="data-table">

                <thead>

                    <tr>
                        <th>عنوان</th>
                        <th>نوع</th>
                        <th>اولویت</th>
                        <th>گیرنده</th>
                        <th>تاریخ انتشار</th>
                        <th>وضعیت</th>
                        <th>عملیات</th>
                    </tr>

                </thead>

                <tbody>

                    ${filtered.map(n => {

                        const typeInfo =
                            NOTIFICATION_TYPES.find(
                                t =>
                                    t.id ===
                                    n.type
                            );

                        const targetInfo =
                            NOTIFICATION_TARGETS.find(
                                t =>
                                    t.id ===
                                    n.target
                            );

                        return `
                            <tr>

                                <td>

                                    <div>

                                        <div
                                            class="font-bold"
                                            style="color:var(--gray-900);"
                                        >
                                            ${n.title}
                                        </div>

                                        <div
                                            style="
                                                font-size:var(--font-size-xs);
                                                color:var(--gray-500);
                                                max-width:200px;
                                                overflow:hidden;
                                                text-overflow:ellipsis;
                                                white-space:nowrap;
                                            "
                                        >
                                            ${n.message}
                                        </div>

                                    </div>

                                </td>

                                <td>

                                    <span
                                        class="badge"
                                        style="
                                            background:${
                                                typeInfo
                                                    ? typeInfo.color + '20'
                                                    : 'var(--gray-100)'
                                            };
                                            color:${
                                                typeInfo
                                                    ? typeInfo.color
                                                    : 'var(--gray-600)'
                                            };
                                        "
                                    >
                                        ${
                                            typeInfo
                                                ? typeInfo.label
                                                : n.type
                                        }
                                    </span>

                                </td>

                                <td>

                                    ${
                                        n.priority === 'critical'
                                            ? '<span class="badge badge-danger">بحرانی</span>'
                                            : n.priority === 'high'
                                                ? '<span class="badge badge-warning">بالا</span>'
                                                : n.priority === 'medium'
                                                    ? '<span class="badge badge-info">متوسط</span>'
                                                    : '<span class="badge badge-gray">پایین</span>'
                                    }

                                </td>

                                <td>
                                    <span
                                        style="
                                            font-size:var(--font-size-xs);
                                        "
                                    >
                                        ${
                                            targetInfo
                                                ? targetInfo.label
                                                : n.target
                                        }
                                    </span>
                                </td>

                                <td>

                                    <span
                                        style="
                                            font-size:var(--font-size-xs);
                                            color:var(--gray-500);
                                        "
                                    >
                                        ${n.publishDate}
                                    </span>

                                </td>

                                <td>

                                    ${
                                        n.status === 'active'
                                            ? '<span class="badge badge-success">فعال</span>'
                                            : '<span class="badge badge-gray">غیرفعال</span>'
                                    }

                                </td>

                                <td>

                                    <div class="actions-cell">

                                        <button
                                            class="btn btn-ghost btn-icon sm"
                                            title="مشاهده"
                                            onclick="showNotificationDetail(${n.id})"
                                        >
                                            👁️
                                        </button>

                                        <button
                                            class="btn btn-ghost btn-icon sm"
                                            title="ویرایش"
                                            onclick="showEditNotificationModal(${n.id})"
                                        >
                                            ✏️
                                        </button>

                                        <button
                                            class="btn btn-ghost btn-icon sm"
                                            title="حذف"
                                            onclick="confirmDeleteNotification(${n.id})"
                                        >
                                            🗑️
                                        </button>

                                    </div>

                                </td>

                            </tr>
                        `;

                    }).join('')}

                </tbody>

            </table>

        </div>

        <div class="pagination">

            <div class="pagination-info">
                نمایش ${filtered.length} اعلان
            </div>

        </div>
    `;
}


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

        <div class="security-card">

            <div
                class="security-icon"
                style="
                    background:var(--gray-100);
                    color:var(--gray-600);
                "
            >
                🔐
            </div>

            <div class="security-info">

                <div class="security-title">
                    احراز هویت دو مرحله‌ای (MFA)
                </div>

                <div class="security-desc">
                    تنظیم و مدیریت احراز هویت دو مرحله‌ای
                </div>

            </div>

            <div class="security-action">

                <span class="badge badge-warning">
                    به‌زودی
                </span>

            </div>

        </div>

        <div class="security-card">

            <div
                class="security-icon"
                style="
                    background:var(--gray-100);
                    color:var(--gray-600);
                "
            >
                ⏱️
            </div>

            <div class="security-info">

                <div class="security-title">
                    محدودیت Session و Timeout
                </div>

                <div class="security-desc">
                    تنظیم مدت زمان نشست و محدودیت تعداد
                </div>

            </div>

            <div class="security-action">

                <span class="badge badge-warning">
                    به‌زودی
                </span>

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
    const s =
        SYSTEM_SETTINGS;

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
                    تنظیمات سیستم
                </span>

            </div>

            <h1>
                تنظیمات سیستم
            </h1>

            <p>
                مدیریت تنظیمات کلی سیستم و پیکربندی
            </p>

        </div>

        <div class="card mb-6">

            <div class="card-header">

                <div class="card-title">
                    تنظیمات عمومی
                </div>

                <span
                    class="icon"
                    style="font-size:var(--font-size-xl);"
                >
                    ⚙️
                </span>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        نام سایت
                    </label>

                    <input
                        type="text"
                        class="form-input"
                        value="${s.general.siteName}"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label">
                        آدرس سایت
                    </label>

                    <input
                        type="text"
                        class="form-input"
                        value="${s.general.siteUrl}"
                        dir="ltr"
                        style="text-align:left;"
                    >

                </div>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        ایمیل پشتیبانی
                    </label>

                    <input
                        type="email"
                        class="form-input"
                        value="${s.general.supportEmail}"
                        dir="ltr"
                        style="text-align:left;"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label">
                        منطقه زمانی
                    </label>

                    <select class="form-select">

                        <option selected>
                            Asia/Tehran
                        </option>

                        <option>
                            UTC
                        </option>

                    </select>

                </div>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        زبان
                    </label>

                    <select class="form-select">

                        <option selected>
                            فارسی
                        </option>

                        <option>
                            English
                        </option>

                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        فرمت تاریخ
                    </label>

                    <select class="form-select">

                        <option selected>
                            شمسی (جلالی)
                        </option>

                        <option>
                            میلادی
                        </option>

                    </select>

                </div>

            </div>

            <button
                class="btn btn-primary mt-4"
                onclick="
                    showToast(
                        'تنظیمات ذخیره شد',
                        'success'
                    )
                "
            >
                💾 ذخیره
            </button>

        </div>

        <div class="card mb-6">

            <div class="card-header">

                <div class="card-title">
                    تنظیمات امنیتی
                </div>

                <span
                    class="icon"
                    style="font-size:var(--font-size-xl);"
                >
                    🔒
                </span>

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        مدت زمان Session (دقیقه)
                    </div>

                    <div class="setting-row-desc">
                        زمان بی‌فعالیت تا خودکار خروج
                    </div>

                </div>

                <input
                    type="number"
                    class="form-input"
                    style="width:100px;"
                    value="${s.security.sessionTimeout}"
                >

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        حداکثر تلاش ورود
                    </div>

                    <div class="setting-row-desc">
                        تعداد مجاز تلاش ناموفق قبل از قفل شدن
                    </div>

                </div>

                <input
                    type="number"
                    class="form-input"
                    style="width:100px;"
                    value="${s.security.maxLoginAttempts}"
                >

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        مدت قفل شدن (دقیقه)
                    </div>

                    <div class="setting-row-desc">
                        زمان قفل شدن حساب بعد از تلاش‌های ناموفق
                    </div>

                </div>

                <input
                    type="number"
                    class="form-input"
                    style="width:100px;"
                    value="${s.security.lockoutDuration}"
                >

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        حداقل طول رمز عبور
                    </div>

                    <div class="setting-row-desc">
                        تعداد کاراکترهای مورد نیاز برای رمز عبور
                    </div>

                </div>

                <input
                    type="number"
                    class="form-input"
                    style="width:100px;"
                    value="${s.security.passwordMinLength}"
                >

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        الزام کاراکترهای خاص
                    </div>

                    <div class="setting-row-desc">
                        رمز عبور باید شامل کاراکترهای خاص باشد
                    </div>

                </div>

                <label class="toggle">

                    <input
                        type="checkbox"
                        ${s.security.requireSpecialChars ? 'checked' : ''}
                    >

                    <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                    </span>

                </label>

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        الزام عدد در رمز عبور
                    </div>

                    <div class="setting-row-desc">
                        رمز عبور باید شامل عدد باشد
                    </div>

                </div>

                <label class="toggle">

                    <input
                        type="checkbox"
                        ${s.security.requireNumbers ? 'checked' : ''}
                    >

                    <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                    </span>

                </label>

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        احراز هویت دو مرحله‌ای
                    </div>

                    <div class="setting-row-desc">
                        فعال‌سازی MFA برای کل سیستم
                    </div>

                </div>

                <span class="badge badge-warning">
                    به‌زودی
                </span>

            </div>

            <button
                class="btn btn-primary mt-4"
                onclick="
                    showToast(
                        'تنظیمات امنیتی ذخیره شد',
                        'success'
                    )
                "
            >
                💾 ذخیره
            </button>

        </div>

        <div class="card mb-6">

            <div class="card-header">

                <div class="card-title">
                    تنظیمات اعلان‌ها
                </div>

                <span
                    class="icon"
                    style="font-size:var(--font-size-xl);"
                >
                    🔔
                </span>

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        اعلان ایمیلی
                    </div>

                    <div class="setting-row-desc">
                        ارسال اعلان‌ها از طریق ایمیل
                    </div>

                </div>

                <label class="toggle">

                    <input
                        type="checkbox"
                        ${s.notifications.emailNotifications ? 'checked' : ''}
                    >

                    <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                    </span>

                </label>

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        اعلان پیامکی
                    </div>

                    <div class="setting-row-desc">
                        ارسال اعلان‌ها از طریق SMS
                    </div>

                </div>

                <label class="toggle">

                    <input
                        type="checkbox"
                        ${s.notifications.smsNotifications ? 'checked' : ''}
                    >

                    <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                    </span>

                </label>

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        اعلان Push
                    </div>

                    <div class="setting-row-desc">
                        ارسال اعلان‌های فوری به مرورگر
                    </div>

                </div>

                <label class="toggle">

                    <input
                        type="checkbox"
                        ${s.notifications.pushNotifications ? 'checked' : ''}
                    >

                    <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                    </span>

                </label>

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        اعلان ورود
                    </div>

                    <div class="setting-row-desc">
                        اطلاع‌رسانی ورود موفق به سیستم
                    </div>

                </div>

                <label class="toggle">

                    <input
                        type="checkbox"
                        ${s.notifications.notifyOnLogin ? 'checked' : ''}
                    >

                    <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                    </span>

                </label>

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        اعلان تغییر رمز
                    </div>

                    <div class="setting-row-desc">
                        اطلاع‌رسانی تغییر رمز عبور
                    </div>

                </div>

                <label class="toggle">

                    <input
                        type="checkbox"
                        ${s.notifications.notifyOnPasswordChange ? 'checked' : ''}
                    >

                    <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                    </span>

                </label>

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        اعلان تغییر نقش
                    </div>

                    <div class="setting-row-desc">
                        اطلاع‌رسانی تغییر سطح دسترسی
                    </div>

                </div>

                <label class="toggle">

                    <input
                        type="checkbox"
                        ${s.notifications.notifyOnRoleChange ? 'checked' : ''}
                    >

                    <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                    </span>

                </label>

            </div>

            <button
                class="btn btn-primary mt-4"
                onclick="
                    showToast(
                        'تنظیمات اعلان ذخیره شد',
                        'success'
                    )
                "
            >
                💾 ذخیره
            </button>

        </div>

        <div class="card mb-6">

            <div class="card-header">

                <div class="card-title">
                    تعمیر و نگهداری
                </div>

                <span
                    class="icon"
                    style="font-size:var(--font-size-xl);"
                >
                    🔧
                </span>

            </div>

            <div class="setting-row">

                <div class="setting-row-info">

                    <div class="setting-row-title">
                        حالت تعمیر و نگهداری
                    </div>

                    <div class="setting-row-desc">
                        فعال‌سازی حالت تعمیر و نگهداری سیستم
                    </div>

                </div>

                <label class="toggle">

                    <input
                        type="checkbox"
                        ${s.maintenance.maintenanceMode ? 'checked' : ''}
                    >

                    <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                    </span>

                </label>

            </div>

            <div class="form-group mt-4">

                <label class="form-label">
                    پیام تعمیر و نگهداری
                </label>

                <textarea
                    class="form-textarea"
                    rows="3"
                >${s.maintenance.maintenanceMessage}</textarea>

            </div>

            <button
                class="btn btn-primary"
                onclick="
                    showToast(
                        'تنظیمات ذخیره شد',
                        'success'
                    )
                "
            >
                💾 ذخیره
            </button>

        </div>
    `;
}


/* =========================================================
   MODALS
   ========================================================= */

function showModal(
    title,
    bodyHtml,
    buttons
) {
    document.getElementById(
        'modalTitle'
    ).textContent = title;

    document.getElementById(
        'modalBody'
    ).innerHTML = bodyHtml;

    document.getElementById(
        'modalFooter'
    ).innerHTML =
        buttons
            .map(
                b =>
                    `
                        <button
                            class="btn ${b.class}"
                            onclick="${b.action}"
                        >
                            ${b.label}
                        </button>
                    `
            )
            .join('');

    document.getElementById(
        'modalOverlay'
    ).classList.add('show');
}

function closeModal(event) {
    if (
        event.target ===
        event.currentTarget
    ) {
        document.getElementById(
            'modalOverlay'
        ).classList.remove('show');
    }
}

function closeModalDirect() {
    document.getElementById(
        'modalOverlay'
    ).classList.remove('show');
}


/* =========================================================
   CREATE USER
   ========================================================= */

function showCreateUserModal() {

    const modal =
        document.createElement('div');

    modal.className =
        'modal-overlay';

    modal.id =
        'createUserModal';

    modal.innerHTML = `
        <div
            class="modal"
            style="max-width:520px;"
        >

            <div class="modal-header">

                <div>

                    <h3>
                        ایجاد کاربر جدید
                    </h3>

                    <p>
                        اطلاعات کاربر را وارد کنید
                    </p>

                </div>

                <button
                    class="modal-close"
                    onclick="closeCreateUserModal()"
                >
                    ×
                </button>

            </div>

            <div class="modal-body">

                <div class="form-group">

                    <label>
                        نام
                    </label>

                    <input
                        id="createFirstName"
                        type="text"
                        placeholder="نام"
                    >

                </div>

                <div class="form-group">

                    <label>
                        نام خانوادگی
                    </label>

                    <input
                        id="createLastName"
                        type="text"
                        placeholder="نام خانوادگی"
                    >

                </div>

                <div class="form-group">

                    <label>
                        نام کاربری
                    </label>

                    <input
                        id="createUsername"
                        type="text"
                        placeholder="نام کاربری"
                    >

                </div>

                <div class="form-group">

                    <label>
                        رمز عبور
                    </label>

                    <input
                        id="createPassword"
                        type="password"
                        placeholder="رمز عبور"
                    >

                </div>

                <div class="form-group">

                    <label>
                        سمت سازمانی
                    </label>

                    <input
                        id="createOrganizationalPosition"
                        type="text"
                        placeholder="سمت سازمانی"
                    >

                </div>

                <div class="form-group">

                    <label>
                        سطح دسترسی
                    </label>

                    <select
                        id="createAccessLevel"
                    >

                        <option value="1">
                            سطح ۱
                        </option>

                        <option value="2">
                            سطح ۲
                        </option>

                        <option value="3">
                            سطح ۳
                        </option>

                    </select>

                </div>

            </div>

            <div class="modal-footer">

                <button
                    class="btn btn-secondary"
                    onclick="closeCreateUserModal()"
                >
                    انصراف
                </button>

                <button
                    class="btn btn-primary"
                    onclick="createUser()"
                >
                    ایجاد کاربر
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(
        modal
    );

    requestAnimationFrame(() => {
        modal.classList.add(
            'show'
        );
    });
}

function closeCreateUserModal() {
    const modal =
        document.getElementById(
            'createUserModal'
        );

    if (modal) {

        modal.classList.remove(
            'show'
        );

        setTimeout(() => {
            modal.remove();
        }, 200);
    }
}

async function createUser() {

    const firstName =
        document
            .getElementById(
                'createFirstName'
            )
            .value
            .trim();

    const lastName =
        document
            .getElementById(
                'createLastName'
            )
            .value
            .trim();

    const username =
        document
            .getElementById(
                'createUsername'
            )
            .value
            .trim();

    const password =
        document
            .getElementById(
                'createPassword'
            )
            .value;

    const organizationalPosition =
        document
            .getElementById(
                'createOrganizationalPosition'
            )
            .value
            .trim();

    const accessLevel =
        Number(
            document
                .getElementById(
                    'createAccessLevel'
                )
                .value
        );

    if (
        !firstName ||
        !lastName ||
        !username ||
        !password
    ) {
        alert(
            'لطفاً اطلاعات الزامی را کامل کنید'
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE}/api/admin/users`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type':
                            'application/json',
                        'Accept':
                            'application/json'
                    },
                    body:
                        JSON.stringify({
                            first_name:
                                firstName,
                            last_name:
                                lastName,
                            username:
                                username,
                            password:
                                password,
                            organizational_position:
                                organizationalPosition ||
                                null,
                            access_level:
                                accessLevel
                        })
                }
            );

        const data =
            await response.json();

        console.log(
            'CREATE USER RESPONSE:',
            data
        );

        if (
            !response.ok ||
            !data.success
        ) {
            alert(
                data.detail ||
                data.message ||
                'ایجاد کاربر ناموفق بود'
            );

            return;
        }

        closeCreateUserModal();

        showCreatedUserPage(
            data.user
        );

    } catch (error) {

        console.error(
            'CREATE USER ERROR:',
            error
        );

        alert(
            'خطا در ارتباط با سرور'
        );
    }
}

function showCreatedUserPage(
    user
) {

    const content =
        document.getElementById(
            'settingsContent'
        );

    if (!content) return;

    content.innerHTML = `

        <div class="page-header">

            <div class="breadcrumb">

                <a
                    href="#"
                    onclick="
                        navigateTo('users');
                        return false;
                    "
                >
                    مدیریت کاربران
                </a>

                <span class="separator">
                    /
                </span>

                <span class="current">
                    اطلاعات کاربر
                </span>

            </div>

            <h1>
                کاربر با موفقیت ایجاد شد
            </h1>

            <p>
                اطلاعات زیر از دیتابیس دریافت شده است.
            </p>

        </div>

        <div class="card">

            <div class="card-header">

                <div class="card-title">
                    اطلاعات ذخیره‌شده کاربر
                </div>

                <span class="badge badge-success">
                    فعال
                </span>

            </div>

            <div class="account-grid">

                <label>
                    شناسه کاربر
                </label>

                <input
                    readonly
                    value="${user.id ?? '-'}"
                >

                <label>
                    نام
                </label>

                <input
                    readonly
                    value="${user.first_name ?? '-'}"
                >

                <label>
                    نام خانوادگی
                </label>

                <input
                    readonly
                    value="${user.last_name ?? '-'}"
                >

                <label>
                    نام کاربری
                </label>

                <input
                    readonly
                    value="@${user.username ?? '-'}"
                >

                <label>
                    سمت سازمانی
                </label>

                <input
                    readonly
                    value="${user.organizational_position ?? '-'}"
                >

                <label>
                    سطح دسترسی
                </label>

                <input
                    readonly
                    value="${user.access_level ?? '-'}"
                >

                <label>
                    وضعیت
                </label>

                <input
                    readonly
                    value="${user.is_active ? 'فعال' : 'غیرفعال'}"
                >

            </div>

            <hr>

            <div class="form-group">

                <label>
                    ID عددی بله
                </label>

                <input
                    type="text"
                    id="newUserBaleId"
                    placeholder="ID عددی کاربر در بله"
                    inputmode="numeric"
                >

                <small>
                    شناسه عددی حساب کاربر در بله را وارد کنید.
                </small>

            </div>

            <div
                style="
                    display:flex;
                    justify-content:flex-end;
                    margin-top:20px;
                "
            >

                <button
                    class="btn btn-primary"
                    onclick="
                        finalizeCreatedUser(${user.id})
                    "
                >
                    ثبت نهایی
                </button>

            </div>

        </div>
    `;
}

async function finalizeCreatedUser(
    userId
) {

    const input =
        document.getElementById(
            'newUserBaleId'
        );

    if (!input) return;

    const baleUserId =
        input.value.trim();

    if (!baleUserId) {

        alert(
            'لطفاً ID عددی بله را وارد کنید'
        );

        input.focus();

        return;
    }

    if (
        !/^\d+$/.test(
            baleUserId
        )
    ) {

        alert(
            'ID بله باید فقط شامل اعداد باشد'
        );

        input.focus();

        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE}/api/admin/users/link-bale`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type':
                            'application/json',
                        'Accept':
                            'application/json'
                    },
                    body:
                        JSON.stringify({
                            user_id:
                                userId,
                            bale_user_id:
                                baleUserId
                        })
                }
            );

        const data =
            await response.json();

        console.log(
            'LINK BALE RESPONSE:',
            data
        );

        if (
            !response.ok ||
            !data.success
        ) {

            alert(
                data.detail ||
                data.message ||
                'ثبت نهایی انجام نشد'
            );

            return;
        }

        alert(
            'کاربر با موفقیت ایجاد و به حساب بله متصل شد'
        );

        await loadUsers();

        navigateTo(
            'users'
        );

    } catch (error) {

        console.error(
            'FINALIZE USER ERROR:',
            error
        );

        alert(
            'خطا در ارتباط با سرور'
        );
    }
}


/* =========================================================
   CREATE ROLE
   ========================================================= */

function showCreateRoleModal() {

    showModal(
        'ایجاد نقش جدید',
        `
            <div class="form-group">

                <label class="form-label">
                    نام نقش (انگلیسی)
                </label>

                <input
                    type="text"
                    class="form-input"
                    id="newRoleName"
                    placeholder="e.g. EDITOR"
                    dir="ltr"
                    style="text-align:left;"
                >

            </div>

            <div class="form-group">

                <label class="form-label">
                    نام نمایشی (فارسی)
                </label>

                <input
                    type="text"
                    class="form-input"
                    id="newRoleLabel"
                    placeholder="مثلاً: ویرایشگر"
                >

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        سطح
                    </label>

                    <select
                        class="form-select"
                        id="newRoleLevel"
                    >

                        <option value="1">
                            سطح ۱
                        </option>

                        <option value="2">
                            سطح ۲
                        </option>

                        <option value="3">
                            سطح ۳
                        </option>

                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        رنگ
                    </label>

                    <input
                        type="color"
                        class="form-input"
                        id="newRoleColor"
                        value="#3498db"
                        style="
                            height:42px;
                            padding:4px;
                        "
                    >

                </div>

            </div>

            <div class="form-group">

                <label class="form-label">
                    توضیحات
                </label>

                <textarea
                    class="form-textarea"
                    id="newRoleDesc"
                    placeholder="توضیحات نقش..."
                ></textarea>

            </div>
        `,
        [
            {
                label: 'انصراف',
                class: 'btn-secondary',
                action: 'closeModalDirect()'
            },
            {
                label: 'ایجاد نقش',
                class: 'btn-primary',
                action: 'createRole()'
            }
        ]
    );
}

function createRole() {

    const name =
        document
            .getElementById(
                'newRoleName'
            )
            .value
            .trim()
            .toUpperCase();

    const label =
        document
            .getElementById(
                'newRoleLabel'
            )
            .value
            .trim();

    const level =
        parseInt(
            document
                .getElementById(
                    'newRoleLevel'
                )
                .value
        );

    const color =
        document
            .getElementById(
                'newRoleColor'
            )
            .value;

    const desc =
        document
            .getElementById(
                'newRoleDesc'
            )
            .value
            .trim();

    if (!name || !label) {

        showToast(
            'لطفاً نام نقش و نام نمایشی را وارد کنید',
            'error'
        );

        return;
    }

    ROLES.push({
        id:
            name.toLowerCase(),
        name,
        label,
        level,
        description:
            desc,
        color,
        userCount: 0,
        permissions: [],
        isSystem: false
    });

    closeModalDirect();

    showToast(
        `نقش ${name} ایجاد شد`,
        'success'
    );

    navigateTo(
        'roles'
    );
}


/* =========================================================
   CREATE NOTIFICATION
   ========================================================= */

function showCreateNotificationModal() {

    showModal(
        'ایجاد اعلان جدید',
        `
            <div class="form-group">

                <label class="form-label">
                    عنوان اعلان
                </label>

                <input
                    type="text"
                    class="form-input"
                    id="notifTitle"
                    placeholder="عنوان اعلان"
                >

            </div>

            <div class="form-group">

                <label class="form-label">
                    متن اعلان
                </label>

                <textarea
                    class="form-textarea"
                    id="notifMessage"
                    placeholder="متن اعلان..."
                ></textarea>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        نوع اعلان
                    </label>

                    <select
                        class="form-select"
                        id="notifType"
                    >
                        ${NOTIFICATION_TYPES
                            .map(
                                t =>
                                    `
                                        <option value="${t.id}">
                                            ${t.label}
                                        </option>
                                    `
                            )
                            .join('')}
                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        اولویت
                    </label>

                    <select
                        class="form-select"
                        id="notifPriority"
                    >

                        <option value="low">
                            پایین
                        </option>

                        <option
                            value="medium"
                            selected
                        >
                            متوسط
                        </option>

                        <option value="high">
                            بالا
                        </option>

                        <option value="critical">
                            بحرانی
                        </option>

                    </select>

                </div>

            </div>

            <div class="form-group">

                <label class="form-label">
                    گیرندگان
                </label>

                <select
                    class="form-select"
                    id="notifTarget"
                >

                    ${NOTIFICATION_TARGETS
                        .map(
                            t =>
                                `
                                    <option value="${t.id}">
                                        ${t.label}
                                    </option>
                                `
                        )
                        .join('')}

                </select>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        تاریخ انتشار
                    </label>

                    <input
                        type="text"
                        class="form-input"
                        id="notifPublishDate"
                        value="1405/06/05"
                        placeholder="1405/06/05"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label">
                        تاریخ انقضا
                    </label>

                    <input
                        type="text"
                        class="form-input"
                        id="notifExpireDate"
                        value="1405/06/12"
                        placeholder="1405/06/12"
                    >

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
                label: 'ارسال اعلان',
                class: 'btn-primary',
                action: 'createNotification()'
            }
        ]
    );
}

function createNotification() {

    const title =
        document
            .getElementById(
                'notifTitle'
            )
            .value
            .trim();

    const message =
        document
            .getElementById(
                'notifMessage'
            )
            .value
            .trim();

    if (!title || !message) {

        showToast(
            'لطفاً عنوان و متن اعلان را وارد کنید',
            'error'
        );

        return;
    }

    NOTIFICATIONS.unshift({

        id:
            generateNotifId(),

        title,

        message,

        type:
            document
                .getElementById(
                    'notifType'
                )
                .value,

        priority:
            document
                .getElementById(
                    'notifPriority'
                )
                .value,

        target:
            document
                .getElementById(
                    'notifTarget'
                )
                .value,

        targetRole:
            null,

        targetUsers:
            [],

        publishDate:
            document
                .getElementById(
                    'notifPublishDate'
                )
                .value,

        expireDate:
            document
                .getElementById(
                    'notifExpireDate'
                )
                .value,

        status:
            'active',

        createdAt:
            '1405/06/05',

        createdBy:
            CURRENT_USER.firstName +
            ' ' +
            CURRENT_USER.lastName

    });

    closeModalDirect();

    showToast(
        'اعلان با موفقیت ایجاد شد',
        'success'
    );

    navigateTo(
        'notifications'
    );
}


/* =========================================================
   NOTIFICATION DETAIL
   ========================================================= */

function showNotificationDetail(
    notifId
) {

    const n =
        NOTIFICATIONS.find(
            not =>
                not.id ===
                notifId
        );

    if (!n) return;

    const typeInfo =
        NOTIFICATION_TYPES.find(
            t =>
                t.id ===
                n.type
        );

    const targetInfo =
        NOTIFICATION_TARGETS.find(
            t =>
                t.id ===
                n.target
        );

    showModal(
        `جزئیات اعلان: ${n.title}`,
        `
            <div
                style="
                    display:flex;
                    flex-direction:column;
                    gap:var(--space-4);
                "
            >

                <div>

                    <div
                        style="
                            font-size:var(--font-size-xs);
                            color:var(--gray-500);
                        "
                    >
                        عنوان
                    </div>

                    <div style="font-weight:600;">
                        ${n.title}
                    </div>

                </div>

                <div>

                    <div
                        style="
                            font-size:var(--font-size-xs);
                            color:var(--gray-500);
                        "
                    >
                        متن
                    </div>

                    <div
                        style="
                            color:var(--gray-700);
                        "
                    >
                        ${n.message}
                    </div>

                </div>

                <div class="form-row">

                    <div>

                        <div
                            style="
                                font-size:var(--font-size-xs);
                                color:var(--gray-500);
                            "
                        >
                            نوع
                        </div>

                        <span
                            class="badge"
                            style="
                                background:${
                                    typeInfo
                                        ? typeInfo.color + '20'
                                        : 'var(--gray-100)'
                                };
                                color:${
                                    typeInfo
                                        ? typeInfo.color
                                        : 'var(--gray-600)'
                                };
                            "
                        >
                            ${
                                typeInfo
                                    ? typeInfo.label
                                    : n.type
                            }
                        </span>

                    </div>

                    <div>

                        <div
                            style="
                                font-size:var(--font-size-xs);
                                color:var(--gray-500);
                            "
                        >
                            اولویت
                        </div>

                        <span
                            class="badge ${
                                n.priority === 'critical'
                                    ? 'badge-danger'
                                    : n.priority === 'high'
                                        ? 'badge-warning'
                                        : 'badge-info'
                            }"
                        >
                            ${n.priority}
                        </span>

                    </div>

                </div>

                <div class="form-row">

                    <div>

                        <div
                            style="
                                font-size:var(--font-size-xs);
                                color:var(--gray-500);
                            "
                        >
                            گیرندگان
                        </div>

                        <div>
                            ${
                                targetInfo
                                    ? targetInfo.label
                                    : n.target
                            }
                        </div>

                    </div>

                    <div>

                        <div
                            style="
                                font-size:var(--font-size-xs);
                                color:var(--gray-500);
                            "
                        >
                            وضعیت
                        </div>

                        ${
                            n.status === 'active'
                                ? '<span class="badge badge-success">فعال</span>'
                                : '<span class="badge badge-gray">غیرفعال</span>'
                        }

                    </div>

                </div>

                <div class="form-row">

                    <div>

                        <div
                            style="
                                font-size:var(--font-size-xs);
                                color:var(--gray-500);
                            "
                        >
                            تاریخ انتشار
                        </div>

                        <div>
                            ${n.publishDate}
                        </div>

                    </div>

                    <div>

                        <div
                            style="
                                font-size:var(--font-size-xs);
                                color:var(--gray-500);
                            "
                        >
                            تاریخ انقضا
                        </div>

                        <div>
                            ${n.expireDate}
                        </div>

                    </div>

                </div>

                <div>

                    <div
                        style="
                            font-size:var(--font-size-xs);
                            color:var(--gray-500);
                        "
                    >
                        ساخته شده توسط
                    </div>

                    <div>
                        ${n.createdBy}
                    </div>

                </div>

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

function toggleUserStatus(
    userId
) {

    const user =
        USERS.find(
            u =>
                u.id ===
                userId
        );

    if (!user) return;

    user.status =
        user.status === 'active'
            ? 'inactive'
            : 'active';

    showToast(
        `کاربر ${user.firstName} ${user.lastName} ${
            user.status === 'active'
                ? 'فعال'
                : 'غیرفعال'
        } شد`,
        'success'
    );

    navigateTo(
        'users'
    );
}
