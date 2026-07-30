# Operación en dos computadoras

## Escenario A: copias no simultáneas

1. Trabaje en la computadora de la empresa.
2. Al cerrar, genere un respaldo verificado y cópielo al USB.
3. En la computadora personal, restaure esa copia.
4. Use la copia personal para consulta o pruebas.

Las dos bases son independientes. Los cambios personales no regresan
automáticamente a la empresa. Si se trabaja en ambas, divergen y no existe una
fusión automática segura. Nunca restaure una copia antigua sobre información
más reciente sin revisar y respaldar primero.

## Escenario B: una sola base en red

Para trabajo diario simultáneo use una computadora servidor en la empresa:

- MariaDB/MySQL ejecutándose como servicio;
- backend Node.js ejecutándose como servicio;
- dirección IP local fija o reservada;
- demás computadoras accediendo por navegador, por ejemplo
  `http://192.168.1.50:3000`;
- firewall limitado a la red privada;
- USB usado solo para respaldos.

Todos trabajan así sobre una sola base y no aparecen versiones diferentes.
Configure `CORS_ORIGINS` con los orígenes exactos necesarios y no publique
directamente MySQL ni el puerto del POS en Internet.

Para acceso fuera de la empresa use una VPN administrada; no abra el puerto 3306
al exterior. Mantenga Windows, Node.js y MariaDB actualizados, use contraseñas
individuales y pruebe restauraciones periódicamente.
