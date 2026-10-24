"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import "./settings-panel.css"

// =======================================================
// --- CONSTANTES GLOBAIS (CORES E RITMOS) ---
// =======================================================

// --- Configuração de Cores (DARK GRAY THEME) ---
const PRIMARY_GRAY = '#E3262E';        // Cinza escuro para destaques
const DEEP_BLACK = '#050505';          // Preto mais profundo (fundo do título)
const PANEL_GRAY = '#0B0B0B';          // Fundo principal do painel (quase preto)
const TRACK_GRAY = '#2A0B0D';          // Trilhas de Fader (cinza mais escuro)
const HIGHLIGHT_WHITE = '#FFFFFF';     // Destaques Metálicos/Thumb (mantido)
const TEXT_COLOR = '#D6D6D6';          // Texto cinza claro (mais suave)

// --- MÓDULO: PULSOS ALEATÓRIOS CONTROLADOS ---
const PULSE_RHYTHMS = {
  "Techno (Frequente)": { base: 0.2, frequency: 0.15, decay: 0.9, amplitude: 0.8, chaos: false }, 
  "Hip-Hop (Esporádico)": { base: 0.1, frequency: 0.05, decay: 0.85, amplitude: 1.0, chaos: false }, 
  "Lo-Fi (Suave)": { base: 0.4, frequency: 0.02, decay: 0.95, amplitude: 0.5, chaos: false },
  "Rock (Explosivo)": { base: 0.05, frequency: 0.1, decay: 0.7, amplitude: 1.2, chaos: false },
  "Ambient (Original)": { base: 0.0, frequency: 0.0, decay: 0, chaos: true, amplitude: 1.0 }
};

type RhythmKey = keyof typeof PULSE_RHYTHMS;

// --- Definições de Tipos e Configurações ---

type CustomSettings = {
  useColorCycle: boolean; staticColor: string; colorTransitionSpeed: number;
  pulseAmplitude: number; lightRadiusMultiplier: number; lightConcentration: number;
  persistenceFactor: number; gridScaleFactor: number;
}

const DEFAULT_SETTINGS: CustomSettings = {
  useColorCycle: false, staticColor: PRIMARY_GRAY, colorTransitionSpeed: 64,
  pulseAmplitude: 1.0, 
  lightRadiusMultiplier: 0.875,
  lightConcentration: 0.03,
  persistenceFactor: 0.02,
  gridScaleFactor: 1.0,
}


// =======================================================
// --- COMPONENTES UI (AGORA ACESSANDO CONSTANTES) ---
// =======================================================

const VSTButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
    <button
        {...props}
        className="relative py-2 px-3 text-xs font-medium uppercase rounded-md transition-all hover:bg-opacity-90"
        style={{ 
            backgroundColor: TRACK_GRAY,
            color: '#FFFFFF',
            border: `1px solid ${TRACK_GRAY}`,
        }}
    >
        {children}
    </button>
);

interface FaderProps { label: string; value: number; min: number; max: number; step: number; displayValue: string; onChange: (value: number) => void; }

const VSTFader: React.FC<FaderProps> = ({ label, value, min, max, step, displayValue, onChange }) => {
    const percentage = ((value - min) / (max - min)) * 100;
    
    return (
        <div className="vst-fader-container">
            <div className="vst-fader-label">
                {label} ({displayValue})
            </div>
            <div className="vst-fader-track-area">
                <div className="vst-fader-track">
                    <div className="vst-fader-progress" style={{ width: `${percentage}%` }}></div>
                </div>
                <input 
                    type="range" 
                    min={min} 
                    max={max} 
                    step={step} 
                    value={value} 
                    onChange={(e) => onChange(parseFloat(e.target.value))} 
                    className="vst-fader-input"
                />
            </div>
        </div>
    );
}

interface WindowTitleBarProps { title: string; onMinimize: () => void; isMinimized: boolean; onMouseDown: (e: React.MouseEvent) => void; }

const WindowTitleBar: React.FC<WindowTitleBarProps> = ({ title, onMinimize, isMinimized, onMouseDown }) => {
    return (
        <div className="settings-panel-titlebar" onMouseDown={onMouseDown}>
            <span className="settings-panel-title">{title}</span>
            
            <button onClick={onMinimize} className="settings-panel-minimize-btn">
                {isMinimized ? (
                    <svg viewBox="0 0 16 16" fill="#505050" className="w-3 h-3">
                        <path d="M5 2H1v13h10v-4h4V5H9V1h-4zm7 4v7H2V3h3V2h7v3h-3v4z"/>
                    </svg>
                ) : (
                    <svg viewBox="0 0 20 20" fill="#505050" className="w-3 h-3">
                        <line x1="2" y1="18" x2="18" y2="18" stroke="#505050" strokeWidth="4" strokeLinecap="round"/>
                    </svg>
                )}
            </button>
        </div>
    );
};

const SettingsPanel: React.FC<{ settings: CustomSettings; setSettings: React.Dispatch<React.SetStateAction<CustomSettings>>; currentRhythm: RhythmKey; setCurrentRhythm: (rhythm: RhythmKey) => void; }> = ({ 
    settings, setSettings, currentRhythm, setCurrentRhythm
}) => {
    const updateSetting = (key: keyof CustomSettings, value: any) => { setSettings(prev => ({ ...prev, [key]: value })); }
    const [position, setPosition] = useState({ x: 20, y: 20 }); 
    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isMinimized, setIsMinimized] = useState(true);
    const panelRef = useRef<HTMLDivElement>(null);

    const handleMinimize = useCallback(() => { setIsMinimized(prev => !prev); }, []);
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true); setOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    }, [position]);
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        let newX = e.clientX - offset.x; let newY = e.clientY - offset.y;
        newX = Math.max(0, Math.min(newX, window.innerWidth - (panelRef.current?.offsetWidth || 0)));
        newY = Math.max(0, Math.min(newY, window.innerHeight - (panelRef.current?.offsetHeight || 0)));
        setPosition({ x: newX, y: newY });
    }, [isDragging, offset]);
    const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp);
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [handleMouseMove, handleMouseUp]);

    const rhythmOptions = (Object.keys(PULSE_RHYTHMS) as RhythmKey[]).filter(key => key !== "Ambient (Original)")
    
    const rhythmLabels: Record<string, string> = {
        "Techno (Frequente)": "R1",
        "Hip-Hop (Esporádico)": "R2",
        "Lo-Fi (Suave)": "R3",
        "Rock (Explosivo)": "R4"
    }

    return (
        <div 
            ref={panelRef} 
            className="settings-panel"
            style={{ 
                top: `${position.y}px`, 
                left: `${position.x}px`, 
            }}
        >
            <WindowTitleBar 
                title="Rhythm Controller" 
                onMinimize={handleMinimize} 
                isMinimized={isMinimized} 
                onMouseDown={(e) => { e.preventDefault(); handleMouseDown(e); }} 
            />
            
            {!isMinimized && (
                <div className="settings-panel-body">
                    
                    <div>
                        <h3 className="settings-section-header">Pulse Style</h3>
                        <div className="rhythm-buttons-grid">
                            {rhythmOptions.map((style) => {
                                const isActive = currentRhythm === style
                                return (
                                    <button
                                        key={style}
                                        onClick={() => setCurrentRhythm(style)}
                                        className={`rhythm-btn ${isActive ? 'active' : ''}`}
                                    >
                                        {rhythmLabels[style]}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div>
                        <h3 className="settings-section-header">Light Dynamics</h3>
                        
                        <VSTFader label="Pulse Amplitude" value={settings.pulseAmplitude} min={0.1} max={1.0} step={0.05} displayValue={settings.pulseAmplitude.toFixed(2)} onChange={(v) => updateSetting('pulseAmplitude', v)} />
                        <VSTFader label="Radius" value={settings.lightRadiusMultiplier} min={0.4} max={1.5} step={0.05} displayValue={settings.lightRadiusMultiplier.toFixed(2)} onChange={(v) => updateSetting('lightRadiusMultiplier', v)} />
                        <VSTFader label="Concentration" value={settings.lightConcentration} min={0.01} max={0.5} step={0.01} displayValue={settings.lightConcentration.toFixed(2)} onChange={(v) => updateSetting('lightConcentration', v)} />
                        <VSTFader label="Persistence" value={settings.persistenceFactor} min={0.005} max={0.1} step={0.005} displayValue={settings.persistenceFactor.toFixed(3)} onChange={(v) => updateSetting('persistenceFactor', v)} />
                        <VSTFader label="Color Speed" value={settings.colorTransitionSpeed} min={30} max={200} step={10} displayValue={`${settings.colorTransitionSpeed}`} onChange={(v) => updateSetting('colorTransitionSpeed', v)} />
                    </div>

                    <div>
                        <h3 className="settings-section-header">Grid & Color</h3>

                        <VSTFader label="Grid Density" value={settings.gridScaleFactor} min={0.5} max={1.5} step={0.1} displayValue={settings.gridScaleFactor.toFixed(2)} onChange={(v) => updateSetting('gridScaleFactor', v)} />

                        <div className="settings-divider">
                            <div className="flex items-center mb-2">
                                <input 
                                    id="color-cycle" 
                                    type="checkbox" 
                                    checked={settings.useColorCycle} 
                                    onChange={(e) => updateSetting('useColorCycle', e.target.checked)} 
                                    className="settings-checkbox"
                                />
                                <label htmlFor="color-cycle" className="settings-checkbox-label">
                                    Enable Color Cycle
                                </label>
                            </div>
                            
                            {!settings.useColorCycle && (
                                <div className="mt-2">
                                    <label className="settings-color-picker-label">
                                        Static Color
                                    </label>
                                    <input 
                                        type="color" 
                                        value={settings.staticColor} 
                                        onChange={(e) => updateSetting('staticColor', e.target.value)} 
                                        className="settings-color-picker"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="settings-action-buttons">
                        <button className="settings-action-btn" onClick={() => setSettings(DEFAULT_SETTINGS)}>Reset</button>
                        <button className="settings-action-btn">Apply</button>
                    </div>
                </div>
            )}
        </div>
    )
}

// =======================================================
// --- COMPONENTE PRINCIPAL (LÓGICA DO CANVAS) ---
// =======================================================

export default function PulsingHexagonBackground() {
  const [currentRhythm, setCurrentRhythm] = useState<RhythmKey>("Techno (Frequente)")
  const [settings, setSettings] = useState<CustomSettings>(DEFAULT_SETTINGS)
  
  const currentPulseIntensity = useRef(0.0);

  const canvasLightRef = useRef<HTMLCanvasElement>(null)
  const canvasGridRef = useRef<HTMLCanvasElement>(null)
  
  const rhythmRef = useRef(currentRhythm);
  const settingsRef = useRef(settings);
  
  useEffect(() => { rhythmRef.current = currentRhythm }, [currentRhythm]);
  useEffect(() => { settingsRef.current = settings }, [settings]);


  useEffect(() => {
    const canvasLight = canvasLightRef.current
    const canvasGrid = canvasGridRef.current

    if (!canvasLight || !canvasGrid) return

    const c = [canvasLight, canvasGrid]
    const n = c.length
    let w: number, h: number, _min: number
    const ctx: CanvasRenderingContext2D[] = []
    let grid: Grid
    let source: { x: number; y: number } | null = null
    let t = 0
    let request_id: number | null = null

    const { cos, sin, sqrt, PI, min, random } = Math

    // --- VARIÁVEIS DE GEOMETRIA (HEXÁGONO ORIGINAL RESTAURADO) ---
    const SCALE = settings.gridScaleFactor
    
    const HEX_CRAD = 32 * SCALE
    const HEX_BG = DEEP_BLACK
    const HEX_HL = PANEL_GRAY 
    const HEX_HLW = 2 * SCALE
    const HEX_GAP = 4 * SCALE
    
    const unit_x = 3 * HEX_CRAD + HEX_GAP * sqrt(3)
    const unit_y = HEX_CRAD * sqrt(3) * 0.5 + 0.5 * HEX_GAP
    const off_x = 1.5 * HEX_CRAD + HEX_GAP * sqrt(3) * 0.5

    const NEON_PALETE = ["#FF006E", "#8338EC", "#3A86FF", "#06FFA5", "#FFBE0B", "#FB5607"]
    const T_SWITCH = settings.colorTransitionSpeed

    const wp = NEON_PALETE.map((c) => {
      const num = Number.parseInt(c.replace("#", ""), 16)
      return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff, }
    })
    const nwp = wp.length
    let csi = 0
    const f = 1 / T_SWITCH

    // --- GRID CLASSES (HEXÁGONO ORIGINAL) ---
    
    class GridItem {
      x: number; y: number; points: { hex: Array<{ x: number; y: number }>; hl: Array<{ x: number; y: number }> }
      constructor(x?: number, y?: number) { this.x = x || 0; this.y = y || 0; this.points = { hex: [], hl: [] }; this.init() }
      init() {
        const ba = PI / 3; const ri = HEX_CRAD - 0.5 * HEX_HLW
        for (let i = 0; i < 6; i++) {
          const a = i * ba; const x = this.x + HEX_CRAD * cos(a); const y = this.y + HEX_CRAD * sin(a)
          this.points.hex.push({ x, y }); if (i > 2) {
            const hlx = this.x + ri * cos(a); const hly = this.y + ri * sin(a); this.points.hl.push({ x: hlx, y: hly })
          }
        }
      }
      draw(ct: CanvasRenderingContext2D) {
        for (let i = 0; i < 6; i++) {
          if (i === 0) { ct.moveTo(this.points.hex[i].x, this.points.hex[i].y) } else { ct.lineTo(this.points.hex[i].x, this.points.hex[i].y) }
        }
      }
      highlight(ct: CanvasRenderingContext2D) {
        for (let i = 0; i < 3; i++) {
          if (i === 0) { ct.moveTo(this.points.hl[i].x, this.points.hl[i].y) } else { ct.lineTo(this.points.hl[i].x, this.points.hl[i].y) }
        }
      }
    }

    class Grid {
      cols: number; rows: number; items: GridItem[]; n: number
      constructor(rows?: number, cols?: number) {
        this.cols = cols || 16; this.rows = rows || 16; this.items = []; this.n = 0; this.init()
      }
      init() {
        for (let row = 0; row < this.rows; row++) {
          const y = row * unit_y
          for (let col = 0; col < this.cols; col++) {
            const x = (row % 2 === 0 ? 0 : off_x) + col * unit_x
            this.items.push(new GridItem(x, y))
          }
        }
        this.n = this.items.length
      }

      draw(ct: CanvasRenderingContext2D) {
        ct.fillStyle = HEX_BG; ct.beginPath()
        for (let i = 0; i < this.n; i++) { this.items[i].draw(ct) }
        ct.closePath(); ct.fill()
        ct.strokeStyle = HEX_HL; ct.beginPath()
        for (let i = 0; i < this.n; i++) { this.items[i].highlight(ct) }
        ct.closePath(); ct.stroke()
      }
    }
    
    // --- Fim das Classes de Grid (Restauradas) ---

    const init = () => {
      const s = getComputedStyle(c[0])

      w = ~~s.width.split("px")[0]
      h = ~~s.height.split("px")[0]
      _min = 0.75 * min(w, h)

      const rows = ~~(h / unit_y) + 2
      const cols = ~~(w / unit_x) + 2

      for (let i = 0; i < n; i++) {
        c[i].width = w
        c[i].height = h
        const context = c[i].getContext("2d")
        if (context) ctx[i] = context
      }

      grid = new Grid(rows, cols)
      grid.draw(ctx[1]) 

      if (!source) {
        source = { x: ~~(w / 2), y: ~~(h / 2) }
      }

      neon()
    }

    const neon = () => {
      if (!source) return
      
      const currentSettings = settingsRef.current
      const rhythmConfig = PULSE_RHYTHMS[rhythmRef.current];

      // 1. LÓGICA DE PULSO ALEATÓRIO E DECAIMENTO
      
      let pulseValue;

      if (rhythmConfig.chaos) {
          // Pulso Caótico Original (Ambient)
          pulseValue = sin(7 * t * f) * cos(5 * t * f) * sin(3 * t * f);
      } else {
          // Pulso de Decaimento Aleatório (Sua Ideia dos Olhos)
          currentPulseIntensity.current *= rhythmConfig.decay; 

          if (random() < rhythmConfig.frequency && currentPulseIntensity.current < 0.2) {
              // Dispara um novo pulso forte (simulando uma batida)
              currentPulseIntensity.current = random() * rhythmConfig.amplitude; 
          }
          
          pulseValue = Math.min(1.0, currentPulseIntensity.current + rhythmConfig.base);
      }


      // 2. Lógica de Cor (Mantida)
      let rgb_str: string;
      if (!currentSettings.useColorCycle) {
          const k = (t % T_SWITCH) * f
          const rgb = {
            r: ~~(wp[csi].r * (1 - k) + wp[(csi + 1) % nwp].r * k),
            g: ~~(wp[csi].g * (1 - k) + wp[(csi + 1) % nwp].g * k),
            b: ~~(wp[csi].b * (1 - k) + wp[(csi + 1) % nwp].b * k),
          }
          rgb_str = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")"
      } else {
          rgb_str = currentSettings.staticColor
      }
      
      // 3. Aplica o pulso dinâmico (stp)
      const finalPulseAmplitude = pulseValue * currentSettings.pulseAmplitude; 
      const stp = 0.5 - 0.5 * finalPulseAmplitude;
      
      
      const customRadius = currentSettings.lightRadiusMultiplier * _min
      
      const light = ctx[0].createRadialGradient(
          source.x, source.y, 0, 
          source.x, source.y, customRadius
      )
      
      const concentrationString = `rgba(0,0,0,${currentSettings.lightConcentration.toFixed(2)})`

      light.addColorStop(0, rgb_str)
      light.addColorStop(stp, concentrationString) 

      const fadeOutString = `rgba(0,0,0,${currentSettings.persistenceFactor.toFixed(3)})`
      
      fillBackground(fadeOutString) 
      fillBackground(light) 

      t++

      if (!currentSettings.useColorCycle && t % T_SWITCH === 0) {
        csi++

        if (csi === nwp) {
          csi = 0
          t = 0
        }
      }

      request_id = requestAnimationFrame(neon)
    }

    const fillBackground = (bg_fill: string | CanvasGradient) => {
      ctx[0].fillStyle = bg_fill
      ctx[0].beginPath()
      ctx[0].rect(0, 0, w, h)
      ctx[0].closePath()
      ctx[0].fill()
    }

    const handleResize = () => {
      if (request_id) {
        cancelAnimationFrame(request_id)
      }
      init()
    }

    const handleMouseMove = (e: MouseEvent) => {
      source = { x: e.clientX, y: e.clientY }
    }

    init()

    window.addEventListener("resize", handleResize, false)
    window.addEventListener("mousemove", handleMouseMove, false)

    // Cleanup
    return () => {
      if (request_id) {
        cancelAnimationFrame(request_id)
      }
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [settings.gridScaleFactor]) 

  return (
    <div className="fixed inset-0 pointer-events-none select-none overflow-hidden" style={{ zIndex: 0, backgroundColor: "#080812" }} aria-hidden="true">
      {/* Canvas Elements */}
      <canvas ref={canvasLightRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />
      <canvas ref={canvasGridRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }} />
    </div>
  )
}
