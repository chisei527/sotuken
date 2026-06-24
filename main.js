window.currentStageNumber = window.currentStageNumber || 0;

function routeToTarget() {
  const targetStage = typeof getCurrentMapFocusStage === 'function' ? getCurrentMapFocusStage() : 60;
  if (targetStage >= 60) {
    if (typeof switchScreen === 'function') switchScreen('stage-map-screen');
    if (typeof renderStageMap === 'function') renderStageMap();
    if (typeof centerMapCameraOnStage === 'function') centerMapCameraOnStage(targetStage, false);
  } else {
    transitionToStage(targetStage);
  }
}

async function transitionToStage(stageNumber) {
  currentStageNumber = Math.max(60, Number(stageNumber) || 60);
  switchScreen('p');
  if (typeof loadStage === 'function') {
    await loadStage(currentStageNumber);
  }
}

function switchScreen(screenId) {
  const screens = document.querySelectorAll('.screen, .a');
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

  const maxClearedStage = typeof clearedStages !== 'undefined' && clearedStages.length > 0
    ? Math.max(60, Math.max(...clearedStages.filter(s => s >= 60)) + 1)
    : 60;
  
  const focusStage = typeof getCurrentMapFocusStage === 'function' ? getCurrentMapFocusStage() : 60;

  if (links && typeof drawMapLinks === 'function') {
    drawMapLinks(links, []);
  }

  nodeRoot.innerHTML = '';

  for (let stage = 60; stage <= maxClearedStage; stage += 1) {
    const isCleared = typeof clearedStages !== 'undefined' && clearedStages.includes(stage);
    const isUnlocked = (typeof unlockAll !== 'undefined' && unlockAll) || (typeof unlockedLimit !== 'undefined' && stage <= unlockedLimit);
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
        if (typeof loadStage === 'function') await loadStage(stage);
      };
    } else {
      node.disabled = true;
    }

    nodeRoot.appendChild(node);
  }

  const clearCount = typeof clearedStages !== 'undefined' ? clearedStages.filter((s) => s >= 60).length : 0;
  if (progressLabel) progressLabel.textContent = `${clearCount} CLEAR`;
  if (overallBar) overallBar.style.display = 'none';
  if (progressText) progressText.textContent = `${clearCount} クリア`;

  requestAnimationFrame(() => {
    if (typeof centerMapCameraOnCurrentStage === 'function') {
      centerMapCameraOnCurrentStage(false);
    }
  });
}