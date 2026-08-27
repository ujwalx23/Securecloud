import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const VaultLock3D = ({ isUnlocked }) => {
  const containerRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 220;
    const height = containerRef.current.clientHeight || 220;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Outer Vault Dial Ring
    const ringGeo = new THREE.TorusGeometry(1.4, 0.25, 16, 100);
    const ringMat = new THREE.MeshStandardMaterial({
      color: isUnlocked ? 0x10b981 : 0x00f2fe,
      metalness: 0.9,
      roughness: 0.1,
      wireframe: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringRef.current = ringMesh;
    scene.add(ringMesh);

    // Center Lock Core Cylinder
    const coreGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.4, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.4,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.rotation.x = Math.PI / 2;
    scene.add(coreMesh);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f2fe, 2.5);
    dirLight.position.set(3, 4, 5);
    scene.add(dirLight);

    let frameId;
    let currentRotation = 0;
    const targetRotation = isUnlocked ? Math.PI * 4 : 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      currentRotation += (targetRotation - currentRotation) * 0.08;
      if (ringRef.current) {
        ringRef.current.rotation.z = currentRotation;
        ringRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.15;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isUnlocked]);

  return (
    <div
      ref={containerRef}
      className="w-48 h-48 mx-auto flex items-center justify-center relative"
    />
  );
};
