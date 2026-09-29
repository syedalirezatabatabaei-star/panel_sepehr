// ================================================
// SETTINGS NAVIGATION
// ================================================

function toggleSettingsNav() {
    const nav = document.getElementById('settingsNav');
    const overlay = document.getElementById('settingsNavOverlay');

    if (!nav) return;

    nav.classList.toggle('open');

    if (overlay) {
        overlay.classList.toggle('show');
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


// ================================================
// SETTINGS INIT
// ================================================

document.addEventListener('DOMContentLoaded', () => {

    const overlay = document.getElementById('settingsNavOverlay');

    if (overlay) {
        overlay.addEventListener('click', closeSettingsNav);
    }

});
