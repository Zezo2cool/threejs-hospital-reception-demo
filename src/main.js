import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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

    camera.position.set(0, 2, -3); // where the camera sits
    controls.target.set(0, 0.5, 0); // where the camera should point
    controls.update();
  },
  undefined,
  (error) => {
    console.error("Failed to load hospital model:", error);
  },
);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff);
scene.add(hemiLight);

/* ------------ Hotspots ------------- */
const hotspots = [];

const hotspotGeometry = new THREE.SphereGeometry(0.12, 16, 16); // radius, width segment, height segment
const hotspotMaterial = new THREE.MeshBasicMaterial({
  color: 0xff3b28,
});

const receptionHotspot = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
receptionHotspot.position.set(-0.15, 1.25, 0);
receptionHotspot.userData = {
  // userData is an empty object in every Three.js Object3D that
  title: "Reception Desk", // can be filled with application-specific metadata
  description: "This is where patients and visitors can check in.",
};
scene.add(receptionHotspot);
hotspots.push(receptionHotspot);

/* --------- Raycaster ---------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/* ---------- Hotspot Information Panel ------------- */
const infoPanel = document.querySelector("#info-panel");
const infoTitle = document.querySelector("#info-title");
const infoDescription = document.querySelector("#info-description");
const infoClose = document.querySelector("#info-close");

infoClose.addEventListener("click", () => {
  infoPanel.hidden = true;
});

function handleCanvasClick(event) {
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(hotspots, false);

  if (intersections.length > 0) {
    const clickedHotspot = intersections[0].object;

    console.log("Intersected object: ", clickedHotspot.userData);
    const { title, description } = clickedHotspot.userData;
    infoTitle.textContent = title;
    infoDescription.textContent = description;
    infoPanel.hidden = false;
  }
}

renderer.domElement.addEventListener("click", handleCanvasClick);

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
