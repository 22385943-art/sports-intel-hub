import React, { useMemo, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Text, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Target, Loader2 } from 'lucide-react';

interface Shot {
  x: number;
  y: number;
  made: boolean;
  zone: string;
}

interface ShotChartProps {
  shots: Shot[];
  teamAbbr?: string;
  themeColor?: string;
}

const LEAGUE_AVERAGES: Record<string, number> = {
  "Restricted Area": 66.0,
  "In The Paint (Non-RA)": 43.0,
  "Mid-Range": 41.5,
  "Left Corner 3": 39.0,
  "Right Corner 3": 39.0,
  "Above the Break 3": 35.5,
  "Backcourt": 5.0,
};

// 🚀 LA PISTA DE CRISTAL PROCEDURAL (No necesita descargas)
function ProceduralCourt({ themeColor }: { themeColor: string }) {
  return (
    <group position={[0, -0.5, 0]}>
      {/* Suelo Principal (Cristal oscuro) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial 
          color="#050914" 
          roughness={0.1} 
          metalness={0.8} 
        />
      </mesh>

      {/* Línea de Triple (Matemática) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 10]}>
        <ringGeometry args={[23.75, 24, 64, 1, 0, Math.PI]} />
        <meshBasicMaterial color="#ffffff" opacity={0.3} transparent side={THREE.DoubleSide} />
      </mesh>

      {/* Pintura Central (Glow del equipo) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 28]}>
        <planeGeometry args={[16, 19]} />
        <meshStandardMaterial color={themeColor} opacity={0.15} transparent />
      </mesh>
      
      {/* Líneas de la Pintura */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 28]}>
        <planeGeometry args={[16, 19]} />
        <meshBasicMaterial color="#ffffff" wireframe opacity={0.2} transparent />
      </mesh>

      {/* Sombras de contacto para hiper-realismo */}
      <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.5} far={10} color="#000000" />
    </group>
  );
}

// 🚀 LOS HEXÁGONOS DE DATOS
function ShotHexBin({ position, made, total, pct, diff, zone }: any) {
  const [hovered, setHovered] = useState(false);

  const getMaterialColor = () => {
    if (total < 3) return new THREE.Color("rgba(255,255,255,0.1)"); 
    if (diff >= 5) return new THREE.Color("#22c55e").multiplyScalar(1.5);
    if (diff >= 1) return new THREE.Color("#84cc16");
    if (diff > -2) return new THREE.Color("#eab308");
    if (diff > -6) return new THREE.Color("#0ea5e9");
    return new THREE.Color("#3b82f6");
  };

  const materialColor = getMaterialColor();
  const height = hovered ? 4 : Math.max(0.5, (total / 50) * 3); // Altura dinámica según volumen

  return (
    <group 
      position={position} 
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }} 
      onPointerOut={() => setHovered(false)}
    >
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <cylinderGeometry args={[2.5, 2.5, height, 6]} /> 
        <meshStandardMaterial 
          color={materialColor} 
          emissive={materialColor}
          emissiveIntensity={hovered ? 0.6 : 0.2}
          transparent
          opacity={total < 3 ? 0.2 : 0.9}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>

      {/* Tooltip inmersivo al pasar el ratón */}
      {hovered && total >= 3 && (
        <Html distanceFactor={15} position={[0, height + 2, 0]} center zIndexRange={[100, 0]}>
          <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl text-white font-sans w-48 text-center">
            <p className="font-black text-[9px] uppercase tracking-widest text-slate-400 mb-1">{zone}</p>
            <p className="text-2xl font-black font-mono leading-none">{made}<span className="text-lg text-slate-600">/{total}</span></p>
            <p className={`text-xs font-bold mt-1 ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {pct.toFixed(1)}%
            </p>
          </div>
        </Html>
      )}

      {/* Texto superior fijo */}
      {total >= 3 && (
        <Text
          position={[0, height + 0.1, 0]}
          rotation={[-Math.PI / 2, 0, 0]} 
          fontSize={1.5}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {`${pct.toFixed(0)}%`}
        </Text>
      )}
    </group>
  );
}

export default function ShotChart({ shots, teamAbbr, themeColor = "#3b82f6" }: ShotChartProps) {
  
  const zoneStats = useMemo(() => {
    const stats: Record<string, { made: number; total: number; pct: number; diff: number }> = {};
    Object.keys(LEAGUE_AVERAGES).forEach(z => { stats[z] = { made: 0, total: 0, pct: 0, diff: 0 }; });

    shots.forEach(s => {
      if (stats[s.zone]) {
        stats[s.zone].total++;
        if (s.made) stats[s.zone].made++;
      }
    });

    Object.keys(stats).forEach(z => {
      if (stats[z].total > 0) {
        stats[z].pct = (stats[z].made / stats[z].total) * 100;
        stats[z].diff = stats[z].pct - LEAGUE_AVERAGES[z];
      }
    });
    return stats;
  }, [shots]);

  // Mapeo adaptado para R3F
  const hexBins = [
    { zone: "Left Corner 3", pos: [22, 0, 30] },
    { zone: "Right Corner 3", pos: [-22, 0, 30] },
    { zone: "Restricted Area", pos: [0, 0, 35] },
    { zone: "In The Paint (Non-RA)", pos: [0, 0, 25] },
    { zone: "Mid-Range", pos: [0, 0, 15] },
    { zone: "Above the Break 3", pos: [0, 0, -5] },
  ];

  const totalMade = shots.filter(s => s.made).length;
  const totalShots = shots.length;

  return (
    <div className="bg-[#030712] border border-white/[0.06] rounded-[2.5rem] p-4 shadow-2xl relative w-full h-[600px] overflow-hidden">
      
      {/* OVERLAYS UI */}
      <div className="absolute top-6 left-6 flex items-center gap-3 z-20 p-4 bg-black/60 rounded-3xl backdrop-blur-md border border-white/10">
        <Target className="w-8 h-8 text-cyan-400" />
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Spatial Analytics</span>
          <p className="text-white text-2xl font-black font-mono leading-none mt-1">{totalMade}<span className="text-slate-600">/{totalShots}</span></p>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-20 text-center p-3 bg-black/60 rounded-2xl border border-white/5 backdrop-blur-sm pointer-events-none">
          <p className="text-[9px] font-bold text-slate-500">3D INTERACTIVE HUB</p>
          <p className="text-[11px] font-medium text-white mt-1">Left Click: Rotate • Scroll: Zoom</p>
      </div>

      {/* CANVAS 3D */}
      <Canvas shadows camera={{ position: [0, 40, 60], fov: 50 }}>
        <Suspense fallback={<Html center><Loader2 className="w-10 h-10 animate-spin text-cyan-500" /></Html>}>
          
          <ambientLight intensity={0.5} />
          <spotLight position={[0, 60, 20]} angle={0.5} penumbra={1} intensity={2} castShadow shadow-bias={-0.0001} />
          <pointLight position={[0, 20, 0]} intensity={1.5} color={themeColor} />

          {/* Pista Procedural de Cristal */}
          <ProceduralCourt themeColor={themeColor} />

          {/* Hexágonos */}
          {hexBins.map((bin, i) => (
            <ShotHexBin 
              key={i} 
              position={bin.pos} 
              made={zoneStats[bin.zone].made}
              total={zoneStats[bin.zone].total}
              pct={zoneStats[bin.zone].pct}
              diff={zoneStats[bin.zone].diff}
              zone={bin.zone}
            />
          ))}
          
          <Environment preset="city" />
          <OrbitControls 
            enablePan={false} 
            minPolarAngle={Math.PI / 6} 
            maxPolarAngle={Math.PI / 2.2} 
            minDistance={30}
            maxDistance={100}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}