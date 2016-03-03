# Import python test framework unittest
import unittest
# Import selenium.webdriver module which provides all the WebDriver implementations
from selenium import webdriver
# Import Keys class in order to provide keys in the keyboard like RETURN, F1, ALT etc
from selenium.webdriver.common.keys import Keys

class Testing(unittest.TestCase):

  title_name = "Twidder Application"

  def setUp(self):
    # Create instance of firefox webdriver
    self.driver = webdriver.Firefox()

  def test_title_name(self):
    driver = self.driver
    # Navigate to page
    driver.get("http://127.0.0.1:5000/")
    # Check if title is correct
    self.assertEqual(self.title_name, driver.title)

  def tearDown(self):
    # Close Broser Tab
    self.driver.close()

if __name__ == "__main__":
  unittest.main()
