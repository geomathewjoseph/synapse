import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import Redis from "ioredis";

// Simple type definitions for server usage
type Point = { x: number, y: number };

import { ServerToClientEvents, ClientToServerEvents } from "./src/types/socket";
import { DrawOptions, ShapeType } from "./src/types/common";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// CORS Origins - Allow all in production for easier deployment
// In a real production app, you'd want to restrict this
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || '*';

// Rate limiting config
const RATE_LIMIT_DRAW_PER_SEC = parseInt(process.env.RATE_LIMIT_DRAW_PER_SEC || "100", 10);

// Redis Client - Upstash requires TLS (rediss://)
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const isUpstash = REDIS_URL.includes('upstash.io');

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  tls: isUpstash ? { rejectUnauthorized: false } : undefined,
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

redis.on("connect", () => {
  console.log("Redis connected successfully");
});

// Try to connect to Redis
redis.connect().catch((err) => {
  console.warn("Redis connection failed, continuing without persistence:", err.message);
});

const app = next({ dev });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ['polling', 'websocket'],  // Polling first for Render compatibility
    pingTimeout: 60000,
    pingInterval: 25000,
    allowUpgrades: true,
  });

  // Rate limiting state: Map<socketId, { count, lastReset }>
  const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

  const checkRateLimit = (socketId: string): boolean => {
    const now = Date.now();
    let entry = rateLimitMap.get(socketId);

    if (!entry || now - entry.lastReset > 1000) {
      entry = { count: 0, lastReset: now };
    }

    entry.count++;
    rateLimitMap.set(socketId, entry);

    return entry.count <= RATE_LIMIT_DRAW_PER_SEC;
  };

  // State management using Redis
  interface DrawStep {
    prevPoint: Point | null;
    currentPoint: Point;
    color: string;
    width?: number;
    shape?: ShapeType;
  }

  // Redis Helpers
  const saveStroke = async (roomId: string, stroke: DrawStep) => {
    try {
      await redis.rpush(`room:${roomId}`, JSON.stringify(stroke));
    } catch (e) {
      console.error("Failed to save stroke", e);
    }
  };

  const saveBatch = async (roomId: string, strokes: DrawStep[]) => {
    try {
      const strings = strokes.map(s => JSON.stringify(s));
      if (strings.length > 0) {
        await redis.rpush(`room:${roomId}`, ...strings);
      }
    } catch (e) {
      console.error("Failed to save batch", e);
    }
  };

  const getHistory = async (roomId: string): Promise<DrawStep[]> => {
    try {
      const rows = await redis.lrange(`room:${roomId}`, 0, -1);
      return rows.map(r => JSON.parse(r));
    } catch (e) {
      console.error("Failed to fetch history", e);
      return [];
    }
  };

  const clearRoom = async (roomId: string) => {
    try {
      await redis.del(`room:${roomId}`);
    } catch (e) {
      console.error("Failed to clear room", e);
    }
  };

  // --- Input Validation Helpers ---
  const isValidRoomId = (id: unknown): id is string =>
    typeof id === 'string' && id.length > 0 && id.length < 100 && /^[a-zA-Z0-9_-]+$/.test(id);

  const isValidPoint = (p: unknown): p is Point | null => {
    if (p === null) return true;
    return typeof p === 'object' && p !== null &&
      typeof (p as Point).x === 'number' && typeof (p as Point).y === 'number' &&
      isFinite((p as Point).x) && isFinite((p as Point).y);
  };

  const isValidColor = (c: unknown): c is string =>
    typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c);

  const isValidDrawPayload = (payload: unknown): boolean => {
    if (typeof payload !== 'object' || payload === null) return false;
    const p = payload as any;
    // Validate core fields
    const coreValid = isValidRoomId(p.roomId) &&
      (p.prevPoint === null || isValidPoint(p.prevPoint)) && // prevPoint can be null for start of line
      isValidPoint(p.currentPoint) &&
      isValidColor(p.color);

    if (!coreValid) return false;

    // Optional fields
    if (p.width !== undefined && (typeof p.width !== 'number' || p.width <= 0 || p.width > 50)) return false;
    if (p.shape !== undefined && !['free', 'line', 'rect', 'circle'].includes(p.shape)) return false;

    return true;
  };

  // --- Socket Events ---
  io.on("connection", (socket) => {
    console.log("Client connected", socket.id);

    socket.on("join-room", async (roomId) => {
      if (!isValidRoomId(roomId)) {
        console.warn(`Invalid roomId from ${socket.id}:`, roomId);
        return;
      }
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);

      const history = await getHistory(roomId);
      if (history.length > 0) {
        socket.emit("canvas-history", history);
      }
    });

    socket.on("draw-line", (payload: unknown) => {
      if (!checkRateLimit(socket.id)) return;

      if (!isValidDrawPayload(payload)) {
        console.warn(`Invalid draw-line payload from ${socket.id}`);
        return;
      }
      const p = payload as any;
      const { prevPoint, currentPoint, color, roomId, width, shape } = p;

      const step = { prevPoint, currentPoint, color, width, shape };
      socket.to(roomId).emit("draw-line", step);
      saveStroke(roomId, step);
    });

    socket.on("draw-batch", (payload: any) => {
      // Basic validation
      if (!checkRateLimit(socket.id)) return;
      const { roomId, batch } = payload;
      if (!isValidRoomId(roomId) || !Array.isArray(batch)) return;

      // Filter valid strokes only?
      // For performance, assuming client is good, but let's do a quick validity check or just pass through.
      // We should validate at least the structure.
      const validBatch = batch.filter((item: any) =>
        item && item.currentPoint && typeof item.currentPoint.x === 'number'
      );

      if (validBatch.length > 0) {
        socket.to(roomId).emit("draw-batch", validBatch);
        saveBatch(roomId, validBatch);
      }
    });

    socket.on("mouse-move", ({ x, y, roomId }: any) => {
      if (!isValidRoomId(roomId) || typeof x !== 'number' || typeof y !== 'number') return;
      socket.to(roomId).emit("mouse-move", { x, y, socketId: socket.id });
    });

    socket.on("clear", ({ roomId }: any) => {
      if (!isValidRoomId(roomId)) return;
      socket.to(roomId).emit("clear");
      clearRoom(roomId);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected", socket.id);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
