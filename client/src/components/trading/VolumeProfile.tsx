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
  grouping: '1' | '5' | '10';
}

interface PriceCoordinates {
  currentPrice: number;
  currentY: number;
  minPrice: number;
  minY: number;
  maxPrice: number;
  maxY: number;
}

const hasSignificantChanges = (prevBars: Props['data'], newBars: Props['data'], threshold = 0.1) => {
  if (!prevBars || !newBars || Math.abs(prevBars.length - newBars.length) > 10) return true;

  // Reducir el muestreo para mayor rendimiento
  const sampleSize = Math.min(20, prevBars.length);
  const step = Math.max(1, Math.floor(prevBars.length / sampleSize));

  let significantChanges = 0;
  const maxChanges = 3; // Número de cambios significativos permitidos antes de actualizar

  for (let i = 0; i < prevBars.length && significantChanges < maxChanges; i += step) {
    const prevBar = prevBars[i];
    const newBar = newBars[i];
    if (!prevBar || !newBar) continue;

    if (Math.abs(newBar.volume - prevBar.volume) / prevBar.volume > threshold) {
      significantChanges++;
    }
  }

  return significantChanges >= maxChanges;
};

const groupVolumeData = (data: Props['data'], groupSize: number) => {
  if (groupSize === 1) return data;

  const groups = new Map<number, {
    volume: number;
    side: 'bid' | 'ask';
    price: number;
    count: number;
  }>();

  // Agrupar datos por precio redondeado
  data.forEach(item => {
    const roundedPrice = Math.round(item.price / (10 * groupSize)) * (10 * groupSize);
    const existing = groups.get(roundedPrice);

    if (existing) {
      existing.volume += item.volume;
      existing.count++;
      // Mantener el lado con mayor volumen
      if (item.volume > existing.volume / 2) {
        existing.side = item.side;
      }
    } else {
      groups.set(roundedPrice, {
        volume: item.volume,
        side: item.side,
        price: roundedPrice,
        count: 1
      });
    }
  });

  // Convertir a array y normalizar volúmenes
  const groupedArray = Array.from(groups.values());
  const maxVolume = Math.max(...groupedArray.map(item => item.volume));

  return groupedArray.map(item => ({
    price: item.price,
    volume: item.volume,
    normalizedVolume: item.volume / maxVolume,
    side: item.side
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
  maxVisibleBars,
  grouping
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const prevDataRef = useRef<Props['data']>([]);
  const renderTimeoutRef = useRef<number | null>(null);

  // Memoizar los datos agrupados
  const groupedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return groupVolumeData(data, parseInt(grouping));
  }, [data, grouping]);

  // Memoizar los datos visibles y filtrados
  const visibleData = useMemo(() => {
    return groupedData.filter(d =>
      d.price >= visiblePriceRange.min &&
      d.price <= visiblePriceRange.max
    );
  }, [groupedData, visiblePriceRange]);

  useEffect(() => {
    if (!svgRef.current || !visibleData || visibleData.length === 0 || !priceCoordinates) {
      return;
    }

    const renderChart = () => {
      if (!hasSignificantChanges(prevDataRef.current, visibleData)) {
        return;
      }
      prevDataRef.current = visibleData;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const margin = { top: 20, right: -65, bottom: 20, left: 0 };
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
        const ratio = (price - currentPrice) / (priceCoordinates.maxPrice - priceCoordinates.minPrice);
        return priceCoordinates.currentY - margin.top + (ratio * (priceCoordinates.minY - priceCoordinates.maxY));
      };

      const bids = visibleData.filter(d => d.side === 'bid');
      const asks = visibleData.filter(d => d.side === 'ask');

      const barHeight = Math.max(1, innerHeight / maxVisibleBars);

      // Renderizar barras en lotes para mejor rendimiento
      const renderBars = (data: typeof visibleData, className: string, fill: string) => {
        const batchSize = 50;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          g.selectAll(`.${className}-${i}`)
            .data(batch)
            .join('rect')
            .attr('class', `volume-bar ${className}`)
            .attr('x', d => xScale(d.normalizedVolume))
            .attr('y', d => priceToY(d.price) - barHeight / 2)
            .attr('width', d => maxBarWidth - xScale(d.normalizedVolume))
            .attr('height', barHeight * 0.9)
            .attr('fill', fill)
            .attr('opacity', 0.9);
        }
      };

      renderBars(bids, 'bid', '#26a69a');
      renderBars(asks, 'ask', '#ef5350');

      // Renderizar línea de precio actual
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

    // Throttle rendering
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = window.setTimeout(() => {
      requestAnimationFrame(renderChart);
    }, 100); // Limitar actualizaciones a cada 100ms

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [visibleData, width, height, currentPrice, priceCoordinates, maxVisibleBars]);

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