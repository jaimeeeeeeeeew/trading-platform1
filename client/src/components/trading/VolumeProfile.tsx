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
    if (!svgRef.current || !data || data.length === 0) {
      console.log('⚠️ Volume Profile not rendering:', {
        hasRef: !!svgRef.current,
        dataLength: data?.length,
        sampleData: data?.[0]
      });
      return;
    }

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      // Calculate dimensions and scales
      const margin = { top: 20, right: 30, bottom: 20, left: 10 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      // Group data by price level for better visualization
      const priceGroups = d3.group(data, d => d.price);
      const groupedData = Array.from(priceGroups, ([price, values]) => ({
        price: +price,
        volume: d3.sum(values, d => d.volume),
        side: values[0].side
      }));

      // Create scales
      const xScale = d3.scaleLinear()
        .domain([0, d3.max(groupedData, d => d.volume) || 100])
        .range([0, innerWidth * 0.8]); // Use 80% of width for bars

      const yScale = d3.scaleLinear()
        .domain([visiblePriceRange.min, visiblePriceRange.max])
        .range([innerHeight, 0]);

      // Create container group
      const g = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Add background
      g.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'rgba(21, 25, 36, 0.95)')
        .attr('stroke', 'rgba(255, 255, 255, 0.3)')
        .attr('stroke-width', 2);

      // Calculate optimal bar height
      const barHeight = Math.max(
        1,
        Math.min(
          10,
          innerHeight / (visiblePriceRange.max - visiblePriceRange.min)
        )
      );

      // Draw volume bars
      g.selectAll('.volume-bar')
        .data(groupedData)
        .join('rect')
        .attr('class', 'volume-bar')
        .attr('x', 0)
        .attr('y', d => yScale(d.price))
        .attr('width', d => xScale(d.volume))
        .attr('height', barHeight)
        .attr('fill', d => d.side === 'ask' ? '#ef5350' : '#26a69a')
        .attr('opacity', 0.8)
        .attr('rx', 1)
        .attr('ry', 1);

      // Add price line
      if (currentPrice) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', width)
          .attr('y1', yScale(currentPrice))
          .attr('y2', yScale(currentPrice))
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4');

        // Add current price label
        g.append('text')
          .attr('x', width - margin.right)
          .attr('y', yScale(currentPrice))
          .attr('dy', '-0.5em')
          .attr('text-anchor', 'end')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .text(currentPrice.toFixed(1));
      }

      // Add price scale
      const priceAxis = d3.axisRight(yScale)
        .ticks(5)
        .tickSize(3);

      g.append('g')
        .attr('transform', `translate(${width - margin.right},0)`)
        .call(priceAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').attr('stroke', '#666'))
        .call(g => g.selectAll('.tick text')
          .attr('fill', '#fff')
          .attr('font-size', '10px'));

    } catch (error) {
      console.error('❌ Error rendering volume profile:', error);
    }
  }, [data, width, height, visiblePriceRange, currentPrice, priceCoordinates]);

  return (
    <div 
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: `${width}px`,
        height: '100%',
        background: 'rgba(21, 25, 36, 0.95)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        zIndex: 1000,
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          padding: '4px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          fontSize: '10px',
          zIndex: 1001
        }}
      >
        Volume Profile Data Points: {data.length}
      </div>
      <svg 
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};