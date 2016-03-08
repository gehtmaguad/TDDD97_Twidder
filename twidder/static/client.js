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
    localStorage.setItem('showBrowseContent', 'false');
}

// privat; injects profileView into activeView
profileView = function() {
    document.getElementById("activeView").innerHTML = document.getElementById("profileView").innerHTML;
    createRadarChart()
    createBarChart()
    changeActiveProfileViewTab(localStorage.getItem('tab'));
}

/*
 * privat; changeActiveProfileViewTab() makes only the active Tab in the ProfileView
 * visible to the user and injects data into the html code via further functions
 */
function changeActiveProfileViewTab(tab) {
    if (tab == 'browse') {
        localStorage.setItem('tab', 'browse');
        document.getElementById('home').style.display = "none";
        document.getElementById('browse').style.display = "block";
        document.getElementById('account').style.display = "none";
        document.getElementById('chartjs').style.display = "none";
        document.getElementById('browseButton').style.background = '#58D3F7';
        document.getElementById('homeButton').style.background = '#FCFCFC';
        document.getElementById('accountButton').style.background = '#FCFCFC';
        document.getElementById('chartjsButton').style.background = '#FCFCFC';
        if (localStorage.getItem('showBrowseContent') === 'true') {
          document.getElementById('browseContent').style.display = "block";
          injectBrowseUserData();
          injectBrowsePosts();
        } else {
          document.getElementById('browseContent').style.display = "none";
        }
    } else if (tab == 'account') {
        localStorage.setItem('tab','account');
        document.getElementById('home').style.display = "none";
        document.getElementById('browse').style.display = "none";
        document.getElementById('account').style.display = "block";
        document.getElementById('chartjs').style.display = "none";
        document.getElementById('browseButton').style.background = '#FCFCFC';
        document.getElementById('homeButton').style.background = '#FCFCFC';
        document.getElementById('accountButton').style.background = '#58D3F7';
        document.getElementById('chartjsButton').style.background = '#FCFCFC';
    } else if (tab == 'chartjs') {
        localStorage.setItem('tab','chartjs');
        document.getElementById('home').style.display = "none";
        document.getElementById('browse').style.display = "none";
        document.getElementById('account').style.display = "none";
        document.getElementById('chartjs').style.display = "block";
        document.getElementById('browseButton').style.background = '#FCFCFC';
        document.getElementById('homeButton').style.background = '#FCFCFC';
        document.getElementById('accountButton').style.background = '#FCFCFC';
        document.getElementById('chartjsButton').style.background = '#58D3F7';
    //default is home
    } else {
        localStorage.setItem('tab','home');
        document.getElementById('home').style.display = "block";
        document.getElementById('browse').style.display = "none";
        document.getElementById('account').style.display = "none";
        document.getElementById('chartjs').style.display = "none";
        document.getElementById('browseButton').style.background = '#FCFCFC';
        document.getElementById('homeButton').style.background = '#58D3F7';
        document.getElementById('accountButton').style.background = '#FCFCFC';
        document.getElementById('chartjsButton').style.background = '#FCFCFC';
        injectHomeUserData();
        injectHomePosts();
    }
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
        document.getElementById('valErrMsgSigninForm').innerHTML = "PWD requires >= 8 chars";
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
          // Set Private Key
          localStorage.setItem("privatekey", serverResponse.privatekey);
          // Redirect User to profileView
          profileView();

          // Opening Websocket
          // NOTE: Chrommium does not work with soap
          // var websocket = new WebSocket('ws://127.0.0.1:5000/wssignin/', ['soap']);  
          var websocket = new WebSocket('ws://127.0.0.1:5000/websocket/');
          // Sending data to server over websocket
          websocket.onopen = function (event) {
            websocket.send(JSON.stringify(userdata)); 
          };
          // Receiving data from server over websocket
          websocket.onmessage = function (event) {
            var msg = JSON.parse(event.data);
            // Process Message
            if (msg.message === 'Sign out') {
              //websocket.close()
              signOut();
            } else if (msg.message === 'OnlineCountChanged') {
              radarChart.datasets[0].points[0].value = msg.data;
              radarChart.update();
            } else if (msg.message === 'MessageCountChanged') {
              radarChart.datasets[0].points[1].value = msg.data;
              radarChart.update();
            } else if (msg.message === 'PageViewsChanged') {
              radarChart.datasets[0].points[2].value = msg.data;
              radarChart.update();
            } else if (msg.message === 'PageViewLastDayChanged') {
              barChart.datasets[0].bars[4].value = msg.data;
              barChart.update()
            }
          };
          // Error Handling
          websocket.onerror = function (event) {
            console.log("Error with Websocket. Data is: " + event.data)
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
    // Create asynchronous Post Request to Server Resource
    con.open("POST", '/signup/', true); 
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        // Check response status
        if (serverResponse.success === true) {

          // SignIn User
          var innerCon = new XMLHttpRequest(); // Create XMLHttpRequest Object
          // Create asynchronous Post Request to Server Resource
          innerCon.open("POST", '/signin/', true); 
          // Specify a function which is executed each time the readyState property changes
          innerCon.onreadystatechange = function() {
            // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
            if (innerCon.readyState == 4 && innerCon.status == 200) {
              // Parse the JSON response from the server
              var innerServerResponse = JSON.parse(innerCon.responseText);
              // Check response status
              if (innerServerResponse.success === true) {
                // Set Session Token
                localStorage.setItem("token", innerServerResponse.data);
                // Set Private Key
                localStorage.setItem("privatekey", innerServerResponse.privatekey);
                // Redirect User to profileView
                profileView();
              } else {
                // inject error message into html
                document.getElementById('valErrMsgSigninForm').innerHTML = innerServerResponse.message;
              }
            }
          };
          innerCon.setRequestHeader("Content-Type", "application/json");
          // Send JSON data to Server
          innerCon.send(JSON.stringify(userdata));

        } else {
          // inject error message into html
          document.getElementById('valErrMsgSignupForm').innerHTML = serverResponse.message;
        }
      }
    };
    // Set Header
    con.setRequestHeader("Content-Type", "application/json");
    // Send JSON data to Server
    con.send(JSON.stringify(userdata));

    return false;
}

/* signOut user get signed out or error in html field is set */
function signOut() {

    // Get Token. If Token is not available redirect user to welcomeView.
    var token = getTokenOrNull();
    if (token === null) {
        welcomeView();
        return false;
    }

    // Create Hash with data and privatekey
    var privatekey = localStorage.getItem("privatekey")
    var hashvalue = sha256(privatekey + token);

    // Create javascript object
    var userdata = {
      token:token,
      hashvalue:hashvalue
    }

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
        document.getElementById('valSucMsgRenewPwdForm').innerHTML = "";
        document.getElementById('valErrMsgRenewPwdForm').innerHTML = "PWD requires >= 8 chars";
        return false;
    }

    // Compare Password Fields
    if (comparePwd(userdata.newPassword, userdata.repeatNewPsw) === false) {
        document.getElementById('valSucMsgRenewPwdForm').innerHTML = "";
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
        // TODO: Clear Form if success?
        // TODO: Clear Error or Success Message when switched away and back to this Tab?
        // Check response status
        if (serverResponse.success === true) {
          document.getElementById('valErrMsgRenewPwdForm').innerHTML = "";
          document.getElementById('valSucMsgRenewPwdForm').innerHTML = "Password changed!";
        } else {
          document.getElementById('valSucMsgRenewPwdForm').innerHTML = "";
          document.getElementById('valErrMsgRenewPwdForm').innerHTML = serverResponse.message;
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

    // Get UserData from Server
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    con.open("GET", '/getuserdatabytoken/' + token, true); // Create asynchronous Get Request to Server Resource
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
    // Send 
    con.send();

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
    // Create asynchronous Post Request to Server Resource
    con.open("GET", '/getusermessagesbytoken/' + token + '/', true); 
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

          // Create a count helper variable
          var count = 0;
          // Injects retrieved posts into html
          serverResponse.data.forEach( function (arrayItem)
          {
            // Create elements
            var divElem = document.createElement("div");
            divElem.style.lineHeight = "2";
            var spanLeft = document.createElement("span");
            var spanRight = document.createElement("span");
            // Prepare para element for drag and drop
            spanRight.setAttribute("id", "message" + count);
            spanRight.setAttribute("draggable", "true");
            spanRight.setAttribute("ondragstart", "drag(event)");
            // Add text
            var textLeft = document.createTextNode(arrayItem.sender_email + ": ");
            var textRight = document.createTextNode(arrayItem.message);
            spanLeft.appendChild(textLeft);
            spanRight.appendChild(textRight);
            // Add these child element to the parent element
            divElem.appendChild(spanLeft);
            divElem.appendChild(spanRight);
            element.appendChild(divElem);
            // Increment count
            count++;
          });
        } else {
          document.getElementById('valErrMsgHomePostAreaForm').innerHTML = serverResponse.message;
        }
      }
    };
    // Send
    con.send();

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

    // Get UserData from Server
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    // Create asynchronous Get Request to Server Resource
    con.open("GET", '/getuserdatabyemail/' + token + '/' + email + '/', true); 
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
    // Send
    con.send();

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

    // Get UserData from Server
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    // Create asynchronous Get Request to Server Resource
    con.open("GET", '/getusermessagesbyemail/' + token + '/' + email + '/', true); 
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

          // Create a count helper variable
          var count = 0;
          // Injects retrieved posts into html
          serverResponse.data.forEach( function (arrayItem)
          {
            // Create elements
            var divElem = document.createElement("div");
            divElem.style.lineHeight = "2";
            var spanLeft = document.createElement("span");
            var spanRight = document.createElement("span");
            // Prepare para element for drag and drop
            spanRight.setAttribute("id", "message" + count);
            spanRight.setAttribute("draggable", "true");
            spanRight.setAttribute("ondragstart", "drag(event)");
            // Add text
            var textLeft = document.createTextNode(arrayItem.sender_email + ": ");
            var textRight = document.createTextNode(arrayItem.message);
            spanLeft.appendChild(textLeft);
            spanRight.appendChild(textRight);
            // Add these child element to the parent element
            divElem.appendChild(spanLeft);
            divElem.appendChild(spanRight);
            element.appendChild(divElem);
            // Increment count
            count++;
          });

        } else {
          document.getElementById('valErrMsgSearchUserForm').innerHTML = "Could not retrieve posts from " + email;
        }
      }
    };
    // Send
    con.send();

    return false;
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
          document.getElementById('valErrMsgHomePostAreaForm').innerHTML = "";
          document.getElementById('valSucMsgHomePostAreaForm').innerHTML = "Message posted!";
          // TODO: Clear Form if success?
          // TODO: Clear Error or Success Message when switched away and back to this Tab?
          //document.forms['homePostAreaForm']['post'].value = " ";
          //document.forms['homePostAreaForm']['toEmail'].value = " ";
          // Get Posts in order to show newly created posts
          injectHomePosts();
        } else {
          // inject error message into html
          document.getElementById('valSucMsgHomePostAreaForm').innerHTML = "";
          document.getElementById('valErrMsgHomePostAreaForm').innerHTML = serverResponse.message;
        }
      }
    };
    con.setRequestHeader("Content-Type", "application/json");
    // Send JSON data to Server
    con.send(JSON.stringify(userdata));

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
          document.getElementById('valErrMsgBrowsePostAreaForm').innerHTML = "";
          document.getElementById('valSucMsgBrowsePostAreaForm').innerHTML = "Message posted!";
          // TODO: Clear form if success?
          // TODO: Clear Error or Success Message when switched away and back to this Tab?
          //document.forms['browsePostAreaForm']['post'].value = " ";
          // Get Posts in order to show newly created posts
          injectBrowsePosts();
        } else {
          // inject error message into html
          document.getElementById('valSucMsgBrowsePostAreaForm').innerHTML = "";
          document.getElementById('valErrMsgBrowsePostAreaForm').innerHTML = serverResponse.message;
        }
      }
    };
    con.setRequestHeader("Content-Type", "application/json");
    // Send JSON data to Server
    con.send(JSON.stringify(userdata));

    return false;
}

/* displayUser() Display another User  */
function displayUser() {

    // Get Token. If Token is not available redirect user to welcomeView.
    var token = getTokenOrNull();
    if (token === null) {
        welcomeView();
        return false;
    }

    // Get email and save it in localStorage
    var email = document.forms['searchUserForm']['findByEmail'].value;
    localStorage.setItem('toEmail', email);

    // Check if the user entered in the search form exists
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    // Create asynchronous Get Request to Server Resource
    con.open("GET", '/gettrueifuserexists/' + token + '/' + email + '/', true); 
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        // Check response status
        if (serverResponse.success === true) {
          // Save information that user wants to show another user and reload the view
          localStorage.setItem('showBrowseContent', 'true');
          profileView();
        } else {
          // In case of error save information that user is about to see the browse tab,
          // reload the view and inject error message
          localStorage.setItem('showBrowseContent', 'false');
          profileView();
          document.getElementById('valErrMsgSearchUserForm').innerHTML = "Email " + email + " is unknown";
        }
      }
    };
    // Send
    con.send();

    return false;
}

//private; remove localStorage objects
function cleanLocalStorage() {
    localStorage.removeItem('token');
    localStorage.removeItem('privatekey');
    localStorage.removeItem('toEmail');
    localStorage.removeItem('tab');
}


// privat; check if a token is available
function getTokenOrNull() {
    if (localStorage.getItem('token') === null) {
        return null;
    } else {
        return localStorage.getItem('token');
    }
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

function createRadarChart() {

    // Get Token. If Token is not available redirect user to welcomeView.
    var token = getTokenOrNull();
    if (token === null) {
        welcomeView();
        return false;
    }

    // chartjs: create instance of chart
    var radarData = {
        labels: ["OnlineUsers", "MessageCount", "PageViews"],
        datasets: [
            {
                label: "First Dataset",
                fillColor: "rgba(151,187,205,0.2)",
                strokeColor: "rgba(151,187,205,1)",
                pointColor: "rgba(151,187,205,1)",
                pointStrokeColor: "#fff",
                pointHighlightFill: "#fff",
                pointHighlightStroke: "rgba(151,187,205,1)",
                data: [0, 0, 0]
            }
        ]
    };
    var radarCtx = document.getElementById("radarChart").getContext("2d");
    // Create Global Variable which stores chart instance
    radarChart = new Chart(radarCtx).Radar(radarData);

    // Get Chart Data
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    // Create asynchronous Get Request to Server Resource
    con.open("GET", '/getradarchartdata/' + token + '/', true); 
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        if (serverResponse.success === true) {
          radarChart.datasets[0].points[0].value = serverResponse.data.onlineUsers;
          radarChart.datasets[0].points[1].value = serverResponse.data.postsOnWall;
          radarChart.datasets[0].points[2].value = serverResponse.data.pageViews;
          radarChart.update();
        } else {
          console.log("Error fetching chart stats");
        }
      }
    };
    // Send
    con.send();

}

function createBarChart() {

    // Get Token. If Token is not available redirect user to welcomeView.
    var token = getTokenOrNull();
    if (token === null) {
        welcomeView();
        return false;
    }

    // chartjs: create instance of chart
    var barData = {
        labels: ["4d ago", "3d ago", "2d ago", "yesterday", "today"],
        datasets: [
            {
                label: "Page Views",
                fillColor: "rgba(220,220,220,0.5)",
                strokeColor: "rgba(220,220,220,0.8)",
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data: [0, 0, 0, 0, 0]
            }
        ]
    };
    var barCtx = document.getElementById("barChart").getContext("2d");
    // Create Global Variable which stores chart instance
    barChart = new Chart(barCtx).Bar(barData);

    // Get Chart Data
    var con = new XMLHttpRequest(); // Create XMLHttpRequest Object
    // Create asynchronous Get Request to Server Resource
    con.open("GET", '/getbarchartdata/' + token + '/', true); 
    // Specify a function which is executed each time the readyState property changes
    con.onreadystatechange = function() {
      // Only execute the following code if readyState is in State 4 and the Request is 200 / OK
      if (con.readyState == 4 && con.status == 200) {
        // Parse the JSON response from the server
        var serverResponse = JSON.parse(con.responseText);
        if (serverResponse.success === true) {
          barChart.datasets[0].bars[0].value = serverResponse.data[0];
          barChart.datasets[0].bars[1].value = serverResponse.data[1];
          barChart.datasets[0].bars[2].value = serverResponse.data[2];
          barChart.datasets[0].bars[3].value = serverResponse.data[3];
          barChart.datasets[0].bars[4].value = serverResponse.data[4];
          barChart.update();
        } else {
          console.log("Error fetching chart stats");
        }
      }
    };
    // Send
    con.send();

}

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    var img = new Image(); 
    img.src = 'arrow.png'; 
    ev.dataTransfer.setDragImage(img, 10, 10);
}

function drop(ev) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
    ev.target.value = document.getElementById(data).innerHTML;
}
