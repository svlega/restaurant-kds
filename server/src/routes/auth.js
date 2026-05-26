'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const config = require('../config');

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username !== config.admin.username || password !== config.admin.password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ username }, config.admin.jwtSecret, { expiresIn: '7d' });
  res.json({ token });
});

module.exports = router;
