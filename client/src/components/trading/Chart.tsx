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
          studies: ["Volume@tv-basicstudies"],
          save_image: true,
          onChartReady: () => {
            console.log('📊 Chart listo - Iniciando configuración');
            try {
              // Obtener el widget y sus propiedades
              const activeChart = widget.current.activeChart();
              console.log('📊 Active Chart disponible:', !!activeChart);

              // Listar todas las propiedades y métodos disponibles
              console.log('📊 Propiedades del widget:', Object.keys(widget.current));

              // Intentar obtener los estudios (incluyendo volumen)
              const studies = activeChart.getAllStudies();
              console.log('📊 Estudios disponibles:', studies);

              // Intentar obtener los datos visibles
              const visibleRange = activeChart.getVisibleRange();
              console.log('📊 Rango visible:', visibleRange);

              // Intentar suscribirnos a cambios en el chart
              activeChart.onDataLoaded().subscribe(
                null,
                () => {
                  console.log('📊 Nuevos datos cargados');
                  const range = activeChart.getVisiblePriceRange();
                  console.log('📊 Rango de precios:', range);
                }
              );

            } catch (error) {
              console.error('❌ Error en onChartReady:', error);
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