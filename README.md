subgraph DataLayer [データ層]
    StageJSON[(ステージデータ .json)<br>問題文・初期ブロック・正解構造]
    TutorialData[(台本データ .js)<br>チュートリアルの進行スクリプト]
    CharData[(キャラデータ .js)<br>立ち絵・セリフ・表情定義]
end

subgraph CoreEngine [コアエンジン層（数式・論理判定）]
    MathLogic[math-logic.js<br>証明の検証・AST解析・通分エンジン]
    MathJS((math.js))
    MathLogic -->|数式の同値判定・代入計算| MathJS
end

subgraph AppLayer [アプリケーション層（ゲームロジック）]
    Main[main.js<br>メインルーティング・マップ生成]
    State[app-state.js<br>状態管理・LocalStorage同期]
    Unlock[app-unlock.js<br>公式アンロック管理]
    Tut[tutorial.js系<br>チュートリアル進行・ブロック制限]
    Blocks[blocks.js<br>数式専用カスタムブロック定義]
end

subgraph UILayer [ユーザーインターフェース層]
    Index[index.html & CSS<br>DOM構成・スタイリング]
    AppUI[app-ui.js<br>画面遷移・アニメーション・トースト通知]
    CharUI[character-dialog.js系<br>キャラクター吹き出し・UIメニュー]
    Blockly((Google Blockly))
end

%% データフローと依存関係
Pages -->|配信| Index
Index --> AppUI
Index --> CharUI
Index --> Blockly

Main -->|JSONの読み込み| StageJSON
Main -->|画面の切り替え| AppUI
Main -->|判定の呼び出し| MathLogic

Blocks -->|独自ブロックを登録| Blockly
Blocks -->|自動通分などで連携| MathLogic

Tut -->|台本を読み込み| TutorialData
CharUI -->|キャラ情報を取得| CharData
Tut -->|キャラに喋らせる| CharUI

MathLogic -->|公式の解放状況をチェック| State
Unlock -->|LocalStorageへ保存| State

classDef core fill:#e0f7fa,stroke:#059669,stroke-width:2px;
classDef lib fill:#fef08a,stroke:#d97706,stroke-width:2px;
classDef data fill:#f3e8ff,stroke:#ca8a04,stroke-width:2px;

class MathLogic,Main,Blocks core;
class Blockly,MathJS lib;
class StageJSON,TutorialData,CharData data;
    class StageJSON,TutorialData,CharData data;
