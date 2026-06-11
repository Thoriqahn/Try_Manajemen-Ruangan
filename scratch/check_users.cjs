const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./backend/database.sqlite');
db.all('SELECT email, role FROM users LIMIT 10', (err, rows) => {
  console.log(rows);
});
