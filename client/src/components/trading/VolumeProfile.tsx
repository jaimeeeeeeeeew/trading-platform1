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

const MIN_BAR_HEIGHT = 4; // Altura mínima en píxeles
const MAX_BAR_HEIGHT = 15; // Altura máxima en píxeles
const PRICE_STEP = 10; // Incremento base de precio

const groupDataByBars = (
  data: Props['data'],
  visiblePriceRange: { min: number; max: number },
  height: number
) => {
  if (!data.length) return { groupedData: [], groupFactor: 1 };

  // Calcular el rango de precios visible
  const visibleRange = visiblePriceRange.max - visiblePriceRange.min;
  const numPriceLevels = Math.ceil(visibleRange / PRICE_STEP);

  // Calcular altura inicial por barra
  const initialBarHeight = height / numPriceLevels;

  // Determinar factor de agrupación basado en la altura de barra deseada
  let groupFactor = 1;
  if (initialBarHeight < MIN_BAR_HEIGHT) {
    // Calcular cuántas barras necesitamos agrupar para alcanzar la altura mínima
    groupFactor = Math.ceil(MIN_BAR_HEIGHT / initialBarHeight);
    // Redondear al siguiente múltiplo de PRICE_STEP
    groupFactor = Math.ceil(groupFactor / PRICE_STEP) * PRICE_STEP;
  }

  console.log('Calculando agrupación:', {
    visibleRange,
    numPriceLevels,
    initialBarHeight,
    groupFactor,
    datosOriginales: data.length,
    alturaFinalEstimada: initialBarHeight * groupFactor
  });

  // Crear buckets de precio basados en el factor de agrupación
  const priceBuckets: Record<number, {
    totalVolume: number;
    totalPrice: number;
    count: number;
    side: 'bid' | 'ask';
  }> = {};

  // Agrupar datos en buckets
  data.forEach(item => {
    const bucketPrice = Math.floor(item.price / groupFactor) * groupFactor;

    if (!priceBuckets[bucketPrice]) {
      priceBuckets[bucketPrice] = {
        totalVolume: 0,
        totalPrice: 0,
        count: 0,
        side: item.side
      };
    }

    const bucket = priceBuckets[bucketPrice];
    bucket.totalVolume += item.volume;
    bucket.totalPrice += item.price * item.volume; // Precio ponderado por volumen
    bucket.count++;
  });

  // Convertir buckets a array con precio promedio ponderado
  const groupedData = Object.entries(priceBuckets)
    .map(([price, data]) => ({
      price: data.totalPrice / data.totalVolume, // Precio promedio ponderado por volumen
      volume: data.totalVolume,
      normalizedVolume: 0, // Se calculará después
      side: data.side
    }))
    .sort((a, b) => b.price - a.price); // Ordenar por precio

  // Normalizar volúmenes
  const maxVolume = Math.max(...groupedData.map(d => d.volume));
  groupedData.forEach(d => {
    d.normalizedVolume = d.volume / maxVolume;
  });

  console.log('Agrupación completada:', {
    barrasOriginales: data.length,
    barrasAgrupadas: groupedData.length,
    factorAgrupacion: groupFactor,
    alturaBarraFinal: height / groupedData.length
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

    // Filtrar datos por rango visible
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

    // Función mejorada para calcular la posición Y
    const priceToY = (price: number) => {
      if (price === currentPrice) {
        return priceCoordinates.currentY - margin.top;
      }

      const range = priceCoordinates.maxPrice - priceCoordinates.minPrice;
      const normalizedPrice = (price - priceCoordinates.minPrice) / range;
      return priceCoordinates.minY - margin.top - 
             (normalizedPrice * (priceCoordinates.minY - priceCoordinates.maxY));
    };

    // Calcular altura de barra basada en el rango de precios visible
    const barHeight = Math.min(MAX_BAR_HEIGHT, Math.max(MIN_BAR_HEIGHT, innerHeight / groupedData.length));

    // Separar bids y asks
    const asks = groupedData.filter(d => d.side === 'ask').sort((a, b) => a.price - b.price);
    const bids = groupedData.filter(d => d.side === 'bid').sort((a, b) => b.price - a.price);

    // Etiquetas de precio
    const allPrices = [...bids, ...asks].sort((a, b) => a.price - b.price);

    // Mostrar etiquetas alternadas para evitar solapamiento
    allPrices.forEach((d, i) => {
      if (i % Math.ceil(groupedData.length / 20) === 0) { // Mostrar menos etiquetas cuando hay muchas barras
        g.append('text')
          .attr('class', 'price-label')
          .attr('x', -8)
          .attr('y', priceToY(d.price))
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .text(`${d.price.toFixed(0)}${groupFactor > 1 ? ` (x${groupFactor})` : ''}`);
      }
    });

    // Dibujar barras de volumen
    g.selectAll('.bid-bars')
      .data(bids)
      .join('rect')
      .attr('class', 'volume-bar bid')
      .attr('x', d => xScale(d.normalizedVolume))
      .attr('y', d => priceToY(d.price) - barHeight/2)
      .attr('width', d => maxBarWidth/2 - xScale(d.normalizedVolume))
      .attr('height', barHeight * 0.9) // Reducir ligeramente la altura para dar espacio
      .attr('fill', '#26a69a')
      .attr('opacity', 0.8);

    g.selectAll('.ask-bars')
      .data(asks)
      .join('rect')
      .attr('class', 'volume-bar ask')
      .attr('x', d => xScale(d.normalizedVolume))
      .attr('y', d => priceToY(d.price) - barHeight/2)
      .attr('width', d => maxBarWidth/2 - xScale(d.normalizedVolume))
      .attr('height', barHeight * 0.9) // Reducir ligeramente la altura para dar espacio
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
        .attr('class', 'current-price-label')
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