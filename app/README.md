# 封域異獣録 PWA

『封域異獣録』のiPhone向けPWA縦切り実装です。研究所ホーム、最初の地点選択調査、固定チュートリアル戦、仲間化に加え、IndexedDB保存、JSONバックアップ、Service Workerを実装しています。

## 必要環境

- Node.js 24系
- npm 11系
- ChromeまたはEdge。最終確認はiPhone Safari／ホーム画面追加版で行う

## 開発

```powershell
npm.cmd install
npm.cmd run dev
```

Viteが表示したローカルURLをブラウザで開きます。

## 品質確認

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Playwright用のシナリオは `tests/e2e/` にあります。初回は対象ブラウザの導入が必要です。

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

## 主な構成

- `src/domain/session/`：ReactやDexieに依存しない状態、コマンド、入力検査
- `src/domain/exploration/`：地点、初回戦、仲間化、分岐の状態遷移
- `src/app/`：起動、画面遷移、セッションの読み書き、PWA更新通知
- `src/infrastructure/db/`：Dexieデータベースと直列保存
- `src/infrastructure/backup/`：JSONバックアップの生成、検査、復元
- `src/features/`：研究所、調査、編成、異獣録、設定の画面

現段階ではセーブ全体を1件のセッションとして保存します。汎用戦闘と複数地域で更新頻度やデータ量が増える段階で、設計書にある複数テーブル構成へ移行します。

## 現在の範囲

実装済み：

- 研究所ホーム
- 前衛3枠＋控え3枠の表示
- 異獣録の初期表示
- 調査員名と端末設定
- IndexedDB自動保存
- JSONバックアップと復元
- PWA Manifest、Service Worker、更新通知
- 湿原入口と灰苔の浅瀬の地点選択
- 観察、防御、汚染解除、鎮静、協力要請の初回戦
- スミワタリの前衛3枠目加入、呼称入力、異獣録更新
- 観測櫓跡／沈み水路の分岐選択
- 戦闘途中の保存復帰と旧セーブ移行

未実装：

- HP、対象、行動順、敗北を持つ汎用ターン制戦闘
- 観測櫓跡と沈み水路の地点イベント
- 個体育成と共鳴継承
- 音声再生
- iPhone実機検証
