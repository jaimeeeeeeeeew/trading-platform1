import { useEffect, useRef } from 'react';
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
  const { currentSymbol } = useTrading();
  const { toast } = useToast();

  // Efecto para manejar cambios en el símbolo
  useEffect(() => {
    if (widget.current && currentSymbol) {
      console.log('🔄 Cambiando símbolo a:', currentSymbol);
      try {
        // Asegurarnos de que el símbolo tenga el formato correcto para Binance
        const formattedSymbol = currentSymbol.includes(':') ? currentSymbol : `BINANCE:${currentSymbol}`;
        widget.current.setSymbol(formattedSymbol);
        console.log('✅ Símbolo actualizado a:', formattedSymbol);
      } catch (error) {
        console.error('❌ Error al cambiar símbolo:', error);
      }
    }
  }, [currentSymbol]);

  // Efecto para inicializar el widget
  useEffect(() => {
    if (!container.current) {
      console.error('❌ Container no encontrado');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      console.log('📦 Script de TradingView cargado');

      try {
        // Asegurarnos de que el símbolo inicial tenga el formato correcto
        const initialSymbol = currentSymbol ? 
          (currentSymbol.includes(':') ? currentSymbol : `BINANCE:${currentSymbol}`) : 
          'BINANCE:BTCUSDT';

        widget.current = new window.TradingView.widget({
          container_id: container.current!.id,
          width: "100%",
          height: "100%",
          symbol: initialSymbol,
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "es",
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          debug: true,
          autosize: true,
          studies: ["RSI@tv-basicstudies"],
          onChartReady: () => {
            console.log('📊 Chart listo - Símbolo actual:', initialSymbol);
          },
        });

        console.log('✅ Widget de TradingView creado exitosamente');
      } catch (error) {
        console.error('❌ Error al crear widget:', error);
        toast({
          title: "Error",
          description: "No se pudo inicializar el gráfico",
          duration: 3000,
        });
      }
    };

    script.onerror = () => {
      console.error('❌ Error al cargar script de TradingView');
      toast({
        title: "Error",
        description: "No se pudo cargar TradingView",
        duration: 3000,
      });
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []); // Solo se ejecuta una vez al montar el componente

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