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
    if (!svgRef.current || !data.length) {
      console.log("No SVG ref or no data", { hasRef: !!svgRef.current, dataLength: data.length });
      return;
    }

    console.log("Rendering volume profile with data:", { data, width, height });

    // Limpiar SVG existente
    d3.select(svgRef.current).selectAll("*").remove();

    // Crear escalas
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.volume) || 0])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([d3.min(data, d => d.price) || 0, d3.max(data, d => d.price) || 0])
      .range([height, 0]);

    console.log("Scales created:", {
      xDomain: xScale.domain(),
      yDomain: yScale.domain(),
      width,
      height
    });

    // Crear SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('position', 'absolute')
      .style('left', '0')
      .style('top', '0')
      .style('pointer-events', 'none')
      .style('z-index', '10'); // Asegurar que está por encima

    // Dibujar barras horizontales
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('y', d => yScale(d.price))
      .attr('x', 0)
      .attr('height', Math.max(1, height / data.length)) // Asegurar altura mínima de 1px
      .attr('width', d => Math.max(1, xScale(d.volume))) // Asegurar ancho mínimo de 1px
      .attr('fill', d => d.volume > d3.mean(data, v => v.volume) ? 'rgba(239, 83, 80, 0.5)' : 'rgba(38, 166, 154, 0.5)');

    console.log("Bars rendered:", svg.selectAll('rect').size());

  }, [data, width, height]);

  return (
    <svg 
      ref={svgRef} 
      className="pointer-events-none" 
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 10,
        background: 'transparent'
      }}
    />
  );
};