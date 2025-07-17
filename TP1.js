let baseSpacing = 60;
let highDensitySpacing = 20; 
let margin = 50;
let mic, fft;
let zoom = 1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
let paletteBright = [];
let paletteMuted = [];
let currentPalette;
let broken = false;
let savedParticles = []; 

let clapCooldown = 0;
const CLAP_COOLDOWN_FRAMES = 30;

let prevOverallEnergy = 0;
const ENERGY_DELTA_THRESHOLD = 20;
const OVERALL_ENERGY_MIN = 80;
const HIGH_FREQ_MIN = 100;

// Variables mejoradas para reinicio vocal
let highFreqFrames = 0;
const HIGH_FREQ_THRESHOLD = 5; // 0.5 segundos a 60fps
const HIGH_FREQ_ENERGY_THRESHOLD = 80; // Más bajo para mejor detección
const VOICE_RANGE_START = 2000;
const VOICE_RANGE_END = 5000; // Rango más específico para voces

function setup() {
  createCanvas(800, 600);
  noStroke();
  colorMode(HSB, 360, 100, 100);
  mic = new p5.AudioIn();
  mic.start();
  fft = new p5.FFT();
  fft.setInput(mic);

  // Paleta brillante
  paletteBright = [
    [173, 83, 90],   // Turquesa
[210, 83, 87],   // Azul cielo
[2, 81, 47],     // Bordó oscuro
[219, 51, 90],   // Celeste
[359, 84, 78],   // Rojo
[338, 29, 99],   // Rosa
[41, 92, 97],    // Mostaza
[15, 93, 94],    // Naranja fuerte
[52, 88, 100],   // Amarillo
[115, 66, 60],   // Verde oscuro
[223, 83, 65]    // Azul oscuro
  ];

  // Paleta opaca
  paletteMuted = [
    [0, 40, 60], [30, 35, 55], [60, 30, 60],
    [180, 40, 65], [240, 40, 55], [300, 35, 50], [330, 35, 50]
  ];

  currentPalette = paletteBright;
  
  console.log("Di 'iiii' sostenido para reiniciar");
}

function draw() {
  background(255);
  let spectrum = fft.analyze();
  let lowFreq = fft.getEnergy(50, 300);
  let highFreq = fft.getEnergy(VOICE_RANGE_START, VOICE_RANGE_END); // Rango ajustado
  let overallEnergy = fft.getEnergy(20, 10000);

  // Debug en consola
  console.log(`Agudas: ${highFreq} | Reinicio: ${highFreqFrames}/${HIGH_FREQ_THRESHOLD}`);
  
  let deltaEnergy = overallEnergy - prevOverallEnergy;
  prevOverallEnergy = overallEnergy;

  // Detección de palmada (cambio de paleta)
  if (deltaEnergy > ENERGY_DELTA_THRESHOLD && overallEnergy > OVERALL_ENERGY_MIN && 
      lowFreq > HIGH_FREQ_MIN && clapCooldown == 0) {
    clapCooldown = CLAP_COOLDOWN_FRAMES;
    currentPalette = (currentPalette === paletteBright) ? paletteMuted : paletteBright;
    console.log("Paleta cambiada");
  }

  if (clapCooldown > 0) clapCooldown--;

  // Detección mejorada de reinicio vocal
  if (highFreq > HIGH_FREQ_ENERGY_THRESHOLD) {
    highFreqFrames++;
    console.log(`Detección vocal (${highFreqFrames}/${HIGH_FREQ_THRESHOLD})`);
    
    if (highFreqFrames >= HIGH_FREQ_THRESHOLD && broken) {
      resetVisualization();
    }
  } else {
    highFreqFrames = max(0, highFreqFrames - 2); // Decaimiento gradual
  }

  // Lógica de zoom y rotura
  if (!broken && overallEnergy > 40) {
    let zoomDelta = map(lowFreq, 0, 255, -0.25, 0) + map(highFreq, 0, 255, 0, 0.25);
    zoom = lerp(zoom, constrain(zoom + zoomDelta, ZOOM_MIN, ZOOM_MAX), 0.15);

    if (zoom <= ZOOM_MIN + 0.01 || overallEnergy > 230) {
      triggerBreak();
    }
  }

  // Dibujado
  if (!broken) drawGrid();
  else drawParticles();
}

function drawGrid() {
  push();
  translate(width / 2, height / 2);
  scale(zoom);
  translate(-width / 2, -height / 2);

  let extra = 2;
  let cols = ceil(width / baseSpacing / zoom) + extra;
  let rows = ceil(height / baseSpacing / zoom) + extra;
  let offsetX = width / 2 - (cols * baseSpacing) / 2;
  let offsetY = height / 2 - (rows * baseSpacing) / 2;

  randomSeed(1234);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = offsetX + i * baseSpacing;
      let y = offsetY + j * baseSpacing;
      let c = random(currentPalette);
      fill(c[0], c[1], c[2]);
      ellipse(x, y, 30, 30);
    }
  }
  pop();
}

function drawParticles() {
  for (let p of savedParticles) {
    fill(p.c[0], p.c[1], p.c[2]);
    noStroke();
    ellipse(p.pos.x, p.pos.y, p.size, p.size);
  }
}

function triggerBreak() {
  broken = true;
  savedParticles = [];

  push();
  translate(width / 2, height / 2);
  scale(zoom);
  translate(-width / 2, -height / 2);

  let extra = 4; 
  let cols = ceil(width / highDensitySpacing / zoom) + extra;
  let rows = ceil(height / highDensitySpacing / zoom) + extra;
  let offsetX = width / 2 - (cols * highDensitySpacing) / 2;
  let offsetY = height / 2 - (rows * highDensitySpacing) / 2;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = offsetX + i * highDensitySpacing;
      let y = offsetY + j * highDensitySpacing;
      let c = random(currentPalette);

      let dispersion = 2;
      let overlapX = random(-8, 8);
      let overlapY = random(-8, 8);

      for (let k = 0; k < 3; k++) {
        savedParticles.push({
          pos: createVector(
            x + random(-dispersion, dispersion) + overlapX,
            y + random(-dispersion, dispersion) + overlapY
          ),
          c: c,
          size: random(15, 25)
        });
      }
    }
  }
  pop();
}

function resetVisualization() {
  broken = false;
  zoom = 1;
  highFreqFrames = 0;
  console.log("¡Reiniciado con voz!");
  
  // Feedback visual temporal
  background(0, 0, 100);
  fill(0);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("¡REINICIADO!", width/2, height/2);
}
