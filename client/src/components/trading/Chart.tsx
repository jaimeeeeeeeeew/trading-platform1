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
            console.log('📊 Chart listo');

            // Intentar obtener datos cada segundo
            const interval = setInterval(() => {
              try {
                const chart = widget.current?.chart();
                if (!chart) {
                  console.log('❌ Chart no disponible aún');
                  return;
                }

                const symbol = chart.symbol();
                const resolution = chart.resolution();

                console.log('🔍 Datos actuales:', {
                  symbol,
                  resolution
                });

                // Obtener el estudio actual
                const studies = chart.getAllStudies();
                console.log('📈 Estudios disponibles:', studies);

                // Obtener los precios visibles
                const priceRange = chart.priceRange();
                if (priceRange) {
                  console.log('\n');
                  console.log('========================================');
                  console.log('   🔍 RANGO DE PRECIOS VISIBLE');
                  console.log('========================================');
                  console.log(`   📈 Precio Máximo: $${priceRange.max}`);
                  console.log(`   📉 Precio Mínimo: $${priceRange.min}`);
                  console.log('========================================\n');
                }
              } catch (error) {
                console.error('Error al obtener datos:', error);
              }
            }, 1000);

            return () => clearInterval(interval);
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