import { useState, useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import styles from './App.module.css'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const BRANDS = ['Maruti', 'Hyundai', 'Mahindra', 'Tata', 'Honda', 'Toyota', 'Ford', 'Chevrolet', 'Renault', 'Volkswagen', 'BMW', 'Skoda', 'Nissan', 'Jaguar', 'Volvo', 'Datsun', 'Mercedes-Benz', 'Fiat', 'Audi', 'Lexus', 'Jeep', 'Mitsubishi', 'Land Rover', 'Force Motors', 'Isuzu', 'Ambassador', 'Kia', 'MG', 'Daewoo', 'Ashok Leyland', 'Opel']
const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'LPG']
const SELLER_TYPES = ['Individual', 'Dealer', 'Trustmark Dealer']
const TRANSMISSIONS = ['Manual', 'Automatic']
const OWNER_TYPES = ['First Owner', 'Second Owner', 'Third Owner', 'Fourth & Above Owner', 'Test Drive Car']

const DEFAULT_FORM = {
  brand: 'Maruti',
  year: 2018,
  km_driven: 45000,
  fuel: 'Petrol',
  seller_type: 'Individual',
  transmission: 'Manual',
  owner: 'First Owner',
  mileage: 18.5,
  engine: 1197,
  max_power: 82,
  seats: 5
}

function formatINR(num) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(num))
}

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target == null) { setValue(0); return }
    let startTime = null
    let raf
    const step = (ts) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

export default function App() {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sceneRef = useRef(null)
  const sceneObjRef = useRef(null)

  const animatedPrice = useCountUp(result?.predicted_price)

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handlePredict = useCallback(async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          year: Number(form.year),
          km_driven: Number(form.km_driven),
          mileage: Number(form.mileage),
          engine: Number(form.engine),
          max_power: Number(form.max_power),
          seats: Number(form.seats),
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || `Request failed (${res.status})`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message || 'Could not get a prediction. Please try again.')
    }
    setLoading(false)
  }, [form])

  // ── 3D Market Position Scene ──
  useEffect(() => {
    const canvas = sceneRef.current
    if (!canvas) return
    const wrap = canvas.parentElement

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setSize(wrap.offsetWidth, wrap.offsetHeight)
    renderer.setPixelRatio(window.devicePixelRatio)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, wrap.offsetWidth / wrap.offsetHeight, 0.1, 100)
    camera.position.set(3.2, 2.4, 3.6)
    camera.lookAt(0, 0, 0)

    const group = new THREE.Group()
    scene.add(group)

    // Axes (price=y, age=x, power=z)
    const axisMat = new THREE.LineBasicMaterial({ color: 0xd3d6e6 })
    const axisLength = 2.2
    ;[
      [[0, 0, 0], [axisLength, 0, 0]],
      [[0, 0, 0], [0, axisLength, 0]],
      [[0, 0, 0], [0, 0, axisLength]],
    ].forEach(([a, b]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)])
      group.add(new THREE.Line(geo, axisMat))
    })

    // Market cloud — simulated distribution of cars (age vs power vs price-normalized)
    const cloudGeo = new THREE.BufferGeometry()
    const N = 400
    const positions = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const age = Math.random()
      const power = Math.random()
      // price tends to decrease with age, increase with power, plus noise
      const price = Math.max(0, Math.min(1, (1 - age) * 0.5 + power * 0.5 + (Math.random() - 0.5) * 0.25))
      positions[i * 3] = age * axisLength
      positions[i * 3 + 1] = price * axisLength
      positions[i * 3 + 2] = power * axisLength
    }
    cloudGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const cloudMat = new THREE.PointsMaterial({ color: 0x4548c9, size: 0.045, transparent: true, opacity: 0.35 })
    const cloud = new THREE.Points(cloudGeo, cloudMat)
    group.add(cloud)

    // Highlight marker for "your car"
    const markerGeo = new THREE.SphereGeometry(0.09, 24, 24)
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xffb627 })
    const marker = new THREE.Mesh(markerGeo, markerMat)
    group.add(marker)

    // Glow ring around marker
    const ringGeo = new THREE.RingGeometry(0.13, 0.18, 32)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffb627, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    group.add(ring)

    group.rotation.x = -0.3
    group.rotation.y = 0.6

    sceneObjRef.current = { axisLength, marker, ring, group }

    let raf
    const animate = () => {
      raf = requestAnimationFrame(animate)
      group.rotation.y += 0.0022
      ring.rotation.z += 0.01
      const s = 1 + Math.sin(Date.now() * 0.002) * 0.08
      ring.scale.set(s, s, s)
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      renderer.setSize(wrap.offsetWidth, wrap.offsetHeight)
      camera.aspect = wrap.offsetWidth / wrap.offsetHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
    }
  }, [])

  // Update marker position when result changes
  useEffect(() => {
    if (!sceneObjRef.current || !result) return
    const { axisLength, marker, ring } = sceneObjRef.current

    const ageNorm = Math.min(Math.max((2024 - form.year) / 25, 0), 1)
    const powerNorm = Math.min(Math.max(form.max_power / 300, 0), 1)
    const priceNorm = Math.min(Math.max(result.predicted_price / 5000000, 0), 1)

    const x = ageNorm * axisLength
    const y = priceNorm * axisLength
    const z = powerNorm * axisLength

    marker.position.set(x, y, z)
    ring.position.set(x, y, z)
  }, [result, form.year, form.max_power])

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <div className={styles.logoMark}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12l2-5a2 2 0 0 1 2-1.5h10a2 2 0 0 1 2 1.5l2 5" />
                <path d="M3 12v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4" />
                <circle cx="7.5" cy="15" r="1" fill="currentColor" />
                <circle cx="16.5" cy="15" r="1" fill="currentColor" />
              </svg>
            </div>
            <span className={styles.logoText}>AutoValuate</span>
          </div>
          <span className={styles.headerTag}>Used car price estimator</span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Trained on 7,749 real listings · R² 0.96</p>
          <h1 className={styles.title}>
            What's your car<br />actually <span className={styles.titleAccent}>worth?</span>
          </h1>
          <p className={styles.subtitle}>
            Enter your car's details and get an instant, data-driven price estimate based on real second-hand market data.
          </p>
        </div>

        <div className={styles.grid}>
          {/* ── FORM ── */}
          <form className={styles.formCard} onSubmit={handlePredict}>
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Vehicle</h2>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Brand</label>
                  <select className={styles.select} value={form.brand} onChange={e => update('brand', e.target.value)}>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Year</label>
                  <input
                    type="number" className={styles.input} min="1990" max="2024"
                    value={form.year} onChange={e => update('year', e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Fuel type</label>
                  <select className={styles.select} value={form.fuel} onChange={e => update('fuel', e.target.value)}>
                    {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Transmission</label>
                  <select className={styles.select} value={form.transmission} onChange={e => update('transmission', e.target.value)}>
                    {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Specifications</h2>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Engine (CC)</label>
                  <input
                    type="number" className={styles.input} min="500" max="6000"
                    value={form.engine} onChange={e => update('engine', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Max power (BHP)</label>
                  <input
                    type="number" className={styles.input} min="20" max="500" step="0.1"
                    value={form.max_power} onChange={e => update('max_power', e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Mileage (km/l)</label>
                  <input
                    type="number" className={styles.input} min="0" max="50" step="0.1"
                    value={form.mileage} onChange={e => update('mileage', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Seats</label>
                  <input
                    type="number" className={styles.input} min="2" max="10"
                    value={form.seats} onChange={e => update('seats', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Condition & ownership</h2>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Kilometers driven</label>
                  <input
                    type="number" className={styles.input} min="0" max="500000" step="1000"
                    value={form.km_driven} onChange={e => update('km_driven', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Ownership</label>
                  <select className={styles.select} value={form.owner} onChange={e => update('owner', e.target.value)}>
                    {OWNER_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Seller type</label>
                <select className={styles.select} value={form.seller_type} onChange={e => update('seller_type', e.target.value)}>
                  {SELLER_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Calculating...' : 'Get price estimate'}
            </button>

            {error && <p className={styles.errorText}>{error}</p>}
          </form>

          {/* ── RESULT ── */}
          <div className={styles.resultCard}>
            {!result && !loading && (
              <div className={styles.resultEmpty}>
                <div className={styles.emptyIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                </div>
                <p className={styles.emptyTitle}>Your estimate will appear here</p>
                <p className={styles.emptySub}>Fill in your car's details and click "Get price estimate"</p>
              </div>
            )}

            {result && (
              <div className={styles.resultContent}>
                <p className={styles.resultLabel}>Estimated market value</p>
                <p className={styles.resultPrice}>₹{formatINR(animatedPrice)}</p>
                <div className={styles.resultRange}>
                  <span>₹{formatINR(result.price_range_low)}</span>
                  <div className={styles.rangeBar}>
                    <div className={styles.rangeFill} />
                    <div className={styles.rangeMarker} />
                  </div>
                  <span>₹{formatINR(result.price_range_high)}</span>
                </div>
                <p className={styles.resultCaption}>Estimated range based on model variance across 100 decision trees</p>
              </div>
            )}

            <div className={styles.vizSection}>
              <p className={styles.vizLabel}>Market position</p>
              <p className={styles.vizCaption}>Age · Price · Power — your car (amber) vs. the broader market</p>
              <div className={styles.canvasWrap}>
                <canvas ref={sceneRef} className={styles.canvas} />
              </div>
              <div className={styles.vizAxes}>
                <span>↗ Age</span>
                <span>↑ Price</span>
                <span>↘ Power</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Built by <a href="https://baysahtech.vercel.app" target="_blank" rel="noopener noreferrer">James Baysah</a> · Baytech · Random Forest model trained on CarDekho data</p>
      </footer>
    </div>
  )
}
