const sqlite3=require('sqlite3');
const db=new sqlite3.Database('./database.sqlite');

db.serialize(()=>{
    db.run(`
        CREATE TABLE IF NOT EXISTS users(
        id TEXT PRIMARY KEY,
        username TEXT,
        email TEXT UNIQUE,
        password TEXT
        );
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS tasks(
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT,
        description TEXT,
        status TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `);

});