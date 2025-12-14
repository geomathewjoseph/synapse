import { DrawOptions, Point } from "@/types/common";

type DrawProps = DrawOptions & { ctx: CanvasRenderingContext2D };

export const drawLine = ({ prevPoint, currentPoint, ctx, color, width, shape }: DrawProps) => {
    const lineWidth = width || 5;

    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const start = prevPoint ?? currentPoint;
    const end = currentPoint;

    if (shape === 'rect') {
        const w = end.x - start.x;
        const h = end.y - start.y;
        ctx.strokeRect(start.x, start.y, w, h);
        return;
    }

    if (shape === 'circle') {
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        return;
    }

    if (shape === 'line') {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        return;
    }

    // Default: 'free'
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Smooth cap for freehand
    ctx.beginPath();
    ctx.arc(start.x, start.y, lineWidth / 2, 0, 2 * Math.PI);
    ctx.fill();
};
