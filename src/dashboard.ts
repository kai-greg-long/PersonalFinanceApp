import Chart from 'chart.js/auto';
import { supabase } from './supabaseClient';

const transactionForm = document.querySelector('#transaction-form') as HTMLFormElement;
const transactionCategory = document.querySelector('#transaction-category') as HTMLSelectElement;
const incomeChartCanvas = document.querySelector('#income-chart') as HTMLCanvasElement;
const categoryList = document.querySelector('#category-list') as HTMLDivElement;
const categoryForm = document.querySelector('#category-form') as HTMLFormElement;
const categorySymbol = document.querySelector('#category-symbol') as HTMLInputElement;
const categoryName = document.querySelector('#category-name') as HTMLInputElement;
const categoryLimit = document.querySelector('#category-limit') as HTMLInputElement;

let incomeChart: Chart<'doughnut'> | null = null;

function renderIncomeChart(Categories: any[]) {

    const monthly_income = 3000; // Replace with actual monthly income value
    const labels = Categories.map(category => category.name);
    const categoryAmounts = Categories.map(category => Number(category.limit));
    const totalBudgeted = categoryAmounts.reduce((acc, amount) => acc + amount, 0);
    const remainingIncome = monthly_income - totalBudgeted;

    labels.push('Remaining Income');
    categoryAmounts.push(remainingIncome);

    if (incomeChart) {
        incomeChart.destroy();
    }

    const centerTextPlugin = {
        id: 'centerText',
        afterDraw(chart: Chart<'doughnut'>) {
            const meta = chart.getDatasetMeta(0);
            const centerX = meta.data[0].x;
            const centerY = meta.data[0].y;

            const ctx = chart.ctx;

            ctx.save();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'black';

            ctx.font = 'bold 32px serif';
            ctx.fillText(`$${monthly_income.toLocaleString()}`, centerX, centerY - 15);

            ctx.font = 'bold 20px serif';
            ctx.fillText('Income', centerX, centerY + 25);

            ctx.restore();
        }
    };

    incomeChart = new Chart(incomeChartCanvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: categoryAmounts,
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'left',
                }
            }
        },
        plugins: [centerTextPlugin]
    });
}

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
    renderIncomeChart(categories);
    populateTransactionCategories(categories);
}

async function populateTransactionCategories(categories: any[]) {

    transactionCategory.innerHTML = '<option value="">Select a category</option>';

    categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category.category_id;
        option.textContent = category.name;
        transactionCategory.appendChild(option);
    });
}

transactionForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const descriptionInput = document.querySelector('#transaction-description') as HTMLInputElement;
    const amountInput = (document.querySelector('#transaction-amount')) as HTMLInputElement;
    const categoryInput = document.querySelector('#transaction-category') as HTMLSelectElement;

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
        alert('You must be logged in to add a transaction.');
        return;
    }
    const user = userData.user;

    const {error: transactionError} = await supabase
    .from('transactions')
    .insert({
        label: descriptionInput.value,
        amount: parseFloat(amountInput.value),
        category_id: categoryInput.value,
        created_at: new Date().toISOString(),
        user_id: user.id
    });
});

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

