// ============================================
// character-dialog.js
// キャラクターの吹き出し表示・セリフ進行の汎用エンジン。
// 特定のシーンや使用場所には依存しない。
//
// 主な API:
//   window.startCharacterDialog(sceneId, { onChoiceSelected })
//     - CHARACTER_SCENES から scene を取り出して表示を開始する
//     - onChoiceSelected(actionId): 選択肢が押されたときのコールバック
//   window.closeCharacterDialog()
//     - 表示中のダイアログを閉じる
// ============================================

(function characterDialogModule() {
  const DIALOG_HOST_ID = 'character-dialog-host';

  // 現在表示中のダイアログ状態 (nullなら非表示)
  let currentDialogState = null;
  // close時のフェードアウト後のhidden付与タイマーID。
  // start時にキャンセルしないと、続けて開いたダイアログが即座に隠されてしまう。
  let pendingHideTimerId = 0;

  /**
   * ダイアログ表示用の DOM 骨格を確認・生成する。
   * body 直下に「キャラ立ち絵 + 吹き出し + 選択肢エリア」の骨格を作る。
   */
  function ensureDialogHost() {
    let host = document.getElementById(DIALOG_HOST_ID);
    if (host) return host;
    host = document.createElement('div');
    host.id = DIALOG_HOST_ID;
    host.className = 'character-dialog-host hidden';
    host.innerHTML = `
      <div class="character-dialog-scene">
        <div class="character-dialog-bubble-column">
          <div class="character-dialog-bubble" id="character-dialog-bubble">
            <div class="character-dialog-name" id="character-dialog-name"></div>
            <div class="character-dialog-text" id="character-dialog-text"></div>
            <button class="character-dialog-next" id="character-dialog-next" type="button">次へ ▶</button>
          </div>
          <div class="character-dialog-choices hidden" id="character-dialog-choices"></div>
        </div>
        <div class="character-dialog-portrait-column">
          <img class="character-dialog-portrait" id="character-dialog-portrait" alt="" />
        </div>
      </div>
    `;
    document.body.appendChild(host);

    // 「次へ」ボタン
    host.querySelector('#character-dialog-next').addEventListener('click', advanceLine);
    // 吹き出し全体をクリックしても進める (「次へ」ボタン以外をタップしたときの副導線)
    host.querySelector('#character-dialog-bubble').addEventListener('click', (e) => {
      if (e.target.closest('#character-dialog-next')) return; // 二重発火防止
      advanceLine();
    });
    return host;
  }

  /**
   * ダイアログの表示を開始する。
   * @param {string} sceneId  CHARACTER_SCENES のキー
   * @param {object} options
   *   options.onChoiceSelected(actionId): 選択肢クリック時のコールバック
   *   options.context: シーンの buildLines(context) に渡すコンテキスト
   */
  window.startCharacterDialog = function(sceneId, options = {}) {
    const scene = window.CHARACTER_SCENES && window.CHARACTER_SCENES[sceneId];
    if (!scene) {
      console.warn('[character-dialog] scene not found:', sceneId);
      return;
    }
    const character = window.CHARACTER_PROFILES && window.CHARACTER_PROFILES[scene.character];
    if (!character) {
      console.warn('[character-dialog] character not found:', scene.character);
      return;
    }

    const host = ensureDialogHost();
    const portraitPath = character.portraits[scene.portrait] || character.portraits.default;

    // close時にセットされたフェードアウト後のhidden付与タイマーがまだ残っていたらキャンセル。
    // (これをやらないと、close→即start の連続呼び出しで、開いた直後にhiddenが後付けされる)
    if (pendingHideTimerId) {
      clearTimeout(pendingHideTimerId);
      pendingHideTimerId = 0;
    }

    // lines は静的配列 or buildLines(context) からの動的生成 のいずれか
    let lines = [];
    if (typeof scene.buildLines === 'function') {
      try { lines = scene.buildLines(options.context || {}); } catch (e) { lines = []; }
    } else if (Array.isArray(scene.lines)) {
      lines = scene.lines;
    }

    currentDialogState = {
      sceneId,
      lines,
      lineIndex: 0,
      choices: Array.isArray(scene.choices) ? scene.choices : [],
      characterName: character.name,
      onChoiceSelected: options.onChoiceSelected || function () {},
    };

    document.getElementById('character-dialog-portrait').src = portraitPath;
    document.getElementById('character-dialog-name').textContent = character.name;
    document.getElementById('character-dialog-choices').innerHTML = '';
    document.getElementById('character-dialog-choices').classList.add('hidden');
    document.getElementById('character-dialog-choices').classList.remove('show');
    // 前シーンで dimmed が付いていた場合は解除する (押せなくなる問題を防ぐ)
    const bubbleEl = document.getElementById('character-dialog-bubble');
    if (bubbleEl) bubbleEl.classList.remove('dimmed');

    host.classList.remove('hidden');
    // 立ち絵と吹き出しがフェードインする演出のため、次フレームで showクラス を付与
    requestAnimationFrame(() => host.classList.add('show'));

    renderCurrentLine();
  };

  /**
   * ダイアログを閉じる。
   */
  window.closeCharacterDialog = function() {
    const host = document.getElementById(DIALOG_HOST_ID);
    if (!host) return;
    host.classList.remove('show');
    // フェードアウト後に非表示にするタイマー。
    // 続けて start が呼ばれた場合はキャンセルされる (pendingHideTimerId)。
    if (pendingHideTimerId) clearTimeout(pendingHideTimerId);
    pendingHideTimerId = setTimeout(() => {
      host.classList.add('hidden');
      pendingHideTimerId = 0;
    }, 320);
    currentDialogState = null;
  };

  /**
   * 現在の行を吹き出しに描画する。
   */
  function renderCurrentLine() {
    if (!currentDialogState) return;
    const state = currentDialogState;
    const line = state.lines[state.lineIndex] || '';
    const textEl = document.getElementById('character-dialog-text');
    const nextBtn = document.getElementById('character-dialog-next');
    if (!textEl || !nextBtn) return;

    // タイプライター風にテキストを1文字ずつ表示
    textEl.textContent = '';
    let charIndex = 0;
    if (state._typingTimer) clearInterval(state._typingTimer);
    state._typingTimer = setInterval(() => {
      textEl.textContent += line.charAt(charIndex);
      charIndex += 1;
      if (charIndex >= line.length) {
        clearInterval(state._typingTimer);
        state._typingTimer = null;
      }
    }, 30);

    // 「次へ」ボタンのラベルを最後の行では変える
    const isLastLine = state.lineIndex >= state.lines.length - 1;
    nextBtn.textContent = isLastLine
      ? (state.choices.length > 0 ? 'OK ▶' : '閉じる ▶')
      : '次へ ▶';
  }

  /**
   * 次の行に進む。タイプライター中ならスキップしてすぐ全文表示。
   * 最後の行を過ぎたら選択肢を出す or ダイアログを閉じる。
   */
  function advanceLine() {
    if (!currentDialogState) return;
    const state = currentDialogState;
    const textEl = document.getElementById('character-dialog-text');
    if (!textEl) return;

    // タイプライター途中でクリックされた場合は、まず全文表示にスキップ
    if (state._typingTimer) {
      clearInterval(state._typingTimer);
      state._typingTimer = null;
      textEl.textContent = state.lines[state.lineIndex] || '';
      return;
    }

    if (state.lineIndex < state.lines.length - 1) {
      state.lineIndex += 1;
      renderCurrentLine();
      return;
    }

    // 最終行を過ぎた: 選択肢がある → 出す、無ければ閉じる
    if (state.choices.length > 0) {
      renderChoices();
    } else {
      window.closeCharacterDialog();
    }
  }

  /**
   * 選択肢ボタンを描画する。吹き出しの位置から下にポップアップさせる。
   */
  function renderChoices() {
    if (!currentDialogState) return;
    const state = currentDialogState;
    const choicesEl = document.getElementById('character-dialog-choices');
    const bubbleEl = document.getElementById('character-dialog-bubble');
    if (!choicesEl || !bubbleEl) return;

    // 吹き出しを軽くフェードアウトさせて、代わりに選択肢を出す演出
    bubbleEl.classList.add('dimmed');

    choicesEl.innerHTML = state.choices.map((choice, idx) => `
      <button class="character-dialog-choice" data-index="${idx}" type="button">
        <div class="character-dialog-choice-label">${choice.label}</div>
        ${choice.subLabel ? `<div class="character-dialog-choice-sub">${choice.subLabel}</div>` : ''}
      </button>
    `).join('');
    choicesEl.classList.remove('hidden');
    requestAnimationFrame(() => choicesEl.classList.add('show'));

    choicesEl.querySelectorAll('.character-dialog-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        const choice = state.choices[idx];
        if (!choice) return;
        try {
          state.onChoiceSelected(choice.actionId);
        } catch (e) {
          console.warn('[character-dialog] onChoiceSelected threw:', e);
        }
      });
    });
  }
})();