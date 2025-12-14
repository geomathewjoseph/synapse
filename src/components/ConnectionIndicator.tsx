'use client'

import { useStore } from '@/store/useStore'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

export function ConnectionIndicator() {
    const status = useStore((state) => state.connectionStatus)

    const config = {
        connected: {
            icon: Wifi,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
            label: 'Connected',
        },
        connecting: {
            icon: Loader2,
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            label: 'Connecting...',
            animate: true,
        },
        reconnecting: {
            icon: Loader2,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            label: 'Reconnecting...',
            animate: true,
        },
        disconnected: {
            icon: WifiOff,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            label: 'Disconnected',
        },
    }

    const current = config[status]
    const Icon = current.icon

    return (
        <div
            className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full ${current.bg} backdrop-blur-sm border border-white/20 shadow-lg transition-all duration-300`}
        >
            <Icon
                className={`w-4 h-4 ${current.color} ${'animate' in current && current.animate ? 'animate-spin' : ''}`}
            />
            <span className={`text-xs font-medium ${current.color}`}>{current.label}</span>
        </div>
    )
}
