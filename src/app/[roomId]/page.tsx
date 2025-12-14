'use client'
import Canvas from "@/components/Canvas";
import { use } from "react";

interface PageProps {
  params: Promise<{ roomId: string }>
}

export default function RoomPage({ params }: PageProps) {
  const { roomId } = use(params);
  return (
    <main className="h-screen w-screen flex flex-col items-center justify-between p-0 m-0 overflow-hidden">
      <Canvas roomId={roomId} />
    </main>
  );
}
