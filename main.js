function routeToTarget() {
  const targetStage = getCurrentMapFocusStage();
  if (targetStage >= 60) {
    switchScreen('stage-map-screen');
    renderStageMap();
    centerMapCameraOnStage(targetStage, false);
  } else {
    transitionToStage(targetStage);
  }
}

async function transitionToStage(stageNumber) {
  currentStageNumber = Math.max(60, Number(stageNumber) || 60);
  switchScreen('p');
  await loadStage(currentStageNumber);
}

function switchScreen(screenId) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach((screen) => {
    if (screen.id === screenId) {
      screen.classList.add('b');
    } else {
      screen.classList.remove('b');
    }
  });
}

async function renderStageMap() {
  const nodeRoot = document.getElementById('map-nodes');
  const links = document.getElementById('map-links');
  const mapWorld = document.getElementById('map-world');
  const progressLabel = document.getElementById('map-progress');
  const overallBar = document.getElementById('overall-progress');
  const progressText = document.getElementById('progress-text');
  if (!nodeRoot || !mapWorld) return;

  const maxClearedStage = Math.max(60, Math.max(...clearedStages.filter(s => s >= 60)) + 1);
  const focusStage = getCurrentMapFocusStage();

  if (links) {
    drawMapLinks(links, []);
  }

  nodeRoot.innerHTML = '';

  for (let stage = 60; stage <= maxClearedStage; stage += 1) {
    const isCleared = clearedStages.includes(stage);
    const isUnlocked = unlockAll || stage <= unlockedLimit;
    const isFocus = stage === focusStage;

    const node = document.createElement('button');
    node.type = 'button';
    node.className = `map-node ${isCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}${isFocus ? ' current' : ''}`;
    node.dataset.stage = String(stage);

    const number = document.createElement('div');
    number.className = 'map-node-number';
    number.textContent = String(stage);
    node.appendChild(number);

    const label = document.createElement('div');
    label.className = 'map-node-label';
    label.textContent = `STAGE ${stage}`;
    node.appendChild(label);

    if (isUnlocked) {
      node.onclick = async () => {
        currentStageNumber = stage;
        switchScreen('p');
        await loadStage(stage);
      };
    } else {
      node.disabled = true;
    }

    nodeRoot.appendChild(node);

    if (stage < unlockedLimit) {
      const road = document.createElement('div');
      road.className = `map-road ${isCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}`;
      nodeRoot.appendChild(road);
    }
  }

  const clearCount = clearedStages.filter((s) => s >= 60).length;
  if (progressLabel) progressLabel.textContent = `${clearCount} CLEAR`;
  if (overallBar) overallBar.style.display = 'none';
  if (progressText) progressText.textContent = `${clearCount} クリア`;

  requestAnimationFrame(() => {
    centerMapCameraOnCurrentStage(false);
  });
}
