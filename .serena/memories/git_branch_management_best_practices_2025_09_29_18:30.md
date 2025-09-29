# Gitブランチ管理ベストプラクティス

## 🎯 現在の問題状況
- 多数のfeatureブランチが存在（12個のローカル + リモートブランチ）
- ブランチ間の関係性が不明確
- 作業完了後のブランチ整理が不十分
- どのブランチで作業すべきか迷いやすい状況

## ✅ 推奨ブランチ管理戦略

### 1. ブランチ命名規則の統一
```bash
# 基本形式
{type}/{scope}-{description}

# 実例
feature/step1-microphone-permission-fix
fix/step2-audio-detection-bug
refactor/global-audio-manager-cleanup
docs/api-documentation-update
```

### 2. ブランチタイプ分類
```
feature/    # 新機能開発
fix/        # バグ修正
refactor/   # リファクタリング
docs/       # ドキュメント更新
test/       # テスト追加・修正
style/      # UI/CSS変更
chore/      # 設定変更・ツール更新
```

### 3. 作業開始前のブランチ確認手順
```bash
# STEP 1: 現在のブランチを確認
git branch

# STEP 2: 作業内容に最も適したブランチを特定
# 例: マイク許可修正なら feature/microphone-permission-fix

# STEP 3: 対象ブランチに切り替え
git checkout feature/microphone-permission-fix

# STEP 4: 最新状態に更新
git pull origin feature/microphone-permission-fix
```

## 🧹 ブランチ整理のルール

### 作業完了時の必須チェック
```bash
# 1. 現在のブランチ確認
git branch

# 2. 変更状況確認
git status

# 3. 適切なコミットメッセージでコミット
git commit -m "適切なメッセージ"

# 4. リモートにプッシュ
git push origin [現在のブランチ名]
```

### 定期的なブランチクリーンアップ
```bash
# 1. マージ済みローカルブランチの削除
git branch --merged | grep -v "main\|master" | xargs -n 1 git branch -d

# 2. リモート追跡ブランチの整理
git remote prune origin

# 3. 不要なfeatureブランチの手動削除
git branch -D feature/old-branch-name
```

## 🎯 特定タスク用の推奨ブランチ選択

### 現在のプロジェクト状況での推奨
```
preparation-step1.html修正 → feature/microphone-permission-fix ✅
preparation-step2.html修正 → feature/microphone-permission-fix or 新規
training.html修正 → 新規 feature/training-integration
グローバル機能修正 → feature/core-vanilla-typescript-setup
CSS/UI修正 → feature/css-variables-system
```

### 新規作業時のブランチ作成
```bash
# mainから最新を取得
git checkout main
git pull origin main

# 新しいfeatureブランチ作成
git checkout -b feature/new-task-description

# 作業開始
# ...

# 完了時にリモートにプッシュ
git push -u origin feature/new-task-description
```

## 🚨 間違えやすいポイントと対策

### 1. 間違ったブランチでの作業
**問題**: 意図しないブランチで変更を加えてしまう

**対策**:
```bash
# 作業開始前に必ず確認
echo "現在のブランチ: $(git branch --show-current)"
echo "作業内容: [作業内容を明記]"
echo "適切なブランチですか? (y/n)"
```

### 2. ブランチ間の変更混在
**問題**: 複数の機能をひとつのブランチで開発

**対策**:
- 1ブランチ = 1機能 の原則徹底
- 大きな機能は細分化してブランチ分割

### 3. 未コミットでのブランチ切り替え
**問題**: 変更を保存せずにブランチ変更

**対策**:
```bash
# 切り替え前に必ず確認
git status

# 未コミットの変更がある場合
git stash save "作業中の変更"
git checkout other-branch
# 戻る時
git checkout original-branch
git stash pop
```

## 📋 実用的なGitエイリアス設定

### 推奨エイリアス
```bash
# ~/.gitconfig に追加
[alias]
    st = status
    co = checkout
    br = branch
    cm = commit -m
    ps = push
    pl = pull
    lg = log --oneline --graph --decorate
    current = branch --show-current
    clean-branches = "!git branch --merged | grep -v 'main\\|master' | xargs -n 1 git branch -d"
```

### 使用例
```bash
git st              # git status
git co main         # git checkout main
git br              # git branch
git cm "message"    # git commit -m "message"
git current         # 現在のブランチ名を表示
git clean-branches  # マージ済みブランチを削除
```

## 🔄 推奨ワークフロー

### 日常的な作業フロー
```
1. 作業開始前
   ├── git st (状態確認)
   ├── git current (ブランチ確認)
   └── 適切なブランチか判断

2. 作業中
   ├── 定期的な git st
   ├── 意味のある単位でコミット
   └── git ps (定期的にリモートに保存)

3. 作業完了時
   ├── 最終コミット
   ├── git ps
   └── 必要に応じてPR作成
```

### 緊急時の対処法
```bash
# 間違ったブランチで作業してしまった場合
git stash save "間違ったブランチでの作業"
git checkout correct-branch
git stash pop

# 間違ったファイルをコミットしてしまった場合
git reset --soft HEAD~1  # 最新コミットを取り消し
# ファイルを修正後
git add correct-files
git commit -m "修正されたコミット"
```

## 🎯 今後の改善提案

### 1. ブランチ戦略の簡素化
- 現在の12個のfeatureブランチを整理
- アクティブなブランチのみ維持
- 完了済みブランチの削除

### 2. 命名規則の統一
- 新規ブランチは必ず規則に従って命名
- 既存ブランチの段階的リネーム

### 3. 自動化の導入
```bash
# 作業開始用スクリプト例
#!/bin/bash
echo "現在のブランチ: $(git branch --show-current)"
echo "作業内容を入力してください:"
read task_description
echo "新しいブランチを作成しますか? (y/n):"
read create_new
if [ "$create_new" = "y" ]; then
    git checkout -b "feature/$task_description"
fi
```

## 📝 関連コマンドクイックリファレンス

```bash
# ブランチ関連
git branch                          # ローカルブランチ一覧
git branch -a                       # 全ブランチ一覧
git branch -d branch-name           # ブランチ削除
git checkout -b new-branch          # 新ブランチ作成&切り替え
git checkout branch-name            # ブランチ切り替え

# リモート関連
git push -u origin branch-name      # 初回プッシュ
git push origin branch-name         # プッシュ
git pull origin branch-name         # プル
git remote prune origin             # リモート追跡ブランチ整理

# 状態確認
git status                          # 変更状況
git branch --show-current           # 現在のブランチ
git log --oneline -5               # 最近のコミット
```

---

作成日: 2025年9月29日 18:30
重要度: ⭐⭐⭐⭐ (重要)
関連者: Claude Code, プロジェクト開発チーム