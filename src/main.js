// Three.js application entry point. We will build this one feature at a time.

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
const app = document.querySelector("#app");
app.appendChild(renderer.domElement);
const aspect = w / h;
const fov = 75;
const near = 0.1;
const far = 100;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 2;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const scene = new THREE.Scene();

const loader = new GLTFLoader();

loader.load(
  "/models/hospital_reception_environment/scene.gltf",
  (gltf) => {
    console.log("Hospital model loaded", gltf.scene);

    const model = gltf.scene;

    // Measure model at original size
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    // Scale the largest dimenstion to around 8 scene units
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 8 / maxDim;
    model.scale.setScalar(scale);

    // Remeasure after scaling
    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());

    model.position.x -= center.x;
    model.position.y -= box.min.y;
    model.position.z -= center.z;

    scene.add(model);

    camera.position.set(8, 5, 8);
    controls.target.set(0, 0.5, 0);
    controls.update();
  },
  undefined,
  (error) => {
    console.error("Failed to load hospital model:", error);
  },
);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff);
scene.add(hemiLight);

function animate(t = 0) {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function handleResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
}

animate();
window.addEventListener("resize", handleResize);
