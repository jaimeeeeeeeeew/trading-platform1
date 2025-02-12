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
  // Filtrar datos dentro del rango visible
  const visibleData = data.filter(
    d => d.price >= visiblePriceRange.min && d.price <= visiblePriceRange.max
  );

  // Función para calcular la posición vertical
  const calculatePosition = (price: number) => {
    const range = visiblePriceRange.max - visiblePriceRange.min;
    const position = ((visiblePriceRange.max - price) / range) * height;
    return Math.max(0, Math.min(height, position));
  };

  // Calcular altura de cada barra
  const barHeight = Math.max(1, height / (visibleData.length * 1.2));

  return (
    <div 
      className="absolute right-0 top-0 w-[180px] h-full border-l border-border/10 bg-background/50"
      style={{ height: `${height}px` }}
    >
      {/* Línea de precio actual */}
      <div 
        className="absolute w-full border-t border-white/50 border-dashed pointer-events-none"
        style={{ 
          top: `${calculatePosition(currentPrice)}px`,
          zIndex: 20
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
          className="absolute right-0 flex items-center"
          style={{
            top: `${calculatePosition(item.price)}px`,
            height: `${barHeight}px`,
            width: '180px',
          }}
        >
          <div
            className={`h-full transition-all duration-200 ${
              item.side === 'bid' ? 'bg-green-500/40' : 'bg-red-500/40'
            }`}
            style={{
              width: `${Math.max(20, item.normalizedVolume * 160)}px`,
            }}
          />
          <span className="absolute right-1 text-[9px] text-white/70">
            {item.price.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
};