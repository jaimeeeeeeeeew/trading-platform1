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
      console.log('⚠️ Volume Profile Debug:', {
        hasRef: !!svgRef.current,
        dataLength: data?.length,
        sampleData: data?.[0],
        dimensions: { width, height }
      });
      return;
    }

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      // Define margins
      const margin = { top: 20, right: 40, bottom: 20, left: 0 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      // Create container with margin
      const g = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Background
      g.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'rgba(21, 25, 36, 0.98)')
        .attr('x', -margin.left)
        .attr('y', -margin.top);

      // Calculate scales
      const maxVolume = d3.max(data, d => d.volume) || 0;

      const xScale = d3.scaleLinear()
        .domain([0, maxVolume])
        .range([0, innerWidth]);

      const yScale = d3.scaleLinear()
        .domain([visiblePriceRange.min, visiblePriceRange.max])
        .range([innerHeight, 0]);

      // Calculate bar height
      const barHeight = Math.max(2, Math.min(5, height / data.length));

      // Draw volume bars
      g.selectAll('.volume-bar')
        .data(data)
        .join('rect')
        .attr('class', 'volume-bar')
        .attr('x', 0)
        .attr('y', d => yScale(d.price) - barHeight / 2)
        .attr('width', d => Math.max(1, xScale(d.volume)))
        .attr('height', barHeight)
        .attr('fill', d => d.side === 'bid' ? '#26a69a' : '#ef5350')
        .attr('opacity', 1)
        .attr('rx', 1);

      // Draw price line
      if (currentPrice) {
        // Add shadow effect
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', yScale(currentPrice))
          .attr('y2', yScale(currentPrice))
          .attr('stroke', 'rgba(255, 255, 255, 0.3)')
          .attr('stroke-width', 3);

        // Main line
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', yScale(currentPrice))
          .attr('y2', yScale(currentPrice))
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,4');

        // Price label
        g.append('text')
          .attr('x', innerWidth)
          .attr('y', yScale(currentPrice))
          .attr('dy', '-4')
          .attr('text-anchor', 'end')
          .attr('fill', '#ffffff')
          .attr('font-size', '11px')
          .attr('font-weight', 'bold')
          .text(currentPrice.toFixed(1));
      }

      // Add price axis
      const priceAxis = d3.axisRight(yScale)
        .ticks(5)
        .tickSize(3);

      const priceAxisGroup = g.append('g')
        .attr('transform', `translate(${innerWidth},0)`)
        .call(priceAxis);

      priceAxisGroup.select('.domain').remove();
      priceAxisGroup.selectAll('.tick line')
        .attr('stroke', '#666')
        .attr('stroke-width', 0.5);
      priceAxisGroup.selectAll('.tick text')
        .attr('fill', '#fff')
        .attr('font-size', '10px');

      console.log('📊 Volume Profile Rendered:', {
        barsCount: data.length,
        maxVolume,
        barHeight,
        dimensions: { width, height, innerWidth, innerHeight }
      });

    } catch (error) {
      console.error('❌ Error rendering volume profile:', error);
    }
  }, [data, width, height, visiblePriceRange, currentPrice]);

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: `${width}px`,
        height: '100%',
        background: 'rgba(21, 25, 36, 0.98)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 5,
          left: 5,
          color: '#fff',
          fontSize: '10px',
          background: 'rgba(0,0,0,0.7)',
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 1001
        }}
      >
        Volume Profile ({data.length} levels)
      </div>
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
};