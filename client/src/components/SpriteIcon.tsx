import iconSprite from "@/assets/icons/icons-sprite.png";

type IconName = 
  | "editar" | "agregar" | "copiar" | "borrar" | "guardar" | "calcular" | "excel" | "calendario"
  | "administracion" | "bancos" | "cosecha" | "arrime" | "transferencia" | "cheques"
  | "reportes" | "herramientas" | "diagnostico" | "minimizar" | "respaldo" | "graficos";

const iconPositions: Record<IconName, { x: number; y: number }> = {
  editar: { x: 15, y: 8 },
  agregar: { x: 140, y: 8 },
  copiar: { x: 265, y: 8 },
  borrar: { x: 390, y: 8 },
  guardar: { x: 515, y: 8 },
  calcular: { x: 640, y: 8 },
  excel: { x: 765, y: 8 },
  calendario: { x: 890, y: 8 },
  administracion: { x: 15, y: 152 },
  bancos: { x: 140, y: 152 },
  cosecha: { x: 265, y: 152 },
  arrime: { x: 390, y: 152 },
  transferencia: { x: 515, y: 152 },
  cheques: { x: 640, y: 152 },
  reportes: { x: 15, y: 296 },
  herramientas: { x: 140, y: 296 },
  diagnostico: { x: 265, y: 296 },
  minimizar: { x: 390, y: 296 },
  respaldo: { x: 515, y: 296 },
  graficos: { x: 640, y: 296 },
};

const ICON_SIZE = 95;
const SPRITE_WIDTH = 1024;
const SPRITE_HEIGHT = 432;

interface SpriteIconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export default function SpriteIcon({ name, size = 16, className = "" }: SpriteIconProps) {
  const pos = iconPositions[name];
  if (!pos) return null;

  const scale = size / ICON_SIZE;
  
  return (
    <span
      className={`inline-block overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: "block",
          width: ICON_SIZE,
          height: ICON_SIZE,
          backgroundImage: `url(${iconSprite})`,
          backgroundPosition: `-${pos.x}px -${pos.y}px`,
          backgroundSize: `${SPRITE_WIDTH}px ${SPRITE_HEIGHT}px`,
          backgroundRepeat: "no-repeat",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </span>
  );
}

export type { IconName };
