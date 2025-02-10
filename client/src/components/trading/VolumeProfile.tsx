import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Props {
  data: {
    price: number;
    volume: number;
    normalizedVolume: number;
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
      return;
    }

    try {
      // Limpiar el SVG
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      svg.attr('width', width).attr('height', height);

      // Calcular el nivel de zoom basado en el rango visible
      const zoomLevel = Math.abs(visibleLogicalRange.to - visibleLogicalRange.from);

      // Determinar el tamaño de agrupación basado en el zoom
      let bucketSize: number;
      if (zoomLevel <= 50) {
        bucketSize = 10; // Zoom cercano: barras cada 10 dólares
      } else if (zoomLevel <= 150) {
        bucketSize = 50; // Zoom medio: barras cada 50 dólares
      } else {
        bucketSize = 100; // Zoom lejano: barras cada 100 dólares
      }

      // Agrupar los datos según el bucketSize
      const groupedData = new Map<number, { volume: number; count: number }>();

      // Agrupar volúmenes
      data.forEach(item => {
        const bucketPrice = Math.floor(item.price / bucketSize) * bucketSize;
        const existing = groupedData.get(bucketPrice);

        if (existing) {
          existing.volume += item.volume;
          existing.count += 1;
        } else {
          groupedData.set(bucketPrice, {
            volume: item.volume,
            count: 1
          });
        }
      });

      // Convertir el Map a array y calcular volúmenes normalizados
      const bars = Array.from(groupedData.entries())
        .map(([price, { volume, count }]) => ({
          price,
          volume,
          count,
          avgVolume: volume / count
        }))
        .sort((a, b) => a.price - b.price);

      // Calcular el volumen máximo para normalización
      const maxVolume = Math.max(...bars.map(b => b.avgVolume));
      const normalizedBars = bars.map(bar => ({
        ...bar,
        normalizedVolume: bar.avgVolume / maxVolume
      }));

      // Configurar escalas
      const xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([width, 0]);

      const priceScale = d3.scaleLinear()
        .domain([priceCoordinates.minPrice, priceCoordinates.maxPrice])
        .range([priceCoordinates.minY, priceCoordinates.maxY]);

      // Calcular altura de las barras
      const visiblePriceSpan = Math.abs(priceCoordinates.maxPrice - priceCoordinates.minPrice);
      const pixelsPerPrice = Math.abs(priceCoordinates.maxY - priceCoordinates.minY) / visiblePriceSpan;
      const barHeight = Math.max(1, pixelsPerPrice * bucketSize * 0.9);

      // Función para color de barras
      const getBarColor = (price: number, normalizedVolume: number) => {
        const isAboveCurrent = price > currentPrice;
        const intensity = Math.pow(normalizedVolume, 0.5);
        return isAboveCurrent 
          ? d3.interpolateRgb('#26a69a88', '#26a69a')(intensity)
          : d3.interpolateRgb('#ef535088', '#ef5350')(intensity);
      };

      // Dibujar barras
      svg.selectAll('rect')
        .data(normalizedBars)
        .join('rect')
        .attr('y', d => priceScale(d.price))
        .attr('x', d => xScale(d.normalizedVolume))
        .attr('height', barHeight)
        .attr('width', d => width - xScale(d.normalizedVolume))
        .attr('fill', d => getBarColor(d.price, d.normalizedVolume))
        .attr('opacity', 0.8);

      // Mostrar etiquetas si hay espacio suficiente
      const fontSize = Math.min(12, Math.max(8, barHeight * 0.7));
      if (barHeight >= 8) {
        svg.selectAll('text')
          .data(normalizedBars)
          .join('text')
          .attr('x', 5)
          .attr('y', d => priceScale(d.price) + barHeight / 2)
          .attr('dy', '0.32em')
          .attr('fill', '#ffffff')
          .attr('font-size', `${fontSize}px`)
          .attr('opacity', barHeight < 12 ? 0.8 : 1)
          .text(d => `${d.price} (${d.volume.toFixed(2)})`);
      }

    } catch (error) {
      console.error('Error rendering volume profile:', error);
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