import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  enabled?: boolean;
  onData?: (data: any) => void;
  onProfileData?: (data: ProfileData[]) => void;
  onError?: (error: any) => void;
}

interface ProfileData {
  price: number;
  volume: number;
  side: 'bid' | 'ask';
  total: number;
}

export function useSocketIO({ 
  enabled = true, 
  onData, 
  onProfileData,
  onError 
}: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!enabled) return;

    const socket = io(window.location.origin, {
      path: '/socket.io',
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      transports: ['websocket'],
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🟢 Socket.IO conectado - ID:', socket.id);
      console.log('📡 Solicitando datos iniciales del orderbook...');
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Solicitar datos iniciales del orderbook al conectar
      socket.emit('request_orderbook');
    });

    socket.on('marketData', (data) => {
      console.log('📊 Datos de mercado recibidos via Socket.IO:', {
        timestamp: new Date().toISOString(),
        data: data
      });
      onData?.(data);
    });

    socket.on('profile_data', (data: ProfileData[]) => {
      console.log('📊 Datos de perfil recibidos:', {
        timestamp: new Date().toISOString(),
        niveles: data.length,
        muestra: data.slice(0, 3)
      });
      onProfileData?.(data);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error);
      reconnectAttempts.current += 1;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('🔴 Máximo número de intentos de reconexión alcanzado');
        socket.disconnect();
      }

      onError?.(error);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 Socket.IO desconectado - Razón:', reason);
      setIsConnected(false);
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log('🔄 Intento de reconexión Socket.IO:', attempt);
    });

    socket.on('reconnect', (attempt) => {
      console.log('🟢 Socket.IO reconectado después de', attempt, 'intentos');
    });

    return () => {
      console.log('🧹 Limpiando conexión Socket.IO');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, onData, onProfileData, onError]);

  const sendData = (data: any) => {
    if (socketRef.current?.connected) {
      console.log('📤 Enviando datos via Socket.IO:', data);
      socketRef.current.emit('orderbook_data', data);
    } else {
      console.warn('⚠️ Socket.IO no está conectado, no se pueden enviar datos');
    }
  };

  return {
    isConnected,
    sendData,
    socket: socketRef.current,
  };
}