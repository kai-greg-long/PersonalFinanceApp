import Chart from 'chart.js/auto';
import { supabase } from './supabaseClient';

await supabase.auth.getSession();

async function ensureAuthenticated() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        window.location.replace('login.html');
        return false;
    }

    return true;
}

const isAuthenticated = await ensureAuthenticated();

if (!isAuthenticated) {
    throw new Error('User is not authenticated');
}

type BudgetCategory = {
    category_id: string;
    name: string;
    symbol?: string;
    limit: number;
    amount_remaining: number;
};

type TransactionItem = {
    transaction_id: string;
    label: string;
    amount: number;
    transaction_date: string;
    budget_categories?: {
        symbol?: string;
        name?: string;
    };
};

const logoutBtn = document.querySelector('#logout-btn') as HTMLButtonElement;
const deleteAccountBtn = document.querySelector('#delete-account-btn') as HTMLButtonElement;
logoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

deleteAccountBtn?.addEventListener('click', async () => {
    const confirmed = confirm('Delete your account and all associated data? This cannot be undone.');
    if (!confirmed) return;

    const user = await getUser();
    if (!user) {
        alert('You must be logged in to delete your account.');
        return;
    }

    // Delete all user-owned app data first.
    const tables = ['transactions', 'budget_categories', 'accounts'];
    for (const table of tables) {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('user_id', user.id);

        if (error) {
            alert(`Failed to delete ${table}: ${error.message}`);
            return;
        }
    }

    if (supabase.auth.admin?.deleteUser) {
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (error) {
            alert(`Account data deleted, but auth user deletion failed: ${error.message}`);
        }
    } else {
        alert('Account data deleted. To delete the auth account, configure a secure server-side auth admin call.');
    }

    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

const incomeForm = document.querySelector('#income-form') as HTMLFormElement;
const transactionList = document.querySelector('#transaction-list') as HTMLDivElement;
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

    const monthly_income = Number((document.querySelector('#income-amount') as HTMLInputElement).value) || 0;
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

async function fetchIncome() {
    const user = await getUser();

    if (!user) {
        alert('You must be logged in to view your income.');
        return;
    }

    const { data: incomeData, error: incomeError } = await supabase
        .from('accounts')
        .select('income')
        .eq('user_id', user.id)
        .single();

    if (incomeError) {
        alert(incomeError.message);
        return;
    }

    const incomeInput = document.querySelector('#income-amount') as HTMLInputElement;
    if (incomeInput && incomeData.income) {
        incomeInput.value = incomeData.income;
    }

    return incomeData.income;
}

function getCurrentMonthRange() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
        start: startOfMonth.toISOString().slice(0, 10),
        end: startOfNextMonth.toISOString().slice(0, 10),
    };
}

function isCurrentMonthDate(value: string) {
    const date = new Date(value);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

async function fetchTransactions() {
    const user = await getUser();

    if (!user) {
        alert('You must be logged in to view transactions.');
        return;
    }

    const { start, end } = getCurrentMonthRange();

    const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select('*, budget_categories(symbol, name)')
        .eq('user_id', user.id)
        .gte('transaction_date', start)
        .lt('transaction_date', end)
        .order('transaction_date', { ascending: false });

    if (transactionError) {
        alert(transactionError.message);
        return;
    }
    
    transactionList.innerHTML = '';

    (transactions || []).forEach((transaction: TransactionItem) => {
        if (!transaction.transaction_date || !isCurrentMonthDate(transaction.transaction_date)) {
            return;
        }

        const transactionItem = document.createElement('div');
        transactionItem.className = 'transaction-item';
        const categorySymbol = transaction.budget_categories?.symbol || '💵';
        const categoryName = transaction.budget_categories?.name || 'Uncategorized';
        transactionItem.innerHTML = `
            <div class="category-symbol">${categorySymbol}</div>
            <h3>${transaction.label}</h3>
            <p>Category: ${categoryName}</p>
            <p>$${transaction.amount}</p>
            <p>${new Date(transaction.transaction_date).toLocaleDateString()}</p>
            <button class="delete-transaction" data-id="${transaction.transaction_id}">
                Delete
            </button>
        `;
        transactionList.appendChild(transactionItem);
    });

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

    (categories || []).forEach((category: BudgetCategory) => {
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
    await renderIncomeChart(categories as BudgetCategory[]);
    populateTransactionCategories(categories as BudgetCategory[]);
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

async function updateCategoryRemaining(categoryId: string, amountToSubtract: number) {
    const { data: category, error: fetchError } = await supabase
        .from('budget_categories')
        .select('amount_remaining')
        .eq('category_id', categoryId)
        .single();

    if (fetchError) {
        throw new Error(fetchError.message);
    }

    const currentRemaining = Number(category?.amount_remaining) || 0;
    const newRemaining = currentRemaining - amountToSubtract;

    const { error: updateError } = await supabase
        .from('budget_categories')
        .update({ amount_remaining: newRemaining })
        .eq('category_id', categoryId);

    if (updateError) {
        throw new Error(updateError.message);
    }
}

incomeForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const incomeInput = document.querySelector('#income-amount') as HTMLInputElement;
    const {data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
        alert('You must be logged in to set your income.');
        return;
    }

    const user = userData.user;

    const { error: incomeError } = await supabase
        .from('accounts')
        .update({ income: parseFloat(incomeInput.value) })
        .eq('user_id', user.id);
    
        if (incomeError) {
            alert(incomeError.message);
            return;
        }
    alert('Income updated successfully.');
    await fetchCategories();
    incomeForm.reset();
});    

transactionForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const descriptionInput = document.querySelector('#transaction-description') as HTMLInputElement;
    const amountInput = (document.querySelector('#transaction-amount')) as HTMLInputElement;
    const categoryInput = document.querySelector('#transaction-category') as HTMLSelectElement;
    const dateInput = document.querySelector('#transaction-date') as HTMLInputElement;
    const amountValue = parseFloat(amountInput.value);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
        alert('You must be logged in to add a transaction.');
        return;
    }

    if (!categoryInput.value) {
        alert('Please select a category.');
        return;
    }

    if (Number.isNaN(amountValue) || amountValue <= 0) {
        alert('Please enter a valid transaction amount.');
        return;
    }

    const user = userData.user;

    const { data: createdTransaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
            label: descriptionInput.value,
            amount: amountValue,
            category_id: categoryInput.value,
            created_at: new Date().toISOString(),
            transaction_date: dateInput.value,
            user_id: user.id
        })
        .select('transaction_id')
        .single();

        if (transactionError) {
            alert(transactionError.message);
            console.error(transactionError);
            return;
        }

    try {
        await updateCategoryRemaining(categoryInput.value, amountValue);
    } catch (updateRemainingError) {
            if (createdTransaction?.transaction_id) {
                await supabase
                    .from('transactions')
                    .delete()
                    .eq('transaction_id', createdTransaction.transaction_id);
            }

        const errorMessage = updateRemainingError instanceof Error
            ? updateRemainingError.message
                : 'Failed to update category remaining amount. Transaction was reverted.';
        alert(errorMessage);
            return;
    }

        alert('Transaction added successfully.');
    transactionForm.reset();
    await fetchCategories();
    await fetchTransactions();
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

transactionList.addEventListener('click', async (event) => {
        const target = event.target as HTMLElement;
        const deleteButton = target.closest('.delete-transaction') as HTMLButtonElement | null;
        
        if (!deleteButton) {
        return;
        }
        
        const transactionId = deleteButton.dataset.id;
        
        if (!transactionId) {
            alert('Transaction ID not found.');
            return;
        }

        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('transaction_id', transactionId);

        if (error) {
            alert(error.message);
        } else {
            await fetchTransactions();
        }
});

if (isAuthenticated) {
    await fetchIncome();
    await fetchCategories();
    await fetchTransactions();
}

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
categoryForm.reset();
await fetchCategories();
});

