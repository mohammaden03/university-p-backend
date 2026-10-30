import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Cpu,
  Layers,
  History,
  Database,
  ExternalLink,
  ShieldCheck,
  Terminal,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Download,
  Scroll,
} from 'lucide-react';
import { PersianArabicNormalizer } from './search/persian-arabic-normalizer';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'normalizer' | 'manuscripts' | 'htr' | 'revisions' | 'datasets' | 'curl'
  >('overview');

  // Normalizer state
  const [normalizerInput, setNormalizerInput] = useState(
    'بِسمِ اللَّهِ الرَّحمٰنِ الرَّحِيمِ\nالا یا أیّها السّاقی أَدِرْ كَأساً وَناوِلْها\nکه عشق آسان نمود اوّل ولی اُفتاد مشکل‌ها (شماره ۱۲۳۴۵ـ)',
  );
  const [searchQuery, setSearchQuery] = useState('عشق اسان');
  const [copiedCurl, setCopiedCurl] = useState<string | null>(null);

  const normalizedOutput = PersianArabicNormalizer.normalize(normalizerInput);
  const snippetOutput = PersianArabicNormalizer.createSnippet(
    normalizerInput,
    searchQuery,
    45,
  );

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCurl(id);
    setTimeout(() => setCopiedCurl(null), 2000);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 font-sans flex flex-col">
      {/* Top Banner */}
      <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scroll className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-stone-100 flex items-center gap-2">
                Persian &amp; Arabic Manuscript HTR/OCR Platform
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Backend API v1
                </span>
              </h1>
              <p className="text-xs text-stone-400 hidden sm:block">
                Design and Development of an Intelligent HTR/OCR System with Islamic Calligraphy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium text-xs transition shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Swagger Docs</span>
            </a>
            <a
              href="/health"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium text-xs border border-stone-700 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>/health</span>
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 border-t border-stone-800/60 scrollbar-none text-xs">
          {[
            { id: 'overview', label: 'Architecture & System', icon: Layers },
            { id: 'normalizer', label: 'Text Normalizer & Search', icon: Search },
            { id: 'manuscripts', label: 'Manuscripts & Pages', icon: BookOpen },
            { id: 'htr', label: 'HTR AI Pipeline', icon: Cpu },
            { id: 'revisions', label: 'Revision History Diff', icon: History },
            { id: 'datasets', label: 'Datasets & Leak-Free Splits', icon: Database },
            { id: 'curl', label: 'cURL & API Client', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: SYSTEM OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  Academic University Backend Architecture
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
                  Intelligent HTR/OCR System for Persian &amp; Arabic Manuscripts
                </h2>
                <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
                  A production-conscious NestJS &amp; PostgreSQL backend serving as the central
                  business orchestrator for Islamic calligraphy manuscript cataloging, page image
                  preservation, Python machine-learning HTR inference, immutable revision histories,
                  and leak-free dataset training exports.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-stone-900/80 border border-stone-800 p-3.5 rounded-xl">
                    <div className="text-xs text-stone-400">Framework</div>
                    <div className="font-semibold text-stone-200 mt-0.5">NestJS + TypeScript</div>
                  </div>
                  <div className="bg-stone-900/80 border border-stone-800 p-3.5 rounded-xl">
                    <div className="text-xs text-stone-400">Database</div>
                    <div className="font-semibold text-stone-200 mt-0.5">PostgreSQL + Prisma</div>
                  </div>
                  <div className="bg-stone-900/80 border border-stone-800 p-3.5 rounded-xl">
                    <div className="text-xs text-stone-400">Authentication</div>
                    <div className="font-semibold text-stone-200 mt-0.5">JWT + Refresh Rotation</div>
                  </div>
                  <div className="bg-stone-900/80 border border-stone-800 p-3.5 rounded-xl">
                    <div className="text-xs text-stone-400">AI Service</div>
                    <div className="font-semibold text-stone-200 mt-0.5">FastAPI Python Client</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-stone-200 text-base">Authentication &amp; RBAC</h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  JWT access tokens with bcrypt password hashing. Revocable refresh token rotation
                  with SHA-256 database hashing. Strict ADMIN vs. RESEARCHER role separation.
                </p>
                <div className="text-xs font-mono text-stone-500 pt-1">
                  POST /api/v1/auth/register, /login, /refresh, /me
                </div>
              </div>

              <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-stone-200 text-base">Manuscripts &amp; Secure Storage</h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Bibliographic metadata for Nasta&apos;liq, Naskh, and Thuluth manuscripts. File signature (magic bytes)
                  inspection for JPEG, PNG, TIFF, WebP, with path traversal prevention.
                </p>
                <div className="text-xs font-mono text-stone-500 pt-1">
                  /api/v1/manuscripts, /pages, /pages/:id/image
                </div>
              </div>

              <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-stone-200 text-base">HTR Orchestration &amp; Revisions</h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Asynchronous HTR jobs pipeline with idempotency. AI outputs are permanently preserved
                  while human corrections create traceable revisions with transactional pointer switching.
                </p>
                <div className="text-xs font-mono text-stone-500 pt-1">
                  /pages/:id/recognize, /transcriptions/:id
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEXT NORMALIZER & SEARCH */}
        {activeTab === 'normalizer' && (
          <div className="space-y-6">
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                    <Search className="w-5 h-5 text-amber-400" />
                    Persian &amp; Arabic Text Normalization Engine
                  </h3>
                  <p className="text-xs text-stone-400">
                    Deterministic Unicode normalization, letter-variant folding (Yeh, Kaf, Alef),
                    Tashkeel stripping, Tatweel removal, and digit unification without destroying original text.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setNormalizerInput(
                      'أَلا یا أیّها الساقی أدِرْ کأساً وناوِلْها\nکه عشق آسان نمود اول ولی افتاد مشکل‌ها (مورخ ۱۲۳۴۵ـ)',
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs border border-stone-700 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Sample
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Input Text */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-400">
                    Original Manuscript Text (with Harakat/Diacritics &amp; Variant Characters):
                  </label>
                  <textarea
                    rows={6}
                    value={normalizerInput}
                    onChange={(e) => setNormalizerInput(e.target.value)}
                    dir="rtl"
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg p-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-serif leading-loose"
                  />
                </div>

                {/* Normalized Output */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-amber-400">
                    Normalized Index Form (Stored for Inverted Substring Search):
                  </label>
                  <div
                    dir="rtl"
                    className="w-full h-[162px] bg-stone-900/60 border border-amber-500/30 rounded-lg p-3 text-sm text-stone-200 overflow-y-auto font-serif leading-loose"
                  >
                    {normalizedOutput || <span className="text-stone-500 italic">Empty text...</span>}
                  </div>
                </div>
              </div>

              {/* Snippet Search Test */}
              <div className="pt-4 border-t border-stone-800/80 space-y-3">
                <label className="text-xs font-semibold text-stone-300">
                  Live Search Snippet &amp; Highlight Test:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter query term (e.g. عشق اسان or ۱۲۳۴۵)"
                    dir="rtl"
                    className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="bg-stone-900/80 border border-stone-800 rounded-lg p-4 text-xs font-mono">
                  <div className="text-stone-400 mb-1">Generated Context Snippet:</div>
                  <div
                    dir="rtl"
                    className="text-stone-200 font-serif text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: snippetOutput.replace(
                        /<mark>/g,
                        '<mark class="bg-amber-500/30 text-amber-200 px-1 rounded font-bold">',
                      ),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MANUSCRIPTS & PAGES */}
        {activeTab === 'manuscripts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Manuscript 1 */}
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                    PERSIAN
                  </span>
                  <span className="text-xs text-stone-500 font-mono">MS-MAL-4821</span>
                </div>
                <div>
                  <h4 className="font-bold text-stone-100 text-base" dir="rtl">
                    دیوان حافظ شیرازی (نسخه قاجاری)
                  </h4>
                  <p className="text-xs text-amber-400 font-medium mt-0.5" dir="rtl">
                    خواجه شمس‌الدین محمد حافظ شیرازی
                  </p>
                </div>
                <div className="space-y-1.5 text-xs text-stone-400 pt-2 border-t border-stone-800">
                  <div className="flex justify-between">
                    <span>Script:</span>
                    <span className="text-stone-200">نستعلیق ممتاز (Nasta&apos;liq)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Period:</span>
                    <span className="text-stone-200">اوایل قرن ۱۳ هـ.ق (قاجار)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Repository:</span>
                    <span className="text-stone-200">کتابخانه و موزه ملی ملک</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pages Registered:</span>
                    <span className="text-stone-200">1 folio (hafez_folio_001r.png)</span>
                  </div>
                </div>
              </div>

              {/* Manuscript 2 */}
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium">
                    ARABIC
                  </span>
                  <span className="text-xs text-stone-500 font-mono">MS-AQR-10492</span>
                </div>
                <div>
                  <h4 className="font-bold text-stone-100 text-base" dir="rtl">
                    صحیفه سجادیه (نسخه کهن صفوی)
                  </h4>
                  <p className="text-xs text-amber-400 font-medium mt-0.5" dir="rtl">
                    امام علی بن الحسین زین العابدین (ع)
                  </p>
                </div>
                <div className="space-y-1.5 text-xs text-stone-400 pt-2 border-t border-stone-800">
                  <div className="flex justify-between">
                    <span>Script:</span>
                    <span className="text-stone-200">نسخ شیوا (Naskh)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Period:</span>
                    <span className="text-stone-200">قرن ۱۱ هـ.ق (دوره صفویه)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Repository:</span>
                    <span className="text-stone-200">آستان قدس رضوی</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pages Registered:</span>
                    <span className="text-stone-200">1 folio (sahifeh_folio_001r.png)</span>
                  </div>
                </div>
              </div>

              {/* Manuscript 3 */}
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 font-medium">
                    MIXED
                  </span>
                  <span className="text-xs text-stone-500 font-mono">MS-LIB-2038</span>
                </div>
                <div>
                  <h4 className="font-bold text-stone-100 text-base" dir="rtl">
                    گلستان سعدی با شواهد عربی
                  </h4>
                  <p className="text-xs text-amber-400 font-medium mt-0.5" dir="rtl">
                    مصلح بن عبدالله سعدی شیرازی
                  </p>
                </div>
                <div className="space-y-1.5 text-xs text-stone-400 pt-2 border-t border-stone-800">
                  <div className="flex justify-between">
                    <span>Script:</span>
                    <span className="text-stone-200">شکسته نستعلیق و نسخ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Period:</span>
                    <span className="text-stone-200">قرن ۱۲ هـ.ق</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Repository:</span>
                    <span className="text-stone-200">کتابخانه مجلس شورای اسلامی</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pages Registered:</span>
                    <span className="text-stone-200">1 folio (golestan_folio_001r.png)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HTR AI PIPELINE */}
        {activeTab === 'htr' && (
          <div className="space-y-6">
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                Deep-Learning HTR Inference Workflow State Machine
              </h3>
              <p className="text-xs text-stone-400">
                The NestJS backend manages the complete recognition lifecycle, delegating inference
                to a dedicated Python FastAPI service and guaranteeing transactional persistence.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-3">
                {[
                  { step: '1', title: 'PENDING', desc: 'Job created with idempotency key verification' },
                  { step: '2', title: 'RUNNING', desc: 'Execution started, image resolved in secure storage' },
                  { step: '3', title: 'INFERENCE', desc: 'Python FastAPI called with bounded timeout' },
                  { step: '4', title: 'VALIDATE', desc: 'Strict schema check for text, duration, and confidence' },
                  { step: '5', title: 'SUCCEEDED', desc: 'Transactional revision created and job closed' },
                ].map((s) => (
                  <div key={s.step} className="bg-stone-900 border border-stone-800 p-4 rounded-xl space-y-1.5">
                    <div className="text-xs font-mono font-bold text-cyan-400">STEP {s.step}</div>
                    <div className="font-semibold text-stone-200 text-sm">{s.title}</div>
                    <div className="text-xs text-stone-400 leading-snug">{s.desc}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-stone-900/60 border border-stone-800 text-xs font-mono space-y-1">
                <div className="text-amber-400 font-semibold">Configured Python Service Contract:</div>
                <div className="text-stone-300">Base URL: http://ai-service:8000</div>
                <div className="text-stone-300">Endpoints: GET /health, GET /v1/models, POST /v1/recognize</div>
                <div className="text-stone-400">
                  Fallback Behavior: Explicit SERVICE_UNAVAILABLE error with preserved FAILED job record.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: REVISIONS & DIFF */}
        {activeTab === 'revisions' && (
          <div className="space-y-6">
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                Immutable Transcription Revision Tracking
              </h3>
              <p className="text-xs text-stone-400">
                Preserves original AI output verbatim while allowing scholars to submit corrections.
                Previous revisions are never overwritten; a new revision is created with researcher attribution.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* AI Revision 1 */}
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">
                      Revision #1 (AI Inferred)
                    </span>
                    <span className="text-xs text-stone-500">Confidence: 94.2%</span>
                  </div>
                  <div
                    dir="rtl"
                    className="p-3 bg-stone-950/70 border border-stone-800 rounded-lg font-serif text-sm leading-loose text-stone-300"
                  >
                    الا یا ایها الساقی ادر کأسا و ناولها
                    <br />
                    که عشق اسان نمود اول ولی افتاد مشکل‌ها
                  </div>
                  <div className="text-xs text-stone-400">
                    Model: <span className="text-stone-200">qajar-nastaliq-ctc-v2</span>
                  </div>
                </div>

                {/* Human Revision 2 */}
                <div className="bg-stone-900 border border-emerald-500/30 rounded-xl p-5 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                      Revision #2 (Human Corrected - Current)
                    </span>
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ACTIVE
                    </span>
                  </div>
                  <div
                    dir="rtl"
                    className="p-3 bg-stone-950/70 border border-emerald-500/20 rounded-lg font-serif text-sm leading-loose text-stone-100"
                  >
                    أَلا یا أیّها الساقی أدِرْ کأساً وناوِلْها
                    <br />
                    که عشق آسان نمود اول ولی افتاد مشکل‌ها
                  </div>
                  <div className="text-xs text-stone-400">
                    Attribution: <span className="text-stone-200">Dr. Maryam Tehrani (RESEARCHER)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DATASETS */}
        {activeTab === 'datasets' && (
          <div className="space-y-6">
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                    <Database className="w-5 h-5 text-purple-400" />
                    Dataset Management &amp; Leak-Free Partitions
                  </h3>
                  <p className="text-xs text-stone-400">
                    Prevents samples from the same manuscript book from leaking across Train, Validation,
                    and Test sets. Exports verified ground-truth in standard ML JSONL format.
                  </p>
                </div>
                <a
                  href="/api/v1/datasets/export?split=TRAIN"
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-stone-100 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export JSONL
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl space-y-1">
                  <div className="text-xs text-stone-400">TRAIN Split</div>
                  <div className="text-lg font-bold text-stone-100">70% of Manuscripts</div>
                  <div className="text-xs text-stone-500">Zero overlap with Validation/Test</div>
                </div>
                <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl space-y-1">
                  <div className="text-xs text-stone-400">VALIDATION Split</div>
                  <div className="text-lg font-bold text-stone-100">15% of Manuscripts</div>
                  <div className="text-xs text-stone-500">Hyperparameter tuning evaluation</div>
                </div>
                <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl space-y-1">
                  <div className="text-xs text-stone-400">TEST Split</div>
                  <div className="text-lg font-bold text-stone-100">15% of Manuscripts</div>
                  <div className="text-xs text-stone-500">Blind benchmark evaluation</div>
                </div>
              </div>

              <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-lg text-xs font-mono space-y-1.5">
                <div className="text-purple-400 font-semibold">Sample JSONL Export Format:</div>
                <pre className="text-stone-300 overflow-x-auto text-[11px] leading-tight">
{`{"sample_id":"d1","page_id":"p1","manuscript_id":"m1","manuscript_title":"دیوان حافظ","page_number":1,"language":"PERSIAN","script_type":"نستعلیق","split":"TRAIN","status":"APPROVED","image_relative_url":"/api/v1/pages/p1/image","ground_truth_text":"ألا یا أیها الساقی..."}`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: CURL & API COMMANDS */}
        {activeTab === 'curl' && (
          <div className="space-y-6">
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-amber-400" />
                Quick cURL Commands &amp; API Testing
              </h3>
              <p className="text-xs text-stone-400">
                Ready-to-use cURL commands for terminal interaction.
              </p>

              <div className="space-y-4">
                {[
                  {
                    id: 'auth',
                    title: '1. Authenticate & Obtain JWT Token',
                    curl: `curl -X POST http://localhost:3000/api/v1/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{"email":"admin@manuscript-htr.edu","password":"AdminSecurePassword123!"}'`,
                  },
                  {
                    id: 'manuscript',
                    title: '2. Create a Manuscript Book',
                    curl: `curl -X POST http://localhost:3000/api/v1/manuscripts \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"title":"دیوان صائب تبریزی","author":"صائب","language":"PERSIAN","scriptType":"نستعلیق"}'`,
                  },
                  {
                    id: 'recognize',
                    title: '3. Trigger HTR AI Recognition',
                    curl: `curl -X POST http://localhost:3000/api/v1/pages/<PAGE_ID>/recognize \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"language":"PERSIAN","modelName":"qajar-nastaliq-v2"}'`,
                  },
                  {
                    id: 'search',
                    title: '4. Normalized Persian/Arabic Search',
                    curl: `curl -X GET "http://localhost:3000/api/v1/search?q=%D8%B9%D9%84%DB%8C&language=PERSIAN" \\\n  -H "Authorization: Bearer <TOKEN>"`,
                  },
                ].map((item) => (
                  <div key={item.id} className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-stone-200">{item.title}</span>
                      <button
                        onClick={() => copyToClipboard(item.curl, item.id)}
                        className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs flex items-center gap-1 border border-stone-700 transition"
                      >
                        {copiedCurl === item.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 rounded-lg bg-stone-950 font-mono text-xs text-amber-300/90 overflow-x-auto">
                      {item.curl}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800 bg-stone-950 py-4 text-center text-xs text-stone-500">
        Persian &amp; Arabic Manuscript HTR/OCR Platform &bull; Academic University Backend &bull; REST API /api/v1 &bull; Swagger /api/docs
      </footer>
    </div>
  );
}
