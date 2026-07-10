'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { listNotifications, markNotificationRead, markAllNotificationsRead, countUnreadNotifications } from '@/app/actions/notifications';
import { NotificationsList } from './NotificationsList';
import type { NotificationRow } from '@/types/database';

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    countUnreadNotifications().then(setUnread);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      const list = await listNotifications();
      setNotifications(list);
    }
  }

  async function handleItemClick(id: string) {
    await markNotificationRead(id);
    setUnread((u) => Math.max(0, u - 1));
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={toggleOpen} className="relative text-slate-300 hover:text-white transition-colors">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 text-slate-900">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-xs font-bold uppercase text-slate-500">Notificaciones</span>
            <button type="button" onClick={handleMarkAll} className="text-[11px] text-indigo-600 hover:underline">
              Marcar todas leídas
            </button>
          </div>
          <NotificationsList notifications={notifications} onClickItem={handleItemClick} />
        </div>
      )}
    </div>
  );
}
