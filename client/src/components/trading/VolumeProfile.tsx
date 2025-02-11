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
      console.log('⚠️ No data for volume profile:', {
        hasRef: !!svgRef.current,
        dataLength: data?.length,
        sampleData: data?.[0]
      });
      return;
    }

    console.log('🎯 Rendering volume profile with:', {
      dataPoints: data.length,
      priceRange: visiblePriceRange,
      width,
      height
    });

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      // Create margin and scales
      const margin = { top: 10, right: 30, bottom: 10, left: 10 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      // Set up container
      svg
        .attr('width', width)
        .attr('height', height)
        .style('background', 'rgba(21, 25, 36, 0.95)');

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Calculate max volume and set up scales
      const maxVolume = d3.max(data, d => d.volume) || 100;

      const xScale = d3.scaleLinear()
        .domain([0, maxVolume])
        .range([0, innerWidth - 40]); // Leave space for price labels

      const yScale = d3.scaleLinear()
        .domain([visiblePriceRange.min, visiblePriceRange.max])
        .range([innerHeight, 0]);

      // Draw volume bars
      g.selectAll('.volume-bar')
        .data(data)
        .join('rect')
        .attr('class', 'volume-bar')
        .attr('x', 0)
        .attr('y', d => yScale(d.price))
        .attr('width', d => Math.max(2, xScale(d.volume))) // Minimum width of 2px
        .attr('height', 2) // Fixed height of 2px
        .attr('fill', d => d.side === 'bid' ? '#26a69a' : '#ef5350')
        .attr('opacity', 0.8);

      // Add current price line
      if (currentPrice) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', yScale(currentPrice))
          .attr('y2', yScale(currentPrice))
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,4');

        // Add price label
        g.append('text')
          .attr('x', innerWidth)
          .attr('y', yScale(currentPrice))
          .attr('dy', '-4')
          .attr('text-anchor', 'end')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .text(currentPrice.toFixed(0));
      }

      // Add price axis
      const priceAxis = d3.axisRight(yScale)
        .ticks(5)
        .tickSize(3);

      g.append('g')
        .attr('transform', `translate(${innerWidth - 30},0)`)
        .call(priceAxis)
        .call(g => {
          g.select('.domain').remove();
          g.selectAll('.tick line').attr('stroke', '#666');
          g.selectAll('.tick text')
            .attr('fill', '#fff')
            .attr('font-size', '10px');
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
        backgroundColor: 'rgba(21, 25, 36, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
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
          background: 'rgba(0,0,0,0.5)',
          padding: '2px 4px',
          borderRadius: '2px'
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