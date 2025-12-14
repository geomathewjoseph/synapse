'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Users, Zap, Command, Share2, Palette } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    const createRoom = () => {
        const id = Math.random().toString(36).substring(7)
        router.push(`/${id}`)
    }

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden selection:bg-purple-500/30 font-sans">

            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-purple-600/30 rounded-full blur-[120px] -z-10"></div>
            </div>

            {/* Navbar */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-white/5">
                <div className="flex items-center gap-3 font-bold text-xl tracking-tight">
                    <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Zap size={20} className="text-white fill-white" />
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Synapse</span>
                </div>
                <div className="flex gap-6 items-center">
                    <Link href="https://github.com" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">GitHub</Link>
                    <button onClick={createRoom} className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-gray-200 transition-all flex items-center gap-2">
                        Get Started <ArrowRight size={16} />
                    </button>
                </div>
            </nav>

            <main className="relative z-10 flex flex-col items-center justify-center pt-32 px-4 text-center">

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-purple-300 mb-10 backdrop-blur-md shadow-2xl shadow-purple-900/20"
                >
                    <Sparkles size={14} />
                    <span className="font-medium">Real-time Collaboration Reimagined</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-7xl md:text-9xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40 mb-8 leading-[1.1]"
                >
                    Think Together.
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-xl md:text-2xl text-gray-400 max-w-3xl mb-12 leading-relaxed"
                >
                    The infinite canvas for creative teams.
                    <br className="hidden md:block" />
                    Zero latency, no sign-up, just pure flow.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col items-center gap-6 w-full max-w-md"
                >
                    <button
                        onClick={createRoom}
                        className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full bg-white px-10 font-medium text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
                    >
                        <span className="flex items-center gap-2 text-lg">
                            <Palette size={20} />
                            Start Drawing Now
                        </span>
                    </button>

                    <div className="flex items-center gap-3 text-gray-500">
                        <div className="h-px w-12 bg-gray-700"></div>
                        <span className="text-sm">or join existing room</span>
                        <div className="h-px w-12 bg-gray-700"></div>
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            const code = (e.target as HTMLFormElement).roomCode.value.trim()
                            if (code) router.push(`/${code}`)
                        }}
                        className="flex gap-2 w-full"
                    >
                        <input
                            name="roomCode"
                            type="text"
                            placeholder="Enter room code..."
                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                        />
                        <button
                            type="submit"
                            className="px-6 py-3 bg-white/10 border border-white/10 rounded-full text-white font-medium hover:bg-white/20 transition-all flex items-center gap-2"
                        >
                            Join <ArrowRight size={16} />
                        </button>
                    </form>
                </motion.div>

                {/* Feature Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 max-w-6xl w-full px-4 text-left"
                >
                    <FeatureCard
                        icon={<Share2 size={24} />}
                        color="blue"
                        title="Instant Collaboration"
                        desc="Generate a link and invite your team in seconds. No accounts needed."
                    />
                    <FeatureCard
                        icon={<Command size={24} />}
                        color="purple"
                        title="Power Tools"
                        desc="Shapes, ink, and infinite canvas. All the tools you need to express ideas."
                    />
                    <FeatureCard
                        icon={<Users size={24} />}
                        color="green"
                        title="Live Presence"
                        desc="See exactly where your team is looking and what they are drawing in real-time."
                    />
                </motion.div>

                <footer className="mt-32 pb-10 text-gray-600 text-sm">
                    © 2024 Synapse. Built for speed.
                </footer>
            </main>
        </div>
    )
}

function FeatureCard({ icon, title, desc, color }: any) {
    const colorClasses: any = {
        blue: "text-blue-400 bg-blue-500/10",
        purple: "text-purple-400 bg-purple-500/10",
        green: "text-green-400 bg-green-500/10",
    }

    return (
        <div className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${colorClasses[color]} group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-3 text-white">{title}</h3>
            <p className="text-gray-400 leading-relaxed">{desc}</p>
        </div>
    )
}
