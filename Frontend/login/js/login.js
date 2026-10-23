// ===============================
// Elements
// ===============================

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const messageDiv = document.getElementById("message");
const registerMessageDiv = document.getElementById("registerMessage");

const showRegisterBtn = document.getElementById("showRegister");
const showLoginBtn = document.getElementById("showLogin");

const registerModal = document.getElementById("registerModal");

const closeModalBtn = document.getElementById("closeModalBtn");
const closeModalOverlay = document.getElementById("closeModal");


// ===============================
// API
// ===============================

const API_BASE = "";


// ===============================
// Helpers
// ===============================

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



// ===============================
// Modal
// ===============================

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



// ===============================
// Register Request
// ===============================


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



        const data = await response.json();



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
                data.message || "خطا در ثبت درخواست"
            );


        }



    }
    catch(error){


        console.error(error);


        showMessage(
            registerMessageDiv,
            "خطا در ارتباط با سرور"
        );


    }



});


}



// ===============================
// Login
// ===============================


if(loginForm){


loginForm.addEventListener("submit",async(e)=>{


e.preventDefault();



const username =
document.getElementById("username").value.trim();


const password =
document.getElementById("password").value.trim();



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



const data = await response.json();



if(data.success){

    showMessage(
        messageDiv,
        "کد تایید ارسال شد",
        "success"
    );

    localStorage.setItem(
        "user",
        JSON.stringify(data.user || {})
    );

    localStorage.setItem(
        "bale_account",
        JSON.stringify(data.bale_account || {})
    );

    sessionStorage.setItem(
        "otp_username",
        data.user.username
    );

    sessionStorage.setItem(
        "otp_request_id",
        data.request_id
    );

    window.location.href = "/Token/otp.html";
}
else{


showMessage(
messageDiv,
data.message || "خطا در ورود"
);


}



}
catch(error){


console.error(error);


showMessage(
messageDiv,
"خطا در ارتباط با سرور"
);


}



});


}
