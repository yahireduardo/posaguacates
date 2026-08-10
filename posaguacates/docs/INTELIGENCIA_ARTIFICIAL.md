# Inteligencia artificial

POS Aguacates incluye una capa de inteligencia que no cambia la lógica de ventas, compras, cartera, inventario ni usuarios. Todas las funciones nuevas son de solo lectura.

## Funciones incluidas

- Diagnóstico ejecutivo de ventas de los últimos 30 días, ticket promedio y cartera pendiente.
- Alertas explicables de inventario con existencia, mínimo y venta semanal reciente.
- Sugerencias de reabasto para cubrir aproximadamente dos semanas, sin crear compras automáticamente.
- Detección de productos cuya demanda bajó al menos 15% contra los 30 días anteriores.
- Copiloto con preguntas libres en español.
- Modo local sin internet ni costo, disponible aunque no se configure OpenAI.
- Modo generativo opcional mediante OpenAI Responses API.
- Comparación temporal de demanda entre promedio ponderado, regresión Ridge y bosque aleatorio con scikit-learn.

## Predicción de demanda con scikit-learn

Instale Python y, dentro de `pos-backend`, ejecute:

```powershell
python -m pip install -r ml/requirements.txt
```

El endpoint `GET /prediccion` completa las semanas sin ventas con cero, reserva las últimas semanas como evaluación retrospectiva y calcula MAE, RMSE y WAPE. Para evitar fuga de información, cada punto de evaluación se entrena exclusivamente con semanas anteriores. El método con menor MAE genera el pronóstico final; RMSE resuelve empates. Si existen menos de 12 semanas o Python no está disponible, se conserva el promedio ponderado local.

Los libros históricos de remisiones proporcionados contienen importe, pero no unidades por producto. Los libros de inventario contienen cajas recibidas por clasificación; esto representa abastecimiento y no necesariamente demanda vendida. Para el producto `01` se definió como aproximación sumar todas las clasificaciones que contienen la palabra completa `GRANDE` o `GRANDES`, incluyendo variantes FL y B. Al acumular cuatro semanas completas de ventas reales, el POS sustituye la aproximación histórica en las semanas coincidentes para evitar sumar dos medidas distintas. La semana en curso y las hojas con fechas futuras siempre se excluyen.

Importación idempotente de los libros autorizados:

```powershell
npm run demand:import -- "ruta\\02 INVENTARIO HASS 2025.xlsx" "ruta\\02 INVENTARIO HASS 2026.xlsx"
```

Cada lote conserva archivo, hoja y clasificaciones incluidas. Una clave SHA-256 evita duplicados si se ejecuta nuevamente.

## Activar el modo generativo

En `pos-backend/.env` configure:

```env
OPENAI_API_KEY=su_clave_del_servidor
OPENAI_MODEL=gpt-5.6-luna
OPENAI_TIMEOUT_MS=20000
```

Reinicie el servicio. La clave nunca debe copiarse al frontend ni guardarse en Git. Si no hay clave, el indicador de la pantalla mostrará `IA local` y el resto del POS seguirá funcionando normalmente.

## Privacidad y límites

El copiloto envía únicamente métricas agregadas de ventas, deuda, inventario y tendencias. No envía nombres, teléfonos, correos, contraseñas ni tokens. Las solicitudes usan `store: false`. Las recomendaciones son apoyo para decidir: no modifican datos y deben verificarse antes de comprar mercancía.

## API nueva

- `GET /ia/estado`: modo disponible y modelo configurado.
- `GET /ia/resumen`: diagnóstico, métricas y recomendaciones explicables.
- `GET /ia/recomendaciones`: alertas priorizadas.
- `POST /ia/asistente`: recibe `{ "pregunta": "..." }` y responde con análisis local o generativo.

Todas las rutas requieren una sesión válida, igual que los demás módulos privados.
