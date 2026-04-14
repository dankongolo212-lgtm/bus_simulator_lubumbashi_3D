const container = document.getElementById('gameContainer');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x87c2ff, 0.01);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setClearColor(0x87c2ff, 1);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Lumières
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(20, 40, 20);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
scene.add(directionalLight);

const roadGroup = new THREE.Group();
const environmentGroup = new THREE.Group();
scene.add(roadGroup);
scene.add(environmentGroup);

const busGroup = new THREE.Group();
let busPositionX = 0;
let targetBusPositionX = 0;
let score = 0;
let level = 1;
let coinsCollected = 0;
let gameActive = true;
let gameSpeed = 0.35;
let forwardDistance = 0;
let highScore = localStorage.getItem('busRunnerHighScore') || 0;

const GAME_WIDTH = 12;

function addRoad() {
  const geometry = new THREE.PlaneGeometry(GAME_WIDTH, 400);
  const material = new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.9, metalness: 0 });
  const road = new THREE.Mesh(geometry, material);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0;
  road.receiveShadow = true;
  roadGroup.add(road);

  const lineCanvas = document.createElement('canvas');
  lineCanvas.width = 512;
  lineCanvas.height = 512;
  const ctx = lineCanvas.getContext('2d');
  ctx.fillStyle = '#2c2c2c';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#3a9c71';
  ctx.fillRect(0, 0, 60, 512);
  ctx.fillRect(452, 0, 60, 512);

  ctx.fillStyle = '#3f3f3f';
  ctx.fillRect(64, 0, 384, 512);

  ctx.fillStyle = '#616161';
  for (let y = 0; y < 512; y += 24) {
    ctx.fillRect(82, y + 4, 10, 6);
    ctx.fillRect(420, y + 12, 10, 6);
  }

  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 16; i++) {
    ctx.fillRect(248, i * 32 + 8, 16, 16);
  }

  const texture = new THREE.CanvasTexture(lineCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 70);
  material.map = texture;
  material.bumpMap = texture;
  material.bumpScale = 0.08;
  material.needsUpdate = true;

  const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0x88d2ae, roughness: 0.95 });
  const leftSidewalk = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 400), sidewalkMaterial);
  leftSidewalk.rotation.x = -Math.PI / 2;
  leftSidewalk.position.set(-GAME_WIDTH / 2 - 1.25, 0.01, 0);
  leftSidewalk.receiveShadow = true;
  roadGroup.add(leftSidewalk);

  const rightSidewalk = leftSidewalk.clone();
  rightSidewalk.position.x = GAME_WIDTH / 2 + 1.25;
  roadGroup.add(rightSidewalk);

  const curbMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const leftCurb = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 400), curbMaterial);
  leftCurb.rotation.x = -Math.PI / 2;
  leftCurb.position.set(-GAME_WIDTH / 2 - 2.1, 0.05, 0);
  roadGroup.add(leftCurb);

  const rightCurb = leftCurb.clone();
  rightCurb.position.x = GAME_WIDTH / 2 + 2.1;
  roadGroup.add(rightCurb);
}

function addBus() {
  // PSX Bus - Modèle détaillé basé sur le modèle 3D fourni
  
  // Corps principal blanc/gris
  const bodyGeometry = new THREE.BoxGeometry(1.8, 1.1, 3.5);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xe8e8e8,
    metalness: 0.2,
    roughness: 0.7
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.y = 0.7;
  busGroup.add(body);

  // Bande bleue horizontale (bas du bus)
  const blueStripeGeometry = new THREE.BoxGeometry(1.8, 0.25, 3.5);
  const blueStripeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1144aa,
    roughness: 0.6
  });
  const blueStripe = new THREE.Mesh(blueStripeGeometry, blueStripeMaterial);
  blueStripe.position.y = 0.25;
  busGroup.add(blueStripe);

  // Bande orange/rouge (milieu)
  const redStripeGeometry = new THREE.BoxGeometry(1.8, 0.2, 3.5);
  const redStripeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff8833,
    roughness: 0.6
  });
  const redStripe = new THREE.Mesh(redStripeGeometry, redStripeMaterial);
  redStripe.position.y = 0.55;
  busGroup.add(redStripe);

  // Toit noir
  const roofGeometry = new THREE.BoxGeometry(1.75, 0.35, 3.4);
  const roofMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x111111,
    metalness: 0.3,
    roughness: 0.8
  });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.castShadow = true;
  roof.position.set(0, 1.55, -0.2);
  busGroup.add(roof);

  // Pare-brise bleu ciel transparent
  const windshieldGeometry = new THREE.PlaneGeometry(1.5, 0.65);
  const windshieldMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x87ceeb,
    transparent: true,
    opacity: 0.75,
    roughness: 0.15,
    metalness: 0.1
  });
  const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
  windshield.position.set(0, 0.9, 1.8);
  busGroup.add(windshield);

  // Fenêtres latérales (3 par côté)
  const sideWindowGeometry = new THREE.PlaneGeometry(0.55, 0.5);
  for (let i = -1; i <= 1; i++) {
    const window = new THREE.Mesh(sideWindowGeometry, windshieldMaterial);
    window.position.set(-0.95, 0.8, -0.3 + i * 1.0);
    busGroup.add(window);
    
    const window2 = window.clone();
    window2.position.x = 0.95;
    busGroup.add(window2);
  }

  // Pare-chocs avant noir
  const bumperGeometry = new THREE.BoxGeometry(1.85, 0.35, 0.2);
  const bumperMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x222222,
    roughness: 0.9
  });
  const bumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
  bumper.castShadow = true;
  bumper.position.set(0, 0.4, 1.85);
  busGroup.add(bumper);

  // Phares avant
  const headlightGeometry = new THREE.SphereGeometry(0.14, 16, 16);
  const headlightMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffff99,
    emissive: 0xffff00,
    emissiveIntensity: 0.7
  });
  const headlightLeft = new THREE.Mesh(headlightGeometry, headlightMaterial);
  headlightLeft.position.set(-0.6, 0.65, 1.8);
  busGroup.add(headlightLeft);
  
  const headlightRight = headlightLeft.clone();
  headlightRight.position.x = 0.6;
  busGroup.add(headlightRight);

  // Calandre avant noire
  const grilleGeometry = new THREE.BoxGeometry(1.3, 0.4, 0.12);
  const grilleMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a1a,
    roughness: 0.95
  });
  const grille = new THREE.Mesh(grilleGeometry, grilleMaterial);
  grille.position.set(0, 0.65, 1.75);
  busGroup.add(grille);

  // Rétroviseurs
  const mirrorGeometry = new THREE.BoxGeometry(0.25, 0.35, 0.15);
  const mirrorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x333333,
    metalness: 0.6,
    roughness: 0.4
  });
  
  const mirrorLeft = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
  mirrorLeft.position.set(-1.0, 0.9, 0.5);
  busGroup.add(mirrorLeft);
  
  const mirrorRight = mirrorLeft.clone();
  mirrorRight.position.x = 1.0;
  busGroup.add(mirrorRight);

  // Roues (4 au total)
  const wheelGeometry = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x0a0a0a,
    metalness: 0.7,
    roughness: 0.4
  });
  
  // Positions des roues: avant gauche/droite et arrière gauche/droite
  const wheelPositions = [
    { x: -0.7, z: 1.0 },
    { x: 0.7, z: 1.0 },
    { x: -0.7, z: -1.2 },
    { x: 0.7, z: -1.2 }
  ];
  
  wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(pos.x, 0.42, pos.z);
    wheel.castShadow = true;
    busGroup.add(wheel);
    
    // Jantes métalliques
    const rimGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.32, 12);
    const rimMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x888888,
      metalness: 0.95,
      roughness: 0.15
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(pos.x, 0.42, pos.z);
    busGroup.add(rim);
  });

  // Enseigne lumineuse sur le toit
  const signGeometry = new THREE.BoxGeometry(1.0, 0.18, 0.35);
  const signMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffaa00,
    emissive: 0xff8800,
    emissiveIntensity: 0.6,
    metalness: 0.3
  });
  const sign = new THREE.Mesh(signGeometry, signMaterial);
  sign.position.set(0, 2.0, -0.6);
  busGroup.add(sign);

  // Antenne sur le toit
  const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
  const antennaMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x444444,
    metalness: 0.7,
    roughness: 0.3
  });
  const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
  antenna.position.set(0.6, 2.2, 0.8);
  busGroup.add(antenna);

  busGroup.position.set(0, 0, 15);
  scene.add(busGroup);
}

function addBuilding(x, z, height, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const base = `#${(color).toString(16).padStart(6, '0')}`;
  const darker = '#333333';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = darker;
  for (let y = 20; y < 256; y += 24) {
    for (let x2 = 8; x2 < 120; x2 += 20) {
      ctx.fillStyle = Math.random() > 0.5 ? '#ffd' : '#52637f';
      ctx.fillRect(x2, y, 12, 16);
    }
  }
  ctx.fillStyle = '#222222';
  ctx.fillRect(0, 0, 128, 10);
  ctx.fillRect(0, 246, 128, 10);

  const texture = new THREE.CanvasTexture(canvas);
  texture.repeat.set(1, 1);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const building = new THREE.Mesh(
    new THREE.BoxGeometry(2, height, 2),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 })
  );
  building.castShadow = true;
  building.receiveShadow = true;
  building.position.set(x, height / 2, z);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.2, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.85 })
  );
  roof.position.set(0, height / 2 + 0.1, 0);
  building.add(roof);

  const vent = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 })
  );
  vent.position.set(0.6, height / 2 + 0.25, -0.5);
  building.add(vent);

  environmentGroup.add(building);
  return building;
}

function addTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.23, 2.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x7d4b22, roughness: 0.92 })
  );
  trunk.position.set(0, 1.05, 0);

  const leaves = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(0.95 - i * 0.1, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x39a742, roughness: 0.7 })
    );
    foliage.position.set(0, 2.2 + i * 0.5, -0.1 + i * 0.15);
    leaves.add(foliage);
  }

  const tree = new THREE.Group();
  tree.add(trunk);
  tree.add(leaves);
  tree.position.set(x, 0, z);
  environmentGroup.add(tree);
  return tree;
}

function addLamp(x, z) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.95 })
  );
  pole.position.set(0, 1.2, 0);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffd966, emissive: 0xffd966, emissiveIntensity: 0.8, roughness: 0.3 })
  );
  bulb.position.set(0, 2.2, 0);

  const lamp = new THREE.Group();
  lamp.add(pole);
  lamp.add(bulb);
  lamp.position.set(x, 0, z);
  environmentGroup.add(lamp);
  return lamp;
}

function addFence(x, z) {
  const plankMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const fence = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 1.2), plankMaterial);
    plank.position.set(0, 0.6, -0.5 + i * 0.6);
    fence.add(plank);
  }
  fence.position.set(x, 0, z);
  environmentGroup.add(fence);
  return fence;
}

function addSkyline() {
  const colors = [0xd0eefc, 0x8bc5e2, 0x96d6ff, 0xa7c4ff, 0xe6f2ff];
  for (let i = 0; i < 14; i++) {
    const width = 2 + Math.random() * 2.5;
    const height = 6 + Math.random() * 8;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 2 + Math.random() * 2),
      new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.9,
        emissive: 0xddddff,
        emissiveIntensity: 0.1
      })
    );
    building.position.set((Math.random() - 0.5) * 18, height / 2, -120 - i * 8);
    environmentGroup.add(building);
    decorPieces.push(building);
  }
}

const coins = [];
const obstacles = [];
const decorPieces = [];

function spawnCoin(z) {
  const coinGroup = new THREE.Group();

  const outer = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.08, 16, 32),
    new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15 })
  );
  outer.rotation.x = Math.PI / 2;
  coinGroup.add(outer);

  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.05, 24),
    new THREE.MeshStandardMaterial({ color: 0xfff1a8, metalness: 1, roughness: 0.1 })
  );
  inner.position.y = 0.02;
  coinGroup.add(inner);

  const detail = new THREE.Mesh(
    new THREE.CircleGeometry(0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0xffc227, metalness: 0.9, roughness: 0.2 })
  );
  detail.position.y = 0.03;
  detail.rotation.x = -Math.PI / 2;
  coinGroup.add(detail);

  coinGroup.position.set((Math.random() - 0.5) * 6, 1.2, z);
  coinGroup.castShadow = true;
  scene.add(coinGroup);
  coins.push(coinGroup);
}

function spawnObstacle(z) {
  const types = ['car'];
  const type = types[Math.floor(Math.random() * types.length)];
  let group = new THREE.Group();

  if (type === 'car') {
    const carColors = [0xff3b3b, 0x3b7aff, 0x3bff7d, 0xff3bde, 0x3bffe8];
    const color = carColors[Math.floor(Math.random() * carColors.length)];
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.9, 3),
      new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.45 })
    );
    body.castShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.5, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    roof.position.set(0, 0.7, -0.2);
    roof.castShadow = true;
    group.add(roof);

    const content = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.35, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x87CEEB, opacity: 0.85, transparent: true })
    );
    content.position.set(0, 0.55, -0.2);
    group.add(content);

    for (let i = -1; i <= 1; i += 2) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.35, 16),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(i * 0.6, 0.2, 0.9);
      wheel.castShadow = true;
      group.add(wheel);

      const wheel2 = wheel.clone();
      wheel2.position.z = -0.9;
      group.add(wheel2);
    }

    const headL = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 })
    );
    headL.position.set(-0.45, 0.4, 1.4);
    group.add(headL);
    const headR = headL.clone();
    headR.position.x = 0.45;
    group.add(headR);
  } else if (type === 'trash') {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 1.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.92 })
    );
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 })
    );
    lid.position.y = 1.2;
    group.add(lid);

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.05, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.9 })
    );
    stripe.position.set(0, 0.7, 0.35);
    group.add(stripe);
  } else {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.9, 12),
      new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.8, roughness: 0.3 })
    );
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);

    const top = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff5c5c, emissiveIntensity: 0.4, roughness: 0.3 })
    );
    top.position.y = 0.95;
    group.add(top);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.05, 12, 24),
      new THREE.MeshStandardMaterial({ color: 0xffb400, roughness: 0.4 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.35;
    group.add(ring);
  }

  group.position.x = (Math.random() - 0.5) * 6;
  group.position.z = z;
  scene.add(group);
  obstacles.push(group);
}

function spawnDecor(z) {
  const side = Math.random() > 0.5 ? -1 : 1;
  const rand = Math.random();
  if (rand < 0.25) {
    const x = side * (8.5 + Math.random() * 2.5);
    const height = 3 + Math.random() * 5;
    decorPieces.push(addBuilding(x, z, height, 0x556677 + Math.random() * 0x999999));
  } else if (rand < 0.5) {
    const x = side * (10 + Math.random() * 1.5);
    decorPieces.push(addTree(x, z + (Math.random() > 0.5 ? 2 : -2)));
  } else if (rand < 0.75) {
    const x = side * (9 + Math.random() * 0.8);
    decorPieces.push(addLamp(x, z + Math.random() * 8 - 4));
  } else {
    const x = side * (9.2 + Math.random() * 0.5);
    decorPieces.push(addFence(x, z));
  }
}

function setup() {
  addRoad();
  addBus();
  addSkyline();

  for (let i = 0; i < 15; i++) {
    spawnCoin(-20 - i * 15);
    if (i % 2 === 0) spawnObstacle(-25 - i * 15);
  }

  for (let i = 0; i < 20; i++) {
    spawnDecor(-10 - i * 20);
  }

  camera.position.set(0, 7.5, 24);
  camera.lookAt(0, 1.5, 0);
}

function updateUI() {
  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
}

function endGame() {
  if (!gameActive) return;
  gameActive = false;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('busRunnerHighScore', highScore);
  }
  document.getElementById('gameOverScreen').classList.remove('hidden');
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalLevel').textContent = level;
  document.getElementById('highScore').textContent = highScore;
}

function updateObjects() {
  const speed = gameSpeed + level * 0.03;

  coins.forEach((coin, index) => {
    coin.position.z += speed;
    coin.rotation.y += 0.1;
    if (coin.position.z > 20) {
      scene.remove(coin);
      coins.splice(index, 1);
      spawnCoin(-200);
    }
  });

  obstacles.forEach((obs, index) => {
    obs.position.z += speed;
    if (obs.position.z > 20) {
      scene.remove(obs);
      obstacles.splice(index, 1);
      spawnObstacle(-200);
    }
  });

  decorPieces.forEach((decor, index) => {
    decor.position.z += speed * 0.7;
    if (decor.position.z > 30) {
      scene.remove(decor);
      decorPieces.splice(index, 1);
      spawnDecor(-220);
    }
  });
}

function checkCollisions() {
  coins.forEach((coin, index) => {
    const distance = busGroup.position.distanceTo(coin.position);
    if (distance < 1.4) {
      score += 10;
      coinsCollected += 1;
      scene.remove(coin);
      coins.splice(index, 1);
      spawnCoin(-200);
      updateUI();
      if (coinsCollected % 5 === 0) {
        level += 1;
        gameSpeed += 0.03;
        updateUI();
      }
    }
  });

  obstacles.forEach((obs) => {
    const distance = busGroup.position.distanceTo(obs.position);
    if (distance < 1.6) {
      endGame();
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (!gameActive) {
    renderer.render(scene, camera);
    return;
  }

  busPositionX += (targetBusPositionX - busPositionX) * 0.16;
  busGroup.position.x = busPositionX;
  busGroup.rotation.z = (targetBusPositionX - busPositionX) * 0.15;
  camera.position.x = busPositionX * 0.3;
  camera.lookAt(busGroup.position.x, 1.5, busGroup.position.z);

  updateObjects();
  checkCollisions();

  const maxX = GAME_WIDTH / 2 - 1.2;
  busGroup.position.x = THREE.MathUtils.clamp(busGroup.position.x, -maxX, maxX);

  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', resize);

function setupControls() {
  document.addEventListener('keydown', (event) => {
    if (!gameActive) return;
    if (event.key === 'ArrowLeft') {
      targetBusPositionX = Math.max(targetBusPositionX - 2.5, -GAME_WIDTH / 2 + 1.2);
    }
    if (event.key === 'ArrowRight') {
      targetBusPositionX = Math.min(targetBusPositionX + 2.5, GAME_WIDTH / 2 - 1.2);
    }
  });

  let touchStartX = 0;
  document.addEventListener('touchstart', (event) => {
    if (!gameActive) return;
    touchStartX = event.touches[0].clientX;
  }, { passive: false });

  document.addEventListener('touchmove', (event) => {
    if (!gameActive) return;
    const touchX = event.touches[0].clientX;
    const diff = touchX - touchStartX;
    if (Math.abs(diff) > 30) {
      if (diff > 0) {
        targetBusPositionX = Math.min(targetBusPositionX + 2.5, GAME_WIDTH / 2 - 1.2);
      } else {
        targetBusPositionX = Math.max(targetBusPositionX - 2.5, -GAME_WIDTH / 2 + 1.2);
      }
      touchStartX = touchX;
    }
  }, { passive: false });
}

setup();
setupControls();
animate();
updateUI();
