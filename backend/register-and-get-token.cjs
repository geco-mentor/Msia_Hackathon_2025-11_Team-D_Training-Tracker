const fetch = require('node-fetch'); // Need to ensure node-fetch is available or use native fetch if Node 18+
const fs = require('fs');
const path = require('path');

// Use native fetch if available (Node 18+), otherwise require it (might fail if not installed)
const fetchApi = global.fetch || require('node-fetch');

const API_URL = 'http://localhost:3001/api/auth/register';

const randomId = Math.floor(Math.random() * 10000);
const userData = {
    name: `Test Employee ${randomId}`,
    username: `testemp${randomId}`,
    employee_id: `EMP${randomId}`,
    password: 'password123', // WARNING: Hardcoded for local testing only. Do not use in production.
    job_title: 'Junior Developer'
};

async function register() {
    console.log('Registering user:', userData.username);
    try {
        const response = await fetchApi(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('Registration successful!');
            console.log('Token:', data.token);

            const tokenData = {
                token: data.token,
                user: data.user
            };

            fs.writeFileSync(path.join(__dirname, 'token.json'), JSON.stringify(tokenData, null, 2));
            console.log('Token saved to token.json');
        } else {
            console.error('Registration failed:', data);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

register();
