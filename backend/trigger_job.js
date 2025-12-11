const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function trigger() {
    try {
        console.log('Logging in...');
        const loginData = await request({
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { username: 'admin', password: 'adminpassword123' });

        const token = loginData.token;
        console.log('Got token:', token);

        console.log('Analyzing job...');
        const res = await request({
            hostname: 'localhost',
            port: 3001,
            path: '/api/jobs/analyze',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, { jobTitle: 'Software Engineer' });

        console.log('Response:', res);
    } catch (error) {
        console.error('Error:', error);
    }
}

trigger();
