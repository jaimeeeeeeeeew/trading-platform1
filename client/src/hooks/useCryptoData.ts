import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';

interface CryptoMetrics {
  direccion: number;
  dominancia: {
    left: number;
    right: number;
  };
  delta_futuros: {
    positivo: number;
    negativo: number;
  };
  delta_spot: {
    positivo: number;
    negativo: number;
  };
  transacciones: Array<{
    volume: string;
    price: string;
  }>;
}

interface CryptoStore {
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
}

// Store global para el símbolo seleccionado
export const useCryptoStore = create<CryptoStore>((set) => ({
  selectedSymbol: 'BTCUSDT',
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
}));

// Mock data para cada cripto
const cryptoData: Record<string, CryptoMetrics> = {
  'BTCUSDT': {
    direccion: 67813,
    dominancia: { left: 10391, right: 7049 },
    delta_futuros: { positivo: 8500, negativo: 4200 },
    delta_spot: { positivo: 12000, negativo: 6800 },
    transacciones: [
      { volume: "1.5", price: "67800" },
      { volume: "0.8", price: "67750" }
    ]
  },
  'ETHUSDT': {
    direccion: 2890,
    dominancia: { left: 8200, right: 5100 },
    delta_futuros: { positivo: 6300, negativo: 3100 },
    delta_spot: { positivo: 9500, negativo: 4700 },
    transacciones: [
      { volume: "12.5", price: "2885" },
      { volume: "8.2", price: "2880" }
    ]
  },
  'ADAUSDT': {
    direccion: 0.58,
    dominancia: { left: 4100, right: 2800 },
    delta_futuros: { positivo: 3200, negativo: 1900 },
    delta_spot: { positivo: 5100, negativo: 2400 },
    transacciones: [
      { volume: "10000", price: "0.578" },
      { volume: "8500", price: "0.575" }
    ]
  }
};

export function useCryptoData() {
  const { selectedSymbol } = useCryptoStore();

  return useQuery({
    queryKey: ['cryptoData', selectedSymbol],
    queryFn: async () => {
      // Simular una llamada a la API
      await new Promise(resolve => setTimeout(resolve, 500));
      return cryptoData[selectedSymbol] || cryptoData['BTCUSDT'];
    },
  });
}
