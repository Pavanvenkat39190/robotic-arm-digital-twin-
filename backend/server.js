const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors()); // Allow requests from your React frontend
app.use(express.json()); // Allow server to read JSON bodies

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (for simplicity)
    methods: ["GET", "POST"]
  }
});

const PORT = 4000;

// --- STATE MANAGEMENT (Source of Truth) ---
let data = [];
let maintenanceLog = [];
let isShutdown = false;
let faults = {
  overheating: 'OK',
  torqueImbalance: 'OK',
  encoderLoss: 'OK',
  powerFluctuation: 'OK',
  gripperMalfunction: 'OK',
  commDelay: 'OK'
};
let health = 100;
let lifetimeHealth = 100; // --- NEW: Tracks gradual wear and tear ---

// --- HELPER FUNCTIONS (Moved from frontend) ---

function generateInitialData(count) {
  const initialData = [];
  const baseTime = Date.now() - count * 3000;
  for (let i = 0; i < count; i++) {
    initialData.push({
      time: new Date(baseTime + i * 3000).toLocaleTimeString(),
      j1_angle: 45 + Math.sin(i * 0.3) * 15,
      j2_angle: 60 + Math.cos(i * 0.4) * 20,
      j3_angle: 30 + Math.sin(i * 0.5) * 10,
      j4_angle: 90 + Math.sin(i * 0.35) * 12,
      j5_angle: 120 + Math.cos(i * 0.45) * 18,
      j6_angle: 180 + Math.sin(i * 0.55) * 14,
      j1_torque: 50 + Math.sin(i * 0.6) * 15,
      j2_torque: 45 + Math.cos(i * 0.5) * 12,
      j3_torque: 40 + Math.sin(i * 0.7) * 10,
      ee_x: 500 + Math.sin(i * 0.3) * 100,
      ee_y: 300 + Math.cos(i * 0.4) * 80,
      ee_z: 200 + Math.sin(i * 0.5) * 60,
      motor_temp: 65 + Math.sin(i * 0.2) * 10,
      power: 1500 + Math.sin(i * 0.4) * 300,
      current: 8.5 + Math.sin(i * 0.5) * 2,
      rpm: 1200 + Math.sin(i * 0.6) * 200,
      payload: 5.2 + Math.sin(i * 0.3) * 1.5,
      cycle_time: 2.5 + (Math.random() - 0.5) * 0.3,
      anomaly_score: 0.15 + Math.sin(i * 0.8) * 0.1,
    });
  }
  data = initialData;
  return initialData;
}

// --- RENAMED: This now calculates health based on *current state* ---
function calculateStateHealth(metrics, currentFaults) {
  let h = 100; // Start at 100 (a perfect *current state*)
  if (metrics.motor_temp > 75) h -= (metrics.motor_temp - 75) * 2;
  if (metrics.power > 2000) h -= (metrics.power - 2000) * 0.02;
  if (metrics.anomaly_score > 0.3) h -= (metrics.anomaly_score - 0.3) * 50;
  Object.values(currentFaults || {}).forEach(fault => {
    if (fault === 'Critical') h -= 15;
    else if (fault === 'Warning') h -= 5;
  });
  return Math.max(0, Math.min(100, h)); // Return the calculated *state* health
}

function addLog(severity, message) {
  const newLog = {
    id: Date.now(),
    timestamp: new Date().toLocaleString(),
    severity,
    message
  };
  maintenanceLog = [newLog, ...maintenanceLog].slice(0, 50);
  // Broadcast the updated logs to all clients
  io.emit('logUpdate', maintenanceLog);
}

// --- CORE SIMULATION LOOP ---
function runSimulation() {
  if (isShutdown) return;

  // --- NEW: Apply gradual wear and tear ---
  // This will slowly decrease health every 3 seconds, even if no faults
  lifetimeHealth -= 0.02; // You can adjust this "wear factor"
  lifetimeHealth = Math.max(0, lifetimeHealth); // Don't let it go below 0

  const last = data.length > 0 ? data[data.length - 1] : generateInitialData(1)[0];

  const newEntry = {
    time: new Date().toLocaleTimeString(),
    j1_angle: last.j1_angle + (Math.random() - 0.5) * 8,
    j2_angle: last.j2_angle + (Math.random() - 0.5) * 8,
    j3_angle: last.j3_angle + (Math.random() - 0.5) * 8,
    j4_angle: last.j4_angle + (Math.random() - 0.5) * 8,
    j5_angle: last.j5_angle + (Math.random() - 0.5) * 8,
    j6_angle: last.j6_angle + (Math.random() - 0.5) * 8,
    j1_torque: faults.torqueImbalance !== 'OK' ? last.j1_torque + Math.random() * 10 : last.j1_torque + (Math.random() - 0.5) * 5,
    j2_torque: last.j2_torque + (Math.random() - 0.5) * 5,
    j3_torque: last.j3_torque + (Math.random() - 0.5) * 5,
    ee_x: last.ee_x + (Math.random() - 0.5) * 20,
    ee_y: last.ee_y + (Math.random() - 0.5) * 20,
    ee_z: last.ee_z + (Math.random() - 0.5) * 20,
    motor_temp: faults.overheating !== 'OK' ? Math.min(95, last.motor_temp + Math.random() * 2) : 
      Math.max(50, Math.min(85, last.motor_temp + (Math.random() - 0.5) * 5)),
    power: faults.powerFluctuation !== 'OK' ? last.power + (Math.random() - 0.5) * 400 : 
      Math.max(1000, Math.min(2200, last.power + (Math.random() - 0.5) * 200)),
    current: Math.max(7, Math.min(11, last.current + (Math.random() - 0.5) * 0.8)),
    rpm: faults.encoderLoss !== 'OK' ? Math.max(0, last.rpm - Math.random() * 100) : 
      Math.max(800, Math.min(1500, last.rpm + (Math.random() - 0.5) * 150)),
    payload: faults.gripperMalfunction !== 'OK' ? Math.max(0, last.payload - Math.random() * 2) : 
      Math.max(3, Math.min(8, last.payload + (Math.random() - 0.5) * 0.5)),
    cycle_time: faults.commDelay !== 'OK' ? last.cycle_time + Math.random() * 0.5 : 
      Math.max(2, Math.min(3.5, last.cycle_time + (Math.random() - 0.5) * 0.3)),
    anomaly_score: Math.max(0, Math.min(1, last.anomaly_score + (Math.random() - 0.5) * 0.1)),
  };

  data.push(newEntry);
  if (data.length > 20) data.shift();

  // --- MODIFIED: Combine state health and lifetime health ---
  const stateHealth = calculateStateHealth(newEntry, faults);
  // The system's true health is the *worse* of its lifetime wear or its current state
  health = Math.min(lifetimeHealth, stateHealth);
  health = Math.max(0, Math.min(100, health)); // Clamp the final value
  
  if (health <= 0) {
    isShutdown = true;
    addLog("CRITICAL", "Emergency shutdown - Health depleted");
    io.emit('shutdown', "🚨 EMERGENCY SHUTDOWN");
    return;
  }
  
  // Broadcast the new combined data point to all connected clients
  io.emit('newData', newEntry);
  io.emit('healthUpdate', health);
}

// Start the simulation loop
generateInitialData(20);
const latestData = data[data.length - 1];
health = Math.min(lifetimeHealth, calculateStateHealth(latestData, faults));
setInterval(runSimulation, 3000);

// --- REST API ENDPOINTS ---
app.get('/api/logs', (req, res) => {
  res.json(maintenanceLog);
});

app.post('/api/logs', (req, res) => {
  const { severity, message } = req.body;
  if (severity && message) {
    addLog(severity, message);
    res.status(201).send();
  } else {
    res.status(400).send('Missing severity or message');
  }
});

app.delete('/api/logs', (req, res) => {
  maintenanceLog = [];
  addLog('INFO', 'Logs cleared');
  res.status(200).send();
});

// --- WEBSOCKET EVENT HANDLERS ---
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send the current state to the newly connected client
  socket.emit('initialData', {
    data: data,
    health: health,
    faults: faults,
    logs: maintenanceLog,
    isShutdown: isShutdown
  });

  // Handle client request to toggle a fault (for simulation)
  socket.on('toggleFault', (faultType) => {
    if (isShutdown) return;

    const current = faults[faultType];
    const next = current === 'OK' ? 'Warning' : current === 'Warning' ? 'Critical' : 'OK';
    faults[faultType] = next;
    
    if (next !== 'OK') {
      const faultNames = {
        overheating: 'Motor Overheating',
        torqueImbalance: 'Torque Imbalance',
        encoderLoss: 'Encoder Signal Loss',
        powerFluctuation: 'Power Fluctuation',
        gripperMalfunction: 'Gripper Malfunction',
        commDelay: 'Communication Delay'
      };
      addLog(next === 'Critical' ? 'CRITICAL' : 'HIGH', `${faultNames[faultType]} - ${next}`);
    }
    
    // Broadcast the new fault state to all clients
    io.emit('faultUpdate', faults);
  });
  
  // Handle client request to restart
  socket.on('restartSystem', () => {
    isShutdown = false;
    lifetimeHealth = 100; // --- NEW: Reset lifetime health on restart ---
    faults = {
      overheating: 'OK', torqueImbalance: 'OK', encoderLoss: 'OK',
      powerFluctuation: 'OK', gripperMalfunction: 'OK', commDelay: 'OK'
    };
    generateInitialData(20);
    
    // --- MODIFIED: Recalculate health on restart ---
    const stateHealth = calculateStateHealth(data[data.length - 1], faults);
    health = Math.min(lifetimeHealth, stateHealth); 
    
    addLog("INFO", "System restarted successfully");
    
    // Broadcast the full new state to all clients
    io.emit('systemReset', {
      data: data,
      health: health,
      faults: faults,
      isShutdown: false
    });
  });

  // Handle client request to shutdown
  socket.on('shutdownSystem', () => {
    isShutdown = true;
    addLog("INFO", "System manually shutdown");
    io.emit('shutdown', "⚠️ System manually shutdown");
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Digital Twin Server running on http://localhost:${PORT}`);
});