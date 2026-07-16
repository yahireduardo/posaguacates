const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');

router.post('/crear', ventasController.crearVenta);

module.exports = router;