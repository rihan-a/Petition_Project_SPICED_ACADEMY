DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS users_profiles;

CREATE TABLE signatures (
    id SERIAL PRIMARY KEY,
    signature text NOT NULL,
    user_id INT NOT NULL
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users_profiles(
    id SERIAL PRIMARY KEY,
    age INT,
    city VARCHAR(255),
    url VARCHAR(255),
    user_id INT NOT NULL UNIQUE REFERENCES users(id)
);

--  psql -d petition -f database/petition.sql;
-- //sudo su postgres
-- TRUNCATE users RESTART IDENTITY;
-- TRUNCATE users CASCADE;
-- delete  from users
-- validater.validate(email validation)