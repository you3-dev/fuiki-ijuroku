# 『封域異獣録』GitHub運用方針

版：0.1  
更新日：2026年7月13日  
対象：個人開発／Windows環境

## 1. 結論

現段階でGitによる履歴管理を開始し、GitHubには非公開リポジトリを用意することを推奨する。

企画書と設計書がすでに複数あり、これからPWAのソース、テスト、画像素材が増える。実装開始後まで待つより、最初のコード生成前に履歴の基準点を作る方が復旧しやすい。

## 2. 現在の環境

2026年7月13日の確認結果は次のとおり。

| 項目 | 状態 |
|---|---|
| Git | `2.54.0.windows.1` が利用可能 |
| GitHub CLI | `gh` は未導入 |
| ローカルリポジトリ | `main` ブランチで初期化済み |
| `.git` | 有効なローカルリポジトリ |
| Gitユーザー名・メール | リポジトリ内だけ `you3-dev` とID付きGitHub `noreply` メールを設定済み |
| GitHub接続 | `origin` を `you3-dev/fuiki-ijuroku` に設定し、`main` をpush済み |

GitHub CLIを追加しなくても、GitHubのWeb画面と通常の `git` コマンドだけで開始できる。

## 3. 推奨するリポジトリ

| 項目 | 推奨値 |
|---|---|
| リポジトリ名 | `fuiki-ijuroku` |
| 公開範囲 | Private |
| 既定ブランチ | `main` |
| README | ローカル側で作成 |
| License | 当面追加しない |
| Issues | 必要になってから使用 |
| Wiki | 使用せず、設計はMarkdownで管理 |

リポジトリ名はURLやコマンドで扱いやすい英数字にし、作品名はREADME内に日本語で記載する。

個人利用の非公開企画なので、ライセンスを急いで付ける必要はない。将来公開する場合に、ソース、文章、画像それぞれの公開条件を改めて決める。

## 4. Privateを推奨する理由

- 制作途中の物語と画像を不用意に公開しない
- 個人用の試作コードを公開品質へ整える必要がない
- バックアップ先として使いながら公開判断を後回しにできる
- `.env` などを誤って登録しない運用を最初から練習できる

ただし、GitHub FreeでGitHub Pagesを使う場合、公式資料上は公開リポジトリが対象であり、非公開リポジトリからのPages利用には上位プランが必要である。したがって、ソース管理とPWA公開先は分けて検討する。

## 5. GitHubへ含めるもの

### 登録する

- Markdownの企画書・仕様書・設計書
- PWAのソースコード
- テストコード
- データ定義
- 小さく圧縮したゲーム用画像・音声
- PWAアイコン
- ビルド設定
- データ移行処理
- `README.md`
- `.gitignore`
- 依存関係のロックファイル

### 原則として登録しない

- `node_modules`
- ビルド結果 `dist`
- テスト結果とカバレッジ
- Playwrightの動画・スクリーンショット
- `.env` と秘密情報
- 一時的な文書レンダリング画像
- OSやエディターの一時ファイル
- 書出し済みの個人セーブデータ

## 6. 初期`.gitignore`方針

```gitignore
# dependencies and builds
node_modules/
dist/
.vite/
coverage/

# tests
playwright-report/
test-results/

# local configuration and secrets
.env
.env.*
!.env.example

# local QA artifacts
qa_render/
a11y_report.json

# OS and editor files
.DS_Store
Thumbs.db
*.swp
```

DOCXをすべて無視する規則は入れない。最終成果物として残すDOCXと、生成途中のDOCXを整理してから個別に判断する。

## 7. 推奨ディレクトリ

実装開始時に次の構成へ整理する。

```text
fuiki-ijuroku/
  README.md
  .gitignore
  docs/
    planning/
    design/
  app/
    package.json
    src/
    public/
    tests/
  assets/
    source/
  tools/
```

現在のMarkdown間には相対リンクがあるため、初期化と同時に無理に移動しない。最初のコミットで現状を保存し、その後の整理を別コミットにする。

## 8. 最初の登録手順

### ローカル

1. 空の `.git` フォルダーを確認する
2. `.gitignore` と `README.md` を作る
3. Gitユーザー名とメールを設定する
4. `git init -b main` で初期化する
5. 登録対象を確認する
6. 最初のコミットを作る

### GitHub

1. GitHubのWeb画面でPrivateリポジトリを作る
2. GitHub側ではREADME、License、`.gitignore`を追加しない
3. 表示されたリモートURLをローカルへ登録する
4. `main` をpushする
5. GitHub上で公開範囲と登録ファイルを再確認する

GitHub公式も、既存ローカルリポジトリを追加する場合は、GitHub側をREADMEなどで初期化せずに作成する手順を案内している。

## 9. コミット運用

個人開発なので複雑なブランチ運用は行わない。

### 基本

- `main` は起動または文書参照ができる状態を保つ
- 1つの判断または機能を1コミットの目安にする
- コミット前に差分と登録ファイルを確認する
- 自動生成物だけのコミットを避ける
- セーブ互換性へ影響する変更はメッセージに明記する

### ブランチを使う場面

- PWA基盤の導入
- セーブ形式の変更
- 戦闘システムの大きな変更
- タイルマップ技術試作
- 大量の画像差替え

小さな文書修正まで毎回Pull Requestにする必要はない。

## 10. コミットメッセージ例

```text
docs: add laboratory home wireframe
feat: add deterministic battle round resolver
feat: persist game session with revision checks
test: cover resonance inheritance capacity
fix: prevent duplicate rewards after battle resume
assets: add graymoss marsh backgrounds
```

英語へ統一する必要はないが、`docs`、`feat`、`test`、`fix`などの種別を先頭へ付けると履歴を追いやすい。

## 11. 画像と音声

縦切り版の圧縮済み素材は通常のGit管理から始める。制作原寸、レイヤー付き画像、無圧縮音声が大きくなった場合にだけGit LFSまたは別の素材保管先を検討する。

同じ画像を何度も微修正して履歴容量を増やさないよう、ゲーム用書出し素材と制作原寸を分ける。

## 12. 秘密情報

縦切り版はサーバーを持たないため、本来は秘密鍵を必要としない。将来デプロイトークンを使う場合も、ソースや `.env` をGitへ登録しない。

- クライアントへ埋め込んだ値は秘密にできない
- GitHub Actionsの認証情報はSecretsへ入れる
- 個人セーブのJSONをIssueへ添付しない
- 誤登録した秘密情報は、削除コミットだけで済ませず失効させる

## 13. バックアップとしての限界

GitHubはソース履歴の遠隔保管に有効だが、次の唯一の保管先にはしない。

- 制作原寸の大型画像
- 個人セーブ
- GitHubへpushしていない作業
- Git管理から除外したファイル

特に画像原本は、別のローカルまたはクラウド保存も用意する。

## 14. GitHub Pagesとの関係

GitHub Pagesは将来のPWA配置候補だが、リポジトリ作成と同時に決定しない。

- Privateリポジトリを優先する
- 無料公開が必要になった段階で、公開用リポジトリを分ける方法も検討する
- PWAにはHTTPS、正しいベースパス、Service Workerの範囲設定が必要
- HashRouterの採用により、画面ごとのサーバー側URL書換えは不要
- デプロイ先は技術スパイク時にiPhone実機確認と合わせて決める

## 15. 公式資料

- [GitHub Docs：Adding locally hosted code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
- [GitHub Docs：Creating a new repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [GitHub Docs：Ignoring files](https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files)
- [GitHub Docs：GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

## 16. 初期化結果

2026年7月13日に次を完了した。

- ローカルGitを `main` ブランチで初期化
- リポジトリ固有のコミット名と非公開用メールを設定
- `.gitignore` と `.gitattributes` を追加
- プロジェクト概要の `README.md` を追加
- 企画書、設計書、最終版DOCX、生成スクリプトを初回コミット
- `origin` に `https://github.com/you3-dev/fuiki-ijuroku.git` を設定
- `main` をGitHubへpushし、追跡ブランチを設定

今後は設計決定または実装単位でコミットし、秘密情報、生成物、個人セーブを登録しない。
