import { create } from 'zustand'

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting'

interface AppState {
    color: string
    setColor: (color: string) => void
    tool: 'pen' | 'eraser' | 'rect' | 'circle' | 'line'
    setTool: (tool: 'pen' | 'eraser' | 'rect' | 'circle' | 'line') => void
    lineWidth: number
    setLineWidth: (width: number) => void
    connectionStatus: ConnectionStatus
    setConnectionStatus: (status: ConnectionStatus) => void
}

export const useStore = create<AppState>((set) => ({
    color: '#000000',
    setColor: (color) => set({ color }),
    tool: 'pen',
    setTool: (tool) => set({ tool }),
    lineWidth: 5,
    setLineWidth: (lineWidth) => set({ lineWidth }),
    connectionStatus: 'connecting',
    setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
}))
