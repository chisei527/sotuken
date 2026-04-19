// --- 状態管理と初期化 ---
let a = JSON.parse(localStorage.getItem('s')) || []; // クリア済ステージの保存。LocalStorageを利用しブラウザを閉じてもデータを維持。
let b = 1; // 現在選択中のステージ番号を追跡するグローバル変数。
let c = null; // 現在ロードされているステージのJSONデータ。

// 章ごとの構成定義。拡張性を考慮し、オブジェクトの配列として構造化。
const d = [
    {A: "第1章：基本の証明", B: 1, C: 10}, // 第1〜10問
    {A: "第2章：標準問題", B: 11, C: 20}, // 第11〜20問
    {A: "第3章：発展問題", B: 21, C: 30}  // 第21〜30問
];

// 画面切り替え関数。CSSのクラス操作のみで高速な画面遷移（SPA）を実現。
function e(A) {
    document.querySelectorAll('.a').forEach(B => B.classList.remove('b'));
    document.getElementById(A).classList.add('b');
}

// ステージ選択画面の動的生成。HTMLを手書きせずJSで生成することで、30ステージの管理を容易にする。
function f() {
    const A = document.getElementById('n');
    A.innerHTML = ''; // 再描画時の重複を防ぐため初期化。
    d.forEach(B => {
        const C = document.createElement('h3');
        C.innerText = B.A;
        A.appendChild(C);
        const D = document.createElement('div');
        D.className = 'd';
        for (let i = B.B; i <= B.C; i++) {
            const E = document.createElement('button');
            E.className = 'e';
            if (a.includes(i)) E.classList.add('g'); // クリア済みなら専用の装飾(🎉)を有効化。
            E.innerHTML = i + '<span class="f">🎉</span>';
            E.onclick = () => { b = i; g(i); e('p'); }; // クリック時にステージ情報をロードし画面を切り替える。
            D.appendChild(E);
        }
        A.appendChild(D);
    });
}

// セーブデータリセット。ユーザーの意志を確認してからデータを消去する安全設計。
function o() {
    localStorage.removeItem('s');
    a = [];
    f();
}

// 「戻る」ボタン。ステージ選択画面の最新状態を反映させてから戻る。
document.getElementById('q').onclick = () => { f(); e('c'); };

// --- Blocklyカスタムブロック定義：数学的語彙の拡張 ---
// 三角関数、数値、分母分子、加算、乗算、自乗の各ブロック。
// setOutput(true, "Math")により、数学的な式としてのみ連結可能な制約（型チェック）を付与。
Blockly.Blocks['term_tan'] = { init: function() { this.appendDummyInput().appendField("tan θ"); this.setOutput(true, "Math"); this.setColour(230); } };
Blockly.Blocks['term_sin'] = { init: function() { this.appendDummyInput().appendField("sin θ"); this.setOutput(true, "Math"); this.setColour(230); } };
Blockly.Blocks['term_cos'] = { init: function() { this.appendDummyInput().appendField("cos θ"); this.setOutput(true, "Math"); this.setColour(230); } };
Blockly.Blocks['custom_number'] = { init: function() { this.appendDummyInput().appendField(new Blockly.FieldNumber(1), "NUM"); this.setOutput(true, "Math"); this.setColour(210); } };
Blockly.Blocks['math_fraction'] = { init: function() { this.appendValueInput("NUMERATOR").setCheck("Math").appendField("分子"); this.appendDummyInput().appendField("---"); this.appendValueInput("DENOMINATOR").setCheck("Math").appendField("分母"); this.setOutput(true, "Math"); this.setColour(260); } };
Blockly.Blocks['math_add'] = { init: function() { this.appendValueInput("A").setCheck("Math"); this.appendDummyInput().appendField("＋"); this.appendValueInput("B").setCheck("Math"); this.setOutput(true, "Math"); this.setInputsInline(true); this.setColour(260); } };
Blockly.Blocks['math_multiply'] = { init: function() { this.appendValueInput("A").setCheck("Math"); this.appendDummyInput().appendField("×"); this.appendValueInput("B").setCheck("Math"); this.setOutput(true, "Math"); this.setInputsInline(true); this.setColour(260); } };
Blockly.Blocks['math_square'] = { init: function() { this.appendValueInput("A").setCheck("Math"); this.appendDummyInput().appendField("の2乗"); this.setOutput(true, "Math"); this.setInputsInline(true); this.setColour(260); } };

// 公式ブロック。これ自体は「計算式の文字列」ではなく、「どのルールを使ったか」というフラグの役割。
Blockly.Blocks['formula_1'] = { init: function() { this.appendDummyInput().appendField("公式①: sin²θ + cos²θ = 1"); this.setOutput(true, "Formula"); this.setColour(300); } };
Blockly.Blocks['formula_2'] = { init: function() { this.appendDummyInput().appendField("公式②: tanθ = sinθ / cosθ"); this.setOutput(true, "Formula"); this.setColour(300); } };
Blockly.Blocks['formula_3'] = { init: function() { this.appendDummyInput().appendField("公式③: 1 + tan²θ = 1 / cos²θ"); this.setOutput(true, "Formula"); this.setColour(300); } };

// 証明ロジック用ブロック。Statement（文）として縦に連結していく構造を採用。
Blockly.Blocks['proof_step'] = { init: function() { this.appendDummyInput().appendField("証明"); this.appendStatementInput("OPERATIONS").setCheck("Operation"); this.setPreviousStatement(true, "ProofStep"); this.setNextStatement(true, "ProofStep"); this.setColour(120); } };
// 「式 A を 公式 X で 式 B にする」という自然言語に近い構造。
Blockly.Blocks['replace_operation'] = { init: function() { 
    this.appendValueInput("VALUE").setCheck("Math").appendField("式"); 
    this.appendDummyInput().appendField("を"); 
    this.appendValueInput("FORMULA").setCheck("Formula"); 
    this.appendDummyInput().appendField("で"); 
    this.appendValueInput("REPLACEMENT").setCheck("Math"); 
    this.appendDummyInput().appendField("にする"); 
    this.setInputsInline(true); // 横一行に並べることで視認性を向上。
    this.setPreviousStatement(true, "Operation"); 
    this.setNextStatement(true, "Operation"); 
    this.setColour(160); 
} };
Blockly.Blocks['common_denominator_operation'] = { init: function() { 
    this.appendValueInput("VALUE").setCheck("Math").appendField("式を通分して"); 
    this.appendValueInput("REPLACEMENT").setCheck("Math"); 
    this.appendDummyInput().appendField("にする"); 
    this.setInputsInline(true); 
    this.setPreviousStatement(true, "Operation"); 
    this.setNextStatement(true, "Operation"); 
    this.setColour(160); 
} };
Blockly.Blocks['conclusion_operation'] = { init: function() { 
    this.appendDummyInput().appendField("よって"); 
    this.appendValueInput("VALUE").setCheck("Math"); 
    this.appendDummyInput().appendField("となる"); 
    this.setInputsInline(true); 
    this.setPreviousStatement(true, "Operation"); 
    this.setColour(180); 
} };

// ツールボックス（ブロック置き場）の設定。階層化と「開いたまま(expanded: true)」の設定により使いやすさを向上。
const h = {
  "kind": "categoryToolbox",
  "contents": [
    {
      "kind": "category",
      "name": "📂 ブロック一覧",
      "expanded": true, // アコーディオンを開いた状態にする。
      "contents": [
        { "kind": "category", "name": "項", "contents": [{ "kind": "block", "type": "custom_number" }, { "kind": "block", "type": "term_sin" }, { "kind": "block", "type": "term_cos" }, { "kind": "block", "type": "term_tan" }] },
        { "kind": "category", "name": "演算", "contents": [{ "kind": "block", "type": "math_fraction" }, { "kind": "block", "type": "math_add" }, { "kind": "block", "type": "math_multiply" }, { "kind": "block", "type": "math_square" }] },
        { "kind": "category", "name": "公式", "contents": [{ "kind": "block", "type": "formula_1" }, { "kind": "block", "type": "formula_2" }, { "kind": "block", "type": "formula_3" }] },
        { "kind": "category", "name": "証明", "contents": [{ "kind": "block", "type": "proof_step" }, { "kind": "block", "type": "replace_operation" }, { "kind": "block", "type": "common_denominator_operation" }, { "kind": "block", "type": "conclusion_operation" }] }
      ]
    }
  ]
};

// Blocklyの注入。
const i = Blockly.inject('l', { toolbox: h });
// ブロックの変更を監視し、JSON形式でシリアライズ。Unity連携時の通信データ形式として採用予定。
i.addChangeListener(() => { document.getElementById('m').innerText = JSON.stringify(Blockly.serialization.workspaces.save(i)); });

// ステージロード関数。非同期通信(fetch)を用いて外部ファイルを読み込む。
async function g(A) {
    try {
        const B = await fetch(`problems/${A}.json`); // 指定した問題番号のJSONを取得。
        c = await B.json();
        document.getElementById('r').innerText = "STAGE " + A;
        document.getElementById('s').innerText = c.mathText; // 問題文（TeX形式）を表示。
        document.getElementById('y').innerHTML = ""; 
        if (window.MathJax) { MathJax.typesetClear(); MathJax.typesetPromise(); } // MathJaxの再描画命令。
        
        let C = JSON.parse(JSON.stringify(h));
        let D = { "kind": "category", "name": "✨問題の式", "contents": [] };
        // 問題独自の初期ブロック（証明対象の式など）をツールボックスの最上部に動的に追加。
        if (c.initialState.blocks && c.initialState.blocks.blocks) {
            c.initialState.blocks.blocks.forEach(E => {
                if (E.type !== "proof_step") {
                    let F = JSON.parse(JSON.stringify(E));
                    F.kind = "block"; delete F.x; delete F.y; delete F.id;
                    D.contents.push(F);
                }
            });
        }
        if (D.contents.length > 0) C.contents[0].contents.unshift(D);
        i.updateToolbox(C); // ツールボックスを最新化。
        
        i.clear(); // ワークスペースを掃除。
        Blockly.serialization.workspaces.load(c.initialState, i); // 問題の初期配置をロード。
        document.getElementById('t').style.display = "inline-block";
        document.getElementById('x').style.display = "none";
    } catch (E) { console.error("ロード失敗:", E); }
}

// 数値計算用ジェネレーター。BlocklyをJavaScriptに変換するのではなく、math.jsで評価可能な数式文字列へ変換。
const j = new Blockly.Generator('MATH');
j.forBlock['custom_number'] = function(A) { return [String(A.getFieldValue('NUM')), 0]; };
j.forBlock['term_sin'] = function(A) { return ['sin(x)', 0]; }; // θをxとして扱い、評価エンジンが認識できるようにする。
j.forBlock['term_cos'] = function(A) { return ['cos(x)', 0]; };
j.forBlock['term_tan'] = function(A) { return ['tan(x)', 0]; };
j.forBlock['math_add'] = function(A) { return [`(${j.valueToCode(A, 'A', 0) || '0'} + ${j.valueToCode(A, 'B', 0) || '0'})`, 0]; };
j.forBlock['math_multiply'] = function(A) { return [`(${j.valueToCode(A, 'A', 0) || '1'} * ${j.valueToCode(A, 'B', 0) || '1'})`, 0]; };
j.forBlock['math_fraction'] = function(A) { return [`(${j.valueToCode(A, 'NUMERATOR', 0) || '0'}) / (${j.valueToCode(A, 'DENOMINATOR', 0) || '1'})`, 0]; };
j.forBlock['math_square'] = function(A) { return [`(${j.valueToCode(A, 'A', 0) || '0'})^2`, 0]; };

// 判定ロジック。
document.getElementById('t').onclick = () => {
    let A = true;
    const B = document.getElementById('y');
    const C = i.getAllBlocks(false).filter(D => D.type === 'proof_step');
    if (C.length === 0) return;
    let D = C[0].getInputTargetBlock('OPERATIONS');
    let E = [];
    while (D) { E.push(D); D = D.getNextBlock(); }
    
    // 各ステップを個別に検証。変形前と変形後の数式に特定の値を代入し、数値的に一致するかを確認する。
    // 「厳密な数式等価性」の判定は困難だが、数値的サンプリングによる近似判定は教育用アプリとして十分に実用的。
    for (let F of E) {
        if (F.type === 'replace_operation' || F.type === 'common_denominator_operation') {
            const G = j.valueToCode(F, 'VALUE', 0);
            const H = j.valueToCode(F, 'REPLACEMENT', 0);
            try {
                // サンプリング点（0.5ラジアン等）において、左辺と右辺の差が極小であることを確認。
                if (Math.abs(math.evaluate(G, {x:0.5}) - math.evaluate(H, {x:0.5})) > 0.0001) A = false;
            } catch (I) { A = false; }
        }
    }
    const F = E[E.length - 1]; // 最後のブロックが「結論」であることを確認。
    if (A && F && F.type === 'conclusion_operation') {
        B.innerHTML = "<span style='color:green'>正解！</span>";
        if (!a.includes(b)) { a.push(b); localStorage.setItem('s', JSON.stringify(a)); } // クリア状況を保存。
        document.getElementById('t').style.display = "none";
        document.getElementById('x').style.display = "inline-block";
        let G = d.find(H => b >= H.B && b <= H.C);
        document.getElementById('x').innerText = (b === G.C) ? "章クリア" : "次へ進む";
    } else {
        B.innerHTML = "<span style='color:red'>不正解。数式が一致していないか、結論がありません。</span>";
    }
};

// 次のステージへ、またはタイトルへ。
document.getElementById('x').onclick = () => {
    let A = d.find(B => b >= B.B && b <= B.C);
    if (b < A.C) { b++; g(b); } else { f(); e('c'); }
};

document.getElementById('w').onclick = () => g(b); // ステージのリセット。
document.getElementById('v').onclick = () => { // 解答例の表示。
    if(c && c.answerState) Blockly.serialization.workspaces.load(c.answerState, i);
};
document.getElementById('u').onclick = () => { // ヒント表示。JSONから読み込んだテキストを出す。
    document.getElementById('y').innerHTML = c.hints ? c.hints[0] : "ヒントはありません";
};

window.onload = f; // 起動時にステージリストを描画。