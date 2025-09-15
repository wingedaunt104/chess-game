from flask import Flask, request, jsonify, session, render_template
from flask_cors import CORS
import sqlite3
import bcrypt
from flask import send_from_directory
import os
app = Flask(__name__, static_folder='static', template_folder='templates')
app.config.update(
    SESSION_COOKIE_SAMESITE="None",
    SESSION_COOKIE_SECURE=True
)
app.secret_key = 'Gillian2'
CORS(app, supports_credentials=True)
user_cache = {}

def init_db():
    conn = sqlite3.connect('chess_users.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0
    )''')
    conn.commit()
    conn.close()
init_db()

def get_user(username):
    if username in user_cache:
        return user_cache[username]
    conn = sqlite3.connect('chess_users.db')
    c = conn.cursor()
    c.execute("SELECT username, wins, losses FROM users WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()
    if row:
        user_cache[username] = {'username': row[0], 'wins': row[1], 'losses': row[2]}
        return user_cache[username]
    return None
def update_cache(username, wins=None, losses=None):
    if username in user_cache:
        if wins is not None:
            user_cache[username]['wins'] = wins
        if losses is not None:
            user_cache[username]['losses'] = losses
#routes
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing username or password'}),400

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    try:
        conn = sqlite3.connect('chess_users.db')
        c = conn.cursor()
        c.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username,hashed))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Registered successfully'})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 409
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    conn = sqlite3.connect('chess_users.db')
    c = conn.cursor()
    c.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()

    if row and bcrypt.checkpw(password.encode('utf-8'), row[0]):
        session['username'] = username
        return jsonify({'message': 'Login successful'})
    return jsonify({'error': 'Invalid credentials or login already exists'}), 401

@app.route('/get_stats', methods=['GET'])
def get_stats():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = get_user(session['username'])
    return jsonify(user)

@app.route('/update_result', methods=['POST'])
def update_result():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    result = data.get('result')  # "win" or "loss"

    if result not in ("win", "loss"):
        return jsonify({'error': 'Invalid result'}), 400

    conn = sqlite3.connect('chess_users.db')
    c = conn.cursor()
    if result == 'win':
        c.execute("UPDATE users SET wins = wins + 1 WHERE username = ?", (session['username'],))
    else:
        c.execute("UPDATE users SET losses = losses + 1 WHERE username = ?", (session['username'],))
    conn.commit()

    # Get updated stats
    c.execute("SELECT wins, losses FROM users WHERE username = ?", (session['username'],))
    wins, losses = c.fetchone()
    conn.close()

    update_cache(session['username'], wins=wins, losses=losses)

    return jsonify({'message': 'Result updated', 'wins': wins, 'losses': losses})
@app.route('/')
def home():
    return render_template("index.html")
if __name__ == '__main__':
    app.run(debug=True)
