// ============================================
// character-mascot.js
// パル (ヒッパルコス) を作業画面の右下に常駐させ、
// クリックすると周囲に radial menu を展開する。
//
// 主な API:
//   window.showCharacterMascot()    パルを表示する (プレイ画面遷移時に呼ぶ)
//   window.hideCharacterMascot()    パルを非表示にする (画面離脱時に呼ぶ)
//   window.toggleCharacterMascotMenu()  radial menu を開閉する
// ============================================

(function characterMascotModule() {
  const HOST_ID = 'character-mascot-host';

  // radial menu の項目定義
  // key: 内部識別子、label: 表示名、onSelect: クリック時の関数、position: menu 上の配置
  //   position は 'up' (真上) / 'up-left' (左上) / 'left' (真左)
  const MENU_ITEMS = [
    {
      key: 'guide',
      label: 'ガイド',
      subLabel: 'ON/OFF',
      position: 'up-left',
      onSelect: () => {
        // 既存のヘッダー「ガイド機能」ボタンを内部的にクリックしてトグルする。
        // click ハンドラ内でトースト・ワークスペース再構築が走るので副作用がそのまま生きる。
        const btn = document.getElementById('btn-overwrite-permission');
        if (btn) btn.click();
        refreshMenuState();
      },
    },
    {
      key: 'hint',
      label: 'ヒント',
      subLabel: '表示切替',
      position: 'left',
      onSelect: () => {
        // 既存のヒントボタン (btn-hint) をクリックしてトグルする。
        // showGoalHintForStage / hideGoalHintForStage が発火してバナー表示が切り替わる。
        const btn = document.getElementById('btn-hint');
        if (btn) btn.click();
        refreshMenuState();
      },
    },
    {
      key: 'explanation',
      label: '三角関数の解説',
      subLabel: '基礎と公式',
      position: 'up',
      onSelect: () => {
        // Step 4: サブメニューを開いて解説項目を選ばせる
        if (typeof window.openMascotExplanationSubmenu === 'function') {
          window.openMascotExplanationSubmenu();
        }
      },
    },
  ];

  /**
   * radial menu の各項目の状態表示 (ON/OFF や選択中マーク) を、
   * 既存機能の現在の状態に合わせて更新する。
   * ガイド機能: btn-overwrite-permission の on/off クラスから読む
   * ヒント: window.goalHintActive を見る
   */
  function refreshMenuState() {
    const guideBtn = document.getElementById('btn-overwrite-permission');
    const isGuideOn = !!(guideBtn && guideBtn.classList.contains('on'));
    const isHintOn = !!window.goalHintActive;

    const guideItem = document.querySelector('.character-mascot-menu-item[data-key="guide"]');
    if (guideItem) {
      guideItem.classList.toggle('is-active', isGuideOn);
      const sub = guideItem.querySelector('.character-mascot-menu-sublabel');
      if (sub) sub.textContent = isGuideOn ? 'ON' : 'OFF';
    }

    const hintItem = document.querySelector('.character-mascot-menu-item[data-key="hint"]');
    if (hintItem) {
      hintItem.classList.toggle('is-active', isHintOn);
      const sub = hintItem.querySelector('.character-mascot-menu-sublabel');
      if (sub) sub.textContent = isHintOn ? '表示中' : '表示する';
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
    palImg.src = 'asset/ヒッパルコス 通常.png';
    palImg.draggable = false;
    palButton.appendChild(palImg);
    palButton.addEventListener('click', () => window.toggleCharacterMascotMenu());
    host.appendChild(palButton);

    // radial menu (パルの周囲に扇状に配置)
    const menu = document.createElement('div');
    menu.className = 'character-mascot-menu';
    MENU_ITEMS.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `character-mascot-menu-item pos-${item.position}`;
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

    document.body.appendChild(host);

    // radial menu を開いているときに host 外側をクリックしたら閉じる
    document.addEventListener('click', (e) => {
      if (!host.classList.contains('menu-open')) return;
      if (host.contains(e.target)) return;
      window.toggleCharacterMascotMenu(false);
    });

    // 既存のガイドボタン/ヒントボタンが radial menu を介さず直接クリックされた場合も
    // menu 側の状態表示を更新する
    const guideBtn = document.getElementById('btn-overwrite-permission');
    const hintBtn = document.getElementById('btn-hint');
    if (guideBtn) guideBtn.addEventListener('click', () => setTimeout(refreshMenuState, 0));
    if (hintBtn) hintBtn.addEventListener('click', () => setTimeout(refreshMenuState, 0));

    return host;
  }

  window.showCharacterMascot = function() {
    const host = ensureMascotHost();
    host.classList.remove('hidden');
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
  const EXPLANATION_ENTRIES = [
    { entryId: 'basics_intro',           label: '基礎①', title: '三角関数とは' },
    { entryId: 'basics_unit_circle',     label: '基礎②', title: '単位円で理解する' },
    { entryId: 'basics_special_values',  label: '基礎③', title: '代表的な角度の値' },
    { entryId: 'formula_1',              label: '公式①', title: '三平方の関係' },
    { entryId: 'formula_2',              label: '公式②', title: 'tan の定義' },
    { entryId: 'formula_3',              label: '公式③', title: 'tan の三平方関係' },
  ];

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
        <div class="character-mascot-submenu-body">
          ${EXPLANATION_ENTRIES.map((e) => `
            <button class="character-mascot-submenu-item" type="button" data-entry-id="${e.entryId}">
              <div class="character-mascot-submenu-item-label">${e.label}</div>
              <div class="character-mascot-submenu-item-title">${e.title}</div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // 閉じるボタン
    panel.querySelector('.character-mascot-submenu-close').addEventListener('click', closeSubmenu);
    // 背景クリックで閉じる (カード外側をクリックしたとき)
    panel.addEventListener('click', (e) => {
      if (e.target === panel) closeSubmenu();
    });
    // 各項目を選択 → 既存の公式解説モーダルを開いてそのタブを表示
    panel.querySelectorAll('.character-mascot-submenu-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const entryId = btn.dataset.entryId;
        closeSubmenu();
        // 既存の公式解説モーダル (explanations.js/app.js のロジック) を再利用。
        // Step 5 で完全に置き換える予定だが、ここでは既存のモーダルを流用する。
        if (typeof window.openFormulaReferenceModal === 'function') {
          window.openFormulaReferenceModal(entryId);
        }
      });
    });
    return panel;
  }

  function openSubmenu() {
    const panel = ensureSubmenu();
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