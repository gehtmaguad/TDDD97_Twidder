from geventwebsocket.handler import WebSocketHandler
from gevent import pywsgi
import gevent

from flask import app, request
from twidder import app

import database_helper
import json

import string
import random

logged_in_users = []
password_length = 8

@app.before_request
def before_request():
  database_helper.connect_db()

@app.teardown_request
def teardown_request(exception):
  database_helper.close_db()

@app.route('/')
def root():
  return app.send_static_file('client.html')

@app.route('/wssignin/')
def wssignin():
  if request.environ.get('wsgi.websocket'):
    ws = request.environ['wsgi.websocket']
    while True:
      message = ws.receive()
      message = json.loads(message)
      print json.dumps(message)
      print "SENDING MESSAGE"
      ws.send(json.dumps(message))
      print "MESSAGE SENT"
    ws.close()
  return True

# Signin User based on email and password
@app.route('/signin/', methods=['POST'])
def sign_in():

  # Get email and password from form
  email = request.json['email']
  password = request.json['password']

  # Create empty dictionary for storing return data
  data = {}

  # Get user from database
  dataset = database_helper.get_user(email)

  # Check if database call was successfull
  if (dataset != None):
    # Check if password from form is same as in database
    if (password == dataset[2]):

      # Create session token
      token = "ABCDEFG1234" #TEMP
      #token = token_generator()

      # Pass success data to dictionary
      data['success'] = True
      data['message'] = 'Successfully signed in'
      data['data'] = token

      # Append the user to the list of logged in users
      logged_in_users.append({'email':email,'token':token})
    else:
      # In case password is not the same provide error information
      data['success'] = False
      data['message'] = 'Wrong username or password'
  else:

    # In case user can't be fetched from database provide error information
    data['success'] = False
    data['message'] = 'Wrong username or password'

  # return the dataset as json data
  return json.dumps(data)

# Signup user based on provided form data
@app.route('/signup/', methods=['POST'])
def sign_up():

  # Get data from form
  email = request.json['email']
  password = request.json['password']
  firstname = request.json['firstname']
  familyname = request.json['familyname']
  gender = request.json['gender']
  city = request.json['city']
  country = request.json['country']

  # Create empty dictionary for storing return data
  data = {}

  # Validation: Check if password is long enough
  if (len(password) < password_length):
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Password must have at least ' + str(password_length) + ' characters.' 
    # return the dataset as json data
    return json.dumps(data)

  # Validation: Check if user is already registered
  dataset = database_helper.get_user(email)
  if (dataset != None):
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'User is already registered.' 
    # return the dataset as json data
    return json.dumps(data)

  # Add User to the database
  database_helper.add_user( \
    email, password, firstname, familyname, gender, city, country )

  # Pass success data to dictionary
  data['success'] = True
  data['message'] = 'Successfully signed up'
  # return the dataset as json data
  return json.dumps(data)

# Signout user based on token
@app.route('/signout/', methods=['POST'])
def sign_out():

  # Get token from form
  token = request.json['token']

  # Create empty dictionary for storing return data
  data = {}

  # Check if user is logged in
  if (is_logged_in(token) == True):

    # Remove user from logged in users
    sign_out_user_by_token(token)

    # Pass success data to dictionary
    data['success'] = True
    data['message'] = 'Successfully signed out'
  else:
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Token is not valid'

  # return the dataset as json data
  return json.dumps(data)

# Change password based on form data
@app.route('/changepassword/', methods=['POST'])
def change_password():

  # Get data from form
  token = request.json['token']
  old_password = request.json['oldPassword']
  new_password = request.json['newPassword']

  # Create empty dictionary for storing return data
  data = {}

  # Validation: Check if password is long enough
  if (len(new_password) < password_length):
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Password must have at least ' + str(password_length) + ' characters.' 
    # return the dataset as json data
    return json.dumps(data)

  # Check if user is logged in
  if (is_logged_in(token) == True):
    # Get user 
    logged_in_user = get_user_by_token(token)
    email = logged_in_user['email']

    # Get Old Password from database
    result = database_helper.get_user(email)
    db_password = result[2]

    # Validate user input with database data
    if (db_password != old_password):
      # Pass error data to dictionary
      data['success'] = False
      data['message'] = 'Old password is not correct'
      # return the dataset as json data
      return json.dumps(data)

    # Change password
    database_helper.change_password(email, new_password)

    # Pass success data to dictionary
    data['success'] = True
    data['message'] = 'Successfully updated password'

  else:
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Not able to update password'

  # return the dataset as json data
  return json.dumps(data)

# Get user data by token
@app.route('/getuserdatabytoken/', methods=['POST'])
def get_user_data_by_token():

  # Get token from form
  token = request.json['token']

  # Create empty dictionary for storing return data
  data = {}

  # Check if user is logged in
  if (is_logged_in(token) == True):
    # Get user 
    logged_in_user = get_user_by_token(token)
    email = logged_in_user['email']
    user = get_user_data(email)
    if (user == None):
      # Pass error data to dictionary
      data['success'] = False
      data['message'] = 'Error retrieving user data'
      # return the dataset as json data
      return json.dumps(data)

    # Pass success data to dictionary
    data['success'] = True
    data['message'] = 'Successfully retrieved user data'
    data['data'] = user
  else:
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Error retrieving user data'

  # return the dataset as json data
  return json.dumps(data)

# Get user data by email
@app.route('/getuserdatabyemail/', methods=['POST'])
def get_user_data_by_email():

  # Get token and email from form
  token = request.json['token']
  email = request.json['email']
  
  # Create empty dictionary for storing return data
  data = {}

  # Check if user is logged in
  if (is_logged_in(token) == True):

    # Get user
    user = get_user_data(email)
    if (user == None):
      # Pass error data to dictionary
      data['success'] = False
      data['message'] = 'Error retrieving user data'
      # return the dataset as json data
      return json.dumps(data)

    # Pass success data to dictionary
    data['success'] = True
    data['success'] = True
    data['message'] = 'Successfully retrieved user data'
    data['data'] = user
  else:
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Error retrieving user data'

  # return the dataset as json data
  return json.dumps(data)

# Post message
@app.route('/postmessage/', methods=['POST'])
def post_message():

  # Get data from form
  token = request.json['token']
  receiver_email = request.json['receiverEmail']
  message = request.json['message']

  # Create empty dictionary for storing return data
  data = {}

  # Check if user with given email exists
  dataset = database_helper.get_user(receiver_email)
  if (dataset == None):
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'No user with email ' + receiver_email
    # return the dataset as json data
    return json.dumps(data)

  # Check if user is logged in
  if (is_logged_in(token) == True):
    # Get user 
    logged_in_user = get_user_by_token(token)
    sender_email = logged_in_user['email']

    # Save message to database
    database_helper.post_message(sender_email, receiver_email, message)

    # Pass success data to dictionary
    data['success'] = True
    data['message'] = 'Successfully posted message'
  else:
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Not able to post message'

  # return the dataset as json data
  return json.dumps(data)

# Get mesage by token
@app.route('/getusermessagesbytoken/', methods=['POST'])
def get_user_messages_by_token():

  # Get token from form
  token = request.json['token']

  # Create empty dictionary for storing return data
  data = {}

  # Create empty list for storing messages dictionaries
  messages = []

  # Check if user is logged in
  if (is_logged_in(token) == True):
    # Get user 
    logged_in_user = get_user_by_token(token)
    email = logged_in_user['email']

    # Get Messages for logged in user and append them to messages dict
    result = database_helper.get_messages(email)
    for element in result:
      message = {}
      message['sender_email'] = element[1]
      message['receiver_email'] = element[2]
      message['message'] = element[3]
      messages.append(message)

    # Pass success data to dictionary
    data['success'] = True
    data['message'] = 'Successfully retrieved messages'
    data['data'] = messages

  else:
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Not able to get messages'

  # return the dataset as json data
  return json.dumps(data)

# Get messages by email
@app.route('/getusermessagesbyemail/', methods=['POST'])
def get_user_messages_by_email():

  # Get data from form
  token = request.json['token']
  email = request.json['email']

  # Create empty dictionary for storing return data
  data = {}

  # Check if user with given email exists
  dataset = database_helper.get_user(email)
  if (dataset == None):
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'No user with email ' + email
    # return the dataset as json data
    return json.dumps(data)

  # Create empty list for storing messages dictionaries
  messages = []

  # Check if user is logged in
  if (is_logged_in(token) == True):

    result = database_helper.get_messages(email)
    for element in result:
      message = {}
      message['sender_email'] = element[1]
      message['receiver_email'] = element[2]
      message['message'] = element[3]
      messages.append(message)

    # Pass success data to dictionary
    data['success'] = True
    data['message'] = 'Successfully retrieved messages'
    data['data'] = messages

  else:
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Not able to get messages'

  # return the dataset as json data
  return json.dumps(data)

# privat, generate random token
def token_generator(size=20):
  chars = string.ascii_uppercase + string.digits
  return ''.join(random.choice(chars) for _ in range(size))

# private, check if user is loggedin based on token
def is_logged_in(token):
  global logged_in_users
  if (any(logged_in_user['token'] == token for logged_in_user in logged_in_users) == True):
    return True
  else:
    return False

# private, remove user from logged in users by token
def sign_out_user_by_token(token):
  global logged_in_users
  logged_in_users = [logged_in_user for logged_in_user in logged_in_users if logged_in_user.get('token') != token]

# private, return user from logged in users
def get_user_by_token(token):
  global logged_in_users
  logged_in_user = [logged_in_user for logged_in_user in logged_in_users if logged_in_user.get('token') == token][0]
  return logged_in_user

# private, get user data as dictionary
def get_user_data(email):
    # Get user data from database
    result = database_helper.get_user(email)
    if (result == None):
      return None

    user = {}
    user['email'] = result[1]
    user['firstname'] = result[3]
    user['familyname'] = result[4]
    user['gender'] = result[5]
    user['city'] = result[6]
    user['country'] = result[7]
    return user
