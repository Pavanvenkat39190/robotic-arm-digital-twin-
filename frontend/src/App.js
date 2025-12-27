import React, { useState, useEffect, useRef } from 'react'; // Keep useRef for Canvas
import io from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ShieldCheck, Cpu, Bell, Wrench, Clock, AlertTriangle, Zap, Battery, Gauge, ChevronDown, ChevronUp, Box, Radio, Sun, Moon } from 'lucide-react';

// --- Connect to the backend server ---
import API_BASE from "./config";
import io from "socket.io-client";

const socket = io(API_BASE);
const API_URL = API_BASE;

// --- END ---

// --- Canvas Drawing Helper Functions ---
const drawCylinder = (ctx, x, y, width, height, color, shadowColor, isHighlight, isDarkMode) => {
    const fillColor = isDarkMode ? shadowColor : color;
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, width, height);
    if (isHighlight) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
    }
     ctx.fillStyle = isDarkMode ? '#6b7280' : '#1e293b';
     for (let i = 0; i < 3; i++) {
       ctx.fillRect(x + width * 0.2, y + height * (0.25 + i * 0.25), width * 0.6, 2);
     }
};

const drawJoint = (ctx, x, y, radius, color, label, isHighlight, isDarkMode) => {
    const jointColor = isDarkMode ? '#6b7280' : color;
    ctx.fillStyle = jointColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

     if (isHighlight) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.fillStyle = isDarkMode ? '#e2e8f0' : '#111827';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + radius + 15);
};
// --- End Canvas Helpers ---


// --- Helper Components ---
function HealthDial({ health }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (health / 100) * circumference;
  let color = health <= 40 ? "var(--color-danger)" : health <= 80 ? "var(--color-warning)" : "var(--color-success)";

  return (
    <div style={{ display: "inline-block", margin: "1rem" }}>
      <svg width={140} height={140}>
        <circle cx="70" cy="70" r={radius} stroke="var(--color-border)" strokeWidth="10" fill="none" />
        <circle cx="70" cy="70" r={radius} stroke={color} strokeWidth="12" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s", transform: "rotate(-90deg)", transformOrigin: "center" }} />
        <text x="50%" y="50%" textAnchor="middle" dy="0.3em" fontSize="2rem" fill={color} style={{ transition: 'fill 0.5s' }}>
          {health.toFixed(1)}%
        </text>
      </svg>
      <div style={{ marginTop: "0.5rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>System Health</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, unit, color }) {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.5rem" }}>
        <Icon size={18} color={color || 'var(--color-text-secondary)'} />
        <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
        {value} <span style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", fontWeight: 400 }}>{unit}</span>
      </div>
    </div>
  );
}

function FaultBadge({ status }) {
  const colors = {
    OK: { bg: "var(--color-success-bg)", text: "var(--color-success-text)", border: "var(--color-success)" },
    Warning: { bg: "var(--color-warning-bg)", text: "var(--color-warning-text)", border: "var(--color-warning)" },
    Critical: { bg: "var(--color-danger-bg)", text: "var(--color-danger-text)", border: "var(--color-danger)" }
  };
  const c = colors[status] || colors.OK;
  return (
    <span style={{ background: c.bg, color: c.text, border: `2px solid ${c.border}`,
      padding: "0.25rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, transition: 'background 0.3s, color 0.3s, border-color 0.3s' }}>
      {status}
    </span>
  );
}
// --- End Helper Components ---


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

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  // Canvas related state and ref
  const canvasRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedJoint, setSelectedJoint] = useState(null);

  // Apply theme class
  useEffect(() => {
    if (isDarkMode) { document.body.classList.add('dark-mode'); }
    else { document.body.classList.remove('dark-mode'); }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Toggle theme
  const toggleTheme = () => { setIsDarkMode(prevMode => !prevMode); };

  // Socket connection
   useEffect(() => {
    function onConnect() { console.log('Connected:', socket.id); setAlert({ message: "✅ Connected" }); }
    function onDisconnect(reason) { console.log('Disconnected:', reason); setAlert({ message: "⚠️ Disconnected" }); }
    function onInitialData(payload) { console.log("Initial data:", payload); setData(payload.data || []); setHealth(payload.health || 100); setFaults(payload.faults || {}); setMaintenanceLog(payload.logs || []); setIsShutdown(payload.isShutdown || false); setAlert({ message: payload.isShutdown ? "⚠️ Offline" : "✅ Normal" }); }
    function onNewData(newEntry) { if (isShutdown) return; setInferenceLatency(35 + Math.random() * 30); setData(prev => [...prev, newEntry].slice(-20)); }
    function onHealthUpdate(newHealth) { if (isShutdown) return; setHealth(newHealth); setMttf(Math.max(24, Math.floor((newHealth / 100) * 1000))); if (newHealth <= 0) {} else if (newHealth < 10) { setAlert({ message: "🚨 CRITICAL <10%!" }); } else if (newHealth < 50) { setAlert({ message: "⚠️ WARNING <50%" }); } else if (newHealth < 80) { setAlert({ message: "⚠️ Maint. Recommended" }); } else if (!isShutdown) { setAlert({ message: "✅ Normal" }); } }
    function onFaultUpdate(newFaults) { setFaults(newFaults); }
    function onLogUpdate(newLogs) { setMaintenanceLog(newLogs); }
    function onShutdown(message) { setIsShutdown(true); setAlert({ message }); setData([]); }
    function onSystemReset(payload) { console.log("Reset:", payload); setIsShutdown(false); setData(payload.data || []); setHealth(payload.health || 100); setFaults(payload.faults || {}); setMaintenanceLog([]); setAlert({ message: "✅ Restarted" }); }
    function onConnectError(err) { console.error("Connect Error:", err); setAlert({ message: `⚠️ Connect Error` }); }

    socket.on('connect', onConnect); socket.on('disconnect', onDisconnect); socket.on('initialData', onInitialData);
    socket.on('newData', onNewData); socket.on('healthUpdate', onHealthUpdate); socket.on('faultUpdate', onFaultUpdate);
    socket.on('logUpdate', onLogUpdate); socket.on('shutdown', onShutdown); socket.on('systemReset', onSystemReset);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('initialData', onInitialData);
      socket.off('newData', onNewData); socket.off('healthUpdate', onHealthUpdate); socket.off('faultUpdate', onFaultUpdate);
      socket.off('logUpdate', onLogUpdate); socket.off('shutdown', onShutdown); socket.off('systemReset', onSystemReset);
      socket.off('connect_error', onConnectError);
    };
  }, [isShutdown]);

  // Get latest data point
   const latest = data.length > 0 ? data[data.length - 1] : {};

   // Canvas drawing useEffect
   useEffect(() => {
     const canvas = canvasRef.current;
     if (!canvas || !latest.time) return;

     const ctx = canvas.getContext('2d');
     const canvasWidth = canvas.width;
     const canvasHeight = canvas.height;
     const centerX = canvasWidth / 2;
     const centerY = canvasHeight / 2 + 100; // Adjusted Position

     ctx.clearRect(0, 0, canvasWidth, canvasHeight);
     ctx.strokeStyle = isDarkMode ? '#374151' : '#e5e7eb'; ctx.lineWidth = 0.5;
     for (let i = 0; i < canvasWidth; i += 30) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvasHeight); ctx.stroke(); }
     for (let i = 0; i < canvasHeight; i += 30) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvasWidth, i); ctx.stroke(); }

     ctx.fillStyle = isDarkMode ? '#4b5563' : '#6b7280'; ctx.beginPath(); ctx.arc(centerX, centerY, 40, 0, Math.PI * 2); ctx.fill();
     ctx.strokeStyle = isDarkMode ? '#1f2937' : '#374151'; ctx.lineWidth = 2; ctx.stroke();
     ctx.fillStyle = isDarkMode ? '#9ca3af' : '#cbd5e1';
      for (let i = 0; i < 6; i++) { const angle = (i / 6) * Math.PI * 2; const x = centerX + Math.cos(angle) * 30; const y = centerY + Math.sin(angle) * 30; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }

     ctx.save(); ctx.translate(centerX, centerY);
     // J1
     ctx.save(); ctx.rotate(((latest.j1_angle || 0) * Math.PI) / 180);
     drawCylinder(ctx, -15, -120, 30, 120, '#3b82f6', '#1e40af', selectedJoint === 1, isDarkMode);
     drawJoint(ctx, 0, 0, 20, '#94a3b8', 'J1', selectedJoint === 1, isDarkMode);
     // J2
     ctx.save(); ctx.translate(0, -120); ctx.rotate(((latest.j2_angle || 0) * Math.PI) / 180);
     drawCylinder(ctx, -12, -100, 24, 100, '#10b981', '#047857', selectedJoint === 2, isDarkMode);
     drawJoint(ctx, 0, 0, 18, '#94a3b8', 'J2', selectedJoint === 2, isDarkMode);
      // J3
      ctx.save(); ctx.translate(0, -100); ctx.rotate(((latest.j3_angle || 0) * Math.PI) / 180);
      drawCylinder(ctx, -10, -80, 20, 80, '#8b5cf6', '#6d28d9', selectedJoint === 3, isDarkMode);
      drawJoint(ctx, 0, 0, 16, '#94a3b8', 'J3', selectedJoint === 3, isDarkMode);
       // J4
       ctx.save(); ctx.translate(0, -80); ctx.rotate(((latest.j4_angle || 0) * Math.PI) / 180);
       drawCylinder(ctx, -8, -60, 16, 60, '#f59e0b', '#b45309', selectedJoint === 4, isDarkMode);
       drawJoint(ctx, 0, 0, 14, '#94a3b8', 'J4', selectedJoint === 4, isDarkMode);
        // J5
        ctx.save(); ctx.translate(0, -60); ctx.rotate(((latest.j5_angle || 0) * Math.PI) / 180);
        drawCylinder(ctx, -7, -50, 14, 50, '#ef4444', '#b91c1c', selectedJoint === 5, isDarkMode);
        drawJoint(ctx, 0, 0, 12, '#94a3b8', 'J5', selectedJoint === 5, isDarkMode);
         // J6 & EE
         ctx.save(); ctx.translate(0, -50); ctx.rotate(((latest.j6_angle || 0) * Math.PI) / 180);
         drawCylinder(ctx, -6, -40, 12, 40, '#6b7280', '#475569', selectedJoint === 6, isDarkMode);
         drawJoint(ctx, 0, 0, 10, '#94a3b8', 'J6', selectedJoint === 6, isDarkMode);
          ctx.translate(0, -40); ctx.fillStyle = isDarkMode ? '#cbd5e1' : '#374151'; ctx.fillRect(-10, -20, 20, 20);
          ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(-15, -35); ctx.stroke(); ctx.moveTo(10, -20); ctx.lineTo(15, -35); ctx.stroke();
         ctx.restore(); ctx.restore(); ctx.restore(); ctx.restore(); ctx.restore(); ctx.restore(); ctx.restore();
   }, [latest, selectedJoint, isDarkMode]);

  // Canvas Event Handlers
  const handleCanvasMouseDown = (e) => {
     const canvas = canvasRef.current; if(!canvas) return; const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; const centerX = canvas.width / 2; const centerY = canvas.height / 2 + 100;
     let clickedJoint = null;
     if (Math.sqrt((x - centerX)**2 + (y - centerY)**2) < 30) clickedJoint = 1; else if (y < centerY - 100 && y > centerY - 160) clickedJoint = 2; else if (y < centerY - 200 && y > centerY - 260) clickedJoint = 3; else if (y < centerY - 260 && y > centerY - 310) clickedJoint = 4; else if (y < centerY - 310 && y > centerY - 350) clickedJoint = 5; else if (y < centerY - 350) clickedJoint = 6;
     setSelectedJoint(clickedJoint); setIsDragging(false); console.log("Clicked near joint (visual only):", clickedJoint);
  };
  const handleCanvasMouseMove = (e) => { /* Dragging disabled */ };
  const handleCanvasMouseUp = () => { setIsDragging(false); };

  // Backend interaction functions
    const addLog = async (severity, message) => { try { await fetch(`${API_URL}/api/logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ severity, message }), }); } catch (error) { console.error("Failed addLog:", error); setAlert({ message: "⚠️ Err comm (addLog)" }); } };
    const sendNotif = () => { if (!notificationSent) { setNotificationSent(true); addLog("INFO", "Notification sent."); setTimeout(() => setNotificationSent(false), 5000); } };
    const toggleFault = (faultType) => { if (isShutdown) return; socket.emit('toggleFault', faultType); };
    const restart = () => { socket.emit('restartSystem'); };
    const shutdown = () => { socket.emit('shutdownSystem'); };
    const clearLogs = async () => { try { await fetch(`${API_URL}/api/logs`, { method: 'DELETE' }); } catch (error) { console.error("Failed clearLogs:", error); setAlert({ message: "⚠️ Err comm (clearLogs)" }); } };

  const faultProbData = [ { name: 'Motor', value: Math.max(0, (100 - health) * 0.4) }, { name: 'Joint', value: Math.max(0, (100 - health) * 0.3) }, { name: 'Power', value: Math.max(0, (100 - health) * 0.2) }, { name: 'Control', value: Math.max(0, (100 - health) * 0.1) } ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "var(--color-bg)", minHeight: "100vh", padding: "1rem", color: "var(--color-text-primary)" }}>
      {/* CSS Styles */}
      <style>{`
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
        {!isShutdown ? ( <HealthDial health={health} /> ) : ( <div style={{ margin: "1rem", padding: "2rem", background: "#1f2937", borderRadius: "16px", border: "3px solid var(--color-danger)", textAlign: "center" }}> <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div> <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-danger)", marginBottom: "0.5rem" }}>SYSTEM OFFLINE</div> <div style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>Health Depleted or Stopped</div> <button onClick={restart} className="button-success" style={{ marginTop: "1rem", fontSize: "1rem", animation: "pulse 2s infinite" }}>🔄 RESTART</button> </div> )}
        {!isShutdown && ( <> <div style={{ background: "var(--color-bg-tertiary)", padding: "1rem", borderRadius: "12px", boxShadow: "var(--shadow-sm)", border:"1px solid var(--color-border)", textAlign: "center" }}> <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "0.5rem" }}><Radio size={16} color="var(--color-success)" /> <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>AI Inference</span></div> <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-success)" }}>ACTIVE</div> <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{inferenceLatency.toFixed(1)}ms</div> </div> <div style={{ background: "var(--color-bg-tertiary)", padding: "1rem", borderRadius: "12px", boxShadow: "var(--shadow-sm)", border:"1px solid var(--color-border)", textAlign: "center" }}> <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "0.5rem" }}><Clock size={16} color="var(--color-warning)" /> <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Predicted MTTF</span></div> <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-warning)" }}>{mttf}h</div> </div> </> )}
      </div>

      {/* Alert & Notification Section */}
        <div style={{ textAlign: "center", margin: "1rem 0" }}>
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
                {activeTab === 'overview' && (
                    <>
                         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}> <StatCard icon={Cpu} label="Motor Temp" value={latest.motor_temp?.toFixed(1) || '--'} unit="°C" color="var(--color-danger)" /> <StatCard icon={Zap} label="Power" value={latest.power?.toFixed(0) || '--'} unit="W" color="#8b5cf6" /> <StatCard icon={Battery} label="Current" value={latest.current?.toFixed(1) || '--'} unit="A" color="#ec4899" /> <StatCard icon={Gauge} label="RPM" value={latest.rpm?.toFixed(0) || '--'} unit="RPM" color="#06b6d4" /> <StatCard icon={Box} label="Payload" value={latest.payload?.toFixed(1) || '--'} unit="kg" color="var(--color-success)" /> <StatCard icon={Clock} label="Cycle Time" value={latest.cycle_time?.toFixed(2) || '--'} unit="s" color="var(--color-warning)" /> </div>
                         <div style={{ marginBottom: "1.5rem", background:"var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "1rem" }}> <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", cursor: "pointer" }} onClick={() => setExpandedSections(p => ({ ...p, faults: !p.faults }))}> <div style={{ display: "flex", alignItems: "center", gap: "8px"}}> <Wrench size={20} color="var(--color-text-secondary)"/> <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text-primary)" }}>Fault Status Monitor</h3> </div> {expandedSections.faults ? <ChevronUp size={20} color="var(--color-text-secondary)"/> : <ChevronDown size={20} color="var(--color-text-secondary)"/>} </div> {expandedSections.faults && ( <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1rem" }}> {Object.entries({ overheating: '🔥 Overheating', torqueImbalance: '⚡ Torque Imbalance', encoderLoss: '📡 Encoder Signal', powerFluctuation: '🔌 Power Fluctuation', gripperMalfunction: '🤖 Gripper', commDelay: '📶 Comm Delay' }).map(([key, label]) => ( <div key={key} style={{ background: "var(--color-bg-secondary)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}> <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--color-text-primary)" }}>{label}</span> <button onClick={() => toggleFault(key)} disabled={isShutdown} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}> <FaultBadge status={faults[key] || 'OK'} /> </button> </div> ))} </div> )} </div>
                         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginTop: "2rem" }}> <div className="chart-card"> <h4 style={{textAlign: "center", margin: "0 0 1rem 0", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-text-secondary)"}}>Motor Temperature (°C)</h4> <ResponsiveContainer width="100%" height={200}> <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/> <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}/> <Line type="monotone" dataKey="motor_temp" stroke="var(--color-danger)" strokeWidth={2} dot={false} isAnimationActive={false}/> </LineChart> </ResponsiveContainer> </div> <div className="chart-card"> <h4 style={{textAlign: "center", margin: "0 0 1rem 0", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-text-secondary)"}}>Power Consumption (W)</h4> <ResponsiveContainer width="100%" height={200}> <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/> <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}/> <Line type="monotone" dataKey="power" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false}/> </LineChart> </ResponsiveContainer> </div> <div className="chart-card"> <h4 style={{textAlign: "center", margin: "0 0 1rem 0", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-text-secondary)"}}>Motor RPM</h4> <ResponsiveContainer width="100%" height={200}> <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/> <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}/> <Line type="monotone" dataKey="rpm" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false}/> </LineChart> </ResponsiveContainer> </div> </div>
                    </>
                )}

                {/* --- Joints Tab --- */}
                {activeTab === 'joints' && (
                  <>
                    <h3 style={{ marginTop: 0, marginBottom: "1.5rem", color: "var(--color-text-primary)" }}>
                      6-Axis Joint Visualization & Data
                    </h3>
                    {/* --- Canvas Visualization --- */}
                    <div style={{ background: isDarkMode ? "#0f172a" : "#1f2937", borderRadius: "16px", padding: "1rem", marginBottom: "2rem", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "400px", border: `1px solid var(--color-border)` }}>
                       <p style={{color: "var(--color-text-muted)", fontSize: "0.8rem", margin: "0 0 0.5rem 0"}}>Click near joints to highlight</p>
                       <canvas
                         ref={canvasRef}
                         width={400}
                         height={500}
                         style={{ width: "100%", maxWidth: "400px", background: "transparent", borderRadius: "8px", cursor: "pointer" }}
                         onMouseDown={handleCanvasMouseDown}
                         onMouseMove={handleCanvasMouseMove}
                         onMouseUp={handleCanvasMouseUp}
                         onMouseLeave={handleCanvasMouseUp}
                       />
                        <div style={{marginTop: "1rem", display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', width: '100%', maxWidth: '400px'}}>
                            {[1, 2, 3, 4, 5, 6].map(j => (
                                <button
                                key={j}
                                onClick={() => setSelectedJoint(selectedJoint === j ? null : j)}
                                style={{
                                    padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                                    background: selectedJoint === j ? 'var(--color-warning)' : 'var(--color-bg-tertiary)',
                                    color: selectedJoint === j ? 'var(--color-warning-text)' : 'var(--color-text-secondary)',
                                    border: `1px solid ${selectedJoint === j ? 'var(--color-warning)' : 'var(--color-border)'}`
                                }}
                                >
                                J{j}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Joint Charts */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                       <div className="chart-card"> <h4 style={{textAlign: "center", margin: "0 0 1rem 0", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-text-secondary)"}}>Joint Angles J1/J2 (°)</h4> <ResponsiveContainer width="100%" height={180}> <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/> <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}/> <Line type="monotone" dataKey="j1_angle" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false}/> <Line type="monotone" dataKey="j2_angle" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false}/> </LineChart> </ResponsiveContainer> </div>
                       <div className="chart-card"> <h4 style={{textAlign: "center", margin: "0 0 1rem 0", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-text-secondary)"}}>Joint Angles J3/J4 (°)</h4> <ResponsiveContainer width="100%" height={180}> <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/> <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}/> <Line type="monotone" dataKey="j3_angle" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false}/> <Line type="monotone" dataKey="j4_angle" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false}/> </LineChart> </ResponsiveContainer> </div>
                       <div className="chart-card"> <h4 style={{textAlign: "center", margin: "0 0 1rem 0", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-text-secondary)"}}>Joint Angles J5/J6 (°)</h4> <ResponsiveContainer width="100%" height={180}> <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/> <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}/> <Line type="monotone" dataKey="j5_angle" stroke="#ec4899" strokeWidth={2} dot={false} isAnimationActive={false}/> <Line type="monotone" dataKey="j6_angle" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false}/> </LineChart> </ResponsiveContainer> </div>
                    </div>
                  </>
                )}

                {/* --- AI Tab --- */}
                {activeTab === 'ai' && ( <> <h3 style={{ marginTop: 0, marginBottom: "1.5rem", color: "var(--color-text-primary)" }}>AI Insights & Anomaly Detection</h3> <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}> <div className="chart-card"> <h4 style={{textAlign: "center", margin: "0 0 1rem 0", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-text-secondary)"}}>Fault Probability (Relative %)</h4> <ResponsiveContainer width="100%" height={240}> <BarChart data={faultProbData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/> <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}/> <Bar dataKey="value" fill="#8884d8" isAnimationActive={false}/> </BarChart> </ResponsiveContainer> </div> <div className="chart-card"> <h4 style={{textAlign: "center", margin: "0 0 1rem 0", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-text-secondary)"}}>Anomaly Score (0-1)</h4> <ResponsiveContainer width="100%" height={240}> <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/> <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)"/> <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}/> <Line type="monotone" dataKey="anomaly_score" stroke="var(--color-danger)" strokeWidth={2} dot={false} isAnimationActive={false}/> </LineChart> </ResponsiveContainer> </div> </div> <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}> <button onClick={() => { addLog('INFO', 'Ran predictive model'); sendNotif(); }} className="button-primary">Run Prediction</button> <button onClick={() => { addLog('INFO', 'Exported AI Report'); }} className="button-secondary">Export Report</button> </div> </> )}

                {/* --- Maintenance Tab --- */}
                {activeTab === 'maintenance' && ( <> <h3 style={{ marginTop: 0, marginBottom: "1.5rem", color: "var(--color-text-primary)" }}>Maintenance & Logs</h3> <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}> <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--color-border)" }}> <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}> <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>Recent Maintenance Log</div> <div style={{ display: "flex", gap: "0.5rem" }}> <button onClick={clearLogs} title="Clear Logs" style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--color-danger)", background: "var(--color-danger-bg)", color: "var(--color-danger-text)", fontWeight: 500 }}>Clear</button> <button onClick={() => { const blob = new Blob([JSON.stringify(maintenanceLog, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'maintenance_log.json'; a.click(); URL.revokeObjectURL(url); addLog('INFO', 'Downloaded logs'); }} title="Download Logs" className="button-secondary" style={{padding: "0.4rem 0.6rem"}}>Download</button> </div> </div> <div style={{ maxHeight: "350px", overflowY: "auto", paddingRight: "0.5rem" }}> {maintenanceLog.length === 0 ? ( <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem 0' }}>No logs yet.</div> ) : ( maintenanceLog.map(item => ( <div key={item.id} className="log-item"> <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', alignItems: 'center' }}> <span style={{ fontWeight: 700, fontSize: '0.8rem', padding: '0.1rem 0.4rem', borderRadius: '4px', marginRight: '0.5rem', background: item.severity === 'CRITICAL' ? 'var(--color-danger-bg)' : item.severity === 'HIGH' ? 'var(--color-warning-bg)' : 'var(--color-bg-tertiary)', color: item.severity === 'CRITICAL' ? 'var(--color-danger-text)' : item.severity === 'HIGH' ? 'var(--color-warning-text)' : 'var(--color-text-secondary)' }}> {item.severity} </span> <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{item.timestamp}</span> </div> <div style={{ color: 'var(--color-text-primary)', wordBreak: 'break-word' }}>{item.message}</div> </div> )) )} </div> </div> <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--color-border)", display: 'flex', flexDirection: 'column', gap: '0.75rem' }}> <div style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "0.5rem" }}>Quick Actions</div> <button onClick={restart} disabled={isShutdown} className="button-success" style={{opacity: isShutdown ? 0.6 : 1}}>Restart System</button> <button onClick={shutdown} disabled={isShutdown} className="button-danger" style={{opacity: isShutdown ? 0.6 : 1}}>Manual Shutdown</button> <button onClick={() => { if(isShutdown) return; addLog('INFO', 'Sim: Greased joints'); socket.emit('toggleFault', 'torqueImbalance'); }} disabled={isShutdown} className="button-secondary" style={{opacity: isShutdown ? 0.6 : 1}}>Sim: Grease Joints</button> <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: `1px solid var(--color-border)` }}> <div style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: '0.5rem' }}>System Controls</div> <div style={{ display: 'flex', gap: '0.5rem' }}> <button onClick={() => { if(isShutdown) return; sendNotif()}} disabled={isShutdown} className="button-primary" style={{ padding: '0.45rem 0.8rem', opacity: isShutdown ? 0.6 : 1 }}>Ping Team</button> <button onClick={() => { if(isShutdown) return; addLog('INFO', 'Ran diagnostics'); }} disabled={isShutdown} className="button-secondary" style={{ padding: '0.45rem 0.8rem', opacity: isShutdown ? 0.6 : 1 }}>Diagnostics</button> </div> </div> </div> </div> </> )}
            </div>
         </>
       )}
    </div>
  );
}