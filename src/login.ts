import { supabase } from './supabaseClient.js';

const loginForm = document.getElementById('loginForm') as HTMLFormElement;
const loginMessage = document.getElementById("loginMessage") as HTMLParagraphElement;

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;

    const email = emailInput.value;
    const password = passwordInput.value;

    loginMessage.textContent = "Login form submitted.";
});


