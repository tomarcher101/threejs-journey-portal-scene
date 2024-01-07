import GUI from "lil-gui";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import firefliesVertexShader from "./shaders/fireflies/vertex.glsl";
import firefliesFragmentShader from "./shaders/fireflies/fragment.glsl";
import portalVertexShader from "./shaders/portal/vertex.glsl";
import portalFragmentShader from "./shaders/portal/fragment.glsl";

/**
 * Base
 */
// Debug
const debugObject = {};
const gui = new GUI({
  width: 400,
});

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader();

// Draco loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("draco/");

// GLTF loader
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// TEXTURES
const bakedTexture = textureLoader.load("/baked-final.jpg");
bakedTexture.colorSpace = THREE.SRGBColorSpace;
bakedTexture.flipY = false;

/**
 * Object
 */

// Materials
// Baked Material
const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture });

// Pole light material
const poleLightMaterial = new THREE.MeshBasicMaterial({ color: 0xfff5e5 });

// Portal light material
debugObject.portalStartColor = "#fbc1fb";
debugObject.portalEndColor = "#fffaff";
gui.addColor(debugObject, "portalStartColor").onChange(() => {
  portalLightMaterial.uniforms.uColorStart.value.set(
    debugObject.portalStartColor
  );
});
gui.addColor(debugObject, "portalEndColor").onChange(() => {
  portalLightMaterial.uniforms.uColorEnd.value.set(debugObject.portalEndColor);
});

const portalLightMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColorStart: { value: new THREE.Color(debugObject.portalStartColor) },
    uColorEnd: { value: new THREE.Color(debugObject.portalEndColor) },
  },
  vertexShader: portalVertexShader,
  fragmentShader: portalFragmentShader,
});

// Model
gltfLoader.load("/portal-scene3.glb", (gltf) => {
  gltf.scene.traverse((child) => {
    const bakedMesh = gltf.scene.children.find(
      (child) => child.name === "baked"
    );
    const poleLight1Mesh = gltf.scene.children.find(
      (child) => child.name === "poleLight1"
    );
    const poleLight2Mesh = gltf.scene.children.find(
      (child) => child.name === "poleLight2"
    );
    const portalLightMesh = gltf.scene.children.find(
      (child) => child.name === "portalLight"
    );

    poleLight1Mesh.material = poleLightMaterial;
    poleLight2Mesh.material = poleLightMaterial;
    portalLightMesh.material = portalLightMaterial;
    bakedMesh.material = bakedMaterial;

    scene.add(gltf.scene);
  });
});

// Fireflies
// - Geometry
const firefliesGeometry = new THREE.BufferGeometry();
const firefliesCount = 30;
const positionArray = new Float32Array(firefliesCount * 3);
const scaleArray = new Float32Array(firefliesCount * 1);

for (let i = 0; i < firefliesCount; i++) {
  positionArray[i * 3 + 0] = (Math.random() - 0.5) * 4;
  positionArray[i * 3 + 1] = Math.random() * 1.5;
  positionArray[i * 3 + 2] = (Math.random() - 0.5) * 4;
  scaleArray[i] = Math.random();
}

firefliesGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(positionArray, 3)
);
firefliesGeometry.setAttribute(
  "aScale",
  new THREE.BufferAttribute(scaleArray, 1)
);

// - Material
const firefliesMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uFireflySize: { value: 100 },
  },
  vertexShader: firefliesVertexShader,
  fragmentShader: firefliesFragmentShader,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

gui
  .add(firefliesMaterial.uniforms.uFireflySize, "value")
  .min(0)
  .max(500)
  .step(1)
  .name("fireflySize");

// - Points
const fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial);
scene.add(fireflies);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Update fireflies
  firefliesMaterial.uniforms.uPixelRatio.value = Math.min(
    window.devicePixelRatio,
    2
  );
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.x = 4;
camera.position.y = 2;
camera.position.z = 4;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

debugObject.clearColor = "#38373e";
renderer.setClearColor(debugObject.clearColor);
gui.addColor(debugObject, "clearColor").onChange(() => {
  renderer.setClearColor(debugObject.clearColor);
});

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // Update uniforms
  firefliesMaterial.uniforms.uTime.value = elapsedTime;
  portalLightMaterial.uniforms.uTime.value = elapsedTime;

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
