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
  priceScale: {
    min: number;
    max: number;
  } | null;
  currentPrice: number;
}

export const VolumeProfile = ({ data, width, height, priceScale, currentPrice }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length || !priceScale) return;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('overflow', 'visible');

    // Limpiar SVG existente
    svg.selectAll('*').remove();

    // Crear escalas
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, width]); // Cambiado para que las barras crezcan hacia la derecha

    const yScale = d3.scaleLinear()
      .domain([priceScale.min, priceScale.max])
      .range([height, 0]);

    // Filtrar datos dentro del rango visible
    const visibleData = data.filter(d => 
      d.price >= priceScale.min && d.price <= priceScale.max
    );

    // Agrupar datos por niveles de precio
    const groupedData = d3.group(visibleData, d => Math.round(d.price / 10) * 10);

    // Convertir los datos agrupados a un array y calcular volúmenes normalizados
    const processedData = Array.from(groupedData, ([price, values]) => {
      const totalVolume = d3.sum(values, d => d.volume);
      const maxNormalized = d3.max(values, d => d.normalizedVolume) || 0;
      return {
        price: +price,
        volume: totalVolume,
        normalizedVolume: maxNormalized
      };
    });

    // Calcular altura mínima de barra
    const barHeight = Math.max(1, height / (processedData.length * 2));

    // Función para determinar el color de la barra
    const getBarColor = (price: number, normalizedVolume: number) => {
      const isAboveCurrent = price > currentPrice;
      const intensity = Math.pow(normalizedVolume, 0.5);
      return isAboveCurrent 
        ? d3.interpolateRgb('#ef535088', '#ef5350')(intensity)
        : d3.interpolateRgb('#26a69a88', '#26a69a')(intensity);
    };

    // Crear las barras
    svg.selectAll('rect')
      .data(processedData)
      .join('rect')
      .attr('x', 0)
      .attr('y', d => yScale(d.price) - barHeight / 2)
      .attr('width', d => xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('fill', d => getBarColor(d.price, d.normalizedVolume))
      .attr('opacity', 0.8);

  }, [data, width, height, priceScale, currentPrice]);

  return (
    <div className="absolute right-0 top-0 h-full" style={{ width: `${width}px` }}>
      <svg 
        ref={svgRef}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};