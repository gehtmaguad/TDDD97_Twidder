from geventwebsocket.handler import WebSocketHandler
from gevent import pywsgi
import gevent

from flask import app, request
from twidder import app

import database_helper
import json

import os
import hashlib
import base64

import string
import random
from time import gmtime, strftime

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
    salt = dataset[8]
    # Prepend the salt to password
    salted_password = salt + password
    # Hash the salted password
    hashed_password = hash_password(salted_password)

    # Check if password from form is same as in database
    if (hashed_password == dataset[2]):

      # Create a private key
      private_key = base64.b64encode(os.urandom(128))
      private_key = salt.decode("utf-8")

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
        logged_in_users.append({'email':email,'token':token,'sessions':1,'privatekey':private_key})

      # Pass success data to dictionary
      data['success'] = True
      data['message'] = 'Successfully signed in'
      data['data'] = token
      data['privatekey'] = private_key

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

  # Get hashed password and salt
  hashed_password_and_salt = hash_password_with_random_salt(password)
  salt = hashed_password_and_salt['salt']
  hashed_password = hashed_password_and_salt['hashed_password']

  # Add User to the database
  database_helper.add_user( \
    email, hashed_password, firstname, familyname, gender, city, country, salt )

  # Pass success data to dictionary
  data['success'] = True
  data['message'] = 'Successfully signed up'

  # return the dataset as json data
  return json.dumps(data)

# Signout user based on token
@app.route('/signout/', methods=['POST'])
def sign_out():

  # Get token and hashvalue from form
  token = request.json['token']
  hashvalue = request.json['hashvalue']

  # Create empty dictionary for storing return data
  data = {}

  # Check if user is logged in
  if (is_logged_in(token) == True):

    # Get user by token
    user = get_user_by_token(token)
    email = user['email']
    sessionCount = user['sessions']
    privatekey = user['privatekey']

    # Compare hash values
    if (hashvalue != hash_data(privatekey + token)):
      data['success'] = False
      data['message'] = 'Error in hash value'
    else:
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

  # if user is not logged in
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
  hashvalue = request.json['hashvalue']
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
    privatekey = logged_in_user['privatekey']

    # Compare hash values
    if (hashvalue != hash_data(privatekey + token)):
      data['success'] = False
      data['message'] = 'Error in hash value'
      return json.dumps(data)

    # Get current password and salt from database
    result = database_helper.get_user(email)
    db_password = result[2]
    salt = result[8]

    # Hash old password
    old_password = hash_password(salt + old_password)

    # Validate user input with database data
    if (db_password != old_password):
      # Pass error data to dictionary
      data['success'] = False
      data['message'] = 'Old password is not correct'
      # return the dataset as json data
      return json.dumps(data)

    # Change password
    new_password = hash_password(salt + new_password)
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
@app.route('/getuserdatabytoken/<token>/<hashvalue>/', methods=['GET'])
def get_user_data_by_token(token, hashvalue):

  # Create empty dictionary for storing return data
  data = {}

  # Check if user is logged in
  if (is_logged_in(token) == True):
    # Get user 
    logged_in_user = get_user_by_token(token)
    email = logged_in_user['email']
    privatekey = logged_in_user['privatekey']

    # Compare hash values
    if (hashvalue != hash_data(privatekey + token)):
      data['success'] = False
      data['message'] = 'Error in hash value'
      return json.dumps(data)

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
@app.route('/getuserdatabyemail/<token>/<email>/<hashvalue>/', methods=['GET'])
def get_user_data_by_email(token, email, hashvalue):

  # Create empty dictionary for storing return data
  data = {}

  # Check if user is logged in
  if (is_logged_in(token) == True):

    # Get user who initiated request
    logged_in_user = get_user_by_token(token)
    privatekey = logged_in_user['privatekey']

    # Compare hash values
    if (hashvalue != hash_data(privatekey + token)):
      data['success'] = False
      data['message'] = 'Error in hash value'
      # return the dataset as json data
      return json.dumps(data)

    # Get requested user
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

    # Update page view count
    database_helper.insert_page_view(email)
    
    # chartjs: update user page views
    if is_logged_in_by_email(email):
      logged_in_user = get_user_by_email(email)
      if ('websocket' in logged_in_user):

        # Form Data Object
        chartjs = {}
        chartjs['success'] = True
        chartjs['message'] = 'PageViewsChanged'
        chartjs['data'] = database_helper.get_page_view_count(email)
        # Get Websocket and sent data
        websocket = logged_in_user['websocket']
        if websocket is not None:
          websocket.send(json.dumps(chartjs))

        # Form Data Object
        chartjs = {}
        chartjs['success'] = True
        chartjs['message'] = 'PageViewLastDayChanged'
        chartjs['data'] = database_helper.get_page_view_history(email)[-1][1]
        # Get Websocket and sent data
        websocket = logged_in_user['websocket']
        if websocket is not None:
          websocket.send(json.dumps(chartjs))

  # if user is not logged in
  else:
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Error retrieving user data'

  # return the dataset as json data
  return json.dumps(data)

# Check if user exists
@app.route('/gettrueifuserexists/<token>/<email>/<hashvalue>/', methods=['GET'])
def get_true_if_user_exists(token, email, hashvalue):

  # Create empty dictionary for storing return data
  data = {}

  # Check if user is logged in
  if (is_logged_in(token) == True):

    # Get user who initiated request
    logged_in_user = get_user_by_token(token)
    privatekey = logged_in_user['privatekey']

    # Compare hash values
    if (hashvalue != hash_data(privatekey + token)):
      data['success'] = False
      data['message'] = 'Error in hash value'
      # return the dataset as json data
      return json.dumps(data)

    # Get requested user
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
  hashvalue = request.json['hashvalue']

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
    privatekey = logged_in_user['privatekey']

    # Compare hash values
    if (hashvalue != hash_data(privatekey + token)):
      data['success'] = False
      data['message'] = 'Error in hash value'
      return json.dumps(data)

    # Save message to database
    database_helper.post_message(sender_email, receiver_email, message)

    # Pass success data to dictionary
    data['success'] = True
    data['message'] = 'Successfully posted message'

    # chartjs: Send Update to User
    if is_logged_in_by_email(receiver_email):
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

  # if user is not logged in
  else:
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Not able to post message'

  # return the dataset as json data
  return json.dumps(data)

# Get mesage by token
@app.route('/getusermessagesbytoken/<token>/<hashvalue>/', methods=['GET'])
def get_user_messages_by_token(token, hashvalue):

  # Create empty dictionary for storing return data
  data = {}

  # Create empty list for storing messages dictionaries
  messages = []

  # Check if user is logged in
  if (is_logged_in(token) == True):
    # Get user 
    logged_in_user = get_user_by_token(token)
    email = logged_in_user['email']
    privatekey = logged_in_user['privatekey']

    # Compare hash values
    if (hashvalue != hash_data(privatekey + token)):
      data['success'] = False
      data['message'] = 'Error in hash value'
      return json.dumps(data)

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
@app.route('/getusermessagesbyemail/<token>/<email>/<hashvalue>/', methods=['GET'])
def get_user_messages_by_email(token, email, hashvalue):

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
    # Get user 
    logged_in_user = get_user_by_token(token)
    privatekey = logged_in_user['privatekey']

    # Compare hash values
    if (hashvalue != hash_data(privatekey + token)):
      data['success'] = False
      data['message'] = 'Error in hash value'
      return json.dumps(data)


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

# Get data for radar chart
@app.route('/getradarchartdata/<token>/<hashvalue>/', methods=['GET'])
def get_radar_chart_data(token, hashvalue):

  data = {}

  # Check if user is logged in
  if (is_logged_in(token) == True):

    # Get user 
    logged_in_user = get_user_by_token(token)
    email = logged_in_user['email']
    privatekey = logged_in_user['privatekey']

    # Compare hash values
    if (hashvalue != hash_data(privatekey + token)):
      data['success'] = False
      data['message'] = 'Error in hash value'
      return json.dumps(data)

    # Get Stats
    stats = {}
    stats['onlineUsers'] = len(logged_in_users)
    stats['postsOnWall'] = database_helper.get_message_count(email)
    stats['pageViews'] = database_helper.get_page_view_count(email)

    # Pass success data to dictionary
    data['success'] = True
    data['message'] = 'userstats'
    data['data'] = stats

  else:
    # Pass error data to dictionary
    data['success'] = False
    data['message'] = 'Error fetching stats'

  return json.dumps(data)

# Get data for radar chart
@app.route('/getbarchartdata/<token>/<hashvalue>/', methods=['GET'])
def get_bar_chart_data(token, hashvalue):

  data = {}

  # Check if user is logged in
  if (is_logged_in(token) == True):

    # Get user 
    logged_in_user = get_user_by_token(token)
    email = logged_in_user['email']
    privatekey = logged_in_user['privatekey']

    # Compare hash values
    if (hashvalue != hash_data(privatekey + token)):
      data['success'] = False
      data['message'] = 'Error in hash value'
      return json.dumps(data)

    # Get Stats
    result = [0, 0, 0, 0, 0]
    dataset = database_helper.get_page_view_history(email)
    if len(dataset) > 0:
      # Loop thorugh tuples and add second element to dbresult
      for element in dataset:
        result.append(element[1])
      # Pop previously added zeros from the result
      elements_count = len(dataset)
      del result[:elements_count]
      # Check if user already hat a pagehit today
      if (dataset[-1][0] != strftime("%Y%m%d", gmtime())):
        del result[:1]
        result.append(0)

    # Pass success data to dictionary
    data['success'] = True
    data['message'] = 'userstats'
    data['data'] = result

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

# private, create hashed password with a salt
def hash_password_with_random_salt(password):
  data = {}
  # Create a salt
  salt = base64.b64encode(os.urandom(128))
  salt = salt.decode("utf-8")
  # Prepend the salt to password
  salted_password = salt + password
  # Hash the salted password
  m = hashlib.sha256()
  m.update(salted_password)
  hashed_password = m.hexdigest()
  data['salt'] = salt
  data['hashed_password'] = hashed_password
  return data

# private, create hahed password from salted password
def hash_password(salted_password):
  m = hashlib.sha256()
  m.update(salted_password)
  hashed_password = m.hexdigest()
  return hashed_password

# private, hash data
def hash_data(data):
    m = hashlib.sha256()
    m.update(data)
    hashed_data = m.hexdigest()
    return hashed_data
