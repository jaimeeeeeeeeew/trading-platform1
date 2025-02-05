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
}

export const VolumeProfile = ({ data, width, height, visiblePriceRange }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    // Agrupar datos por intervalos de $10 y filtrar por rango visible
    const groupedData = data.reduce((acc, item) => {
      // Solo incluir datos dentro del rango visible si está definido
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

    // Crear escalas
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([width, 0]);

    const yScale = d3.scaleLinear()
      .domain([
        visiblePriceRange?.min || d3.min(groupedData, d => d.price) || 0,
        visiblePriceRange?.max || d3.max(groupedData, d => d.price) || 0
      ])
      .range([height - 2, 2]);

    const currentPrice = (d3.min(groupedData, d => d.price)! + d3.max(groupedData, d => d.price)!) / 2;

    // Seleccionar o crear SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('overflow', 'visible');

    // Calcular altura de cada barra
    const barHeight = Math.max(2, height / (visiblePriceRange ? 
      (visiblePriceRange.max - visiblePriceRange.min) / 10 : groupedData.length));

    // Actualizar barras existentes
    const bars = svg.selectAll('rect')
      .data(groupedData, (d: any) => d.price);

    // Eliminar barras que ya no existen
    bars.exit().remove();

    // Actualizar barras existentes
    bars.attr('y', d => yScale(d.price))
      .attr('x', d => xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('width', d => width - xScale(d.normalizedVolume))
      .attr('fill', d => {
        const isAboveCurrent = d.price > currentPrice;
        const intensity = Math.pow(d.normalizedVolume, 0.5);
        return isAboveCurrent 
          ? d3.interpolateRgb('#ef535088', '#ef5350')(intensity)
          : d3.interpolateRgb('#26a69a88', '#26a69a')(intensity);
      });

    // Añadir nuevas barras
    bars.enter()
      .append('rect')
      .attr('y', d => yScale(d.price))
      .attr('x', d => xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('width', d => width - xScale(d.normalizedVolume))
      .attr('fill', d => {
        const isAboveCurrent = d.price > currentPrice;
        const intensity = Math.pow(d.normalizedVolume, 0.5);
        return isAboveCurrent 
          ? d3.interpolateRgb('#ef535088', '#ef5350')(intensity)
          : d3.interpolateRgb('#26a69a88', '#26a69a')(intensity);
      });

    // Limpieza
    return () => {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove();
      }
    };
  }, [data, width, height, visiblePriceRange]);

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