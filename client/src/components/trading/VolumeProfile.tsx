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
}

interface PriceCoordinates {
  currentPrice: number;
  currentY: number;
  minPrice: number;
  minY: number;
  maxPrice: number;
  maxY: number;
}

// Constantes actualizadas para la agrupación dinámica
const ZOOM_LEVELS = {
  TIGHT: 100,    // Rango de $100 o menos - usar 1x
  MEDIUM: 500,   // Rango de $500 o menos - usar 5x
  WIDE: 1000     // Rango mayor a $1000 - usar 10x
} as const;

const GROUP_SIZES = {
  SMALL: 1,    // Sin agrupación (1:1)
  MEDIUM: 5,   // Grupos de $5 (5:1)
  LARGE: 10    // Grupos de $10 (10:1)
} as const;

const getGroupSize = (priceRange: number): number => {
  console.log('Calculating group size for price range:', priceRange);

  if (priceRange <= ZOOM_LEVELS.TIGHT) {
    console.log('Using SMALL grouping (1x) for tight zoom');
    return GROUP_SIZES.SMALL;
  } else if (priceRange <= ZOOM_LEVELS.MEDIUM) {
    console.log('Using MEDIUM grouping (5x) for medium zoom');
    return GROUP_SIZES.MEDIUM;
  }
  console.log('Using LARGE grouping (10x) for wide zoom');
  return GROUP_SIZES.LARGE;
};

const getGroupFactor = (groupSize: number): string => {
  switch (groupSize) {
    case GROUP_SIZES.SMALL:
      return '';        // Sin indicador para datos individuales
    case GROUP_SIZES.MEDIUM:
      return 'x5';     // Indicador para grupos de $5
    case GROUP_SIZES.LARGE:
      return 'x10';    // Indicador para grupos de $10
    default:
      return `x${groupSize}`;
  }
};

const groupData = (data: Props['data'], groupSize: number) => {
  // Si no hay agrupación, normalizar los volúmenes directamente
  if (groupSize === 1) {
    const maxVolume = Math.max(...data.map(d => d.volume));
    return data.map(item => ({
      ...item,
      normalizedVolume: item.volume / maxVolume
    }));
  }

  const groups = new Map<number, { volume: number; side: 'bid' | 'ask' }>();

  data.forEach(item => {
    const groupPrice = Math.floor(item.price / groupSize) * groupSize;
    const existing = groups.get(groupPrice) || { volume: 0, side: item.side };
    groups.set(groupPrice, {
      volume: existing.volume + item.volume,
      side: item.side
    });
  });

  const maxVolume = Math.max(...Array.from(groups.values()).map(g => g.volume));

  return Array.from(groups.entries()).map(([price, { volume, side }]) => ({
    price,
    volume,
    normalizedVolume: volume / maxVolume,
    side
  }));
};

export const VolumeProfile = ({
  data,
  width = 80,
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinate,
  priceCoordinates
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0 || !priceCoordinates) {
      console.log('VolumeProfile: Missing data or coordinates:', { 
        data: data?.length, 
        priceCoordinates: !!priceCoordinates 
      });
      return;
    }

    // Calcular el rango de precios visible actual
    const visibleRange = visiblePriceRange.max - visiblePriceRange.min;

    // Usar una ventana móvil alrededor del precio actual para determinar el zoom
    const zoomWindow = Math.min(visibleRange, 2000); // Limitar la ventana a 2000 para evitar grupos muy grandes

    console.log('Volume Profile Range Analysis:', {
      fullRange: visibleRange,
      zoomWindow,
      currentPrice,
      visiblePrices: {
        min: visiblePriceRange.min,
        max: visiblePriceRange.max
      }
    });

    const groupSize = getGroupSize(zoomWindow);

    console.log('Selected grouping configuration:', {
      zoomWindow,
      groupSize,
      groupFactor: getGroupFactor(groupSize)
    });

    const groupedData = groupData(data, groupSize);

    console.log('VolumeProfile Data:', {
      totalItems: groupedData.length,
      bids: groupedData.filter(d => d.side === 'bid').length,
      asks: groupedData.filter(d => d.side === 'ask').length,
      priceRange: visibleRange,
      groupSize,
      originalDataLength: data.length,
      sampleOriginalData: data[0],
      sampleGroupedData: groupedData[0]
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 25, right: 50, bottom: 25, left: 55 }; // Increased left margin for price labels
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxBarWidth = innerWidth * 1.6;

    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([maxBarWidth/2, 0]);

    const priceToY = (price: number) => {
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

    const barHeight = Math.max(1, (priceCoordinates.minY - priceCoordinates.maxY) / (groupedData.length * 2));

    const asks = groupedData
      .filter(d => d.side === 'ask')
      .sort((a, b) => a.price - b.price);

    const bids = groupedData
      .filter(d => d.side === 'bid')
      .sort((a, b) => b.price - a.price);

    // Price labels on the left side
    const allPrices = [...bids, ...asks].sort((a, b) => a.price - b.price);
    allPrices.forEach((d, i) => {
      if (i % 2 === 0) { // Show full label for every other price
        g.append('text')
          .attr('class', 'price-label')
          .attr('x', -8)
          .attr('y', priceToY(d.price))
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .text(`${d.price}${groupSize > GROUP_SIZES.SMALL ? ` (${getGroupFactor(groupSize)})` : ''}`);
      } else {
        g.append('text')
          .attr('class', 'price-label')
          .attr('x', -8)
          .attr('y', priceToY(d.price))
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#666')
          .attr('font-size', '10px')
          .text(`${d.price}`);
      }
    });

    g.selectAll('.bid-bars')
      .data(bids)
      .join('rect')
      .attr('class', 'volume-bar bid')
      .attr('x', d => xScale(d.normalizedVolume))
      .attr('y', d => {
        const y = priceToY(d.price);
        return isNaN(y) ? 0 : y - barHeight / 2;
      })
      .attr('width', d => maxBarWidth/2 - xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('fill', '#26a69a')
      .attr('opacity', 0.8);

    g.selectAll('.ask-bars')
      .data(asks)
      .join('rect')
      .attr('class', 'volume-bar ask')
      .attr('x', d => xScale(d.normalizedVolume))
      .attr('y', d => {
        const y = priceToY(d.price);
        return isNaN(y) ? 0 : y - barHeight / 2;
      })
      .attr('width', d => maxBarWidth/2 - xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('fill', '#ef5350')
      .attr('opacity', 0.8);

    if (priceCoordinates.currentPrice && priceCoordinates.currentY) {
      g.append('line')
        .attr('class', 'price-line')
        .attr('x1', -5)
        .attr('x2', innerWidth)
        .attr('y1', priceCoordinates.currentY - margin.top)
        .attr('y2', priceCoordinates.currentY - margin.top)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      g.append('text')
        .attr('class', 'price-label')
        .attr('x', innerWidth + 8)
        .attr('y', priceCoordinates.currentY - margin.top)
        .attr('dy', '0.32em')
        .attr('text-anchor', 'start')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .text(priceCoordinates.currentPrice.toFixed(1));
    }

  }, [data, width, height, currentPrice, priceCoordinates, visiblePriceRange]);

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