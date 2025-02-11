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
}

export const VolumeProfile = ({
  data,
  width = 160, 
  height,
  visiblePriceRange,
  currentPrice
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) {
      console.log('VolumeProfile render skipped:', {
        hasRef: !!svgRef.current,
        hasData: !!data,
        dataLength: data?.length
      });
      return;
    }

    // Agrupar datos por niveles de precio de $10
    const groupedData = data.reduce((acc, item) => {
      // Redondear el precio al múltiplo de 10 más cercano
      const bucketPrice = Math.round(item.price / 10) * 10;
      const existing = acc.find(x => x.price === bucketPrice);

      if (existing) {
        existing.volume += item.volume;
        // Mantener el lado (bid/ask) basado en el mayor volumen
        if (item.volume > existing.volume) {
          existing.side = item.side;
        }
      } else {
        acc.push({
          price: bucketPrice,
          volume: item.volume,
          side: item.side,
          normalizedVolume: 0 // Se normalizará después
        });
      }
      return acc;
    }, [] as Props['data']);

    // Normalizar volúmenes después de agrupar
    const maxVolume = Math.max(...groupedData.map(d => d.volume));
    groupedData.forEach(d => {
      d.normalizedVolume = d.volume / maxVolume;
    });

    console.log('VolumeProfile rendering with:', {
      dataPoints: groupedData.length,
      priceRange: visiblePriceRange,
      currentPrice,
      dimensions: { width, height }
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 10, right: 0, bottom: 10, left: 50 }; // Aumentado el margen izquierdo
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Ancho máximo para las barras (70% del ancho disponible)
    const maxBarWidth = innerWidth * 0.7;

    // Escalas
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([maxBarWidth, 0]);

    const yScale = d3.scaleLinear()
      .domain([visiblePriceRange.min, visiblePriceRange.max])
      .range([innerHeight, 0]);

    // Altura fija para las barras, ajustada para incrementos de $10
    const barHeight = Math.max(2, (innerHeight / ((visiblePriceRange.max - visiblePriceRange.min) / 10)));

    // Dibujar barras de volumen
    const bars = g.selectAll('.volume-bar')
      .data(groupedData)
      .join('rect')
      .attr('class', 'volume-bar')
      .attr('x', d => innerWidth - maxBarWidth + xScale(d.normalizedVolume))
      .attr('y', d => yScale(d.price) - barHeight / 2)
      .attr('width', d => Math.max(1, maxBarWidth - xScale(d.normalizedVolume)))
      .attr('height', barHeight)
      .attr('fill', d => d.side === 'bid' ? '#26a69a' : '#ef5350')
      .attr('opacity', 0.8);

    // Agregar etiquetas de precio a la izquierda de cada barra
    g.selectAll('.price-label')
      .data(groupedData)
      .join('text')
      .attr('class', 'price-label')
      .attr('x', -5) // Posición a la izquierda de las barras
      .attr('y', d => yScale(d.price))
      .attr('text-anchor', 'end')
      .attr('alignment-baseline', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '10px')
      .text(d => d.price.toFixed(0));

    console.log('Bars created:', bars.size());

    // Línea de precio actual
    if (currentPrice) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(currentPrice))
        .attr('y2', yScale(currentPrice))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      g.append('text')
        .attr('x', innerWidth - maxBarWidth - 5)
        .attr('y', yScale(currentPrice))
        .attr('dy', '-4')
        .attr('text-anchor', 'end')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .text(currentPrice.toFixed(1));
    }

    // Eje de precios con incrementos de $10
    const priceAxis = d3.axisRight(yScale)
      .ticks((visiblePriceRange.max - visiblePriceRange.min) / 10)
      .tickFormat(d => d.toFixed(0))
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
      .attr('x', innerWidth - maxBarWidth)
      .attr('y', 15)
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .text(`Vol Profile (${groupedData.length})`);

  }, [data, width, height, visiblePriceRange, currentPrice]);

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