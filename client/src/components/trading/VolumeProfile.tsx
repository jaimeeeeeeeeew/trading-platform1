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

const MIN_BAR_HEIGHT = 2; // Altura mínima de barra en píxeles
const MAX_BAR_HEIGHT = 20; // Altura máxima de barra en píxeles
const PRICE_STEP = 10; // Cada nivel de precio es de $10

const groupDataByBars = (
  data: Props['data'],
  visiblePriceRange: { min: number; max: number },
  height: number
) => {
  if (!data.length) return { groupedData: [], groupFactor: 1 };

  // Calcular cuántos niveles de precio hay en el rango visible
  const visibleRange = visiblePriceRange.max - visiblePriceRange.min;
  const numPriceLevels = Math.ceil(visibleRange / PRICE_STEP);

  // Calcular altura actual por barra
  const currentBarHeight = height / numPriceLevels;

  // Si la altura es menor que el mínimo, necesitamos agrupar
  let groupFactor = 1;
  if (currentBarHeight < MIN_BAR_HEIGHT) {
    groupFactor = Math.ceil(MIN_BAR_HEIGHT / currentBarHeight);
  }
  // Si la altura es mayor que el máximo, también agrupamos
  else if (currentBarHeight > MAX_BAR_HEIGHT) {
    groupFactor = Math.floor(currentBarHeight / MAX_BAR_HEIGHT);
  }

  // Asegurar que el factor de agrupación sea múltiplo de PRICE_STEP
  groupFactor = Math.max(1, Math.round(groupFactor / PRICE_STEP) * PRICE_STEP);

  console.log('Calculando agrupación:', {
    visibleRange,
    numPriceLevels,
    currentBarHeight,
    groupFactor,
    datosOriginales: data.length
  });

  // Crear buckets de precio basados en el factor de agrupación
  const priceBuckets: Record<number, {
    totalVolume: number;
    count: number;
    side: 'bid' | 'ask';
  }> = {};

  // Agrupar datos en buckets
  data.forEach(item => {
    const bucketPrice = Math.floor(item.price / groupFactor) * groupFactor;

    if (!priceBuckets[bucketPrice]) {
      priceBuckets[bucketPrice] = {
        totalVolume: 0,
        count: 0,
        side: item.side
      };
    }

    priceBuckets[bucketPrice].totalVolume += item.volume;
    priceBuckets[bucketPrice].count++;
  });

  // Convertir buckets a array y calcular volumen normalizado
  const groupedData = Object.entries(priceBuckets).map(([price, data]) => {
    return {
      price: parseFloat(price),
      volume: data.totalVolume,
      normalizedVolume: 0, // Se calculará después
      side: data.side
    };
  });

  // Normalizar volúmenes
  const maxVolume = Math.max(...groupedData.map(d => d.volume));
  groupedData.forEach(d => {
    d.normalizedVolume = d.volume / maxVolume;
  });

  // Ordenar por precio
  groupedData.sort((a, b) => b.price - a.price);

  console.log('Agrupación completada:', {
    barrasOriginales: data.length,
    barrasAgrupadas: groupedData.length,
    factorAgrupacion: groupFactor
  });

  return { groupedData, groupFactor };
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

    // Filtrar datos por rango visible y agrupar si es necesario
    const visibleData = data.filter(
      d => d.price >= visiblePriceRange.min && d.price <= visiblePriceRange.max
    );

    const { groupedData, groupFactor } = groupDataByBars(visibleData, visiblePriceRange, height);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 25, right: 50, bottom: 25, left: 55 };
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

    // Etiquetas de precio con indicador de agrupación
    const allPrices = [...bids, ...asks].sort((a, b) => a.price - b.price);
    allPrices.forEach((d, i) => {
      if (i % 2 === 0) {
        g.append('text')
          .attr('class', 'price-label')
          .attr('x', -8)
          .attr('y', priceToY(d.price))
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .text(`${d.price.toFixed(0)}${groupFactor > 1 ? ` (x${groupFactor})` : ''}`);
      } else {
        g.append('text')
          .attr('class', 'price-label')
          .attr('x', -8)
          .attr('y', priceToY(d.price))
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#666')
          .attr('font-size', '10px')
          .text(`${d.price.toFixed(0)}`);
      }
    });

    // Barras de volumen
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

    // Línea de precio actual
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