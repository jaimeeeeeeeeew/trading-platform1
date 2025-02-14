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
  uniform float viewportHeight;

  varying float vSide;
  varying float vVolume;

  void main() {
    vSide = side;
    vVolume = volume;

    // Ajustar la escala y posición para que las barras sean más visibles
    float x = (position.x * scale.x + translate.x) * 2.0 - 1.0;
    float y = (position.y * yScale + yOffset) / viewportHeight * 2.0 - 1.0;

    // Limitar las coordenadas al área visible
    x = clamp(x, -1.0, 1.0);
    y = clamp(y, -1.0, 1.0);

    gl_Position = vec4(x, y, 0, 1);
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
    // Aumentar la opacidad mínima para asegurar visibilidad
    float alpha = max(opacity * vVolume, 0.3);
    gl_FragColor = vec4(color, alpha);
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

    console.log('Processing WebGL data:', {
      dataLength: data.length,
      priceRange: visiblePriceRange,
      currentPrice,
      priceCoords: priceCoordinates
    });

    const groupSize = parseInt(grouping);
    const filteredData = data.filter(
      d => d.price >= visiblePriceRange.min && d.price <= visiblePriceRange.max
    );

    return filteredData;
  }, [data, visiblePriceRange, grouping, priceCoordinates]);

  useEffect(() => {
    if (!canvasRef.current || !processedData || processedData.length === 0 || !priceCoordinates) return;

    try {
      // Initialize REGL if not already done
      if (!reglRef.current) {
        reglRef.current = REGL({
          canvas: canvasRef.current,
          attributes: { 
            alpha: true, 
            antialias: true,
            depth: true,
            stencil: true
          },
          // Forzar el contexto WebGL
          optionalExtensions: ['OES_standard_derivatives']
        });
      }

      const regl = reglRef.current;

      // Preparar datos de vértices
      const positions: number[] = [];
      const sides: number[] = [];
      const volumes: number[] = [];

      const barWidth = 0.8 / processedData.length; // Ajustar ancho de barras
      const barSpacing = 0.2 / processedData.length;

      processedData.forEach((bar, index) => {
        const normalizedY = (bar.price - visiblePriceRange.min) / 
          (visiblePriceRange.max - visiblePriceRange.min);

        console.log('Bar data:', {
          price: bar.price,
          normalizedY,
          volume: bar.normalizedVolume,
          side: bar.side
        });

        // Crear rectángulo para cada barra
        const xStart = index * (barWidth + barSpacing);
        const xEnd = xStart + barWidth;

        positions.push(
          xStart, normalizedY,           // Inicio barra
          xEnd, normalizedY,             // Fin barra
          xStart, normalizedY + 0.002,   // Inicio superior
          xEnd, normalizedY + 0.002      // Fin superior
        );

        // Side y volumen para cada vértice
        const sideValue = bar.side === 'ask' ? 1 : 0;
        for (let i = 0; i < 4; i++) {
          sides.push(sideValue);
          volumes.push(bar.normalizedVolume);
        }
      });

      // Crear comando REGL con tipos
      const drawBars = regl({
        vert: vertexShader,
        frag: fragmentShader,
        attributes: {
          position: positions,
          side: sides,
          volume: volumes
        },
        uniforms: {
          aspectRatio: width / height,
          scale: [0.9, 1],              // Aumentar escala horizontal
          translate: [0.05, 0],         // Mover ligeramente a la derecha
          yScale: height,
          yOffset: 0,
          viewportHeight: height,
          bidColor: [0.149, 0.65, 0.604],  // #26a69a
          askColor: [0.937, 0.325, 0.314],  // #ef5350
          opacity: 0.9
        },
        count: positions.length / 2,
        primitive: 'triangle strip',
        blend: {
          enable: true,
          func: {
            srcRGB: 'src alpha',
            srcAlpha: 1,
            dstRGB: 'one minus src alpha',
            dstAlpha: 1
          }
        },
        depth: {
          enable: true,
          mask: true,
          func: 'less'
        }
      });

      // Renderizar frame
      regl.frame(() => {
        regl.clear({
          color: [0, 0, 0, 0],
          depth: 1
        });

        drawBars({
          aspectRatio: width / height,
          scale: [0.9, 1],
          translate: [0.05, 0],
          yScale: height,
          yOffset: 0,
          viewportHeight: height,
          bidColor: [0.149, 0.65, 0.604],
          askColor: [0.937, 0.325, 0.314],
          opacity: 0.9
        });
      });

      return () => {
        if (reglRef.current) {
          reglRef.current.destroy();
          reglRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error in WebGL rendering:', error);
    }
  }, [processedData, width, height, visiblePriceRange, priceCoordinates, currentPrice]);

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
          height: `${height}px`,
          border: '1px solid rgba(255, 255, 255, 0.1)' // Temporal para debug
        }}
      />
    </div>
  );
};