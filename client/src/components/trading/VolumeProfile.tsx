import { useEffect, useRef } from 'react';

interface Props {
  data: {
    price: number;
    volume: number;
    normalizedVolume: number;
    side: 'bid' | 'ask';
  }[];
  visiblePriceRange: {
    min: number;
    max: number;
  };
  currentPrice: number;
  height: number;
}

export const VolumeProfile = ({
  data,
  visiblePriceRange,
  currentPrice,
  height
}: Props) => {
  console.log('VolumeProfile render:', {
    dataLength: data?.length,
    visibleRange: visiblePriceRange,
    currentPrice,
    height
  });

  // Filtrar datos dentro del rango visible
  const visibleData = data?.filter(
    d => d.price >= visiblePriceRange.min && d.price <= visiblePriceRange.max
  ) || [];

  console.log('Visible data:', {
    length: visibleData.length,
    sample: visibleData.slice(0, 3)
  });

  // Función para calcular la posición vertical
  const calculatePosition = (price: number) => {
    if (!visiblePriceRange) return 0;
    const range = visiblePriceRange.max - visiblePriceRange.min;
    const position = ((visiblePriceRange.max - price) / range) * height;
    return Math.max(0, Math.min(height, position));
  };

  // Calcular altura de cada barra
  const barHeight = Math.max(2, height / ((visibleData.length || 1) * 1.2));

  return (
    <div 
      className="absolute right-0 top-0 w-[200px] h-full border-l border-border/10 bg-background/80"
      style={{ height: `${height}px`, zIndex: 50 }}
    >
      {/* Línea de precio actual */}
      <div 
        className="absolute w-full border-t border-white/80 border-dashed pointer-events-none"
        style={{ 
          top: `${calculatePosition(currentPrice)}px`,
          zIndex: 51
        }}
      >
        <span className="absolute right-1 -top-3 text-[10px] text-white bg-background/90 px-1 rounded">
          {currentPrice.toFixed(1)}
        </span>
      </div>

      {/* Barras de volumen */}
      {visibleData.map((item, index) => (
        <div
          key={`${item.price}-${index}`}
          className="absolute right-0 flex items-center w-full"
          style={{
            top: `${calculatePosition(item.price)}px`,
            height: `${barHeight}px`,
          }}
        >
          <div
            className={`h-full transition-all duration-200 ${
              item.side === 'bid' ? 'bg-green-500/60' : 'bg-red-500/60'
            } hover:opacity-100`}
            style={{
              width: `${Math.max(40, item.normalizedVolume * 180)}px`,
            }}
          />
          <span className="absolute right-1 text-[9px] text-white/90">
            {item.price.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
};