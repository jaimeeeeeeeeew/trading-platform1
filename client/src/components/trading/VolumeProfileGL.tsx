import { useEffect, useRef, useMemo } from 'react';
import REGL, { Regl } from 'regl';

interface Props {
  data: {
    price: number;
    volume: number;
    normalizedVolume: number;
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
  priceCoordinates: PriceCoordinates | null;
  maxVisibleBars: number;
  grouping: '1' | '5' | '10';
}

interface PriceCoordinates {
  currentPrice: number;
  currentY: number;
  minPrice: number;
  minY: number;
  maxPrice: number;
  maxY: number;
}

// WebGL shaders optimizados para renderizado horizontal
const vertexShader = `
  precision mediump float;
  attribute vec2 position;
  attribute float side;
  attribute float volume;
  uniform float aspectRatio;
  uniform vec2 scale;
  uniform vec2 translate;
  uniform float yScale;
  uniform float yOffset;

  varying float vSide;
  varying float vVolume;

  void main() {
    vSide = side;
    vVolume = volume;

    // Rotar 90 grados y ajustar posición
    vec2 pos = vec2(
      position.y * scale.x + translate.x,
      position.x * yScale + yOffset
    );

    // Ajustar por aspect ratio
    pos.x = pos.x * aspectRatio;

    gl_Position = vec4(pos, 0, 1);
  }
`;

const fragmentShader = `
  precision mediump float;
  varying float vSide;
  varying float vVolume;
  uniform vec3 bidColor;
  uniform vec3 askColor;
  uniform float opacity;

  void main() {
    vec3 color = vSide > 0.5 ? askColor : bidColor;
    gl_FragColor = vec4(color, opacity * vVolume);
  }
`;

export const VolumeProfileGL = ({
  data,
  width,
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinates,
  grouping
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reglRef = useRef<Regl | null>(null);

  const processedData = useMemo(() => {
    if (!data || data.length === 0 || !priceCoordinates) return null;

    const groupSize = parseInt(grouping);
    const filteredData = data.filter(
      d => d.price >= visiblePriceRange.min && d.price <= visiblePriceRange.max
    );

    return filteredData;
  }, [data, visiblePriceRange, grouping, priceCoordinates]);

  useEffect(() => {
    if (!canvasRef.current || !processedData || processedData.length === 0 || !priceCoordinates) return;

    // Initialize REGL if not already done
    if (!reglRef.current) {
      reglRef.current = REGL({
        canvas: canvasRef.current,
        attributes: { alpha: true, antialias: true }
      });
    }

    const regl = reglRef.current;

    // Prepare vertex attributes
    const positions: number[] = [];
    const sides: number[] = [];
    const volumes: number[] = [];

    processedData.forEach(bar => {
      // Normalizar precio para el eje Y
      const normalizedPrice = (bar.price - visiblePriceRange.min) / 
        (visiblePriceRange.max - visiblePriceRange.min) * 2 - 1;

      // Crear rectángulo horizontal
      positions.push(
        -1, normalizedPrice,
        bar.normalizedVolume * 2 - 1, normalizedPrice,
        -1, normalizedPrice + 0.002,
        bar.normalizedVolume * 2 - 1, normalizedPrice + 0.002
      );

      // Side (0 for bid, 1 for ask)
      const sideValue = bar.side === 'ask' ? 1 : 0;
      sides.push(sideValue, sideValue, sideValue, sideValue);

      // Volume for opacity
      volumes.push(
        bar.normalizedVolume,
        bar.normalizedVolume,
        bar.normalizedVolume,
        bar.normalizedVolume
      );
    });

    // Create REGL command with proper TypeScript types
    const drawBars = regl<{
      aspectRatio: number;
      scale: [number, number];
      translate: [number, number];
      yScale: number;
      yOffset: number;
      bidColor: [number, number, number];
      askColor: [number, number, number];
      opacity: number;
    }>({
      vert: vertexShader,
      frag: fragmentShader,
      attributes: {
        position: positions,
        side: sides,
        volume: volumes
      },
      uniforms: {
        aspectRatio: regl.prop<'aspectRatio'>('aspectRatio'),
        scale: regl.prop<'scale'>('scale'),
        translate: regl.prop<'translate'>('translate'),
        yScale: regl.prop<'yScale'>('yScale'),
        yOffset: regl.prop<'yOffset'>('yOffset'),
        bidColor: regl.prop<'bidColor'>('bidColor'),
        askColor: regl.prop<'askColor'>('askColor'),
        opacity: regl.prop<'opacity'>('opacity')
      },
      count: positions.length / 2,
      primitive: 'triangle strip'
    });

    // Render frame
    regl.frame(() => {
      regl.clear({
        color: [0, 0, 0, 0],
        depth: 1
      });

      // Calcular escalas y offsets basados en las coordenadas de precio
      const priceRange = visiblePriceRange.max - visiblePriceRange.min;
      const yScale = height / (priceCoordinates.maxY - priceCoordinates.minY);
      const yOffset = -priceCoordinates.minY / yScale;


      drawBars({
        aspectRatio: width / height,
        scale: [0.8, 1],
        translate: [0.2, 0],
        yScale,
        yOffset,
        bidColor: [0.149, 0.65, 0.604], // #26a69a
        askColor: [0.937, 0.325, 0.314], // #ef5350
        opacity: 0.9
      });
    });

    return () => {
      if (reglRef.current) {
        reglRef.current.destroy();
        reglRef.current = null;
      }
    };
  }, [processedData, width, height, visiblePriceRange, priceCoordinates]);

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: `${width}px`,
        height: '100%',
        background: 'transparent',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 2
      }}
    >
      <canvas
        ref={canvasRef}
        width={width * (window.devicePixelRatio || 1)}
        height={height * (window.devicePixelRatio || 1)}
        style={{
          width: `${width}px`,
          height: `${height}px`
        }}
      />
    </div>
  );
};