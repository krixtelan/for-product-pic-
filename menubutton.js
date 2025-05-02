// Menu toggle
document.getElementById('menuButton').addEventListener('click', function() {
    const menu = document.getElementById('menu');
    menu.classList.toggle('hidden');
});



// User dropdown toggle
document.getElementById('userIcon').addEventListener('click', function() {
const dropdown = document.getElementById('dropdownMenu');
dropdown.classList.toggle('active');
});

// Close dropdowns when clicking elsewhere
document.addEventListener('click', function(event) {
const userIcon = document.getElementById('userIcon');
const menuButton = document.getElementById('menuButton');
const dropdownMenu = document.getElementById('dropdownMenu');
const menu = document.getElementById('menu');

if (!userIcon.contains(event.target) && !dropdownMenu.contains(event.target)) {
    dropdownMenu.classList.remove('active');
}

if (!menuButton.contains(event.target) && !menu.contains(event.target)) {
    menu.classList.add('hidden');
}
});


// Overlay functions
function showOverlay(overlayId) {
    document.getElementById(overlayId).classList.remove('hidden');
    // Close the dropdown menu when opening an overlay
    document.getElementById('dropdownMenu').classList.remove('active');
}

function closeOverlay(overlayId) {
    document.getElementById(overlayId).classList.add('hidden');
}


// Update password function
function updatePassword() {
const current = document.querySelector('#changePasswordOverlay input:nth-of-type(1)').value;
const newPass = document.querySelector('#changePasswordOverlay input:nth-of-type(2)').value;
const confirm = document.querySelector('#changePasswordOverlay input:nth-of-type(3)').value;

const savedPassword = localStorage.getItem('savedPassword') || 'vivosmed'; // Default if not set

if (current !== savedPassword) {
    alert('Current password is incorrect.');
    return;
}

if (newPass !== confirm) {
    alert('New passwords do not match.');
    return;
}

if (newPass.trim() === '') {
    alert('Password cannot be empty.');
    return;
}


// Save the new password
localStorage.setItem('savedPassword', newPass);
alert('Password updated successfully.');
closeOverlay('changePasswordOverlay');

// Clear inputs
document.querySelector('#changePasswordOverlay input:nth-of-type(1)').value = '';
document.querySelector('#changePasswordOverlay input:nth-of-type(2)').value = '';
document.querySelector('#changePasswordOverlay input:nth-of-type(3)').value = '';
}


// Calculator functions
document.getElementById('calculatorBtn').addEventListener('click', function() {
    const calculator = document.getElementById('calculatorOverlay');
    calculator.classList.toggle('show');
});
function press(value) {
    document.getElementById('calc-display').value += value;
}
function clearCalc() {
    document.getElementById('calc-display').value = '';
}
function calculate() {
    try {
        const result = eval(document.getElementById('calc-display').value);
        document.getElementById('calc-display').value = result;
    } catch (error) {
        document.getElementById('calc-display').value = 'Error';
    }
}
function closeCalculator() {
    document.getElementById('calculatorOverlay').classList.remove('show');
}

//Search Bar
document.addEventListener('DOMContentLoaded', function () {
    const searchBar = document.getElementById('searchBar');
    const productList = document.getElementById('productList');

    // Check if searchBar and productList exist
    if (searchBar && productList) {
        searchBar.addEventListener('input', async function () {
            const query = this.value.toLowerCase();
            productList.innerHTML = ''; // Clear current product list

            try {
                const response = await fetch('/api/inventory');
                const items = await response.json();

                // Filter items based on the search query
                const filtered = items.filter(item => item.name.toLowerCase().includes(query));

                if (filtered.length === 0) {
                    productList.innerHTML = '<p>No matching products found.</p>';
                } else {
                    filtered.forEach(item => {
                        const div = document.createElement('div');
                        div.classList.add('product-item');

                        // Ensure images load correctly
                        div.innerHTML = `
                            <img src="${item.image ? '/static/uploads/' + item.image : 'path/to/default/image.png'}" alt="${item.name}" class="product-image">
                            <p class="product-name">${item.name}</p>
                            <p class="product-price">₱${item.shop_price.toFixed(2)}</p>
                            <p class="product-quantity">In Stock: <span id="stock-${item.id}">${item.quantity}</span></p>
                            <button onclick="addToReceipt(${item.id}, '${item.name}', ${item.shop_price})" ${item.quantity <= 0 ? 'disabled' : ''}>ADD</button>
                        `;
                        
                        productList.appendChild(div);
                    });
                }
            } catch (error) {
                console.error('Error fetching inventory:', error);
                productList.innerHTML = '<p>Error loading products. Please try again.</p>';
            }
        });
    }
});
// function ng pos itong dom lng  
document.addEventListener('DOMContentLoaded', () => {
    const productList = document.getElementById('productList');
    const receiptItems = document.getElementById('receiptItems');
    const totalAmount = document.getElementById('totalAmount');
    const changeAmount = document.getElementById('changeAmount');
    const cashGiven = document.getElementById('cashGiven');
    const cashWarning = document.getElementById('cashWarning');
    const receiptOverlay = document.getElementById("receiptOverlay");
    
    let cart = {};  // Initialize cart here
    let originalQuantities = {};
  
    function fetchProducts() {
        fetch('/api/inventory')
            .then(res => res.json())
            .then(data => {
                productList.innerHTML = ''; // Clear the product list
                data.forEach(item => {
                    originalQuantities[item.id] = item.quantity;
    
                    const div = document.createElement('div');
                    div.className = 'product-item';
                    div.innerHTML = `
                        <img src="${item.image ? '/static/uploads/' + item.image : 'default_image_url.jpg'}" alt="${item.name}" class="product-image">
                        <p class="product-name"><strong>${item.name}</strong><br></p>
                        <p class="product-name">₱${item.shop_price.toFixed(2)}<br></p>
                        <p class="product-name"><small>In Stock: <span id="stock-${item.id}">${item.quantity}</span></small><br></p>
                        <button onclick="addToReceipt(${item.id}, '${item.name}', ${item.shop_price})" ${item.quantity <= 0 ? 'disabled' : ''}>Add</button>
                    `;
                    productList.appendChild(div);
                });
            })
            .catch(error => console.log('Error fetching products:', error));
    }

    //for order ID 
    function generateOrderID() {
        const now = new Date();
        return `ORD-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
    }
    

    

    //reciept section 
    window.addToReceipt = function (id, name, price) {
      // Make a request to decrement stock and update cart
      fetch(`/decrease_quantity/${id}`, { method: 'POST' })
        .then(res => res.json())
        .then(response => {
          if (response.status === 'success') {
            if (!cart[id]) {
              cart[id] = { name, price, qty: 0 };
            }
            cart[id].qty += 1;
            updateReceiptTable();
            document.getElementById(`stock-${id}`).textContent = parseInt(document.getElementById(`stock-${id}`).textContent) - 1;
          } else {
            alert(response.message || 'Error adding product.');
          }
        });
    };

    function updateReceiptTable() {
      receiptItems.innerHTML = '';  // Clear the table
      let total = 0;
  
      Object.values(cart).forEach(item => {
        const row = document.createElement('tr');
        const itemTotal = item.price * item.qty;
        total += itemTotal;
  
        row.innerHTML = `
          <td>${item.name}</td>
          <td>₱${item.price.toFixed(2)}</td>
          <td>${item.qty}</td>
          <td>₱${itemTotal.toFixed(2)}</td>
        `;
        receiptItems.appendChild(row);
      });
  
      totalAmount.textContent = total.toFixed(2);
      calculateChange();
    }
  
    window.calculateChange = function () {
      const cash = parseFloat(cashGiven.value) || 0;
      const total = parseFloat(totalAmount.textContent);
      const change = cash - total;
      changeAmount.textContent = change >= 0 ? change.toFixed(2) : '0.00';
      cashWarning.style.display = change < 0 ? 'block' : 'none';
      cashWarning.textContent = change < 0 ? 'Insufficient cash given.' : '';
    };
  
    window.resetReceipt = function () {
      for (const id in cart) {
        const item = cart[id];
        const qty = item.qty;
        const stockEl = document.getElementById(`stock-${id}`);
        stockEl.textContent = parseInt(stockEl.textContent) + qty;
        fetch(`/increase_quantity/${id}/${qty}`, {
            method: 'POST'
          });
      }
      cart = {};
      updateReceiptTable();
      cashGiven.value = '';
      changeAmount.textContent = '0.00';
    };
  
    window.checkoutAndPrint = function () {
        if (Object.keys(cart).length === 0) return alert('No items to checkout.');
      
        const cashGivenValue = parseFloat(cashGiven.value) || 0;
      
        // Check if cashGiven is empty or insufficient
        if (cashGivenValue <= 0) {
          return alert('Please enter a valid amount of cash.');
        }
      
        const totalAmountValue = parseFloat(totalAmount.textContent);
        if (cashGivenValue < totalAmountValue) {
          return alert('Insufficient cash given.');
        }
      
        // Show the receipt overlay
        receiptOverlay.classList.remove("hidden");
      
        // Populate the receipt
        const receiptDate = document.getElementById('receiptDate');
        const receiptProductList = document.getElementById('receiptProductList');
        const receiptTotal = document.getElementById('receiptTotal');
        const receiptCash = document.getElementById('receiptCash');
        const receiptChange = document.getElementById('receiptChange');
      
        // Set the date and other details
        receiptDate.textContent = new Date().toLocaleDateString();
        document.getElementById('receiptCashier').textContent = 'Michelle Vivos';  // Update with actual cashier name if necessary
      
        // (for Order ID)
        const orderIdElement = document.getElementById('receiptOrderId'); // assuming you create a new <p> for this
        orderIdElement.textContent = `Order ID: ${generateOrderID()}`;


        // Populate product list in the receipt
        let receiptHTML = '';
        let total = 0;
      
        Object.values(cart).forEach(item => {
          const itemTotal = item.price * item.qty;
          total += itemTotal;
          receiptHTML += `
            <p>${item.name} - ₱${item.price.toFixed(2)} x ${item.qty} = ₱${itemTotal.toFixed(2)}</p>
          `;
        });
      
        receiptProductList.innerHTML = receiptHTML;
        receiptTotal.textContent = total.toFixed(2);
        receiptCash.textContent = cashGivenValue.toFixed(2);
        receiptChange.textContent = (cashGivenValue - total).toFixed(2);
      
                // Save receipt to backend
                fetch('/save_receipt', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      order_id: orderIdElement.textContent,
                      date: receiptDate.textContent,
                      cashier: 'Michelle Vivos', 
                      products: cart,  // <--- send products as JSON cart
                      total_amount: total,
                      cash_given: cashGivenValue,
                      change: cashGivenValue - total
                    })
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.status === 'success') {
                      alert('Receipt saved to history.');
                    } else {
                      alert('Error saving receipt.');
                    }
                  });
              
                  // Reset the receipt details and update cart
                  cart = {};  
                  updateReceiptTable();
                  cashGiven.value = '';
                  changeAmount.textContent = '0.00';
                
                  fetchProducts();  // Refresh stock values
              };
              // Initial fetch of products
              fetchProducts();
          });
          
          document.addEventListener('DOMContentLoaded', function() {
              document.getElementById('currentDate').textContent = new Date().toLocaleDateString();
          });
            

function closeReceiptOverlay() {
    document.getElementById("receiptOverlay").classList.add("hidden");
}

//inventory delete button
function deleteItem(itemId) {
    if (confirm("Are you sure you want to delete this item?")) {
        fetch(`/delete_item/${itemId}`, {
            method: "DELETE"
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert(data.message);
                location.reload();
            } else {
                alert('Error: ' + data.message);
            }
        });
    }
}

//for sales page
document.addEventListener("DOMContentLoaded", function () {
    // Set default date values (current month)
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    
    dateFrom.valueAsDate = firstDayOfMonth;
    dateTo.valueAsDate = today;
    
    // Load initial data
    loadSalesData();
    
    // Event listeners
    document.getElementById('filterBtn').addEventListener('click', loadSalesData);
    document.getElementById('resetFilterBtn').addEventListener('click', resetFilters);
});

function resetFilters() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('dateFrom').valueAsDate = firstDayOfMonth;
    document.getElementById('dateTo').valueAsDate = today;
    
    loadSalesData();
}

function loadSalesData() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    // Call backend API to get sales data
    fetch(`/api/sales?from=${dateFrom}&to=${dateTo}`)
        .then(response => response.json())
        .then(data => {
            updateSalesSummary(data.summary);
            updateTransactionsTable(data.transactions);
            updateTopProductsTable(data.topProducts);
        })
        .catch(err => {
            console.error("Error loading sales data:", err);
        });
}

function updateSalesSummary(summary) {
    document.getElementById('totalSales').textContent = summary.totalSales.toFixed(2);
    document.getElementById('transactionCount').textContent = summary.transactionCount;
    document.getElementById('itemsSold').textContent = summary.itemsSold;
    document.getElementById('totalProfit').textContent = summary.totalProfit.toFixed(2);
}

function updateTransactionsTable(transactions) {
    const tableBody = document.getElementById('transactionsTableBody');
    tableBody.innerHTML = '';
    
    if (transactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" style="text-align: center;">No transactions found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        // Format date and time
        const date = new Date(transaction.timestamp * 1000);
        const formattedDate = date.toLocaleDateString();
        const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${formattedDate}</td>
            <td>${formattedTime}</td>
            <td>${transaction.itemCount} items</td>
            <td>₱${transaction.total.toFixed(2)}</td>
            <td>
                <button class="action-btn" onclick="viewTransactionDetails(${transaction.id})">View</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function updateTopProductsTable(products) {
    const tableBody = document.getElementById('topProductsTableBody');
    tableBody.innerHTML = '';
    
    if (products.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" style="text-align: center;">No product data available</td>';
        tableBody.appendChild(row);
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.unitsSold}</td>
            <td>₱${product.revenue.toFixed(2)}</td>
            <td>₱${product.profit.toFixed(2)}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function viewTransactionDetails(transactionId) {
    // Fetch transaction details from backend
    fetch(`/api/transaction/${transactionId}`)
        .then(response => response.json())
        .then(data => {
            displayTransactionDetails(data);
        })
        .catch(err => {
            console.error("Error fetching transaction details:", err);
        });
}

function displayTransactionDetails(transaction) {
    document.getElementById('transactionId').textContent = transaction.id;
    document.getElementById('detailDate').textContent = new Date(transaction.timestamp * 1000).toLocaleDateString();
    document.getElementById('detailTime').textContent = new Date(transaction.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('detailCashier').textContent = transaction.cashier;
    document.getElementById('detailTotal').textContent = transaction.total.toFixed(2);
    document.getElementById('detailCash').textContent = transaction.cash.toFixed(2);
    document.getElementById('detailChange').textContent = transaction.change.toFixed(2);
    
    // Populate items table
    const itemsBody = document.getElementById('transactionItemsBody');
    itemsBody.innerHTML = '';
    
    transaction.items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>₱${item.price.toFixed(2)}</td>
            <td>₱${(item.price * item.quantity).toFixed(2)}</td>
        `;
        
        itemsBody.appendChild(row);
    });
    
    showOverlay('transactionDetailsOverlay');
}

function printTransactionDetails() {
    const printWindow = window.open('', '_blank');
    
    const transactionId = document.getElementById('transactionId').textContent;
    const date = document.getElementById('detailDate').textContent;
    const time = document.getElementById('detailTime').textContent;
    const cashier = document.getElementById('detailCashier').textContent;
    const total = document.getElementById('detailTotal').textContent;
    const cash = document.getElementById('detailCash').textContent;
    const change = document.getElementById('detailChange').textContent;
    
    const itemsTable = document.getElementById('transactionItemsTable').cloneNode(true);
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Transaction #${transactionId}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h2 { text-align: center; }
                .header { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .footer { margin-top: 30px; }
                .text-right { text-align: right; }
                .company-name { font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="company-name">VIVOS MEDICAL SUPPLIES TRADING</div>
            <h2>Transaction Receipt #${transactionId}</h2>
            
            <div class="header">
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Time:</strong> ${time}</p>
                <p><strong>Cashier:</strong> ${cashier}</p>
            </div>
            
            ${itemsTable.outerHTML}
            
            <div class="footer">
                <p><strong>Total:</strong> ₱${total}</p>
                <p><strong>Cash:</strong> ₱${cash}</p>
                <p><strong>Change:</strong> ₱${change}</p>
            </div>
            
            <p style="text-align: center; margin-top: 50px;">Thank you for your purchase!</p>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

// para sa log in page 
// Default password (set this only if there's no stored password yet)
if (!localStorage.getItem("posPassword")) {
localStorage.setItem("posPassword", "vivosmed"); // Default password
}

// Check login state on page load
window.onload = function () {
if (localStorage.getItem("isLoggedIn") === "true") {
    showApp();
} else {
    showLogin();
}
};

function login() {
const enteredPassword = document.getElementById("loginPassword").value;
const storedPassword = localStorage.getItem("posPassword");

if (enteredPassword === storedPassword) {
    localStorage.setItem("isLoggedIn", "true");
    showApp();
} else {
    document.getElementById("loginMsg").innerText = "Incorrect password.";
}
}

function logout() {
localStorage.removeItem("isLoggedIn");
showLogin();
}

function showApp() {
document.getElementById("login-section").style.display = "none";
document.querySelector(".header-wrapper").style.display = "block";
document.querySelector(".content-wrapper").style.display = "block";
}

function showLogin() {
document.getElementById("login-section").style.display = "flex"; // assuming it's a flex container
document.querySelector(".header-wrapper").style.display = "none";
document.querySelector(".content-wrapper").style.display = "none";
}

function updatePassword() {
const inputs = document.querySelectorAll("#changePasswordOverlay input");
const currentPass = inputs[0].value;
const newPass = inputs[1].value;
const confirmPass = inputs[2].value;
const storedPassword = localStorage.getItem("posPassword");

if (currentPass !== storedPassword) {
    alert("Current password is incorrect.");
    return;
}

if (newPass !== confirmPass) {
    alert("New passwords do not match.");
    return;
}

localStorage.setItem("posPassword", newPass);
alert("Password successfully updated!");
closeOverlay('changePasswordOverlay');
}

function closeOverlay(id) {
document.getElementById(id).classList.add("hidden");
}

function showOverlay(id) {
document.getElementById(id).classList.remove("hidden");
}

// Attach logout button listener
document.getElementById("logoutBtn").addEventListener("click", logout);

//low stock functionality
document.addEventListener('DOMContentLoaded', () => {
    const warningThreshold = 10;
    const originalAddToReceipt = window.addToReceipt;

    window.addToReceipt = function (id, name, price) {
        originalAddToReceipt(id, name, price);

        setTimeout(() => {
            const stockEl = document.getElementById(`stock-${id}`);
            if (stockEl) {
                const currentStock = parseInt(stockEl.textContent);
                if (currentStock === warningThreshold) {
                    alert(`⚠️ LOW STOCK ALERT: '${name}' has only ${currentStock} items remaining. Please restock soon.`);
                }
            }
        }, 100);
    };
});
