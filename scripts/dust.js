import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function initDust({ reducedMotion = false } = {}) {
  const canvas = document.querySelector('#dust-canvas');
  if (!canvas || !window.WebGLRenderingContext) return;

  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: isMobile ? 'low-power' : 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.35 : 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0, 0, 8);

  const ambient = new THREE.AmbientLight(0xffffff, 1.9);
  const key = new THREE.DirectionalLight(0xd9fbff, 1.2);
  key.position.set(3, 4, 5);
  scene.add(ambient, key);

  const clock = new THREE.Clock();
  const pointer = new THREE.Vector2(0, 0);
  const pointerTarget = new THREE.Vector2(0, 0);
  const scrollState = { y: window.scrollY, velocity: 0 };
  const mixers = [];

  let dustRoot = null;
  let fallback = null;
  let running = true;

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const createFallbackDust = () => {
    const count = reducedMotion ? 120 : (isMobile ? 260 : 620);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      positions[i3] = THREE.MathUtils.randFloatSpread(13);
      positions[i3 + 1] = THREE.MathUtils.randFloatSpread(8);
      positions[i3 + 2] = THREE.MathUtils.randFloat(-7, 3);
      seeds[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));

    const material = new THREE.PointsMaterial({
      size: isMobile ? 0.018 : 0.024,
      color: 0x5E7884,
      transparent: true,
      opacity: reducedMotion ? 0.2 : 0.3,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const points = new THREE.Points(geometry, material);
    points.userData.initial = positions.slice();
    scene.add(points);
    fallback = points;
  };

  const fitModel = (root) => {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    root.position.sub(center);
    const maxAxis = Math.max(size.x, size.y, size.z) || 1;
    const scale = (isMobile ? 4.8 : 6.8) / maxAxis;
    root.scale.setScalar(scale);
    root.position.set(0, 0, -1.8);
    root.rotation.set(0.08, 0.2, -0.06);

    root.traverse((child) => {
      if (!child.isMesh) return;
      child.frustumCulled = false;
      const original = child.material;
      child.material = Array.isArray(original)
        ? original.map((mat) => softenMaterial(mat))
        : softenMaterial(original);
    });
  };

  const softenMaterial = (material) => {
    const mat = material?.clone ? material.clone() : new THREE.MeshStandardMaterial();
    mat.transparent = true;
    mat.opacity = reducedMotion ? 0.22 : 0.32;
    mat.depthWrite = false;
    mat.color = new THREE.Color(0x5E7884);
    if ('emissive' in mat) {
      mat.emissive = new THREE.Color(0xdffaff);
      mat.emissiveIntensity = 0.06;
    }
    return mat;
  };

  const loadModel = async () => {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('assets/dust_looping_glb/dust_looping_rigged.glb');
    dustRoot = gltf.scene;
    fitModel(dustRoot);
    scene.add(dustRoot);

    if (gltf.animations?.length && !reducedMotion) {
      const mixer = new THREE.AnimationMixer(dustRoot);
      gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
      mixers.push(mixer);
    }
  };

  const onPointerMove = (event) => {
    pointerTarget.x = (event.clientX / window.innerWidth - 0.5) * 2;
    pointerTarget.y = -(event.clientY / window.innerHeight - 0.5) * 2;
  };

  const onScroll = () => {
    const nextY = window.scrollY;
    scrollState.velocity = THREE.MathUtils.clamp((nextY - scrollState.y) * 0.002, -0.65, 0.65);
    scrollState.y = nextY;
  };

  const animateFallback = (time) => {
    if (!fallback || reducedMotion) return;

    const positions = fallback.geometry.attributes.position;
    const initial = fallback.userData.initial;
    const array = positions.array;

    for (let i = 0; i < positions.count; i += 1) {
      const i3 = i * 3;
      const seed = fallback.geometry.attributes.seed.array[i];
      const depth = THREE.MathUtils.mapLinear(initial[i3 + 2], -7, 3, 1.25, 0.35);
      array[i3] = initial[i3] + Math.sin(time * 0.00022 + seed * 12) * 0.18 + pointer.x * depth * 0.18;
      array[i3 + 1] = initial[i3 + 1] + Math.cos(time * 0.00018 + seed * 18) * 0.12 + pointer.y * depth * 0.12 - scrollState.velocity * depth;

      if (array[i3 + 1] < -4.5) array[i3 + 1] = 4.5;
      if (array[i3 + 1] > 4.5) array[i3 + 1] = -4.5;
    }

    positions.needsUpdate = true;
    fallback.rotation.z = Math.sin(time * 0.00008) * 0.025;
  };

  const render = (time) => {
    if (!running) return;

    const delta = Math.min(clock.getDelta(), 0.033);
    pointer.lerp(pointerTarget, reducedMotion ? 0.02 : 0.055);
    scrollState.velocity *= 0.9;

    mixers.forEach((mixer) => mixer.update(delta));

    if (dustRoot && !reducedMotion) {
      dustRoot.rotation.y += delta * 0.025;
      dustRoot.rotation.x = 0.08 + pointer.y * 0.035 + scrollState.velocity * 0.03;
      dustRoot.rotation.z = -0.06 + pointer.x * 0.04;
      dustRoot.position.y = scrollState.velocity * -0.55;
    }

    animateFallback(time);
    renderer.render(scene, camera);

    if (!reducedMotion) requestAnimationFrame(render);
  };

  resize();
  createFallbackDust();

  try {
    await loadModel();
    if (fallback) {
      scene.remove(fallback);
      fallback.geometry.dispose();
      fallback.material.dispose();
      fallback = null;
    }
  } catch {
    // The procedural dust stays active when the supplied GLB cannot load.
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !reducedMotion) {
      clock.getDelta();
      requestAnimationFrame(render);
    }
  });

  renderer.render(scene, camera);
  if (!reducedMotion) requestAnimationFrame(render);
}
