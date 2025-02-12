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
    console.log('VolumeProfile Data:', {
      hasData: data && data.length > 0,
      dataLength: data?.length,
      visiblePriceRange,
      currentPrice
    });

    if (!svgRef.current || !data || data.length === 0 || !visiblePriceRange) {
      console.log('VolumeProfile early return:', {
        hasSvgRef: !!svgRef.current,
        hasData: !!data,
        dataLength: data?.length,
        hasVisiblePriceRange: !!visiblePriceRange
      });
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

    // Escala para el ancho de las barras (volumen)
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, maxBarWidth]);

    // Filtrar datos dentro del rango visible y ordenar por precio
    const visibleData = data
      .filter(d => d.price >= visiblePriceRange.min && d.price <= visiblePriceRange.max)
      .sort((a, b) => b.price - a.price);

    const verticalScale = d3.scaleLinear()
      .domain([visiblePriceRange.min, visiblePriceRange.max])
      .range([innerHeight, 0]);

    // Altura mínima de las barras
    const barHeight = Math.max(1, (innerHeight / visibleData.length) * 0.8);

    // Dibujar barras de volumen
    g.selectAll('.volume-bar')
      .data(visibleData)
      .join('rect')
      .attr('class', 'volume-bar')
      .attr('x', 0)
      .attr('y', d => verticalScale(d.price) - barHeight / 2)
      .attr('width', d => xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('fill', d => d.side === 'bid' ? '#26a69a' : '#ef5350')
      .attr('opacity', 0.8);

    // Línea de precio actual
    if (currentPrice) {
      g.append('line')
        .attr('class', 'price-line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', verticalScale(currentPrice))
        .attr('y2', verticalScale(currentPrice))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      // Etiqueta de precio actual
      g.append('text')
        .attr('class', 'price-label')
        .attr('x', maxBarWidth + 5)
        .attr('y', verticalScale(currentPrice))
        .attr('dy', '0.32em')
        .attr('text-anchor', 'start')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .text(currentPrice.toFixed(1));
    }

    // Eje de precios
    const priceAxis = d3.axisRight(verticalScale)
      .ticks(10)
      .tickFormat(d => typeof d === 'number' ? d.toFixed(0) : '');

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

  }, [data, width, height, currentPrice, visiblePriceRange]);

  return (
    <div
      style={{
        position: 'absolute',
        right: '0',
        top: '0',
        width: `${width}px`,
        height: '100%',
        background: 'transparent',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
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