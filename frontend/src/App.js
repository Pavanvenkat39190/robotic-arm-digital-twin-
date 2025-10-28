import React, { useState, useEffect } from 'react';
// --- NEW ---
import io from 'socket.io-client';
// --- END NEW ---
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ShieldCheck, Cpu, Bell, Wrench, Clock, AlertTriangle, Zap, Battery, Gauge, ChevronDown, ChevronUp, Box, Radio } from 'lucide-react';

// --- NEW ---
// Connect to the backend server
const backendUrl = 'https://industrial-robotic-arm-digital-twin.onrender.com'; // Your Render URL
const socket = io(backendUrl);
const API_URL = backendUrl;
// --- END NEW ---


// --- REMOVED ---
// The generateData() function is removed. Server handles this.
// --- END REMOVED ---

// --- REMOVED ---
// The calculateHealth() function is removed. Server handles this.
// --- END REMOVED ---

function HealthDial({ health }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (health / 100) * circumference;
  let color = health <= 40 ? "#ef4444" : health <= 80 ? "#f59e0b" : "#10b981";

  return (
    <div style={{ display: "inline-block", margin: "1rem" }}>
      <svg width={140} height={140}>
        <circle cx="70" cy="70" r={radius} stroke="#e5e7eb" strokeWidth="10" fill="none" />
        <circle cx="70" cy="70" r={radius} stroke={color} strokeWidth="12" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "all 0.5s", transform: "rotate(-90deg)", transformOrigin: "center" }} />
        <text x="50%" y="50%" textAnchor="middle" dy="0.3em" fontSize="2rem" fill={color}>
          {health.toFixed(1)}%
        </text>
      </svg>
      <div style={{ marginTop: "0.5rem", color: "#374151", fontWeight: 500 }}>System Health</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, unit, color }) {
  return (
    <div style={{ background: "white", borderRadius: "12px", padding: "1rem", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.5rem" }}>
        <Icon size={18} color={color} />
        <span style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
        {value} <span style={{ fontSize: "0.9rem", color: "#6b7280", fontWeight: 400 }}>{unit}</span>
      </div>
    </div>
  );
}

function FaultBadge({ status }) {
  const colors = {
    OK: { bg: "#d1fae5", text: "#065f46", border: "#10b981" },
    Warning: { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" },
    Critical: { bg: "#fee2e2", text: "#991b1b", border: "#ef4444" }
  };
  const c = colors[status] || colors.OK;
  return (
    <span style={{ background: c.bg, color: c.text, border: `2px solid ${c.border}`, 
      padding: "0.25rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600 }}>
      {status}
    </span>
  );
}

export default function App() {
  const [data, setData] = useState([]);
  const [health, setHealth] = useState(100);
  const [alert, setAlert] = useState(null);
  const [isShutdown, setIsShutdown] = useState(false);
  const [maintenanceLog, setMaintenanceLog] = useState([]);
  const [notificationSent, setNotificationSent] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [inferenceLatency, setInferenceLatency] = useState(45); // Can still be simulated frontend
  const [mttf, setMttf] = useState(720);
  const [expandedSections, setExpandedSections] = useState({ faults: true });
  const [faults, setFaults] = useState({
    overheating: 'OK',
    torqueImbalance: 'OK',
    encoderLoss: 'OK',
    powerFluctuation: 'OK',
    gripperMalfunction: 'OK',
    commDelay: 'OK'
  });

  // --- NEW ---
  // This function sends a request to the backend to add a log
  const addLog = async (severity, message) => {
    try {
      await fetch(`${API_URL}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ severity, message }),
      });
      // The server will broadcast the 'logUpdate' event,
      // which is handled in the useEffect below.
    } catch (error) {
      console.error("Failed to add log:", error);
    }
  };
  // --- END NEW ---

  const sendNotif = () => {
    if (!notificationSent) {
      setNotificationSent(true);
      // This is a real (simulated) notification to the maintenance team
      addLog("INFO", "Notification sent to maintenance team.");
      setTimeout(() => setNotificationSent(false), 5000);
    }
  };

  // --- MODIFIED ---
  // This useEffect now handles all real-time data from the server
  useEffect(() => {
    
    function onConnect() {
      console.log('Connected to server');
    }

    function onDisconnect() {
      console.log('Disconnected from server');
    }

    // Load initial state from server
    function onInitialData(payload) {
      setData(payload.data);
      setHealth(payload.health);
      setFaults(payload.faults);
      setMaintenanceLog(payload.logs);
      setIsShutdown(payload.isShutdown);
    }

    // Handle a new data point from server
    function onNewData(newEntry) {
      if (isShutdown) return;
      // Simulate inference latency
      setInferenceLatency(35 + Math.random() * 30);
      
      setData(prevData => {
        const newData = [...prevData, newEntry];
        if (newData.length > 20) newData.shift();
        return newData;
      });
    }
    
    // Handle health updates from server
    function onHealthUpdate(newHealth) {
      if (isShutdown) return;
      setHealth(newHealth);
      setMttf(Math.max(24, Math.floor((newHealth / 100) * 1000)));

      // Set alerts based on new health
      if (newHealth < 10) {
        setAlert({ message: "🚨 CRITICAL - Below 10%!" });
      } else if (newHealth < 50) {
        setAlert({ message: "⚠️ WARNING - Below 50%" });
      } else if (newHealth < 80) {
        setAlert({ message: "⚠️ Maintenance recommended" });
      } else {
        setAlert({ message: "✅ All systems normal" });
      }
    }

    // Handle fault status updates from server
    function onFaultUpdate(newFaults) {
      setFaults(newFaults);
    }
    
    // Handle log updates from server
    function onLogUpdate(newLogs) {
      setMaintenanceLog(newLogs);
    }
    
    // Handle shutdown command from server
    function onShutdown(message) {
      setIsShutdown(true);
      setAlert({ message });
    }
    
    // Handle system reset from server
    function onSystemReset(payload) {
      setIsShutdown(false);
      setData(payload.data);
      setHealth(payload.health);
      setFaults(payload.faults);
      setAlert({ message: "✅ System restarted" });
    }

    // Register socket listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('initialData', onInitialData);
    socket.on('newData', onNewData);
    socket.on('healthUpdate', onHealthUpdate);
    socket.on('faultUpdate', onFaultUpdate);
    socket.on('logUpdate', onLogUpdate);
    socket.on('shutdown', onShutdown);
    socket.on('systemReset', onSystemReset);

    // Cleanup function
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('initialData', onInitialData);
      socket.off('newData', onNewData);
      socket.off('healthUpdate', onHealthUpdate);
      socket.off('faultUpdate', onFaultUpdate);
      socket.off('logUpdate', onLogUpdate);
      socket.off('shutdown', onShutdown);
      socket.off('systemReset', onSystemReset);
    };
  }, [isShutdown]); // Re-run if isShutdown changes (though server controls this now)
  // --- END MODIFIED ---

  // --- MODIFIED ---
  // These functions now EMIT events to the server
  // instead of changing local state directly.
  
  const toggleFault = (faultType) => {
    if (isShutdown) return;
    // Tell the server to toggle the fault
    socket.emit('toggleFault', faultType);
  };

  const restart = () => {
    // Tell the server to restart
    socket.emit('restartSystem');
  };

  const shutdown = () => {
    // Tell the server to shutdown
    socket.emit('shutdownSystem');
  };
  
  const clearLogs = async () => {
    try {
      await fetch(`${API_URL}/api/logs`, { method: 'DELETE' });
      // Server will broadcast 'logUpdate'
    } catch (error) {
      console.error("Failed to clear logs:", error);
    }
  };
  // --- END MODFIED ---

  const latest = data[data.length - 1] || {};
  const faultProbData = [
    { name: 'Motor', value: (100 - health) * 0.4 },
    { name: 'Joint', value: (100 - health) * 0.3 },
    { name: 'Power', value: (100 - health) * 0.2 },
    { name: 'Control', value: (100 - health) * 0.1 }
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#f9fafb", minHeight: "100vh", padding: "2rem" }}>
      <style>{`
        .chart-card { background: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 1rem; transition: transform 0.2s; }
        .chart-card:hover { transform: translateY(-4px); }
        .tab { padding: 0.75rem 1.5rem; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; font-weight: 600; }
        .tab:hover { background: #f3f4f6; }
        .tab-active { border-bottom-color: #2563eb; color: #2563eb; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .log-item { padding: 0.5rem 0; border-bottom: 1px solid #f3f4f6; }
      `}</style>

      <header style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <h1 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "2rem", margin: "0 0 0.5rem 0" }}>
          <ShieldCheck color="#2563eb" size={32} /> Industrial Robotic Arm Digital Twin
        </h1>
        <h2 style={{ color: "#6b7280", fontSize: "1rem", fontWeight: 400, margin: 0 }}>
          AI-Powered Predictive Maintenance System — Smart Digital Twin Pro
        </h2>
      </header>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {health > 0 && !isShutdown && <HealthDial health={health} />}

        {isShutdown && (
          <div style={{ margin: "1rem", padding: "2rem", background: "#1f2937", borderRadius: "16px", border: "3px solid #ef4444" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ef4444", marginBottom: "0.5rem" }}>SYSTEM OFFLINE</div>
            <div style={{ color: "#9ca3af", fontWeight: 500 }}>Health Depleted</div>
          </div>
        )}

        <div style={{ background: "white", padding: "1rem", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.5rem" }}>
            <Radio size={16} color="#10b981" />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>AI Inference</span>
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#10b981" }}>ACTIVE</div>
          <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>
            {inferenceLatency.toFixed(1)}ms
          </div>
        </div>

        <div style={{ background: "white", padding: "1rem", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.5rem" }}>
            <Clock size={16} color="#f59e0b" />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Predicted MTTF</span>
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f59e0b" }}>{mttf}h</div>
        </div>
      </div>

      {alert?.message && (
        <div style={{
          background: isShutdown ? "#7f1d1d" : alert.message.includes("✅") ? "#d1fae5" : "#fee2e2",
          color: isShutdown ? "white" : alert.message.includes("✅") ? "#065f46" : "#b91c1c",
          display: "inline-block", padding: "0.75rem 1rem", borderRadius: "10px", margin: "1rem 0",
          fontWeight: 500, border: isShutdown ? "2px solid #ef4444" : "none"
        }}>
          {alert.message}
        </div>
      )}

      {notificationSent && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          background: "#dbeafe", color: "#1e40af", padding: "0.5rem 1rem", borderRadius: "6px",
          margin: "1rem auto", maxWidth: "350px", fontSize: "0.9rem", fontWeight: 600
        }}>
          <Bell size={16} /> Notification Sent to Maintenance
        </div>
      )}

      <div style={{
        display: "flex", justifyContent: "center", gap: "0", background: "white",
        borderRadius: "12px 12px 0 0", marginTop: "2rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", flexWrap: "wrap"
      }}>
        {['overview', 'joints', 'ai', 'maintenance'].map(tab => (
          <div key={tab} className={`tab ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </div>
        ))}
      </div>

      <div style={{
        background: "white", padding: "2rem", borderRadius: "0 0 12px 12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: "2rem"
      }}>
        {activeTab === 'overview' && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <StatCard icon={Cpu} label="Motor Temp" value={latest.motor_temp?.toFixed(1) || '0'} unit="°C" color="#ef4444" />
              <StatCard icon={Zap} label="Power" value={latest.power?.toFixed(0) || '0'} unit="W" color="#8b5cf6" />
              <StatCard icon={Battery} label="Current" value={latest.current?.toFixed(1) || '0'} unit="A" color="#ec4899" />
              <StatCard icon={Gauge} label="RPM" value={latest.rpm?.toFixed(0) || '0'} unit="RPM" color="#06b6d4" />
              <StatCard icon={Box} label="Payload" value={latest.payload?.toFixed(1) || '0'} unit="kg" color="#10b981" />
              <StatCard icon={Clock} label="Cycle" value={latest.cycle_time?.toFixed(2) || '0'} unit="s" color="#f59e0b" />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem", cursor: "pointer" }}
                onClick={() => setExpandedSections(p => ({ ...p, faults: !p.faults }))}>
                <Wrench size={20} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>Fault Status Monitor</h3>
                {expandedSections.faults ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              {expandedSections.faults && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                  {Object.entries({
                    overheating: '🔥 Motor Overheating',
                    torqueImbalance: '⚡ Torque Imbalance',
                    encoderLoss: '📡 Encoder Signal',
                    powerFluctuation: '🔌 Power Fluctuation',
                    gripperMalfunction: '🤖 Gripper',
                    commDelay: '📶 Comm Delay'
                  }).map(([key, label]) => (
                    <div key={key} style={{
                      background: "#f9fafb", padding: "1rem", borderRadius: "8px",
                      display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{label}</span>
                      <button onClick={() => toggleFault(key)} disabled={isShutdown} style={{
                        background: "none", border: "none", cursor: isShutdown ? "not-allowed" : "pointer",
                        opacity: isShutdown ? 0.5 : 1
                      }}>
                        <FaultBadge status={faults[key]} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isShutdown && (
              <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <button onClick={restart} style={{
                  padding: "1rem 2rem", borderRadius: "8px", border: "none", fontWeight: 700,
                  fontSize: "1.1rem", cursor: "pointer", background: "#10b981", color: "white",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)", animation: "pulse 2s infinite"
                }}>
                   RESTART SYSTEM
                </button>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginTop: "2rem" }}>
              <div className="chart-card">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="motor_temp" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: "0.5rem", fontWeight: 500, fontSize: "0.9rem" }}>
                  Motor Temperature (°C)
                </div>
              </div>

              <div className="chart-card">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="power" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: "0.5rem", fontWeight: 500, fontSize: "0.9rem" }}>
                  Power Consumption (W)
                </div>
              </div>

              <div className="chart-card">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="rpm" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: "0.5rem", fontWeight: 500, fontSize: "0.9rem" }}>
                  Motor RPM
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'joints' && (
          <>
            <h3 style={{ marginTop: 0, marginBottom: "1.5rem" }}>6-Axis Joint Data with Live Animation</h3>
            {/* The SVG animation will still work as it reads from 'latest' which is updated by the socket */}
            <div style={{ background: "#1f2937", borderRadius: "16px", padding: "2rem", marginBottom: "2rem", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
              <svg width="600" height="380" viewBox="0 0 600 380">
                <defs>
                  <linearGradient id="armGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1e40af" />
                  </linearGradient>
                </defs>
                <g transform="translate(300, 350)">
                  <circle cx="0" cy="0" r="25" fill="#6b7280" stroke="#374151" strokeWidth="3" />
                  <text x="0" y="5" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">BASE</text>
                  <g transform={`rotate(${(latest.j1_angle || 0) - 45})`}>
                    <rect x="-15" y="-120" width="30" height="120" fill="url(#armGradient)" stroke="#1e40af" strokeWidth="2" rx="8" />
                    <circle cx="0" cy="-120" r="18" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
                    <text x="0" y="-115" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">J1</text>
                    <g transform={`translate(0, -120) rotate(${(latest.j2_angle || 0) - 60})`}>
                      <rect x="-12" y="-100" width="24" height="100" fill="url(#armGradient)" stroke="#1e40af" strokeWidth="2" rx="6" />
                      <circle cx="0" cy="-100" r="15" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
                      <text x="0" y="-96" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">J2</text>
                      <g transform={`translate(0, -100) rotate(${(latest.j3_angle || 0) - 30})`}>
                        <rect x="-10" y="-80" width="20" height="80" fill="url(#armGradient)" stroke="#1e40af" strokeWidth="2" rx="5" />
                        <circle cx="0" cy="-80" r="12" fill="#10b981" stroke="#059669" strokeWidth="2" />
                        <text x="0" y="-76" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">J3</text>
                        <g transform={`translate(0, -80) rotate(${(latest.j4_angle || 0) - 90})`}>
                          <rect x="-8" y="-60" width="16" height="60" fill="#8b5cf6" stroke="#6d28d9" strokeWidth="2" rx="4" />
                          <circle cx="0" cy="-60" r="10" fill="#a78bfa" stroke="#6d28d9" strokeWidth="2" />
                          <text x="0" y="-56" textAnchor="middle" fill="white" fontSize="8" fontWeight="700">J4</text>
                          <g transform={`translate(0, -60) rotate(${(latest.j5_angle || 0) - 120})`}>
                            <rect x="-7" y="-50" width="14" height="50" fill="#06b6d4" stroke="#0ea5b7" strokeWidth="2" rx="4" />
                            <circle cx="0" cy="-50" r="9" fill="#06b6d4" stroke="#0ea5b7" />
                            <text x="0" y="-46" textAnchor="middle" fill="white" fontSize="7" fontWeight="700">J5</text>
                            <g transform={`translate(0, -50) rotate(${(latest.j6_angle || 0) - 180})`}>
                              <rect x="-6" y="-40" width="12" height="40" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" rx="3" />
                              <circle cx="0" cy="-40" r="8" fill="#ef4444" stroke="#b91c1c" />
                              <text x="0" y="-36" textAnchor="middle" fill="white" fontSize="7" fontWeight="700">J6</text>
                              <g transform="translate(0,-40)">
                                <rect x="-18" y="-24" width="36" height="24" rx="6" fill="#111827" />
                                <text x="0" y="-8" textAnchor="middle" fill="#fff" fontSize="8">EE</text>
                              </g>
                            </g>
                          </g>
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </svg>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <div className="chart-card">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="j1_angle" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="j2_angle" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: "0.5rem", fontWeight: 500 }}>Joint Angles J1/J2</div>
              </div>
              <div className="chart-card">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="j3_angle" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="j4_angle" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: "0.5rem", fontWeight: 500 }}>Joint Angles J3/J4</div>
              </div>
              <div className="chart-card">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="j5_angle" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="j6_angle" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: "0.5rem", fontWeight: 500 }}>Joint Angles J5/J6</div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'ai' && (
          <>
            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>AI Insights & Anomaly Detection</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
              <div className="chart-card">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={faultProbData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: "0.5rem", fontWeight: 500 }}>Fault Probability (Relative)</div>
              </div>

              <div className="chart-card">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 1]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="anomaly_score" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: "0.5rem", fontWeight: 500 }}>Anomaly Score (0-1)</div>
              </div>
            </div>

            <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
              <button onClick={() => { addLog('INFO', 'Ran simulated predictive model'); sendNotif(); }} style={{ padding: "0.6rem 1rem", borderRadius: "8px", border: "none", background: "#2563eb", color: "white", fontWeight: 700 }}>Run Prediction</button>
              <button onClick={() => { addLog('INFO', 'Exported AI Report (simulated)'); }} style={{ padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid #e5e7eb", background: "white" }}>Export Report</button>
            </div>
          </>
        )}

        {activeTab === 'maintenance' && (
          <>
            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Maintenance & Logs</h3>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <div style={{ background: "#f9fafb", padding: "1rem", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div style={{ fontWeight: 700 }}>Recent Maintenance Log</div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={clearLogs} style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "none", background: "#ef4444", color: "white" }}>Clear</button>
                    <button onClick={() => { const blob = new Blob([JSON.stringify(maintenanceLog, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'maintenance_log.json'; a.click(); URL.revokeObjectURL(url); addLog('INFO', 'Downloaded logs'); }} style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #e5e7eb", background: "white" }}>Download</button>
                  </div>
                </div>

                <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                  {maintenanceLog.length === 0 && <div style={{ color: '#6b7280' }}>No logs yet.</div>}
                  {maintenanceLog.map(item => (
                    <div key={item.id} className="log-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, color: item.severity === 'CRITICAL' ? '#b91c1c' : item.severity === 'HIGH' ? '#b45309' : '#111827' }}>{item.severity}</div>
                        <div style={{ color: '#6b7280' }}>{item.timestamp}</div>
                      </div>
                      <div style={{ color: '#111827' }}>{item.message}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "#f9fafb", padding: "1rem", borderRadius: "8px", display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontWeight: 700 }}>Quick Actions</div>
                <button onClick={restart} style={{ padding: "0.6rem 1rem", borderRadius: "8px", border: "none", background: "#10b981", color: 'white', fontWeight: 700 }}>Restart</button>
                <button onClick={shutdown} style={{ padding: "0.6rem 1rem", borderRadius: "8px", border: "none", background: "#ef4444", color: 'white', fontWeight: 700 }}>Shutdown</button>
                <button onClick={() => { addLog('INFO', 'Performed maintenance: Greased joints'); socket.emit('toggleFault', 'torqueImbalance'); }} style={{ padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid #e5e7eb", background: "white" }}>Grease Joints</button>

                <div style={{ marginTop: 'auto' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>System Controls</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={sendNotif} style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white' }}>Ping Team</button>
                    <button onClick={() => { addLog('INFO', 'Performed diagnostics'); }} style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white' }}>Diagnostics</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}