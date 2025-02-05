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
  visiblePriceRange?: {
    min: number;
    max: number;
  };
  currentPrice: number;
  priceCoordinate: number | null;
}

export const VolumeProfile = ({ 
  data, 
  width, 
  height, 
  visiblePriceRange, 
  currentPrice,
  priceCoordinate 
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    // Mantener solo los datos que están dentro del rango visible
    const groupedData = data.reduce((acc, item) => {
      if (visiblePriceRange && 
          (item.price < visiblePriceRange.min || item.price > visiblePriceRange.max)) {
        return acc;
      }

      const roundedPrice = Math.round(item.price / 10) * 10;
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
    }, [] as typeof data);

    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([width, 0]);

    // Usar la coordenada exacta del precio si está disponible
    const yScale = d3.scaleLinear()
      .domain([
        visiblePriceRange?.min || d3.min(groupedData, d => d.price) || 0,
        visiblePriceRange?.max || d3.max(groupedData, d => d.price) || 0
      ])
      .range([height - 2, 2]);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('overflow', 'visible');

    // Calcular altura de cada barra
    const barHeight = Math.max(1, height / (visiblePriceRange ? 
      (visiblePriceRange.max - visiblePriceRange.min) / 10 : groupedData.length));

    // Actualizar barras existentes
    const bars = svg.selectAll('rect')
      .data(groupedData, (d: any) => d.price);

    // Eliminar barras que ya no existen
    bars.exit().remove();

    // Función para determinar el color de la barra
    const getBarColor = (price: number, normalizedVolume: number) => {
      const isAboveCurrent = price > currentPrice;
      const intensity = Math.pow(normalizedVolume, 0.5);
      return isAboveCurrent 
        ? d3.interpolateRgb('#ef535088', '#ef5350')(intensity)
        : d3.interpolateRgb('#26a69a88', '#26a69a')(intensity);
    };

    // Actualizar barras existentes
    bars
      .attr('y', d => {
        // Si tenemos la coordenada exacta del precio, la usamos para ajustar la posición
        if (priceCoordinate !== null) {
          const offset = d.price - currentPrice;
          const yPos = priceCoordinate + (offset * (height / (visiblePriceRange?.max || 0 - visiblePriceRange?.min || 0)));
          // Solo imprimir para la barra que está en el precio actual
          if (Math.abs(d.price - currentPrice) < 5) {
            console.log('Precio de la barra:', d.price);
            console.log('Posición Y de la barra divisoria:', yPos);
          }
          return yPos;
        }
        return yScale(d.price);
      })
      .attr('x', d => xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('width', d => width - xScale(d.normalizedVolume))
      .attr('fill', d => getBarColor(d.price, d.normalizedVolume));

    // Añadir nuevas barras
    bars.enter()
      .append('rect')
      .attr('y', d => {
        // Usar la misma lógica para las nuevas barras
        if (priceCoordinate !== null) {
          const offset = d.price - currentPrice;
          return priceCoordinate + (offset * (height / (visiblePriceRange?.max || 0 - visiblePriceRange?.min || 0)));
        }
        return yScale(d.price);
      })
      .attr('x', d => xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('width', d => width - xScale(d.normalizedVolume))
      .attr('fill', d => getBarColor(d.price, d.normalizedVolume));

    // Limpieza
    return () => {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove();
      }
    };
  }, [data, width, height, visiblePriceRange, currentPrice, priceCoordinate]);

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