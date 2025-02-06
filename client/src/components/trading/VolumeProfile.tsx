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
}

export const VolumeProfile = ({ 
  data, 
  width, 
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinates
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0 || !priceCoordinates) {
      return;
    }

    try {
      // Calcular el tamaño de agrupamiento basado en el rango de precios visible
      const visiblePriceSpan = Math.abs(priceCoordinates.maxPrice - priceCoordinates.minPrice);
      let bucketSize = 100; // Por defecto usar 100 para zoom out

      // Ajustar el tamaño del bucket basado en el zoom de manera más agresiva
      if (visiblePriceSpan < 1000) {
        bucketSize = 10; // Zoom muy cercano
      } else if (visiblePriceSpan < 3000) {
        bucketSize = 25; // Zoom medio
      } else if (visiblePriceSpan < 7000) {
        bucketSize = 50; // Zoom moderado
      }

      console.log('Debug - Visible price span:', visiblePriceSpan, 'Selected bucket size:', bucketSize);

      // Agrupar datos por niveles de precio con el nuevo bucketSize
      const groupedData = data.reduce((acc: typeof data, item) => {
        // Asegurar que el precio se redondee al bucketSize más cercano
        const roundedPrice = Math.round(item.price / bucketSize) * bucketSize;

        const existingGroupIndex = acc.findIndex(g => g.price === roundedPrice);

        if (existingGroupIndex !== -1) {
          // Actualizar grupo existente
          acc[existingGroupIndex].volume += item.volume;
          acc[existingGroupIndex].normalizedVolume = Math.max(
            acc[existingGroupIndex].normalizedVolume,
            item.normalizedVolume
          );
        } else {
          // Crear nuevo grupo
          acc.push({
            price: roundedPrice,
            volume: item.volume,
            normalizedVolume: item.normalizedVolume
          });
        }
        return acc;
      }, []);

      // Ordenar los datos por precio
      groupedData.sort((a, b) => a.price - b.price);

      console.log('Debug - Grouped data example:', groupedData.slice(0, 3));

      const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height);

      svg.selectAll('*').remove();

      const xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([width, 0]);

      // Usar las coordenadas del precio para mantener la alineación con las velas
      const priceToY = d3.scaleLinear()
        .domain([priceCoordinates.minPrice, priceCoordinates.maxPrice])
        .range([priceCoordinates.minY, priceCoordinates.maxY]);

      // Calcular altura de barra dinámica basada en el zoom
      const pixelsPerPrice = Math.abs(priceCoordinates.maxY - priceCoordinates.minY) / 
                          (priceCoordinates.maxPrice - priceCoordinates.minPrice);
      const barHeight = Math.max(1, pixelsPerPrice * bucketSize * 0.9); // Reducir ligeramente para spacing

      console.log('Debug - Bar height calculation:', {
        pixelsPerPrice,
        bucketSize,
        resultingBarHeight: barHeight
      });

      const getBarColor = (price: number, normalizedVolume: number) => {
        const isAboveCurrent = price > currentPrice;
        const intensity = Math.pow(normalizedVolume, 0.5);
        return isAboveCurrent 
          ? d3.interpolateRgb('#26a69a88', '#26a69a')(intensity)
          : d3.interpolateRgb('#ef535088', '#ef5350')(intensity);
      };

      // Dibujar barras
      svg.selectAll('rect')
        .data(groupedData)
        .join('rect')
        .attr('y', (d: any) => priceToY(d.price))
        .attr('x', (d: any) => xScale(d.normalizedVolume))
        .attr('height', barHeight)
        .attr('width', (d: any) => width - xScale(d.normalizedVolume))
        .attr('fill', (d: any) => getBarColor(d.price, d.normalizedVolume))
        .attr('opacity', 0.8);

      // Ajustar tamaño de fuente y visibilidad de etiquetas
      const fontSize = Math.min(12, Math.max(8, barHeight * 0.7));
      const shouldShowLabels = barHeight >= 8;

      if (shouldShowLabels) {
        svg.selectAll('text')
          .data(groupedData)
          .join('text')
          .attr('x', 5)
          .attr('y', (d: any) => priceToY(d.price) + barHeight / 2)
          .attr('dy', '0.32em')
          .attr('fill', '#ffffff')
          .attr('font-size', `${fontSize}px`)
          .attr('opacity', barHeight < 12 ? 0.8 : 1)
          .text((d: any) => d.price.toFixed(0));
      }

    } catch (error) {
      console.error('Error rendering volume profile:', error);
    }
  }, [data, width, height, visiblePriceRange, currentPrice, priceCoordinates]);

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