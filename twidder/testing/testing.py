# Import python test framework unittest
import unittest
# Import selenium.webdriver module which provides all the WebDriver implementations
from selenium import webdriver
# Import Keys class in order to provide keys in the keyboard like RETURN, F1, ALT etc
from selenium.webdriver.common.keys import Keys
# Import NoSuchElementException Exception from selenium
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import ElementNotVisibleException

# Import additional python libraries
import string
import random
import time

class Testing(unittest.TestCase):

  title = "Twidder Application"
  login_err_msg = "Wrong username or password"
  signup_err_msg = "User is already registered."

  # Login user data
  user = "foo@bar.com"
  password = "test1234"
  wrong_pwd = "asdfqwer"
  
  # Signup user data
  firstName = "Foo"
  familyName = "Bar"
  city = "FooBar"
  country = "FooBar"
  random_string = ''.join(random.choice(string.ascii_uppercase) for _ in range(8))
  email = "foo@" + random_string + ".com"
  existing_email = user
  message = "testmessage" + ''.join(random.choice(string.ascii_uppercase) for _ in range(20))

  def setUp(self):
    # Create instance of firefox webdriver
    self.driver = webdriver.Firefox()
    # Navigate to page
    self.driver.get("http://127.0.0.1:5000/")

  def test_title(self):
    driver = self.driver
    # Check if title is correct
    self.assertEqual(self.title, driver.title)

  def test_login_and_logout(self):
    driver = self.driver
    # Get login fields
    loginEmailElement = driver.find_element_by_name("loginEmail")
    loginPasswordElement = driver.find_element_by_name("loginPassword")
    # Enter login credentials
    loginEmailElement.send_keys(self.user)
    loginPasswordElement.send_keys(self.password)
    # Submit form
    driver.find_element_by_id("loginSubmit").click()
    # Try to get loginEmailElement again, if thats not possible
    # user is logged in because he got redirected to another page
    try:
      driver.find_element_by_name("loginEmail")
      result = "gotLoginEmailElement"
    except NoSuchElementException, e:
      result = "NoSuchElementException"
    self.assertEqual("NoSuchElementException", result)
    # Switch to account tab
    driver.find_element_by_id("accountButton").click()
    # LogOut
    driver.find_element_by_id("signOutButton").click()
    # Try to get loginEmailElement again, if thats not possible
    # user is still logged in because he got not redirected to login page
    try:
      driver.find_element_by_name("loginEmail")
      result = "gotLoginEmailElement"
    except NoSuchElementException, e:
      result = "NoSuchElementException"
    self.assertEqual("gotLoginEmailElement", result)

  def test_login_with_wrong_password(self):
    driver = self.driver
    # Get login fields
    loginEmailElement = driver.find_element_by_name("loginEmail")
    loginPasswordElement = driver.find_element_by_name("loginPassword")
    # Enter login credentials
    loginEmailElement.send_keys(self.user)
    loginPasswordElement.send_keys(self.wrong_pwd)
    # Submit form
    driver.find_element_by_id("loginSubmit").click()
    # Get error message element
    errorMessageText = driver.find_element_by_id("valErrMsgSigninForm").text
    # Check if error message is correct
    self.assertEqual(self.login_err_msg, errorMessageText)

  def test_sign_up(self):
    driver = self.driver

    # Get signup fields
    firstNameElement = driver.find_element_by_name("firstName")
    familyNameElement = driver.find_element_by_name("familyName")
    genderElement = driver.find_element_by_name("gender")
    genderOptions = genderElement.find_elements_by_tag_name("option")
    cityElement = driver.find_element_by_name("city")
    countryElement = driver.find_element_by_name("country")
    emailElement = driver.find_element_by_name("email")
    passwordElement = driver.find_element_by_name("password")
    repeatPswElement = driver.find_element_by_name("repeatPsw")

    # Fill out signup fields
    firstNameElement.send_keys(self.firstName)
    familyNameElement.send_keys(self.familyName)
    genderOptions[1].click()
    cityElement.send_keys(self.city)
    countryElement.send_keys(self.country)
    emailElement.send_keys(self.email)
    passwordElement.send_keys(self.password)
    repeatPswElement.send_keys(self.password)

    # Submit form -> User should get redirected
    driver.find_element_by_id("signupSubmit").click()
    # Delay program in order to make sure everything is loaded
    time.sleep(2)
    # try to get tabular_bar element which proofs that user is logged in
    try:
      driver.find_element_by_id("tabular_bar")
      result = "gotTabularBarElement"
    except NoSuchElementException, e:
      result = "NoSuchElementException"
    self.assertEqual("gotTabularBarElement", result)

    # Switch to account tab
    driver.find_element_by_id("accountButton").click()
    # LogOut
    driver.find_element_by_id("signOutButton").click()
    # Try to get loginEmailElement again, if thats not possible
    # user is still logged in because he got not redirected to login page
    try:
      driver.find_element_by_name("loginEmail")
      result = "gotLoginEmailElement"
    except NoSuchElementException, e:
      result = "NoSuchElementException"
    self.assertEqual("gotLoginEmailElement", result)

  def test_sign_up_with_existing_mail(self):
    driver = self.driver

    # Get signup fields
    firstNameElement = driver.find_element_by_name("firstName")
    familyNameElement = driver.find_element_by_name("familyName")
    genderElement = driver.find_element_by_name("gender")
    genderOptions = genderElement.find_elements_by_tag_name("option")
    cityElement = driver.find_element_by_name("city")
    countryElement = driver.find_element_by_name("country")
    emailElement = driver.find_element_by_name("email")
    passwordElement = driver.find_element_by_name("password")
    repeatPswElement = driver.find_element_by_name("repeatPsw")

    # Fill out signup fields
    firstNameElement.send_keys(self.firstName)
    familyNameElement.send_keys(self.familyName)
    genderOptions[1].click()
    cityElement.send_keys(self.city)
    countryElement.send_keys(self.country)
    emailElement.send_keys(self.existing_email)
    passwordElement.send_keys(self.password)
    repeatPswElement.send_keys(self.password)

    # Submit form
    driver.find_element_by_id("signupSubmit").click()
    errorMessageText = driver.find_element_by_id("valErrMsgSignupForm").text
    # Check if error message is correct
    self.assertEqual(self.signup_err_msg, errorMessageText)

  def test_message_posting(self):
    driver = self.driver

    ## Login
    # Get login fields
    loginEmailElement = driver.find_element_by_name("loginEmail")
    loginPasswordElement = driver.find_element_by_name("loginPassword")
    # Enter login credentials
    loginEmailElement.send_keys(self.user)
    loginPasswordElement.send_keys(self.password)
    # Submit form
    driver.find_element_by_id("loginSubmit").click()
    # Try to get loginEmailElement again, if thats not possible
    # user is logged in because he got redirected to another page
    try:
      driver.find_element_by_name("loginEmail")
      result = "gotLoginEmailElement"
    except NoSuchElementException, e:
      result = "NoSuchElementException"
    self.assertEqual("NoSuchElementException", result)

    ## Search for user
    # Switch to browse tab
    driver.find_element_by_id("browseButton").click()
    # Get email search field
    searchEmailElement = driver.find_element_by_name("findByEmail")
    # Enter email address
    searchEmailElement.send_keys(self.user)
    # Submit form
    driver.find_element_by_id("searchSubmit").click()

    ## Post message to wall

    # Get post message field
    postMessageElement = driver.find_element_by_id("browsePost")
    # Post message
    postMessageElement.send_keys(self.message)
    # Submit form
    driver.find_element_by_id("postMessageSubmit").click()

    # Check for message on the wall
    result = ""
    try:
      driver.find_elements_by_xpath("//*[contains(text(), " + self.message + ")]")
      result = "gotTextElement"
    except NoSuchElementException, e:
      result = "NoSuchElementException"
    self.assertEqual("gotTextElement", result)

    ## Logout
    # Switch to account tab
    driver.find_element_by_id("accountButton").click()
    # LogOut
    driver.find_element_by_id("signOutButton").click()
    # Try to get loginEmailElement again, if thats not possible
    # user is still logged in because he got not redirected to login page
    result = ""
    try:
      driver.find_element_by_name("loginEmail")
      result = "gotLoginEmailElement"
    except NoSuchElementException, e:
      result = "NoSuchElementException"
    self.assertEqual("gotLoginEmailElement", result)

  def tearDown(self):
    # Close Broser Tab
    self.driver.close()

if __name__ == "__main__":
  unittest.main()
