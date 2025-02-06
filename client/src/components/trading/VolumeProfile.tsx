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
      const visiblePriceSpan = priceCoordinates.maxPrice - priceCoordinates.minPrice;
      let bucketSize = 100; // Por defecto usar 100 para zoom out

      // Ajustar el tamaño del bucket basado en el zoom
      if (visiblePriceSpan < 2000) {
        bucketSize = 10; // Usar agrupación más fina cuando hay zoom in significativo
      } else if (visiblePriceSpan < 5000) {
        bucketSize = 50; // Usar agrupación media para zoom moderado
      }

      console.log('Visible price span:', visiblePriceSpan, 'Bucket size:', bucketSize);

      // Agrupar datos por niveles de precio dinámicamente
      const groupedData = data.reduce((acc: typeof data, item) => {
        const roundedPrice = Math.round(item.price / bucketSize) * bucketSize;
        const existingGroup = acc.find(g => g.price === roundedPrice);

        if (existingGroup) {
          existingGroup.volume += item.volume;
          existingGroup.normalizedVolume = Math.max(existingGroup.normalizedVolume, item.normalizedVolume);
        } else {
          acc.push({
            price: roundedPrice,
            volume: item.volume,
            normalizedVolume: item.normalizedVolume
          });
        }
        return acc;
      }, []);

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

      const getBarY = (price: number) => {
        return priceToY(price);
      };

      // Calcular altura de barra dinámica basada en el zoom
      const pixelsPerPrice = Math.abs(priceCoordinates.maxY - priceCoordinates.minY) / 
                          (priceCoordinates.maxPrice - priceCoordinates.minPrice);
      const barHeight = Math.max(1, pixelsPerPrice * bucketSize);

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
        .attr('y', (d: any) => getBarY(d.price))
        .attr('x', (d: any) => xScale(d.normalizedVolume))
        .attr('height', barHeight)
        .attr('width', (d: any) => width - xScale(d.normalizedVolume))
        .attr('fill', (d: any) => getBarColor(d.price, d.normalizedVolume))
        .attr('opacity', 0.8);

      // Ajustar tamaño de fuente y visibilidad de etiquetas basado en el zoom
      const fontSize = Math.min(12, Math.max(8, barHeight * 0.8));
      const shouldShowLabels = barHeight >= 8; // Solo mostrar etiquetas si las barras son suficientemente altas

      if (shouldShowLabels) {
        svg.selectAll('text')
          .data(groupedData)
          .join('text')
          .attr('x', 5)
          .attr('y', (d: any) => getBarY(d.price) + barHeight / 2)
          .attr('dy', '0.32em')
          .attr('fill', '#ffffff')
          .attr('font-size', `${fontSize}px`)
          .attr('opacity', barHeight < 12 ? 0.8 : 1) // Reducir opacidad para barras pequeñas
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