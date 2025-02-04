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
    console.log('🔄 Inicializando gráfico...');

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
          symbol: "BTCUSDT",
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "es",
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          onChartReady: () => {
            console.log('📊 Chart listo, intentando acceder a los datos...');

            const chart = widget.current?.chart();
            if (!chart) {
              console.error('❌ No se pudo obtener el objeto chart');
              return;
            }

            // Imprimir el objeto chart para depuración
            console.log('Objeto chart:', chart);

            // Verificar si tenemos acceso a series
            const series = chart.series();
            console.log('Series disponibles:', series);

            try {
              // Intentar acceder a los datos directamente
              const allBars = series.data();
              console.log('Datos crudos disponibles:', allBars);

              // Intentar obtener el último precio
              const lastPrice = series.lastPrice();
              console.log('Último precio disponible:', lastPrice);
            } catch (error) {
              console.error('Error al acceder a los datos:', error);
            }
          },
          debug: true,
          autosize: true,
        });

        console.log('✅ Widget de TradingView creado');
      } catch (error) {
        console.error('❌ Error al crear widget:', error);
      }
    };

    script.onerror = () => {
      console.error('❌ Error al cargar script de TradingView');
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

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