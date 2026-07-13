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
            <button class="character-dialog-next" id="character-dialog-next" type="button" aria-label="次へ">次へ ▶</button>
          </div>
          <div class="character-dialog-tap-hint" id="character-dialog-tap-hint">タップして進む</div>
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
    // ホスト全体 (立ち絵・背景含む) をタップしても進める。
    // 制限:
    //   - 選択肢表示中 (bubble に dimmed クラス) は無効
    //   - 選択肢ボタン (choices エリア内) のクリックは除外 (選択が発火するように)
    //   - 「次へ」ボタン自体のクリックは除外 (二重発火防止)
    host.addEventListener('click', (e) => {
      if (e.target.closest('#character-dialog-next')) return;
      if (e.target.closest('#character-dialog-choices')) return;
      const bubble = document.getElementById('character-dialog-bubble');
      if (bubble && bubble.classList.contains('dimmed')) return;
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
      // シーンのデフォルト話者情報 (lines[i] が文字列のときに使われる)
      defaultCharacterKey: scene.character,
      defaultPortraitKey: scene.portrait,
      // 選択肢がなく nextActionId が指定されているシーンでは、最後の行タップで
      // その actionId を発火してシーンチェーンする
      nextActionId: scene.nextActionId || null,
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

    // セッション内で初めてのキャラダイアログなら、「タップして進む」ヒント文を表示する。
    // advanceLine が呼ばれたら (＝1回でも進んだら) このクラスは外れて、以降表示されない。
    if (!window._characterDialogTapHintSeen) {
      host.classList.add('is-first-visit');
    }

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
    const rawLine = state.lines[state.lineIndex];

    // line は string または { character, portrait, text } オブジェクト
    // オブジェクトの場合は話者/立ち絵を一時的に切り替える
    let text = '';
    let characterKey = state.defaultCharacterKey;
    let portraitKey = state.defaultPortraitKey;
    if (rawLine && typeof rawLine === 'object') {
      text = String(rawLine.text || '');
      if (rawLine.character) characterKey = rawLine.character;
      if (rawLine.portrait) portraitKey = rawLine.portrait;
    } else {
      text = String(rawLine || '');
    }

    // 話者情報を適用 (立ち絵・名前を切り替え)
    const character = window.CHARACTER_PROFILES && window.CHARACTER_PROFILES[characterKey];
    if (character) {
      const portraitPath = character.portraits[portraitKey] || character.portraits.default;
      const portraitEl = document.getElementById('character-dialog-portrait');
      const nameEl = document.getElementById('character-dialog-name');
      if (portraitEl && portraitEl.src.indexOf(portraitPath) === -1) portraitEl.src = portraitPath;
      if (nameEl) nameEl.textContent = character.name;
    }

    const textEl = document.getElementById('character-dialog-text');
    const nextBtn = document.getElementById('character-dialog-next');
    if (!textEl || !nextBtn) return;

    // タイプライター風にテキストを1文字ずつ表示
    textEl.textContent = '';
    let charIndex = 0;
    if (state._typingTimer) clearInterval(state._typingTimer);
    state._typingTimer = setInterval(() => {
      textEl.textContent += text.charAt(charIndex);
      charIndex += 1;
      if (charIndex >= text.length) {
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

    // 「タップして進む」ヒント文はセッション中に1回でも進めたら以降表示しない
    if (!window._characterDialogTapHintSeen) {
      window._characterDialogTapHintSeen = true;
      const host = document.getElementById(DIALOG_HOST_ID);
      if (host) host.classList.remove('is-first-visit');
    }

    // タイプライター途中でクリックされた場合は、まず全文表示にスキップ
    if (state._typingTimer) {
      clearInterval(state._typingTimer);
      state._typingTimer = null;
      // rawLine が文字列でもオブジェクトでも text だけを取り出す
      const raw = state.lines[state.lineIndex];
      const fullText = (raw && typeof raw === 'object') ? String(raw.text || '') : String(raw || '');
      textEl.textContent = fullText;
      return;
    }

    if (state.lineIndex < state.lines.length - 1) {
      state.lineIndex += 1;
      renderCurrentLine();
      return;
    }

    // 最終行を過ぎた: 選択肢がある → 出す
    // 選択肢が無く nextActionId がある → その actionId を発火 (シーンチェーン)
    // どちらもなければダイアログを閉じる
    if (state.choices.length > 0) {
      renderChoices();
    } else if (state.nextActionId) {
      try {
        state.onChoiceSelected(state.nextActionId);
      } catch (e) {
        console.warn('[character-dialog] onChoiceSelected (nextActionId) threw:', e);
      }
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
    // 誤タップ防止: 選択肢が出現してから 400ms は反応させない。
    // 吹き出しを進めるための連打が選択肢に届いても、この期間はクリックされない。
    choicesEl.classList.add('is-locked');
    requestAnimationFrame(() => choicesEl.classList.add('show'));
    setTimeout(() => choicesEl.classList.remove('is-locked'), 400);

    choicesEl.querySelectorAll('.character-dialog-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        // is-locked 期間中のクリックは無視
        if (choicesEl.classList.contains('is-locked')) return;
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