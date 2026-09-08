'use client';
import { useEffect, useRef, useState } from 'react';
import {
  parseBackup,
  saveLocal,
  serializeBackup,
  byteLength,
  storageKey,
  type Project,
} from './workspace';

export function useWorkspace() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ready, setReady] = useState(false),
    [blocked, setBlocked] = useState(true),
    [error, setError] = useState(''),
    [saved, setSaved] = useState('');
  const current = useRef<Project[]>([]),
    raw = useRef<string | null>(null),
    dirty = useRef(false),
    locked = useRef(true),
    ownsLock = useRef(false);
  useEffect(() => {
    let disposed = false;
    let release: (() => void) | undefined;
    function load() {
      try {
        raw.current = localStorage.getItem(storageKey);
        current.current = raw.current ? parseBackup(raw.current) : [];
        setProjects(current.current);
        setSaved('已保存在此浏览器');
        return true;
      } catch {
        setError(
          '本地项目未能读取。已保留原始记录，请先下载原始备份，再尝试恢复。',
        );
        return false;
      }
    }
    // Hold one origin-scoped writer lock for this tab's lifetime. A second tab is
    // read-only, so read/compare/write cannot interleave between cooperating tabs.
    if (!navigator.locks) {
      queueMicrotask(() => {
        if (disposed) return;
        load();
        setReady(true);
        setBlocked(true);
        setError(
          '此浏览器不支持安全保存。请使用最新版 Chrome、Edge、Firefox 或 Safari 打开；当前可以查看与导出。',
        );
      });
    } else {
      void navigator.locks
        .request(
          'brieflab.workspace.writer',
          { ifAvailable: true },
          async (lock) => {
            if (disposed) return;
            const loaded = load();
            setReady(true);
            if (!lock) {
              setBlocked(true);
              locked.current = true;
              setSaved('只读窗口');
              setError(
                '另一标签页正在编辑此工作空间。此页仅供查看；关闭另一页后，刷新本页即可编辑。',
              );
              return;
            }
            ownsLock.current = true;
            if (loaded) {
              locked.current = false;
              setBlocked(false);
              setError('');
            }
            await new Promise<void>((resolve) => {
              release = resolve;
            });
          },
        )
        .catch(() => {
          if (!disposed) {
            load();
            setReady(true);
            setBlocked(true);
            setError('无法取得安全编辑权限，请关闭其他工作台页面后重新打开。');
          }
        });
    }
    const external = (e: StorageEvent) => {
      if (
        (e.key === storageKey || e.key === null) &&
        e.newValue !== raw.current
      ) {
        locked.current = true;
        setBlocked(true);
        setSaved('需要重新加载');
        setError('其他页面已更新项目。请先导出当前备份，再刷新加载最新版本。');
      }
    };
    const leaving = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener('storage', external);
    window.addEventListener('beforeunload', leaving);
    return () => {
      disposed = true;
      locked.current = true;
      ownsLock.current = false;
      release?.();
      window.removeEventListener('storage', external);
      window.removeEventListener('beforeunload', leaving);
    };
  }, []);
  function mutate(update: (p: Project[]) => Project[]): boolean {
    if (!ready || locked.current || !ownsLock.current) return false;
    const next = update(current.current);
    if (byteLength(serializeBackup(next)) > 4000000) {
      setError(
        '工作空间接近 4 MB 容量上限，此次修改未写入。请先导出并整理旧项目。',
      );
      return false;
    }
    if (next.length > 100) {
      setError('最多保存 100 个项目，请先导出并整理旧项目。');
      return false;
    }
    try {
      parseBackup(serializeBackup(next));
    } catch {
      setError(
        '此次修改超出可保存的字段范围，未写入项目。请缩短内容或分拆项目。',
      );
      return false;
    }
    try {
      if (localStorage.getItem(storageKey) !== raw.current) {
        locked.current = true;
        setBlocked(true);
        setError('其他页面已更新项目。请先导出当前备份，再刷新加载最新版本。');
        return false;
      }
      raw.current = saveLocal(localStorage, next, raw.current);
      dirty.current = false;
      setError('');
      setSaved(
        '已保存 · ' +
          new Date().toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
      );
    } catch {
      dirty.current = true;
      setSaved('尚未保存');
      setError(
        '浏览器未能保存最新编辑，可能是存储空间不足。当前内容仍在页面中，请立即导出备份；不要关闭页面。',
      );
    }
    current.current = next;
    setProjects(next);
    return true;
  }
  function resetUnreadable() {
    if (!ownsLock.current) {
      setError('请先关闭其他编辑窗口，再刷新本页。');
      return;
    }
    try {
      localStorage.removeItem(storageKey);
      raw.current = null;
      current.current = [];
      setProjects([]);
      dirty.current = false;
      locked.current = false;
      setBlocked(false);
      setError('');
      setSaved('本地空间已重置');
    } catch {
      setError('浏览器禁止访问本地存储，请在普通浏览窗口重新打开。');
    }
  }
  return {
    projects,
    ready,
    blocked,
    error,
    saved,
    mutate,
    rawBackup: () => raw.current,
    resetUnreadable,
  };
}
