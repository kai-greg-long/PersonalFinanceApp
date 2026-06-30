/*const loginForm = document.getElementById('loginForm') as HTMLFormElement;
//const loginMessage = document.getElementById("loginMessage") as HTMLParagraphElement;

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;

    const email = emailInput.value;
    const password = passwordInput.value;

    console.log("Email:", email);
    console.log("Password:", password);

    loginMessage.textContent = "Login form submitted.";
});
*/

console.log("login.js connected");

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    console.log(emailInput.value);
    console.log(passwordInput.value);
});
