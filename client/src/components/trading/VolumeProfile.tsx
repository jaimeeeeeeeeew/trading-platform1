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
  priceCoordinates: {
    currentPrice: number;
    currentY: number;
    minPrice: number;
    minY: number;
    maxPrice: number;
    maxY: number;
  } | null;
}

export const VolumeProfile = ({ 
  data, 
  width, 
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinate,
  priceCoordinates 
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Ajustamos el margen derecho para el eje de precios
    const margin = { top: 10, right: 50, bottom: 10, left: -10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Ancho máximo para las barras (95% del ancho disponible)
    const maxBarWidth = innerWidth * 0.95;

    // Escalas - Invertimos el rango del xScale para que crezca hacia la izquierda
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([maxBarWidth, 0]);

    const yScale = d3.scaleLinear()
      .domain([visiblePriceRange.min, visiblePriceRange.max])
      .range([innerHeight, 0]);

    // Altura fija para las barras
    const barHeight = 6;

    // Dibujar barras de volumen
    g.selectAll('.volume-bar')
      .data(data)
      .join('rect')
      .attr('class', 'volume-bar')
      .attr('x', d => innerWidth - maxBarWidth + xScale(d.normalizedVolume))
      .attr('y', d => yScale(d.price) - barHeight / 2)
      .attr('width', d => Math.max(1, maxBarWidth - xScale(d.normalizedVolume)))
      .attr('height', barHeight)
      .attr('fill', d => d.side === 'bid' ? '#26a69a' : '#ef5350')
      .attr('opacity', 0.8);

    // Línea de precio actual
    if (currentPrice) {
      g.append('line')
        .attr('x1', innerWidth - maxBarWidth - 20)
        .attr('x2', innerWidth)
        .attr('y1', yScale(currentPrice)) //Corrected line to use yScale
        .attr('y2', yScale(currentPrice)) //Corrected line to use yScale
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      // Etiqueta del precio actual
      g.append('text')
        .attr('x', innerWidth - maxBarWidth - 25)
        .attr('y', yScale(currentPrice)) //Corrected line to use yScale
        .attr('dy', '-4')
        .attr('text-anchor', 'end')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .text(currentPrice.toFixed(1));
    }

    // Eje de precios
    const priceAxis = d3.axisRight(yScale)
      .ticks(5)
      .tickSize(3);

    const priceAxisGroup = g.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(priceAxis);

    priceAxisGroup.select('.domain').remove();
    priceAxisGroup.selectAll('.tick line')
      .attr('stroke', '#666')
      .attr('stroke-width', 0.5);
    priceAxisGroup.selectAll('.tick text')
      .attr('fill', '#fff')
      .attr('font-size', '9px');

    // Información del perfil
    g.append('text')
      .attr('x', innerWidth - maxBarWidth - 20)
      .attr('y', 15)
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .text(`Vol Profile (${data.length})`);

  }, [data, width, height, visiblePriceRange, currentPrice, priceCoordinates]);

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: `-${height / 2}px`,
      width: `${width}px`,
      height: `${height}px`,
      borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      pointerEvents: 'none'
    }}>
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