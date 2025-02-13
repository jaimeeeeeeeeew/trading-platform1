import { useEffect, useRef } from 'react';
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
  priceBucketSize: number;  // Tamaño del grupo para las barras
}

interface PriceCoordinates {
  currentPrice: number;
  currentY: number;
  minPrice: number;
  minY: number;
  maxPrice: number;
  maxY: number;
}

// Función mejorada para determinar cambios significativos
const hasSignificantChanges = (prevBars: Props['data'], newBars: Props['data'], threshold = 0.05) => {
  if (!prevBars || !newBars || prevBars.length !== newBars.length) return true;

  const sampleSize = Math.min(50, prevBars.length);
  const step = Math.max(1, Math.floor(prevBars.length / sampleSize));

  for (let i = 0; i < prevBars.length; i += step) {
    const prevBar = prevBars[i];
    const newBar = newBars[i];
    if (!prevBar || !newBar) continue;

    if (Math.abs(newBar.volume - prevBar.volume) / prevBar.volume > threshold ||
        Math.abs(newBar.price - prevBar.price) > threshold) {
      return true;
    }
  }
  return false;
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
  priceBucketSize,
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const prevDataRef = useRef<Props['data']>([]);
  const updateTimeoutRef = useRef<number | null>(null);
  const renderRequestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0 || !priceCoordinates) {
      return;
    }

    const renderChart = () => {
      if (!hasSignificantChanges(prevDataRef.current, data)) {
        return;
      }
      prevDataRef.current = data;

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

      // Filtrar datos dentro del rango visible
      const visibleData = data.filter(d => 
        d.price >= visiblePriceRange.min && 
        d.price <= visiblePriceRange.max
      );

      // Separar bids y asks
      const bidsData = visibleData.filter(d => d.side === 'bid').sort((a, b) => b.price - a.price);
      const asksData = visibleData.filter(d => d.side === 'ask').sort((a, b) => a.price - b.price);

      // Función para agrupar datos
      const groupData = (data: typeof visibleData, groupSize: number) => {
        const result: typeof visibleData = [];

        for (let i = 0; i < data.length; i += groupSize) {
          const group = data.slice(i, i + groupSize);
          if (group.length > 0) {
            const totalVolume = group.reduce((sum, bar) => sum + bar.volume, 0);
            const avgPrice = group.reduce((sum, bar) => sum + bar.price * bar.volume, 0) / totalVolume;

            result.push({
              price: avgPrice,
              volume: totalVolume,
              normalizedVolume: 0, // Se normalizará después
              side: group[0].side
            });
          }
        }

        return result;
      };

      // Agrupar datos según el tamaño seleccionado
      const groupSize = priceBucketSize === 50 ? 5 : priceBucketSize === 100 ? 10 : 1;
      const groupedBids = groupSize === 1 ? bidsData : groupData(bidsData, groupSize);
      const groupedAsks = groupSize === 1 ? asksData : groupData(asksData, groupSize);

      // Normalizar volúmenes
      const allVolumes = [...groupedBids, ...groupedAsks].map(d => d.volume);
      const maxVolume = Math.max(...allVolumes);

      const normalizedBids = groupedBids.map(d => ({
        ...d,
        normalizedVolume: d.volume / maxVolume
      }));

      const normalizedAsks = groupedAsks.map(d => ({
        ...d,
        normalizedVolume: d.volume / maxVolume
      }));

      // Calcular altura de barra
      const barHeight = Math.abs(
        priceToY(currentPrice + 10) - priceToY(currentPrice)
      );

      // Renderizar barras de bids
      g.selectAll('.bid-bars')
        .data(normalizedBids)
        .join('rect')
        .attr('class', 'volume-bar bid')
        .attr('x', d => xScale(d.normalizedVolume))
        .attr('y', d => priceToY(d.price) - barHeight / 2)
        .attr('width', d => maxBarWidth - xScale(d.normalizedVolume))
        .attr('height', barHeight * 0.9)
        .attr('fill', '#26a69a')
        .attr('opacity', 0.9);

      // Renderizar barras de asks
      g.selectAll('.ask-bars')
        .data(normalizedAsks)
        .join('rect')
        .attr('class', 'volume-bar ask')
        .attr('x', d => xScale(d.normalizedVolume))
        .attr('y', d => priceToY(d.price) - barHeight / 2)
        .attr('width', d => maxBarWidth - xScale(d.normalizedVolume))
        .attr('height', barHeight * 0.9)
        .attr('fill', '#ef5350')
        .attr('opacity', 0.9);

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

    const scheduleRender = () => {
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
      renderRequestRef.current = requestAnimationFrame(renderChart);
    };

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = window.setTimeout(scheduleRender, 50);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
    };
  }, [data, width, height, currentPrice, priceCoordinates, visiblePriceRange, maxVisibleBars, priceBucketSize]);

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