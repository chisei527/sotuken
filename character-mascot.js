// ============================================
// character-mascot.js
// パル (ヒッパルコス) を下のボタン列の右端に座らせ、
// クリックすると上にメニューを開く。
//
// 置き場所について:
//   以前は画面の右下に大きく浮かせていたので、ゴミ箱・ズームボタン・
//   盤面の横スクロールバーに重なっていた。
//   いまは下のボタン列(.action-bar-container)の中に入れてあるので、
//   作業エリアには一切かぶらない。開いたメニューだけが一時的に盤面に重なる。
//
// 主な API:
//   window.showCharacterMascot()    パルを表示する (プレイ画面遷移時に呼ぶ)
//   window.hideCharacterMascot()    パルを非表示にする (画面離脱時に呼ぶ)
//   window.toggleCharacterMascotMenu()  メニューを開閉する
// ============================================

(function characterMascotModule() {
  const HOST_ID = 'character-mascot-host';

  // メニューの項目定義
  // key: 内部識別子、label: 表示名、onSelect: クリック時の関数
  // 並び順がそのまま上からの並びになる。いちばん下＝パルに近いものが押しやすい。
  const MENU_ITEMS = [
    {
      // パルにしかできない仕事。答えは言わず「どこまで合っているか」だけを返す。
      // ヒント（次の一手を教える）とは役割が違う。
      key: 'check',
      label: 'いまの式を見て',
      subLabel: 'どこまで合ってる？',
      primary: true,
      onSelect: () => {
        if (typeof window.runPalProgressCheck === 'function') window.runPalProgressCheck();
      },
    },
    {
      key: 'hint',
      label: 'ヒント',
      subLabel: 'OFF',
      onSelect: () => {
        const btn = document.getElementById('btn-hint');
        if (btn) btn.click();
        refreshMenuState();
      },
    },
    {
      key: 'explanation',
      label: '三角関数の解説',
      subLabel: '基礎と公式',
      onSelect: () => {
        if (typeof window.openMascotExplanationSubmenu === 'function') {
          window.openMascotExplanationSubmenu();
        }
      },
    },
    {
      key: 'minimize',
      label: '小さくする',
      subLabel: 'パルを控えめに',
      onSelect: () => {
        if (typeof window.minimizeCharacterMascot === 'function') {
          window.minimizeCharacterMascot(true);
        }
      },
    },
  ];

  /**
   * radial menu の各項目の状態表示を、いまのヒントの段階に合わせて更新する。
   * ヒントは 0〜3 の段階制（window.hintLevel）。
   */
  function refreshMenuState() {
    const level = window.hintLevel || 0;
    const max = window.HINT_MAX_LEVEL || 3;

    const hintItem = document.querySelector('.character-mascot-menu-item[data-key="hint"]');
    if (hintItem) {
      hintItem.classList.toggle('is-active', level > 0);
      const sub = hintItem.querySelector('.character-mascot-menu-sublabel');
      if (sub) sub.textContent = level > 0 ? `${level}/${max}` : 'OFF';
    }
  }
  // 他所からも呼べるように公開しておく (ヘッダートグルの直接操作など)
  window.refreshCharacterMascotMenuState = refreshMenuState;

  /**
   * パルの DOM 骨格 (立ち絵ボタン + radial menu) を生成する。
   * 二重生成防止のため、既に存在すればそれを返す。
   */
  function ensureMascotHost() {
    let host = document.getElementById(HOST_ID);
    if (host) return host;

    host = document.createElement('div');
    host.id = HOST_ID;
    host.className = 'character-mascot-host hidden';

    // パル本体 (クリック可能な立ち絵)
    const palButton = document.createElement('button');
    palButton.type = 'button';
    palButton.className = 'character-mascot-pal';
    palButton.title = 'パルを呼ぶ';
    const palImg = document.createElement('img');
    palImg.alt = 'パル';
    palImg.src = 'asset/ヒッパルコス 通常.webp';
    palImg.draggable = false;
    palButton.appendChild(palImg);
    palButton.addEventListener('click', () => {
      // 縮小アイコン状態のときは、まず元サイズに戻してから radial menu を展開
      if (host.classList.contains('mini')) {
        if (typeof window.expandCharacterMascot === 'function') {
          window.expandCharacterMascot(true);
          // 展開後に radial menu を開く (少し遅延させて拡大アニメと重ならないように)
          setTimeout(() => window.toggleCharacterMascotMenu(true), 250);
        }
        return;
      }
      window.toggleCharacterMascotMenu();
    });
    host.appendChild(palButton);

    // メニュー (パルの上に開く縦のカード)
    const menu = document.createElement('div');
    menu.className = 'character-mascot-menu';
    MENU_ITEMS.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `character-mascot-menu-item${item.primary ? ' is-primary' : ''}`;
      btn.dataset.key = item.key;
      btn.innerHTML = `
        <div class="character-mascot-menu-label">${item.label}</div>
        ${item.subLabel ? `<div class="character-mascot-menu-sublabel">${item.subLabel}</div>` : ''}
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        item.onSelect();
        window.toggleCharacterMascotMenu(false); // 選択後は閉じる
      });
      menu.appendChild(btn);
    });
    host.appendChild(menu);

    // 下のボタン列の中に座らせる。無ければ body に置く（画面構成が変わっても壊れないように）。
    const bar = document.querySelector('.action-bar-container');
    (bar || document.body).appendChild(host);
    host.classList.toggle('in-action-bar', !!bar);

    // メニューを開いているときに host 外側をクリックしたら閉じる
    document.addEventListener('click', (e) => {
      if (!host.classList.contains('menu-open')) return;
      if (host.contains(e.target)) return;
      window.toggleCharacterMascotMenu(false);
    });

    // 下のボタン列のヒントボタンが radial menu を介さず直接押された場合も
    // menu 側の状態表示を更新する
    const hintBtn = document.getElementById('btn-hint');
    if (hintBtn) hintBtn.addEventListener('click', () => setTimeout(refreshMenuState, 0));

    return host;
  }

  // パル縮小状態の localStorage キー
  const PAL_MINI_KEY = 'pal_mini';

  /**
   * 「小さくする」を選んだことがあるかどうか。
   *   'true'  → 縮小 (ユーザー明示選択)
   *   それ以外 → 通常
   * 以前は幅が 1024px 未満なら自動で縮小していたが、パルを下のボタン列へ
   * 移してもともと小さくなったうえ、「いまの式を見て」の入口でもあるので、
   * 勝手に縮めない。狭い画面での縮小は CSS のメディアクエリが受け持つ。
   */
  function shouldStartInMini() {
    return window.AppStorage.getRaw(PAL_MINI_KEY) === 'true';
  }

  /**
   * パルを縮小アイコン化する。radial menu が開いていたら閉じる。
   * @param {boolean} persist  ユーザー明示選択なら true (localStorage に保存)
   */
  window.minimizeCharacterMascot = function(persist) {
    const host = ensureMascotHost();
    host.classList.remove('menu-open');
    host.classList.add('mini');
    if (persist) {
      window.AppStorage.setRaw(PAL_MINI_KEY, 'true');
    }
  };

  /**
   * パルを通常サイズに戻す。
   * @param {boolean} persist  ユーザー明示選択なら true (localStorage に保存)
   */
  window.expandCharacterMascot = function(persist) {
    const host = ensureMascotHost();
    host.classList.remove('mini');
    if (persist) {
      window.AppStorage.setRaw(PAL_MINI_KEY, 'false');
    }
  };

  window.showCharacterMascot = function() {
    const host = ensureMascotHost();
    host.classList.remove('hidden');
    // 初回表示時: localStorage or 画面幅で初期状態を決定
    if (shouldStartInMini()) {
      host.classList.add('mini');
    } else {
      host.classList.remove('mini');
    }
    // 表示のタイミングでガイド/ヒントの現状を menu に反映
    refreshMenuState();
  };

  // ============================================
  // 三角関数の解説 サブメニュー
  // radial menu 「三角関数の解説」 → 基礎/公式の6項目からユーザーに選ばせる
  // 選択された項目に対応する解説を、パルの解説シーンで表示する。
  // ============================================
  const SUBMENU_ID = 'character-mascot-submenu';

  // 解説項目の一覧。entryId は explanations.js のタブ ID (basics_XX / formula_N)
  // requiresFormulaId が付いている項目は、その公式が解放されるまで出さない
  // （まだ習っていない公式の解説が最初から並んでいると迷うため）。
  const EXPLANATION_ENTRIES = [
    { entryId: 'basics_intro',           label: '基礎①', title: '三角関数とは' },
    { entryId: 'basics_unit_circle',     label: '基礎②', title: '単位円で理解する' },
    { entryId: 'basics_special_values',  label: '基礎③', title: '代表的な角度の値' },
    { entryId: 'formula_1',              label: '公式①', title: '三平方の関係' },
    { entryId: 'formula_2',              label: '公式②', title: 'tan の定義' },
    { entryId: 'formula_3',              label: '公式③', title: 'tan の三平方関係' },
    { entryId: 'formula_addition_sin',   label: '加法 sin', title: 'sin の加法公式', requiresFormulaId: 'formula_addition_sin' },
    { entryId: 'formula_addition_cos',   label: '加法 cos', title: 'cos の加法公式', requiresFormulaId: 'formula_addition_cos' },
    { entryId: 'formula_addition_tan',   label: '加法 tan', title: 'tan の加法公式', requiresFormulaId: 'formula_addition_tan' },
  ];

  // いま出していい項目だけを返す
  function visibleExplanationEntries() {
    const unlocked = typeof window.getUnlockedFormulaIds === 'function' ? window.getUnlockedFormulaIds() : [];
    return EXPLANATION_ENTRIES.filter((e) => !e.requiresFormulaId || unlocked.includes(e.requiresFormulaId));
  }

  // 項目のボタンを作り直す（開くたびに呼ぶ。解放状況が変わるため）
  function renderSubmenuBody(panel) {
    const body = panel.querySelector('.character-mascot-submenu-body');
    if (!body) return;
    body.innerHTML = visibleExplanationEntries().map((e) => `
      <button class="character-mascot-submenu-item" type="button" data-entry-id="${e.entryId}">
        <div class="character-mascot-submenu-item-label">${e.label}</div>
        <div class="character-mascot-submenu-item-title">${e.title}</div>
      </button>
    `).join('');
    body.querySelectorAll('.character-mascot-submenu-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const entryId = btn.dataset.entryId;
        closeSubmenu();
        // 既存の公式解説モーダル (explanations.js/app.js のロジック) を再利用。
        if (typeof window.openFormulaReferenceModal === 'function') {
          window.openFormulaReferenceModal(entryId);
        }
      });
    });
  }

  function ensureSubmenu() {
    let panel = document.getElementById(SUBMENU_ID);
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = SUBMENU_ID;
    panel.className = 'character-mascot-submenu hidden';
    panel.innerHTML = `
      <div class="character-mascot-submenu-card">
        <div class="character-mascot-submenu-header">
          <div class="character-mascot-submenu-title">📘 三角関数の解説</div>
          <button class="character-mascot-submenu-close" type="button" aria-label="閉じる">×</button>
        </div>
        <div class="character-mascot-submenu-body"></div>
      </div>
    `;
    document.body.appendChild(panel);

    // 閉じるボタン
    panel.querySelector('.character-mascot-submenu-close').addEventListener('click', closeSubmenu);
    // 背景クリックで閉じる (カード外側をクリックしたとき)
    panel.addEventListener('click', (e) => {
      if (e.target === panel) closeSubmenu();
    });
    // 各項目のボタンは renderSubmenuBody が作る（開くたびに作り直す）
    return panel;
  }

  function openSubmenu() {
    const panel = ensureSubmenu();
    renderSubmenuBody(panel);
    panel.classList.remove('hidden');
    requestAnimationFrame(() => panel.classList.add('show'));
    window.toggleCharacterMascotMenu(false); // 元 radial menu は閉じる
  }

  function closeSubmenu() {
    const panel = document.getElementById(SUBMENU_ID);
    if (!panel) return;
    panel.classList.remove('show');
    setTimeout(() => panel.classList.add('hidden'), 220);
  }

  window.openMascotExplanationSubmenu = openSubmenu;
  window.closeMascotExplanationSubmenu = closeSubmenu;

  window.hideCharacterMascot = function() {
    if (typeof window.hidePalSpeech === 'function') window.hidePalSpeech();
    const host = document.getElementById(HOST_ID);
    if (!host) return;
    host.classList.add('hidden');
    host.classList.remove('menu-open');
  };

  /**
   * radial menu を開閉する。引数がある場合はその状態を強制する。
   */
  window.toggleCharacterMascotMenu = function(forceOpen) {
    const host = document.getElementById(HOST_ID);
    if (!host) return;
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !host.classList.contains('menu-open');
    host.classList.toggle('menu-open', shouldOpen);
  };
})();