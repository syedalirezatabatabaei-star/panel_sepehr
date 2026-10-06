/* =========================================================
   Bale Integration
   Login → OTP → Messaging → Excel Send → Progress
   ========================================================= */

const BALE_API_BASE = "http://95.38.187.123:8005/api/bale";


/* =========================================================
   Utility
   ========================================================= */

function baleSetHeaderTitle(title) {
    const headerTitle = document.getElementById("headerTitle");

    if (headerTitle) {
        headerTitle.textContent = title;
    }
}

/*==================
continueBaleAccount
======================*/
async function continueBaleAccount() {

    showToast(
        "در حال بررسی حساب بله...",
        "info"
    );

    try {

        const response = await fetch(
            `${BALE_API_BASE}/account`
        );

        const data = await response.json();


        if (data.exists) {

            showBaleMessagingPage();

        } else {

            showBaleLoginPage();

        }


    } catch(error) {

        console.error(
            error
        );

        showBaleLoginPage();

    }
}
/*=============================
baleSetActiveNav
+======================*/
function baleSetActiveNav() {
    document.querySelectorAll(".settings-nav-item").forEach(item => {
        item.classList.remove("active");
    });
}
function showBaleSavedAccountPage(phone) {

    const content =
        document.getElementById("settingsContent");


    content.innerHTML = `

        <div class="page-header">

            <h1 class="page-title">
                حساب بله
            </h1>

            <p class="page-description">
                یک حساب ذخیره شده پیدا شد.
            </p>

        </div>


        <div class="card">

            <div class="card-body">

                <div class="form-group">

                    <label>
                        شماره فعال
                    </label>

                    <div
                        style="
                        padding:12px;
                        background:#f3f4f6;
                        border-radius:8px;
                        direction:ltr;
                        "
                    >
                        ${escapeBaleHtml(phone)}
                    </div>

                </div>


                <div class="form-actions">

                    <button
                        class="btn btn-primary"
                        onclick="continueBaleAccount()"
                    >
                        ادامه با این حساب
                    </button>


                    <button
                        class="btn btn-secondary"
                        onclick="changeBaleAccount()"
                    >
                        ورود با شماره جدید
                    </button>

                </div>

            </div>

        </div>

    `;
}

/*=============
changeBaleAccount
================*/
async function changeBaleAccount(){

    try{

        await fetch(
            `${BALE_API_BASE}/account/reset`,
            {
                method:"POST"
            }
        );


        showToast(
            "حساب قبلی حذف شد.",
            "success"
        );


        showBaleLoginPage();


    }catch(error){

        console.error(error);

        showToast(
            "خطا در تغییر حساب.",
            "error"
        );
    }
}
/*======================================
checkBaleAccount
======================================*/
async function checkBaleAccount() {

    try {

        const response = await fetch(
            `${BALE_API_BASE}/account`
        );

        const data = await response.json();

        if (data.exists) {

            showBaleSavedAccountPage(
                data.phone
            );

        } else {

            showBaleLoginPage();

        }

    } catch (error) {

        console.error(
            "[BALE] Account check error:",
            error
        );

        showBaleLoginPage();
    }
}
/* =========================================================
   Open Bale Messaging
   ========================================================= */

function openBaleMessaging() {
    
     if (typeof canRead === "function" && !canRead("bale_send")) {
        if (typeof showPermissionDenied === "function") {
            showPermissionDenied();
        }
        return;
    }

    hideSettingsNav();
    const content = document.getElementById("settingsContent");

    if (!content) {
        console.error("[BALE] settingsContent not found.");
        return;
    }

    baleSetHeaderTitle("ارسال پیام - بله");

    baleSetActiveNav();

    console.log("[BALE] Opening Bale messaging.");

    checkBaleAccount();
}


/* =========================================================
   Bale Login Page
   ========================================================= */

function showBaleLoginPage() {

    const content = document.getElementById("settingsContent");

    if (!content) {
        console.error("[BALE] settingsContent not found.");
        return;
    }

    baleSetHeaderTitle("ارسال پیام - بله");

    content.innerHTML = `

        <div class="page-header">

            <div>

                <h1 class="page-title">
                    ورود به بله
                </h1>

                <p class="page-description">
                    برای ارسال پیام ابتدا وارد حساب بله شوید.
                </p>

            </div>

        </div>


        <div class="card">

            <div class="card-header">

                <div>

                    <div class="card-title">
                        ورود به حساب بله
                    </div>

                    <div class="card-subtitle">
                        شماره موبایل حساب بله را وارد کنید.
                    </div>

                </div>

            </div>


            <div class="card-body">

                <div class="form-group">

                    <label for="balePhone">
                        شماره موبایل
                    </label>

                    <input
                        type="tel"
                        id="balePhone"
                        class="form-control"
                        placeholder="09123456789"
                        autocomplete="tel"
                        dir="ltr"
                    >

                    <small>
                        شماره موبایل خود را وارد کنید.
                    </small>

                </div>


                <div class="form-actions">

                    <button
                        type="button"
                        id="baleLoginButton"
                        class="btn btn-primary"
                        onclick="startBaleLogin()"
                    >
                        دریافت کد تایید
                    </button>

                </div>

            </div>

        </div>
    `;


    const phoneInput = document.getElementById("balePhone");

    if (phoneInput) {

        phoneInput.focus();

        phoneInput.addEventListener("keydown", function (event) {

            if (event.key === "Enter") {
                startBaleLogin();
            }

        });

    }
}


/* =========================================================
   Start Bale Login
   ========================================================= */

async function startBaleLogin() {

    const phoneInput =
        document.getElementById("balePhone");

    const loginButton =
        document.getElementById("baleLoginButton");


    if (!phoneInput) {

        showToast(
            "بخش شماره موبایل پیدا نشد.",
            "error"
        );

        return;
    }


    const phone =
        phoneInput.value.trim();


    if (!phone) {

        showToast(
            "لطفاً شماره موبایل را وارد کنید.",
            "error"
        );

        phoneInput.focus();

        return;
    }


    if (loginButton) {

        loginButton.disabled = true;

        loginButton.textContent =
            "در حال ارسال کد...";

    }


    try {

        console.log(
            "[BALE] Login request:",
            phone
        );


        showToast(
            "در حال ارسال کد تایید...",
            "info"
        );


        const response =
            await fetch(
                `${BALE_API_BASE}/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        phone: phone
                    })
                }
            );


        let data = {};

        try {
            data = await response.json();
        } catch (jsonError) {
            console.warn(
                "[BALE] Could not parse login response."
            );
        }


        console.log(
            "[BALE LOGIN RESPONSE]",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                "خطا در ورود به بله."
            );

        }


        if (data.success === false) {

            throw new Error(
                data.message ||
                "ارسال کد تایید انجام نشد."
            );

        }


        showToast(
            data.message ||
            "کد تایید ارسال شد.",
            "success"
        );


        showBaleOtpPage(phone);


    } catch (error) {

        console.error(
            "[BALE LOGIN ERROR]",
            error
        );


        showToast(
            error.message ||
            "خطا در ورود به بله.",
            "error"
        );


        if (loginButton) {

            loginButton.disabled = false;

            loginButton.textContent =
                "دریافت کد تایید";

        }

    }
}


/* =========================================================
   Bale OTP Page
   ========================================================= */

function showBaleOtpPage(phone) {

    const content =
        document.getElementById("settingsContent");


    if (!content) {

        console.error(
            "[BALE] settingsContent not found."
        );

        return;
    }


    baleSetHeaderTitle(
        "تایید ورود به بله"
    );


    content.innerHTML = `

        <div class="page-header">

            <div>

                <h1 class="page-title">
                    تایید ورود
                </h1>

                <p class="page-description">
                    کد ارسال‌شده برای شماره
                    <strong dir="ltr">
                        ${escapeBaleHtml(phone)}
                    </strong>
                    را وارد کنید.
                </p>

            </div>

        </div>


        <div class="card">

            <div class="card-header">

                <div>

                    <div class="card-title">
                        کد تایید
                    </div>

                    <div class="card-subtitle">
                        کد ورود ارسال‌شده توسط بله را وارد کنید.
                    </div>

                </div>

            </div>


            <div class="card-body">

                <div class="form-group">

                    <label for="baleOtp">
                        کد ورود
                    </label>

                    <input
                        type="text"
                        id="baleOtp"
                        class="form-control"
                        placeholder="کد تایید"
                        inputmode="numeric"
                        autocomplete="one-time-code"
                        maxlength="12"
                        dir="ltr"
                    >

                </div>


                <div class="form-actions">

                    <button
                        type="button"
                        id="baleOtpButton"
                        class="btn btn-primary"
                        onclick="verifyBaleOtp()"
                    >
                        تایید و ورود
                    </button>


                    <button
                        type="button"
                        id="baleChangePhoneButton"
                        class="btn btn-secondary"
                        onclick="showBaleLoginPage()"
                    >
                        تغییر شماره
                    </button>

                </div>

            </div>

        </div>
    `;


    const otpInput =
        document.getElementById("baleOtp");


    if (otpInput) {

        otpInput.focus();


        otpInput.addEventListener(
            "input",
            function () {

                this.value =
                    this.value.replace(
                        /[^\d]/g,
                        ""
                    );

            }
        );


        otpInput.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {
                    verifyBaleOtp();
                }

            }
        );

    }
}


/* =========================================================
   Verify Bale OTP
   ========================================================= */

async function verifyBaleOtp() {

    const otpInput =
        document.getElementById("baleOtp");

    const otpButton =
        document.getElementById("baleOtpButton");


    if (!otpInput) {

        showToast(
            "بخش کد ورود پیدا نشد.",
            "error"
        );

        return;
    }


    const otp =
        otpInput.value.trim();


    if (!otp) {

        showToast(
            "لطفاً کد تایید را وارد کنید.",
            "error"
        );

        otpInput.focus();

        return;
    }


    if (otpButton) {

        otpButton.disabled = true;

        otpButton.textContent =
            "در حال بررسی...";

    }


    try {

        console.log(
            "[BALE] OTP verification request."
        );


        showToast(
            "در حال تایید کد ورود...",
            "info"
        );


        const response =
            await fetch(
                `${BALE_API_BASE}/verify`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        otp: otp
                    })
                }
            );


        let data = {};

        try {
            data = await response.json();
        } catch (jsonError) {
            console.warn(
                "[BALE] Could not parse verify response."
            );
        }


        console.log(
            "[BALE VERIFY RESPONSE]",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                "ورود به بله انجام نشد."
            );

        }


        if (data.success === false) {

            throw new Error(
                data.message ||
                "ورود به بله انجام نشد."
            );

        }


        showToast(
            data.message ||
            "ورود با موفقیت انجام شد.",
            "success"
        );


        showBaleMessagingPage();


    } catch (error) {

        console.error(
            "[BALE OTP ERROR]",
            error
        );


        showToast(
            error.message ||
            "خطا در تایید کد ورود.",
            "error"
        );


        if (otpButton) {

            otpButton.disabled = false;

            otpButton.textContent =
                "تایید و ورود";

        }

    }
}


/* =========================================================
   Bale Messaging Page
   ========================================================= */

function showBaleMessagingPage() {

    const content =
        document.getElementById("settingsContent");


    if (!content) {

        console.error(
            "[BALE] settingsContent not found."
        );

        return;
    }


    baleSetHeaderTitle(
        "ارسال پیام - بله"
    );


    content.innerHTML = `

        <div class="page-header">

            <div>

                <h1 class="page-title">
                    ارسال پیام - بله
                </h1>

                <p class="page-description">
                    انتخاب مخاطبین و ارسال پیام
                </p>

            </div>

        </div>


        <div class="card">

            <div class="card-header">

                <div>

                    <div class="card-title">
                        ارسال پیام
                    </div>

                    <div class="card-subtitle">
                        فایل مخاطبین و محتوای پیام را وارد کنید.
                    </div>

                </div>

            </div>


            <div class="card-body">


                <!-- =========================================
                     Excel
                     ========================================= -->

                <div class="form-group">

                    <label for="baleExcelFile">
                        فایل مخاطبین
                    </label>

                    <input
                        type="file"
                        id="baleExcelFile"
                        class="form-control"
                        accept=".xlsx,.xlsm"
                    >

                    <small>
                        فایل Excel باید شامل ستون‌های
                        phone و name باشد.
                    </small>

                </div>


                <!-- =========================================
                     Message Type
                     ========================================= -->

                <div class="form-group">

                    <label for="baleMessageType">
                        نوع محتوا
                    </label>

                    <select
                        id="baleMessageType"
                        class="form-control"
                    >

                        <option value="text">
                            📝 متن
                        </option>

                        <option value="image">
                            🖼 تصویر
                        </option>

                        <option value="video">
                            🎥 ویدیو
                        </option>

                    </select>

                </div>


                <!-- =========================================
                     Media File
                     ========================================= -->

                <div
                    class="form-group"
                    id="baleMediaGroup"
                    style="display:none;"
                >

                    <label for="baleMediaFile">
                        فایل رسانه
                    </label>

                    <input
                        type="file"
                        id="baleMediaFile"
                        class="form-control"
                    >

                    <small id="baleMediaHelp">
                        فایل مورد نظر را انتخاب کنید.
                    </small>

                </div>


                <!-- =========================================
                     Message / Caption
                     ========================================= -->

                <div class="form-group">

                    <label for="baleMessage">
                        <span id="baleMessageLabel">
                            متن پیام
                        </span>
                    </label>

                    <textarea
                        id="baleMessage"
                        class="form-control"
                        rows="7"
                        placeholder="متن پیام خود را وارد کنید..."
                    ></textarea>

                    <small id="baleMessageHelp">
                        متن پیام برای مخاطبین ارسال خواهد شد.
                    </small>

                </div>


                <!-- =========================================
                     Send
                     ========================================= -->

                <div class="form-actions">

                    <button
                        type="button"
                        id="baleSendButton"
                        class="btn btn-primary"
                        onclick="sendBaleMessages()"
                    >
                        ارسال پیام‌ها
                    </button>

                </div>


            </div>

        </div>

    `;


    /* =====================================================
       Elements
       ===================================================== */

    const excelInput =
        document.getElementById(
            "baleExcelFile"
        );


    const messageType =
        document.getElementById(
            "baleMessageType"
        );


    const mediaGroup =
        document.getElementById(
            "baleMediaGroup"
        );


    const mediaInput =
        document.getElementById(
            "baleMediaFile"
        );


    const messageLabel =
        document.getElementById(
            "baleMessageLabel"
        );


    const messageHelp =
        document.getElementById(
            "baleMessageHelp"
        );


    const mediaHelp =
        document.getElementById(
            "baleMediaHelp"
        );


    /* =====================================================
       Update Media UI
       ===================================================== */

    function updateMediaUI() {

        if (!messageType) {
            return;
        }


        const type =
            messageType.value;


        /* -----------------------------------------------
           TEXT
           ----------------------------------------------- */

        if (type === "text") {

            if (mediaGroup) {
                mediaGroup.style.display = "none";
            }


            if (mediaInput) {
                mediaInput.value = "";
                mediaInput.accept = "";
            }


            if (messageLabel) {
                messageLabel.textContent =
                    "متن پیام";
            }


            if (messageHelp) {
                messageHelp.textContent =
                    "متن پیام برای مخاطبین ارسال خواهد شد.";
            }


            return;
        }


        /* -----------------------------------------------
           IMAGE
           ----------------------------------------------- */

        if (type === "image") {

            if (mediaGroup) {
                mediaGroup.style.display = "block";
            }


            if (mediaInput) {

                mediaInput.accept =
                    "image/*";

            }


            if (messageLabel) {
                messageLabel.textContent =
                    "متن / کپشن تصویر";
            }


            if (messageHelp) {
                messageHelp.textContent =
                    "این متن زیر تصویر نمایش داده می‌شود.";
            }


            if (mediaHelp) {
                mediaHelp.textContent =
                    "فرمت‌های تصویری مانند JPG، PNG و WEBP.";
            }


            return;
        }


        /* -----------------------------------------------
           VIDEO
           ----------------------------------------------- */

        if (type === "video") {

            if (mediaGroup) {
                mediaGroup.style.display = "block";
            }


            if (mediaInput) {

                mediaInput.accept =
                    "video/*";

            }


            if (messageLabel) {
                messageLabel.textContent =
                    "متن / کپشن ویدیو";
            }


            if (messageHelp) {
                messageHelp.textContent =
                    "این متن زیر ویدیو نمایش داده می‌شود.";
            }


            if (mediaHelp) {
                mediaHelp.textContent =
                    "فرمت‌های ویدیویی مانند MP4 و WEBM.";
            }

        }

    }


    /* =====================================================
       Type Change
       ===================================================== */

    if (messageType) {

        messageType.addEventListener(
            "change",
            updateMediaUI
        );

    }


    /* =====================================================
       Excel Change
       ===================================================== */

    if (excelInput) {

        excelInput.addEventListener(
            "change",
            function () {

                if (
                    this.files &&
                    this.files.length > 0
                ) {

                    const file =
                        this.files[0];


                    console.log(
                        "[BALE] Excel selected:",
                        file.name,
                        file.size
                    );


                    showToast(
                        `فایل «${file.name}» انتخاب شد.`,
                        "success"
                    );

                }

            }
        );

    }


    /* =====================================================
       Media Change
       ===================================================== */

    if (mediaInput) {

        mediaInput.addEventListener(
            "change",
            function () {

                if (
                    this.files &&
                    this.files.length > 0
                ) {

                    const file =
                        this.files[0];


                    console.log(
                        "[BALE] Media selected:",
                        file.name,
                        file.size,
                        file.type
                    );


                    showToast(
                        `فایل «${file.name}» انتخاب شد.`,
                        "success"
                    );

                }

            }
        );

    }


    /* =====================================================
       Initial State
       ===================================================== */

    updateMediaUI();

}





/* =========================================================
   Send Bale Messages
   ========================================================= */

async function sendBaleMessages() {

    const excelInput =
        document.getElementById(
            "baleExcelFile"
        );


    const messageInput =
        document.getElementById(
            "baleMessage"
        );


    const messageTypeInput =
        document.getElementById(
            "baleMessageType"
        );


    const mediaInput =
        document.getElementById(
            "baleMediaFile"
        );


    const sendButton =
        document.getElementById(
            "baleSendButton"
        );


    /* =====================================================
       Validate Excel
       ===================================================== */

    if (
        !excelInput ||
        !excelInput.files ||
        excelInput.files.length === 0
    ) {

        showToast(
            "لطفاً فایل Excel را انتخاب کنید.",
            "error"
        );

        return;
    }


    /* =====================================================
       Message Type
       ===================================================== */

    const messageType =
        messageTypeInput
            ? messageTypeInput.value
            : "text";


    if (
        ![
            "text",
            "image",
            "video"
        ].includes(messageType)
    ) {

        showToast(
            "نوع محتوا نامعتبر است.",
            "error"
        );

        return;
    }


    /* =====================================================
       Message
       ===================================================== */

    if (!messageInput) {

        showToast(
            "بخش متن پیام پیدا نشد.",
            "error"
        );

        return;
    }


    const message =
        messageInput.value.trim();


    /* =====================================================
       Media Validation
       ===================================================== */

    let mediaFile = null;


    if (
        messageType === "image" ||
        messageType === "video"
    ) {

        if (
            !mediaInput ||
            !mediaInput.files ||
            mediaInput.files.length === 0
        ) {

            showToast(
                messageType === "image"
                    ? "لطفاً تصویر را انتخاب کنید."
                    : "لطفاً ویدیو را انتخاب کنید.",
                "error"
            );

            return;
        }


        mediaFile =
            mediaInput.files[0];


        /* -----------------------------------------------
           Validate MIME type
           ----------------------------------------------- */

        if (
            messageType === "image" &&
            !mediaFile.type.startsWith("image/")
        ) {

            showToast(
                "فایل انتخاب‌شده تصویر نیست.",
                "error"
            );

            return;
        }


        if (
            messageType === "video" &&
            !mediaFile.type.startsWith("video/")
        ) {

            showToast(
                "فایل انتخاب‌شده ویدیو نیست.",
                "error"
            );

            return;
        }

    }


    /* =====================================================
       Text Validation
       ===================================================== */

    /*
       در حالت text متن اجباری است.

       در حالت image/video متن اختیاری است.
       یعنی:
           تصویر تنها
           تصویر + کپشن
           ویدیو تنها
           ویدیو + کپشن
       هر دو قابل ارسال هستند.
    */

    if (
        messageType === "text" &&
        !message
    ) {

        showToast(
            "لطفاً متن پیام را وارد کنید.",
            "error"
        );

        messageInput.focus();

        return;
    }


    /* =====================================================
       Excel
       ===================================================== */

    const excelFile =
        excelInput.files[0];


    const excelName =
        excelFile.name.toLowerCase();


    if (
        !excelName.endsWith(".xlsx") &&
        !excelName.endsWith(".xlsm")
    ) {

        showToast(
            "فرمت فایل باید xlsx یا xlsm باشد.",
            "error"
        );

        return;
    }


    /* =====================================================
       Log
       ===================================================== */

    console.log(
        "[BALE] Message type:",
        messageType
    );


    console.log(
        "[BALE] Excel:",
        excelFile.name,
        excelFile.size
    );


    if (mediaFile) {

        console.log(
            "[BALE] Media:",
            mediaFile.name,
            mediaFile.size,
            mediaFile.type
        );

    }


    /* =====================================================
       FormData
       ===================================================== */

    const formData =
        new FormData();


    /* -----------------------------------------------
       Excel
       ----------------------------------------------- */

    formData.append(
        "file",
        excelFile
    );


    /* -----------------------------------------------
       Message
       ----------------------------------------------- */

    formData.append(
        "message",
        message
    );


    /* -----------------------------------------------
       Message Type
       ----------------------------------------------- */

    formData.append(
        "message_type",
        messageType
    );


    /* -----------------------------------------------
       Media
       ----------------------------------------------- */

    if (mediaFile) {

        formData.append(
            "media",
            mediaFile
        );

    }


    /* =====================================================
       Disable Button
       ===================================================== */

    if (sendButton) {

        sendButton.disabled = true;

        sendButton.textContent =
            "در حال شروع ارسال...";

    }


    /* =====================================================
       Send
       ===================================================== */

    try {

        showToast(
            "در حال ارسال اطلاعات به سرور...",
            "info"
        );


        const response =
            await fetch(
                `${BALE_API_BASE}/send`,
                {
                    method: "POST",
                    body: formData
                }
            );


        let data = {};


        try {

            data =
                await response.json();

        } catch (jsonError) {

            console.warn(
                "[BALE SEND] Invalid JSON response."
            );

        }


        console.log(
            "[BALE SEND RESPONSE]",
            data
        );


        /* =================================================
           HTTP Error
           ================================================= */

        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                "خطا در شروع ارسال."
            );

        }


        /* =================================================
           Backend Error
           ================================================= */

        if (!data.success) {

            throw new Error(
                data.message ||
                "ارسال شروع نشد."
            );

        }


        /* =================================================
           Job ID
           ================================================= */

        if (!data.job_id) {

            throw new Error(
                "شناسه عملیات ارسال از سرور دریافت نشد."
            );

        }


        window.__baleLastJobId =
            data.job_id;


        console.log(
            "[BALE] Job started:",
            data.job_id
        );


        showToast(
            `ارسال ${data.total || 0} پیام شروع شد.`,
            "success"
        );


        /* =================================================
           Progress
           ================================================= */

        showBaleProgress(
            data.total || 0
        );


        /* =================================================
           Polling
           ================================================= */

        pollBaleProgress(
            data.job_id
        );


    } catch (error) {

        console.error(
            "[BALE SEND ERROR]",
            error
        );


        showToast(
            error.message ||
            "خطا در ارسال پیام‌ها.",
            "error"
        );


        if (sendButton) {

            sendButton.disabled = false;

            sendButton.textContent =
                "ارسال پیام‌ها";

        }

    }

}




    /* =====================================================
       Validate Excel
       ===================================================== */

    if (
        !fileInput ||
        !fileInput.files ||
        fileInput.files.length === 0
    ) {

        showToast(
            "لطفاً فایل Excel را انتخاب کنید.",
            "error"
        );

        return;
    }


    /* =====================================================
       Validate Message
       ===================================================== */

    if (!messageInput) {

        showToast(
            "بخش متن پیام پیدا نشد.",
            "error"
        );

        return;
    }


    const message =
        messageInput.value.trim();


    if (!message) {

        showToast(
            "لطفاً متن پیام را وارد کنید.",
            "error"
        );

        messageInput.focus();

        return;
    }


    const file =
        fileInput.files[0];


    /* =====================================================
       Validate Extension
       ===================================================== */

    const fileName =
        file.name.toLowerCase();


    if (
        !fileName.endsWith(".xlsx") &&
        !fileName.endsWith(".xlsm")
    ) {

        showToast(
            "فرمت فایل باید xlsx یا xlsm باشد.",
            "error"
        );

        return;
    }


    console.log(
        "[BALE] Selected Excel:",
        file.name,
        file.size
    );


    /* =====================================================
       Create FormData
       ===================================================== */

    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    formData.append(
        "message",
        message
    );


    /* =====================================================
       Disable Send Button
       ===================================================== */

    if (sendButton) {

        sendButton.disabled = true;

        sendButton.textContent =
            "در حال شروع ارسال...";

    }


    try {

        showToast(
            "در حال ارسال اطلاعات به سرور...",
            "info"
        );


        const response =
            await fetch(
                `${BALE_API_BASE}/send`,
                {
                    method: "POST",
                    body: formData
                }
            );


        let data = {};

        try {

            data =
                await response.json();

        } catch (jsonError) {

            console.warn(
                "[BALE SEND] Invalid JSON response."
            );

        }


        console.log(
            "[BALE SEND RESPONSE]",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                "خطا در شروع ارسال."
            );

        }


        if (!data.success) {

            throw new Error(
                data.message ||
                "ارسال شروع نشد."
            );

        }


        if (!data.job_id) {

            throw new Error(
                "شناسه عملیات ارسال از سرور دریافت نشد."
            );

        }


        console.log(
            "[BALE] Job started:",
            data.job_id
        );


        showToast(
            `ارسال ${data.total || 0} پیام شروع شد.`,
            "success"
        );


        /* =================================================
           Show Progress
           ================================================= */

        showBaleProgress(
            data.total || 0
        );


        /* =================================================
           Start Polling
           ================================================= */

        pollBaleProgress(
            data.job_id
        );


    } catch (error) {

        console.error(
            "[BALE SEND ERROR]",
            error
        );


        showToast(
            error.message ||
            "خطا در ارسال پیام‌ها.",
            "error"
        );


        if (sendButton) {

            sendButton.disabled = false;

            sendButton.textContent =
                "ارسال پیام‌ها";

        }

    }
}


/* =========================================================
   Bale Progress UI
   ========================================================= */

function showBaleProgress(total = 0) {

    const content =
        document.getElementById(
            "settingsContent"
        );


    if (!content) {
        return;
    }


    const existing =
        document.getElementById(
            "baleProgressCard"
        );


    if (existing) {
        existing.remove();
    }


    const progressCard =
        document.createElement("div");


    progressCard.id =
        "baleProgressCard";


    progressCard.className =
        "card";


    progressCard.innerHTML = `

        <div class="card-header">

            <div>

                <div class="card-title">
                    وضعیت ارسال
                </div>

                <div class="card-subtitle">
                    ارسال پیام‌ها در حال انجام است.
                </div>

            </div>

        </div>


        <div class="card-body">

            <div style="margin-bottom: 12px;">

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        margin-bottom:8px;
                    "
                >

                    <span>
                        پیشرفت ارسال
                    </span>

                    <strong id="baleProgressPercent">
                        0%
                    </strong>

                </div>


                <div
                    style="
                        width:100%;
                        height:12px;
                        background:#e5e7eb;
                        border-radius:999px;
                        overflow:hidden;
                    "
                >

                    <div
                        id="baleProgressBar"
                        style="
                            width:0%;
                            height:100%;
                            transition:width 0.3s ease;
                        "
                    ></div>

                </div>

            </div>


            <div
                id="baleProgressCount"
                style="margin-bottom: 12px;"
            >
                0 از ${total}
            </div>


            <div
                id="baleProgressStatus"
                style="margin-bottom: 12px;"
            >
                در حال آماده‌سازی...
            </div>


            <div
                id="baleProgressResults"
                style="margin-top: 15px;"
            ></div>

        </div>

    `;


    content.appendChild(
        progressCard
    );


    updateBaleProgress(
        0,
        total
    );
}


/* =========================================================
   Update Progress
   ========================================================= */

function updateBaleProgress(
    current,
    total
) {

    current =
        Number(current) || 0;

    total =
        Number(total) || 0;


    let percent = 0;


    if (total > 0) {

        percent =
            Math.round(
                (current / total) * 100
            );

    }


    percent =
        Math.max(
            0,
            Math.min(
                100,
                percent
            )
        );


    const progressBar =
        document.getElementById(
            "baleProgressBar"
        );


    const progressPercent =
        document.getElementById(
            "baleProgressPercent"
        );


    const progressCount =
        document.getElementById(
            "baleProgressCount"
        );


    if (progressBar) {

        progressBar.style.width =
            `${percent}%`;

    }


    if (progressPercent) {

        progressPercent.textContent =
            `${percent}%`;

    }


    if (progressCount) {

        progressCount.textContent =
            `${current} از ${total}`;

    }

}


/* =========================================================
   Poll Bale Progress
   ========================================================= */

async function pollBaleProgress(
    jobId
) {

    if (!jobId) {

        console.error(
            "[BALE POLL] jobId is missing."
        );

        return;
    }


    console.log(
        "[BALE POLL] Checking job:",
        jobId
    );


    try {

        const response =
            await fetch(
                `${BALE_API_BASE}/send/status/${encodeURIComponent(jobId)}`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        let data = {};

        try {

            data =
                await response.json();

        } catch (jsonError) {

            console.warn(
                "[BALE POLL] Invalid JSON response."
            );

        }


        console.log(
            "[BALE POLL RESPONSE]",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                "خطا در دریافت وضعیت ارسال."
            );

        }


        const current =
            Number(
                data.current ??
                data.progress ??
                data.sent ??
                0
            );


        const total =
            Number(
                data.total ??
                0
            );


        const status =
            String(
                data.status ||
                "running"
            ).toLowerCase();


        updateBaleProgress(
            current,
            total
        );


        updateBaleProgressStatus(
            status,
            data
        );


        /* =================================================
           Completed
           ================================================= */

        if (
            status === "completed" ||
            status === "complete" ||
            status === "done"
        ) {

            handleBaleCompleted(
                data
            );

            return;
        }


        /* =================================================
           Failed
           ================================================= */

        if (
            status === "failed" ||
            status === "error"
        ) {

            handleBaleFailed(
                data
            );

            return;
        }


        /* =================================================
           Continue Polling
           ================================================= */

        setTimeout(
            function () {

                pollBaleProgress(
                    jobId
                );

            },
            1000
        );


    } catch (error) {

        console.error(
            "[BALE POLL ERROR]",
            error
        );


        const statusElement =
            document.getElementById(
                "baleProgressStatus"
            );


        if (statusElement) {

            statusElement.textContent =
                "خطا در دریافت وضعیت. تلاش مجدد...";

        }


        setTimeout(
            function () {

                pollBaleProgress(
                    jobId
                );

            },
            2000
        );

    }
}


/* =========================================================
   Progress Status
   ========================================================= */

function updateBaleProgressStatus(
    status,
    data
) {

    const statusElement =
        document.getElementById(
            "baleProgressStatus"
        );


    if (!statusElement) {
        return;
    }


    switch (status) {

        case "pending":
            statusElement.textContent =
                "در انتظار شروع ارسال...";
            break;


        case "running":
        case "processing":
            statusElement.textContent =
                "در حال ارسال پیام‌ها...";
            break;


        case "completed":
        case "complete":
        case "done":
            statusElement.textContent =
                "ارسال به پایان رسید.";
            break;


        case "failed":
        case "error":
            statusElement.textContent =
                data.message ||
                "ارسال با خطا متوقف شد.";
            break;


        default:
            statusElement.textContent =
                "در حال پردازش...";
            break;

    }
}


/* =========================================================
   Handle Completed
   ========================================================= */

function handleBaleCompleted(
    data
) {

    const total =
        Number(
            data.total || 0
        );


    const current =
        Number(
            data.current ??
            data.sent ??
            total
        );


    updateBaleProgress(
        current,
        total
    );


    const statusElement =
        document.getElementById(
            "baleProgressStatus"
        );


    if (statusElement) {

        statusElement.textContent =
            "✅ ارسال پیام‌ها با موفقیت تمام شد.";

    }


    renderBaleResults(
        data.results || []
    );


    showToast(
        `ارسال ${current} پیام به پایان رسید.`,
        "success"
    );


    const sendButton =
        document.getElementById(
            "baleSendButton"
        );


    if (sendButton) {

        sendButton.disabled = false;

        sendButton.textContent =
            "ارسال پیام‌ها";

    }

    const jobId = data.job_id || window.__baleLastJobId;
    const box = document.getElementById("baleProgressResults");

    if (box && jobId && data.has_report === true) {
        if (!document.getElementById("baleExportBtn")) {
            box.insertAdjacentHTML("beforeend", `
                <div style="margin-top:16px;display:flex;justify-content:center;">
                    <a id="baleExportBtn"
                       href="${BALE_API_BASE}/send/export/${encodeURIComponent(jobId)}"
                       target="_blank"
                       rel="noopener"
                       style="
                           display:inline-flex;
                           align-items:center;
                           gap:8px;
                           padding:12px 22px;
                           border-radius:10px;
                           background:linear-gradient(135deg,#0d9488,#0f766e);
                           color:#fff;
                           font-weight:600;
                           text-decoration:none;
                           box-shadow:0 4px 12px rgba(13,148,136,.35);
                       ">
                        📥 دانلود گزارش اکسل
                    </a>
                </div>
            `);
        }
    }

}


/* =========================================================
   Handle Failed
   ========================================================= */

function handleBaleFailed(
    data
) {

    const statusElement =
        document.getElementById(
            "baleProgressStatus"
        );


    if (statusElement) {

        statusElement.textContent =
            data.message ||
            data.error ||
            "ارسال پیام‌ها با خطا متوقف شد.";

    }


    renderBaleResults(
        data.results || []
    );


    showToast(
        data.message ||
        data.error ||
        "ارسال پیام‌ها با خطا متوقف شد.",
        "error"
    );


    const sendButton =
        document.getElementById(
            "baleSendButton"
        );


    if (sendButton) {

        sendButton.disabled = false;

        sendButton.textContent =
            "ارسال پیام‌ها";

    }

}


/* =========================================================
   Render Results
   ========================================================= */

function renderBaleResults(
    results
) {

    const container =
        document.getElementById(
            "baleProgressResults"
        );


    if (!container) {
        return;
    }


    if (
        !Array.isArray(results) ||
        results.length === 0
    ) {

        container.innerHTML = "";

        return;
    }


    let successCount = 0;
    let failedCount = 0;


    results.forEach(
        function (item) {

            const status =
                String(
                    item.status || ""
                ).toLowerCase();


            if (
                status === "success" ||
                status === "sent" ||
                item.success === true
            ) {

                successCount++;

            } else {

                failedCount++;

            }

        }
    );


    container.innerHTML = `

        <div
            style="
                padding:12px;
                border-radius:8px;
                background:#f8f9fa;
            "
        >

            <strong>
                نتیجه ارسال
            </strong>

            <div style="margin-top:8px;">
                موفق: ${successCount}
            </div>

            <div>
                ناموفق: ${failedCount}
            </div>

        </div>

    `;
}


/* =========================================================
   Escape HTML
   ========================================================= */

function escapeBaleHtml(
    value
) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   Global Exports
   ========================================================= */
window.changeBaleAccount =
    changeBaleAccount;

window.openBaleMessaging =
    openBaleMessaging;

window.showBaleLoginPage =
    showBaleLoginPage;

window.startBaleLogin =
    startBaleLogin;

window.showBaleOtpPage =
    showBaleOtpPage;

window.verifyBaleOtp =
    verifyBaleOtp;

window.showBaleMessagingPage =
    showBaleMessagingPage;

window.sendBaleMessages =
    sendBaleMessages;

window.showBaleProgress =
    showBaleProgress;

window.pollBaleProgress =
    pollBaleProgress;

window.updateBaleProgress =
    updateBaleProgress;

window.showBaleSavedAccountPage =
    showBaleSavedAccountPage;

window.continueBaleAccount =
    continueBaleAccount;
window.__baleLastJobId =
    data.job_id;
console.log(
    "[BALE] bale.js loaded successfully."
);
