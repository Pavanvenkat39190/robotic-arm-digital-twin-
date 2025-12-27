import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import API_BASE from "./config";

// ---- SOCKET (single source of truth) ----
const socket = io(API_BASE, {
  transports: ["websocket"],
  autoConnect: true,
});

// ----------------------------------------

export default function App() {
  const canvasRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [latest, setLatest] = useState({});
  const [data, setData] = useState([]);

  // ---- SOCKET EVENTS ----
  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ Connected to backend");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected");
      setConnected(false);
    });

    socket.on("newData", (payload) => {
      setLatest(payload);
      setData((prev) => [...prev.slice(-20), payload]);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("newData");
    };
  }, []);

  // ---- CANVAS DRAW ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !latest.j1_angle) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(180, 150, 40, 160);

    ctx.fillStyle = "#6b7280";
    ctx.beginPath();
    ctx.arc(200, 330, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.font = "14px Arial";
    ctx.fillText("J1", 192, 370);
  }, [latest]);

  // ---- REST ----
  const addLog = async () => {
    await fetch(`${API_BASE}/api/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        severity: "INFO",
        message: "Manual log from frontend",
      }),
    });
  };

  return (
    <div
      style={{
        fontFamily: "Arial",
        minHeight: "100vh",
        padding: "1rem",
        textAlign: "center",
      }}
    >
      <h1>🛡 Industrial Robotic Arm Digital Twin</h1>

      <div style={{ marginBottom: "1rem" }}>
        {connected ? "🟢 Connected" : "🔴 Connecting..."}
      </div>

      <canvas
        ref={canvasRef}
        width={400}
        height={420}
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          marginBottom: "1rem",
        }}
      />

      <div>
        <button onClick={addLog}>Add Log</button>
      </div>
    </div>
  );
}
