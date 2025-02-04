import { useEffect, useRef, useCallback, useState } from 'react';
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
          symbol: "BTCUSDT", // This line is from edited code, potentially overriding user selection.
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "es",
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          onChartReady: () => {
            console.log('📊 Gráfico listo');

            const chart = widget.current?.chart();
            if (!chart) {
              console.error('❌ No se pudo obtener el objeto chart');
              return;
            }

            // Calcular precios cuando se cargan datos
            chart.onDataLoaded().subscribe(
              null,
              () => {
                console.log('📊 Datos cargados, calculando rango de precios...');
                const bars = chart.series().bars();
                if (bars && bars.length > 0) {
                  let maxPrice = -Infinity;
                  let minPrice = Infinity;

                  for (let i = 0; i < bars.length; i++) {
                    const bar = bars[i];
                    if (bar) {
                      maxPrice = Math.max(maxPrice, bar.high);
                      minPrice = Math.min(minPrice, bar.low);
                    }
                  }

                  console.log('\n');
                  console.log('========================================');
                  console.log('   🔍 RANGO DE PRECIOS DEL GRÁFICO');
                  console.log('========================================');
                  console.log(`   📈 Precio Máximo: $${maxPrice.toFixed(2)}`);
                  console.log(`   📉 Precio Mínimo: $${minPrice.toFixed(2)}`);
                  console.log('========================================\n');
                } else {
                  console.log('❌ No se encontraron barras de datos');
                }
              }
            );
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