#!/usr/bin/env node

/**
 * 後方互換性のためのビルド後処理スクリプト
 * 旧ファイル名への互換性ファイルを作成
 * 
 * v1.1.2: ファイル名変更に伴う後方互換性対応
 * - pitchpro.esm.js -> index.esm.js
 * - pitchpro.cjs.js -> index.js
 * 
 * v1.1.5: GitHub Pages対応
 * - シンボリックリンクから実ファイルコピーに変更
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');

// シンボリックリンク作成対象
const symlinks = [
  {
    target: 'index.esm.js',
    link: 'pitchpro.esm.js'
  },
  {
    target: 'index.js', 
    link: 'pitchpro.cjs.js'
  }
];

console.log('🔗 [post-build] 後方互換性ファイル作成中...');

symlinks.forEach(({ target, link }) => {
  const targetPath = path.join(distDir, target);
  const linkPath = path.join(distDir, link);
  
  // 既存リンクを削除
  if (fs.existsSync(linkPath)) {
    fs.unlinkSync(linkPath);
    console.log(`🗑️ [post-build] 既存リンク削除: ${link}`);
  }
  
  // ターゲットファイルの存在確認
  if (!fs.existsSync(targetPath)) {
    console.warn(`⚠️ [post-build] ターゲットファイル不存在: ${target}`);
    return;
  }
  
  try {
    // GitHub Pages対応: シンボリックリンクではなく実ファイルをコピー
    fs.copyFileSync(targetPath, linkPath);
    console.log(`✅ [post-build] ファイルコピー作成: ${link} <- ${target}`);
  } catch (error) {
    console.error(`❌ [post-build] ファイルコピー作成失敗: ${link}`, error.message);
  }
});

console.log('🎉 [post-build] 後方互換性処理完了');