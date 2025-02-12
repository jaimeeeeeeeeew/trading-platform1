import { useEffect, useState, useCallback, useRef } from 'react';

interface WebSocketOptions {
  onError?: () => void;
  enabled?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  onOpen?: () => void;
  onMessage?: (data: any) => void;
  onClose?: () => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private onOpenCallback: (() => void) | null = null;
  private onMessageCallback: ((data: any) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private onErrorCallback: ((error: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect() {
    try {
      if (this.isReconnecting) return;
      this.isReconnecting = true;

      console.log('Connecting to WebSocket:', this.url);
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener('open', () => {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.onOpenCallback?.();
      });

      this.ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessageCallback?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      this.ws.addEventListener('close', () => {
        console.log('WebSocket connection closed');
        this.handleReconnect();
        this.onCloseCallback?.();
      });

      this.ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        this.onErrorCallback?.(error);
      });

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

      this.reconnectTimeout = setTimeout(() => {
        this.isReconnecting = false;
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.isReconnecting = false;
    }
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  public onOpen(callback: () => void) {
    this.onOpenCallback = callback;
  }

  public onMessage(callback: (data: any) => void) {
    this.onMessageCallback = callback;
  }

  public onClose(callback: () => void) {
    this.onCloseCallback = callback;
  }

  public onError(callback: (error: Event) => void) {
    this.onErrorCallback = callback;
  }

  public close() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export function useWebSocket({
  onError,
  enabled = true,
  retryAttempts = 5,
  retryDelay = 1000,
  onOpen,
  onMessage,
  onClose
}: WebSocketOptions = {}) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log('Attempting to connect WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        console.log('WebSocket connection established successfully');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        setSocket(ws);
        onOpen?.();
      });

      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });

      ws.addEventListener('close', () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        setSocket(null);
        onClose?.();

        if (reconnectAttemptsRef.current < retryAttempts) {
          const delay = Math.min(retryDelay * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${retryAttempts})`);
          setTimeout(connect, delay);
          reconnectAttemptsRef.current++;
        } else {
          console.log('Maximum reconnection attempts reached');
          onError?.();
        }
      });

      ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
      });

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      onError?.();
    }
  }, [onError, retryAttempts, retryDelay, onOpen, onMessage, onClose]);

  useEffect(() => {
    if (!enabled) {
      console.log('WebSocket connection disabled');
      return;
    }

    connect();

    return () => {
      console.log('Cleaning up WebSocket connection');
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connect]);

  return { socket, isConnected };
}