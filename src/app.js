// Certifique-se de que a chave de API está configurada corretamente
const API_KEY = '72cd552f785921f1084b2969';
let db;

document.addEventListener('DOMContentLoaded', () => {
    openDB(); // Abre o IndexedDB ao carregar a página
    document.getElementById('add-btn').addEventListener('click', addExpense);
});

function openDB() {
    const request = indexedDB.open('ExpensesDB', 1);

    request.onerror = function(event) {
        console.error('Database error:', event.target.errorCode);
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        loadExpenses(); // Carrega as despesas ao abrir o IndexedDB com sucesso
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        const objectStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('description', 'description', { unique: false });
        objectStore.createIndex('quantity', 'quantity', { unique: false });
        objectStore.createIndex('value', 'value', { unique: false });
        objectStore.createIndex('currency', 'currency', { unique: false });
        objectStore.createIndex('convertedValue', 'convertedValue', { unique: false });
        objectStore.createIndex('originalValue', 'originalValue', { unique: false });
    };
}

function addExpense() {
    console.log('Adding expense...');
    const description = document.getElementById('description').value;
    const quantity = parseFloat(document.getElementById('quantity').value);
    const value = parseFloat(document.getElementById('value').value);
    const currency = document.getElementById('currency').value;

    console.log('Inputs:', description, quantity, value, currency);

    if (description && quantity && value) {
        const url = `https://v6.exchangerate-api.com/v6/${API_KEY}/pair/${currency}/BRL/${value * quantity}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log('API response:', data);
                const convertedValue = data.conversion_result;

                const expense = {
                    description,
                    quantity,
                    value,
                    currency,
                    convertedValue,
                    originalValue: value * quantity
                };

                saveExpense(expense); // Salva a despesa no IndexedDB após obter o valor convertido
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    } else {
        console.error('Missing required fields');
    }
}

function saveExpense(expense) {
    const transaction = db.transaction(['expenses'], 'readwrite');
    const objectStore = transaction.objectStore('expenses');
    const request = objectStore.add(expense);

    request.onsuccess = function() {
        console.log('Expense added to the database');
        loadExpenses(); // Após adicionar a despesa, recarrega as despesas do IndexedDB
    };

    request.onerror = function(event) {
        console.error('Error adding expense:', event.target.errorCode);
    };
}

function loadExpenses() {
    const transaction = db.transaction(['expenses'], 'readonly');
    const objectStore = transaction.objectStore('expenses');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const expenses = event.target.result;
        console.log('Loaded expenses:', expenses);
        renderExpenses(expenses); // Chama a função para renderizar as despesas na tela, passando as despesas carregadas
        updateTotal(expenses); // Atualiza os totais após carregar as despesas
    };

    request.onerror = function(event) {
        console.error('Error loading expenses:', event.target.errorCode);
    };
}

function renderExpenses(expenses) {
    const expenseList = document.getElementById('expense-list');
    expenseList.innerHTML = ''; // Limpa a lista existente

    expenses.forEach(expense => {
        const listItem = document.createElement('li');
        
        // Verifica se originalValue e convertedValue são números antes de formatar
        const originalValue = typeof expense.originalValue === 'number' ? expense.originalValue.toFixed(2) : 'N/A';
        const convertedValue = typeof expense.convertedValue === 'number' ? expense.convertedValue.toFixed(2) : 'N/A';

        listItem.innerHTML = `
            <span>${expense.description} - ${expense.quantity} x ${expense.value} ${expense.currency} = ${originalValue} ${expense.currency} (${convertedValue} BRL)</span>
            <button class="edit-btn" data-id="${expense.id}">✏️</button>
            <button class="delete-btn" data-id="${expense.id}">🗑️</button>
        `;
        expenseList.appendChild(listItem);
    });

    addEventListeners();
}

function addEventListeners() {
    const editButtons = document.querySelectorAll('.edit-btn');
    const deleteButtons = document.querySelectorAll('.delete-btn');

    editButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const id = Number(event.target.getAttribute('data-id'));
            editExpense(id);
        });
    });

    deleteButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const id = Number(event.target.getAttribute('data-id'));
            deleteExpense(id);
        });
    });
}

function editExpense(id) {
    const transaction = db.transaction(['expenses'], 'readwrite');
    const objectStore = transaction.objectStore('expenses');
    const request = objectStore.get(id);

    request.onsuccess = function(event) {
        const expense = event.target.result;
        if (expense) {
            document.getElementById('description').value = expense.description;
            document.getElementById('quantity').value = expense.quantity;
            document.getElementById('value').value = expense.value;
            document.getElementById('currency').value = expense.currency;

            deleteExpense(id); // Remove a despesa após carregar para edição
        } else {
            console.error('Expense not found');
        }
    };

    request.onerror = function(event) {
        console.error('Error editing expense:', event.target.errorCode);
    };
}

function deleteExpense(id) {
    const transaction = db.transaction(['expenses'], 'readwrite');
    const objectStore = transaction.objectStore('expenses');
    const request = objectStore.delete(id);

    request.onsuccess = function() {
        console.log('Expense deleted from the database');
        loadExpenses(); // Recarrega as despesas após excluir
    };

    request.onerror = function(event) {
        console.error('Error deleting expense:', event.target.errorCode);
    };
}

function updateTotal(expenses) {
    if (expenses) {
        const totalValue = document.getElementById('total-value');
        const totalConvertedValue = document.getElementById('total-converted-value');

        let totalOriginal = 0;
        let totalConverted = 0;

        expenses.forEach(expense => {
            totalOriginal += expense.originalValue;
            totalConverted += expense.convertedValue;
        });

        totalValue.innerText = totalOriginal.toFixed(2);
        totalConvertedValue.innerText = totalConverted.toFixed(2);
    }
}

// Inicializa a aplicação ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    openDB(); // Abre o IndexedDB
});
