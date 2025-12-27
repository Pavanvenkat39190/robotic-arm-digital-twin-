import React, { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ShieldCheck, Cpu, Bell, Wrench, Clock, Zap, Battery, Gauge, ChevronDown, ChevronUp, Box, Radio, Sun, Moon } from "lucide-react";

// ✅ CORRECT imports (ONLY ONCE)
import API_BASE from "./config";
import io from "socket.io-client";

// ✅ Socket + API
const socket = io(API_BASE);
const API_URL = API_BASE;

/* ---------------- Canvas Helpers ---------------- */

const drawCylinder = (ctx, x, y, w, h, c, sc, hl, dark) => {
  ctx.fillStyle = dark ? sc : c;
  ctx.fillRect(x, y, w, h);
  if (hl) {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  }
};

const drawJoint = (ctx, x, y, r, c, label, hl, dark) => {
  ctx.fillStyle = dark ? "#6b7280" : c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  if (hl) {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = dark ? "#e5e7eb" : "#111827";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + r + 15);
};

/* ---------------- MAIN APP ---------------- */

export default function App() {
  const [data, setData] = useState([]);
  const [health, setHealth] = useState(100);
  const [alert, setAlert] = useState({ message: "Connecting..." });
  const [isShutdown, setIsShutdown] = useState(false);
  const [maintenanceLog, setMaintenanceLog] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedJoint, setSelectedJoint] = useState(null);
  const canvasRef = useRef(null);

  /* ----------- Socket Events ----------- */
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected:", socket.id);
      setAlert({ message: "✅ Connected" });
    });

    socket.on("disconnect", () => {
      setAlert({ message: "⚠️ Disconnected" });
    });

    socket.on("initialData", (payload) => {
      setData(payload.data || []);
      setHealth(payload.health || 100);
      setMaintenanceLog(payload.logs || []);
      setIsShutdown(payload.isShutdown || false);
    });

    socket.on("newData", (entry) => {
      if (!isShutdown) {
        setData((p) => [...p, entry].slice(-20));
      }
    });

    socket.on("healthUpdate", (h) => setHealth(h));

    socket.on("shutdown", (msg) => {
      setIsShutdown(true);
      setAlert({ message: msg });
      setData([]);
    });

    socket.on("connect_error", () => {
      setAlert({ message: "❌ Connect Error" });
    });

    return () => socket.removeAllListeners();
  }, [isShutdown]);

  /* ----------- Canvas Draw ----------- */
  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, 400, 500);

    drawJoint(ctx, 200, 350, 20, "#94a3b8", "J1", selectedJoint === 1);
    drawCylinder(ctx, 185, 230, 30, 120, "#3b82f6", "#1e40af", selectedJoint === 1);
  }, [data, selectedJoint]);

  /* ----------- Backend Helpers ----------- */
  const addLog = async (severity, message) => {
    await fetch(`${API_URL}/api/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ severity, message }),
    });
  };

  /* ----------- UI ----------- */
  return (
    <div style={{ padding: "1rem" }}>
      <h1 style={{ textAlign: "center" }}>
        <ShieldCheck /> Industrial Robotic Arm Digital Twin
      </h1>

      <p style={{ textAlign: "center" }}>{alert.message}</p>

      <canvas
        ref={canvasRef}
        width={400}
        height={500}
        style={{ display: "block", margin: "auto" }}
        onClick={() => setSelectedJoint(1)}
      />

      <button onClick={() => addLog("INFO", "Manual log added")}>
        Add Log
      </button>
    </div>
  );
}
