const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, '../test_output.txt');
try {
    const data = fs.readFileSync(logPath, 'utf8');
    console.log(data);
} catch (err) {
    console.error(err);
}
