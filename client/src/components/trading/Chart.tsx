import { useEffect, useRef, useCallback } from 'react';
import { useTrading } from '@/lib/trading-context';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<any>(null);
  const { currentSymbol, setCurrentSymbol } = useTrading();
  const { toast } = useToast();

  const handleSymbolChange = useCallback((symbol: string) => {
    console.log('TradingView - handleSymbolChange llamado con símbolo:', symbol);
    if (symbol !== currentSymbol) {
      console.log('TradingView - Actualizando símbolo de', currentSymbol, 'a', symbol);
      setCurrentSymbol(symbol);
      toast({
        title: "Símbolo actualizado",
        description: `Cambiado a ${symbol}`,
        duration: 2000
      });
    } else {
      console.log('TradingView - Símbolo sin cambios:', symbol);
    }
  }, [currentSymbol, setCurrentSymbol, toast]);

  useEffect(() => {
    if (!container.current) return;

    console.log('TradingView - Iniciando widget con símbolo:', currentSymbol);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      console.log('TradingView - Script cargado, creando widget...');

      widget.current = new window.TradingView.widget({
        container_id: container.current!.id,
        width: "100%",
        height: "100%",
        symbol: currentSymbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "es",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        studies: [
          "Volume@tv-basicstudies",
          "VWAP@tv-basicstudies"
        ],
        supported_resolutions: ["1", "5", "15", "30", "60", "D", "W"],
        save_image: true,
        // Detectar cambios de símbolo
        onSymbolChange: handleSymbolChange,
        // Agregar callback cuando el widget está listo
        onChartReady: () => {
          console.log('TradingView - Chart listo, verificando símbolo inicial');
          const actualSymbol = widget.current?.symbolInterval?.()?.symbol;
          console.log('TradingView - Símbolo actual del widget:', actualSymbol);
          if (actualSymbol && actualSymbol !== currentSymbol) {
            console.log('TradingView - Corrigiendo símbolo inicial');
            handleSymbolChange(actualSymbol);
          }
        }
      });
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [currentSymbol, handleSymbolChange]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-card">
      <div
        id="tradingview_widget"
        ref={container}
        className="w-full h-full"
      />
    </div>
  );
}