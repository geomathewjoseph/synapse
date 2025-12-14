# Synapse ⚡

<div align="center">

**Real-time Collaboration Whiteboard for Creative Teams**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-white?logo=socket.io)](https://socket.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://docker.com/)
[![Redis](https://img.shields.io/badge/Redis-Persistence-red?logo=redis)](https://redis.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)

[Features](#-features) • [Demo](#-demo) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Architecture](#-architecture)

</div>

---

## ✨ Features

### 🎨 Drawing Tools
- **Pen Tool** - Freehand drawing with customizable colors and line width
- **Eraser** - Remove drawings with adjustable size
- **Shapes** - Rectangle, Circle, and Line tools with live preview
- **Color Picker** - Quick presets + custom color selector

### 🔄 Real-time Collaboration
- **Live Cursors** - See other users' cursors with name labels
- **Instant Sync** - Drawings appear immediately across all connected clients
- **Participant Count** - See how many users are in the room
- **Room-based** - Each URL is a unique collaboration space

### 🖼️ Infinite Canvas
- **Pan & Zoom** - Middle-click drag to pan, Ctrl+Scroll to zoom
- **Zoom Indicator** - Click percentage to reset view
- **Fit to Screen** - Auto-zoom to fit all content (F key)

### ⌨️ Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `P` | Pen tool |
| `E` | Eraser |
| `R` | Rectangle |
| `C` | Circle |
| `L` | Line |
| `F` | Fit to Screen |
| `?` | Show shortcuts |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |

### 💾 Persistence
- **Redis-backed** - Drawings are stored and restored on refresh
- **Auto-save** - No manual save required
- **History Sync** - New users receive full drawing history

---

## 🎮 Demo

### Landing Page
Join an existing room or create a new one with a single click.

### Canvas Interface
Full-featured drawing canvas with floating toolbar, undo/redo, and live collaboration.

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/geomathewjoseph/synapse.git
cd synapse

# Start with Docker Compose
docker-compose up -d

# Open http://localhost:3001
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

---

## 📚 Documentation

### Project Structure

```
synapse/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── page.tsx         # Landing page
│   │   ├── [roomId]/        # Dynamic room pages
│   │   └── api/             # API routes
│   ├── components/
│   │   ├── Canvas.tsx       # Main canvas component
│   │   ├── UserCursor.tsx   # Remote cursor display
│   │   └── ConnectionIndicator.tsx
│   ├── hooks/
│   │   └── useDraw.ts       # Drawing logic hook
│   ├── store/
│   │   └── useStore.ts      # Zustand state management
│   ├── types/
│   │   ├── common.ts        # Shared TypeScript types
│   │   └── socket.ts        # Socket.io event types
│   └── utils/
│       └── drawLine.ts      # Canvas drawing utilities
├── server.ts                # Custom Socket.io server
├── docker-compose.yml       # Docker orchestration
└── Dockerfile               # Production build
```

### Key Components

#### `Canvas.tsx`
The main drawing surface handling:
- Mouse/touch events for drawing
- Camera transformations for pan/zoom
- Socket.io event emission and handling
- Tool switching and state management

#### `server.ts`
Custom Node.js server providing:
- Socket.io WebSocket handling
- Room management (join/leave)
- Event broadcasting (draw, clear, cursor)
- Redis persistence integration

#### `useDraw.ts`
React hook encapsulating:
- Canvas reference management
- Drawing state (isDrawing, prevPoint)
- Mouse event handlers
- Clear functionality

---

## 🏗️ Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   Browser Tab   │◄──────────────────►│   Node Server   │
│   (Next.js)     │    Socket.io       │   (server.ts)   │
└─────────────────┘                    └────────┬────────┘
                                                │
┌─────────────────┐                            │
│   Browser Tab   │◄───────────────────────────┤
│   (Same Room)   │                            │
└─────────────────┘                    ┌───────▼────────┐
                                       │     Redis      │
                                       │  (Persistence) │
                                       └────────────────┘
```

### Data Flow

1. **Drawing**: User draws → Local render → Batch to server
2. **Broadcast**: Server broadcasts to room → Other clients render
3. **Persistence**: Server saves to Redis → Loaded on room join
4. **Sync**: New client joins → Server sends history → Client replays

### Performance Optimizations

- **Batching**: Draw events batched at 30ms intervals
- **Throttling**: Cursor events throttled to 50ms
- **Optimistic UI**: Local drawing renders immediately
- **Efficient Redraw**: Only affected areas redrawn

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://redis:6379` | Redis connection URL |
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |

### Docker Compose Services

```yaml
services:
  web:
    build: .
    ports:
      - "3001:3000"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |
| **Socket.io** | Real-time WebSocket communication |
| **Zustand** | Lightweight state management |
| **Redis** | Drawing persistence |
| **Docker** | Containerized deployment |
| **Framer Motion** | Smooth animations |
| **Lucide React** | Beautiful icons |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

<div align="center">

**Built with ❤️ using Next.js, Socket.io, and Redis**

[Report Bug](https://github.com/geomathewjoseph/synapse/issues) • [Request Feature](https://github.com/geomathewjoseph/synapse/issues)

</div>
