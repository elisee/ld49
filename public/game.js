import pageElts from "./pageElts.js";
import { $, $show, $hide, randomInt, randomFloat, pick, lerp } from "./utils.js";
import gameStats from "./gameStats.js";
import * as gameOver from "./gameOver.js";

const canvasElt = $("canvas");
const ctx = canvasElt.getContext("2d");

canvasElt.addEventListener("pointerdown", onPointerDown);
canvasElt.addEventListener("pointermove", onPointerMove);
canvasElt.addEventListener("pointerup", onPointerUp);

const startProgressValue = 5000;
const maxProgressValue = 10000;

const columnCount = 10;
const rowCount = 10;
const railStartRow = 5;
const cellSize = 50;
const boardSize = cellSize * 10;
const fullSize = 600;
const boardMargin = (fullSize - boardSize) / 2;
let renderScale = 1;

const data = {
  level: 0,
  isGameOver: false,
  progress: { value: 0, decaySpeed: 0, lerpValue: 0 },
  totalTicks: 0,
  drops: [],
  rails: [],
  spawnDropDelay: 0,
  gameOverFade: 0,
  badShake: 0,
  goodFlash: 0,
  levelUpFlash: 0,
  hoveredRailIndex: -1,
  drag: null,
};

export function enterGame() {
  $show(pageElts.game);
  animFrame = requestAnimationFrame(animateGame);

  data.level = 0;
  data.isGameOver = false;
  data.progress.value = startProgressValue;
  data.totalTicks = 0;
  data.drops.length = 0;
  data.rails.length = 0;
  data.spawnDropDelay = 0;
  applyLevelProgress();
  data.gameOverFade = 0;
  data.badShake = 0;
  data.goodFlash = 0;
  data.levelUpFlash = 0;
  data.hoveredRailIndex = -1;
  data.drag = null;

  let fill = 1500;
  for (let i = 0; i < 4; i++) {
    const offset = randomInt(0, 500);
    const sections = [];
    const sectionSize = randomInt(80, 160);
    fill -= sectionSize;
    sections.push([sectionSize, 0]);
    data.rails.push({ offset, sections });
  }

  // TODO: distribute the remaining fill
}

function markGameOver() {
  data.progress.value = 0;
  data.isGameOver = true;
  data.gameOverFade = 30;
  data.badShake = 1000;
  gameStats.level = data.level;
  gameStats.totalTicks = data.totalTicks;
}

function goToGameOver() {
  cancelAnimationFrame(animFrame);
  animFrame = null;
  $hide(pageElts.game);
  gameOver.enterGameOver();
}

let animFrame = null;
let tickAcc = 0;
const tickDuration = 1 / 30;

let lastTime = null;
function animateGame(time) {
  animFrame = requestAnimationFrame(animateGame);
  const dt = (time - (lastTime ?? time)) / 1000;
  lastTime = time;

  tickAcc += dt;
  if (tickAcc >= tickDuration) { tickAcc %= tickDuration; tick(); }

  const { width, height } = document.body.getBoundingClientRect();
  canvasElt.width = width * devicePixelRatio;
  canvasElt.height = height * devicePixelRatio;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const screenSize = Math.min(width, height);
  renderScale = screenSize / fullSize;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  // ctx.scale(devicePixelRatio, devicePixelRatio); ???
  ctx.scale(renderScale, renderScale);
  ctx.translate(-fullSize / 2, -fullSize / 2);

  ctx.fillStyle = "#696a6a";
  ctx.fillRect(0, 0, fullSize, fullSize);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 36px Arial";

  if (data.goodFlash > 0) {
    ctx.fillStyle = `rgba(153, 229, 80, ${data.goodFlash / 2}%)`;
    ctx.fillRect(0, 0, fullSize, fullSize);
  }

  ctx.save();
  ctx.translate(boardMargin, boardMargin);

  if (data.badShake > 0) {
    const angle = randomFloat(0, Math.PI * 2);
    const radius = Math.min(10, data.badShake / 50);
    ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }

  ctx.save();
  if (data.levelUpFlash > 0) {
    const scale = 1 + (data.levelUpFlash / 1000);
    ctx.translate(boardSize / 2, boardSize / 2);
    ctx.scale(scale, scale);
    ctx.translate(-boardSize / 2, -boardSize / 2);
  }

  ctx.fillStyle = "#3f3f74";
  ctx.fillRect(0, 0, boardSize, boardSize);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(boardSize, 0);
  ctx.lineTo(boardSize, boardSize);
  ctx.lineTo(0, boardSize);
  ctx.closePath();
  ctx.clip();

  if (data.hoveredRailIndex !== -1) {
    ctx.save();
    ctx.translate(0, (railStartRow + data.hoveredRailIndex) * cellSize);
    ctx.fillStyle = "rgba(255, 255, 255, 10%)";
    ctx.fillRect(0, 0, boardSize, cellSize);
    ctx.restore();
  }

  ctx.fillStyle = "#222034";
  for (const [i, rail] of data.rails.entries()) {
    ctx.save();
    ctx.translate(rail.offset, (i + railStartRow) * cellSize);
    for (const [size, space] of rail.sections) {
      ctx.fillRect(0, 2, size, cellSize - 4);
      ctx.fillRect(-boardSize, 2, size, cellSize - 4);
      ctx.translate(size + space, 0);
    }
    ctx.restore();
  }

  ctx.fillStyle = "#fff";
  for (const drop of data.drops) {
    ctx.save();
    ctx.translate(drop.x, drop.y);
    if (drop.collected) {
      const scale = 2 - drop.collectPop / 100;
      ctx.scale(scale, scale);
      ctx.globalAlpha = drop.collectPop / 100;
    }
    ctx.fillText(drop.symbol, 0, 0);
    ctx.restore();
  }

  ctx.restore();

  const levelBarHeight = 50;
  ctx.fillStyle = "#323c39";
  ctx.fillRect(boardMargin, fullSize - levelBarHeight, boardSize, levelBarHeight);

  const valueX = boardSize * data.progress.value / maxProgressValue
  const lerpValueX = boardSize * data.progress.lerpValue / maxProgressValue;

  if (lerpValueX < valueX) {
    ctx.fillStyle = "#fbf236";
    ctx.fillRect(boardMargin, fullSize - levelBarHeight, lerpValueX, levelBarHeight);
    ctx.fillStyle = "#37946e";
    ctx.fillRect(boardMargin + lerpValueX, fullSize - levelBarHeight, valueX - lerpValueX, levelBarHeight);
  } else {
    ctx.fillStyle = "#fbf236";
    ctx.fillRect(boardMargin, fullSize - levelBarHeight, valueX, levelBarHeight);
    ctx.fillStyle = "#ac3232";
    ctx.fillRect(boardMargin + valueX, fullSize - levelBarHeight, lerpValueX - valueX, levelBarHeight);
  }

  const progressText = `${(data.progress.value / 100).toFixed(1)}%`;
  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px Arial";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 4;
  ctx.strokeText(progressText, fullSize / 2, fullSize - levelBarHeight / 2);
  ctx.fillText(progressText, fullSize / 2, fullSize - levelBarHeight / 2);

  ctx.textAlign = "left";
  const levelText = `LVL ${data.level + 1}`;
  ctx.strokeText(levelText, boardMargin, boardMargin / 2);
  ctx.fillText(levelText, boardMargin, boardMargin / 2);

  if (data.levelUpFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${data.levelUpFlash / 4}%)`;
    ctx.fillRect(0, 0, fullSize, fullSize);

    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.translate(fullSize / 2, fullSize / 2);
    const scale = 2 - data.levelUpFlash / 200;
    ctx.scale(scale, scale);
    ctx.textAlign = "center";
    ctx.globalAlpha = data.levelUpFlash / 100;
    ctx.strokeText("LEVEL UP!", 0, 0);
    ctx.fillText("LEVEL UP!", 0, 0);
    ctx.restore();
  }

  if (data.isGameOver) {
    ctx.fillStyle = `rgba(0, 0, 0, ${(100 - data.gameOverFade)}%)`;
    ctx.fillRect(0, 0, fullSize, fullSize);
  }

  ctx.restore();
}

function tick() {
  data.badShake = Math.max(0, data.badShake - 100);
  data.goodFlash = Math.max(0, data.goodFlash - 20);
  data.levelUpFlash = Math.max(0, data.levelUpFlash - 15);

  for (const drop of data.drops) drop.y += !drop.collected ? 5 : -10;

  if (data.isGameOver) {
    if (data.gameOverFade <= 0) goToGameOver();
    data.gameOverFade -= 1;
    data.progress.lerpValue = lerp(data.progress.lerpValue, data.progress.value, 0.25);
    return;
  }

  data.totalTicks++;

  data.progress.value -= data.progress.decaySpeed;
  if (data.progress.value <= 0) { markGameOver(); return; }

  data.progress.lerpValue = lerp(data.progress.lerpValue, data.progress.value, 0.25);

  if (data.drag != null) {
    const rail = data.rails[data.hoveredRailIndex];
    rail.offset = data.drag.startOffset - data.drag.startX + data.drag.currentX;
    while (rail.offset > boardSize) rail.offset -= boardSize;
    while (rail.offset < 0) rail.offset += boardSize;
  }

  function rectsIntersect(r1, r2) {
    return !(r2.left > r1.right ||
      r2.right < r1.left ||
      r2.top > r1.bottom ||
      r2.bottom < r1.top);
  }

  for (const drop of data.drops) {
    if (drop.collected) {
      drop.collectPop = Math.max(0, drop.collectPop - 25);
    } else if (drop.y >= boardSize) {
      data.progress.value += drop.score;
      if (drop.score < 0) data.badShake -= drop.score;
      else data.goodFlash = 100;
      drop.collected = true;
      drop.collectPop = 100;
    } else {
      const dropRect = new DOMRect(drop.x - 10, drop.y - 10, 20, 20);

      for (const [i, rail] of data.rails.entries()) {
        const railY = (railStartRow + i) * cellSize;
        let sectionX = rail.offset;
        for (const [size, space] of rail.sections) {
          const railRect1 = new DOMRect(sectionX, railY, size, cellSize);
          const railRect2 = new DOMRect(sectionX - boardSize, railY, size, cellSize);

          if (rectsIntersect(dropRect, railRect1) || rectsIntersect(dropRect, railRect2)) {
            drop.collected = true;
            drop.collectPop = 100;
            break;
          }

          sectionX += space;
        }
        if (drop.collected) break;
      }
    }
  }
  data.drops = data.drops.filter(x => !x.collected || x.collectPop > 0);

  if (data.progress.value <= 0) { markGameOver(); return; }
  if (data.progress.value >= maxProgressValue) { applyLevelProgress(); }

  data.spawnDropDelay--;
  if (data.spawnDropDelay <= 0) spawnDrop();
}

function spawnDrop() {
  data.spawnDropDelay = randomInt(10, 30);

  const isBonus = randomInt(0, 2) <= 1;
  const bonuses = [
    [500, "🍒"],
    [800, "🍓"],
    [1000, "🍊"],
    [1200, "🍏"],
    [1600, "🍉"],
    [2000, "🌌"],
    [3000, "🔔"],
    [5000, "🔑"]];

  let bonus = [-500, "💀"];
  if (isBonus) bonus = pick(bonuses);

  const drop = {
    score: bonus[0],
    symbol: bonus[1],
    x: cellSize / 2 + randomInt(0, columnCount - 1) * cellSize,
    y: -cellSize / 2,
    collected: false,
    collectPop: 0,
  };

  data.drops.push(drop);
}

function applyLevelProgress() {
  while (data.progress.value >= maxProgressValue) {
    data.progress.value = startProgressValue + (data.progress.value - maxProgressValue);
    data.level++;
  }

  data.progress.decaySpeed = Math.min(3 + data.level * 2, 100);
  data.progress.lerpValue = 0;
  data.badShake = 0;
  data.goodFlash = 0;
  data.levelUpFlash = 100;
}

function updateHoveredRail(pointerY) {
  const railIndex = Math.floor((pointerY / renderScale - boardMargin) / cellSize) - railStartRow;
  if (railIndex >= 0 && railIndex < data.rails.length) {
    data.hoveredRailIndex = railIndex;
  } else {
    data.hoveredRailIndex = -1;
  }
}

function updateCursor() {
  canvasElt.style.cursor = data.hoveredRailIndex !== -1 ? (data.drag != null ? "grabbing" : "grab") : "";
}

function onPointerDown(event) {
  if (!event.isPrimary) return;

  updateHoveredRail(event.y);
  if (data.hoveredRailIndex === -1) return;

  const rail = data.rails[data.hoveredRailIndex];

  const gameX = event.x / renderScale;
  data.drag = { startOffset: rail.offset, startX: gameX, currentX: gameX };
  updateCursor();
}

function onPointerMove(event) {
  if (!event.isPrimary) return;

  if (data.drag == null) {
    updateHoveredRail(event.y);
    updateCursor();
  } else {
    data.drag.currentX = event.x / renderScale;
  }
}

function onPointerUp(event) {
  if (!event.isPrimary) return;
  data.drag = null;
}