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
        widget.current = new window.TradingView.widget({
          container_id: container.current!.id,
          width: "100%",
          height: "100%",
          symbol: "BINANCE:BTCUSDT",
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
            console.log('📊 Chart listo');
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
  }, []);

  // Efecto específico para cambios de símbolo
  useEffect(() => {
    if (widget.current && currentSymbol) {
      const symbolToUse = currentSymbol.includes(':') ? currentSymbol : `BINANCE:${currentSymbol}`;
      try {
        widget.current.chart().setSymbol(symbolToUse);
        console.log('✅ Símbolo actualizado a:', symbolToUse);
      } catch (error) {
        console.error('❌ Error al cambiar símbolo:', error);
      }
    }
  }, [currentSymbol]);

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