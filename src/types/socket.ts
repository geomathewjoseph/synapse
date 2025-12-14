import { DrawOptions } from './common';

export interface ServerToClientEvents {
    'draw-line': (props: DrawOptions) => void;
    'draw-batch': (batch: DrawOptions[]) => void;
    'canvas-history': (state: DrawOptions[]) => void;
    'clear': () => void;
    'mouse-move': (data: { x: number; y: number; socketId: string }) => void;
}

export interface ClientToServerEvents {
    'draw-line': (props: DrawOptions & { roomId: string }) => void;
    'draw-batch': (props: { roomId: string, batch: DrawOptions[] }) => void;
    'join-room': (roomId: string) => void;
    'clear': (props: { roomId: string }) => void;
    'mouse-move': (data: { x: number; y: number; roomId: string }) => void;
}
