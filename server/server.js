const express = require('express');
const app = express();

// Resto de las configuraciones del servidor permanecen igual

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
