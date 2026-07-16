const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagosController');

router.post('/pagar', pagosController.registrarPago);

module.exports = router;