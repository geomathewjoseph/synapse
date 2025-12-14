export type Draw = {
    ctx: CanvasRenderingContext2D;
    currentPoint: Point;
    prevPoint: Point | null;
};

export type Point = {
    x: number;
    y: number;
};

export type DrawLineProps = {
    prevPoint: Point | null;
    currentPoint: Point;
    ctx: CanvasRenderingContext2D;
    color: string;
};
