import { describe, it, expect } from 'vitest'
import { useStore } from '../store/useStore'

describe('useStore', () => {
    it('should have default color as black', () => {
        const state = useStore.getState()
        expect(state.color).toBe('#000000')
    })

    it('should have default tool as pen', () => {
        const state = useStore.getState()
        expect(state.tool).toBe('pen')
    })

    it('should have default connection status as connecting', () => {
        const state = useStore.getState()
        expect(state.connectionStatus).toBe('connecting')
    })

    it('should update color correctly', () => {
        useStore.getState().setColor('#ff0000')
        expect(useStore.getState().color).toBe('#ff0000')
    })

    it('should update tool correctly', () => {
        useStore.getState().setTool('eraser')
        expect(useStore.getState().tool).toBe('eraser')
    })

    it('should update connection status correctly', () => {
        useStore.getState().setConnectionStatus('connected')
        expect(useStore.getState().connectionStatus).toBe('connected')
    })
})
