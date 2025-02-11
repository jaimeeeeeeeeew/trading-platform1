import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Props {
  data: {
    price: number;
    volume: number;
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
  visibleLogicalRange: { from: number; to: number; } | null;
}

export const VolumeProfile = ({ 
  data, 
  width, 
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinates,
  visibleLogicalRange
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0 || !priceCoordinates || !visibleLogicalRange) {
      console.log('📊 Volume Profile debug:', {
        hasRef: !!svgRef.current,
        dataLength: data?.length,
        hasCoords: !!priceCoordinates,
        hasRange: !!visibleLogicalRange,
        width,
        height
      });
      return;
    }

    try {
      console.log('📊 Starting to render volume profile with data:', {
        dataPoints: data.length,
        firstPoint: data[0],
        lastPoint: data[data.length - 1],
        dimensions: { width, height }
      });

      // Limpiar el SVG
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      svg.attr('width', width).attr('height', height);

      // Calcular volumen normalizado
      const maxVolume = Math.max(...data.map(d => d.volume));
      console.log('📊 Max volume:', maxVolume);

      // Configurar escalas
      const xScale = d3.scaleLinear()
        .domain([0, maxVolume])
        .range([0, width - 20]); // Dejar espacio para las etiquetas

      const priceScale = d3.scaleLinear()
        .domain([priceCoordinates.minPrice, priceCoordinates.maxPrice])
        .range([priceCoordinates.maxY, priceCoordinates.minY]);

      // Calcular altura de las barras
      const barHeight = Math.max(1, height / data.length);
      console.log('📊 Bar height calculated:', barHeight);

      // Función para color de barras
      const getBarColor = (d: { price: number; volume: number; side: 'bid' | 'ask' }) => {
        const alpha = Math.min(0.8, 0.3 + (d.volume / maxVolume) * 0.7);
        return d.side === 'ask'
          ? `rgba(239, 83, 80, ${alpha})` // Rojo para asks
          : `rgba(38, 166, 154, ${alpha})`; // Verde para bids
      };

      // Crear grupo para las barras
      const barsGroup = svg.append('g')
        .attr('class', 'bars-group');

      // Dibujar barras con transición
      const bars = barsGroup.selectAll('rect')
        .data(data)
        .join(
          enter => enter.append('rect')
            .attr('x', 0)
            .attr('y', d => {
              const y = priceScale(d.price);
              console.log('📊 Bar position:', { price: d.price, y });
              return y;
            })
            .attr('width', 0)
            .attr('height', barHeight)
            .attr('fill', d => getBarColor(d))
            .call(enter => enter.transition()
              .duration(300)
              .attr('width', d => {
                const width = xScale(d.volume);
                console.log('📊 Bar width:', { volume: d.volume, width });
                return width;
              })
            ),
          update => update
            .call(update => update.transition()
              .duration(300)
              .attr('y', d => priceScale(d.price))
              .attr('width', d => xScale(d.volume))
              .attr('fill', d => getBarColor(d))
            ),
          exit => exit
            .call(exit => exit.transition()
              .duration(300)
              .attr('width', 0)
              .remove()
            )
        );

      console.log('📊 Bars created:', bars.size());

      // Añadir etiquetas de volumen si hay espacio
      if (barHeight >= 4) {
        const labelsGroup = svg.append('g')
          .attr('class', 'labels-group');

        labelsGroup.selectAll('text')
          .data(data)
          .join('text')
          .attr('x', 5)
          .attr('y', d => priceScale(d.price) + barHeight / 2)
          .attr('dy', '0.32em')
          .attr('font-size', '8px')
          .attr('fill', '#ffffff')
          .text(d => `${d.volume.toFixed(1)}`);
      }

      // Dibujar línea de precio actual
      if (currentPrice) {
        const currentPriceY = priceScale(currentPrice);
        svg.append('line')
          .attr('x1', 0)
          .attr('y1', currentPriceY)
          .attr('x2', width)
          .attr('y2', currentPriceY)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2');
      }

    } catch (error) {
      console.error('❌ Error rendering volume profile:', error);
    }
  }, [data, width, height, visiblePriceRange, currentPrice, priceCoordinates, visibleLogicalRange]);

  return (
    <svg 
      ref={svgRef} 
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: '100%',
        height: '100%',
        background: 'transparent',
      }}
    />
  );
};