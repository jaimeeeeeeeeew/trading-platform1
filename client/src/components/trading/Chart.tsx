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
  const chart = useRef<any>(null);
  const { currentSymbol } = useTrading();
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔄 Iniciando efecto para cargar TradingView');
    if (!container.current) {
      console.error('❌ Container ref no disponible');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      console.log('✅ Script de TradingView cargado');

      if (!window.TradingView) {
        console.error('❌ TradingView no disponible en window');
        return;
      }

      try {
        console.log('🎯 Intentando crear widget de TradingView');
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
          studies: ["RSI@tv-basicstudies"],
          save_image: true,
          onChartReady: () => {
            console.log('📊 Chart listo - Obteniendo objeto chart');
            chart.current = widget.current.chart();

            if (!chart.current) {
              console.error('❌ No se pudo obtener el objeto chart');
              return;
            }

            console.log('📊 Objeto chart obtenido:', chart.current);
            console.log('📊 Métodos disponibles en chart:', Object.getOwnPropertyNames(chart.current));

            // Intentar acceder a métodos específicos
            if (typeof chart.current.priceScale === 'function') {
              console.log('✅ Método priceScale disponible');
              const priceScale = chart.current.priceScale('right');
              console.log('📊 PriceScale:', priceScale);
            } else {
              console.log('❌ Método priceScale no disponible');
            }

            if (typeof chart.current.timeScale === 'function') {
              console.log('✅ Método timeScale disponible');
              const timeScale = chart.current.timeScale();
              console.log('📊 TimeScale:', timeScale);
            } else {
              console.log('❌ Método timeScale no disponible');
            }

            // Actualizar símbolo si es necesario
            if (currentSymbol) {
              console.log('🔄 Actualizando símbolo a:', currentSymbol);
              const symbolToUse = currentSymbol.includes(':') ? currentSymbol : `BINANCE:${currentSymbol}`;
              widget.current.setSymbol(symbolToUse);
            }
          }
        });

        console.log('✅ Widget creado exitosamente');

      } catch (error) {
        console.error('❌ Error al crear widget:', error);
        toast({
          title: "Error",
          description: "No se pudo inicializar el gráfico",
          duration: 3000,
        });
      }
    };

    script.onerror = (error) => {
      console.error('❌ Error al cargar script de TradingView:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar TradingView",
        duration: 3000,
      });
    };

    document.head.appendChild(script);
    console.log('✅ Script agregado al head');

    return () => {
      if (document.head.contains(script)) {
        console.log('🧹 Limpiando script de TradingView');
        document.head.removeChild(script);
      }
    };
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