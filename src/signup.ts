import { supabase } from './supabaseClient';

const signupForm = document.querySelector('#signup-form') as HTMLFormElement;
const emailInput = document.querySelector('#email') as HTMLInputElement;
const passwordInput = document.querySelector('#password') as HTMLInputElement;

signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (password.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
    alert(error.message);
    return;
    }
    
    const user = data.user;

    if (!user) {
    alert('Signup started, but no user was returned. Check your email confirmation settings.');
    return;
    }

    const {error: accountError} = await supabase 
        .from('accounts')
        .insert({ 
            user_id: user.id,
            email: email,
            created_at: new Date().toISOString(),
        });

    if (accountError) {
        alert(accountError.message);
        return;
    }
});