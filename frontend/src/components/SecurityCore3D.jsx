import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Shield, Lock, Key, CheckCircle2, X, Sparkles, Cpu, Layers } from 'lucide-react';

export const SecurityCore3D = ({ onLayerClick }) => {
  const containerRef = useRef(null);
  const [activeLayer, setActiveLayer] = useState(null);
  const [modalInfo, setModalInfo] = useState(null);

  const securityLayers = [
    {
      id: 'aes',
      label: 'AES-256-GCM',
      subtitle: 'Authenticated Payload Cipher',
      color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
      title: 'AES-256-GCM Galois/Counter Mode',
      desc: 'Each file uploaded to SecureCloud is encrypted using a unique, cryptographically random 256-bit symmetric Data Encryption Key (DEK). AES-GCM provides both high-speed confidentiality and cryptographic authentication, guaranteeing file data cannot be altered or tampered with at rest.',
      specs: ['256-bit symmetric key length', 'Hardware-accelerated AES-NI cipher', '96-bit unique cryptographic IV', '128-bit authentication tag']
    },
    {
      id: 'rsa',
      label: 'RSA-2048 PKI',
      subtitle: 'Asymmetric Key Wrapping',
      color: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10',
      title: 'RSA-2048 Asymmetric Public-Key Infrastructure',
      desc: 'Every SecureCloud account generates a 2048-bit RSA keypair on registration. The private key is wrapped with a PBKDF2-derived master key, while the public key wraps the per-file DEK. This enables direct zero-trust file sharing between users without transmitting raw passwords.',
      specs: ['2048-bit RSA OAEP SHA-256', 'PBKDF2HMAC key derivation', 'Zero-knowledge user isolation', 'Recipient public key DEK wrapping']
    },
    {
      id: 'sha',
      label: 'SHA-256',
      subtitle: 'Cryptographic Stream Integrity',
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
      title: 'SHA-256 Stream Checksum & Integrity',
      desc: 'Before and after every encryption cycle, SecureCloud computes the SHA-256 digest of the plaintext. On download, the decrypted stream is verified against this immutable checksum to mathematically prove byte-for-byte fidelity.',
      specs: ['256-bit cryptographic digest', 'Immutable database record', 'Pre- and post-decryption verification', 'Zero corruption guarantee']
    },
    {
      id: 'zero-trust',
      label: 'ZERO-TRUST',
      subtitle: 'Role & Scope Enforcement',
      color: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
      title: 'Zero-Trust Architecture & Server Enforced Scope',
      desc: 'No entity—not even database administrators or cloud hosts—can read user file contents without private cryptographic keys. Access revocation immediately invalidates authorization tokens and enforces strict 403 Forbidden barriers on endpoints.',
      specs: ['Strict 403 server-side revocation', 'Expirable time-scoped share tokens', 'Hardware-isolated secrets vault', 'Comprehensive security audit telemetry']
    },
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 360;
    const height = containerRef.current.clientHeight || 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    containerRef.current.appendChild(renderer.domElement);

    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Central Floating Cryptographic Shield Core (Octahedron / Icosahedron)
    const coreGeo = new THREE.OctahedronGeometry(1.2, 2);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x060f26,
      emissive: 0x00f5ff,
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreMesh);

    // Core Wireframe Outline
    const wireGeo = new THREE.OctahedronGeometry(1.23, 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00f5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    coreGroup.add(wireMesh);

    // 2. Inner Glowing Power Crystal
    const innerGeo = new THREE.IcosahedronGeometry(0.7, 0);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: true,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerMesh);

    // 3. Three Cryptographic Orbiting Rings (AES, RSA, SHA)
    const ring1Geo = new THREE.TorusGeometry(1.85, 0.02, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.6 });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    coreGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(2.1, 0.02, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.5 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 4;
    coreGroup.add(ring2);

    const ring3Geo = new THREE.TorusGeometry(2.35, 0.018, 16, 100);
    const ring3Mat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.4 });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.z = Math.PI / 3;
    coreGroup.add(ring3);

    // 4. Inflowing Data Particles
    const particleCount = 90;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleInitialRadii = new Float32Array(particleCount);
    const particleAngles = new Float32Array(particleCount);
    const particleHeights = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particleInitialRadii[i] = 1.5 + Math.random() * 2.0;
      particleAngles[i] = Math.random() * Math.PI * 2;
      particleHeights[i] = (Math.random() - 0.5) * 2.5;

      particlePositions[i * 3] = particleInitialRadii[i] * Math.cos(particleAngles[i]);
      particlePositions[i * 3 + 1] = particleHeights[i];
      particlePositions[i * 3 + 2] = particleInitialRadii[i] * Math.sin(particleAngles[i]);
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x00f5ff,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    coreGroup.add(particles);

    // 5. Floating Key Node Spheres
    const nodeGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const node1Mat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    const node1 = new THREE.Mesh(nodeGeo, node1Mat);
    ring1.add(node1);
    node1.position.set(1.85, 0, 0);

    const node2Mat = new THREE.MeshBasicMaterial({ color: 0x818cf8 });
    const node2 = new THREE.Mesh(nodeGeo, node2Mat);
    ring2.add(node2);
    node2.position.set(2.1, 0, 0);

    // 6. Dynamic Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00f5ff, 3, 50);
    pointLight.position.set(4, 4, 4);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x6366f1, 2, 50);
    pointLight2.position.set(-4, -4, -4);
    scene.add(pointLight2);

    // 7. Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 8. Animation Loop
    let animationFrameId;
    let time = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      time += 0.015;

      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      coreGroup.rotation.y = time * 0.4 + targetX * 0.5;
      coreGroup.rotation.x = Math.sin(time * 0.5) * 0.1 + targetY * 0.3;

      innerMesh.rotation.x -= 0.02;
      innerMesh.rotation.y -= 0.03;

      ring1.rotation.z += 0.01;
      ring2.rotation.z -= 0.008;
      ring3.rotation.z += 0.005;

      // Animate flowing data particles inward
      const pos = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        particleAngles[i] += 0.015;
        particleInitialRadii[i] -= 0.008;

        if (particleInitialRadii[i] < 0.9) {
          particleInitialRadii[i] = 3.2;
        }

        pos[i * 3] = particleInitialRadii[i] * Math.cos(particleAngles[i]);
        pos[i * 3 + 2] = particleInitialRadii[i] * Math.sin(particleAngles[i]);
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const handleSelectLayer = (layer) => {
    setActiveLayer(layer.id);
    setModalInfo(layer);
    if (onLayerClick) onLayerClick(layer);
  };

  return (
    <div className="glass-panel p-5 relative flex flex-col justify-between overflow-hidden group border-slate-800/80 shadow-2xl">
      {/* Panel Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-heading text-gray-200">Security Core Engine</h4>
            <p className="text-[10px] text-gray-400 font-mono">Hardware Hybrid Cipher</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950/70 px-2.5 py-1 rounded-full border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-mono font-semibold">Protected</span>
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className="w-full h-44 my-1 flex items-center justify-center cursor-pointer select-none"
        title="Interactive 3D Security Core - Hover to interact"
      />

      {/* Interactive Layer Pills */}
      <div className="grid grid-cols-2 gap-2 z-10 pt-2 border-t border-slate-800/80">
        {securityLayers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => handleSelectLayer(layer)}
            onMouseEnter={() => setActiveLayer(layer.id)}
            onMouseLeave={() => setActiveLayer(null)}
            className={`p-2 rounded-xl text-left transition-all duration-200 border flex items-center justify-between group/pill ${
              activeLayer === layer.id
                ? 'bg-slate-800/90 border-cyan-400 shadow-md shadow-cyan-500/10'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="text-[11px] font-bold font-heading text-gray-200 group-hover/pill:text-cyan-300 transition-colors">
                {layer.label}
              </div>
              <div className="text-[9px] text-gray-400 font-mono truncate max-w-[110px]">
                {layer.subtitle}
              </div>
            </div>
            <Sparkles className="w-3 h-3 text-cyan-400 opacity-0 group-hover/pill:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {/* Security Layer Modal */}
      {modalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel bg-slate-900 border-slate-700 w-full max-w-lg p-6 rounded-2xl shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-md">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading text-gray-100">{modalInfo.title}</h3>
                  <p className="text-[11px] text-cyan-400 font-mono">{modalInfo.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setModalInfo(null)}
                className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-4 text-xs">
              <p className="text-gray-300 leading-relaxed font-body">
                {modalInfo.desc}
              </p>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <h5 className="text-[11px] font-bold font-mono text-cyan-400 uppercase tracking-wider">
                  Cryptographic Specifications
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {modalInfo.specs.map((spec, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-300 font-mono text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setModalInfo(null)}
                className="btn-primary text-xs py-2 px-4"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
