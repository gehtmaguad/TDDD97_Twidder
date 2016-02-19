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
    var formData = {
        email:document.forms['signupForm']['email'].value,
        password:document.forms['signupForm']['password'].value,
        firstname:document.forms['signupForm']['firstName'].value,
        familyname:document.forms['signupForm']['familyName'].value,
        gender:document.forms['signupForm']['gender'].value,
        city:document.forms['signupForm']['city'].value,
        country:document.forms['signupForm']['country'].value
    };

    // SignUp User
    var signUp = serverstub.signUp(formData);
    if (signUp.success === false) {
        document.getElementById('valErrMsgSignupForm').innerHTML = signUp.message;
        return false;
    }

    // SignIn User
    var signIn = serverstub.signIn(username, password);
    if (signIn.success === false) {
        document.getElementById('valErrMsgSigninForm').innerHTML = signIn.message;
        return false;
    } else {
        localStorage.setItem("token", signIn.data);
        profileView();
    }

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
        } else {
          // Display error message
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

    // Get Password Form Values
    var oldPassword = document.forms['renewPwdForm']['oldPassword'].value;
    var newPassword = document.forms['renewPwdForm']['newPassword'].value;
    var repeatNewPsw = document.forms['renewPwdForm']['repeatNewPsw'].value;

    // Get Token. If Token is not available redirect user to welcomeView.
    var token = getTokenOrNull();
    if (token === null) {
        welcomeView();
        return false;
    }

    // Check Password Length
    if (checkPwdLength(newPassword) === false) {
        document.getElementById('valErrMsgRenewPwdForm').innerHTML = "PWD requires >= 8 chars";
        return false;
    }

    // Compare Password Fields
    if (comparePwd(newPassword, repeatNewPsw) === false) {
        document.getElementById('valErrMsgRenewPwdForm').innerHTML = "Same PWD required";
        return false;
    }

    // Renew password
    var result = serverstub.changePassword(token, oldPassword, newPassword);
    if ( result.success === false) {
        document.getElementById('valErrMsgRenewPwdForm').innerHTML = result.message;
        return false;
    } else {
        document.getElementById('valSucMsgRenewPwdForm').innerHTML = "Password changed!";
    }

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

    // sign out user
    var result = serverstub.signOut(token);
    if ( result.success === false) {
        document.getElementById('valErrMsgRenewPwdForm').innerHTML = result.message;
        return false;
    } else {
        // delete localStorage objects
        cleanLocalStorage();
        // redurect user to welcomeView
        welcomeView();
    }

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

    // Call Serverside Function
    var result = serverstub.postMessage(token, post, toEmail);
    if (result.success === false) {
        document.getElementById('valErrMsgHomePostAreaForm').innerHTML = result.message;
        return false;
    } else {
        document.forms['homePostAreaForm']['post'].value = " ";
        document.forms['homePostAreaForm']['toEmail'].value = " ";
        document.getElementById('valSucMsgHomePostAreaForm').innerHTML = "Message posted!";
        injectHomePosts();
    }

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
    var userdata = serverstub.getUserDataByToken(token);

    // Inject the userdata into html
    document.getElementById("homeFirstname").innerHTML = userdata.data.firstname;
    document.getElementById("homeFamilyname").innerHTML = userdata.data.familyname;
    document.getElementById("homeGender").innerHTML = userdata.data.gender;
    document.getElementById("homeCity").innerHTML = userdata.data.city;
    document.getElementById("homeCountry").innerHTML = userdata.data.country;
    document.getElementById("homeEmail").innerHTML = userdata.data.email;

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

    // Get Posts from Server
    var posts = serverstub.getUserMessagesByToken(token);
    if ( posts.success === false ) {
        return false;
    }

    // Remove current posts from html
    var element = document.getElementById('homeMessageWall');
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }

    // Injects retrieved posts into html
    posts.data.forEach( function (arrayItem)
    {
        var para = document.createElement("p");
        var text = document.createTextNode("Writer: " + arrayItem.writer + " Content: " + arrayItem.content);
        para.appendChild(text);

        element.appendChild(para);
    });
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

    // Call Serverside Function
    var result = serverstub.postMessage(token, post, toEmail);
    if (result.success === false) {
        document.getElementById('valErrMsgBrowsePostAreaForm').innerHTML = result.message;
        return false;
    } else {
        document.getElementById('valSucMsgBrowsePostAreaForm').innerHTML = "Message posted!";
        injectBrowsePosts();
        document.forms['browsePostAreaForm']['post'].value = " ";
    }

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

    // Retrieve data from server
    var userdata = serverstub.getUserDataByEmail(token,email);
    if (userdata.success === false) {
        document.getElementById('valErrMsgSearchUserForm').innerHTML = "Email " + email + " is unknown";
        return false;
    }

    // Inject the userdata into html
    document.getElementById("browseFirstname").innerHTML = userdata.data.firstname;
    document.getElementById("browseFamilyname").innerHTML = userdata.data.familyname;
    document.getElementById("browseGender").innerHTML = userdata.data.gender;
    document.getElementById("browseCity").innerHTML = userdata.data.city;
    document.getElementById("browseCountry").innerHTML = userdata.data.country;
    document.getElementById("browseEmail").innerHTML = userdata.data.email;

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

    // Get Posts from Server
    var posts = serverstub.getUserMessagesByEmail(token,email);
    if (posts.success === false) {
        document.getElementById('valErrMsgSearchUserForm').innerHTML = "Could not retrieve posts from " + email;
        return false;
    }

    // Remove current posts from html
    var element = document.getElementById('browseMessageWall');
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }

    // Injects retrieved posts into html
    posts.data.forEach( function (arrayItem)
    {
        var para = document.createElement("p");
        var text = document.createTextNode("Writer: " + arrayItem.writer + " Content: " + arrayItem.content);
        para.appendChild(text);

        element.appendChild(para);
    });
}
