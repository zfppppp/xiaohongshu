'use client';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  Copy,
  Download,
  FileText,
  FolderOpen,
  Layers3,
  Link2,
  ListChecks,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  Pencil,
  CircleHelp,
  AlertCircle,
} from 'lucide-react';
import { useWorkspace } from '@/lib/use-workspace';
import { useBriefTool } from '@/lib/use-brief-tool';
import {
  newProject,
  copyProject,
  exampleProject,
  safeUrl,
  uid,
  projectBrief,
  projectIssues,
  projectReview,
  comparison,
  percent,
  money,
  serializeBackup,
  parseBackup,
  metricsTemplate,
  parseMetricsCsv,
  metricFields,
  type Project,
  type EvidenceRecord,
} from '@/lib/workspace';

type Tab = 'overview' | 'evidence' | 'brief' | 'review';
const sections = [
  { id: 'overview', label: '项目概览', icon: FolderOpen },
  { id: 'evidence', label: '证据资料', icon: Layers3 },
  { id: 'brief', label: '内容简报', icon: FileText },
  { id: 'review', label: '数据复盘', icon: BarChart3 },
] as const;
const kinds = [
  '用户反馈',
  '访谈记录',
  '独立测试',
  '厂商说明',
  '交易数据',
  '反证',
  '其他',
];
function download(
  name: string,
  content: string,
  mime = 'text/markdown;charset=utf-8',
) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name.replace(/[<>:"/\\|?*]/g, '_');
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Field({
  label,
  value,
  onChange,
  placeholder = '',
  rows,
  type = 'text',
  required = false,
  hint = '',
  maxLength = 20000,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  type?: string;
  required?: boolean;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <span className="required"> *</span>}
      </span>
      {rows ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          required={required}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          maxLength={maxLength}
          required={required}
        />
      )}{' '}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Modal({
  title,
  onClose,
  children,
  feedback,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  feedback?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="modal" aria-label={title} onCancel={onClose}>
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="关闭" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      {feedback && (
        <p className="modal-error" role="alert">
          {feedback}
        </p>
      )}
      {children}
    </dialog>
  );
}
function Empty({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export default function Home() {
  const store = useWorkspace();
  const [activeId, setActiveId] = useState(''),
    [tab, setTab] = useState<Tab>('overview'),
    [example, setExample] = useState<Project | null>(null);
  const [projectSearch, setProjectSearch] = useState(''),
    [evidenceSearch, setEvidenceSearch] = useState(''),
    [evidenceFilter, setEvidenceFilter] = useState('all');
  const [modal, setModal] = useState<
      'new' | 'evidence' | 'delete' | 'reset' | null
    >(null),
    [newName, setNewName] = useState(''),
    [newCategory, setNewCategory] = useState('');
  const [editingEvidence, setEditingEvidence] = useState<EvidenceRecord | null>(
      null,
    ),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [preview, setPreview] = useState(false);
  const importRef = useRef<HTMLInputElement>(null),
    csvRef = useRef<HTMLInputElement>(null);
  const p = example || store.projects.find((p) => p.id === activeId) || null;
  const readOnly = Boolean(example) || store.blocked;
  const issues = p ? projectIssues(p) : [];
  const brief = p ? projectBrief(p) : '请先在工作台打开一个项目。';
  useBriefTool(brief);
  const review = useMemo(() => {
    if (!p) return { data: null, error: '' };
    try {
      return { data: comparison(p), error: '' };
    } catch (e) {
      return { data: null, error: (e as Error).message };
    }
  }, [p]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  function goHome() {
    setActiveId('');
    setExample(null);
    setError('');
  }
  function openProject(project: Project) {
    setActiveId(project.id);
    setExample(null);
    setTab('overview');
    setError('');
    setPreview(false);
    setEvidenceSearch('');
    setEvidenceFilter('all');
  }
  function openExample() {
    setExample(exampleProject());
    setTab('overview');
    setError('');
    setPreview(false);
    setEvidenceSearch('');
    setEvidenceFilter('all');
  }
  function patch(delta: Partial<Project>) {
    if (!p || readOnly) return false;
    return store.mutate((ps) =>
      ps.map((x) =>
        x.id === p.id
          ? { ...x, ...delta, updatedAt: new Date().toISOString() }
          : x,
      ),
    );
  }
  function cloneCurrent() {
    if (!p) return;
    const clone = copyProject(p);
    clone.name =
      p.name.slice(0, 110) + (p.isExample ? '（案例副本）' : '（副本）');
    if (store.mutate((ps) => [clone, ...ps])) {
      openProject(clone);
      setNotice('已复制为独立项目。案例中的模拟数据标签会保留，请自行替换。');
    }
  }
  function exportProjects(all = false) {
    const rows = all ? store.projects : p ? [p] : store.projects;
    download(
      all ? 'BriefLab_全部项目.json' : `${p?.name || 'BriefLab_项目'}.json`,
      serializeBackup(rows),
      'application/json;charset=utf-8',
    );
    setNotice('备份已导出，可在另一台设备导入。');
  }
  async function importProjects(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > 4000000) throw Error('项目文件请小于 4 MB');
      const imported = parseBackup(await file.text()).map(copyProject);
      if (!imported.length) throw Error('备份中没有项目');
      if (store.mutate((ps) => [...imported, ...ps])) {
        openProject(imported[0]);
        setNotice(`已导入 ${imported.length} 个独立副本，现有项目未被覆盖。`);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function importCsv(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > 500000) throw Error('CSV 请小于 500 KB');
      const rows = parseMetricsCsv(await file.text());
      if (
        !patch({
          experiments: rows,
          comparable: false,
          dataSource: `导入文件：${file.name}；请补充来源说明`,
        })
      )
        return;
      setError('');
      setNotice('已导入两组数据，请重新确认统计与退款口径。');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function startEvidence(e?: EvidenceRecord) {
    setError('');
    setEditingEvidence(
      e
        ? { ...e }
        : {
            id: uid(),
            title: '',
            kind: '用户反馈',
            publisher: '',
            date: new Date().toISOString().slice(0, 10),
            url: '',
            summary: '',
            boundary: '',
            verified: false,
            selected: true,
          },
    );
    setModal('evidence');
  }
  function exportReview() {
    if (!p) return;
    try {
      download(`${p.name}_复盘.md`, projectReview(p));
      setNotice('复盘已导出，包含输入数据和计算口径。');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const filtered = store.projects.filter((p) =>
    `${p.name} ${p.category} ${p.audience}`
      .toLowerCase()
      .includes(projectSearch.toLowerCase()),
  );
  const selected = p?.evidence.filter((e) => e.selected) || [];
  const visibleEvidence =
    p?.evidence.filter(
      (e) =>
        `${e.title} ${e.summary} ${e.publisher}`
          .toLowerCase()
          .includes(evidenceSearch.toLowerCase()) &&
        (evidenceFilter === 'all' ||
          (evidenceFilter === 'selected' ? e.selected : !e.verified)),
    ) || [];
  return (
    <div className="workbench">
      <a href="#main" className="skip-link">
        跳到工作区
      </a>
      <aside className="sidebar">
        <button className="brand" onClick={goHome} aria-label="BriefLab 首页">
          <span className="brand-mark">
            <Layers3 size={22} />
          </span>
          BriefLab<span className="brand-dot">.</span>
        </button>
        <p className="side-caption">内容经营工作台</p>
        {p ? (
          <>
            <button className="nav-item back-nav" onClick={goHome}>
              <ArrowLeft size={16} />
              全部项目
            </button>
            <div className="nav-project-label">
              {p.isExample ? '完整案例' : '当前项目'}
              <span>{p.name}</span>
            </div>
            <nav aria-label="项目模块">
              {sections.map((s) => (
                <button
                  key={s.id}
                  className={`nav-item ${tab === s.id ? 'active' : ''}`}
                  aria-current={tab === s.id ? 'page' : undefined}
                  onClick={() => {
                    setTab(s.id);
                    setError('');
                  }}
                >
                  <s.icon size={17} />
                  {s.label}
                  {s.id === 'evidence' && (
                    <span className="nav-count">{p.evidence.length}</span>
                  )}
                </button>
              ))}
            </nav>
          </>
        ) : (
          <nav aria-label="工作空间">
            <button className="nav-item active" onClick={goHome}>
              <FolderOpen size={18} />
              我的项目<span className="nav-count">{store.projects.length}</span>
            </button>
            <button className="nav-item" onClick={openExample}>
              <BookOpen size={18} />
              完整案例
              <ArrowUpRight size={14} />
            </button>
          </nav>
        )}
        <div className="sidebar-footer">
          <a
            href="https://github.com/zfppppp/xiaohongshu"
            target="_blank"
            rel="noreferrer"
          >
            项目说明与源码
            <ArrowUpRight size={12} />
          </a>
          <span>
            周枫浦 · 独立作品
            <br />
            非小红书官方产品
          </span>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumbs">
            <button onClick={goHome}>工作空间</button>
            <span className="slash">/</span>
            <span>{p ? p.name : '我的项目'}</span>
            {p && (
              <>
                <ChevronRight size={13} />
                <span>{sections.find((s) => s.id === tab)?.label}</span>
              </>
            )}
          </div>
          <span className={`status-dot ${store.error ? 'unsaved' : ''}`}>
            {p?.isExample
              ? '案例只读 · 不占用工作空间'
              : store.ready
                ? store.saved
                : '正在读取本地项目'}
          </span>
        </header>
        <main id="main" className="workspace">
          {(store.error || error) && (
            <div className="error-banner" role="alert">
              <AlertCircle size={17} />
              <div>
                {error || store.error}
                {store.error && (
                  <div className="inline-actions">
                    <button
                      className="text-button"
                      onClick={() => exportProjects(true)}
                    >
                      导出当前备份
                    </button>
                    {store.blocked && (
                      <>
                        <button
                          className="text-button"
                          onClick={() => {
                            const raw = store.rawBackup();
                            if (raw !== null)
                              download(
                                'BriefLab_原始备份.json',
                                raw,
                                'application/json',
                              );
                          }}
                        >
                          下载原始备份
                        </button>
                        <button
                          className="text-button"
                          onClick={() => location.reload()}
                        >
                          重新加载
                        </button>
                        {!store.projects.length && (
                          <button
                            className="text-button"
                            onClick={() => setModal('reset')}
                          >
                            重置本地空间
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              {error && (
                <button
                  className="icon-button"
                  onClick={() => setError('')}
                  aria-label="关闭错误提示"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          {!p ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR WORKSPACE</div>
                  <h1>我的项目</h1>
                  <p>把问题、证据和下一步行动，整理在同一处。</p>
                </div>
                <button
                  disabled={!store.ready || store.blocked}
                  className="button primary"
                  onClick={() => {
                    setNewName('');
                    setNewCategory('');
                    setModal('new');
                  }}
                >
                  <Plus size={17} />
                  新建项目
                </button>
              </div>
              <div className="workspace-toolbar">
                <div className="search-box">
                  <Search size={16} />
                  <input
                    aria-label="搜索项目"
                    placeholder="搜索项目名称、人群或品类"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                  />
                </div>
                <div className="inline-actions">
                  <button
                    className="button secondary"
                    disabled={!store.ready || store.blocked}
                    onClick={() => importRef.current?.click()}
                  >
                    <Upload size={15} />
                    导入项目
                  </button>
                  <button
                    className="icon-button outlined"
                    disabled={!store.projects.length}
                    aria-label="备份全部项目"
                    title="备份全部项目"
                    onClick={() => exportProjects(true)}
                  >
                    <Download size={17} />
                  </button>
                </div>
              </div>
              <div className="section-label">
                工作项目{' '}
                <span>{filtered.length.toString().padStart(2, '0')}</span>
              </div>
              <section className="project-grid" aria-label="项目列表">
                {filtered.map((project) => (
                  <button
                    className="project-card"
                    key={project.id}
                    onClick={() => openProject(project)}
                  >
                    <div className="project-card-top">
                      <span className="folder-tile">
                        <FolderOpen size={20} />
                      </span>
                      <span className="badge neutral">
                        {project.category || '未设品类'}
                      </span>
                      <ArrowUpRight size={16} />
                    </div>
                    <h2>{project.name}</h2>
                    <p className="two-lines">
                      {project.goal || '还没有填写目标，打开项目继续。'}
                    </p>
                    <div className="project-card-bottom">
                      <span>
                        {project.evidence.length} 条证据{' '}
                        <span className="dot-divider">·</span>{' '}
                        {project.tasks.filter((t) => t.done).length}/
                        {project.tasks.length} 项完成
                      </span>
                      <span>
                        {new Date(project.updatedAt).toLocaleDateString(
                          'zh-CN',
                          { month: '2-digit', day: '2-digit' },
                        )}
                      </span>
                    </div>
                  </button>
                ))}
                {!projectSearch && (
                  <button
                    disabled={!store.ready || store.blocked}
                    className="project-card new-card"
                    onClick={() => {
                      setNewName('');
                      setNewCategory('');
                      setModal('new');
                    }}
                  >
                    <span className="add-circle">
                      <Plus size={23} />
                    </span>
                    <h2>开始一个新项目</h2>
                    <p>定义任务，收集依据，写出可执行的简报</p>
                  </button>
                )}
              </section>
              {projectSearch && !filtered.length && (
                <Empty icon={<Search size={26} />} title="没有找到匹配项目">
                  <p>换个关键词，或清空搜索查看全部。</p>
                  <button
                    className="text-button"
                    onClick={() => setProjectSearch('')}
                  >
                    清空搜索
                  </button>
                </Empty>
              )}
              <section className="example-strip">
                <div className="example-graphic" aria-hidden="true">
                  <div className="mini-sheet sheet-back" />
                  <div className="mini-sheet">
                    <span />
                    <i />
                    <i />
                    <i />
                    <div>
                      <Check size={14} />
                    </div>
                  </div>
                </div>
                <div className="example-copy">
                  <span className="eyebrow">A COMPLETE WALKTHROUGH</span>
                  <h2>一份轻薄本选题，如何走到经营复盘？</h2>
                  <p>
                    公开证据 → 内容简报 → 执行清单 →
                    模拟复盘。一份完整案例，随时可以参考。
                  </p>
                </div>
                <button className="button secondary" onClick={openExample}>
                  查看完整案例
                  <ArrowUpRight size={16} />
                </button>
              </section>
              <div className="local-note">
                <CheckCheck size={15} />
                <span>
                  免登录，项目保存在当前浏览器。定期导出备份；换设备时导入即可。
                </span>
                <a
                  href="https://github.com/zfppppp/xiaohongshu/blob/main/docs/GUIDE.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  使用指南
                  <ArrowUpRight size={12} />
                </a>
              </div>
            </>
          ) : (
            <>
              {p.isExample && (
                <div className="example-banner">
                  <BookOpen size={17} />
                  <div>
                    <strong>完整案例</strong>
                    <span>
                      公开研究 + 模拟复盘。只读查看，复制后可自由编辑。
                    </span>
                  </div>
                  <button
                    className="button secondary"
                    disabled={store.blocked || !store.ready}
                    onClick={cloneCurrent}
                  >
                    <Copy size={14} />
                    复制到我的项目
                  </button>
                </div>
              )}
              <div className="page-heading project-heading">
                <div>
                  <div className="eyebrow">
                    {tab === 'overview'
                      ? 'PROJECT OVERVIEW'
                      : tab === 'evidence'
                        ? 'EVIDENCE LIBRARY'
                        : tab === 'brief'
                          ? 'CONTENT BRIEF'
                          : 'PERFORMANCE REVIEW'}
                  </div>
                  <h1>{sections.find((s) => s.id === tab)?.label}</h1>
                  <p>
                    {tab === 'overview'
                      ? '先明确这次内容任务，再把它拆成可执行的行动。'
                      : tab === 'evidence'
                        ? '记录发现与来源，把真正有用的依据带进简报。'
                        : tab === 'brief'
                          ? '把选题判断写清楚，让下一位协作者可以直接开始。'
                          : '同时看转化、退款与贡献，让下一步有据可依。'}
                  </p>
                </div>
                <div className="heading-actions">
                  {tab === 'evidence' ? (
                    <button
                      disabled={readOnly}
                      className="button primary"
                      onClick={() => startEvidence()}
                    >
                      <Plus size={16} />
                      添加证据
                    </button>
                  ) : tab === 'brief' ? (
                    <button
                      className="button primary"
                      onClick={() => {
                        download(`${p.name}_简报.md`, brief);
                        setNotice('已导出当前简报与引用证据。');
                      }}
                    >
                      <Download size={16} />
                      导出简报
                    </button>
                  ) : tab === 'review' ? (
                    <button
                      className="button primary"
                      disabled={!review.data}
                      onClick={exportReview}
                    >
                      <Download size={16} />
                      导出复盘
                    </button>
                  ) : (
                    <button
                      className="button secondary"
                      onClick={() => exportProjects()}
                    >
                      <Download size={16} />
                      导出项目
                    </button>
                  )}
                  {!p.isExample && (
                    <details className="project-menu">
                      <summary
                        className="icon-button outlined"
                        aria-label="项目操作"
                      >
                        <MoreHorizontal size={19} />
                      </summary>
                      <div>
                        <button onClick={cloneCurrent} disabled={readOnly}>
                          <Copy size={14} />
                          复制项目
                        </button>
                        <button onClick={() => exportProjects()}>
                          <Download size={14} />
                          导出项目
                        </button>
                        <button
                          disabled={readOnly}
                          className="danger-text"
                          onClick={() => setModal('delete')}
                        >
                          <Trash2 size={14} />
                          删除项目
                        </button>
                      </div>
                    </details>
                  )}
                </div>
              </div>
              {tab === 'overview' && (
                <div className="overview-grid">
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <span className="step-number">01</span>
                        <h2>定义内容任务</h2>
                      </div>
                      <span className="subtle">
                        {p.isExample ? '案例方案' : '随时可修改'}
                      </span>
                    </div>
                    <fieldset disabled={readOnly}>
                      <Field
                        label="项目名称"
                        value={p.name}
                        onChange={(name) =>
                          patch({ name: name.trim() ? name : '未命名项目' })
                        }
                        maxLength={120}
                      />
                      <div className="form-grid">
                        <Field
                          label="品类"
                          value={p.category}
                          onChange={(category) => patch({ category })}
                          placeholder="如：数码、美妆、咖啡"
                          maxLength={120}
                        />
                        <Field
                          label="具体商品 / 服务"
                          value={p.sku}
                          onChange={(sku) => patch({ sku, comparable: false })}
                          placeholder="型号、规格、版本或服务范围"
                        />
                      </div>
                      <Field
                        label="业务目标"
                        value={p.goal}
                        onChange={(goal) => patch({ goal })}
                        rows={2}
                        placeholder="这次内容希望帮助用户完成什么决策？"
                      />
                      <Field
                        label="目标人群与使用场景"
                        value={p.audience}
                        onChange={(audience) => patch({ audience })}
                        rows={2}
                        placeholder="谁，在什么场景下，需要解决什么问题？"
                      />
                      <Field
                        label="要回答的核心问题"
                        value={p.question}
                        onChange={(question) => patch({ question })}
                        placeholder="用一句真实的用户提问表达"
                      />
                      <div className="form-grid">
                        <Field
                          label="负责人"
                          value={p.owner}
                          onChange={(owner) => patch({ owner })}
                          placeholder="填写名字或角色"
                          maxLength={100}
                        />
                        <Field
                          label="目标完成日期"
                          value={p.due}
                          onChange={(due) => patch({ due })}
                          type="date"
                        />
                      </div>
                    </fieldset>
                  </section>
                  <div className="overview-aside">
                    <section className="panel progress-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>项目进度</h2>
                        </div>
                      </div>
                      {[
                        {
                          label: '收集依据',
                          value: `${p.evidence.length} 条证据，${selected.length} 条引用`,
                          done: p.evidence.length > 0,
                          to: 'evidence',
                        },
                        {
                          label: '编写简报',
                          value: p.draft.trim()
                            ? '已有内容草稿'
                            : '还未填写草稿',
                          done: !!p.draft.trim(),
                          to: 'brief',
                        },
                        {
                          label: '复盘数据',
                          value: review.data
                            ? '两组数据已填写'
                            : '等待填写两组数据',
                          done: !!review.data,
                          to: 'review',
                        },
                      ].map((s, i) => (
                        <button
                          className="progress-step"
                          key={s.to}
                          onClick={() => setTab(s.to as Tab)}
                        >
                          <span
                            className={`progress-number ${s.done ? 'done' : ''}`}
                          >
                            {s.done ? <Check size={13} /> : i + 1}
                          </span>
                          <span>
                            <strong>{s.label}</strong>
                            <small>{s.value}</small>
                          </span>
                          <ChevronRight size={15} />
                        </button>
                      ))}
                    </section>
                    <section className="quiet-tip">
                      <CircleHelp size={17} />
                      <div>
                        <h3>从一条可验证的问题开始</h3>
                        <p>
                          先把用户怎么说、原文在哪里、哪些还不能下结论记下来，再开始写内容。
                        </p>
                        <button
                          className="text-button"
                          onClick={() => setTab('evidence')}
                        >
                          去整理证据
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </section>
                  </div>
                  <section className="panel task-panel">
                    <div className="panel-heading">
                      <div>
                        <span className="step-number">02</span>
                        <h2>执行清单</h2>
                        <span className="badge neutral">
                          {p.tasks.filter((t) => t.done).length}/
                          {p.tasks.length}
                        </span>
                      </div>
                      <button
                        className="text-button"
                        disabled={readOnly || p.tasks.length >= 200}
                        onClick={() =>
                          patch({
                            tasks: [
                              ...p.tasks,
                              {
                                id: uid(),
                                title: '',
                                owner: '',
                                due: '',
                                done: false,
                              },
                            ],
                          })
                        }
                      >
                        <Plus size={15} />
                        添加任务
                      </button>
                    </div>
                    {!p.tasks.length ? (
                      <Empty
                        icon={<ListChecks size={24} />}
                        title="把下一步写下来"
                      >
                        <p>补一次访谈、完成实测或约定复盘时间。</p>
                        <button
                          className="text-button"
                          disabled={readOnly}
                          onClick={() =>
                            patch({
                              tasks: [
                                {
                                  id: uid(),
                                  title: '',
                                  owner: '',
                                  due: '',
                                  done: false,
                                },
                              ],
                            })
                          }
                        >
                          添加第一项任务
                          <Plus size={14} />
                        </button>
                      </Empty>
                    ) : (
                      <fieldset disabled={readOnly} className="task-list">
                        {p.tasks.map((t) => (
                          <div className="task-row" key={t.id}>
                            <input
                              type="checkbox"
                              aria-label={`完成任务：${t.title || '未命名'}`}
                              checked={t.done}
                              onChange={(e) =>
                                patch({
                                  tasks: p.tasks.map((x) =>
                                    x.id === t.id
                                      ? { ...x, done: e.target.checked }
                                      : x,
                                  ),
                                })
                              }
                            />
                            <input
                              className={t.done ? 'task-done' : ''}
                              aria-label="任务内容"
                              placeholder="写下一个具体行动"
                              value={t.title}
                              maxLength={2000}
                              onChange={(e) =>
                                patch({
                                  tasks: p.tasks.map((x) =>
                                    x.id === t.id
                                      ? { ...x, title: e.target.value }
                                      : x,
                                  ),
                                })
                              }
                            />
                            <input
                              aria-label="任务负责人"
                              placeholder="负责人"
                              value={t.owner}
                              maxLength={100}
                              onChange={(e) =>
                                patch({
                                  tasks: p.tasks.map((x) =>
                                    x.id === t.id
                                      ? { ...x, owner: e.target.value }
                                      : x,
                                  ),
                                })
                              }
                            />
                            <input
                              aria-label="任务截止日期"
                              type="date"
                              value={t.due}
                              onChange={(e) =>
                                patch({
                                  tasks: p.tasks.map((x) =>
                                    x.id === t.id
                                      ? { ...x, due: e.target.value }
                                      : x,
                                  ),
                                })
                              }
                            />
                            <button
                              className="icon-button"
                              aria-label={`删除任务：${t.title || '未命名'}`}
                              onClick={() =>
                                patch({
                                  tasks: p.tasks.filter((x) => x.id !== t.id),
                                })
                              }
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </fieldset>
                    )}
                  </section>
                </div>
              )}
              {tab === 'evidence' && (
                <>
                  <div className="workspace-toolbar">
                    <div className="search-box">
                      <Search size={16} />
                      <input
                        aria-label="搜索证据"
                        placeholder="搜索标题、发现或来源"
                        value={evidenceSearch}
                        onChange={(e) => setEvidenceSearch(e.target.value)}
                      />
                    </div>
                    <div className="filter-chips" aria-label="证据筛选">
                      {[
                        ['all', '全部'],
                        ['selected', '已引用'],
                        ['pending', '待核对'],
                      ].map(([v, l]) => (
                        <button
                          key={v}
                          aria-pressed={evidenceFilter === v}
                          className={evidenceFilter === v ? 'selected' : ''}
                          onClick={() => setEvidenceFilter(v)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="evidence-layout">
                    <section className="evidence-stack">
                      {visibleEvidence.map((e, i) => (
                        <article className="evidence-card" key={e.id}>
                          <div className="evidence-card-top">
                            <span
                              className={`badge ${e.kind === '反证' ? 'warm' : 'neutral'}`}
                            >
                              {e.kind}
                            </span>
                            <span className="subtle">
                              {e.publisher || '来源待补充'}
                              {e.date && ` · ${e.date}`}
                            </span>
                            {!readOnly && (
                              <button
                                className="icon-button"
                                aria-label={`编辑证据：${e.title}`}
                                onClick={() => startEvidence(e)}
                              >
                                <Pencil size={15} />
                              </button>
                            )}
                          </div>
                          <h2>
                            <span className="evidence-index">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            {e.title || '未命名证据'}
                          </h2>
                          <p className="evidence-summary">
                            {e.summary || '还没有记录发现'}
                          </p>
                          {e.boundary && (
                            <div className="boundary-note">
                              <span>适用边界</span>
                              <p>{e.boundary}</p>
                            </div>
                          )}
                          <div className="evidence-card-footer">
                            <label className="check-label">
                              <input
                                disabled={readOnly}
                                type="checkbox"
                                checked={e.selected}
                                onChange={(event) =>
                                  patch({
                                    evidence: p.evidence.map((x) =>
                                      x.id === e.id
                                        ? {
                                            ...x,
                                            selected: event.target.checked,
                                          }
                                        : x,
                                    ),
                                  })
                                }
                              />
                              引用到简报
                            </label>
                            <span
                              className={`verification ${e.verified ? 'verified' : ''}`}
                            >
                              {e.verified ? (
                                <CheckCheck size={13} />
                              ) : (
                                <span className="tiny-dot" />
                              )}
                              {e.verified ? '使用者已核对' : '待核对'}
                            </span>
                            {safeUrl(e.url) ? (
                              <a
                                href={safeUrl(e.url)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                原始来源
                                <ArrowUpRight size={13} />
                              </a>
                            ) : (
                              <span className="subtle">
                                {e.url ? '链接待修正' : '线下 / 无链接记录'}
                              </span>
                            )}
                          </div>
                        </article>
                      ))}
                      {!visibleEvidence.length && (
                        <div className="panel">
                          <Empty
                            icon={<Layers3 size={29} />}
                            title={
                              p.evidence.length
                                ? '没有匹配的证据'
                                : '添加第一条证据'
                            }
                          >
                            <p>
                              {p.evidence.length
                                ? '调整筛选条件后再试。'
                                : '用户提问、访谈、测试或反证，都可以成为内容的起点。'}
                            </p>
                            <button
                              disabled={readOnly}
                              className="button secondary"
                              onClick={() => startEvidence()}
                            >
                              <Plus size={15} />
                              添加证据
                            </button>
                          </Empty>
                        </div>
                      )}
                    </section>
                    <aside className="evidence-aside">
                      <section className="panel selection-summary">
                        <span className="eyebrow">BRIEF REFERENCES</span>
                        <div className="big-number">
                          {selected.length}
                          <small>条已引用</small>
                        </div>
                        <p>选中的证据会随简报一起导出。</p>
                        <div className="mini-divider" />
                        <div className="stat-line">
                          <span>其中待核对</span>
                          <strong>
                            {selected.filter((e) => !e.verified).length} 条
                          </strong>
                        </div>
                        <button
                          className="button primary full-width"
                          onClick={() => setTab('brief')}
                        >
                          继续编写简报
                          <ArrowRight size={16} />
                        </button>
                      </section>
                      <div className="quiet-tip">
                        <Link2 size={17} />
                        <div>
                          <h3>记录来源，也记录边界</h3>
                          <p>
                            链接不会自动抓取。请阅读原文后填写发现；单次反馈不能代表整个市场。
                          </p>
                        </div>
                      </div>
                    </aside>
                  </div>
                </>
              )}
              {tab === 'brief' && (
                <div className="brief-layout">
                  <section className="panel brief-editor">
                    <div className="panel-heading">
                      <div>
                        <h2>内容编辑</h2>
                      </div>
                      <div className="filter-chips compact">
                        <button
                          className={!preview ? 'selected' : ''}
                          onClick={() => setPreview(false)}
                        >
                          编辑
                        </button>
                        <button
                          className={preview ? 'selected' : ''}
                          onClick={() => setPreview(true)}
                        >
                          完整预览
                        </button>
                      </div>
                    </div>
                    {preview ? (
                      <pre className="markdown-preview">{brief}</pre>
                    ) : (
                      <fieldset disabled={readOnly}>
                        <Field
                          label="内容标题"
                          value={p.title}
                          onChange={(title) => patch({ title })}
                          placeholder="写一个与用户问题有关的标题"
                          maxLength={200}
                        />
                        <Field
                          label="核心判断 / 待验证假设"
                          value={p.hypothesis}
                          onChange={(hypothesis) => patch({ hypothesis })}
                          rows={3}
                          placeholder="基于哪些发现，认为怎样的内容会帮助用户？"
                        />
                        <Field
                          label="反证与停止条件"
                          value={p.counter}
                          onChange={(counter) => patch({ counter })}
                          rows={2}
                          placeholder="什么情况会推翻这个判断？"
                        />
                        <div className="editor-divider">
                          <span>素材与内容</span>
                        </div>
                        <Field
                          label="拍摄与素材清单"
                          value={p.shots}
                          onChange={(shots) => patch({ shots })}
                          rows={4}
                          placeholder={
                            '每行一项：\n需要拍到的场景\n需要呈现的测试记录\n需要说明的适用边界'
                          }
                        />
                        <Field
                          label="正文 / 脚本"
                          value={p.draft}
                          onChange={(draft) => patch({ draft })}
                          rows={8}
                          placeholder="从一个具体任务开场，展示证据，再说明适合与不适合的情况。"
                        />
                        <div className="editor-divider">
                          <span>商品与验证条件</span>
                        </div>
                        <Field
                          label="商品证据链接"
                          value={p.source}
                          onChange={(source) => patch({ source })}
                          placeholder="https://… 官方资料或实测记录"
                          hint={
                            p.source && !safeUrl(p.source)
                              ? '链接尚不完整，请补齐 http(s) 地址。'
                              : '商品的效果描述应有对应记录。'
                          }
                        />
                        <Field
                          label="测试条件 / 适用范围"
                          value={p.conditions}
                          onChange={(conditions) => patch({ conditions })}
                          rows={3}
                          placeholder="配置、测量方法、使用场景，以及结果不适用的情况"
                        />
                        <Field
                          label="软件版本与任务（涉及软件时填写）"
                          value={p.software}
                          onChange={(software) => patch({ software })}
                          placeholder="具体版本、插件和实际完成的任务"
                        />
                      </fieldset>
                    )}
                  </section>
                  <aside className="brief-aside">
                    <section className="panel review-checklist">
                      <div className="panel-heading">
                        <div>
                          <h2>交付前检查</h2>
                        </div>
                        <span className="badge warm">
                          {issues.filter((i) => i.level === 'gap').length}{' '}
                          项待补
                        </span>
                      </div>
                      {issues.length ? (
                        issues.map((i) => (
                          <div className="check-item" key={i.id}>
                            <span className="tiny-dot" />
                            <div>
                              <strong>{i.title}</strong>
                              <p>{i.detail}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="check-item">
                          <Check size={16} />
                          <div>
                            <strong>当前规则未发现漏项</strong>
                            <p>仍需人工核对事实、来源和适用范围。</p>
                          </div>
                        </div>
                      )}
                      <p className="footnote">
                        检查覆盖有限的编辑规则，不代表内容真实或效果已验证。
                      </p>
                    </section>
                    <section className="panel source-preview">
                      <div className="panel-heading">
                        <div>
                          <h2>引用依据</h2>
                        </div>
                        <span className="subtle">{selected.length} 条</span>
                      </div>
                      {selected.length ? (
                        selected.map((e, i) => (
                          <div className="source-preview-row" key={e.id}>
                            <span>{String(i + 1).padStart(2, '0')}</span>
                            <div>
                              <strong>{e.title}</strong>
                              <small>
                                {e.publisher || '来源待补'} ·{' '}
                                {e.verified ? '已核对' : '待核对'}
                              </small>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p>还没有选入证据。</p>
                      )}
                      <button
                        className="text-button"
                        onClick={() => setTab('evidence')}
                      >
                        管理引用
                        <ArrowRight size={13} />
                      </button>
                    </section>
                  </aside>
                </div>
              )}
              {tab === 'review' && (
                <div className="review-workspace">
                  {p.dataSource.includes('模拟') && (
                    <div className="simulation-note">
                      <BookOpen size={16} />
                      此项目含模拟数据，仅用于解释流程。使用前请替换为自己的记录，并更新来源说明。
                    </div>
                  )}
                  <section className="panel metrics-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>两组内容数据</h2>
                      </div>
                      <div className="inline-actions">
                        <button
                          className="text-button"
                          onClick={() =>
                            download(
                              'BriefLab_复盘数据模板.csv',
                              metricsTemplate(),
                              'text/csv;charset=utf-8',
                            )
                          }
                        >
                          <Download size={14} />
                          下载空白表格
                        </button>
                        <button
                          className="button secondary"
                          disabled={readOnly}
                          onClick={() => csvRef.current?.click()}
                        >
                          <Upload size={14} />
                          导入 CSV
                        </button>
                      </div>
                    </div>
                    <div className="table-scroll">
                      <table className="metrics-table">
                        <thead>
                          <tr>
                            <th>
                              指标<span>使用同一交易链路的数据</span>
                            </th>
                            {p.experiments.map((e, i) => (
                              <th key={i}>
                                <span className="group-label">
                                  {i ? 'B' : 'A'} 组
                                </span>
                                <input
                                  disabled={readOnly}
                                  aria-label={`${i ? 'B' : 'A'} 组名称`}
                                  value={e.name}
                                  maxLength={100}
                                  onChange={(event) =>
                                    patch({
                                      experiments: p.experiments.map((x, j) =>
                                        i === j
                                          ? { ...x, name: event.target.value }
                                          : x,
                                      ),
                                      comparable: false,
                                    })
                                  }
                                />
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {metricFields.map(([key, label, hint]) => (
                            <tr key={key}>
                              <td>
                                {label}
                                <small>{hint}</small>
                              </td>
                              {p.experiments.map((e, i) => (
                                <td key={i}>
                                  <input
                                    disabled={readOnly}
                                    aria-label={`${i ? 'B' : 'A'} 组${label}`}
                                    inputMode="decimal"
                                    placeholder="未填写"
                                    value={e[key]}
                                    maxLength={24}
                                    onChange={(event) =>
                                      patch({
                                        experiments: p.experiments.map(
                                          (x, j) =>
                                            i === j
                                              ? {
                                                  ...x,
                                                  [key]: event.target.value,
                                                }
                                              : x,
                                        ),
                                        comparable: false,
                                      })
                                    }
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="footnote">
                      请明确填写实际值；没有费用时填 0。空白不会被当成
                      0，退款后收入需扣除全额和部分退款。
                    </p>
                  </section>
                  <section className="panel scope-panel">
                    <div className="panel-heading">
                      <div>
                        <span className="step-number">口径</span>
                        <h2>确认可以比较的前提</h2>
                      </div>
                    </div>
                    <fieldset disabled={readOnly}>
                      <div className="form-grid">
                        <Field
                          label="数据来源"
                          value={p.dataSource}
                          onChange={(dataSource) =>
                            patch({ dataSource, comparable: false })
                          }
                          placeholder="后台名称、报表日期或导出记录"
                        />
                        <Field
                          label="统计窗口"
                          value={p.window}
                          onChange={(window) =>
                            patch({ window, comparable: false })
                          }
                          placeholder="起止日期、时区，两组是否等长"
                        />
                        <Field
                          label="分组与归因规则"
                          value={p.attribution}
                          onChange={(attribution) =>
                            patch({ attribution, comparable: false })
                          }
                          placeholder="同商品、权益、流量来源及互斥归因方式"
                        />
                        <Field
                          label="退款观察窗口"
                          value={p.refundWindow}
                          onChange={(refundWindow) =>
                            patch({ refundWindow, comparable: false })
                          }
                          placeholder="退款观察截止日期，窗口是否已成熟"
                        />
                      </div>
                      <label className="check-label scope-check">
                        <input
                          type="checkbox"
                          checked={p.comparable}
                          disabled={
                            ![
                              p.dataSource,
                              p.window,
                              p.attribution,
                              p.refundWindow,
                            ].every((v) => v.trim())
                          }
                          onChange={(e) =>
                            patch({ comparable: e.target.checked })
                          }
                        />
                        <span>
                          已核对同 SKU
                          与权益、同一交易链路、互斥归因及成熟的统计与退款窗口。
                        </span>
                      </label>
                    </fieldset>
                  </section>
                  <section className="results-section">
                    <div className="section-title-row">
                      <h2>经营结果</h2>
                      <span className="subtle">根据当前输入实时计算</span>
                    </div>
                    {review.data ? (
                      <>
                        <div className="result-grid">
                          {[
                            {
                              label: '支付转化率',
                              a: percent(review.data.left.conversion),
                              b: percent(review.data.right.conversion),
                            },
                            {
                              label: '全额退款订单率',
                              a: percent(review.data.left.refundRate),
                              b: percent(review.data.right.refundRate),
                            },
                            {
                              label: '项目贡献',
                              a: money(review.data.left.contribution),
                              b: money(review.data.right.contribution),
                            },
                            {
                              label: '每千访客贡献',
                              a: money(review.data.left.contributionPer1000),
                              b: money(review.data.right.contributionPer1000),
                            },
                          ].map((m) => (
                            <article className="metric-card" key={m.label}>
                              <h3>{m.label}</h3>
                              <div>
                                <span>A</span>
                                <strong>{m.a}</strong>
                              </div>
                              <div>
                                <span>B</span>
                                <strong>{m.b}</strong>
                              </div>
                            </article>
                          ))}
                        </div>
                        <div className="comparison-caption">
                          <span>
                            B − A 转化差异{' '}
                            <strong>
                              {review.data.delta === null
                                ? '待确认口径'
                                : `${(review.data.delta * 100).toFixed(2)} 个百分点`}
                            </strong>
                          </span>
                          <p>{review.data.message}</p>
                        </div>
                        <div className="next-step-card">
                          <span className="next-step-icon">
                            <ArrowRight size={22} />
                          </span>
                          <div>
                            <span className="eyebrow">NEXT CHECK</span>
                            <h2>{review.data.nextAction.title}</h2>
                            <p>{review.data.nextAction.reason}</p>
                            <ul>
                              {review.data.nextAction.checks.map((c) => (
                                <li key={c}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="panel">
                        <Empty
                          icon={<BarChart3 size={28} />}
                          title="填写数据后，在这里看结果"
                        >
                          <p>{review.error}</p>
                          <p>
                            支付转化、退款率、项目贡献和每千访客贡献会一起呈现。
                          </p>
                        </Empty>
                      </div>
                    )}
                  </section>
                  <section className="panel">
                    <fieldset disabled={readOnly}>
                      <Field
                        label="我的复盘与下一步决策"
                        value={p.decision}
                        onChange={(decision) => patch({ decision })}
                        rows={4}
                        placeholder="数据说明了什么？还有哪些解释？下一步改什么，由谁完成？"
                      />
                    </fieldset>
                    <details className="method-note">
                      <summary>查看指标定义与使用边界</summary>
                      <p>
                        支付转化率 = 支付买家 UV ÷ 商品访问 UV；全额退款订单率 =
                        全额退款订单 ÷ 支付订单。
                      </p>
                      <p>
                        项目贡献 = 退款后收入 − 可变成本 − 媒体费 −
                        制作合作费；不包含未录入的固定成本和税项，不等于净利润。每千访客贡献按当前窗口摊销，不预测未来放量收益。
                      </p>
                      <p>
                        自然内容对比仅展示观察差异，不证明因果或统计显著性，也不自动决定投放。
                      </p>
                    </details>
                  </section>
                </div>
              )}
            </>
          )}
          <input
            className="visually-hidden"
            ref={importRef}
            type="file"
            accept=".json,application/json"
            aria-label="选择项目备份"
            onChange={importProjects}
          />
          <input
            className="visually-hidden"
            ref={csvRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="选择两组复盘 CSV"
            onChange={importCsv}
          />
        </main>
      </div>
      {notice && (
        <output className="toast">
          <Check size={16} />
          {notice}
        </output>
      )}
      {modal === 'new' && (
        <Modal title="新建项目" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const project = newProject(newName);
              project.category = newCategory;
              if (store.mutate((ps) => [project, ...ps])) {
                openProject(project);
                setModal(null);
                setNotice('项目已创建。先定义任务，再整理证据。');
              }
            }}
          >
            <Field
              label="项目名称"
              value={newName}
              onChange={setNewName}
              placeholder="如：秋季通勤咖啡内容企划"
              required
              maxLength={120}
            />
            <Field
              label="所属品类"
              value={newCategory}
              onChange={setNewCategory}
              placeholder="如：食品饮料"
              maxLength={120}
            />
            <p className="footnote">从空白项目开始，信息只保存在当前浏览器。</p>
            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setModal(null)}
              >
                取消
              </button>
              <button
                className="button primary"
                type="submit"
                disabled={!newName.trim() || store.blocked}
              >
                创建项目
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === 'evidence' && editingEvidence && p && (
        <Modal
          feedback={error || store.error}
          title={
            p.evidence.some((e) => e.id === editingEvidence.id)
              ? '编辑证据'
              : '添加证据'
          }
          onClose={() => {
            setModal(null);
            setEditingEvidence(null);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (
                p.evidence.length >= 500 &&
                !p.evidence.some((e) => e.id === editingEvidence.id)
              ) {
                setError('单个项目最多 500 条证据。');
                return;
              }
              if (
                !patch({
                  evidence: p.evidence.some((e) => e.id === editingEvidence.id)
                    ? p.evidence.map((e) =>
                        e.id === editingEvidence.id ? editingEvidence : e,
                      )
                    : [...p.evidence, editingEvidence],
                })
              )
                return;
              setModal(null);
              setNotice('证据已更新，选入的条目会出现在简报里。');
            }}
          >
            <Field
              label="证据标题"
              value={editingEvidence.title}
              onChange={(title) =>
                setEditingEvidence({ ...editingEvidence, title })
              }
              placeholder="这条资料说明了什么？"
              required
              maxLength={300}
            />
            <div className="form-grid">
              <label className="field">
                <span>类型</span>
                <select
                  value={editingEvidence.kind}
                  onChange={(e) =>
                    setEditingEvidence({
                      ...editingEvidence,
                      kind: e.target.value,
                    })
                  }
                >
                  {Array.from(new Set([...kinds, editingEvidence.kind])).map(
                    (k) => (
                      <option key={k}>{k}</option>
                    ),
                  )}
                </select>
              </label>
              <Field
                label="记录日期"
                value={editingEvidence.date}
                onChange={(date) =>
                  setEditingEvidence({ ...editingEvidence, date })
                }
                placeholder="YYYY-MM-DD 或原文期次"
                maxLength={100}
              />
            </div>
            <Field
              label="来源 / 记录人"
              value={editingEvidence.publisher}
              onChange={(publisher) =>
                setEditingEvidence({ ...editingEvidence, publisher })
              }
              placeholder="平台、机构、访谈对象代号或原始记录编号"
              maxLength={200}
            />
            <Field
              label="原始链接（线下记录可留空）"
              value={editingEvidence.url}
              onChange={(url) =>
                setEditingEvidence({ ...editingEvidence, url })
              }
              type="url"
              placeholder="https://…"
            />
            <Field
              label="关键发现"
              value={editingEvidence.summary}
              onChange={(summary) =>
                setEditingEvidence({ ...editingEvidence, summary })
              }
              rows={3}
              placeholder="记录原文表达了什么，避免把推测写成事实"
              required
            />
            <Field
              label="适用边界 / 不确定性"
              value={editingEvidence.boundary}
              onChange={(boundary) =>
                setEditingEvidence({ ...editingEvidence, boundary })
              }
              rows={2}
              placeholder="样本、时间、型号或测试条件有哪些限制？"
            />
            <div className="evidence-form-checks">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={editingEvidence.verified}
                  onChange={(e) =>
                    setEditingEvidence({
                      ...editingEvidence,
                      verified: e.target.checked,
                    })
                  }
                />
                我已核对原始资料与摘要
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={editingEvidence.selected}
                  onChange={(e) =>
                    setEditingEvidence({
                      ...editingEvidence,
                      selected: e.target.checked,
                    })
                  }
                />
                引用到本项目简报
              </label>
            </div>
            <div className="modal-actions">
              {p.evidence.some((e) => e.id === editingEvidence.id) && (
                <button
                  type="button"
                  className="text-button danger-text"
                  onClick={() => {
                    if (
                      !patch({
                        evidence: p.evidence.filter(
                          (e) => e.id !== editingEvidence.id,
                        ),
                      })
                    )
                      return;
                    setModal(null);
                    setNotice('证据已删除。');
                  }}
                >
                  <Trash2 size={14} />
                  删除
                </button>
              )}
              <button
                className="button secondary"
                type="button"
                onClick={() => setModal(null)}
              >
                取消
              </button>
              <button
                className="button primary"
                type="submit"
                disabled={
                  !editingEvidence.title.trim() ||
                  !editingEvidence.summary.trim()
                }
              >
                保存证据
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === 'delete' && p && (
        <Modal title="删除项目" onClose={() => setModal(null)}>
          <p>
            确定删除「{p.name}
            」及其证据、简报和复盘数据？此操作不能撤销，建议先导出备份。
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => exportProjects()}
            >
              先导出备份
            </button>
            <button className="button secondary" onClick={() => setModal(null)}>
              取消
            </button>
            <button
              className="button primary"
              onClick={() => {
                if (store.mutate((ps) => ps.filter((x) => x.id !== p.id))) {
                  goHome();
                  setModal(null);
                  setNotice('项目已删除。');
                }
              }}
            >
              确认删除
            </button>
          </div>
        </Modal>
      )}
      {modal === 'reset' && (
        <Modal title="重置本地空间" onClose={() => setModal(null)}>
          <p>
            这会清除当前浏览器中无法读取的 BriefLab
            记录。请先下载原始备份，后续可尝试恢复。
          </p>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              取消
            </button>
            <button
              className="button primary"
              onClick={() => {
                store.resetUnreadable();
                setModal(null);
              }}
            >
              清除并重新开始
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
