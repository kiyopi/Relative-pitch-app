import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Music, 
  Mic, 
  Trophy, 
  Settings, 
  Upload, 
  BarChart3, 
  Target, 
  Zap, 
  Play, 
  Volume2,
  Star,
  Users,
  Activity,
  Heart,
  Bell,
  Search,
  Download,
  Share
} from 'lucide-react';

const UiCatalog: React.FC = () => {
  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="p-2 text-white-70 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="text-center flex-grow">
            <h1 className="text-4xl font-bold text-white mb-2">UIカタログ</h1>
            <p className="text-purple-200">初期テンプレートスタイルガイド</p>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Typography Section */}
        <div className="glass-card mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            タイポグラフィ
          </h2>
          <div className="space-y-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">見出し 1 (H1) - 4xl</h1>
              <code className="text-white-60 text-sm">text-4xl font-bold text-white</code>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">見出し 2 (H2) - 3xl</h2>
              <code className="text-white-60 text-sm">text-3xl font-bold text-white</code>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">見出し 3 (H3) - 2xl</h3>
              <code className="text-white-60 text-sm">text-2xl font-bold text-white</code>
            </div>
            <div>
              <h4 className="text-xl font-bold text-white mb-2">見出し 4 (H4) - xl</h4>
              <code className="text-white-60 text-sm">text-xl font-bold text-white</code>
            </div>
            <div>
              <p className="text-white mb-2">標準テキスト - これは通常の段落テキストです。</p>
              <code className="text-white-60 text-sm">text-white</code>
            </div>
            <div>
              <p className="text-white-70 mb-2">セカンダリテキスト - 補助的な情報に使用します。</p>
              <code className="text-white-60 text-sm">text-white-70</code>
            </div>
            <div>
              <p className="text-purple-200 mb-2">アクセントテキスト - 特別な情報を強調します。</p>
              <code className="text-white-60 text-sm">text-purple-200</code>
            </div>
            <div>
              <p className="text-green-200">成功テキスト - 成功状態や肯定的な情報に使用します。</p>
              <code className="text-white-60 text-sm">text-green-200</code>
            </div>
          </div>
        </div>

        {/* Buttons Section */}
        <div className="glass-card mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <div className="w-8 h-8 gradient-success rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">B</span>
            </div>
            ボタン
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">基本ボタン</h3>
              <div className="flex flex-wrap gap-4 mb-4">
                <button className="btn btn-primary">プライマリ</button>
                <button className="btn btn-secondary">セカンダリ</button>
                <button className="btn btn-success">成功</button>
                <button className="btn btn-warning">警告</button>
                <button className="btn btn-error">エラー</button>
              </div>
              <code className="text-white-60 text-sm">btn btn-primary | btn-secondary | btn-success | btn-warning | btn-error</code>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-white mb-4">アイコン付きボタン</h3>
              <div className="flex flex-wrap gap-4 mb-4">
                <button className="btn btn-primary flex items-center space-x-2">
                  <Play className="w-4 h-4" />
                  <span>再生</span>
                </button>
                <button className="btn btn-secondary flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>ダウンロード</span>
                </button>
                <button className="btn btn-success flex items-center space-x-2">
                  <Share className="w-4 h-4" />
                  <span>共有</span>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-4">状態</h3>
              <div className="flex flex-wrap gap-4 mb-4">
                <button className="btn btn-primary">通常</button>
                <button className="btn btn-primary hover:scale-105">ホバー</button>
                <button className="btn btn-primary" disabled>無効</button>
              </div>
            </div>
          </div>
        </div>

        {/* Cards Section */}
        <div className="glass-card mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <div className="w-8 h-8 gradient-warning rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            カード
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">基本カード</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="glass-card">
                  <h4 className="text-lg font-bold text-white mb-2">標準カード</h4>
                  <p className="text-white-70 mb-4">これは標準のグラスカードです。メインコンテンツのグループ化に使用します。</p>
                  <code className="text-white-60 text-xs">glass-card</code>
                </div>
                <div className="glass-card-sm">
                  <h4 className="text-lg font-bold text-white mb-2">小カード</h4>
                  <p className="text-white-70 mb-4">コンパクトな情報表示に適した小さなカードです。</p>
                  <code className="text-white-60 text-xs">glass-card-sm</code>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-4">統計カード</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="glass-card-sm">
                  <div className="flex items-center justify-between mb-4">
                    <BarChart3 className="w-8 h-8 text-green-300" />
                    <span className="text-2xl font-bold text-white">A</span>
                  </div>
                  <p className="text-green-200 text-sm">総合レベル</p>
                </div>
                <div className="glass-card-sm">
                  <div className="flex items-center justify-between mb-4">
                    <Trophy className="w-8 h-8 text-blue-300" />
                    <span className="text-2xl font-bold text-white">156</span>
                  </div>
                  <p className="text-green-200 text-sm">セッション数</p>
                </div>
                <div className="glass-card-sm">
                  <div className="flex items-center justify-between mb-4">
                    <Target className="w-8 h-8 text-yellow-300" />
                    <span className="text-2xl font-bold text-white">87.5%</span>
                  </div>
                  <p className="text-green-200 text-sm">平均精度</p>
                </div>
                <div className="glass-card-sm">
                  <div className="flex items-center justify-between mb-4">
                    <Activity className="w-8 h-8 text-purple-200" />
                    <span className="text-2xl font-bold text-white">12</span>
                  </div>
                  <p className="text-white-70 text-sm">連続正解</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gradients Section */}
        <div className="glass-card mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <div className="w-8 h-8 gradient-error rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">G</span>
            </div>
            グラデーション
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">基本グラデーション</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="aspect-square rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-sm">
                  Primary
                </div>
                <div className="aspect-square rounded-xl gradient-success flex items-center justify-center text-white font-bold text-sm">
                  Success
                </div>
                <div className="aspect-square rounded-xl gradient-warning flex items-center justify-center text-white font-bold text-sm">
                  Warning
                </div>
                <div className="aspect-square rounded-xl gradient-error flex items-center justify-center text-white font-bold text-sm">
                  Error
                </div>
              </div>
              <code className="text-white-60 text-sm">gradient-primary | gradient-success | gradient-warning | gradient-error</code>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-4">アイコン付きグラデーション</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <div className="w-16 h-16 gradient-success rounded-2xl flex items-center justify-center">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div className="w-16 h-16 gradient-warning rounded-2xl flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div className="w-16 h-16 gradient-error rounded-2xl flex items-center justify-center">
                  <Heart className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bars Section */}
        <div className="glass-card mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            プログレスバー
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-white-70 mb-2">25% 完了</p>
              <div className="progress-bar mb-4">
                <div className="progress-fill" style={{ width: '25%' }}></div>
              </div>
            </div>
            <div>
              <p className="text-white-70 mb-2">50% 完了</p>
              <div className="progress-bar mb-4">
                <div className="progress-fill" style={{ width: '50%' }}></div>
              </div>
            </div>
            <div>
              <p className="text-white-70 mb-2">75% 完了</p>
              <div className="progress-bar mb-4">
                <div className="progress-fill" style={{ width: '75%' }}></div>
              </div>
            </div>
            <div>
              <p className="text-white-70 mb-2">100% 完了</p>
              <div className="progress-bar mb-4">
                <div className="progress-fill" style={{ width: '100%' }}></div>
              </div>
            </div>
            <code className="text-white-60 text-sm">progress-bar + progress-fill</code>
          </div>
        </div>

        {/* Form Elements Section */}
        <div className="glass-card mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <div className="w-8 h-8 bg-purple-500/30 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            フォーム要素
          </h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="textInput" className="block text-white-70 text-sm font-bold mb-2">
                テキスト入力
              </label>
              <input
                type="text"
                id="textInput"
                placeholder="テキストを入力してください..."
                className="w-full py-3 px-4 text-white bg-white/10 border border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:border-white/40 transition-colors"
              />
            </div>
            
            <div>
              <label htmlFor="searchInput" className="block text-white-70 text-sm font-bold mb-2">
                検索入力
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="search"
                  id="searchInput"
                  placeholder="検索..."
                  className="w-full py-3 pl-10 pr-4 text-white bg-white/10 border border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:border-white/40 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="selectInput" className="block text-white-70 text-sm font-bold mb-2">
                選択
              </label>
              <select
                id="selectInput"
                className="w-full py-3 px-4 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-white/40 transition-colors"
              >
                <option value="">選択してください</option>
                <option value="option1">オプション 1</option>
                <option value="option2">オプション 2</option>
                <option value="option3">オプション 3</option>
              </select>
            </div>

            <div>
              <label htmlFor="textareaInput" className="block text-white-70 text-sm font-bold mb-2">
                テキストエリア
              </label>
              <textarea
                id="textareaInput"
                rows={4}
                placeholder="メッセージを入力してください..."
                className="w-full py-3 px-4 text-white bg-white/10 border border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:border-white/40 transition-colors resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Icons Section */}
        <div className="glass-card mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <div className="w-8 h-8 bg-green-500/30 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">I</span>
            </div>
            アイコン
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">基本アイコン</h3>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-4 mb-4">
                <div className="flex flex-col items-center space-y-2">
                  <Music className="w-6 h-6 text-white" />
                  <span className="text-white-60 text-xs">Music</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <Mic className="w-6 h-6 text-white" />
                  <span className="text-white-60 text-xs">Mic</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <Trophy className="w-6 h-6 text-white" />
                  <span className="text-white-60 text-xs">Trophy</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <Settings className="w-6 h-6 text-white" />
                  <span className="text-white-60 text-xs">Settings</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="w-6 h-6 text-white" />
                  <span className="text-white-60 text-xs">Upload</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <BarChart3 className="w-6 h-6 text-white" />
                  <span className="text-white-60 text-xs">Chart</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <Target className="w-6 h-6 text-white" />
                  <span className="text-white-60 text-xs">Target</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <Zap className="w-6 h-6 text-white" />
                  <span className="text-white-60 text-xs">Zap</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <Play className="w-6 h-6 text-white" />
                  <span className="text-white-60 text-xs">Play</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <Volume2 className="w-6 h-6 text-white" />
                  <span className="text-white-60 text-xs">Volume</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <Star className="w-6 h-6 text-white" />
                  <span className="text-white-60 text-xs">Star</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <Users className="w-6 h-6 text-white" />
                  <span className="text-white-60 text-xs">Users</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-4">カラーアイコン</h3>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-4 mb-4">
                <Music className="w-8 h-8 text-blue-300" />
                <Mic className="w-8 h-8 text-green-300" />
                <Trophy className="w-8 h-8 text-yellow-300" />
                <Settings className="w-8 h-8 text-purple-300" />
                <Upload className="w-8 h-8 text-pink-300" />
                <BarChart3 className="w-8 h-8 text-indigo-300" />
                <Target className="w-8 h-8 text-red-300" />
                <Zap className="w-8 h-8 text-orange-300" />
                <Play className="w-8 h-8 text-teal-300" />
                <Volume2 className="w-8 h-8 text-cyan-300" />
                <Star className="w-8 h-8 text-amber-300" />
                <Users className="w-8 h-8 text-lime-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Animations Section */}
        <div className="glass-card mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <div className="w-8 h-8 bg-pink-500/30 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            アニメーション
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">ホバーエフェクト</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="glass-card-sm hover-scale cursor-pointer">
                  <p className="text-white text-center">hover-scale</p>
                </div>
                <div className="glass-card-sm hover:bg-white/20 transition-colors cursor-pointer">
                  <p className="text-white text-center">hover:bg-white/20</p>
                </div>
                <div className="glass-card-sm hover:shadow-lg transition-shadow cursor-pointer">
                  <p className="text-white text-center">hover:shadow-lg</p>
                </div>
                <div className="glass-card-sm hover:border-white/40 border border-white/20 transition-colors cursor-pointer">
                  <p className="text-white text-center">hover:border</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-4">パルスエフェクト</h3>
              <div className="flex space-x-4 mb-4">
                <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center animate-pulse-glow">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <div className="w-16 h-16 gradient-success rounded-full flex items-center justify-center animate-pulse">
                  <Zap className="w-8 h-8 text-white" />
                </div>
              </div>
              <code className="text-white-60 text-sm">animate-pulse-glow | animate-pulse</code>
            </div>
          </div>
        </div>

        {/* Color Palette Section */}
        <div className="glass-card mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <div className="w-8 h-8 bg-indigo-500/30 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">🎨</span>
            </div>
            カラーパレット
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">テキストカラー</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="glass-card-sm">
                  <p className="text-white mb-2">text-white</p>
                  <code className="text-white-60 text-xs">#ffffff</code>
                </div>
                <div className="glass-card-sm">
                  <p className="text-white-70 mb-2">text-white-70</p>
                  <code className="text-white-60 text-xs">rgba(255,255,255,0.7)</code>
                </div>
                <div className="glass-card-sm">
                  <p className="text-white-60 mb-2">text-white-60</p>
                  <code className="text-white-60 text-xs">rgba(255,255,255,0.6)</code>
                </div>
                <div className="glass-card-sm">
                  <p className="text-purple-200 mb-2">text-purple-200</p>
                  <code className="text-white-60 text-xs">#e9d5ff</code>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-4">アクセントカラー</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
                <div className="aspect-square bg-green-300 rounded-lg flex items-center justify-center">
                  <span className="text-black text-xs font-bold">green-300</span>
                </div>
                <div className="aspect-square bg-blue-300 rounded-lg flex items-center justify-center">
                  <span className="text-black text-xs font-bold">blue-300</span>
                </div>
                <div className="aspect-square bg-yellow-300 rounded-lg flex items-center justify-center">
                  <span className="text-black text-xs font-bold">yellow-300</span>
                </div>
                <div className="aspect-square bg-purple-300 rounded-lg flex items-center justify-center">
                  <span className="text-black text-xs font-bold">purple-300</span>
                </div>
                <div className="aspect-square bg-pink-300 rounded-lg flex items-center justify-center">
                  <span className="text-black text-xs font-bold">pink-300</span>
                </div>
                <div className="aspect-square bg-indigo-300 rounded-lg flex items-center justify-center">
                  <span className="text-black text-xs font-bold">indigo-300</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center">
          <Link to="/" className="btn btn-primary">
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UiCatalog;