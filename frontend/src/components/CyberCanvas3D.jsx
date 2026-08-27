import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const CyberCanvas3D = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 400;
    const height = containerRef.current.clientHeight || 320;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 2. Earth Main Sphere (Deep Blue / Obsidian Base)
    const earthRadius = 1.6;
    const sphereGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x060b19,
      emissive: 0x040814,
      specular: 0x00f5ff,
      shininess: 40,
      transparent: true,
      opacity: 0.95,
    });
    const earthSphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(earthSphere);

    // 3. Earth Landmass / Continents Dot Matrix Pattern
    const dotCount = 2200;
    const dotPositions = [];
    const dotColors = [];
    const cyanColor = new THREE.Color(0x00f5ff);
    const indigoColor = new THREE.Color(0x818cf8);
    const purpleColor = new THREE.Color(0xc084fc);

    // Generate procedural continents on sphere surface using multi-frequency spherical harmonics
    for (let i = 0; i < dotCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / dotCount);
      const theta = Math.sqrt(dotCount * Math.PI) * phi;

      // Noise approximation for continental landmasses
      const x = Math.cos(theta) * Math.sin(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(phi);

      const lat = Math.asin(z);
      const lon = Math.atan2(y, x);

      // Continent landmass noise simulation
      const noise =
        Math.sin(lat * 3.5 + 0.5) * Math.cos(lon * 2.5) +
        Math.sin(lat * 6.0) * Math.cos(lon * 5.0) * 0.4 +
        Math.cos(lat * 1.5 - lon * 1.2) * 0.5;

      const isLand = noise > -0.15;
      const r = earthRadius + (isLand ? 0.025 : 0.005);

      dotPositions.push(r * Math.sin(phi) * Math.cos(theta));
      dotPositions.push(r * Math.sin(phi) * Math.sin(theta));
      dotPositions.push(r * Math.cos(phi));

      const c = isLand
        ? (Math.random() > 0.4 ? cyanColor : indigoColor)
        : new THREE.Color(0x132144);
      dotColors.push(c.r, c.g, c.b);
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(dotPositions, 3));
    dotGeo.setAttribute('color', new THREE.Float32BufferAttribute(dotColors, 3));

    const dotMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const dotMesh = new THREE.Points(dotGeo, dotMat);
    globeGroup.add(dotMesh);

    // 4. Latitude / Longitude Cyber Wireframe Grid
    const gridGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(earthRadius + 0.015, 24, 16));
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x00f5ff,
      transparent: true,
      opacity: 0.12,
    });
    const gridLines = new THREE.LineSegments(gridGeo, gridMat);
    globeGroup.add(gridLines);

    // 5. Outer Atmospheric Halo Glow
    const atmosphereGeo = new THREE.SphereGeometry(earthRadius * 1.15, 40, 40);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
          gl_FragColor = vec4(0.0, 0.96, 1.0, 1.0) * intensity * 0.85;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    globeGroup.add(atmosphere);

    // 6. Orbital Cyber Security Rings & Satellites
    const ringGeo = new THREE.RingGeometry(2.1, 2.14, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    ringMesh.rotation.y = Math.PI / 6;
    globeGroup.add(ringMesh);

    const ringGeo2 = new THREE.RingGeometry(2.35, 2.38, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = -Math.PI / 4;
    ringMesh2.rotation.y = Math.PI / 4;
    globeGroup.add(ringMesh2);

    // 7. Security Node Pulsing Beacons on the Globe
    const hubCoords = [
      { lat: 37.77, lon: -122.41 }, // San Francisco
      { lat: 51.50, lon: -0.12 },   // London
      { lat: 35.67, lon: 139.65 },  // Tokyo
      { lat: 1.35, lon: 103.81 },   // Singapore
      { lat: -33.86, lon: 151.20 }, // Sydney
      { lat: 52.52, lon: 13.40 },   // Berlin
    ];

    const hubsGroup = new THREE.Group();
    hubCoords.forEach(({ lat, lon }) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const r = earthRadius + 0.04;

      const px = -(r * Math.sin(phi) * Math.cos(theta));
      const pz = r * Math.sin(phi) * Math.sin(theta);
      const py = r * Math.cos(phi);

      const beaconGeo = new THREE.SphereGeometry(0.04, 16, 16);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(px, py, pz);
      hubsGroup.add(beacon);

      const ringPulseGeo = new THREE.RingGeometry(0.06, 0.08, 24);
      const ringPulseMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ringPulse = new THREE.Mesh(ringPulseGeo, ringPulseMat);
      ringPulse.position.set(px, py, pz);
      ringPulse.lookAt(0, 0, 0);
      hubsGroup.add(ringPulse);
    });
    globeGroup.add(hubsGroup);

    // 8. Cryptographic Floating Data Particles
    const starCount = 180;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 2.8 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.035,
      color: 0x00f5ff,
      transparent: true,
      opacity: 0.6,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 9. Dynamic Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00f5ff, 2.5);
    dirLight1.position.set(5, 3, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 2.0);
    dirLight2.position.set(-5, -3, -3);
    scene.add(dirLight2);

    // 10. Interactive Movable Ball Physics & Mouse Drag Handling
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let velocity = { x: 0.003, y: 0.001 };
    const friction = 0.95;

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      velocity.x = deltaX * 0.005;
      velocity.y = deltaY * 0.005;

      globeGroup.rotation.y += velocity.x;
      globeGroup.rotation.x += velocity.y;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;

      velocity.x = deltaX * 0.005;
      velocity.y = deltaY * 0.005;

      globeGroup.rotation.y += velocity.x;
      globeGroup.rotation.x += velocity.y;

      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onMouseUp);

    // 11. Animation Loop with Inertia
    let animationFrameId;
    let time = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      time += 0.02;

      if (!isDragging) {
        // Apply inertia friction and default continuous rotation
        velocity.x *= friction;
        velocity.y *= friction;

        globeGroup.rotation.y += velocity.x + 0.0025;
        globeGroup.rotation.x += velocity.y;
      }

      // Gentle wobble and particle spin
      ringMesh.rotation.z += 0.003;
      ringMesh2.rotation.z -= 0.002;
      starPoints.rotation.y += 0.0008;

      // Pulse beacon glow
      const scale = 1 + Math.sin(time * 3) * 0.15;
      hubsGroup.children.forEach((child, index) => {
        if (index % 2 === 1) {
          child.scale.set(scale, scale, scale);
        }
      });

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
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[280px] flex items-center justify-center relative cursor-grab active:cursor-grabbing select-none"
    />
  );
};
