import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

interface Props {
  data: {
    price: number;
    volume: number;
    normalizedVolume: number;
    side: 'bid' | 'ask';
  }[];
  width: number;
  height: number;
  visiblePriceRange: {
    min: number;
    max: number;
  };
  currentPrice: number;
  priceCoordinate: number | null;
  priceCoordinates: PriceCoordinates | null;
  maxVisibleBars: number;
}

interface PriceCoordinates {
  currentPrice: number;
  currentY: number;
  minPrice: number;
  minY: number;
  maxPrice: number;
  maxY: number;
}

// Función para determinar si dos arrays de barras son significativamente diferentes
const hasSignificantChanges = (prevBars: Props['data'], newBars: Props['data'], threshold = 0.1) => {
  if (prevBars.length !== newBars.length) return true;

  return newBars.some((newBar, i) => {
    const prevBar = prevBars[i];
    return Math.abs(newBar.volume - prevBar.volume) / prevBar.volume > threshold ||
           Math.abs(newBar.price - prevBar.price) > threshold;
  });
};

const mergeOverlappingBars = (bars: Props['data'], getY: (price: number) => number, tolerance: number = 2) => {
  // Aumentamos la tolerancia a 2 pixels para asegurar que no haya solapamientos
  const merged = new Map<number, Props['data'][0]>();

  // Ordenamos las barras por precio para asegurar un procesamiento consistente
  const sortedBars = [...bars].sort((a, b) => a.price - b.price);

  sortedBars.forEach(bar => {
    const y = Math.round(getY(bar.price));
    // Buscamos si hay alguna barra cercana en el rango de tolerancia
    const key = Math.floor(y / tolerance) * tolerance;

    if (merged.has(key)) {
      const existing = merged.get(key)!;
      // Sumamos volúmenes
      existing.volume += bar.volume;
      // Actualizamos el precio como promedio ponderado por volumen
      existing.price = (existing.price * (existing.volume - bar.volume) + 
                       bar.price * bar.volume) / existing.volume;
    } else {
      merged.set(key, { ...bar });
    }
  });

  // Convertimos el Map a array y recalculamos volúmenes normalizados
  const mergedArray = Array.from(merged.values());
  const maxVolume = Math.max(...mergedArray.map(b => b.volume));

  return mergedArray.map(bar => ({
    ...bar,
    normalizedVolume: bar.volume / maxVolume
  }));
};

export const VolumeProfile = ({
  data,
  width = 150,
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinate,
  priceCoordinates,
  maxVisibleBars
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const prevDataRef = useRef<Props['data']>([]);
  const updateTimeoutRef = useRef<number | null>(null);

  // Memoizar los datos procesados para evitar recálculos innecesarios
  const processedData = useMemo(() => {
    const visibleData = data.filter(
      d => d.price >= visiblePriceRange.min && d.price <= visiblePriceRange.max
    );

    const asks = visibleData.filter(d => d.side === 'ask').sort((a, b) => a.price - b.price);
    const bids = visibleData.filter(d => d.side === 'bid').sort((a, b) => b.price - a.price);

    return { asks, bids };
  }, [data, visiblePriceRange]);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0 || !priceCoordinates) {
      return;
    }

    // Función de renderizado que será throttled
    const renderChart = () => {
      const { asks, bids } = processedData;

      // Verificar si hay cambios significativos antes de actualizar
      const newData = [...asks, ...bids];
      if (!hasSignificantChanges(prevDataRef.current, newData)) {
        return;
      }
      prevDataRef.current = newData;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const margin = { top: 20, right: -60, bottom: 20, left: 0 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const maxBarWidth = innerWidth * 0.7;
      const xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([maxBarWidth, 0]);

      const priceToY = (price: number) => {
        if (!priceCoordinates) return 0;

        if (price === currentPrice) {
          return priceCoordinates.currentY - margin.top;
        }

        if (price > currentPrice) {
          const askRatio = (price - currentPrice) / (priceCoordinates.maxPrice - currentPrice);
          return priceCoordinates.currentY - margin.top - (askRatio * (priceCoordinates.currentY - priceCoordinates.maxY));
        }

        const bidRatio = (currentPrice - price) / (currentPrice - priceCoordinates.minPrice);
        return priceCoordinates.currentY - margin.top + (bidRatio * (priceCoordinates.minY - priceCoordinates.currentY));
      };

      const barHeight = Math.max(3, (priceCoordinates.minY - priceCoordinates.maxY) / (newData.length * 1.5));

      // Combinar barras que se solapan
      const mergedAsks = mergeOverlappingBars(asks, priceToY, barHeight);
      const mergedBids = mergeOverlappingBars(bids, priceToY, barHeight);

      // Etiquetas de precio
      const allPrices = [...mergedBids, ...mergedAsks].sort((a, b) => a.price - b.price);
      allPrices.forEach((d, i) => {
        if (i % 2 === 0) {
          g.append('text')
            .attr('class', 'price-label')
            .attr('x', -5)
            .attr('y', priceToY(d.price))
            .attr('dy', '0.32em')
            .attr('text-anchor', 'end')
            .attr('fill', '#ffffff')
            .attr('font-size', '10px')
            .text(`${d.price.toFixed(1)}`);
        }
      });

      // Barras de volumen
      g.selectAll('.bid-bars')
        .data(mergedBids)
        .join('rect')
        .attr('class', 'volume-bar bid')
        .attr('x', d => xScale(d.normalizedVolume))
        .attr('y', d => {
          const y = priceToY(d.price);
          return isNaN(y) ? 0 : y - barHeight / 2;
        })
        .attr('width', d => maxBarWidth - xScale(d.normalizedVolume))
        .attr('height', barHeight)
        .attr('fill', '#26a69a')
        .attr('opacity', 0.9);

      g.selectAll('.ask-bars')
        .data(mergedAsks)
        .join('rect')
        .attr('class', 'volume-bar ask')
        .attr('x', d => xScale(d.normalizedVolume))
        .attr('y', d => {
          const y = priceToY(d.price);
          return isNaN(y) ? 0 : y - barHeight / 2;
        })
        .attr('width', d => maxBarWidth - xScale(d.normalizedVolume))
        .attr('height', barHeight)
        .attr('fill', '#ef5350')
        .attr('opacity', 0.9);

      // Línea de precio actual
      if (priceCoordinates.currentPrice && priceCoordinates.currentY) {
        g.append('line')
          .attr('class', 'price-line')
          .attr('x1', -5)
          .attr('x2', innerWidth)
          .attr('y1', priceCoordinates.currentY - margin.top)
          .attr('y2', priceCoordinates.currentY - margin.top)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '2,2');

        g.append('text')
          .attr('class', 'current-price-label')
          .attr('x', innerWidth + 5)
          .attr('y', priceCoordinates.currentY - margin.top)
          .attr('dy', '0.32em')
          .attr('text-anchor', 'start')
          .attr('fill', '#ffffff')
          .attr('font-size', '11px')
          .attr('font-weight', 'bold')
          .text(priceCoordinates.currentPrice.toFixed(1));
      }
    };

    // Throttle las actualizaciones
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = window.setTimeout(renderChart, 100);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [processedData, width, height, currentPrice, priceCoordinates, visiblePriceRange, maxVisibleBars]);

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: `${width}px`,
        height: '100%',
        background: 'transparent',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 2
      }}
    >
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
};