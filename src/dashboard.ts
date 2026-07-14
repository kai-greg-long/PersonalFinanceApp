console.log('dashboard.ts loaded');

import { supabase } from './supabaseClient';

const categoryList = document.querySelector('#category-list') as HTMLDivElement;
const categoryForm = document.querySelector('#category-form') as HTMLFormElement;
const categorySymbol = document.querySelector('#category-symbol') as HTMLInputElement;
const categoryName = document.querySelector('#category-name') as HTMLInputElement;
const categoryLimit = document.querySelector('#category-limit') as HTMLInputElement;

async function getUser() {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    return userData.user;
}   

async function fetchCategories() {
    const user = await getUser();

    if (!user) {
        alert('You must be logged in to view categories.');
        return;
    }

    const { data: categories, error: categoryError } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('user_id', user.id);

    if (categoryError) {
        alert(categoryError.message);
        return;
    }

    categoryList.innerHTML = ''; 

    categories.forEach((category) => {
        const card = document.createElement('div');
        card.className = 'category-item';
        card.innerHTML = `
            <div class="category-symbol">${category.symbol || '💵'}</div>
            <h3>${category.name}</h3>
            <p>Limit: $${category.limit}</p>
            <p>Remaining: $${category.amount_remaining}</p>
            <button class="delete-category" data-id="${category.category_id}">
                Delete
            </button>
        `;
        categoryList.appendChild(card);
    });
}

categoryList.addEventListener('click', async (event) => {
        const target = event.target as HTMLElement;
        const deleteButton = target.closest('.delete-category') as HTMLButtonElement | null;
        
        if (!deleteButton) {
        return;
        }
        
        const categoryId = deleteButton.dataset.id;
        
        if (!categoryId) {
            alert('Category ID not found.');
            return;
        }

        const { error } = await supabase
            .from('budget_categories')
            .delete()
            .eq('category_id', categoryId);

        if (error) {
            alert(error.message);
        } else {
            await fetchCategories();
        }
});

await fetchCategories();

categoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const symbol = categorySymbol.value.trim();
    const name = categoryName.value.trim();
    const limit = parseFloat(categoryLimit.value);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
        alert('You must be logged in to add a category.');
    return;
    }

    const user = userData.user;

    const {error: categoryError} = await supabase 
        .from('budget_categories')
        .insert({ 
            symbol: symbol,
            name: name,
            limit: limit,
            amount_remaining: limit,
            created_at: new Date().toISOString(),
            user_id: user.id
        })

    if (categoryError) {
    alert(categoryError.message);
    return;
    }

alert('Category added successfully.');
await fetchCategories();
});
