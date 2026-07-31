const test=require('node:test');const assert=require('node:assert/strict');const{datosProducto}=require('../routes/productos');
test('producto por kilogramo normaliza kilos por caja ausente a NULL',()=>{const p=datosProducto({codigo:'A',nombre:'A',precio_venta:1,costo:0,unidad:'KG'});assert.equal(p.kilosCaja,null);});
