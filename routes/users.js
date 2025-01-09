const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Users route' });
});

router.post('/', (req, res) => {
  const { name, email } = req.body;
  // Handle user creation
  res.json({ message: 'User created' });
});

module.exports = router;
