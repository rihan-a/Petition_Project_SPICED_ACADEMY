// Import node modules --------------------------------------------------------->
const express = require("express");
const path = require("path");
const handlebars = require("express-handlebars");
const cookieSession = require("cookie-session");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const salt = bcrypt.genSaltSync(10);

// start Express server  ------------------------------------------------------->
const app = express();
const PORT = 5050;

// Setup express - handlebars as view engine   --------------------------------->
app.engine("handlebars", handlebars.engine());
app.set("view engine", "handlebars");

// import funciton from db script to interact with the database tables --------->
const {
    createProfile,
    createUserProfile,
    createSignature,
    getProfilesWithSignature,
    getUserById,
    getUserProfileById,
    getSignatureById,
    getProfileByEmail,
    getSignersByCity,
    updateUsers,
    updateUsersProfiles,
    deleteSignature,
    deleteProfile,
} = require("./db");

// Middlewares -------------------------------------------------->
const { SESSION_SECRET } = process.env;
app.use(
    cookieSession({
        secret: SESSION_SECRET,
        maxAge: 1000 * 60 * 60 * 24 * 14,
    })
);
// install middleware to help us read cookies easily
app.use(cookieParser());
// install middleware to help us read POST body (form data) easily
app.use(express.urlencoded({ extended: false }));
// serve the public folder staticly
app.use(express.static(path.join(__dirname, "public")));

//serve register as HOME-PAGE --------------------------------------------------->
//------------------------------------------------------------------------------->
//GET
app.get("/", (req, res) => {
    return res.redirect("/register");
});

// Registration logic start ---------------------------------------------------->
//------------------------------------------------------------------------------>
//GET
app.get("/register", (req, res) => {
    if (req.session.logedIn !== true) {
        return res.render("register");
    } else {
        return res.redirect("/petition/signed");
    }
});

// get user input from the registration form
//POST
app.post("/register", (req, res) => {
    //read data sent by the user in the form!
    const body = req.body;
    //console.log({ body });
    const { firstname, lastname, email, password } = body;

    if (
        firstname.trim() == "" ||
        lastname.trim() == "" ||
        email.trim() == "" ||
        password.trim() == "" ||
        isNaN(firstname) ||
        isNaN(lastname) ||
        isNaN(email)
    ) {
        res.render("register", {
            error: "Something went wrong, please fill your data properly!",
        });
        return;
    }

    // check if the user email is already exsiting -------------------------
    getProfileByEmail(email).then((user) => {
        //console.log({ user });

        if (user) {
            res.render("register", {
                error: "this email is already registered!",
            });
            return;
        }

        // Hashing password before saving it to data base -----------------
        const hashedPassword = bcrypt.hashSync(password, salt);
        // -----------------------------------------------------------------

        let now = new Date();
        // create a new profile --------------------------------------------
        createProfile({
            firstName: firstname,
            lastName: lastname,
            email: email,
            password: hashedPassword,
            createdAt: now,
        })
            .then((result) => {
                //console.log("created profile", result);
                req.session.userID = result.id;
                req.session.userName = { firstname, lastname, email };
                req.session.logedIn = true;
                return res.redirect("/profile");
            })
            .catch((error) => {
                console.log(error);
            });
    });
});

// Log-In Route ------------------------------------------------------------>
//-------------------------------------------------------------------------->
//GET
app.get("/login", (req, res) => {
    if (!req.session.logedIn || req.session.logedIn !== true) {
        return res.render("login");
    } else {
        // check if the user already signed to redirect to signed or petition
        if (req.session.signed == true) {
            return res.redirect("/petition/signed");
        } else {
            return res.redirect("/petition");
        }
    }
});

//POST
app.post("/login", (req, res) => {
    //read data sent by the user in the form!
    const { email, password } = req.body;

    if (email.trim() == "" || password.trim() == "" || isNaN(email)) {
        getProfileByEmail(email).then((user) => {
            //console.log(user);
            if (user) {
                let id = user.id;
                if (bcrypt.compareSync(password, user.password)) {
                    console.log("valid user.....");
                    let firstname = user.first_name;
                    let lastname = user.last_name;
                    let email = user.email;
                    req.session.userName = { firstname, lastname, email };
                    req.session.logedIn = true;
                    req.session.userID = id;

                    getUserProfileById(id)
                        .then((results) => {
                            //HERE get age, city and url and save them into a session
                            let age = results.age;
                            let city = results.city;
                            let userUrl = results.url;
                            req.session.userProfile = {
                                age,
                                city,
                                userUrl,
                            };
                        })
                        .catch((error) => {
                            console.log(error);
                        });

                    getSignatureById(id)
                        .then((signature) => {
                            //console.log(signature);
                            // check if the logged in user is already signed ?
                            if (signature) {
                                req.session.signed = true;

                                return res.redirect("/petition/signed");
                            } else {
                                req.session.signed = false;
                                return res.redirect("/petition");
                            }
                        })
                        .catch((error) => console.log(error));
                } else {
                    res.render("login", {
                        error: "invalid password!",
                    });
                }
            } else {
                res.render("login", {
                    error: "invalid email!",
                });
            }
        });
    } else {
        res.render("login", {
            error: "invalid email or password!",
        });
    }
});

// Profile Route ---------------------------------------------------------->
//------------------------------------------------------------------------->
//GET
app.get("/profile", (req, res) => {
    //console.log(req.session.logedIn);
    // check if the user is logged in
    if (req.session.logedIn || req.session.logedIn == true) {
        const { firstname, lastname } = req.session.userName;
        return res.render("profile", { firstname, lastname });
    } else {
        return res.redirect("/register");
    }
});

//POST
app.post("/profile", (req, res) => {
    //read data sent by the user in the form!
    const { firstname, lastname } = req.session.userName;
    let { age, city, userUrl } = req.body;

    // check user input before saving to database
    if (
        age.trim() == "" ||
        city.trim() == "" ||
        userUrl.trim() == "" ||
        isNaN(city) ||
        isNaN(age) == false ||
        isNaN(userUrl)
    ) {
        return res.render("profile", {
            firstname,
            lastname,
            error: "something went wrong!",
        });
    }
    if (userUrl != "" && userUrl != " ") {
        if (!userUrl.startsWith("https://") || !userUrl.startsWith("http://")) {
            userUrl = "https://" + userUrl;
        }
    }

    //console.log({ userUrl });

    req.session.userProfile = {
        age,
        city,
        userUrl,
    };

    //console.log(userUrl);

    //console.log(firstname + "&" + lastname);
    let user_id = req.session.userID;

    // convert user input to lowercase before saving to data base
    city = city.toLowerCase();
    //console.log({ userUrl });

    createUserProfile({ age, city, userUrl, user_id })
        .then((results) => {
            //console.log(results);
            return res.redirect("/petition");
        })
        .catch((error) => {
            console.log(error);
        });
});

// Petition Route ---------------------------------------------------------->
//-------------------------------------------------------------------------->
//GET
app.get("/petition", (req, res) => {
    if (req.session.logedIn || req.session.logedIn == true) {
        const { firstname, lastname } = req.session.userName;
        //console.log("is signed ?", req.session.signed);
        if (req.session.signed == true) {
            return res.redirect("/petition/signed");
        } else {
            return res.render("petition", { firstname, lastname });
        }
    } else {
        return res.redirect("/login");
    }
});
//POST
app.post("/petition", (req, res) => {
    //read the canvas data - signature
    const { signature } = req.body;
    let userId = req.session.userID;
    //console.log({ userId });

    createSignature({ signature, userId })
        .then(() => {
            req.session.userID = userId;
            req.session.signed = true;
            getProfilesWithSignature()
                .then((results) => {
                    //console.log({ signersCount });
                    req.session.signersCount = results.rowCount;
                    return res.redirect("/petition/signed");
                })
                .catch((error) => {
                    console.log("this error", error);
                });
        })
        .catch((error) => console.log(error));
});

// Signed Route ---------------------------------------------------------->
//-------------------------------------------------------------------------->
//GET
app.get("/petition/:signed", (req, res) => {
    //console.log({ id });

    //check if the user has already signed
    console.log(req.session.signed);
    if (req.session.signed == true) {
        let id = req.session.userID;
        let signerName;
        Promise.all([getSignatureById(id), getProfilesWithSignature()])
            .then((results) => {
                //console.log(results[1].rowCount);
                //console.log(results[0]);
                if (req.session.userName) {
                    const { firstname, lastname } = req.session.userName;
                    signerName = firstname + " " + lastname;
                }

                req.session.signersCount = results[1].rowCount;
                return res.render("signed", {
                    signerName: signerName,
                    canvasUrl: results[0],
                    signers: results[1].rowCount,
                });
            })
            .catch((error) => console.log(error));
    } else {
        return res.redirect("/petition");
    }
});

// Signers Route ---------------------------------------------------------->
//-------------------------------------------------------------------------->
//GET
app.get("/signers", (req, res) => {
    getProfilesWithSignature()
        .then((results) => {
            let signersList = [];
            results.rows.forEach((signer) => {
                signersList.push({
                    signerName: signer.first_name + " " + signer.last_name,
                    signerCity: signer.city,
                    signerAge: signer.age,
                    signerUrl: signer.url,
                });
            });
            //console.log(signersList);

            return res.render("signers", { signersList: signersList });
        })
        .catch((error) => console.log(error));
});

// Signers by city Route ---------------------------------------------------------->
//-------------------------------------------------------------------------->
//GET
app.get("/signers/:city", (req, res) => {
    let city = req.params.city;
    city = city.toLowerCase();
    //console.log(city);
    getSignersByCity(city)
        .then((result) => {
            let city = result.rows[0].city;
            //console.log({ city });
            let signersList = [];
            result.rows.forEach((signer) => {
                signersList.push({
                    signerName: signer.first_name + " " + signer.last_name,
                    signerAge: signer.age,
                    signerCity: signer.city,
                    signerUrl: signer.url,
                });
            });
            //console.log(signersList);
            return res.render("signers-city", {
                signersList: signersList,
                city: city,
            });
        })
        .catch((error) => console.log(error));
});

// Edit Profile Route --------------------------------------------------------->
//----------------------------------------------------------------------------->
//GET
app.get("/edit", (req, res) => {
    const { firstname, lastname, email } = req.session.userName;
    const { age, city, userUrl } = req.session.userProfile;

    return res.render("edit", {
        firstname,
        lastname,
        email,
        age,
        city,
        userUrl,
    });
});

//POST
app.post("/edit", (req, res) => {
    let { firstname, lastname, email, password, age, city, userUrl } = req.body;
    let id = req.session.userID;

    // check user input before saving to database
    if (
        firstname.trim() == "" ||
        lastname.trim() == "" ||
        email.trim() == "" ||
        isNaN(firstname) ||
        isNaN(lastname) ||
        isNaN(email) ||
        age.trim() == "" ||
        city.trim() == "" ||
        userUrl.trim() == "" ||
        isNaN(city) ||
        isNaN(age) == false ||
        isNaN(userUrl)
    ) {
        const { firstname, lastname, email } = req.session.userName;
        const { age, city, userUrl } = req.session.userProfile;

        return res.render("edit", {
            firstname,
            lastname,
            email,
            age,
            city,
            userUrl,
        });
    }

    if (userUrl.trim() !== "") {
        if (!userUrl.startsWith("https://") || !userUrl.startsWith("http://")) {
            userUrl = "https://" + userUrl;
        }
    }

    // convert user input to lowercase before saving to data base
    city = city.toLowerCase();

    if (password.trim() !== "") {
        // Hashing password before saving it to data base
        //console.log("user wants to change the password");
        password = bcrypt.hashSync(password, salt);
    } else {
        //console.log("user let the password empty");
        getUserById(id).then((results) => {
            //console.log(results.password);
            password = results.password;
        });
    }

    Promise.all([
        updateUsers(firstname, lastname, email, password, id),
        updateUsersProfiles(age, city, userUrl, id),
    ])
        .then(() => {
            //console.log(results);
            // update cookie session
            if (email) {
                req.session.userName = { firstname, lastname, email };
            } else {
                let previousEmail = req.session.userName.email;
                req.session.userName = {
                    firstname,
                    lastname,
                    email: previousEmail,
                };
            }
            // update cookie session
            req.session.userProfile = { age, city, userUrl };

            return res.redirect("/petition/signed");
        })
        .catch((error) => console.log(error));
});

//Delete Signature Route  ----------------------------------------------------------------->
//----------------------------------------------------------------------------------------->
//POST
app.post("/petition/signed/delete", function (req, res) {
    let id = req.session.userID;
    deleteSignature(id)
        .then((results) => {
            //console.log(results);
            // Destroy signed session
            req.session.signed = false;
            req.session.signersCount = results.rowCount;

            return res.redirect("/petition/signed/delete");
        })
        .catch((error) => {
            console.log(error);
        });
});

//GET
app.get("/petition/signed/delete", function (req, res) {
    return res.render("delete");
});

//Delete Profile Route  ----------------------------------------------------------------->
//----------------------------------------------------------------------------------------->
//POST
app.post("/petition/signed/delete_profile", function (req, res) {
    let id = req.session.userID;
    deleteProfile(id);

    // Destroy signed session
    req.session.logedIn = null;
    req.session.signersCount = null;
    req.session.signed = null;

    return res.redirect("/petition/signed/delete_profile");
});

//GET
app.get("/petition/signed/delete_profile", function (req, res) {
    return res.redirect("/register");
});

//LOGOUT Route  ----------------------------------------------------------------->
//------------------------------------------------------------------------------->
//GET
app.get("/logout", function (req, res) {
    // Destroy login session
    req.session.logedIn = null;
    req.session.signersCount = null;
    req.session.signed = null;

    return res.redirect("/login");
});

//Handeling error from wrong routes 404  ---------------------------------------->
//------------------------------------------------------------------------------->
//GET
app.get("*", function (req, res) {
    return res.render("error");
});
//POST
app.post("*", function (req, res) {
    return res.render("error");
});

// listen on port 5050
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
