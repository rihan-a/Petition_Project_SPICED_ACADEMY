const spicedPg = require("spiced-pg");
require("dotenv").config();

const { DATABASE_URL } = process.env;

// this establishes the connection to the db
// it get's a connection string as an argument

const db = spicedPg(`${DATABASE_URL}`);

// function to create user profile into the USERS table
function createProfile({ firstName, lastName, email, password, createdAt }) {
    return db
        .query(
            `INSERT INTO users (first_name, last_name, email, password, created_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
            [firstName, lastName, email, password, createdAt]
        )
        .then((result) => result.rows[0]);
}

// function to create a signature for an existing user into SIGNATURES table
function createSignature({ signature, userId }) {
    return db
        .query(
            `INSERT INTO signatures (signature, user_id)
    VALUES ($1, $2)
    RETURNING *`,
            [signature, userId]
        )
        .then((result) => result.rows[0]);
}

function getProfilesWithSignature() {
    return db
        .query(
            `SELECT users.first_name, users.last_name, users_profiles.city,  users_profiles.url, users_profiles.age, signatures.signature
        FROM users
        JOIN users_profiles
        ON users.id = users_profiles.user_id
        JOIN signatures
        ON users.id = signatures.user_id`
        )
        .then((result) => {
            return result;
        });
}

function getSignatureById(id) {
    return db
        .query("SELECT * FROM signatures WHERE user_id = $1", [id])
        .then((result) => {
            if (result.rows[0]) {
                return result.rows[0].signature;
            }
            return;
        });
}

function getProfileByEmail(email) {
    return db
        .query("SELECT * FROM users WHERE email = $1", [email])
        .then((result) => result.rows[0]);
}

// function to create user profile into the USERS table
function createUserProfile({ age, city, userUrl, user_id }) {
    return db
        .query(
            `INSERT INTO users_profiles (age, city, url, user_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *`,
            [age, city, userUrl, user_id]
        )
        .then((result) => result.rows[0]);
}

function getUserProfileById(id) {
    return db
        .query("SELECT * FROM users_profiles WHERE user_id = $1", [id])
        .then((result) => result.rows[0]);
}

function getUserById(id) {
    return db
        .query("SELECT * FROM users WHERE id = $1", [id])
        .then((result) => result.rows[0]);
}

function getSignersByCity(city) {
    return db
        .query(
            `SELECT users.first_name, users.last_name, users_profiles.city,  users_profiles.url, users_profiles.age
        FROM users
        JOIN users_profiles
        ON users.id = users_profiles.user_id
        WHERE users_profiles.city = $1`,
            [city]
        )
        .then((result) => {
            return result;
        });
}

// Edit profile Functions ----------------------------------------------->
function updateUsers(firstName, lastName, email, password, id) {
    return db
        .query(
            `UPDATE users SET first_name=$1, last_name=$2, email=$3, password=$4 WHERE id=$5
            RETURNING *`,
            [firstName, lastName, email, password, id]
        )
        .then((result) => result.rows[0]);
}

function updateUsersProfiles(age, city, url, id) {
    //console.log(age, city, url, id);
    return db
        .query(
            `INSERT INTO users_profiles (age, city, url, user_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id)
DO UPDATE SET age=$1, city=$2, url=$3 
RETURNING *`,
            [age, city, url, id]
        )
        .then((result) => result.rows[0]);
}
//-------------------------------------------------------------------->

// Delete signature & Profile ---------------------------------------->
function deleteSignature(id) {
    return db
        .query(
            ` DELETE FROM signatures
            WHERE user_id=$1
            RETURNING *
        `,
            [id]
        )
        .then((result) => {
            return result;
        });
}

function deleteProfile(id) {
    db.query(
        `DELETE FROM users_profiles
            WHERE users_profiles.user_id = $1
        `,
        [id]
    );
    db.query(
        `DELETE FROM signatures
            WHERE signatures.user_id = $1
            
        `,
        [id]
    );
    db.query(
        `DELETE FROM users
            WHERE users.id = $1
        `,
        [id]
    );
    return;
}

module.exports = {
    createProfile,
    createUserProfile,
    createSignature,
    getProfilesWithSignature,
    getUserById,
    getUserProfileById,
    getSignatureById,
    getSignersByCity,
    getProfileByEmail,
    updateUsers,
    updateUsersProfiles,
    deleteSignature,
    deleteProfile,
};
