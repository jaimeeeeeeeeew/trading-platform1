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

export const VolumeProfile = ({
  data,
  width = 160,
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinate,
  priceCoordinates
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0 || !priceCoordinates) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 10, right: 0, bottom: 10, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxBarWidth = innerWidth * 0.7;

    // Escala para el volumen (ancho de las barras)
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, maxBarWidth]);

    // Escala para los precios (altura), usando el mismo rango que el gráfico principal
    const yScale = d3.scaleLinear()
      .domain([priceCoordinates.minPrice, priceCoordinates.maxPrice])
      .range([innerHeight, 0]); // Invertido para coincidir con el gráfico principal

    // Altura mínima de las barras basada en el rango de precios visible
    const priceRange = priceCoordinates.maxPrice - priceCoordinates.minPrice;
    const minBarHeight = Math.max(1, innerHeight / (priceRange / 2));

    // Filtrar y ordenar datos dentro del rango visible
    const visibleData = data
      .filter(d => d.price >= priceCoordinates.minPrice && d.price <= priceCoordinates.maxPrice)
      .sort((a, b) => a.price - b.price); // Ordenar por precio ascendente

    // Dibujar barras de volumen
    g.selectAll('.volume-bar')
      .data(visibleData)
      .join('rect')
      .attr('class', 'volume-bar')
      .attr('x', 0)
      .attr('y', d => {
        const y = yScale(d.price);
        return Number.isFinite(y) ? y - minBarHeight / 2 : 0;
      })
      .attr('width', d => Math.max(1, xScale(d.normalizedVolume)))
      .attr('height', minBarHeight)
      .attr('fill', d => d.side === 'bid' ? '#26a69a' : '#ef5350')
      .attr('opacity', 0.8);

    // Línea del precio actual
    if (priceCoordinates.currentPrice) {
      const currentY = yScale(priceCoordinates.currentPrice);
      if (Number.isFinite(currentY)) {
        // Línea principal
        g.append('line')
          .attr('class', 'price-line')
          .attr('x1', -5)
          .attr('x2', innerWidth)
          .attr('y1', currentY)
          .attr('y2', currentY)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2');

        // Etiqueta de precio
        g.append('text')
          .attr('class', 'price-label')
          .attr('x', -8)
          .attr('y', currentY)
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .text(priceCoordinates.currentPrice.toFixed(1));
      }
    }

    // Crear marcas de precio
    const numTicks = 8;
    const priceStep = priceRange / numTicks;
    const prices = Array.from({ length: numTicks + 1 }, (_, i) => 
      priceCoordinates.minPrice + (i * priceStep)
    );

    // Añadir escala de precios
    const priceAxis = g.append('g')
      .attr('class', 'price-axis')
      .attr('transform', `translate(${-8}, 0)`);

    prices.forEach(price => {
      const y = yScale(price);
      if (Number.isFinite(y)) {
        // Línea del tick
        priceAxis.append('line')
          .attr('x1', 0)
          .attr('x2', 3)
          .attr('y1', y)
          .attr('y2', y)
          .attr('stroke', '#666')
          .attr('stroke-width', 0.5);

        // Texto del precio
        priceAxis.append('text')
          .attr('x', -5)
          .attr('y', y)
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#fff')
          .attr('font-size', '10px')
          .text(price.toFixed(0));
      }
    });

  }, [data, width, height, currentPrice, priceCoordinates]);

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
        zIndex: 1000
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