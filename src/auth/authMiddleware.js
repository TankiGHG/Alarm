const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fallback_key';

// Zero bloatware cookie parser
function parseCookies(req) {
    const list = {};
    const rc = req.headers.cookie;

    rc && rc.split(';').forEach(function(cookie) {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

function verifyToken(req, res, next) {
    const cookies = parseCookies(req);
    const token = cookies.auth_token;

    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// Middleware to redirect unauthenticated users to login
function requireLogin(req, res, next) {
    const cookies = parseCookies(req);
    const token = cookies.auth_token;

    if (!token) {
        return res.redirect('/login.html');
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        return res.redirect('/login.html');
    }
}

module.exports = {
    verifyToken,
    requireLogin,
    parseCookies,
    JWT_SECRET
};
