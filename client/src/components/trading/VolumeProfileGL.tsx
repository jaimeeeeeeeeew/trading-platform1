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

// ... (interfaces y tipos se mantienen igual)

export const VolumeProfileGL = ({
  data,
  width,
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinates,
  grouping,
  maxVisibleBars
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reglRef = useRef<Regl | null>(null);

  // Step 1: Procesamiento de datos
  const processedData = useMemo(() => {
    if (!data || data.length === 0 || !priceCoordinates) return null;

    // Paso 1.1: Obtener el tamaño de grupo (1, 5 o 10)
    const groupSize = parseInt(grouping);

    // Paso 1.2: Filtrar datos al rango visible
    const filteredData = data.filter(
      d => d.price >= visiblePriceRange.min && d.price <= visiblePriceRange.max
    );

    // Paso 1.3: Agrupar datos por niveles de precio
    const groupedData = new Map();
    filteredData.forEach(item => {
      // Redondear precio al grupo más cercano
      const key = Math.floor(item.price / groupSize) * groupSize;

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          price: key,
          volume: 0,
          side: item.side
        });
      }
      // Acumular volumen en el grupo
      const group = groupedData.get(key);
      group.volume += item.volume;
    });

    // Paso 1.4: Convertir el Map a array y normalizar volúmenes
    const result = Array.from(groupedData.values());
    const maxVolume = Math.max(...result.map(d => d.volume));

    return result.map(d => ({
      ...d,
      normalizedVolume: d.volume / maxVolume
    }));

  }, [data, visiblePriceRange, grouping, priceCoordinates]);

  // Step 2: Renderizado WebGL
  useEffect(() => {
    if (!canvasRef.current || !processedData || processedData.length === 0 || !priceCoordinates) return;

    try {
      // Paso 2.1: Inicializar WebGL si es necesario
      if (!reglRef.current) {
        reglRef.current = REGL({
          canvas: canvasRef.current,
          attributes: {
            alpha: true,
            antialias: true,
            depth: true,
            stencil: true
          }
        });
      }

      const regl = reglRef.current;

      // Paso 2.2: Preparar datos para las barras
      const positions: number[] = [];
      const sides: number[] = [];
      const volumes: number[] = [];
      const barWidth = 0.2;
      const groupSize = parseInt(grouping);

      // Paso 2.3: Generar vértices para cada barra
      processedData.forEach((bar) => {
        const xStart = 0;
        const volumeWidth = bar.normalizedVolume * barWidth * 2;
        const yPos = bar.price;
        const barHeight = groupSize;

        // Crear 4 vértices para cada barra usando triangle strip
        positions.push(
          xStart, yPos,                    // Vértice inferior izquierdo
          xStart + volumeWidth, yPos,      // Vértice inferior derecho
          xStart, yPos + barHeight,        // Vértice superior izquierdo
          xStart + volumeWidth, yPos + barHeight  // Vértice superior derecho
        );

        // Asignar side y volume a cada vértice
        const sideValue = bar.side === 'ask' ? 1 : 0;
        for (let i = 0; i < 4; i++) {
          sides.push(sideValue);
          volumes.push(bar.normalizedVolume);
        }
      });

      // Paso 2.4: Configurar comando de dibujo WebGL
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
          scale: [3.0, 1.0],
          translate: [0.95, 0],
          yScale: height,
          yOffset: 0,
          viewportHeight: height,
          minY: priceCoordinates.minY,
          maxY: priceCoordinates.maxY,
          priceMin: visiblePriceRange.min,
          priceMax: visiblePriceRange.max,
          bidColor: [0.149, 0.65, 0.604],  // Color verde para bids
          askColor: [0.937, 0.325, 0.314], // Color rojo para asks
          opacity: 0.8
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

      // Paso 2.5: Loop de renderizado
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

  // Step 3: Renderizar contenedor y canvas
  return (
    <div
      style={{
        position: 'absolute',
        right: '65px',
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
  uniform float minY;
  uniform float maxY;
  uniform float priceMin;
  uniform float priceMax;

  varying float vSide;
  varying float vVolume;

  void main() {
    vSide = side;
    vVolume = volume;

    float x = -position.x;
    float y = position.y;

    // Normalizar el precio al rango [0, 1]
    float normalizedPrice = (y - priceMin) / (priceMax - priceMin);

    // Mapear al rango de coordenadas de pantalla
    float screenY = minY + (normalizedPrice * (maxY - minY));

    // Convertir a coordenadas NDC
    y = ((viewportHeight - screenY) / viewportHeight) * 2.0 - 1.0;

    // Aplicar escala y traslación
    x = x * scale.x + translate.x;

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
    float alpha = max(opacity * vVolume, 0.2);
    gl_FragColor = vec4(color, alpha);
  }
`;

interface PriceCoordinates {
  currentPrice: number;
  currentY: number;
  minPrice: number;
  minY: number;
  maxPrice: number;
  maxY: number;
}