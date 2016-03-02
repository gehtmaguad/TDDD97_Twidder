import sqlite3
from flask import g

DATABASE = './twidder/database.db'

def connect_db():
  return sqlite3.connect(DATABASE)

def close_db():
  conn = get_db()
  conn.close()

def get_db():
  db = getattr(g, 'db', None)
  if db is None:
    db = g.db = connect_db()
  return db

def add_user(email, password, firstname, familyname, gender, city, country):
  conn = get_db()
  cursor = conn.cursor()
  cursor.execute('INSERT INTO user (email, password, firstname, \
    familyname, gender, city, country) values (?,?,?,?,?,?,?)', \
    (email, password, firstname, familyname, gender, city, country))
  conn.commit()

def get_user(email):
  conn = get_db()
  cursor = conn.cursor()
  cursor.execute('SELECT * FROM user WHERE email = ?', (email,))
  result = cursor.fetchone()
  return result

def get_users():
  conn = get_db()
  cursor = conn.cursor()
  cursor.execute('SELECT * FROM user')
  entries = cursor.fetchall()
  return entries

def change_password(email, password):
  conn = get_db()
  cursor = conn.cursor()
  cursor.execute('UPDATE user SET password = ? WHERE email = ?', (password, email))
  conn.commit()

def post_message(sender_email, receiver_email, message):
  conn = get_db()
  cursor = conn.cursor()
  cursor.execute('INSERT INTO wall (from_email, to_email, message) values (?,?,?)', (sender_email, receiver_email, message))
  conn.commit()

def get_messages(email):
  conn = get_db()
  cursor = conn.cursor()
  cursor.execute('SELECT * FROM wall WHERE to_email = ?', (email,))
  result = cursor.fetchall()
  return result

def get_message_count(email):
  conn = get_db()
  cursor = conn.cursor()
  cursor.execute('SELECT count(*) FROM wall WHERE to_email = ?', (email,))
  result = cursor.fetchall()
  return result

def insert_page_view(email):
  conn = get_db()
  cursor = conn.cursor()
  cursor.execute('INSERT INTO pageviews (email) values (?)', (email,))
  conn.commit()

def get_page_view_count(email):
  conn = get_db()
  cursor = conn.cursor()
  cursor.execute('SELECT count(*) FROM pageviews WHERE email = ?', (email,))
  result = cursor.fetchall()
  return result
  
def close():
  get_db().close()
