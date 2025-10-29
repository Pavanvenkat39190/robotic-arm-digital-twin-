import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ShieldCheck, Cpu, Bell, Wrench, Clock, AlertTriangle, Zap, Battery, Gauge, ChevronDown, ChevronUp, Box, Radio, Sun, Moon } from 'lucide-react';
// Import 3D libraries directly here
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Cylinder, Sphere, Box as DreiBox } from '@react-three/drei'; // Renamed Box to DreiBox
import * as THREE from 'three';

// --- Connect to the backend server ---
const backendUrl = 'https://industrial-robotic-arm-digital-twin.onrender.com'; // Your Render URL
const socket = io(backendUrl);
const API_URL = backendUrl;
// --- END ---

// --- 3D Arm Component Code (Moved Inside App.js) ---

// Helper component for a single arm segment + joint
function ArmSegment({ position, rotation, length, radius, jointRadius, color, jointColor, children }) {
  // --- FIX: Add default value and ensure rotation is an array ---
  const validRotation = Array.isArray(rotation) ? rotation : [0, 0, 0]; // Default if prop is bad
  // --- END FIX ---

  // Rotation needs to be converted from degrees (backend) to radians (Three.js)
  // Apply rotation order YXZ (adjust if your model needs XYZ, etc.)
  const rotationRadians = new THREE.Euler(
    (validRotation[0] * Math.PI) / 180, // X rotation
    (validRotation[1] * Math.PI) / 180, // Y rotation
    (validRotation[2] * Math.PI) / 180, // Z rotation
    'YXZ' // Rotation order
  );

  return (
    <group position={position} rotation={rotationRadians}>
      {/* Joint */}
      <Sphere args={[jointRadius, 16, 16]} position={[0, 0, 0]}>
        <meshStandardMaterial color={jointColor || '#888888'} roughness={0.7} metalness={0.2} />
      </Sphere>
      {/* Arm Link */}
      {length > 0 && (
        <Cylinder args={[radius, radius, length, 16]} position={[0, length / 2, 0]}>
          <meshStandardMaterial color={color || '#555555'} roughness={0.8} metalness={0.1} />
        </Cylinder>
      )}
      {/* Nested children */}
      {children}
    </group>
  );
}

// Main 3D Arm Component
function RoboticArm3D({ jointData, isDarkMode }) {
  // Provide default values if jointData is empty initially
  const angles = {
    j1: jointData?.j1_angle ?? 0,
    j2: jointData?.j2_angle ?? 0,
    j3: jointData?.j3_angle ?? 0,
    j4: jointData?.j4_angle ?? 0,
    j5: jointData?.j5_angle ?? 0,
    j6: jointData?.j6_angle ?? 0,
  };

  // Define segment lengths and radii (adjust these for desired proportions)
  const segmentLength1 = 1.0; const segmentLength2 = 0.8; const segmentLength3 = 0.6;
  const segmentLength4 = 0.4; const segmentLength5 = 0.3; const segmentLength6 = 0.15;
  const radius = 0.08; const jointRadius = 0.12;

  return (
    <Canvas
        camera={{ position: [2.5, 2, 2.5], fov: 50 }}
        style={{ background: 'var(--color-bg-tertiary)', borderRadius: '16px', border: `1px solid var(--color-border)` }}
        shadows
    >
      {/* Lighting */}
      <ambientLight intensity={isDarkMode ? 0.4 : 0.7} />
      <directionalLight position={[5, 8, 5]} intensity={isDarkMode ? 0.8 : 1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-far={50} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
      <directionalLight position={[-5, -3, -2]} intensity={isDarkMode ? 0.3 : 0.5} />
      <hemisphereLight intensity={isDarkMode ? 0.2 : 0.4} groundColor={isDarkMode ? "#333" : "#aaa"} />
      {/* Controls */}
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      {/* Base */}
      <Cylinder args={[0.4, 0.4, 0.2, 32]} position={[0, 0.1, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={isDarkMode ? "#374151" : "#6b7280"} roughness={0.7} metalness={0.2} />
      </Cylinder>
      {/* Arm Segments */}
      <ArmSegment position={[0, 0.2, 0]} rotation={[0, angles.j1, 0]} length={segmentLength1} radius={radius} jointRadius={jointRadius} color={isDarkMode ? "#4b5563": "#6b7280"} jointColor={isDarkMode ? "#9ca3af": "#cbd5e1"}>
        <ArmSegment position={[0, segmentLength1, 0]} rotation={[0, 0, angles.j2]} length={segmentLength2} radius={radius * 0.9} jointRadius={jointRadius * 0.9} color="#3b82f6" jointColor={isDarkMode ? "#9ca3af": "#cbd5e1"}>
          <ArmSegment position={[0, segmentLength2, 0]} rotation={[0, 0, angles.j3]} length={segmentLength3} radius={radius * 0.8} jointRadius={jointRadius * 0.8} color="#10b981" jointColor={isDarkMode ? "#9ca3af": "#cbd5e1"}>
            <ArmSegment position={[0, segmentLength3, 0]} rotation={[0, angles.j4, 0]} length={segmentLength4} radius={radius * 0.7} jointRadius={jointRadius * 0.7} color="#f59e0b" jointColor={isDarkMode ? "#9ca3af": "#cbd5e1"}>
              <ArmSegment position={[0, segmentLength4, 0]} rotation={[0, 0, angles.j5]} length={segmentLength5} radius={radius * 0.6} jointRadius={jointRadius * 0.6} color="#ef4444" jointColor={isDarkMode ? "#9ca3af": "#cbd5e1"}>
                <ArmSegment position={[0, segmentLength5, 0]} rotation={[0, angles.j6, 0]} length={segmentLength6} radius={radius * 0.5} jointRadius={jointRadius * 0.5} color={isDarkMode ? "#4b5563": "#6b7280"} jointColor={isDarkMode ? "#9ca3af": "#cbd5e1"}>
                  {/* End Effector */}
                  <group position={[0, segmentLength6 + 0.05, 0]}>
                    <DreiBox args={[0.12, 0.08, 0.12]} position={[0, 0, 0]} castShadow>
                       <meshStandardMaterial color={isDarkMode ? "#9ca3af" : "#4b5563"} roughness={0.8}/>
                    </DreiBox>
                     <DreiBox args={[0.03, 0.12, 0.03]} position={[-0.045, -0.06, 0]} castShadow>
                       <meshStandardMaterial color={isDarkMode ? "#e5e7eb" : "#d1d5db"} metalness={0.8} roughness={0.3}/>
                     </DreiBox>
                      <DreiBox args={[0.03, 0.12, 0.03]} position={[0.045, -0.06, 0]} castShadow>
                       <meshStandardMaterial color={isDarkMode ? "#e5e7eb" : "#d1d5db"} metalness={0.8} roughness={0.3}/>
                     </DreiBox>
                  </group>
                </ArmSegment>
              </ArmSegment>
            </ArmSegment>
          </ArmSegment>
        </ArmSegment>
      </ArmSegment>
      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color={isDarkMode ? "#111827" : "#d1d5db"} roughness={0.9} />
      </mesh>
    </Canvas>
  );
}
// --- END 3D Arm Component Code ---


// --- Helper Components ---
function HealthDial({ health }) { /* ... Same as before ... */ }
function StatCard({ icon: Icon, label, value, unit, color }) { /* ... Same as before ... */ }
function FaultBadge({ status }) { /* ... Same as before ... */ }
// --- End Helper Components ---

// --- Main App Component ---
export default function App() {
  const [data, setData] = useState([]);
  const [health, setHealth] = useState(100);
  const [alert, setAlert] = useState({ message: "Connecting..." });
  const [isShutdown, setIsShutdown] = useState(false);
  const [maintenanceLog, setMaintenanceLog] = useState([]);
  const [notificationSent, setNotificationSent] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [inferenceLatency, setInferenceLatency] = useState(45);
  const [mttf, setMttf] = useState(720);
  const [expandedSections, setExpandedSections] = useState({ faults: true });
  const [faults, setFaults] = useState({
    overheating: 'OK', torqueImbalance: 'OK', encoderLoss: 'OK',
    powerFluctuation: 'OK', gripperMalfunction: 'OK', commDelay: 'OK'
  });

  const [isDarkMode, setIsDarkMode] = useState(() => { /* ... Same as before ... */ });
  useEffect(() => { /* ... Same as before ... */ }, [isDarkMode]);
  const toggleTheme = () => { /* ... Same as before ... */ };

   useEffect(() => { /* ... Socket connection logic same as before ... */ }, [isShutdown]);

  const latest = data.length > 0 ? data[data.length - 1] : {};

    const addLog = async (severity, message) => { /* ... Same as before ... */ };
    const sendNotif = () => { /* ... Same as before ... */ };
    const toggleFault = (faultType) => { /* ... Same as before ... */ };
    const restart = () => { /* ... Same as before ... */ };
    const shutdown = () => { /* ... Same as before ... */ };
    const clearLogs = async () => { /* ... Same as before ... */ };

  const faultProbData = [ /* ... Same as before ... */ ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "var(--color-bg)", minHeight: "100vh", padding: "1rem", color: "var(--color-text-primary)" }}>
      {/* CSS Styles */}
      <style>{`
        /* CSS Variables */
        :root { --color-bg: #f9fafb; --color-bg-secondary: #ffffff; --color-bg-tertiary: #f3f4f6; --color-text-primary: #111827; --color-text-secondary: #4b5563; --color-text-muted: #9ca3af; --color-border: #e5e7eb; --color-primary: #2563eb; --color-primary-hover: #1d4ed8; --color-danger: #ef4444; --color-danger-bg: #fee2e2; --color-danger-text: #991b1b; --color-warning: #f59e0b; --color-warning-bg: #fef3c7; --color-warning-text: #92400e; --color-success: #10b981; --color-success-bg: #d1fae5; --color-success-text: #065f46; --color-info-bg: #dbeafe; --color-info-text: #1e40af; --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05); --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
        body.dark-mode { --color-bg: #111827; --color-bg-secondary: #1f2937; --color-bg-tertiary: #374151; --color-text-primary: #f9fafb; --color-text-secondary: #d1d5db; --color-text-muted: #6b7280; --color-border: #374151; --color-primary: #3b82f6; --color-primary-hover: #2563eb; --color-danger: #f87171; --color-danger-bg: #450a0a; --color-danger-text: #fecaca; --color-warning: #fbbf24; --color-warning-bg: #422006; --color-warning-text: #fef3c7; --color-success: #34d399; --color-success-bg: #064e3b; --color-success-text: #d1fae5; --color-info-bg: #1e3a8a; --color-info-text: #dbeafe; --shadow-sm: 0 1px 2px 0 rgb(255 255 255 / 0.05); --shadow-md: 0 4px 6px -1px rgb(255 255 255 / 0.1), 0 2px 4px -2px rgb(255 255 255 / 0.1); --shadow-lg: 0 10px 15px -3px rgb(255 255 255 / 0.1), 0 4px 6px -4px rgb(255 255 255 / 0.1); }
        body { margin: 0; background-color: var(--color-bg); transition: background-color 0.3s; }
        .stat-card { background: var(--color-bg-secondary); border-radius: 12px; padding: 1rem; box-shadow: var(--shadow-md); border: 1px solid var(--color-border); transition: background 0.3s, border-color 0.3s; }
        .chart-card { background: var(--color-bg-secondary); border-radius: 16px; box-shadow: var(--shadow-md); border: 1px solid var(--color-border); padding: 1rem; transition: transform 0.2s, background 0.3s, border-color 0.3s; }
        .chart-card:hover { transform: translateY(-4px); }
        .tab { padding: 0.75rem 1.5rem; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; font-weight: 600; color: var(--color-text-secondary); }
        .tab:hover { background: var(--color-bg-tertiary); color: var(--color-text-primary); }
        .tab-active { border-bottom-color: var(--color-primary); color: var(--color-primary); }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .log-item { padding: 0.75rem 0; border-bottom: 1px solid var(--color-border); font-size: 0.9rem; transition: border-color 0.3s; }
        .log-item:last-child { border-bottom: none; }
        button { cursor: pointer; transition: background-color 0.2s, color 0.2s, border-color 0.2s, opacity 0.2s; }
        button:disabled { cursor: not-allowed; opacity: 0.6; }
        .button-primary { padding: 0.6rem 1rem; border-radius: 8px; border: none; background: var(--color-primary); color: white; font-weight: 600; }
        .button-primary:hover:not(:disabled) { background: var(--color-primary-hover); }
        .button-secondary { padding: 0.6rem 1rem; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-bg-secondary); color: var(--color-text-primary); font-weight: 500; }
        .button-secondary:hover:not(:disabled) { background: var(--color-bg-tertiary); }
        .button-danger { padding: 0.6rem 1rem; border-radius: 8px; border: none; background: var(--color-danger); color: white; font-weight: 600; }
        .button-success { padding: 0.6rem 1rem; border-radius: 8px; border: none; background: var(--color-success); color: white; font-weight: 600; }
        .button-icon { background: none; border: none; padding: 0.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); }
        .button-icon:hover { background: var(--color-bg-tertiary); color: var(--color-text-primary); }
      `}</style>

      {/* Header */}
      <header style={{ marginBottom: "1.5rem", textAlign: "center", position: 'relative' }}>
         <h1 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "clamp(1.5rem, 4vw, 2rem)", margin: "0 0 0.5rem 0", color: "var(--color-text-primary)" }}>
            <ShieldCheck color="var(--color-primary)" size={32} /> Industrial Robotic Arm Digital Twin
        </h1>
        <h2 style={{ color: "var(--color-text-secondary)", fontSize: "clamp(0.9rem, 2vw, 1rem)", fontWeight: 400, margin: 0 }}>
          AI-Powered Predictive Maintenance System
        </h2>
        <button onClick={toggleTheme} className="button-icon" style={{ position: 'absolute', top: 0, right: 0 }} title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Main Status Section */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap", padding: "1rem", background: "var(--color-bg-secondary)", borderRadius: "16px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--color-border)" }}>
        {/* ... Status content ... */}
        {!isShutdown ? ( <HealthDial health={health} /> ) : ( <div style={{ margin: "1rem", padding: "2rem", background: "#1f2937", borderRadius: "16px", border: "3px solid var(--color-danger)", textAlign: "center" }}> <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div> <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-danger)", marginBottom: "0.5rem" }}>SYSTEM OFFLINE</div> <div style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>Health Depleted or Stopped</div> <button onClick={restart} className="button-success" style={{ marginTop: "1rem", fontSize: "1rem", animation: "pulse 2s infinite" }}>🔄 RESTART</button> </div> )}
        {!isShutdown && ( <> <div style={{ background: "var(--color-bg-tertiary)", padding: "1rem", borderRadius: "12px", boxShadow: "var(--shadow-sm)", border:"1px solid var(--color-border)", textAlign: "center" }}> <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "0.5rem" }}><Radio size={16} color="var(--color-success)" /> <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>AI Inference</span></div> <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-success)" }}>ACTIVE</div> <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{inferenceLatency.toFixed(1)}ms</div> </div> <div style={{ background: "var(--color-bg-tertiary)", padding: "1rem", borderRadius: "12px", boxShadow: "var(--shadow-sm)", border:"1px solid var(--color-border)", textAlign: "center" }}> <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "0.5rem" }}><Clock size={16} color="var(--color-warning)" /> <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Predicted MTTF</span></div> <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-warning)" }}>{mttf}h</div> </div> </> )}
      </div>

      {/* Alert & Notification Section */}
        <div style={{ textAlign: "center", margin: "1rem 0" }}>
            {/* ... Alert content ... */}
            {alert?.message && ( <div style={{ background: isShutdown ? "var(--color-danger-bg)" : alert.message.includes("✅") || alert.message.includes("Connecting") ? "var(--color-success-bg)" : alert.message.includes("Error") ? "var(--color-danger-bg)" : "var(--color-warning-bg)", color: isShutdown ? "var(--color-danger-text)" : alert.message.includes("✅") || alert.message.includes("Connecting") ? "var(--color-success-text)" : alert.message.includes("Error") ? "var(--color-danger-text)" : "var(--color-warning-text)", display: "inline-block", padding: "0.75rem 1.25rem", borderRadius: "10px", margin: "0.5rem 0", fontWeight: 500, border: isShutdown ? `2px solid var(--color-danger)` : `1px solid ${alert.message.includes("✅") || alert.message.includes("Connecting") ? 'var(--color-success)' : alert.message.includes("Error") ? 'var(--color-danger)' : 'var(--color-warning)'}`, boxShadow: "var(--shadow-sm)" }}> {alert.message} </div> )}
            {notificationSent && ( <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "var(--color-info-bg)", color: "var(--color-info-text)", padding: "0.5rem 1rem", borderRadius: "6px", margin: "0.5rem auto", maxWidth: "350px", fontSize: "0.9rem", fontWeight: 600, border: "1px solid var(--color-primary)" }}> <Bell size={16} /> Notification Sent </div> )}
      </div>

       {/* Tabs & Content */}
      {!isShutdown && (
         <>
            <div style={{ display: "flex", justifyContent: "center", gap: "0", background: "var(--color-bg-secondary)", borderRadius: "12px 12px 0 0", marginTop: "2rem", boxShadow: "var(--shadow-md)", flexWrap: "wrap", borderBottom: "1px solid var(--color-border)" }}>
                {['overview', 'joints', 'ai', 'maintenance'].map(tab => ( <div key={tab} className={`tab ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}> {tab.charAt(0).toUpperCase() + tab.slice(1)} </div> ))}
            </div>
            <div style={{ background: "var(--color-bg-secondary)", padding: "2rem", borderRadius: "0 0 12px 12px", boxShadow: "var(--shadow-md)", marginBottom: "2rem", border:"1px solid var(--color-border)", borderTop:"none" }}>

                {/* --- Overview Tab --- */}
                {activeTab === 'overview' && ( <>{/* ... Overview Content ... */}</> )}

                {/* --- Joints Tab --- */}
                {activeTab === 'joints' && (
                  <>
                    <h3 style={{ marginTop: 0, marginBottom: "1.5rem", color: "var(--color-text-primary)" }}>
                      6-Axis Joint Visualization & Data
                    </h3>
                    {/* --- Use 3D Component --- */}
                    <div style={{ height: '500px', width: '100%', marginBottom: '2rem', background: 'var(--color-bg)', borderRadius: '16px', border: '1px solid var(--color-border)', position: 'relative' }}>
                      {latest.time ? (
                        <RoboticArm3D jointData={latest} isDarkMode={isDarkMode} />
                      ) : (
                        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-text-secondary)'}}>Loading 3D Model...</div>
                      )}
                    </div>
                    {/* --- End 3D Component --- */}

                    {/* Joint Charts */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                       {/* ... Joint Charts ... */}
                       <div className="chart-card"> <h4 style={{textAlign: "center", margin: "0 0 1rem 0", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-text-secondary)"}}>Joint Angles J1/J2 (°)</h4> <ResponsiveContainer width="100%" height={180}> <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/> <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}/> <Line type="monotone" dataKey="j1_angle" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false}/> <Line type="monotone" dataKey="j2_angle" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false}/> </LineChart> </ResponsiveContainer> </div>
                       <div className="chart-card"> <h4 style={{textAlign: "center", margin: "0 0 1rem 0", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-text-secondary)"}}>Joint Angles J3/J4 (°)</h4> <ResponsiveContainer width="100%" height={180}> <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/> <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}/> <Line type="monotone" dataKey="j3_angle" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false}/> <Line type="monotone" dataKey="j4_angle" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false}/> </LineChart> </ResponsiveContainer> </div>
                       <div className="chart-card"> <h4 style={{textAlign: "center", margin: "0 0 1rem 0", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-text-secondary)"}}>Joint Angles J5/J6 (°)</h4> <ResponsiveContainer width="100%" height={180}> <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/> <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}/> <Line type="monotone" dataKey="j5_angle" stroke="#ec4899" strokeWidth={2} dot={false} isAnimationActive={false}/> <Line type="monotone" dataKey="j6_angle" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false}/> </LineChart> </ResponsiveContainer> </div>
                    </div>
                  </>
                )}

                {/* --- AI Tab --- */}
                {activeTab === 'ai' && ( <>{/* ... AI Content ... */}</> )}

                {/* --- Maintenance Tab --- */}
                {activeTab === 'maintenance' && ( <>{/* ... Maintenance Content ... */}</> )}

            </div>
         </>
       )}
    </div>
  );
}

// NOTE: Ensure the helper components (HealthDial, StatCard, FaultBadge)
// are either defined within App.js before the 'export default' line,
// or imported if they are in separate files.
// I've kept them outside for clarity in previous examples, but they need to be accessible.
// For simplicity in this combined file, defining them *before* App is fine.