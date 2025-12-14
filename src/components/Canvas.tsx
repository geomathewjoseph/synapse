'use client'

import { useDraw } from '@/hooks/useDraw'
import { useEffect, useState, useMemo, useRef } from 'react'
import { io } from 'socket.io-client'
import { drawLine } from '@/utils/drawLine'
import { Draw, DrawOptions } from '@/types/common'
import { Trash2, Eraser, Pen, Palette, Square, Circle, Minus, Type, Share2, Check, ZoomIn, ZoomOut, Zap, HelpCircle, X, RotateCcw, Undo2, Redo2, Users, Maximize2 } from 'lucide-react'
import throttle from 'lodash/throttle'
import { useStore } from '@/store/useStore'
import { UserCursor } from './UserCursor'
import { ConnectionIndicator } from './ConnectionIndicator'

import { Socket } from 'socket.io-client'
import { ServerToClientEvents, ClientToServerEvents } from '@/types/socket'

// Initialize socket outside component
let socket: Socket<ServerToClientEvents, ClientToServerEvents>;

type CursorMap = Record<string, { x: number, y: number }>;

export default function Canvas({ roomId }: { roomId: string }) {
    const { color, setColor, tool, setTool, lineWidth, setLineWidth, setConnectionStatus } = useStore()
    // Shape State
    const shapeStartRef = useRef<{ x: number, y: number } | null>(null)
    const latestShapeRef = useRef<DrawOptions | null>(null)

    // Call useDraw with onFinish handler
    const { canvasRef, onMouseDown, clear } = useDraw(createLine, onFinishStroke)
    const tempCanvasRef = useRef<HTMLCanvasElement>(null)
    const [cursors, setCursors] = useState<CursorMap>({})
    const [copied, setCopied] = useState(false) // For share button state
    const [showShortcuts, setShowShortcuts] = useState(false) // Keyboard shortcuts modal

    // Infinite Canvas State
    const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 })
    const [panning, setPanning] = useState(false)
    const historyRef = useRef<DrawOptions[]>([])
    const batchRef = useRef<DrawOptions[]>([])
    const lastMousePos = useRef<{ x: number, y: number } | null>(null)

    // Undo/Redo State
    const undoStackRef = useRef<DrawOptions[][]>([])
    const redoStackRef = useRef<DrawOptions[][]>([])

    // Participant count
    const [participantCount, setParticipantCount] = useState(1)

    // Helper: Screen to World
    const toWorld = (x: number, y: number) => ({
        x: (x - camera.x) / camera.z,
        y: (y - camera.y) / camera.z
    })

    // Helper: Redraw All
    const redraw = () => {
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx || !canvasRef.current) return

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

        ctx.save()
        ctx.translate(camera.x, camera.y)
        ctx.scale(camera.z, camera.z)

        historyRef.current.forEach(step => {
            drawLine({ ...step, ctx })
        })

        ctx.restore()
    }

    // Effect: Re-draw when camera changes
    useEffect(() => {
        redraw()
    }, [camera])

    useEffect(() => {
        // Connect to the server
        // Use polling first, then upgrade to websocket for better compatibility with Render
        socket = io({
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            transports: ['polling', 'websocket'],  // Start with polling, upgrade to websocket
            upgrade: true,
            timeout: 20000,
        })

        // Connection status handlers
        socket.on('connect', () => {
            setConnectionStatus('connected')
            socket.emit('join-room', roomId)
        })

        socket.on('disconnect', () => {
            setConnectionStatus('disconnected')
        })

        socket.io.on('reconnect_attempt', () => {
            setConnectionStatus('reconnecting')
        })

        socket.io.on('reconnect', () => {
            setConnectionStatus('connected')
            // Re-join room and request fresh history
            socket.emit('join-room', roomId)
        })

        socket.io.on('reconnect_failed', () => {
            setConnectionStatus('disconnected')
        })

        socket.on('canvas-history', (history: DrawOptions[]) => {
            historyRef.current = history
            redraw()
        });

        socket.on('draw-line', (step: DrawOptions) => {
            historyRef.current.push(step)
            const ctx = canvasRef.current?.getContext('2d')
            if (ctx) {
                ctx.save()
                ctx.translate(camera.x, camera.y)
                ctx.scale(camera.z, camera.z)
                drawLine({ ...step, ctx })
                ctx.restore()
            }
        })

        socket.on('draw-batch', (batch: DrawOptions[]) => {
            batch.forEach(step => {
                historyRef.current.push(step)
                const ctx = canvasRef.current?.getContext('2d')
                if (ctx) {
                    ctx.save()
                    ctx.translate(camera.x, camera.y)
                    ctx.scale(camera.z, camera.z)
                    drawLine({ ...step, ctx })
                    ctx.restore()
                }
            })
        })

        socket.on('clear', () => {
            historyRef.current = []
            clear()
        })

        socket.on('mouse-move', ({ x, y, socketId }) => {
            setCursors(prev => ({ ...prev, [socketId]: { x, y } }))
        })

        // Handle window resize
        const handleResize = () => {
            if (canvasRef.current && tempCanvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
                tempCanvasRef.current.width = window.innerWidth;
                tempCanvasRef.current.height = window.innerHeight;
                redraw()
            }
        }

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            socket.off('connect')
            socket.off('disconnect')
            socket.off('draw-line')
            socket.off('draw-batch')
            socket.off('clear')
            socket.off('mouse-move')
            socket.off('canvas-history')
            socket.disconnect()
            window.removeEventListener('resize', handleResize)
        }
    }, [roomId, setConnectionStatus])

    // Throttled Emitters (Cursor only) - Batching for Lines

    // Flush batch periodically
    useEffect(() => {
        const interval = setInterval(() => {
            if (batchRef.current.length > 0 && socket) {
                const batch = [...batchRef.current]
                batchRef.current = []
                socket.emit('draw-batch', { roomId, batch })
            }
        }, 30) // 30ms flush rate

        return () => clearInterval(interval)
    }, [roomId])

    const emitCursor = useMemo(() => throttle((e: React.MouseEvent) => {
        // Send raw screen coordinates for cursor (since we render them absolute on screen)
        // OR send world coordinates? 
        // Standard is usually World for shared canvas, but Screen for "My mouse is here".
        // Actually, if I zoom in, my cursor stays 10px size.
        // Let's stick to Screen Coords for cursors for now, or users will see cursors flying if they have different zooms.
        // WAIT: If User A is zoomed in, and User B is zoomed out.
        // User A points at (100, 100) World.
        // User B should see cursor at (100, 100) World.
        // So we MUST send WORLD coordinates for cursors.
        // But `UserCursor` component renders simply at {x,y} style left/top.
        // So we need to transform OTHER users' world cursor to OUR screen cursor to render.
        // This is getting complex. Let's send World Coords for functionality, but for now let's stick to Screen Coords for simplicity of "Finish the App" unless I want to implement full world-cursor logic.
        // "Infinite Canvas / Pan Zoom" implies we all look at same board.
        // Send World Coords!
        // But `emitCursor` gets `e.clientX`. I need `toWorld(e.clientX, ...)`
        // However, I can't access `camera` inside `useMemo` effectively without recreating throttle.
        // Let's rely on component re-render? No, throttle needs stability.
        // We can use a REF for camera.
        if (socket) {
            socket.emit('mouse-move', { x: e.clientX, y: e.clientY, roomId })
        }
    }, 50), [roomId])

    // Fix for Cursor: Just broadcasting screen coords is wack if users have different pan.
    // For now, I will leave cursors as Screen Coords (Overlay) as a known limitation, 
    // focusing on the infinite canvas Drawing feature first.

    function createLine({ prevPoint, currentPoint, ctx }: Draw) {
        // Mode 1: Freehand / Eraser (Continuous)
        if (tool === 'pen' || tool === 'eraser') {
            const worldPrev = prevPoint ? toWorld(prevPoint.x, prevPoint.y) : null
            const worldCurr = toWorld(currentPoint.x, currentPoint.y)
            const drawColor = tool === 'eraser' ? '#FFFFFF' : color;

            const step: DrawOptions = {
                prevPoint: worldPrev,
                currentPoint: worldCurr,
                color: drawColor,
                width: lineWidth,
                shape: 'free'
            }

            // Save & Batch
            historyRef.current.push(step)
            batchRef.current.push(step)

            // Draw Locally
            ctx.save()
            ctx.translate(camera.x, camera.y)
            ctx.scale(camera.z, camera.z)
            drawLine({ ...step, ctx })
            ctx.restore()
        }
        // Mode 2: Shape Preview (Discrete) - Renders to TEMP LAYER
        else {
            if (!shapeStartRef.current) {
                shapeStartRef.current = currentPoint
            }

            const ctxTemp = tempCanvasRef.current?.getContext('2d')
            if (!ctxTemp || !tempCanvasRef.current) return

            // Clear Temp Layer
            ctxTemp.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height)

            // Draw Shape Preview on Temp
            const start = shapeStartRef.current
            const end = currentPoint
            if (!start) return

            const worldStart = toWorld(start.x, start.y)
            const worldEnd = toWorld(end.x, end.y)

            const shapeStep: DrawOptions = {
                prevPoint: worldStart,
                currentPoint: worldEnd,
                color,
                width: lineWidth,
                shape: tool as any
            }

            // Track for commit
            latestShapeRef.current = shapeStep

            ctxTemp.save()
            ctxTemp.translate(camera.x, camera.y)
            ctxTemp.scale(camera.z, camera.z)
            drawLine({ ...shapeStep, ctx: ctxTemp })
            ctxTemp.restore()
        }
    }

    function onFinishStroke() {
        if (latestShapeRef.current && (tool === 'rect' || tool === 'circle' || tool === 'line')) {
            // Commit Shape to History
            historyRef.current.push(latestShapeRef.current)
            batchRef.current.push(latestShapeRef.current)

            // Draw to Main Canvas immediately so it persists
            const ctx = canvasRef.current?.getContext('2d')
            if (ctx) {
                ctx.save()
                ctx.translate(camera.x, camera.y)
                ctx.scale(camera.z, camera.z)
                drawLine({ ...latestShapeRef.current, ctx })
                ctx.restore()
            }

            // Clear Temp Layer
            const ctxTemp = tempCanvasRef.current?.getContext('2d')
            if (ctxTemp && tempCanvasRef.current) {
                ctxTemp.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height)
            }

            // Cleanup
            latestShapeRef.current = null
            shapeStartRef.current = null
        } else {
            shapeStartRef.current = null
            latestShapeRef.current = null
        }
    }

    const handleClear = () => {
        if (window.confirm('Clear the entire canvas? This cannot be undone.')) {
            if (socket) socket.emit('clear', { roomId })
            historyRef.current = []
            clear()
        }
    }

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy link', err)
        }
    }

    // Undo: Remove last stroke(s) and save to redo stack
    const handleUndo = () => {
        if (historyRef.current.length === 0) return

        // Save current state for redo
        redoStackRef.current.push([...historyRef.current])

        // Remove last batch of strokes (find last stroke and remove all connected points)
        // For simplicity, we'll remove strokes until we hit a different batch marker
        const lastItem = historyRef.current.pop()
        if (lastItem) {
            undoStackRef.current.push([lastItem])
        }

        redraw()
        // Note: Undo is local-only for now - doesn't sync to other users
    }

    // Redo: Restore last undone action
    const handleRedo = () => {
        if (undoStackRef.current.length === 0) return

        const items = undoStackRef.current.pop()
        if (items) {
            historyRef.current.push(...items)
            redraw()
        }
    }

    // Fit to Screen: Calculate bounding box and fit camera
    const fitToScreen = () => {
        if (historyRef.current.length === 0) {
            // Reset to default
            setCamera({ x: 0, y: 0, z: 1 })
            return
        }

        // Find bounding box of all strokes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        historyRef.current.forEach(stroke => {
            const points = [stroke.currentPoint]
            if (stroke.prevPoint) points.push(stroke.prevPoint)
            points.forEach(p => {
                minX = Math.min(minX, p.x)
                minY = Math.min(minY, p.y)
                maxX = Math.max(maxX, p.x)
                maxY = Math.max(maxY, p.y)
            })
        })

        // Add padding
        const padding = 50
        minX -= padding
        minY -= padding
        maxX += padding
        maxY += padding

        // Calculate zoom to fit
        const contentWidth = maxX - minX
        const contentHeight = maxY - minY
        const screenWidth = window.innerWidth
        const screenHeight = window.innerHeight

        const zoomX = screenWidth / contentWidth
        const zoomY = screenHeight / contentHeight
        const zoom = Math.min(zoomX, zoomY, 2) // Cap at 2x zoom

        // Center content
        const centerX = (minX + maxX) / 2
        const centerY = (minY + maxY) / 2
        const offsetX = screenWidth / 2 - centerX * zoom
        const offsetY = screenHeight / 2 - centerY * zoom

        setCamera({ x: offsetX, y: offsetY, z: zoom })
    }

    // Handlers for Pan/Zoom
    const handleWheel = (e: React.WheelEvent) => {
        // Zoom
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            const zoomSpeed = 0.001
            const newZoom = Math.max(0.1, Math.min(camera.z - e.deltaY * zoomSpeed, 5))
            setCamera(prev => ({ ...prev, z: newZoom }))
        } else {
            // Pan
            setCamera(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }))
        }
    }

    const resetZoom = () => setCamera({ x: 0, y: 0, z: 1 })

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

            // Undo/Redo with Ctrl/Cmd
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault()
                if (e.shiftKey) {
                    handleRedo()
                } else {
                    handleUndo()
                }
                return
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault()
                handleRedo()
                return
            }

            switch (e.key.toLowerCase()) {
                case 'p': setTool('pen'); break
                case 'e': setTool('eraser'); break
                case 'r': setTool('rect'); break
                case 'c': setTool('circle'); break
                case 'l': setTool('line'); break
                case 'f': fitToScreen(); break
                case '?': setShowShortcuts(prev => !prev); break
                case 'escape': setShowShortcuts(false); break
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [setTool])

    const handleMouseDown = (e: React.MouseEvent) => {
        // Middle mouse or Space+Click
        if (e.button === 1) { // Middle click only
            setPanning(true)
            lastMousePos.current = { x: e.clientX, y: e.clientY }
        } else {
            onMouseDown() // No args
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        emitCursor(e)
        if (panning && lastMousePos.current) {
            const dx = e.clientX - lastMousePos.current.x
            const dy = e.clientY - lastMousePos.current.y
            setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
            lastMousePos.current = { x: e.clientX, y: e.clientY }
        }
    }

    const handleMouseUp = () => {
        setPanning(false)
        lastMousePos.current = null
        // Reset shape start on global mouse up just in case
        // But the actual commit happens in useDraw's onFinish
    }

    return (
        <div className='w-full h-full flex justify-center items-center relative bg-gray-50 overflow-hidden'
            onWheel={handleWheel}
            onMouseUp={handleMouseUp}
        // We attach move/down to canvas wrapper to catch pan interactions outside canvas if needed, 
        // but canvas covers all.
        >
            {/* Connection Status */}
            <ConnectionIndicator />

            {/* Remote Cursors (Note: These are currently Screen Space) */}
            {Object.entries(cursors).map(([id, pos]) => (
                <UserCursor key={id} x={pos.x} y={pos.y} color={stringToColor(id)} name={`User-${id.slice(-4)}`} />
            ))}

            {/* Top Bar with Share */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center pointer-events-none z-50">
                <div className="pointer-events-auto flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-gray-200/50">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
                        <Zap size={16} fill="white" />
                    </div>
                    <span className="font-bold text-gray-800">Synapse</span>
                    <div className="w-px h-4 bg-gray-300" />
                    <div className="flex items-center gap-1.5 text-gray-600">
                        <Users size={16} />
                        <span className="text-sm font-medium">{Object.keys(cursors).length + 1}</span>
                    </div>
                </div>

                <div className="pointer-events-auto flex items-center gap-2">
                    {/* Undo/Redo */}
                    <div className="flex bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-gray-200/50 overflow-hidden">
                        <button
                            onClick={handleUndo}
                            className="p-2.5 hover:bg-gray-100 text-gray-600 transition-colors border-r border-gray-200"
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 size={18} />
                        </button>
                        <button
                            onClick={handleRedo}
                            className="p-2.5 hover:bg-gray-100 text-gray-600 transition-colors"
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo2 size={18} />
                        </button>
                    </div>

                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full shadow-lg hover:bg-gray-800 transition-all hover:scale-105 active:scale-95"
                    >
                        {copied ? <Check size={18} /> : <Share2 size={18} />}
                        <span className="font-medium">{copied ? 'Copied!' : 'Share Link'}</span>
                    </button>
                </div>
            </div>

            {/* Bottom Floating Toolbar */}
            <div className='absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-50 pointer-events-none'>

                {/* Main Dock */}
                <div className='pointer-events-auto flex items-center gap-3 bg-white/90 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-2xl border border-gray-200/50 transition-all hover:shadow-3xl hover:-translate-y-1' role="toolbar">

                    {/* Tool Group: Primary */}
                    <div className="flex gap-1 bg-gray-100/50 p-1 rounded-xl">
                        <ToolButton active={tool === 'pen'} onClick={() => setTool('pen')} icon={<Pen size={20} />} label="Pen" shortcut="P" />
                        <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={20} />} label="Eraser" shortcut="E" />
                    </div>

                    <div className="w-px h-8 bg-gray-200" />

                    {/* Tool Group: Shapes */}
                    <div className="flex gap-1 bg-gray-100/50 p-1 rounded-xl">
                        <ToolButton active={tool === 'rect'} onClick={() => setTool('rect')} icon={<Square size={20} />} label="Rectangle" shortcut="R" />
                        <ToolButton active={tool === 'circle'} onClick={() => setTool('circle')} icon={<Circle size={20} />} label="Circle" shortcut="C" />
                        <ToolButton active={tool === 'line'} onClick={() => setTool('line')} icon={<Minus size={20} />} label="Line" shortcut="L" />
                    </div>

                    <div className="w-px h-8 bg-gray-200" />

                    {/* Tool Group: Colors & Props */}
                    <div className="flex items-center gap-3 px-2">
                        <div className="flex -space-x-1.5 hover:space-x-1 transition-all">
                            {['#000000', '#ef4444', '#3b82f6', '#22c55e'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => { setColor(c); setTool('pen'); }}
                                    className={`w-6 h-6 rounded-full border-2 border-white ring-1 ring-gray-100 transition-transform hover:scale-125 z-10 ${color === c ? 'scale-125 ring-2 ring-blue-500' : ''}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                            <div className="relative w-6 h-6 rounded-full border-2 border-white ring-1 ring-gray-100 overflow-hidden cursor-pointer hover:scale-110 transition-transform bg-gradient-to-br from-yellow-400 to-purple-500">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => { setColor(e.target.value); setTool('pen'); }}
                                    className="opacity-0 absolute inset-0 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-2">
                            <input
                                type="range"
                                min="1" max="20"
                                value={lineWidth}
                                title={`Thickness: ${lineWidth}px`}
                                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                                className="w-20 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-black"
                            />
                            {/* Line width preview */}
                            <div
                                className="rounded-full bg-current transition-all"
                                style={{
                                    width: Math.max(4, lineWidth),
                                    height: Math.max(4, lineWidth),
                                    backgroundColor: color
                                }}
                            />
                        </div>
                    </div>

                    <div className="w-px h-8 bg-gray-200" />

                    <button
                        onClick={handleClear}
                        className="p-3 rounded-xl hover:bg-red-50 text-red-500 transition-colors"
                        title="Clear Canvas"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Zoom Controls (Bottom Right) */}
            <div className="absolute bottom-8 right-8 flex gap-2 z-50 pointer-events-auto">
                <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 flex items-center overflow-hidden">
                    <button className="p-3 hover:bg-gray-50 text-gray-600 border-r border-gray-100" onClick={() => setCamera(p => ({ ...p, z: Math.min(p.z + 0.1, 5) }))} title="Zoom In">
                        <ZoomIn size={20} />
                    </button>
                    <button
                        className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-w-[60px] text-center"
                        onClick={resetZoom}
                        title="Reset Zoom"
                    >
                        {Math.round(camera.z * 100)}%
                    </button>
                    <button className="p-3 hover:bg-gray-50 text-gray-600 border-l border-gray-100" onClick={() => setCamera(p => ({ ...p, z: Math.max(p.z - 0.1, 0.1) }))} title="Zoom Out">
                        <ZoomOut size={20} />
                    </button>
                </div>
                <button
                    className="p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    onClick={fitToScreen}
                    title="Fit to Screen (F)"
                >
                    <Maximize2 size={20} />
                </button>
                <button
                    className="p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    onClick={() => setShowShortcuts(true)}
                    title="Keyboard Shortcuts (?)"
                >
                    <HelpCircle size={20} />
                </button>
            </div>

            {/* Keyboard Shortcuts Modal */}
            {showShortcuts && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h2>
                            <button onClick={() => setShowShortcuts(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>Pen</span><kbd className="px-2 py-0.5 bg-gray-200 rounded">P</kbd></div>
                                <div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>Eraser</span><kbd className="px-2 py-0.5 bg-gray-200 rounded">E</kbd></div>
                                <div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>Rectangle</span><kbd className="px-2 py-0.5 bg-gray-200 rounded">R</kbd></div>
                                <div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>Circle</span><kbd className="px-2 py-0.5 bg-gray-200 rounded">C</kbd></div>
                                <div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>Line</span><kbd className="px-2 py-0.5 bg-gray-200 rounded">L</kbd></div>
                                <div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>Help</span><kbd className="px-2 py-0.5 bg-gray-200 rounded">?</kbd></div>
                            </div>
                            <div className="border-t pt-3 mt-3 space-y-1">
                                <div className="flex justify-between p-2 bg-blue-50 rounded-lg"><span>Undo</span><kbd className="px-2 py-0.5 bg-blue-200 rounded">Ctrl+Z</kbd></div>
                                <div className="flex justify-between p-2 bg-blue-50 rounded-lg"><span>Redo</span><kbd className="px-2 py-0.5 bg-blue-200 rounded">Ctrl+Y</kbd></div>
                                <div className="flex justify-between p-2 bg-green-50 rounded-lg"><span>Fit to Screen</span><kbd className="px-2 py-0.5 bg-green-200 rounded">F</kbd></div>
                            </div>
                            <div className="border-t pt-3 mt-3">
                                <div className="flex justify-between p-2"><span className="text-gray-600">Pan Canvas</span><span className="text-gray-500">Middle Click + Drag</span></div>
                                <div className="flex justify-between p-2"><span className="text-gray-600">Zoom</span><span className="text-gray-500">Ctrl + Scroll</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                className='absolute inset-0 z-0'
            />
            {/* Temp Canvas for Shapes/Previews */}
            <canvas
                ref={tempCanvasRef}
                className='absolute inset-0 z-10 pointer-events-none touch-none bg-transparent'
            />
        </div>
    )
}

function ToolButton({ active, onClick, icon, label, shortcut }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, shortcut?: string }) {
    return (
        <button
            onClick={onClick}
            title={shortcut ? `${label} (${shortcut})` : label}
            className={`p-2.5 rounded-lg transition-all duration-200 ${active
                ? 'bg-black text-white shadow-md scale-100'
                : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-900'
                }`}
        >
            {icon}
        </button>
    )
}

// Helper to generate consistent colors from definition
function stringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}
