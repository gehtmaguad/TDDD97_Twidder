displayView = function(){
// the code required to display a view
};
window.onload = function(){
    /* If there does not exist a token in the local storage,
     then the welcomeView is displayed otherwise profileView is displayed
      */
    if (localStorage.getItem("token") === null) {
        welcomeView();
    } else {
        profileView();
    }
};

// privat; injects welcomeView into activeView
welcomeView = function() {
    document.getElementById("activeView").innerHTML = document.getElementById("welcomeView").innerHTML;
}

// privat; injects profileView into activeView
profileView = function() {
    document.getElementById("activeView").innerHTML = document.getElementById("profileView").innerHTML;
    changeActiveProfileViewTab(localStorage.getItem('tab'));
}

/* signUpUser() user gets signed up and signed in or error in html field is set */
function signUpUser() {

    // Get Password and Email Form Values
    var password = document.forms['signupForm']['password'].value;
    var repeatPsw = document.forms['signupForm']['repeatPsw'].value;
    var username = document.forms['signupForm']['email'].value;

    // Check Password Length
    if (checkPwdLength(password) === false) {
        document.getElementById('valErrMsgSignupForm').innerHTML = "PWD requires >= 8 chars";
        return false;
    }

    // Compare Password Fields
    if (comparePwd(password, repeatPsw) === false) {
        document.getElementById('valErrMsgSignupForm').innerHTML = "Same PWD required";
        return false;
    }

    // Get Form Values and create formData Object
    var userdata = {
        email:document.forms['signupForm']['email'].value,
        password:document.forms['signupForm']['password'].value,
        firstname:document.forms['signupForm']['firstName'].value,
        familyname:document.forms['signupForm']['familyName'].value,
        gender:document.forms['signupForm']['gender'].value,
        city:document.forms['signupForm']['city'].value,
        country:document.forms['signupForm']['country'].value
    };

    // SignUp and SignIn User
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    con.open("POST", '/signup/', true); // Create asynchronous Post Request to Server Resource
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        // Check response status
        if (serverResponse.success === true) {

          // SignIn User
          var con2 = new XMLHttpRequest(); // Create XMLHttpRequest Object
          con2.open("POST", '/signin/', true); // Create asynchronous Post Request to Server Resource
          // Specify a function which is executed each time the readyState property changes
          con2.onreadystatechange = function() {
            // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
            if (con2.readyState == 4 && con2.status == 200) {
              // Parse the JSON response from the server
              var serverResponse2 = JSON.parse(con2.responseText);
              // Check response status
              if (serverResponse2.success === true) {
                // Set Session Token
                localStorage.setItem("token", serverResponse2.data);
                // Redirect User to profileView
                profileView();
              } else {
                // inject error message into html
                document.getElementById('valErrMsgSigninForm').innerHTML = serverResponse2.message;
              }
            }
          };
          con2.setRequestHeader("Content-Type", "application/json");
          // Send JSON data to Server
          con2.send(JSON.stringify(userdata));

        } else {
          // inject error message into html
          document.getElementById('valErrMsgSignupForm').innerHTML = signUp.message;
        }
      }
    };
    con.setRequestHeader("Content-Type", "application/json");
    // Send JSON data to Server
    con.send(JSON.stringify(userdata));

    return false;
}

/* signInUser() user is signedin or error in html field is set */
function signInUser() {

    // Get Password Form Values and create javascript object
    var userdata = {
      email:document.forms['signinForm']['loginEmail'].value,
      password:document.forms['signinForm']['loginPassword'].value
    };

    // Check Password Length
    if (checkPwdLength(userdata.password) === false) {
        document.getElementById('valErrMsgRenewPwdForm').innerHTML = "PWD requires >= 8 chars";
        return false;
    }

    // SignIn User
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    con.open("POST", '/signin/', true); // Create asynchronous Post Request to Server Resource
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        // Check response status
        if (serverResponse.success === true) {
          // Set Session Token
          localStorage.setItem("token", serverResponse.data);
          // Redirect User to profileView
          profileView();

          // Opening Websocket
          var websocket = new WebSocket('ws://127.0.0.1:5000/wssignin/', ['soap']);
          // Sending data to server over websocket
          websocket.onopen = function (event) {
            websocket.send(JSON.stringify({test:'test'})); 
            console.log("send data");
            console.log(event.data);
          };
          // Receiving data from server over websocket
          websocket.onmessage = function (event) {
            console.log("received data");
            console.log(event.data);
            var msg = JSON.parse(event.data);
            console.log(msg.test);
          };

        } else {
          // inject error message into html
          document.getElementById('valErrMsgSigninForm').innerHTML = serverResponse.message;
        }
      }
    };
    con.setRequestHeader("Content-Type", "application/json");
    // Send JSON data to Server
    con.send(JSON.stringify(userdata));

    return false;
}

// privat; check if a token is available
function getTokenOrNull() {
    if (localStorage.getItem('token') === null) {
        return null;
    } else {
        return localStorage.getItem('token');
    }
}

/* resetPassword() sets a new password or error in html field is set  */
function resetPassword() {

    // Get Token. If Token is not available redirect user to welcomeView.
    var token = getTokenOrNull();
    if (token === null) {
        welcomeView();
        return false;
    }

    // Get Password Form Values and create javascript object
    userdata = {
      oldPassword:document.forms['renewPwdForm']['oldPassword'].value,
      newPassword:document.forms['renewPwdForm']['newPassword'].value,
      repeatNewPsw:document.forms['renewPwdForm']['repeatNewPsw'].value,
      token:token
    }

    // Check Password Length
    if (checkPwdLength(userdata.newPassword) === false) {
        document.getElementById('valErrMsgRenewPwdForm').innerHTML = "PWD requires >= 8 chars";
        return false;
    }

    // Compare Password Fields
    if (comparePwd(userdata.newPassword, userdata.repeatNewPsw) === false) {
        document.getElementById('valErrMsgRenewPwdForm').innerHTML = "Same PWD required";
        return false;
    }

    // Renew password
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    con.open("POST", '/changepassword/', true); // Create asynchronous Post Request to Server Resource
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        // Check response status
        if (serverResponse.success === true) {
          document.getElementById('valSucMsgRenewPwdForm').innerHTML = "Password changed!";
        } else {
          document.getElementById('valErrMsgRenewPwdForm').innerHTML = result.message;
        }
      }
    };
    con.setRequestHeader("Content-Type", "application/json");
    // Send JSON data to Server
    con.send(JSON.stringify(userdata));

    return false;
}

// private; Check if the password field and the repeatPswField match
function comparePwd(password1, password2) {
    if (password1.localeCompare(password2) != 0) {
        return false;
    } else {
        return true;
    }
}

// private; Check if the password provided by the user is long enough
function checkPwdLength(password) {
    if (password.length < 8) {
        return false;
    } else {
        return true;
    }
}

/*
 * changeActiveProfileViewTab() makes only the active Tab in the ProfileView
 * visible to the user and injects data into the html code via further functions
 */
function changeActiveProfileViewTab(tab) {
    if (tab == 'browse') {
        localStorage.setItem('tab', 'browse');
        document.getElementById('home').style.display = "none";
        document.getElementById('browse').style.display = "block";
        document.getElementById('browseContent').style.display = "none";
        document.getElementById('account').style.display = "none";
    } else if (tab == 'browseContent') {
        localStorage.setItem('tab', 'browseContent');
        document.getElementById('home').style.display = "none";
        document.getElementById('browse').style.display = "block";
        document.getElementById('browseContent').style.display = "block";
        document.getElementById('account').style.display = "none";
        injectBrowseUserData();
        injectBrowsePosts();
    } else if (tab == 'account') {
        localStorage.setItem('tab','account');
        document.getElementById('home').style.display = "none";
        document.getElementById('browse').style.display = "none";
        document.getElementById('browseContent').style.display = "none";
        document.getElementById('account').style.display = "block";
    //default is home
    } else {
        localStorage.setItem('tab','home');
        document.getElementById('home').style.display = "block";
        document.getElementById('browse').style.display = "none";
        document.getElementById('browseContent').style.display = "none";
        document.getElementById('account').style.display = "none";
        injectHomeUserData();
        injectHomePosts();
    }
}

/* signOut user get signed out or error in html field is set */
function signOut() {

    // Get Token. If Token is not available redirect user to welcomeView.
    var token = getTokenOrNull();
    if (token === null) {
        welcomeView();
        return false;
    }

    // Create javascript object
    var userdata = {
      token:token
    }

    // SignOut User
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    con.open("POST", '/signout/', true); // Create asynchronous Post Request to Server Resource
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        // Check response status
        if (serverResponse.success === true) {
          // delete localStorage objects
          cleanLocalStorage();
          // redurect user to welcomeView
          welcomeView();
        } else {
          // inject error message into html
          document.getElementById('valErrMsgRenewPwdForm').innerHTML = serverResponse.message;
        }
      }
    };
    con.setRequestHeader("Content-Type", "application/json");
    // Send JSON data to Server
    con.send(JSON.stringify(userdata));

    return false;
}

//private; remove localStorage objects
function cleanLocalStorage() {
    localStorage.removeItem('token');
    localStorage.removeItem('toEmail');
    localStorage.removeItem('tab');
}

/* postMessageFromHomeTab() gets post from form and sends it to the server */
function postMessageFromHomeTab() {

    // Get Token. If Token is not available redirect user to welcomeView.
    var token = getTokenOrNull();
    if (token === null) {
        welcomeView();
        return false;
    }

    // Get Form Value
    var post = document.forms['homePostAreaForm']['post'].value;
    var toEmail = document.forms['homePostAreaForm']['toEmail'].value;

    // Create javascript object
    userdata = {
      token:token,
      message:post,
      receiverEmail:toEmail
    }

    // Get UserData from Server
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    con.open("POST", '/postmessage/', true); // Create asynchronous Post Request to Server Resource
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        // Check response status
        if (serverResponse.success === true) {
          // Inject data into html
          document.getElementById('valSucMsgHomePostAreaForm').innerHTML = "Message posted!";
          // Clear Form
          document.forms['homePostAreaForm']['post'].value = " ";
          document.forms['homePostAreaForm']['toEmail'].value = " ";
          // Get Posts in order to show newly created posts
          injectHomePosts();
        } else {
          // inject error message into html
          document.getElementById('valErrMsgHomePostAreaForm').innerHTML = serverResponse.message;
        }
      }
    };
    con.setRequestHeader("Content-Type", "application/json");
    // Send JSON data to Server
    con.send(JSON.stringify(userdata));

    return false;
}

/* injectHomeUserData() gets UserData from signedIn User and injects it into the html code */
function injectHomeUserData() {

    // Get Token. If Token is not available redirect user to welcomeView.
    var token = getTokenOrNull();
    if (token === null) {
        welcomeView();
        return false;
    }

    // Create javascript object
    var userdata = {token:token}

    // Get UserData from Server
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    con.open("POST", '/getuserdatabytoken/', true); // Create asynchronous Post Request to Server Resource
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        // Check response status
        if (serverResponse.success === true) {
          // Inject the userdata into html
          document.getElementById("homeFirstname").innerHTML = serverResponse.data.firstname;
          document.getElementById("homeFamilyname").innerHTML = serverResponse.data.familyname;
          document.getElementById("homeGender").innerHTML = serverResponse.data.gender;
          document.getElementById("homeCity").innerHTML = serverResponse.data.city;
          document.getElementById("homeCountry").innerHTML = serverResponse.data.country;
          document.getElementById("homeEmail").innerHTML = serverResponse.data.email;
        } else {
          // inject error message into html
          document.getElementById('valErrMsgHomePostAreaForm').innerHTML = serverResponse.message;
        }
      }
    };
    con.setRequestHeader("Content-Type", "application/json");
    // Send JSON data to Server
    con.send(JSON.stringify(userdata));

    return false;
}

/* injectHomePosts() gets Posts related to the signedIn User and injects it into the html code */
function injectHomePosts() {

    // Get Token. If Token is not available redirect user to welcomeView.
    var token = getTokenOrNull();
    if (token === null) {
        welcomeView();
        return false;
    }

    var userdata = {token:token}

    // Get UserData from Server
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    con.open("POST", '/getusermessagesbytoken/', true); // Create asynchronous Post Request to Server Resource
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        // Check response status
        if (serverResponse.success === true) {
          // Remove current posts from html
          var element = document.getElementById('homeMessageWall');
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }

          // Injects retrieved posts into html
          serverResponse.data.forEach( function (arrayItem)
          {
            var para = document.createElement("p");
            var text = document.createTextNode(arrayItem.sender_email + ": " + arrayItem.message);
            para.appendChild(text);
            element.appendChild(para);
          });
        } else {
          //TODO: Else
          var dummy = "dummy";
        }
      }
    };
    con.setRequestHeader("Content-Type", "application/json");
    // Send JSON data to Server
    con.send(JSON.stringify(userdata));

}

/* displayUser() Display another User  */
function displayUser() {

    // Get email and save it in localStorage
    var email = document.forms['searchUserForm']['findByEmail'].value;
    localStorage.setItem('toEmail', email);

    // Save information that user wants to show another user and reload the view
    localStorage.setItem('tab', 'browseContent');
    profileView();

    return false;
}

/* postMessageFromBrowseTab() gets post from form and sends it to the server
 * it retrieves the email from the local storage */
function postMessageFromBrowseTab() {

    // Get Token. If Token is not available redirect user to welcomeView.
    var token = getTokenOrNull();
    if (token === null) {
        welcomeView();
        return false;
    }
    // Get Data
    var post = document.forms['browsePostAreaForm']['post'].value;
    var toEmail = localStorage.getItem('toEmail');

    // Create javascript object
    var userdata = {
      token:token,
      message:post,
      receiverEmail:toEmail
    }

    // Get UserData from Server
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    con.open("POST", '/postmessage/', true); // Create asynchronous Post Request to Server Resource
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        // Check response status
        if (serverResponse.success === true) {
          // Inject data into html
          document.getElementById('valSucMsgBrowsePostAreaForm').innerHTML = "Message posted!";
          // Clear form
          document.forms['browsePostAreaForm']['post'].value = " ";
          // Get Posts in order to show newly created posts
          injectBrowsePosts();
        } else {
          // inject error message into html
          document.getElementById('valErrMsgBrowsePostAreaForm').innerHTML = serverResponse.message;
        }
      }
    };
    con.setRequestHeader("Content-Type", "application/json");
    // Send JSON data to Server
    con.send(JSON.stringify(userdata));

    return false;
}

/* injectBrowseUserData() gets UserData from User stored in localStorage and injects it into the html code */
function injectBrowseUserData(userdata) {

    // Get Token. If Token is not available redirect user to welcomeView.
    var token = getTokenOrNull();
    if (token === null) {
        welcomeView();
        return false;
    }

    // Get Email from LocalStorage
    var email = localStorage.getItem('toEmail');

    // Create javascript object
    var userdata = {
      token:token,
      email:email
    }

    // Get UserData from Server
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    con.open("POST", '/getuserdatabyemail/', true); // Create asynchronous Post Request to Server Resource
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        // Check response status
        if (serverResponse.success === true) {
          // Inject the userdata into html
          document.getElementById("browseFirstname").innerHTML = serverResponse.data.firstname;
          document.getElementById("browseFamilyname").innerHTML = serverResponse.data.familyname;
          document.getElementById("browseGender").innerHTML = serverResponse.data.gender;
          document.getElementById("browseCity").innerHTML = serverResponse.data.city;
          document.getElementById("browseCountry").innerHTML = serverResponse.data.country;
          document.getElementById("browseEmail").innerHTML = serverResponse.data.email;
        } else {
          document.getElementById('valErrMsgSearchUserForm').innerHTML = "Email " + email + " is unknown";
        }
      }
    };
    con.setRequestHeader("Content-Type", "application/json");
    // Send JSON data to Server
    con.send(JSON.stringify(userdata));

    return false;
}

/* injectBrowsePosts()  gets Posts related to the User stored in localStorage and injects it into the html code */
function injectBrowsePosts() {

    // Get Token. If Token is not available redirect user to welcomeView.
    var token = getTokenOrNull();
    if (token === null) {
        welcomeView();
        return false;
    }

    // Get Email from LocalStorage
    var email = localStorage.getItem('toEmail');

    var userdata = {
      token:token,
      email:email
    }

    // Get UserData from Server
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    con.open("POST", '/getusermessagesbyemail/', true); // Create asynchronous Post Request to Server Resource
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        // Check response status
        if (serverResponse.success === true) {

          // Remove current posts from html
          var element = document.getElementById('browseMessageWall');
          while (element.firstChild) {
              element.removeChild(element.firstChild);
          }

          // Injects retrieved posts into html
          serverResponse.data.forEach( function (arrayItem)
          {
            var para = document.createElement("p");
            var text = document.createTextNode(arrayItem.sender_email + ": " + arrayItem.message);
            para.appendChild(text);

            element.appendChild(para);
          });

        } else {
          document.getElementById('valErrMsgSearchUserForm').innerHTML = "Could not retrieve posts from " + email;
        }
      }
    };
    con.setRequestHeader("Content-Type", "application/json");
    // Send JSON data to Server
    con.send(JSON.stringify(userdata));

    return false;
}
