// ============================================
// character-mascot.js
// パル (ヒッパルコス) の呼び出し。
//
// 考え方（呼び出し式）:
//   ふだんは画面に出さず、下のボタン列の右端に小さな呼び出しボタン(#btn-pal)だけ置く。
//   押すと、パルが本来の大きさで盤面の右下に出てきてメニューを開く。
//   用が済んだら消える。常駐させると、小さくすれば盤面は守れるがキャラクターに
//   見えなくなり、大きくすれば盤面を隠す——その板挟みを「呼ぶときだけ大きく」で解いた。
//
// 主な API:
//   window.showCharacterMascot()    呼び出しボタンを使えるようにする (プレイ画面遷移時)
//   window.hideCharacterMascot()    パルを引っ込める (画面離脱時)
//   window.summonPal() / window.dismissPal()
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
      key: 'close',
      label: '閉じる',
      subLabel: 'またね',
      onSelect: () => window.dismissPal(),
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
    palButton.addEventListener('click', () => window.toggleCharacterMascotMenu());
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

    // 下のボタン列の中に入れる。こうすると「ボタン列のすぐ上」に立たせるのが
    // bottom: 100% だけで決まり、ボタン列の高さが変わっても追従する。
    const bar = document.querySelector('.action-bar-container');
    (bar || document.body).appendChild(host);
    host.classList.toggle('in-action-bar', !!bar);

    // パルが出ている間に外側をクリックしたら、引っ込める。
    // 呼び出しボタン自身のクリックは、そのトグル処理に任せる。
    document.addEventListener('click', (e) => {
      if (host.classList.contains('hidden')) return;
      if (host.contains(e.target)) return;
      if (e.target.closest && e.target.closest('#btn-pal')) return;
      // 吹き出しを読んでいる最中に消さない
      if (e.target.closest && e.target.closest('#pal-speech')) return;
      window.dismissPal();
    });

    // 下のボタン列のヒントボタンが radial menu を介さず直接押された場合も
    // menu 側の状態表示を更新する
    const hintBtn = document.getElementById('btn-hint');
    if (hintBtn) hintBtn.addEventListener('click', () => setTimeout(refreshMenuState, 0));

    return host;
  }

  // パル縮小状態の localStorage キー
  // ============================================
  // 呼び出し / 引っ込め
  // ============================================
  // 呼ぶとパルが盤面の右下に出てきて、同時にメニューが開く。
  // わざわざ呼んだのだから、もう一度押させずに用件を出す。
  window.summonPal = function () {
    const host = ensureMascotHost();
    host.classList.remove('hidden');
    refreshMenuState();
    // 出てくる動き（下から）を毎回見せるため、クラスの付け直しを1フレーム待つ
    requestAnimationFrame(() => {
      host.classList.add('show');
      window.toggleCharacterMascotMenu(true);
    });
    const callBtn = document.getElementById('btn-pal');
    if (callBtn) callBtn.classList.add('is-active');
  };

  window.dismissPal = function () {
    const host = document.getElementById(HOST_ID);
    if (typeof window.hidePalSpeech === 'function') window.hidePalSpeech();
    const callBtn = document.getElementById('btn-pal');
    if (callBtn) callBtn.classList.remove('is-active');
    if (!host) return;
    host.classList.remove('menu-open', 'show');
    setTimeout(() => host.classList.add('hidden'), 260);
  };

  window.togglePal = function (forceOn) {
    const host = document.getElementById(HOST_ID);
    const isOut = !!host && !host.classList.contains('hidden');
    const shouldOpen = typeof forceOn === 'boolean' ? forceOn : !isOut;
    if (shouldOpen) window.summonPal(); else window.dismissPal();
  };

  // プレイ画面に入ったとき。パルはまだ出さず、呼び出しボタンだけ使えるようにする。
  window.showCharacterMascot = function() {
    ensureMascotHost();
    const callBtn = document.getElementById('btn-pal');
    if (callBtn && !callBtn.dataset.bound) {
      callBtn.dataset.bound = '1';
      callBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.togglePal();
      });
    }
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

  // プレイ画面から離れるとき。出ていたら引っ込める。
  window.hideCharacterMascot = function() {
    if (typeof window.hidePalSpeech === 'function') window.hidePalSpeech();
    const callBtn = document.getElementById('btn-pal');
    if (callBtn) callBtn.classList.remove('is-active');
    const host = document.getElementById(HOST_ID);
    if (!host) return;
    host.classList.add('hidden');
    host.classList.remove('menu-open', 'show');
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