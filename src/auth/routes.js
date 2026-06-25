const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET } = require('./authMiddleware');

router.post('/login', async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password required' });
    }

    let isMatch = false;

    if (process.env.ADMIN_PASSWORD) {
        isMatch = (password === process.env.ADMIN_PASSWORD);
    } else {
        // Fallback to hashing comparison. Default hash is for 'admin'
        const adminHash = process.env.ADMIN_HASH || '$2b$10$9vW4lqp70ROL7CajNsaQ9.flCuZQvKNOvUqSc5PN14j1NLemD3M8m';
        isMatch = await bcrypt.compare(password, adminHash);
    }

    if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

    res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({ success: true });
});

router.post('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true });
});

module.exports = router;
