import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

const loadingScreen = document.querySelector("#loading-screen");
const loadingMessage = document.querySelector("#loading-message");
loader.load(
  "/models/hospital_reception_environment/scene.gltf",
  (gltf) => {
    const model = gltf.scene;

    // Measure model at original size
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    // Scale the largest dimenstion to 8 scene units
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

    camera.position.set(0, 3, -6); // where the camera sits
    controls.target.set(0, 0.5, 0); // where the camera should point
    controls.update();
    loadingScreen.hidden = true;
  },
  undefined,
  (error) => {
    console.error("Failed to load hospital model:", error);
    loadingMessage.textContent =
      "The model could not be loaded. Please refresh the page.";
  },
);

const cameraReset = document.querySelector("#camera-reset");
cameraReset.addEventListener("click", () => {
  camera.position.set(0, 3, -6); // where the camera sits
  controls.target.set(0, 0.5, 0); // where the camera should point
});

const helpButton = document.querySelector("#help-open");
const helpDialog = document.querySelector("#help-dialog");

helpButton.addEventListener("click", () => {
  helpDialog.showModal();
});

helpDialog.addEventListener("close", () => {
  helpButton.focus();
});

/* ---------------- Scene Lighting ---------------- */
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
scene.background = new THREE.Color(0x0e1c33);
const hemiLight = new THREE.HemisphereLight(0xdbeeff, 0x4d4842, 1.2);
scene.add(hemiLight);
const keyLight = new THREE.DirectionalLight(0xffffff, 2);
keyLight.position.set(-4, 6, -4);
keyLight.target.position.set(0, 0.5, 0);

scene.add(keyLight);
scene.add(keyLight.target);

/* ------------ Hotspots ------------- */
const hotspotHitboxes = [];

const hotspotGeometry = new THREE.SphereGeometry(0.12, 16, 16); // radius, width segment, height segment
const hotspotMaterial = new THREE.MeshBasicMaterial({
  color: 0xff3b28,
});

const hotspotHitGeometry = new THREE.SphereGeometry(0.2, 12, 12);
const hotspotHitMaterial = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  colorWrite: false,
});

const hotspotStyles = {
  default: {
    color: 0xff3b28,
    scale: 1,
  },
  hover: {
    color: 0xffb000,
    scale: 1.2,
  },
  selected: {
    color: 0x168aad,
    scale: 1.2,
  },
};

function setHotspotStyle(hotspot, state) {
  const style = hotspotStyles[state];

  hotspot.material.color.setHex(style.color);
  hotspot.scale.setScalar(style.scale);
}

function createHotspot({ position, title, description }) {
  const hotspot = new THREE.Mesh(hotspotGeometry, hotspotMaterial.clone());
  hotspot.position.set(...position);
  hotspot.userData = {
    title,
    description,
  };

  const hitbox = new THREE.Mesh(hotspotHitGeometry, hotspotHitMaterial);
  hitbox.position.copy(hotspot.position);
  hitbox.userData.hotspot = hotspot;

  scene.add(hotspot);
  scene.add(hitbox);
  hotspotHitboxes.push(hitbox);

  return hotspot;
}

// MATERNITY WARD
createHotspot({
  position: [-3.3, 1, 3],
  title: "Maternity Ward",
  description:
    "This door leads to the maternity ward, where patients are provided antenatal care, postnatal care, neonatal support, and labor and delivery.",
});

// ICU
createHotspot({
  position: [3.3, 1, 3],
  title: "Intensive Care and Emergency Department",
  description:
    "This door leads to intensive care units and the emergency departments. Patients are taken there in case of emergencies.",
});

// WAITING AREA
createHotspot({
  position: [0, 0.5, -2.25],
  title: "Waiting Area",
  description: "This is where patients and visitors can sit down and wait.",
});

// RECEPTION
createHotspot({
  position: [0, 0.75, 0],
  title: "Reception Desk",
  description: "This is where patients and visitors can check in.",
});

/* --------- Raycaster ---------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/* ---------- Hotspot Information Panel ------------- */
const infoPanel = document.querySelector("#info-panel");
const infoTitle = document.querySelector("#info-title");
const infoDescription = document.querySelector("#info-description");
const infoClose = document.querySelector("#info-close");

function getHotspotAtPointer(event) {
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(hotspotHitboxes, false);

  return intersections[0]?.object.userData.hotspot ?? null;
}

let hoveredHotspot = null;
let selectedHotspot = null;

function handlePointerMove(event) {
  const nextHoveredHotspot = getHotspotAtPointer(event);

  renderer.domElement.style.cursor = nextHoveredHotspot ? "pointer" : "grab";
  if (nextHoveredHotspot === hoveredHotspot) {
    return;
  }

  if (hoveredHotspot && hoveredHotspot !== selectedHotspot) {
    setHotspotStyle(hoveredHotspot, "default");
  }

  hoveredHotspot = nextHoveredHotspot;

  if (hoveredHotspot && hoveredHotspot !== selectedHotspot) {
    setHotspotStyle(hoveredHotspot, "hover");
  }
}
renderer.domElement.addEventListener("pointermove", handlePointerMove);

function handleCanvasClick(event) {
  const clickedHotspot = getHotspotAtPointer(event);

  if (!clickedHotspot) {
    return;
  }

  if (selectedHotspot && selectedHotspot !== clickedHotspot) {
    setHotspotStyle(selectedHotspot, "default");
  }

  selectedHotspot = clickedHotspot;
  setHotspotStyle(selectedHotspot, "selected");

  const { title, description } = clickedHotspot.userData;
  infoTitle.textContent = title;
  infoDescription.textContent = description;
  infoPanel.hidden = false;
}
renderer.domElement.addEventListener("click", handleCanvasClick);

function handlePointerLeave() {
  if (hoveredHotspot && hoveredHotspot !== selectedHotspot) {
    setHotspotStyle(hoveredHotspot, "default");
  }

  hoveredHotspot = null;
  renderer.domElement.style.cursor = "grab";
}
renderer.domElement.addEventListener("pointerleave", handlePointerLeave);

infoClose.addEventListener("click", () => {
  infoPanel.hidden = true;

  if (selectedHotspot) {
    setHotspotStyle(selectedHotspot, "default");
    selectedHotspot = null;
  }
});

function animate() {
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
