import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface TradingContextType {
  currentSymbol: string;
  setCurrentSymbol: (symbol: string) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const STORAGE_KEY = 'trading_symbol';

export function TradingProvider({ children }: { children: ReactNode }) {
  // Intentar cargar el símbolo guardado, si no existe usar el default
  const [currentSymbol, setCurrentSymbol] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    console.log('TradingContext - Cargando símbolo guardado:', saved || 'BINANCE:BTCUSDT');
    return saved || 'BINANCE:BTCUSDT';
  });

  useEffect(() => {
    // Guardar el símbolo en localStorage cuando cambie
    console.log('TradingContext - Guardando nuevo símbolo:', currentSymbol);
    localStorage.setItem(STORAGE_KEY, currentSymbol);
  }, [currentSymbol]);

  const handleSymbolChange = (symbol: string) => {
    console.log('TradingContext - setCurrentSymbol llamado con:', symbol);
    setCurrentSymbol(symbol);
  };

  return (
    <TradingContext.Provider value={{ currentSymbol, setCurrentSymbol: handleSymbolChange }}>
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading() {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
}