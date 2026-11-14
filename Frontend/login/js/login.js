                                  
           
                                  

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const messageDiv = document.getElementById("message");
const registerMessageDiv = document.getElementById("registerMessage");

const showRegisterBtn = document.getElementById("showRegister");
const showLoginBtn = document.getElementById("showLogin");

const registerModal = document.getElementById("registerModal");

const closeModalBtn = document.getElementById("closeModalBtn");
const closeModalOverlay = document.getElementById("closeModal");


                                  
      
                                  

const API_BASE = "";

async function readApiResponse(response) {
    const responseText = await response.text();
    let data;

    try {
        data = JSON.parse(responseText);
    } catch (parseError) {
        const contentType = response.headers.get("content-type") || "نامشخص";
        const preview = responseText.replace(/\s+/g, " ").slice(0, 300);
        console.error("API returned a non-JSON response", {
            status: response.status,
            contentType,
            url: response.url,
            preview
        });

        const error = new Error(
            "پاسخ سرور قابل پردازش نیست (HTTP " + response.status + "). لطفاً صفحه را تازه‌سازی کنید؛ جزئیات در کنسول مرورگر ثبت شده است."
        );
        error.name = "ApiResponseError";
        throw error;
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        const error = new Error("ساختار پاسخ سرور معتبر نیست.");
        error.name = "ApiResponseError";
        throw error;
    }

    return data;
}



                                  
          
                                  

function showMessage(element, text, type="error") {

    if (!element) return;

    element.textContent = text;
    element.className = "message " + type;

}


function validateUsername(username){

    return username && username.length >= 3;

}


function validatePassword(password){

    return password && password.length >= 6;

}



                                  
        
                                  

function openRegisterModal(){

    if(registerModal){

        registerModal.classList.add("active");

    }

}



function closeRegisterModal(){

    if(registerModal){

        registerModal.classList.remove("active");

    }

}



if(showRegisterBtn){

    showRegisterBtn.addEventListener("click",(e)=>{

        e.preventDefault();

        openRegisterModal();

    });

}



if(showLoginBtn){

    showLoginBtn.addEventListener("click",(e)=>{

        e.preventDefault();

        closeRegisterModal();

    });

}



if(closeModalBtn){

    closeModalBtn.addEventListener("click",closeRegisterModal);

}



if(closeModalOverlay){

    closeModalOverlay.addEventListener("click",closeRegisterModal);

}



                                  
                   
                                  


if(registerForm){


registerForm.addEventListener("submit", async(e)=>{


    e.preventDefault();


    const first_name =
        document.getElementById("first_name")?.value.trim();


    const last_name =
        document.getElementById("last_name")?.value.trim();


    const username =
        document.getElementById("regUsername")?.value.trim();


    const password =
        document.getElementById("regPassword")?.value.trim();


    const organizational_position =
        document.getElementById("organizational_position")?.value.trim();


    const requested_access_level =
        document.getElementById("requested_access_level")?.value || 1;



    if(!validateUsername(username)){

        showMessage(
            registerMessageDiv,
            "نام کاربری حداقل ۳ کاراکتر باشد"
        );

        return;

    }



    if(!validatePassword(password)){

        showMessage(
            registerMessageDiv,
            "رمز عبور حداقل ۶ کاراکتر باشد"
        );

        return;

    }



    try{


        const response = await fetch(
            `${API_BASE}/api/auth/register`,
            {

                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },


                body:JSON.stringify({

                    first_name,
                    last_name,
                    username,
                    password,
                    organizational_position,
                    requested_access_level

                })

            }
        );



        const data = await readApiResponse(response);



        if(data.success){


            showMessage(
                registerMessageDiv,
                "درخواست دسترسی ارسال شد",
                "success"
            );


            registerForm.reset();



        }
        else{


            showMessage(
                registerMessageDiv,
                data.message || data.detail || "خطا در ثبت درخواست"
            );


        }



    }
    catch(error){


        console.error(error);


        showMessage(
            registerMessageDiv,
            error?.name === "ApiResponseError" ? error.message : "خطا در ارتباط با سرور"
        );


    }



});


}



                                  
        
                                  


if(loginForm){


loginForm.addEventListener("submit",async(e)=>{


e.preventDefault();



const username =
document.getElementById("username").value.trim();


const password =
document.getElementById("password").value.trim();

const loginButton = loginForm.querySelector('button[type="submit"]');
if (loginForm.dataset.submitting === "true") return;
loginForm.dataset.submitting = "true";
if (loginButton) {
    loginButton.disabled = true;
    loginButton.dataset.originalText = loginButton.textContent;
    loginButton.textContent = "در حال بررسی...";
}

try{


const response = await fetch(

`${API_BASE}/api/auth/login`,

{

method:"POST",
credentials:"include",
headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

username,
password

})


}

);



const data = await readApiResponse(response);



if(data.success){

    localStorage.setItem("user", JSON.stringify(data.user || {}));
    localStorage.setItem("bale_account", JSON.stringify(data.bale_account || {}));
    sessionStorage.removeItem("otp_username");
    sessionStorage.removeItem("otp_request_id");

    window.location.replace(data.redirect || "/dashboard/index.html");
}
else{


showMessage(
messageDiv,
data.message || data.detail || "خطا در ورود"
);


}



}
catch(error){


console.error(error);


showMessage(
messageDiv,
error?.name === "ApiResponseError" ? error.message : (error?.message || "خطا در ارتباط با سرور")
);


} finally {
    loginForm.dataset.submitting = "false";
    if (loginButton) {
        loginButton.disabled = false;
        loginButton.textContent = loginButton.dataset.originalText || "ورود";
    }
}


});


}
