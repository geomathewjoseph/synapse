import { MousePointer2 } from 'lucide-react'

interface CursorProps {
    x: number
    y: number
    color?: string
    name?: string
}

export function UserCursor({ x, y, color = '#FF0000', name }: CursorProps) {
    return (
        <div
            className="absolute pointer-events-none transition-transform duration-100 ease-linear z-20"
            style={{
                transform: `translateX(${x}px) translateY(${y}px)`,
                left: 0,
                top: 0
            }}
        >
            <MousePointer2
                className="w-5 h-5 text-black fill-current"
                style={{ color }}
            />
            {name && (
                <div
                    className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
                    style={{ backgroundColor: color }}
                >
                    {name}
                </div>
            )}
        </div>
    )
}
