# v1.3.2での音量バー挙動不安定の原因特定

## テスト結果
**v1.3.2 + onVolumeUpdateなし**: 音量バーの挙動が不安定

## 重要なログメッセージ（Line 37）
```
ℹ️ [PitchPro] Automatic UI updates enabled. Note: Values applied may include device-specific multipliers and may differ from callback result.volume. For precise control, set autoUpdateUI=false and handle UI manually.
```

## 分析
v1.3.2は autoUpdateUI による自動更新をサポートしているが、**注意書き**がある：
- "Values applied may include device-specific multipliers"
- "For precise control, set autoUpdateUI=false and handle UI manually"

これは、v1.3.2が **onVolumeUpdateコールバックを使った手動制御を推奨している**可能性を示唆。

## v1.3.1 vs v1.3.2の違い
### v1.3.1
- autoUpdateUI: true で音量バーが正常動作
- onVolumeUpdateコールバック不要

### v1.3.2  
- autoUpdateUI: true だが挙動が不安定
- 注意メッセージ: "precise controlにはautoUpdateUI=falseと手動制御を"
- つまり、v1.3.2ではonVolumeUpdateコールバックによる手動制御が**推奨**

## 結論
v1.3.2の「バックグラウンド制御ライブラリ化」により、音量バー更新の内部実装が変更された。
autoUpdateUIだけでは不安定で、onVolumeUpdateコールバックによる明示的な制御が必要になった可能性が高い。
