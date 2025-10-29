import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Cylinder, Sphere, Box } from '@react-three/drei'; // Added Box
import * as THREE from 'three'; // Import THREE for materials if needed

// Helper component for a single arm segment + joint
function ArmSegment({ position, rotation, length, radius, jointRadius, color, jointColor, children }) {
  // --- FIX: Add default value and ensure rotation is an array ---
  const validRotation = Array.isArray(rotation) ? rotation : [0, 0, 0]; // Default if prop is bad
  // --- END FIX ---

  // Rotation needs to be converted from degrees to radians
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

function RoboticArm3D({ jointData, isDarkMode }) { // Added isDarkMode prop
  // Provide default values if jointData is empty initially
  const angles = {
    j1: jointData?.j1_angle || 0,
    j2: jointData?.j2_angle || 0,
    j3: jointData?.j3_angle || 0,
    j4: jointData?.j4_angle || 0,
    j5: jointData?.j5_angle || 0,
    j6: jointData?.j6_angle || 0,
  };

  // Define segment lengths and radii (adjust these for desired proportions)
  const segmentLength1 = 1.0; // Base to J2
  const segmentLength2 = 0.8; // J2 to J3
  const segmentLength3 = 0.6; // J3 to J4
  const segmentLength4 = 0.4; // J4 to J5
  const segmentLength5 = 0.3; // J5 to J6
  const segmentLength6 = 0.15; // J6 to EE base
  const radius = 0.08;
  const jointRadius = 0.12;

  return (
    // Set up the 3D scene canvas
    <Canvas
        camera={{ position: [2.5, 2, 2.5], fov: 50 }} // Adjusted camera start position
        style={{ background: 'var(--color-bg-tertiary)', borderRadius: '16px', border: `1px solid var(--color-border)` }}
        shadows // Enable shadows
    >
      {/* Lighting */}
      <ambientLight intensity={isDarkMode ? 0.4 : 0.7} /> {/* Adjust intensity based on theme */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={isDarkMode ? 0.8 : 1.2}
        castShadow
        shadow-mapSize-width={1024} // Improve shadow quality
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-5, -3, -2]} intensity={isDarkMode ? 0.3 : 0.5} />
      <hemisphereLight intensity={isDarkMode ? 0.2 : 0.4} groundColor={isDarkMode ? "#333" : "#aaa"} />

      {/* Controls - Allows mouse interaction to rotate/zoom the view */}
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />

      {/* Base */}
      <Cylinder args={[0.4, 0.4, 0.2, 32]} position={[0, 0.1, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={isDarkMode ? "#374151" : "#6b7280"} roughness={0.7} metalness={0.2} />
      </Cylinder>

      {/* Arm Segments - Nested structure applies transformations */}
      {/* J1 rotates around world Y axis */}
      <ArmSegment
        position={[0, 0.2, 0]} // Positioned just above the base cylinder
        rotation={[0, angles.j1, 0]} // Rotation around Y
        length={segmentLength1}
        radius={radius}
        jointRadius={jointRadius}
        color={isDarkMode ? "#4b5563": "#6b7280"} // Base segment color
        jointColor={isDarkMode ? "#9ca3af": "#cbd5e1"}
      >
        {/* J2 rotates around its local Z axis (after J1 rotation) */}
        <ArmSegment
          position={[0, segmentLength1, 0]} // Positioned at the end of the previous segment
          rotation={[0, 0, angles.j2]} // Rotation around Z
          length={segmentLength2}
          radius={radius * 0.9}
          jointRadius={jointRadius * 0.9}
          color="#3b82f6" // Link color
          jointColor={isDarkMode ? "#9ca3af": "#cbd5e1"}
        >
          {/* J3 rotates around its local Z axis */}
          <ArmSegment
            position={[0, segmentLength2, 0]}
            rotation={[0, 0, angles.j3]} // Rotation around Z
            length={segmentLength3}
            radius={radius * 0.8}
            jointRadius={jointRadius * 0.8}
            color="#10b981" // Link color
            jointColor={isDarkMode ? "#9ca3af": "#cbd5e1"}
          >
            {/* J4 rotates around its local Y axis (roll) */}
            <ArmSegment
              position={[0, segmentLength3, 0]}
              rotation={[0, angles.j4, 0]} // Rotation around Y
              length={segmentLength4}
              radius={radius * 0.7}
              jointRadius={jointRadius * 0.7}
              color="#f59e0b" // Link color
              jointColor={isDarkMode ? "#9ca3af": "#cbd5e1"}
            >
              {/* J5 rotates around its local Z axis (pitch) */}
              <ArmSegment
                position={[0, segmentLength4, 0]}
                rotation={[0, 0, angles.j5]} // Rotation around Z
                length={segmentLength5}
                radius={radius * 0.6}
                jointRadius={jointRadius * 0.6}
                color="#ef4444" // Link color
                jointColor={isDarkMode ? "#9ca3af": "#cbd5e1"}
              >
                {/* J6 rotates around its local Y axis (roll) */}
                <ArmSegment
                  position={[0, segmentLength5, 0]}
                  rotation={[0, angles.j6, 0]} // Rotation around Y
                  length={segmentLength6}
                  radius={radius * 0.5}
                  jointRadius={jointRadius * 0.5}
                  color={isDarkMode ? "#4b5563": "#6b7280"} // Wrist color
                  jointColor={isDarkMode ? "#9ca3af": "#cbd5e1"}
                >
                  {/* Simple End Effector */}
                  <group position={[0, segmentLength6 + 0.05, 0]}>
                    <Box args={[0.12, 0.08, 0.12]} position={[0, 0, 0]} castShadow>
                       <meshStandardMaterial color={isDarkMode ? "#9ca3af" : "#4b5563"} roughness={0.8}/>
                    </Box>
                     {/* Gripper Fingers */}
                     <Box args={[0.03, 0.12, 0.03]} position={[-0.045, -0.06, 0]} castShadow>
                       <meshStandardMaterial color={isDarkMode ? "#e5e7eb" : "#d1d5db"} metalness={0.8} roughness={0.3}/>
                     </Box>
                      <Box args={[0.03, 0.12, 0.03]} position={[0.045, -0.06, 0]} castShadow>
                       <meshStandardMaterial color={isDarkMode ? "#e5e7eb" : "#d1d5db"} metalness={0.8} roughness={0.3}/>
                     </Box>
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
        {/* Slightly darker ground for better contrast */}
        <meshStandardMaterial color={isDarkMode ? "#111827" : "#d1d5db"} roughness={0.9} />
      </mesh>
    </Canvas>
  );
}

export default RoboticArm3D;