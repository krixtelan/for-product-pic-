from flask import Flask, request, redirect, render_template, jsonify
import sqlite3

app = Flask(__name__)
DB_PATH = 'inventory.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

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
                stock_purchased INTEGER DEFAULT 0
            )
        ''')
        conn.commit()
        

# Redirect root to home
@app.route('/')
def root():
    return redirect('/home')

# ========== WEB PAGE ROUTES ==========

@app.route('/home')
def home():
    return render_template('home.html')

@app.route('/inventory', methods=['GET'])
def inventory():
    conn = get_db_connection()
    items = conn.execute('SELECT * FROM inventory').fetchall()
    conn.close()
    return render_template('inventory.html', items=items)

@app.route('/api/inventory')
def get_inventory():
    conn = get_db_connection()
    items = conn.execute('SELECT * FROM inventory').fetchall()
    conn.close()

    return jsonify([dict(item) for item in items])

@app.route('/decrease_quantity/<int:item_id>', methods=['POST'])
def decrease_quantity(item_id):
    try:
        conn = get_db_connection()
        # Check if there's enough stock
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
    c = conn.cursor()
    c.execute("UPDATE inventory SET quantity = quantity + ? WHERE id = ?", (qty, item_id))
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

    conn = get_db_connection()
    conn.execute('''
        INSERT INTO inventory (name, market_price, shop_price, quantity)
        VALUES (?, ?, ?, ?)
    ''', (name, market_price, shop_price, quantity))
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

if __name__ == '__main__':
    init_db()
    app.run(debug=True)


    