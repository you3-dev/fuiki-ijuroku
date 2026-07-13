# 封域異獣録 PWA

『封域異獣録』のiPhone向けPWA技術スパイクです。研究所ホームを中心に、画面遷移、ゲームセッション管理、IndexedDB保存、JSONバックアップ、Service Workerを実装しています。

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
- `src/app/`：起動、画面遷移、セッションの読み書き、PWA更新通知
- `src/infrastructure/db/`：Dexieデータベースと直列保存
- `src/infrastructure/backup/`：JSONバックアップの生成、検査、復元
- `src/features/`：研究所、編成、異獣録、設定の画面

技術スパイクではセーブ全体を1件のセッションとして保存します。戦闘・探索・所有個体が実装され、更新頻度やデータ量が増える段階で、設計書にある複数テーブル構成へ移行します。

## 現在の範囲

実装済み：

- 研究所ホーム
- 前衛3枠＋控え3枠の表示
- 異獣録の初期表示
- 調査員名と端末設定
- IndexedDB自動保存
- JSONバックアップと復元
- PWA Manifest、Service Worker、更新通知

未実装：

- 灰苔湿原の地点選択調査
- ターン制戦闘、観察、仲間化
- 個体育成と共鳴継承
- 音声再生
- iPhone実機検証
