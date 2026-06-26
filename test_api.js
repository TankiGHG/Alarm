const http = require('http');

const data = JSON.stringify({
    password: "admin"
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, res => {
    let cookie = res.headers['set-cookie'][0].split(';')[0];

    const req2 = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/alarms',
        method: 'GET',
        headers: {
            'Cookie': cookie
        }
    }, res2 => {
        let body = '';
        res2.on('data', d => body += d);
        res2.on('end', () => console.log(body));
    });
    req2.end();
});
req.write(data);
req.end();
