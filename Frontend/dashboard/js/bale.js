
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

        window.__balePollState = { jobId: data.job_id, failures: 0, stopped: false };
        window.__baleResultsFilter = "success";
        window.__baleOutcome = null;
        pollBaleProgress(data.job_id);


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
    const content = document.getElementById("settingsContent");
    if (!content) return;
    const existing = document.getElementById("baleProgressCard");
    if (existing) existing.remove();

    const progressCard = document.createElement("div");
    progressCard.id = "baleProgressCard";
    progressCard.className = "card";
    progressCard.innerHTML = `
        <div class="card-header"><div>
            <div class="card-title">وضعیت ارسال</div>
            <div class="card-subtitle">ابتدا افزودن مخاطبین، سپس ارسال و بررسی پیام‌ها</div>
        </div></div>
        <div class="card-body">
            <div style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px;">
                    <span id="baleProgressLabel">مرحله ۱ از ۲: آماده‌سازی و افزودن مخاطبین</span>
                    <strong id="baleProgressPercent">10%</strong>
                </div>
                <div style="width:100%;height:16px;background:#e5e7eb;border-radius:999px;overflow:hidden;">
                    <div id="baleProgressBar" style="width:10%;height:100%;background:linear-gradient(90deg,#0d9488,#34d399);border-radius:999px;transition:width .45s ease;"></div>
                </div>
            </div>
            <div id="baleProgressCount" style="margin-bottom:12px;">در حال آماده‌سازی ${total} مخاطب</div>
            <div id="baleProgressStatus" style="margin-bottom:12px;">در حال افزودن مخاطبین به بله...</div>
            <div id="baleRefreshErrorLog" role="log" aria-live="polite" style="display:none;margin:10px 0;padding:10px 12px;border:1px solid #fecaca;background:#fff7f7;border-radius:10px;color:#991b1b;font-size:13px;line-height:1.8;"></div>
            <div id="baleProgressResults" style="margin-top:15px;"></div>
        </div>`;
    content.appendChild(progressCard);
    updateBaleProgress(0, total, 10, "مرحله ۱ از ۲: آماده‌سازی و افزودن مخاطبین", `در حال آماده‌سازی ${total} مخاطب`);
}

function updateBaleProgress(current, total, percentOverride = null, label = null, countText = null) {
    current = Number(current) || 0;
    total = Number(total) || 0;
    let percent = percentOverride === null
        ? (total > 0 ? Math.round((current / total) * 100) : 0)
        : Math.round(Number(percentOverride) || 0);
    percent = Math.max(0, Math.min(100, percent));

    const bar = document.getElementById("baleProgressBar");
    const percentElement = document.getElementById("baleProgressPercent");
    const countElement = document.getElementById("baleProgressCount");
    const labelElement = document.getElementById("baleProgressLabel");
    if (bar) bar.style.width = `${percent}%`;
    if (percentElement) percentElement.textContent = `${percent}%`;
    if (countElement) countElement.textContent = countText || `${current} از ${total} مخاطب پردازش شده`;
    if (labelElement && label) labelElement.textContent = label;
}

function getBaleResultGroup(item) {
    const messageStatus = String(item.message_status || "").toLowerCase();
    const text = [item.ui_notification, item.contact_add_detail, item.error, item.message, item.detail, item.description]
        .filter(Boolean).join(" ").toLowerCase();

    if (text.includes("حساب کاربری ندارد") || text.includes("در «بله» حساب کاربری ندارد") || text.includes("در بله حساب کاربری ندارد")) {
        return "no_account";
    }
    if (messageStatus === "sent") return "success";
    if (messageStatus) return "failed";

    const status = String(item.status || "").toLowerCase();
    if (status === "success" || status === "sent" || item.success === true) return "success";
    return "failed";
}

function getBaleResultCounts(results) {
    const counts = { success: 0, failed: 0, no_account: 0 };
    (Array.isArray(results) ? results : []).forEach(item => counts[getBaleResultGroup(item)]++);
    return counts;
}

async function pollBaleProgress(jobId) {
    if (!jobId) {
        console.error("[BALE POLL] jobId is missing.");
        return;
    }
    if (!window.__balePollState || window.__balePollState.jobId !== jobId) {
        window.__balePollState = {
            jobId,
            failures: 0,
            stopped: false,
            startedAt: Date.now()
        };
    }
    const pollState = window.__balePollState;
    if (pollState.stopped) return;

    try {
        const response = await fetch(
            `${BALE_API_BASE}/send/status/${encodeURIComponent(jobId)}`,
            { method: "GET", cache: "no-store" }
        );
        let data = {};
        try { data = await response.json(); } catch (_) {}
        if (!response.ok) throw new Error(data.detail || data.message || "خطا در دریافت وضعیت ارسال.");

        pollState.failures = 0;
        const total = Number(data.total || 0);
        const results = Array.isArray(data.results) ? data.results : [];
        const processed = Math.min(total, results.length);
        const status = String(data.status || "running").toLowerCase();
        const isComplete = ["completed", "complete", "done"].includes(status);

        let percent, label, countText;
        if (isComplete) {
            percent = 100;
            label = "مرحله ۲ از ۲: پردازش تمام شد";
            countText = `${total} از ${total} مخاطب بررسی شد`;
        } else if (processed === 0) {
            // The current API does not expose add-contact progress separately.
            // Show a small, time-based movement for this stage, capped at 19%,
            // then map actual processed contacts to the remaining 80%.
            const elapsedSeconds = Math.max(0, (Date.now() - pollState.startedAt) / 1000);
            percent = Math.min(19, 10 + Math.floor(elapsedSeconds / 12));
            label = "مرحله ۱ از ۲: آماده‌سازی و افزودن مخاطبین";
            countText = `در حال افزودن ${total} مخاطب؛ پیشرفت این مرحله تقریبی است`;
        } else {
            percent = 20 + (total > 0 ? (processed / total) * 80 : 0);
            label = "مرحله ۲ از ۲: ارسال و بررسی نتیجه پیام‌ها";
            countText = `${processed} از ${total} مخاطب بررسی شده`;
        }
        updateBaleProgress(processed, total, percent, label, countText);
        updateBaleProgressStatus(status, data);

        if (isComplete) {
            handleBaleCompleted(data);
            return;
        }
        if (status === "failed" || status === "error") {
            handleBaleFailed(data);
            return;
        }
        setTimeout(() => pollBaleProgress(jobId), 1000);
    } catch (error) {
        console.error("[BALE POLL ERROR]", error);
        if (pollState.stopped) return;
        pollState.failures += 1;

        if (pollState.failures >= 5) {
            pollState.stopped = true;
            handleBalePollEmergencyStop(jobId);
            return;
        }
        const statusElement = document.getElementById("baleProgressStatus");
        if (statusElement) {
            statusElement.textContent = `خطا در دریافت وضعیت؛ تلاش ${pollState.failures} از ۵. تلاش بعدی حداقل یک دقیقه دیگر انجام می‌شود.`;
        }
        const logElement = document.getElementById("baleRefreshErrorLog");
        if (logElement) {
            logElement.style.display = "block";
            const entry = document.createElement("div");
            const timestamp = new Date().toLocaleString("fa-IR");
            entry.textContent = `[${timestamp}] خطای رفرش ${pollState.failures}/۵: ${error && error.message ? error.message : "خطای نامشخص"}`;
            logElement.appendChild(entry);
        }
        setTimeout(() => pollBaleProgress(jobId), 60000);
    }
}

function updateBaleProgressStatus(status, data) {
    const element = document.getElementById("baleProgressStatus");
    if (!element) return;
    switch (status) {
        case "pending": element.textContent = "در انتظار شروع ارسال..."; break;
        case "running":
        case "processing": element.textContent = "در حال پردازش مخاطبین و ارسال پیام‌ها..."; break;
        case "completed":
        case "complete":
        case "done": element.textContent = "پردازش به پایان رسید."; break;
        case "failed":
        case "error": element.textContent = data.message || data.error || "پردازش با خطا متوقف شد."; break;
        default: element.textContent = "در حال پردازش...";
    }
}

function renderBaleOutcome(message, imagePath, kind = "error") {
    window.__baleOutcome = { message, image: imagePath, kind };
    const container = document.getElementById("baleProgressResults");
    if (!container) return;
    const old = container.querySelector(".baleOutcomeBanner");
    if (old) old.remove();

    const banner = document.createElement("div");
    banner.className = "baleOutcomeBanner";
    banner.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:18px;margin:0 0 16px;border-radius:14px;background:" +
        (kind === "success" ? "#ecfdf5" : "#fff1f2") + ";border:1px solid " +
        (kind === "success" ? "#a7f3d0" : "#fecdd3") + ";";
    const image = document.createElement("img");
    image.src = imagePath;
    image.alt = "";
    image.loading = "eager";
    image.style.cssText = "display:block;max-width:min(100%,280px);max-height:240px;object-fit:contain;border-radius:12px;";
    image.onerror = function () {
        this.style.display = "none";
        console.error("[BALE UI] Outcome image could not be loaded:", imagePath);
    };
    const text = document.createElement("div");
    text.textContent = message;
    text.style.cssText = "font-size:20px;font-weight:700;line-height:1.7;color:" +
        (kind === "success" ? "#065f46" : "#9f1239") + ";";
    banner.append(image, text);
    container.insertBefore(banner, container.firstChild);
}

function handleBalePollEmergencyStop(jobId) {
    const statusElement = document.getElementById("baleProgressStatus");
    if (statusElement) statusElement.textContent = "توقف اضطراری: پس از ۵ تلاش ناموفق، بررسی خودکار وضعیت متوقف شد.";
    renderBaleOutcome("پیام بله خراب شده بالا نمیاد", "./img/patrik.jpg", "error");

    const sendButton = document.getElementById("baleSendButton");
    if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = "ارسال پیام‌ها";
    }
    console.error("[BALE POLL] Frontend stopped checking after five consecutive status failures. Server job may still be running:", jobId);
}

function handleBaleCompleted(data) {
    const total = Number(data.total || 0);
    const results = Array.isArray(data.results) ? data.results : [];
    const counts = getBaleResultCounts(results);
    const sentCount = counts.success;
    const percentSuccessful = total > 0 ? (sentCount / total) * 100 : 0;

    updateBaleProgress(total, total, 100, "مرحله ۲ از ۲: پردازش تمام شد", `${total} از ${total} مخاطب بررسی شد`);
    const statusElement = document.getElementById("baleProgressStatus");
    if (statusElement) statusElement.textContent = "پردازش به پایان رسید.";

    renderBaleResults(results);
    if (percentSuccessful >= 50) {
        renderBaleOutcome("شد بالاخره شد :)", "./img/babesfanch.jpg", "success");
    } else {
        renderBaleOutcome("ما تمام تلاش خودمون رو کردیم اما نشد :(", "./img/patrik.jpg", "error");
    }

    showToast(`پردازش تمام شد؛ پیام موفق برای ${sentCount} از ${total} مخاطب.`, "success");
    const sendButton = document.getElementById("baleSendButton");
    if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = "ارسال پیام‌ها";
    }

    const jobId = data.job_id || window.__baleLastJobId;
    const box = document.getElementById("baleProgressResults");
    if (box && jobId && data.has_report === true && !document.getElementById("baleExportBtn")) {
        box.insertAdjacentHTML("beforeend", `
            <div style="margin-top:16px;display:flex;justify-content:center;">
                <a id="baleExportBtn" href="${BALE_API_BASE}/send/export/${encodeURIComponent(jobId)}" target="_blank" rel="noopener"
                   style="display:inline-flex;align-items:center;gap:8px;padding:12px 22px;border-radius:10px;background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;font-weight:600;text-decoration:none;box-shadow:0 4px 12px rgba(13,148,136,.35);">
                    📥 دانلود گزارش اکسل
                </a>
            </div>`);
    }
}

function handleBaleFailed(data) {
    const statusElement = document.getElementById("baleProgressStatus");
    if (statusElement) statusElement.textContent = data.message || data.error || "پردازش با خطا متوقف شد.";
    renderBaleResults(data.results || []);
    renderBaleOutcome("پیام بله خراب شده بالا نمیاد", "./img/patrik.jpg", "error");
    showToast(data.message || data.error || "پردازش با خطا متوقف شد.", "error");

    const sendButton = document.getElementById("baleSendButton");
    if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = "ارسال پیام‌ها";
    }
}

function renderBaleResults(results) {
    const container = document.getElementById("baleProgressResults");
    if (!container) return;
    if (!Array.isArray(results) || results.length === 0) {
        container.innerHTML = "";
        return;
    }

    const groups = { success: [], failed: [], no_account: [] };
    results.forEach(item => groups[getBaleResultGroup(item)].push(item));
    const counts = { success: groups.success.length, failed: groups.failed.length, no_account: groups.no_account.length };
    const activeFilter = ["success", "failed", "no_account"].includes(window.__baleResultsFilter)
        ? window.__baleResultsFilter : "success";

    container.innerHTML = `
        <div style="padding:14px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:12px;">
            <strong style="display:block;margin-bottom:10px;">نتیجه ارسال پیام‌ها</strong>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <span style="padding:6px 10px;border-radius:8px;background:#dcfce7;color:#166534;">موفق: ${counts.success}</span>
                <span style="padding:6px 10px;border-radius:8px;background:#fee2e2;color:#991b1b;">ناموفق: ${counts.failed}</span>
                <span style="padding:6px 10px;border-radius:8px;background:#fef3c7;color:#92400e;">حساب بله نداشته‌اند: ${counts.no_account}</span>
            </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;" role="tablist" aria-label="فیلتر نتایج">
            <button type="button" data-bale-filter="success" aria-pressed="${activeFilter === "success"}" style="padding:8px 12px;border:1px solid #86efac;border-radius:8px;background:${activeFilter === "success" ? "#dcfce7" : "#fff"};cursor:pointer;">موفق (${counts.success})</button>
            <button type="button" data-bale-filter="failed" aria-pressed="${activeFilter === "failed"}" style="padding:8px 12px;border:1px solid #fca5a5;border-radius:8px;background:${activeFilter === "failed" ? "#fee2e2" : "#fff"};cursor:pointer;">ناموفق (${counts.failed})</button>
            <button type="button" data-bale-filter="no_account" aria-pressed="${activeFilter === "no_account"}" style="padding:8px 12px;border:1px solid #fcd34d;border-radius:8px;background:${activeFilter === "no_account" ? "#fef3c7" : "#fff"};cursor:pointer;">حساب بله نداشته‌اند (${counts.no_account})</button>
        </div>
        <div id="baleResultRows"></div>`;

    const rowsContainer = container.querySelector("#baleResultRows");
    const selected = groups[activeFilter];
    if (!selected.length) {
        rowsContainer.innerHTML = '<div style="padding:14px;color:#64748b;text-align:center;">موردی در این دسته وجود ندارد.</div>';
    } else {
        rowsContainer.innerHTML = selected.map((item, index) => {
            const phone = escapeBaleHtml(item.phone || "");
            const name = escapeBaleHtml(item.name || item.phone || "بدون نام");
            const detail = escapeBaleHtml(item.error || item.contact_add_detail || item.message || "");
            return `<div style="padding:11px 12px;margin-bottom:7px;border:1px solid #e2e8f0;border-radius:9px;background:#fff;">
                <div style="font-weight:700;">${index + 1}. ${name}</div>
                <div style="direction:ltr;text-align:right;color:#475569;margin-top:4px;">${phone}</div>
                ${detail ? `<div style="margin-top:6px;color:#64748b;font-size:13px;">${detail}</div>` : ""}
            </div>`;
        }).join("");
    }

    container.querySelectorAll("[data-bale-filter]").forEach(button => {
        button.addEventListener("click", () => {
            window.__baleResultsFilter = button.dataset.baleFilter;
            renderBaleResults(results);
            if (window.__baleOutcome) {
                renderBaleOutcome(window.__baleOutcome.message, window.__baleOutcome.image, window.__baleOutcome.kind);
            }
        });
    });
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

window.changeBaleAccount = changeBaleAccount;

window.__baleLastJobId =
    data.job_id;

console.log(
    "[BALE] bale.js loaded successfully."
);
