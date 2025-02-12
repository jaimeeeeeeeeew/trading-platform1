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
    if (!svgRef.current || !data || data.length === 0 || !priceCoordinates) return;

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

    // Escala horizontal para el volumen normalizado
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, maxBarWidth]);

    // Usar las coordenadas del gráfico principal para el eje Y
    const yScale = d3.scaleLinear()
      .domain([priceCoordinates.minPrice, priceCoordinates.maxPrice])
      .range([priceCoordinates.minY - margin.top, priceCoordinates.maxY - margin.top]);

    // Filtrar datos según el rango de precios visible
    const visibleData = data.filter(d => 
      d.price >= priceCoordinates.minPrice && 
      d.price <= priceCoordinates.maxPrice
    );

    // Altura dinámica de las barras basada en el rango de precios visible
    const priceRange = priceCoordinates.maxPrice - priceCoordinates.minPrice;
    const barHeight = Math.max(1, innerHeight / (priceRange / 10));

    // Dibujar barras de volumen
    g.selectAll('.volume-bar')
      .data(visibleData)
      .join('rect')
      .attr('class', 'volume-bar')
      .attr('x', innerWidth - maxBarWidth)
      .attr('y', d => yScale(d.price) - barHeight / 2)
      .attr('width', d => xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('fill', d => d.side === 'bid' ? '#26a69a' : '#ef5350')
      .attr('opacity', 0.8);

    // Línea de precio actual
    if (priceCoordinates.currentPrice) {
      const currentY = yScale(priceCoordinates.currentPrice);

      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', currentY)
        .attr('y2', currentY)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      g.append('text')
        .attr('x', -5)
        .attr('y', currentY)
        .attr('dy', '-4')
        .attr('text-anchor', 'end')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .text(priceCoordinates.currentPrice.toFixed(1));
    }

    // Etiquetas de precio en el eje Y
    const yAxis = d3.axisRight(yScale)
      .ticks(10)
      .tickFormat(d => typeof d === 'number' ? d.toFixed(0) : '');

    const yAxisGroup = g.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(yAxis);

    yAxisGroup.select('.domain').remove();
    yAxisGroup.selectAll('.tick line')
      .attr('stroke', '#666')
      .attr('stroke-width', 0.5);
    yAxisGroup.selectAll('.tick text')
      .attr('fill', '#fff')
      .attr('font-size', '9px');

  }, [data, width, height, visiblePriceRange, currentPrice, priceCoordinates]);

  return (
    <div
      style={{
        position: 'absolute',
        right: '80px',
        top: 0,
        width: `${width}px`,
        height: '100%',
        background: 'transparent',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        pointerEvents: 'none'
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