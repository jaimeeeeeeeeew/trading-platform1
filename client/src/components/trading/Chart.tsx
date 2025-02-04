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
        // Intentar cambiar el símbolo usando setSymbol directamente en el widget
        widget.current.setSymbol(currentSymbol, {
          onSuccess: () => {
            console.log('✅ Símbolo cambiado exitosamente');
          },
          onError: (error: any) => {
            console.error('❌ Error cambiando símbolo:', error);
          }
        });
      } catch (error) {
        console.error('❌ Error al intentar cambiar el símbolo:', error);
      }
    }
  }, [currentSymbol]);

  // Efecto para inicializar el widget
  useEffect(() => {
    const loadTradingView = () => {
      if (!container.current) {
        console.error('❌ Container no encontrado');
        return;
      }

      try {
        // Crear el widget con configuración extendida
        widget.current = new window.TradingView.widget({
          container_id: container.current!.id,
          width: "100%",
          height: "100%",
          symbol: currentSymbol || "BINANCE:BTCUSDT", // Usar el símbolo actual o BTCUSDT por defecto
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
          studies: [
            "RSI@tv-basicstudies",
            "MASimple@tv-basicstudies",
            "MACD@tv-basicstudies"
          ],
          // Eventos del gráfico
          onChartReady: () => {
            console.log("🎯 Chart Ready - Símbolo actual:", currentSymbol);

            // Configurar un intervalo para monitorear datos
            const interval = setInterval(() => {
              try {
                if (widget.current) {
                  const symbolInfo = widget.current.symbolInterval();
                  if (symbolInfo) {
                    console.log("📊 Información actual:", symbolInfo);
                  }
                }
              } catch (error) {
                console.error("❌ Error monitoreando datos:", error);
              }
            }, 1000);

            return () => clearInterval(interval);
          },
        });

        console.log('✅ Widget de TradingView creado exitosamente');
      } catch (error) {
        console.error('❌ Error initializing TradingView:', error);
        toast({
          title: "Error",
          description: "No se pudo inicializar el gráfico",
          duration: 3000,
        });
      }
    };

    // Cargar el script de TradingView
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = loadTradingView;
    script.onerror = () => {
      console.error('❌ Error loading TradingView script');
      toast({
        title: "Error",
        description: "No se pudo cargar TradingView",
        duration: 3000,
      });
    };

    document.head.appendChild(script);

    // Cleanup
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