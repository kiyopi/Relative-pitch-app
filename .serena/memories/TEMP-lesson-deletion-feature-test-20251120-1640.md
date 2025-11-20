# レッスン削除機能 - 動作確認待ち

**作成日**: 2025-11-20 16:40  
**状態**: 実装完了・動作確認待ち

## 実装完了した機能

### 概要
総合評価ページ（results-overview）の下部に「Danger Zone」セクションを追加し、不要なレッスンデータを削除できる機能を実装。

### 実装内容

#### 1. DataManager.deleteLesson() メソッド
**ファイル**: `/PitchPro-SPA/js/data-manager.js`  
**行**: 1088-1145

**機能**:
- 指定されたlessonIdのセッションデータを削除
- 指定されたlessonIdの総合評価データを削除
- 削除件数とメッセージを返す

**実装コード**:
```javascript
/**
 * 特定のレッスンを削除
 *
 * @param {string} lessonId - 削除するレッスンのID
 * @returns {Object} { success: boolean, deletedCount: number, message: string }
 */
static deleteLesson(lessonId) {
    try {
        if (!lessonId) {
            return {
                success: false,
                deletedCount: 0,
                message: 'レッスンIDが指定されていません'
            };
        }

        let deletedCount = 0;

        // 1. セッションデータから該当レッスンを削除
        const sessions = this.getFromStorage(this.KEYS.SESSION_DATA) || [];
        const filteredSessions = sessions.filter(session => session.lessonId !== lessonId);
        const sessionDeletedCount = sessions.length - filteredSessions.length;

        if (sessionDeletedCount > 0) {
            this.saveToStorage(this.KEYS.SESSION_DATA, filteredSessions);
            deletedCount += sessionDeletedCount;
        }

        // 2. 総合評価データから該当レッスンを削除
        const evaluations = this.getFromStorage(this.KEYS.OVERALL_EVALUATION) || [];
        const filteredEvaluations = evaluations.filter(evaluation => evaluation.lessonId !== lessonId);
        const evalDeletedCount = evaluations.length - filteredEvaluations.length;

        if (evalDeletedCount > 0) {
            this.saveToStorage(this.KEYS.OVERALL_EVALUATION, filteredEvaluations);
            deletedCount += evalDeletedCount;
        }

        if (deletedCount === 0) {
            return {
                success: false,
                deletedCount: 0,
                message: '指定されたレッスンIDが見つかりませんでした'
            };
        }

        return {
            success: true,
            deletedCount: deletedCount,
            message: `レッスンを削除しました（${deletedCount}件のデータを削除）`
        };

    } catch (error) {
        console.error('❌ レッスン削除失敗:', error);
        return {
            success: false,
            deletedCount: 0,
            message: `削除に失敗しました: ${error.message}`
        };
    }
}
```

#### 2. Controller関数

**ファイル**: `/PitchPro-SPA/pages/js/results-overview-controller.js`  
**行**: 1830-1888

**confirmDeleteLesson()** (lines 1830-1843):
```javascript
/**
 * レッスン削除の確認ダイアログを表示
 */
function confirmDeleteLesson() {
    const lessonId = window.currentLessonId;
    if (!lessonId) {
        alert('レッスンIDが見つかりません');
        return;
    }

    const message = `このレッスンのすべてのデータを削除してもよろしいですか？\n\nレッスンID: ${lessonId}\n\nこの操作は元に戻せません。`;

    if (confirm(message)) {
        deleteLesson(lessonId);
    }
}
```

**deleteLesson()** (lines 1849-1888):
```javascript
/**
 * レッスンを削除する
 * @param {string} lessonId - 削除するレッスンID
 */
function deleteLesson(lessonId) {
    try {
        console.log(`🗑️ レッスン削除開始: ${lessonId}`);

        const result = window.DataManager.deleteLesson(lessonId);

        if (result.success) {
            alert(result.message);
            console.log(`✅ レッスン削除成功: ${result.deletedCount}件`);

            // 削除後のナビゲーション
            const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
            const isFromRecords = params.get('fromRecords') === 'true';

            if (isFromRecords) {
                // recordsページから来た場合はrecordsに戻る
                if (window.NavigationManager) {
                    window.NavigationManager.navigate('records');
                } else {
                    window.location.hash = 'records';
                }
            } else {
                // それ以外はホームに戻る
                if (window.NavigationManager) {
                    window.NavigationManager.navigate('home');
                } else {
                    window.location.hash = 'home';
                }
            }
        } else {
            alert(`削除に失敗しました\n\n${result.message}`);
            console.error('❌ レッスン削除失敗:', result.message);
        }

    } catch (error) {
        alert(`削除中にエラーが発生しました\n\n${error.message}`);
        console.error('❌ レッスン削除エラー:', error);
    }
}
```

**handleRecordsViewMode()修正** (lines 1807-1812):
```javascript
// Danger Zoneセクションを表示
const dangerZoneSection = document.getElementById('danger-zone-section');
if (dangerZoneSection) {
    dangerZoneSection.style.display = 'block';
    console.log('✅ Danger Zoneセクションを表示');
}
```

#### 3. HTML構造

**ファイル**: `/PitchPro-SPA/pages/results-overview.html`  
**行**: 373-396

```html
<!-- 危険ゾーン（Danger Zone） -->
<section class="glass-card danger-zone" id="danger-zone-section" style="display: none;">
    <h2 class="heading-md text-red-400">
        <i data-lucide="alert-triangle" style="width: 24px; height: 24px;"></i>
        <span>危険ゾーン</span>
    </h2>
    <p class="text-white-60 text-sm mb-4">
        このセクションの操作は元に戻せません。慎重に実行してください。
    </p>
    <div class="danger-zone-content">
        <div class="danger-zone-item">
            <div class="danger-zone-info">
                <h3 class="text-white font-semibold">このレッスンを削除</h3>
                <p class="text-white-60 text-sm">
                    このレッスンのすべてのデータ（セッション記録・総合評価）を削除します。
                </p>
            </div>
            <button class="btn btn-danger" onclick="confirmDeleteLesson()">
                <i data-lucide="trash-2"></i>
                <span>削除</span>
            </button>
        </div>
    </div>
</section>
```

**表示条件**:
- recordsページから遷移した場合のみ表示（`fromRecords=true`パラメータ）
- それ以外は非表示（`display: none`）

#### 4. CSS スタイル

**ファイル**: `/PitchPro-SPA/styles/base.css`  
**行**: 2969-3042

**主要スタイル**:
```css
.danger-zone {
    border: 1px solid rgba(239, 68, 68, 0.3);
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.1) 100%);
}

.btn-danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
}

.btn-danger:hover {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}
```

#### 5. キャッシュバスター更新

**ファイル**: `/PitchPro-SPA/index.html`

更新されたファイル:
- Line 36: `data-manager.js?v=1763569803`
- Line 37: `navigation-manager.js?v=1763568849`
- Line 51: `results-overview-controller.js?v=1763569803`

## テスト項目

### 基本機能テスト

1. **Danger Zone表示テスト**
   - [ ] recordsページから総合評価に遷移 → Danger Zone表示される
   - [ ] trainingページから総合評価に遷移 → Danger Zone表示されない
   - [ ] ダイレクトアクセス → Danger Zone表示されない

2. **削除確認ダイアログ**
   - [ ] 削除ボタンクリック → 確認ダイアログ表示
   - [ ] ダイアログにlessonID表示
   - [ ] キャンセルで削除中止

3. **削除実行**
   - [ ] OKで削除実行
   - [ ] 削除成功メッセージ表示
   - [ ] セッションデータから削除されている
   - [ ] 総合評価データから削除されている
   - [ ] localStorageを確認して削除確認

4. **削除後のナビゲーション**
   - [ ] recordsから来た場合 → recordsページに戻る
   - [ ] それ以外 → homeページに戻る

### エラーハンドリングテスト

5. **異常系**
   - [ ] lessonIDが存在しない場合のエラーメッセージ
   - [ ] DataManager.deleteLesson()失敗時のエラーメッセージ
   - [ ] 削除中の例外発生時のエラーメッセージ

### UI/UXテスト

6. **スタイル確認**
   - [ ] Danger Zoneの赤枠・背景グラデーション表示
   - [ ] 削除ボタンの赤グラデーション表示
   - [ ] ホバー時のアニメーション動作
   - [ ] Lucideアイコン（alert-triangle, trash-2）表示
   - [ ] モバイル表示での確認

## 動作確認後の作業

### 1. 仕様書更新

以下の仕様書に削除機能を追加:

**a) `/PitchPro-SPA/specifications/RESULTS_OVERVIEW_SPECIFICATION.md`**
- 機能一覧にDanger Zone追加
- 削除機能の仕様記述
- 表示条件の明記

**b) `/PitchPro-SPA/specifications/DATA_MANAGEMENT_SPECIFICATION.md`** (存在する場合)
- DataManager.deleteLesson()の仕様追加
- localStorage操作の詳細

**c) `/PitchPro-SPA/docs/USER_GUIDE.md`** (存在する場合)
- ユーザー向けの削除手順

### 2. Serenaメモリ削除

動作確認完了後、このメモリを削除:
```
TEMP-lesson-deletion-feature-test-20251120-1640
```

### 3. CLAUDE.md更新

Phase 1-2完了サマリーに削除機能を追加（必要に応じて）

## 実装時の修正履歴

### TypeScript Strict Modeエラー修正

**問題**: `eval`変数名がstrict modeで予約語として扱われる

**修正前** (DataManager.js line 1113):
```javascript
const filteredEvaluations = evaluations.filter(eval => eval.lessonId !== lessonId);
```

**修正後**:
```javascript
const filteredEvaluations = evaluations.filter(evaluation => evaluation.lessonId !== lessonId);
```

## 関連ファイル一覧

- `/PitchPro-SPA/js/data-manager.js` (v=1763569803)
- `/PitchPro-SPA/pages/js/results-overview-controller.js` (v=1763569803)
- `/PitchPro-SPA/pages/results-overview.html`
- `/PitchPro-SPA/styles/base.css` (lines 2969-3042)
- `/PitchPro-SPA/index.html` (キャッシュバスター更新)

## 注意事項

- **削除は元に戻せない**: ユーザーへの明確な警告が必要
- **recordsページからのみ表示**: セキュリティ的な配慮
- **NavigationManager使用**: SPAの正しい遷移を保証
- **localStorage直接操作**: DataManagerを経由した安全な操作
