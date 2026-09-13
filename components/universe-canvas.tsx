"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import type { MutableRefObject } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

const STAR_COUNT = 850

const AmbientStars = memo(function AmbientStars({ active }: { active: boolean }) {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera } = useThree()
  const scrollRef = useRef(0)
  const stars = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3)
    const colors = new Float32Array(STAR_COUNT * 3)
    const colorA = new THREE.Color("#ffffff")
    const colorB = new THREE.Color("#38bdf8")
    for (let i = 0; i < STAR_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15
      positions[i * 3 + 2] = (Math.random() - 0.5) * 18
      const color = Math.random() > 0.72 ? colorB : colorA
      colors.set([color.r, color.g, color.b], i * 3)
    }
    return { positions, colors }
  }, [])

  useEffect(() => {
    const onScroll = () => { scrollRef.current = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight) }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useFrame(({ clock, pointer }) => {
    if (!active || document.hidden || !pointsRef.current) return
    const elapsed = clock.getElapsedTime()
    pointsRef.current.rotation.y = elapsed * 0.012 + pointer.x * 0.025
    pointsRef.current.rotation.x = Math.sin(elapsed * 0.08) * 0.025 + pointer.y * 0.018
    pointsRef.current.position.y = scrollRef.current * 1.5
    camera.position.z = 8 - scrollRef.current * 1.1
  })

  return <points ref={pointsRef} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[stars.positions, 3]} /><bufferAttribute attach="attributes-color" args={[stars.colors, 3]} /></bufferGeometry><pointsMaterial size={0.026} vertexColors transparent opacity={0.72} sizeAttenuation /></points>
})

export function UniverseCanvas() {
  const [dpr, setDpr] = useState(1)
  const [active, setActive] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)
  useEffect(() => { setDpr(Math.min(window.devicePixelRatio || 1, 1.5)) }, [])
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0 })
    if (canvasRef.current) observer.observe(canvasRef.current)
    const onVisibility = () => setActive(!document.hidden)
    document.addEventListener("visibilitychange", onVisibility)
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility) }
  }, [])
  return <div ref={canvasRef} className="universe-canvas" aria-hidden="true"><Canvas camera={{ position: [0, 0, 8], fov: 60 }} dpr={dpr} gl={{ antialias: true, powerPreference: "high-performance" }}><ambientLight intensity={0.3} /><AmbientStars active={active} /></Canvas></div>
}

type TouchController = { active: boolean; lastX: number; deltaX: number }

const LogoParticles = memo(function LogoParticles({ dispersed, active, scale, touchController }: { dispersed: boolean; active: boolean; scale: number; touchController?: MutableRefObject<TouchController> }) {
  const [isDragging, setIsDragging] = useState(false)
  const [particleLimit, setParticleLimit] = useState<number | null>(null)
  const internalTouchController = useRef<TouchController>({ active: false, lastX: 0, deltaX: 0 })
  const controller = touchController ?? internalTouchController
  const pointsRef = useRef<THREE.Points>(null)
  const groupRef = useRef<THREE.Group>(null)
  const dragging = useRef(false)
  const lastX = useRef(0)
  const progress = useRef(0)
  const targetRotation = useRef({ x: 0, y: 0 })
  const { camera } = useThree()
  useEffect(() => {
    const updateDevice = () => setParticleLimit(window.innerWidth < 768 ? 1200 : null)
    updateDevice()
    window.addEventListener("resize", updateDevice)
    return () => window.removeEventListener("resize", updateDevice)
  }, [])
  useEffect(() => {
    const updateCamera = () => {
      const mobile = window.innerWidth < 768
      camera.position.z = mobile ? 9.5 : 5
      camera.fov = mobile ? 48 : 42
      camera.updateProjectionMatrix()
    }
    updateCamera()
    window.addEventListener("resize", updateCamera)
    return () => window.removeEventListener("resize", updateCamera)
  }, [camera])
  const cloud = useMemo(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 720; canvas.height = 220
    const context = canvas.getContext("2d")!
    context.fillStyle = "white"; context.font = "900 132px Arial"; context.textAlign = "center"; context.textBaseline = "middle"
    context.fillText("NEXUS", 360, 110)
    const pixels = context.getImageData(0, 0, 720, 220).data
    const positions: number[] = []; const ambient: number[] = []
    for (let y = 0; y < 220; y += 4) for (let x = 0; x < 720; x += 4) {
      if (pixels[(y * 720 + x) * 4 + 3] > 100) { positions.push((x - 360) / 62, (110 - y) / 62, (Math.random() - 0.5) * 0.2); ambient.push((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 5.5, (Math.random() - 0.5) * 5) }
    }
    const limit = particleLimit ? Math.min(particleLimit * 3, positions.length) : positions.length
    return { positions: new Float32Array(positions.slice(0, limit)), ambient: new Float32Array(ambient.slice(0, limit)) }
  }, [particleLimit])

  useFrame(({ clock, pointer }) => {
    if (!active || document.hidden || !pointsRef.current || !groupRef.current) return
    progress.current = THREE.MathUtils.lerp(progress.current, dispersed ? 0 : 1, 0.045)
    const position = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < position.count; i++) {
      const j = i * 3; const drift = Math.sin(clock.getElapsedTime() * 0.7 + i) * 0.025
      position.array[j] = THREE.MathUtils.lerp(cloud.ambient[j], cloud.positions[j], progress.current) + drift
      position.array[j + 1] = THREE.MathUtils.lerp(cloud.ambient[j + 1], cloud.positions[j + 1], progress.current)
      position.array[j + 2] = THREE.MathUtils.lerp(cloud.ambient[j + 2], cloud.positions[j + 2], progress.current)
    }
    position.needsUpdate = true
    if (controller.current.deltaX !== 0) {
      targetRotation.current.y += controller.current.deltaX * (window.innerWidth < 768 ? 0.018 : 0.01)
      controller.current.deltaX = 0
    }
    targetRotation.current.y = dragging.current || controller.current.active ? targetRotation.current.y : pointer.x * 0.22
    targetRotation.current.x = pointer.y * 0.12
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation.current.y, 0.08)
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation.current.x, 0.08)
  })

  return <group ref={groupRef} scale={scale} onPointerDown={(event) => { setIsDragging(true); dragging.current = true; lastX.current = event.clientX }} onPointerUp={() => { setIsDragging(false); dragging.current = false }} onPointerLeave={() => { setIsDragging(false); dragging.current = false }} onPointerMove={(event) => { if (isDragging && dragging.current) { targetRotation.current.y += (event.clientX - lastX.current) * 0.01; lastX.current = event.clientX } }}><points ref={pointsRef}><bufferGeometry><bufferAttribute attach="attributes-position" args={[cloud.ambient.slice(), 3]} /></bufferGeometry><pointsMaterial color="#a7efff" size={0.045} transparent opacity={0.9} sizeAttenuation /></points><mesh><sphereGeometry args={[3.7, 16, 16]} /><meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.035} /></mesh></group>
})

export function NexusParticleLogo() {
  const [dpr, setDpr] = useState(1)
  const touchController = useRef<TouchController>({ active: false, lastX: 0, deltaX: 0 })
  const sectionRef = useRef<HTMLDivElement>(null)
  const [dispersed, setDispersed] = useState(false)
  const [active, setActive] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => { setDpr(Math.min(window.devicePixelRatio || 1, 1.5)); const updateMobile = () => setIsMobile(window.innerWidth < 768); updateMobile(); window.addEventListener("resize", updateMobile); return () => window.removeEventListener("resize", updateMobile) }, [])
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { setDispersed(!entry.isIntersecting); setActive(entry.isIntersecting) }, { threshold: 0.18 })
    if (sectionRef.current) observer.observe(sectionRef.current)
    const onVisibility = () => setActive(!document.hidden && Boolean(sectionRef.current?.getBoundingClientRect().bottom))
    document.addEventListener("visibilitychange", onVisibility)
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility) }
  }, [])
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => { touchController.current.active = true; touchController.current.lastX = event.touches[0]?.clientX ?? 0 }
  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => { if (!touchController.current.active) return; const x = event.touches[0]?.clientX ?? touchController.current.lastX; touchController.current.deltaX += x - touchController.current.lastX; touchController.current.lastX = x }
  const handleTouchEnd = () => { touchController.current.active = false; touchController.current.deltaX = 0 }
  return <div ref={sectionRef} className="nexus-particle-stage" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}><div className="particle-stage-label"><span className="live-dot" /> INTERACTIVE PARTICLE TOPOLOGY <small>{dispersed ? "DISPERSED" : "FORMED"}</small></div><Canvas camera={{ position: [0, 0, 10], fov: 42 }} dpr={dpr} gl={{ antialias: true, powerPreference: "high-performance" }}><LogoParticles dispersed={dispersed} active={active} scale={isMobile ? 0.65 : 1} touchController={touchController} /></Canvas><p>HOVER / DRAG TO ROTATE · SCROLL TO DISPERSE</p></div>
}
