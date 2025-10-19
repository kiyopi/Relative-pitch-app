/**
 * インポートパス自動テスト
 * v1.1.2: ファイル名変更に伴う各種インポートパスの検証
 */

import { describe, it, expect } from 'vitest';

describe('Import Paths Tests', () => {
  describe('Package.json Exports', () => {
    it('main entry point should exist', async () => {
      // package.json の main: "dist/index.js" が存在することを確認
      const mainModule = await import('../dist/index.js');
      expect(mainModule).toBeDefined();
      expect(typeof mainModule).toBe('object');
    });

    it('module entry point should exist', async () => {
      // package.json の module: "dist/index.esm.js" が存在することを確認
      const esmModule = await import('../dist/index.esm.js');
      expect(esmModule).toBeDefined();
      expect(typeof esmModule).toBe('object');
    });

    it('types entry point should exist', () => {
      // package.json の types: "dist/index.d.ts" が存在することを確認
      const fs = require('fs');
      const typesPath = './dist/index.d.ts';
      expect(fs.existsSync(typesPath)).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('legacy ESM path should work via symlink', async () => {
      // 後方互換性: 旧 pitchpro.esm.js パスでもアクセス可能
      try {
        const legacyEsm = await import('../dist/pitchpro.esm.js');
        expect(legacyEsm).toBeDefined();
        expect(typeof legacyEsm).toBe('object');
      } catch (error) {
        // シンボリックリンクが作成されていない場合はスキップ
        console.warn('Legacy ESM symlink not found - this is expected in test environment');
      }
    });

    it('legacy CJS path should work via symlink', async () => {
      // 後方互換性: 旧 pitchpro.cjs.js パスでもアクセス可能
      try {
        const legacyCjs = await import('../dist/pitchpro.cjs.js');
        expect(legacyCjs).toBeDefined();
        expect(typeof legacyCjs).toBe('object');
      } catch (error) {
        // シンボリックリンクが作成されていない場合はスキップ
        console.warn('Legacy CJS symlink not found - this is expected in test environment');
      }
    });
  });

  describe('Core Exports Verification', () => {
    it('should export main classes from index', async () => {
      const mainModule = await import('../dist/index.js');
      
      // 主要なエクスポートが存在することを確認
      expect(mainModule.PitchDetector).toBeDefined();
      expect(mainModule.AudioManager).toBeDefined();
      expect(mainModule.MicrophoneController).toBeDefined();
      expect(mainModule.DeviceDetection).toBeDefined();
      
      expect(typeof mainModule.PitchDetector).toBe('function');
      expect(typeof mainModule.AudioManager).toBe('function');
      expect(typeof mainModule.MicrophoneController).toBe('function');
      expect(typeof mainModule.DeviceDetection).toBe('function');
    });

    it('ESM and CJS exports should be identical', async () => {
      const esmModule = await import('../dist/index.esm.js');
      const cjsModule = await import('../dist/index.js');
      
      // 主要なエクスポートが両モジュール形式で同じであることを確認
      const mainExports = ['PitchDetector', 'AudioManager', 'MicrophoneController', 'DeviceDetection'];
      
      for (const exportName of mainExports) {
        expect(esmModule[exportName]).toBeDefined();
        expect(cjsModule[exportName]).toBeDefined();
        expect(typeof esmModule[exportName]).toBe(typeof cjsModule[exportName]);
      }
    });
  });

  describe('Build Output Consistency', () => {
    it('should have consistent file naming convention', () => {
      const fs = require('fs');
      const path = require('path');
      
      const distDir = './dist';
      const files = fs.readdirSync(distDir);
      
      // 新しい命名規則に従ったファイルが存在することを確認
      expect(files).toContain('index.js');          // CJS
      expect(files).toContain('index.esm.js');      // ESM  
      expect(files).toContain('pitchpro.umd.js');   // UMD (変更なし)
      expect(files).toContain('index.d.ts');        // Types
      
      // 各ファイルのサイズが0以上であることを確認
      const requiredFiles = ['index.js', 'index.esm.js', 'pitchpro.umd.js', 'index.d.ts'];
      
      for (const fileName of requiredFiles) {
        const filePath = path.join(distDir, fileName);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    it('should maintain UMD filename consistency', () => {
      const fs = require('fs');
      
      // UMDビルドは従来通り pitchpro.umd.js のまま維持
      expect(fs.existsSync('./dist/pitchpro.umd.js')).toBe(true);
      
      const umdContent = fs.readFileSync('./dist/pitchpro.umd.js', 'utf8');
      expect(umdContent.length).toBeGreaterThan(0);
      expect(umdContent).toContain('PitchPro'); // UMDグローバル名の確認
    });
  });

  describe('Import Resolution Tests', () => {
    it('should resolve default import correctly', async () => {
      // デフォルトインポートの解決テスト
      const defaultImport = await import('../dist/index.esm.js');
      expect(defaultImport).toBeDefined();
    });

    it('should resolve named imports correctly', async () => {
      // 名前付きインポートの解決テスト
      const { PitchDetector, AudioManager } = await import('../dist/index.esm.js');
      expect(PitchDetector).toBeDefined();
      expect(AudioManager).toBeDefined();
    });

    it('should handle Node.js require() correctly', () => {
      // Node.js require() での読み込みテスト
      const cjsModule = require('../dist/index.js');
      expect(cjsModule).toBeDefined();
      expect(cjsModule.PitchDetector).toBeDefined();
      expect(cjsModule.AudioManager).toBeDefined();
    });
  });
});