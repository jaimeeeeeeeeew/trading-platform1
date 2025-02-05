import { useEffect, useState } from 'react';

interface WebSocketOptions {
  onError?: () => void;
  enabled?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onOpenCallback: (() => void) | null = null;
  private onMessageCallback: ((data: string) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private onErrorCallback: ((error: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener('open', () => {
        this.onOpenCallback?.();
      });

      this.ws.addEventListener('message', (event) => {
        this.onMessageCallback?.(event.data);
      });

      this.ws.addEventListener('close', () => {
        this.onCloseCallback?.();
      });

      this.ws.addEventListener('error', (error) => {
        this.onErrorCallback?.(error);
      });

    } catch (error) {
      console.error('Error al crear conexión WebSocket:', error);
    }
  }

  public send(data: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.error('WebSocket no está conectado');
    }
  }

  public onOpen(callback: () => void) {
    this.onOpenCallback = callback;
  }

  public onMessage(callback: (data: string) => void) {
    this.onMessageCallback = callback;
  }

  public onClose(callback: () => void) {
    this.onCloseCallback = callback;
  }

  public onError(callback: (error: Event) => void) {
    this.onErrorCallback = callback;
  }

  public close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
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
        });

        ws.addEventListener('message', (event) => {
          try {
            JSON.parse(event.data);
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