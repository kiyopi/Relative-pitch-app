# Audio Integration Check

このコマンドはPitchProオーディオライブラリの統合状況をチェックします。

## Instructions

以下の項目を確認し、オーディオシステムの実装状況を報告してください：

1. **PitchProライブラリ**の最新バージョン確認
2. **VolumeBarController**の実装状況確認
3. **AudioDetectionComponent**の使用状況確認
4. **MicrophoneController**の統合状況確認
5. **音量値取得**が正しい方法（result.volumeコールバック）で実装されているかチェック

重要な設計原則：
- 音量値は必ずコールバック方式で取得
- rawVolumeなどの直接プロパティアクセス禁止
- VolumeBarControllerの統一使用

問題があれば修正方法も含めて報告してください。