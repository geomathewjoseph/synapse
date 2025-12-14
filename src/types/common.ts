export type Point = {
    x: number;
    y: number;
};

// Pure data, safe for socket
export type ShapeType = 'free' | 'line' | 'rect' | 'circle';

export interface DrawOptions {
    prevPoint: Point | null
    currentPoint: Point
    color: string
    width?: number
    shape?: ShapeType
}

// Runtime props, includes Context
export type Draw = {
    ctx: CanvasRenderingContext2D;
    currentPoint: Point;
    prevPoint: Point | null;
};

export type DrawLineProps = DrawOptions & {
    ctx: CanvasRenderingContext2D;
};
