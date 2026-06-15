import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import styles from './HeroSection.module.css'

function CarScene() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const wrap = canvas.parentElement

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    const w = wrap.offsetWidth
    const h = wrap.offsetHeight
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio || 1)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 100)
    camera.position.set(1.2, 1.0, 6.8)
    camera.lookAt(0, 0, 0)

    // Warm key light + indigo rim accent
    const ambient = new THREE.AmbientLight(0x8a8478, 1.3)
    scene.add(ambient)
    const key = new THREE.DirectionalLight(0xfff2e0, 2.2)
    key.position.set(4, 6, 4)
    scene.add(key)
    const rimIndigo = new THREE.DirectionalLight(0x4548C9, 1.1)
    rimIndigo.position.set(-5, 1.5, -3)
    scene.add(rimIndigo)
    const fillWarm = new THREE.DirectionalLight(0xE8C9A0, 0.5)
    fillWarm.position.set(2, -1, 5)
    scene.add(fillWarm)

    // Concrete floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xb8b2a6, metalness: 0.05, roughness: 0.85 })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.62
    scene.add(floor)

    // Subtle floor grid lines (architectural pavement feel)
    const gridMat = new THREE.LineBasicMaterial({ color: 0x9a9488, transparent: true, opacity: 0.4 })
    for (let i = -10; i <= 10; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i * 0.8, -0.619, -15),
        new THREE.Vector3(i * 0.8, -0.619, 15)
      ])
      scene.add(new THREE.Line(geo, gridMat))
    }

    // Dark wall backdrop
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c1d22, metalness: 0.1, roughness: 0.9 })
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), wallMat)
    wall.position.set(0, 5, -6)
    scene.add(wall)

    // Materials
    const bodyColor = 0xC2152B
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.7, roughness: 0.18 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x141418, metalness: 0.75, roughness: 0.25 })
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: 0.7, roughness: 0.5 })
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd6d6d6, metalness: 0.95, roughness: 0.1 })
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.0 })
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xFF6B6B, emissive: 0xFF4D6D, emissiveIntensity: 1.0 })
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x444a5e, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.4, transmission: 0.4 })

    const car = new THREE.Group()
    scene.add(car)

    const shape = new THREE.Shape()
    shape.moveTo(-1.85, 0)
    shape.quadraticCurveTo(-1.97, 0, -1.97, 0.18)
    shape.lineTo(-1.97, 0.3)
    shape.quadraticCurveTo(-1.6, 0.55, -0.9, 0.6)
    shape.quadraticCurveTo(0.1, 0.7, 0.85, 0.6)
    shape.quadraticCurveTo(1.6, 0.5, 1.97, 0.26)
    shape.lineTo(1.97, 0.15)
    shape.quadraticCurveTo(1.97, 0, 1.85, 0)
    shape.lineTo(-1.85, 0)
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.4, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 })
    bodyGeo.center()
    bodyGeo.rotateY(Math.PI / 2)
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.set(0, -0.32, 0)
    car.add(body)

    const cabinGeo = new THREE.SphereGeometry(0.62, 28, 18, 0, Math.PI * 2, 0, Math.PI / 1.9)
    cabinGeo.scale(1.55, 0.85, 1.05)
    const cabin = new THREE.Mesh(cabinGeo, bodyMat)
    cabin.position.set(-0.1, 0.18, 0)
    car.add(cabin)

    const wsGeo = new THREE.SphereGeometry(0.585, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.2)
    wsGeo.scale(1.5, 0.8, 1.0)
    const ws = new THREE.Mesh(wsGeo, glassMat)
    ws.position.set(-0.1, 0.16, 0)
    car.add(ws)

    const hoodGeo = new THREE.BoxGeometry(1.15, 0.1, 1.5)
    hoodGeo.translate(0.5, 0, 0)
    const hood = new THREE.Mesh(hoodGeo, bodyMat)
    hood.position.set(1.0, -0.05, 0)
    hood.rotation.z = -0.06
    car.add(hood)

    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 1.5), bodyMat)
    trunk.position.set(-1.6, -0.08, 0)
    trunk.rotation.z = 0.04
    car.add(trunk)

    const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.5, 12), darkMat)
    lip.position.set(1.92, -0.32, 0)
    lip.rotation.z = Math.PI / 2
    car.add(lip)

    ;[1, -1].forEach(side => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 0.04), glassMat)
      sw.position.set(-0.1, 0.2, 0.68 * side)
      car.add(sw)
    })

    const wheels = []
    const wheelPositions = [[1.2, -0.62, 0.82], [1.2, -0.62, -0.82], [-1.2, -0.62, 0.82], [-1.2, -0.62, -0.82]]
    wheelPositions.forEach(pos => {
      const wheelGroup = new THREE.Group()
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.13, 14, 28), wheelMat)
      tire.rotation.y = Math.PI / 2
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 14), rimMat)
      rim.rotation.z = Math.PI / 2
      for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), rimMat)
        spoke.rotation.x = (i / 5) * Math.PI * 2
        wheelGroup.add(spoke)
      }
      wheelGroup.add(tire, rim)
      wheelGroup.position.set(...pos)
      car.add(wheelGroup)
      wheels.push(wheelGroup)
    })

    ;[0.55, -0.55].forEach(z => {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 14), headlightMat)
      hl.position.set(1.85, -0.05, z)
      car.add(hl)
    })

    ;[0.6, -0.6].forEach(z => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.32), tailMat)
      tl.position.set(-1.98, -0.05, z)
      car.add(tl)
    })

    ;[0.78, -0.78].forEach(z => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.2), darkMat)
      m.position.set(0.75, 0.32, z)
      car.add(m)
    })

    car.position.set(0.1, 0, 0)
    car.rotation.y = -0.45

    let startTime = performance.now()
    let raf
    const animate = (t) => {
      raf = requestAnimationFrame(animate)
      const elapsed = (t - startTime) / 1000

      const enter = Math.min(elapsed / 1.2, 1)
      const easedEnter = 1 - Math.pow(1 - enter, 3)
      car.scale.setScalar(0.92 + 0.08 * easedEnter)

      car.position.y = Math.sin(elapsed * (Math.PI * 2 / 6)) * 0.06

      const pulse = 0.85 + 0.3 * (0.5 + 0.5 * Math.sin(elapsed * 1.2))
      headlightMat.emissiveIntensity = pulse

      const wheelSpeed = elapsed < 2 ? Math.max(0, 8 - elapsed * 4) : 0.35
      wheels.forEach(wg => { wg.rotation.x += wheelSpeed * 0.05 })

      renderer.render(scene, camera)
    }
    animate(performance.now())

    const handleResize = () => {
      const nw = wrap.offsetWidth, nh = wrap.offsetHeight
      renderer.setSize(nw, nh)
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.carCanvas} />
}

export default function HeroSection({ onGetStarted }) {
  return (
    <section className={styles.hero}>
      <CarScene />
      <div className={styles.vignette} />
      <div className={styles.indigoGlow} />

      <div className={styles.overlay}>
        <p className={styles.eyebrow}>AI valuation engine</p>
        <h1 className={styles.headline}>
          What's your car<br />actually worth?
        </h1>
        <p className={styles.subtitle}>
          Enter your vehicle details and receive an instant, AI-powered market valuation using real sales data.
        </p>
        <button className={styles.ctaBtn} onClick={onGetStarted}>
          Discover your estimate
          <span className={styles.ctaCircle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </span>
        </button>
      </div>

      <div className={styles.featureStrip}>
        <div className={styles.featureItem}>
          <span className={styles.featureDot} />
          <div>
            <p className={styles.featureLabel}>Instant results</p>
            <p className={styles.featureSub}>Price estimate in seconds</p>
          </div>
        </div>
        <div className={styles.featureItem}>
          <span className={styles.featureDot} />
          <div>
            <p className={styles.featureLabel}>Accurate valuation</p>
            <p className={styles.featureSub}>Trained on 7,749 real listings</p>
          </div>
        </div>
        <div className={styles.featureItem}>
          <span className={styles.featureDot} />
          <div>
            <p className={styles.featureLabel}>Live market insights</p>
            <p className={styles.featureSub}>See where your car stands</p>
          </div>
        </div>
      </div>
    </section>
  )
}