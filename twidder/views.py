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

@app.route('/websocket/')
def websocket():
  # Create websocket endpoint
  if request.environ.get('wsgi.websocket'):
    ws = request.environ['wsgi.websocket']
    # Listen for messages in a loop
    while True:
      # Receive data from the client
      userdata = ws.receive()
      # Parse the data
      try:
        json_userdata = json.loads(userdata)
      except:
        json_userdata = {}
        json_userdata['email'] = 'dummy'
      # Extract email from the data
      email = json_userdata['email']
      # Check if the user is logged in
      if is_logged_in_by_email(email):
        # Get userdata
        user = get_user_by_email(email) 
        # Check if the user already has a websocket session
        if ('websocket' in user and user['websocket'] != ws):
          # Create data dictionary with return data
          data = {}
          data['success'] = True
          data['message'] = "Sign out"
          # Send data to user in order to sign out on his old websocket session
          old_ws = user['websocket']
          old_ws.send(json.dumps(data))
        # Store newly creeated websocket
        store_websocket(email, ws)
    # Close Websocket
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

      # Check if user is already logged in:
      if (is_logged_in_by_email(email) == True):
        # Append new token to existing user object
        increase_session_count(email)
        # Get existing token
        token = get_user_by_email(email)['token']
      else:
        # Create session token
        token = token_generator()
        # Create new user object and add it to the list of logged in users 
        logged_in_users.append({'email':email,'token':token,'sessions':1})

      # Pass success data to dictionary
      data['success'] = True
      data['message'] = 'Successfully signed in'
      data['data'] = token

      # chartjs: Update Statistics about online users
      count = len(logged_in_users)
      for logged_in_user in logged_in_users:
        if ('websocket' in logged_in_user):
          # Form Data Object
          chartjs = {}
          chartjs['success'] = True
          chartjs['message'] = "OnlineCountChanged"
          chartjs['data'] = count
          # Get Websocket and sent data
          websocket = logged_in_user['websocket']
          if websocket is not None:
            websocket.send(json.dumps(chartjs))
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

    # Get user by token
    user = get_user_by_token(token)
    email = user['email']
    sessionCount = user['sessions']
    # Check if User has multiple sessions
    if (sessionCount > 1):
      # Decrease Session Count
      decrease_session_count(email)
    else:
      # Remove user from logged in users
      sign_out_user_by_token(token)

    # Pass success data to dictionary
    data['success'] = True
    data['message'] = 'Successfully signed out'

    # chartjs: Update Statistics about online users
    count = len(logged_in_users)
    for logged_in_user in logged_in_users:
      if ('websocket' in logged_in_user):
        # Form Data Object
        data = {}
        data['success'] = True
        data['message'] = "OnlineCountChanged"
        data['data'] = count
        # Get Websocket and sent data
        websocket = logged_in_user['websocket']
        if websocket is not None:
          websocket.send(json.dumps(data))
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
@app.route('/getuserdatabytoken/<token>', methods=['GET'])
def get_user_data_by_token(token):

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
@app.route('/getuserdatabyemail/<token>/<email>/', methods=['GET'])
def get_user_data_by_email(token, email):

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

    # chartjs: Send Update to User
    user = get_user_by_email(receiver_email)
    if ('websocket' in user):
      # Form Data Object
      chartjs = {}
      chartjs['success'] = True
      chartjs['message'] = 'MessageCountChanged'
      chartjs['data'] = database_helper.get_message_count(receiver_email)
      # Get Websocket and sent data
      websocket = user['websocket']
      if websocket is not None:
        websocket.send(json.dumps(chartjs))

  else:
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Not able to post message'

  # return the dataset as json data
  return json.dumps(data)

# Get mesage by token
@app.route('/getusermessagesbytoken/<token>/', methods=['GET'])
def get_user_messages_by_token(token):

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
@app.route('/getusermessagesbyemail/<token>/<email>/', methods=['GET'])
def get_user_messages_by_email(token, email):

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

# Get user statistics
@app.route('/getchartstats/<token>/', methods=['GET'])
def get_chart_stats(token):

  data = {}

  # Check if user is logged in
  if (is_logged_in(token) == True):

    # Get user 
    logged_in_user = get_user_by_token(token)
    email = logged_in_user['email']

    # Get Stats
    stats = {}
    stats['onlineUsers'] = len(logged_in_users)
    stats['postsOnWall'] = database_helper.get_message_count(email)

    # Pass success data to dictionary
    data['success'] = True
    data['message'] = 'userstats'
    data['data'] = stats

  else:
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Error fetching stats'

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

# private, check if user is loggedin based on email
def is_logged_in_by_email(email):
  global logged_in_users
  if (any(logged_in_user['email'] == email for logged_in_user in logged_in_users) == True):
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

# private, return user from logged in users
def get_user_by_email(email):
  global logged_in_users
  logged_in_user = [logged_in_user for logged_in_user in logged_in_users if logged_in_user.get('email') == email][0]
  return logged_in_user

# increase session count
def increase_session_count(email):
  global logged_in_users
  logged_in_user = [logged_in_user for logged_in_user in logged_in_users if logged_in_user.get('email') == email][0]
  logged_in_user['sessions'] += 1

def decrease_session_count(email):
  global logged_in_users
  logged_in_user = [logged_in_user for logged_in_user in logged_in_users if logged_in_user.get('email') == email][0]
  logged_in_user['sessions'] -= 1

# private, set websocket session for user
def store_websocket(email, session):
  global logged_in_users
  logged_in_user = [logged_in_user for logged_in_user in logged_in_users if logged_in_user.get('email') == email][0]
  logged_in_user['websocket'] = session

# private, clear websocket session for user
def remove_websocket(email, session):
  global logged_in_users
  logged_in_user = [logged_in_user for logged_in_user in logged_in_users if logged_in_user.get('email') == email][0]
  logged_in_user['websocket'] = None

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
