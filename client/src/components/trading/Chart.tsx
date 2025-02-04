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

  // Función para verificar y actualizar el símbolo actual
  const handleSymbolChange = useCallback((newSymbol: string) => {
    if (!newSymbol || newSymbol === currentSymbol) return;

    console.warn('📊 TradingView - Intentando cambiar símbolo:', currentSymbol, '->', newSymbol);
    setCurrentSymbol(newSymbol);

    toast({
      title: "Símbolo Actualizado",
      description: `Cambiado a ${newSymbol}`,
      duration: 3000,
    });
  }, [currentSymbol, setCurrentSymbol, toast]);

  useEffect(() => {
    if (!container.current) {
      console.error('❌ Container no encontrado');
      return;
    }

    console.warn('📊 TradingView - Iniciando configuración...');
    console.warn('📊 TradingView - Símbolo actual:', currentSymbol);

    // Cargar el script de TradingView
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      console.warn('📊 TradingView - Script cargado, creando widget');

      try {
        widget.current = new window.TradingView.widget({
          container_id: container.current!.id,
          width: "100%",
          height: "100%",
          symbol: currentSymbol,
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "es",
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          onSymbolChange: (symbolData: any) => {
            console.warn('📊 TradingView - onSymbolChange evento:', symbolData);
            handleSymbolChange(symbolData);
          },
          onChartReady: () => {
            console.warn('📊 TradingView - Chart listo');

            // Obtener información del símbolo cuando el chart esté listo
            const chart = widget.current?.chart();
            if (chart) {
              // Obtener información inicial del símbolo
              chart.symbolInfo().then((symbolInfo: any) => {
                console.warn('📊 TradingView - Información del símbolo:', {
                  nombre: symbolInfo.name,
                  descripcion: symbolInfo.description,
                  precio: symbolInfo.last_price,
                  moneda: symbolInfo.currency_code,
                });
              });

              // Suscribirse a actualizaciones de precio en tiempo real
              chart.onRealtimeCallback((callback: any) => {
                console.warn('📊 TradingView - Actualización de precio:', {
                  symbol: callback.symbol,
                  precio: callback.price,
                  volumen: callback.volume,
                  timestamp: new Date(callback.time * 1000).toLocaleString(),
                });
              });
            }

            // Verificar el símbolo actual
            if (widget.current && widget.current.symbolInterval) {
              const currentWidgetSymbol = widget.current.symbolInterval().symbol;
              console.warn('📊 TradingView - Símbolo del widget:', currentWidgetSymbol);

              if (currentWidgetSymbol !== currentSymbol) {
                handleSymbolChange(currentWidgetSymbol);
              }
            }
          },
          debug: true,
          autosize: true,
        });

        console.warn('✅ Widget creado exitosamente');
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