# GitHub Pages公開手順

## 公開先

GitHub Pagesの公開URLは次のとおり。

<https://you3-dev.github.io/fuiki-ijuroku/>

このURLはHTTPSで配信されるため、Service Workerとホーム画面追加を利用できる。

## 自動公開

`.github/workflows/deploy-pages.yml` が次を実行する。

1. `main` ブランチへのpush、または手動実行を検知
2. `app/` で依存関係を固定バージョンからインストール
3. Lint、型検査、単体テストを実行
4. GitHub Pages用の `/fuiki-ijuroku/` を基準パスとしてビルド
5. `app/dist/` をPagesへ配信

検査またはビルドが失敗した場合は公開されない。成功した版だけが現在の公開版になる。

## GitHub側の初回設定

リポジトリの `Settings` → `Pages` → `Build and deployment` で、`Source` を `GitHub Actions` に設定する。

設定後は `Actions` の `Deploy PWA to GitHub Pages` で進行状況を確認できる。初回公開後、上記URLへアクセスする。

## iPhoneへの追加

1. iPhoneのSafariで公開URLを開く
2. 共有ボタンを押す
3. `ホーム画面に追加` を選ぶ
4. 表示名を確認して `追加` を押す
5. ホーム画面の「異獣録」から起動する

iOSでは一般的なインストール確認ダイアログが出ないため、Safariの共有メニューから手動で追加する。

## 保存データ

- セーブは端末・ブラウザごとのIndexedDBへ保存される
- GitHub PagesやGitHubリポジトリへセーブ内容は送信されない
- Safariとホーム画面版は、iOSの状態によって保存領域の扱いが異なる可能性があるため、最初に短い進行で再起動テストを行う
- 設定画面のJSONバックアップを定期的に保存する
- URLや公開元を変更すると別の保存領域として扱われる

## 実機確認項目

- Safariで初回起動できる
- ホーム画面へ追加でき、standalone表示で起動できる
- ノッチ、Dynamic Island、ホームインジケーターとUIが重ならない
- 戦闘途中で終了しても、再起動後に確定済みラウンドへ復帰できる
- 一度オンラインで起動した後、機内モードでも再起動できる
- 新版公開後に更新通知が表示され、更新後もセーブが残る
- JSONバックアップを書き出し、同じ端末で復元できる
