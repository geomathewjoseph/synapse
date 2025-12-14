import { describe, it, expect } from 'vitest'

// Test stringToColor function (moved from Canvas.tsx for testability)
function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}

describe('stringToColor', () => {
    it('should return a valid hex color', () => {
        const result = stringToColor('test-socket-id')
        expect(result).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('should return consistent colors for same input', () => {
        const id = 'abc123'
        expect(stringToColor(id)).toBe(stringToColor(id))
    })

    it('should return different colors for different inputs', () => {
        expect(stringToColor('user1')).not.toBe(stringToColor('user2'))
    })
})
