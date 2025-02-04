import { useEffect, useRef } from 'react';
import { useCryptoStore } from '@/hooks/useCryptoData';

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);
  const { setSelectedSymbol } = useCryptoStore();

  useEffect(() => {
    if (!container.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      new window.TradingView.widget({
        container_id: container.current!.id,
        width: "100%",
        height: "100%",
        symbol: "BINANCE:BTCUSDT",
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
        save_image: false,
        hide_top_toolbar: false,
        withdateranges: true,
        allow_symbol_change: true,
        details: true,
        hotlist: true,
        calendar: true,
        show_popup_button: true,
        popup_width: "1000",
        popup_height: "650",
        custom_indicators_getter: function(PineJS) {
          return Promise.resolve([]);
        },
        loading_screen: { backgroundColor: "#131722" },
        overrides: { "mainSeriesProperties.style": 1 },
        studies_overrides: {},
        disabled_features: ["use_localstorage_for_settings"],
        enabled_features: ["study_templates"],
        charts_storage_url: 'https://saveload.tradingview.com',
        charts_storage_api_version: "1.1",
        client_id: 'tradingview.com',
        user_id: 'public_user_id',
        autosize: true,
        symbol_search_request_delay: 500,
        auto_save_delay: 5,
        debug: false,
        time_frames: [
          { text: "5y", resolution: "W" },
          { text: "1y", resolution: "W" },
          { text: "6m", resolution: "D" },
          { text: "3m", resolution: "D" },
          { text: "1m", resolution: "D" },
          { text: "5d", resolution: "60" },
          { text: "1d", resolution: "30" }
        ],
        saved_data: {
          content: undefined,
          charts_storage_url: undefined,
          client_id: undefined,
          user_id: undefined
        },
        datafeed: {
          onReady: function(callback) {
            callback({});
          },
          searchSymbols: function(userInput, exchange, symbolType, onResultReadyCallback) {
            // Implementación básica
          },
          resolveSymbol: function(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
            // Implementación básica
          },
          getBars: function(symbolInfo, resolution, from, to, onHistoryCallback, onErrorCallback, firstDataRequest) {
            // Implementación básica
          },
          subscribeBars: function(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
            const symbol = symbolInfo.name;
            if (symbol.includes('BTC')) {
              setSelectedSymbol('BTCUSDT');
            } else if (symbol.includes('ETH')) {
              setSelectedSymbol('ETHUSDT');
            } else if (symbol.includes('ADA')) {
              setSelectedSymbol('ADAUSDT');
            }
          },
          unsubscribeBars: function(subscriberUID) {
            // Implementación básica
          }
        }
      });
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [setSelectedSymbol]);

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