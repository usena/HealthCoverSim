
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "..", "healthcoversim.db");
const initPath = path.join(__dirname, "..", "init.sql");

// Initialise the database if necessary.
if (!fs.existsSync(dbPath)) {
    if (!fs.existsSync(initPath)) {
        throw new Error("init.sql was not found in the project root.");
    }

    const initSql = fs.readFileSync(initPath, "utf8");
    const initDb = new Database(dbPath);

    initDb.exec(initSql);
    initDb.close();
}

const db = new Database(dbPath);

// Enforce foreign-key relationships on this connection.
db.pragma("foreign_keys = ON");

module.exports = db;
