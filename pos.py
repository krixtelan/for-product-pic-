from flask import Flask, request, redirect, render_template, jsonify,session
import sqlite3
import json
import os

app = Flask(__name__)
DB_PATH = 'inventory.db'
app.secret_key = 'your_secret_key_here'  # <-- Add this line

UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create uploads directory if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
def add_column_if_not_exists():
    with get_db_connection() as conn:
        try:
            conn.execute('ALTER TABLE inventory ADD COLUMN image TEXT;')
            conn.commit()
        except sqlite3.OperationalError:
            # Column likely already exists
            pass

# Create DB table if not exists
def init_db():
    with get_db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                market_price REAL NOT NULL,
                shop_price REAL NOT NULL,
                quantity INTEGER NOT NULL,
                stock_purchased INTEGER DEFAULT 0,
                image TEXT  -- <-- added field for image
            )
        ''')
        conn.commit()

#for cashier log in
def init_cashier_db():
    with get_db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS cashiers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                fullname TEXT NOT NULL
            )
        ''')
        conn.commit()

@app.route('/cashier/register', methods=['POST'])
def register_cashier():
    data = request.json
    username = data['username']
    password = data['password']
    fullname = data['fullname']
    with get_db_connection() as conn:
        try:
            conn.execute('INSERT INTO cashiers (username, password, fullname) VALUES (?, ?, ?)',
                         (username, password, fullname))
            conn.commit()
            return jsonify({'status': 'success', 'message': 'Cashier registered'})
        except sqlite3.IntegrityError:
            return jsonify({'status': 'error', 'message': 'Username already exists'})

@app.route('/cashier/login', methods=['POST'])
def login_cashier():
    data = request.json
    username = data['username']
    password = data['password']
    with get_db_connection() as conn:
        row = conn.execute('SELECT * FROM cashiers WHERE username = ?', (username,)).fetchone()
        if row and row['password'] == password:
            session['user'] = row['username']
            session['role'] = 'cashier'
            session['fullname'] = row['fullname']
            return jsonify({'status': 'success', 'fullname': row['fullname']})
        else:
            return jsonify({'status': 'error', 'message': 'Invalid credentials'})

@app.route('/cashier/logout')
def logout_cashier():
    session.clear()
    return jsonify({'status': 'success'})

@app.route('/pos')
def pos():
    if session.get('role') == 'cashier':
        fullname = session.get('fullname')
        return render_template('home.html', fullname=fullname)
    else:
        return redirect('/home')
    
@app.route('/home')
def home():
    if session.get('role') == 'cashier':
        return redirect('/pos')
    return render_template('home.html')

@app.route('/check_session')
def check_session():
    if 'user' in session and session.get('role') == 'cashier':
        return jsonify({'loggedIn': True, 'fullname': session.get('fullname')})
    return jsonify({'loggedIn': False})

@app.route('/')
def root():
    return redirect('/home')

# ========== WEB PAGE ROUTES ==========


@app.route('/inventory', methods=['GET'])
def inventory():
    conn = get_db_connection()
    items = conn.execute('SELECT * FROM inventory').fetchall()
    conn.close()
    return render_template('inventory.html', items=items)

@app.route('/api/inventory')
def get_inventory():
    conn = get_db_connection()
    items = conn.execute('SELECT id, name, market_price, shop_price, quantity, image FROM inventory').fetchall()
    conn.close()

    return jsonify([dict(item) for item in items])

@app.route('/api/stock_levels')
def stock_levels():
    with get_db_connection() as conn:
        total_products = conn.execute('SELECT COUNT(*) FROM inventory').fetchone()[0]
        in_stock = conn.execute('SELECT COUNT(*) FROM inventory WHERE quantity > 10').fetchone()[0]
        low_stock = conn.execute('SELECT COUNT(*) FROM inventory WHERE quantity > 0 AND quantity <= 10').fetchone()[0]
        out_of_stock = conn.execute('SELECT COUNT(*) FROM inventory WHERE quantity = 0').fetchone()[0]

        detailed_products = conn.execute('SELECT name, quantity, market_price, shop_price FROM inventory').fetchall()

        # Prepare detailed_products with profit margin
        detailed_products_list = []
        for prod in detailed_products:
            market_price = prod['market_price']
            shop_price = prod['shop_price']
            if market_price and market_price != 0:
                profit_margin = ((shop_price-market_price) / shop_price) * 100
            else:
                profit_margin = 0
            detailed_products_list.append({
                'name': prod['name'],
                'quantity': prod['quantity'],
                'market_price': market_price,
                'shop_price': shop_price,
                'status': 'In Stock' if prod['quantity'] > 10 else 'Low Stock' if prod['quantity'] > 0 else 'Out of Stock',
                'profit_margin': profit_margin
            })

    return jsonify({
        'stock_info': {
            'total_products': total_products,
            'in_stock': in_stock,
            'low_stock': low_stock,
            'out_of_stock': out_of_stock
        },
        'detailed_products': detailed_products_list
    })



@app.route('/decrease_quantity/<int:item_id>', methods=['POST'])
def decrease_quantity(item_id):
    try:
        conn = get_db_connection()
        item = conn.execute('SELECT quantity FROM inventory WHERE id = ?', (item_id,)).fetchone()
        if item and item['quantity'] > 0:
            conn.execute('UPDATE inventory SET quantity = quantity - 1 WHERE id = ?', (item_id,))
            conn.commit()
            conn.close()
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': 'Out of stock'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/increase_quantity/<int:item_id>/<int:qty>', methods=['POST'])
def increase_quantity(item_id, qty):
    conn = get_db_connection()
    conn.execute("UPDATE inventory SET quantity = quantity + ? WHERE id = ?", (qty, item_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/sales')
def sales():
    return render_template('sales.html')

@app.route('/about')
def about():
    return render_template('about.html')

# ========== API ROUTES ==========

@app.route('/add_item', methods=['POST'])
def add_item():
    name = request.form['name']
    market_price = float(request.form['market_price'])
    shop_price = float(request.form['shop_price'])
    quantity = int(request.form['quantity'])
    image = request.files.get('image')
    
    if image and allowed_file(image.filename):
        image_filename = image.filename
        image.save(os.path.join(app.config['UPLOAD_FOLDER'], image_filename))
    else:
        image_filename = None  # Handle case where there's no valid image

    conn = get_db_connection()
    conn.execute('''
        INSERT INTO inventory (name, market_price, shop_price, quantity, image)
        VALUES (?, ?, ?, ?, ?)
    ''', (name, market_price, shop_price, quantity, image_filename))
    conn.commit()
    conn.close()

    return redirect('/inventory')

@app.route('/edit_item/<int:item_id>', methods=['POST'])
def edit_item(item_id):
    name = request.form['name']
    market_price = float(request.form['market_price'])
    shop_price = float(request.form['shop_price'])
    quantity = int(request.form['quantity'])
    stock_purchased = request.form.get('stock_purchased')

    try:
        stock_purchased = int(stock_purchased) if stock_purchased else 0
    except ValueError:
        stock_purchased = 0

    conn = get_db_connection()
    if stock_purchased > 0:
        conn.execute('''
            UPDATE inventory
            SET name = ?, market_price = ?, shop_price = ?,
                quantity = quantity + ?, stock_purchased = stock_purchased + ?
            WHERE id = ?
        ''', (name, market_price, shop_price, stock_purchased, stock_purchased, item_id))
    else:
        conn.execute('''
            UPDATE inventory
            SET name = ?, market_price = ?, shop_price = ?, quantity = ?
            WHERE id = ?
        ''', (name, market_price, shop_price, quantity, item_id))
    conn.commit()
    conn.close()

    return redirect('/inventory')

@app.route('/delete_item/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    try:
        conn = get_db_connection()
        conn.execute('DELETE FROM inventory WHERE id = ?', (item_id,))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success', 'message': 'Item deleted'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

def get_history_db_connection():
    conn = sqlite3.connect('history.db')
    conn.row_factory = sqlite3.Row  # Allows column names to be accessed as dictionary keys
    return conn

def get_history_db_connection():
    conn = sqlite3.connect('history.db')
    conn.row_factory = sqlite3.Row  # Allows column names to be accessed as dictionary keys
    return conn

def init_history_db():
    conn = get_history_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history (
            order_id TEXT PRIMARY KEY,
            date TEXT,
            cashier TEXT,
            products TEXT,
            total_amount REAL,
            cash_given REAL,
            change REAL
        )
    ''')

    conn.commit()
    conn.close()

@app.route('/save_receipt', methods=['POST'])
def save_receipt():
    data = request.json
    order_id = data['order_id']
    date = data['date']
    cashier = data['cashier']
    products = json.dumps(data['products'])  # ✅ Store as JSON string
    total_amount = data['total_amount']
    cash_given = data['cash_given']
    change = data['change']

    conn = get_history_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO history (order_id, date, cashier, products, total_amount, cash_given, change)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (order_id, date, cashier, products, total_amount, cash_given, change))

    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Receipt saved successfully"})



@app.route('/api/sales_history')
def get_sales_history():
    conn = get_history_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM history ORDER BY date DESC')
    rows = cursor.fetchall()

    orders = []
    for row in rows:
        order = {
            'order_id': row['order_id'],
            'date': row['date'],
            'cashier': row['cashier'],
            'products': json.loads(row['products']),  # Safely parse the JSON string into a dictionary
            'total_amount': row['total_amount'],
            'cash_given': row['cash_given'],
            'change': row['change'],
        }
        orders.append(order)

    conn.close()
    return jsonify(orders)


@app.route('/api/sales_summary')
def sales_summary():
    conn = get_history_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM history')
    rows = cursor.fetchall()

    total_sales = 0.0
    total_transactions = len(rows)
    total_items_sold = 0
    total_profit = 0.0

    for row in rows:
        total_sales += row['total_amount']
        try:
            products = json.loads(row['products'])
        except:
            continue

        # Handle the structure
        if isinstance(products, dict):
            product_list = products.values()
        elif isinstance(products, list):
            product_list = products
        else:
            continue

        for product in product_list:
            if isinstance(product, dict):
                qty = product.get('qty', 0)
                total_items_sold += qty
                shop_price = product.get('shop_price')
                market_price = product.get('market_price')
                if shop_price is not None and market_price is not None:
                    profit_per_item = (shop_price - market_price) * qty
                    total_profit += profit_per_item

    conn.close()

    return jsonify({
        'sales_info': {
            'total_sales': total_sales,
            'total_transactions': total_transactions,
            'total_items_sold': total_items_sold,
            'total_profit': total_profit
        }
    })

if __name__ == '__main__':
    init_db()
    init_history_db()
    init_cashier_db()
    app.run(debug=True)

    
