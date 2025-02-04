import { useTrading } from '@/lib/trading-context';

export default function Chart() {
  const { currentSymbol } = useTrading();

  // Construir la URL del widget de TradingView
  const tradingViewUrl = `https://www.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${currentSymbol}&interval=1&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=f1f3f6&studies=%5B%22MAExp%40tv-basicstudies%22%2C%22VWAP%40tv-basicstudies%22%5D&theme=dark&style=1&timezone=exchange&withdateranges=1&showpopupbutton=1&enablepublishing=0&allowsymbolchange=1`;

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-[#1a1a1a]">
      <iframe
        id="tradingview_widget"
        src={tradingViewUrl}
        className="w-full h-full"
        style={{ border: 'none' }}
        allow="fullscreen"
        title="TradingView Chart"
      />
    </div>
  );
}