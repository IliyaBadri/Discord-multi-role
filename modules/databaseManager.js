const sqlite3 = require('sqlite3');

function getSQLRunnerPromise(query){
    return new Promise((resolve, reject) => {
        const database = new sqlite3.Database('database.db');
        database.serialize(() => {
            database.run(query, (output, error) => {
                if(error) {
                    reject(error);
                } else {
                    resolve(output);
                }
                
            });
        });

        database.close((closeError) => {
            if (closeError) {
                console.error(`Error closing the database: ${closeError}`);
            }
        });
    });
}

function getSQLSelectorPromise(selectQuery, selectValues){
    return new Promise((resolve, reject) => {
        const database = new sqlite3.Database('database.db');
        database.all(selectQuery, selectValues, (error, rows) => {
            if (error) {
                reject(error);
            } else {
                resolve(rows);
            }
        });

        database.close((closeError) => {
            if (closeError) {
                console.error(`Error closing the database: ${closeError}`);
            }
        });
    });
}

function getSQLStatementPromise(statementQuery , ...insertParams) {
    return new Promise((resolve, reject) => {
        const database = new sqlite3.Database('database.db');
        database.serialize(() => {
            const statement = database.prepare(statementQuery);
            statement.run(...insertParams, (error) => {
                statement.finalize();
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        database.close((closeError) => {
            if (closeError) {
                console.error(`Error closing the database: ${closeError}`);
            }
        });
    }); 
}

async function setup(){
    setupQueryList = [
        'CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, value TEXT)',
        'CREATE TABLE IF NOT EXISTS role_bundles (id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT, token TEXT)',
        'CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY AUTOINCREMENT, identifier TEXT, token TEXT)'
    ]
    
    for(const setupQuery of setupQueryList){
        await getSQLRunnerPromise(setupQuery);
    }
}

module.exports = {
    getSQLRunnerPromise,
    getSQLSelectorPromise,
    getSQLStatementPromise,
    setup
}