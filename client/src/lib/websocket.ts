import { useEffect, useState } from 'react';

interface WebSocketOptions {
  onError?: () => void;
  enabled?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export function useWebSocket({
  onError,
  enabled = true,
  retryAttempts = 3,
  retryDelay = 1000
}: WebSocketOptions = {}) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!enabled) {
      console.log('WebSocket deshabilitado');
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        // Usar el protocolo correcto basado en la página
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        console.log('Intentando conectar WebSocket a:', wsUrl);
        ws = new WebSocket(wsUrl);

        ws.addEventListener('open', () => {
          console.log('Conexión WebSocket establecida exitosamente');
          setAttempts(0);
          setSocket(ws);
        });

        ws.addEventListener('close', (event) => {
          console.log(`WebSocket cerrado: código ${event.code}${event.reason ? `, razón: ${event.reason}` : ''}`);
          setSocket(null);

          if (attempts < retryAttempts) {
            console.log(`Reintentando conexión en ${retryDelay}ms (intento ${attempts + 1}/${retryAttempts})`);
            reconnectTimeout = setTimeout(() => {
              setAttempts(prev => prev + 1);
              connect();
            }, retryDelay);
          } else {
            console.log('Máximo número de intentos de reconexión alcanzado');
            onError?.();
          }
        });

        ws.addEventListener('error', (error) => {
          console.error('Error de WebSocket:', error);
          // No cerrar la conexión aquí, dejar que el evento 'close' maneje la reconexión
        });

        ws.addEventListener('message', (event) => {
          try {
            JSON.parse(event.data); // Validar que los datos son JSON válido
            console.log('Datos recibidos correctamente');
          } catch (error) {
            console.error('Error al procesar datos recibidos:', error);
          }
        });

      } catch (error) {
        console.error('Error al crear conexión WebSocket:', error);
        onError?.();
      }
    };

    connect();

    return () => {
      console.log('Limpiando recursos del WebSocket');
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [enabled, attempts, retryAttempts, retryDelay, onError]);

  return socket;
}