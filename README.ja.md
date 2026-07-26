# Pi Web

[English](./README.md) | [简体中文](./README.zh-CN.md)

[pi コーディングエージェント](https://github.com/badlogic/pi-mono) のローカル Web UI および macOS デスクトップアプリです。Pi Web はローカルの pi セッションファイルを読み込み、セッションの閲覧、リアルタイムチャット、モデル設定、スキル管理、プロジェクトファイルのプレビューを行えるブラウザワークスペースを提供します。

![Pi Web では、CLI と同じ pi セッションを、構造化された Markdown、ツール呼び出し、プロジェクトナビゲーションとともに表示できます](https://raw.githubusercontent.com/agegr/pi-web/main/docs/screenshot2.png)

CLI と Pi Web で同じ pi セッションを利用できます。構造化されたツール呼び出し、読みやすい Markdown、セッション閲覧、整理された結果表示を備えています。

## クイックスタート

**インストールせずに実行：**

```bash
bunx @agegr/pi-web@latest
```

**またはグローバルにインストール：**

```bash
bun install -g @agegr/pi-web
pi-web
```

続いて [http://localhost:30141](http://localhost:30141) を開きます。サーバーの準備が整うと、CLI はブラウザを自動的に開こうとします。

**オプション：**

```bash
pi-web --port 8080              # カスタムポート
pi-web --hostname 127.0.0.1     # ローカルアクセスのみ
pi-web -p 8080 -H 127.0.0.1     # オプションを組み合わせる
pi-web --no-open                # ブラウザを自動的に開かない

PORT=8080 pi-web                # 環境変数にも対応
PI_WEB_NO_OPEN=1 pi-web         # バックグラウンドサービスとして実行する場合に便利
```

## HTTP プロキシ

Pi Web は、サーバー側のモデルリクエストと API リクエストに標準の `HTTP_PROXY`、`HTTPS_PROXY`、`NO_PROXY` 環境変数を使用します。

macOS または Linux：

```bash
HTTP_PROXY=http://127.0.0.1:7890 \
HTTPS_PROXY=http://127.0.0.1:7890 \
NO_PROXY=localhost,127.0.0.1 \
bunx @agegr/pi-web@latest
```

Windows PowerShell：

```powershell
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:NO_PROXY = "localhost,127.0.0.1"
bunx @agegr/pi-web@latest
```

## 機能

- **作業をすぐに再開**：セッションのパスやターミナル履歴を探さずに、プロジェクトごとに過去の pi の会話を閲覧できます。
- **別の方向性を安全に試す**：以前のメッセージから続けるか、セッションをフォークして別の進め方を試せます。
- **ブランチをまたいで作業**：サイドバーから Git worktree を切り替えると、新しいセッションと Explorer が選択したチェックアウトに追従します。
- **プロジェクトを見ながらチャット**：エージェントの作業中に、左側でファイルを閲覧し、右側でソース、ドキュメント、画像、音声、PDF をプレビューできます。
- **セッションの状態を明確に把握**：コンテキスト使用量、コスト、コンパクション状態、システムプロンプトの詳細をトップバーで確認できます。
- **ターミナルでの設定を削減**：モデル、ランタイム設定、ログイン／API キー、プラグイン、モデルテスト、スキルの切り替えを Web UI から管理できます。
- **ローカル変更をすばやく確認**：サイドバーの review パネルから Git status/diff を確認できます。

## 注意事項

- **データディレクトリ**：Pi Web はデフォルトで `~/.pi/agent/sessions` を読み込みます。別の pi エージェントディレクトリを指定するには `PI_CODING_AGENT_DIR` を設定してください。
- **セッションファイル**：ファイルは `~/.pi/agent/sessions/<encoded-cwd>/<timestamp>_<uuid>.jsonl` に保存されます。
- **モデル設定**：Models パネルは pi エージェントディレクトリ内の `models.json` を読み書きします。モデルの一覧とデフォルト値は pi の設定から取得されます。
- **ファイルアクセス**：ファイルの閲覧とプレビューは、選択したプロジェクトディレクトリとセッションに含まれる作業ディレクトリに限定されます。
- **Git worktree**：切り替え機能が表示される条件、新しい worktree の作成方法、削除時の動作については、[Pi Web の Worktree](./docs/worktrees.md) を参照してください。
- **Fork とセッション内ブランチの違い**：Fork は新しい `.jsonl` ファイルを作成します。"Edit from here" は同じセッションファイル内に別のブランチを作成します。

## macOS デスクトップアプリ

Pi Web は Electron で構築されたネイティブ macOS デスクトップアプリとしても提供され、同じ Web UI をネイティブウィンドウでラップし、以下をサポートします：

- ネイティブのディレクトリ・ファイル選択ダイアログ
- macOS アプリメニュー（ファイル、編集、表示、移動）
- ウィンドウがフォーカスされていないときのネイティブ通知
- クリップボード画像のプロンプトへの貼り付け
- ファイルタブから「Finder で表示」「エディタで開く」
- 起動ごとの認証トークンによるローカルホストセキュリティ

**ダウンロード**：[GitHub Releases](https://github.com/agegr/pi-web/releases) から最新の `.dmg` または `.zip` を入手。

初回起動時：右クリック → 開く（未署名アプリの Gatekeeper 対応）。詳細は[デスクトップドキュメント](./docs/desktop.md)を参照。

## Pi 設定の互換性

Pi Web は `~/.pi/agent/settings.json` と `~/.pi/agent/models.json` から設定を読み取ります。サポートされている設定項目：`defaultProvider`、`defaultModel`、`defaultThinkingLevel`、`compaction`、`retry`、`branchSummary`、`packages`、`prompts`、`enabledModels`。CLI 専用項目（`piStatus`、`transport`、`theme`、テレメトリ）は無視されます。

完全な互換性一覧は [Pi ランタイム互換性](./docs/pi-runtime-compat.md) を参照してください。

## セキュリティモデル

- **Web モード**：`proxy.ts` による Origin ベースのガード — クロスオリジンの API リクエストを拒否。
- **デスクトップモード**：Origin ガードに加え、起動ごとに生成される 64 文字の 16 進数トークン。すべての `/api/*` リクエストに `X-Pi-Desktop-Auth` ヘッダーが必要。
- **ファイルアクセス**：セッションの作業ディレクトリと明示的に許可されたルートに限定。シンボリックリンクのエスケープをブロック。
- **シークレット**：API キー、トークン、プロバイダー資格情報は API エンドポイントから返されません。設定パネルには状態とプレースホルダーのみ表示。
- **リモートアクセス不可**：サーバーはデフォルトで `127.0.0.1` にバインド。ネットワーク公開を意図していません。

## 開発

```bash
bun install
bun run dev
```

ローカル開発サーバーは [http://localhost:30141](http://localhost:30141) で動作します。

よく使うチェック：

```bash
node_modules/.bin/tsc --noEmit
bun run lint
```

ローカル開発中は `next build` / `bun run build` を実行しないでください。`.next/` に書き込みが行われ、開発サーバーに影響する可能性があります。ビルドはリリース作業に任せてください。

## プロジェクト構成

```text
app/
  api/
    agent/          # AgentSession を作成・操作し、SSE イベントを公開
    auth/           # OAuth と API キーの管理
    cwd/validate/   # カスタム作業ディレクトリの検証
    default-cwd/    # pi のデフォルト作業ディレクトリを取得
    file-index/     # 高速検索/ナビゲーション用のプロジェクトファイル索引
    files/          # ファイルの一覧、読み込み、プレビュー、監視
    git/            # ローカル Git status/diff API
    home/           # 現在のユーザーのホームディレクトリ
    models/         # 利用可能なモデル、デフォルトモデル、思考レベル
    models-config/  # models.json の読み書きとモデルのテスト
    pi/             # ランタイム設定サマリーと更新エンドポイント
    plugins/        # package plugin 管理
    sessions/       # セッションの読み込み、名前変更、削除、コンテキスト、HTML エクスポート
    skills/         # スキルの一覧、検索、更新、インストール、有効化／無効化
    worktrees/      # Git worktree の一覧/作成/削除
components/
  AppShell.tsx          # メインレイアウト、URL 状態、パネル、ファイルタブ
  SessionSidebar.tsx    # プロジェクト選択、セッションツリー、Explorer、review パネル
  ChatWindow.tsx        # メッセージ、SSE、画像のドラッグ＆ドロップ、ミニマップ
  ChatInput.tsx         # 入力欄、モデル／ツール／思考／コンパクション／スラッシュコントロール
  MessageView.tsx       # メッセージ、思考、ツール呼び出し／結果の表示
  BranchNavigator.tsx   # セッション内ブランチ切り替え
  DiffViewer.tsx        # ローカル Git diff ビューア
  ModelsConfig.tsx      # モデルと認証の設定パネル
  PiRuntimeConfig.tsx   # ランタイム設定サマリーパネル
  PluginsConfig.tsx     # プラグイン管理パネル
  SkillsConfig.tsx      # スキル管理パネル
  FileExplorer.tsx      # ファイルツリーとファジーファイル検索
  FileViewer.tsx        # ソース、差分、画像、音声、PDF、DOCX のプレビュー
  MarkdownBody.tsx      # Markdown／Mermaid／KaTeX 表示
lib/
  rpc-manager.ts        # AgentSessionWrapper のライフサイクルとグローバルレジストリ
  session-reader.ts     # .jsonl セッションファイルとブランチコンテキストの解析
  normalize.ts          # toolCall フィールド名の正規化
  file-access.ts        # ファイル読み込みの安全境界と allowed roots
  file-paths.ts         # ファイルパスのエンコードと相対パスのヘルパー
  git-status.ts         # ローカル Git status ヘルパー
  git-changes.ts        # ローカル diff 解析/ヘルパー
  markdown.ts           # Markdown／Mermaid／KaTeX プラグインの設定
  models-cache.ts       # モデル/プロバイダー検出キャッシュ
  skills-service.ts     # スキル一覧/検索/インストール/更新サポート
  worktree.ts           # project/worktree 解決と操作
  http-dispatcher.ts    # サーバー側 fetch の HTTP(S) プロキシ設定
  server-auth.ts        # desktop auth token 検証
hooks/
  useAgentSession.ts    # セッションの読み込み、コマンド送信、SSE ステートマシン
  useAudio.ts           # 完了通知音
  useDragDrop.ts        # 画像のドラッグ＆ドロップ
  useKeyboardShortcuts.ts # アプリのキーボードショートカット
  useTheme.ts           # テーマの切り替え
bin/
  pi-web.js             # CLI エントリポイント
instrumentation.ts      # サーバー HTTP ディスパッチャーの初期化
desktop/
  src/main/             # Electron メインプロセス：ウィンドウ、サイドカー、メニュー、ログ、セキュリティ
  src/preload/          # レンダラー向け contextBridge API
```
