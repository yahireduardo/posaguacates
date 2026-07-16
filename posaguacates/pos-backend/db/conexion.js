const mysql = require('mysql2');

const conexion = mysql.createConnection({

  host:'localhost',

  user:'root',

  password:'',

  database:'pos_aguacates'

});

conexion.connect(err=>{

  if(err){

    console.log('Error conexión:', err);

    return;

  }

  console.log('Conectado a MySQL');

});

module.exports = conexion;