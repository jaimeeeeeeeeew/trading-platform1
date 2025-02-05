import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Props {
  data: {
    price: number;
    volume: number;
  }[];
  width: number;
  height: number;
}

export const VolumeProfile = ({ data, width, height }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    // Limpiar SVG existente
    d3.select(svgRef.current).selectAll("*").remove();

    // Crear escalas
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.volume) || 0])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([d3.min(data, d => d.price) || 0, d3.max(data, d => d.price) || 0])
      .range([height, 0]);

    // Crear SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Dibujar barras horizontales
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('y', d => yScale(d.price))
      .attr('x', 0)
      .attr('height', height / data.length)
      .attr('width', d => xScale(d.volume))
      .attr('fill', 'rgba(76, 175, 80, 0.5)');

  }, [data, width, height]);

  return <svg ref={svgRef} />;
};
