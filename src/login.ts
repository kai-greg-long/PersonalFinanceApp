import { supabase } from './supabaseClient';

const loginForm = document.querySelector('#login-form') as HTMLFormElement;
const emailInput = document.querySelector('#email') as HTMLInputElement;
const passwordInput = document.querySelector('#password') as HTMLInputElement;

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (password.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
    alert(error.message);
    return;
    }
    
    const user = data.user;

    if (!user) {
    alert('Login failed. Please check your email and password.');
    return;
    }

    const { data: account, error: accountError } = await supabase 
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    if (accountError) {
        alert(accountError.message);
        return;
    }

    if(!account){
        await supabase.auth.signOut();
        alert('No account found for the logged-in user.');
        return;
    }
    alert('Logged in successfully.');
    window.location.href = 'dashboard.html';
});
