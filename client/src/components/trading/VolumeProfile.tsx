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

    // Crear escalas
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([width, 0]);

    const yScale = d3.scaleLinear()
      .domain([priceScale.min, priceScale.max])
      .range([height, 0]);

    // Seleccionar o crear SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Limpiar SVG existente
    svg.selectAll('*').remove();

    // Crear grupo para las barras
    const barGroup = svg.append('g');

    // Función para determinar el color de la barra
    const getBarColor = (price: number, normalizedVolume: number) => {
      const isAboveCurrent = price > currentPrice;
      const intensity = Math.pow(normalizedVolume, 0.5);
      return isAboveCurrent 
        ? d3.interpolateRgb('#ef535088', '#ef5350')(intensity)
        : d3.interpolateRgb('#26a69a88', '#26a69a')(intensity);
    };

    // Calcular altura mínima de barra basada en el rango de precios visible
    const priceRange = priceScale.max - priceScale.min;
    const minBarHeight = Math.max(1, height / (priceRange / 10));

    // Dibujar barras
    data.forEach(d => {
      if (d.price >= priceScale.min && d.price <= priceScale.max) {
        barGroup.append('rect')
          .attr('y', yScale(d.price))
          .attr('x', xScale(d.normalizedVolume))
          .attr('height', minBarHeight)
          .attr('width', width - xScale(d.normalizedVolume))
          .attr('fill', getBarColor(d.price, d.normalizedVolume));
      }
    });

  }, [data, width, height, priceScale, currentPrice]);

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