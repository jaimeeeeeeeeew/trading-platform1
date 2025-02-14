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

    // Modificar el cálculo para hacer las barras más anchas y visibles
    float x = position.x * scale.x + translate.x;
    float y = position.y;

    // Expandir el rango de coordenadas para hacer las barras más visibles
    x = (x * 2.0 - 1.0) * 0.8; // Reducir a 80% del ancho para dejar margen
    y = (y * 2.0 - 1.0);

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
    // Aumentar la opacidad base para asegurar visibilidad
    float alpha = max(opacity * vVolume, 0.4);
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
      currentPrice
    });

    const groupSize = parseInt(grouping);
    const filteredData = data.filter(
      d => d.price >= visiblePriceRange.min && d.price <= visiblePriceRange.max
    );

    // Agrupar datos para reducir el número de barras
    const groupedData = new Map();
    filteredData.forEach(item => {
      const key = Math.floor(item.price / groupSize) * groupSize;
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          price: key,
          volume: 0,
          side: item.side
        });
      }
      const group = groupedData.get(key);
      group.volume += item.volume;
    });

    const result = Array.from(groupedData.values());

    // Normalizar volúmenes después de agrupar
    const maxVolume = Math.max(...result.map(d => d.volume));
    return result.map(d => ({
      ...d,
      normalizedVolume: d.volume / maxVolume
    }));

  }, [data, visiblePriceRange, grouping, priceCoordinates]);

  useEffect(() => {
    if (!canvasRef.current || !processedData || processedData.length === 0 || !priceCoordinates) return;

    try {
      // Initialize REGL
      if (!reglRef.current) {
        reglRef.current = REGL({
          canvas: canvasRef.current,
          attributes: { 
            alpha: true, 
            antialias: true,
            depth: true,
            stencil: true
          },
          optionalExtensions: ['OES_standard_derivatives']
        });
      }

      const regl = reglRef.current;

      // Preparar datos de vértices con barras más anchas
      const positions: number[] = [];
      const sides: number[] = [];
      const volumes: number[] = [];

      // Aumentar el ancho de las barras
      const barWidth = 1.0 / processedData.length; // Usar todo el ancho disponible
      const barSpacing = barWidth * 0.1; // 10% de espacio entre barras

      processedData.forEach((bar, index) => {
        // Normalizar precio al rango [0,1]
        const normalizedY = (bar.price - visiblePriceRange.min) / 
          (visiblePriceRange.max - visiblePriceRange.min);

        // Crear rectángulo para cada barra
        const xStart = index * (barWidth - barSpacing);
        const xEnd = xStart + (barWidth - barSpacing);
        const volumeWidth = bar.normalizedVolume;

        // Vertices para la barra (usando triangle strip)
        positions.push(
          xStart, normalizedY,              // Inicio barra
          xStart + volumeWidth, normalizedY, // Fin barra con ancho proporcional al volumen
          xStart, normalizedY + 0.005,      // Inicio superior (altura aumentada)
          xStart + volumeWidth, normalizedY + 0.005 // Fin superior
        );

        // Side y volumen para cada vértice
        const sideValue = bar.side === 'ask' ? 1 : 0;
        for (let i = 0; i < 4; i++) {
          sides.push(sideValue);
          volumes.push(bar.normalizedVolume);
        }
      });

      // Crear comando REGL
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
          scale: [1.5, 1],              // Aumentar escala horizontal
          translate: [0.3, 0],          // Mover más a la derecha
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

        drawBars();
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
          height: `${height}px`,
          border: '1px solid rgba(255, 255, 255, 0.1)' // Temporal para debug
        }}
      />
    </div>
  );
};