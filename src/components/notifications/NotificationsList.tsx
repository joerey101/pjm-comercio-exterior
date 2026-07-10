'use client';

import Link from 'next/link';
import type { NotificationRow } from '@/types/database';

export function NotificationsList({ notifications, onClickItem }: { notifications: NotificationRow[]; onClickItem: (id: string) => void }) {
  if (notifications.length === 0) {
    return <p className="p-4 text-xs text-slate-400 text-center">Sin notificaciones.</p>;
  }

  return (
    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
      {notifications.map((n) => {
        const content = (
          <div className={`p-3 text-xs hover:bg-slate-50 ${!n.read_at ? 'bg-indigo-50/50' : ''}`}>
            <span className="font-bold text-slate-800 block">{n.title}</span>
            <span className="text-slate-500 block mt-0.5">{n.message}</span>
            <span className="text-[10px] text-slate-400 block mt-1">{new Date(n.created_at).toLocaleString('es-AR')}</span>
          </div>
        );
        return n.link_url ? (
          <Link key={n.id} href={n.link_url} onClick={() => onClickItem(n.id)}>
            {content}
          </Link>
        ) : (
          <button key={n.id} type="button" onClick={() => onClickItem(n.id)} className="w-full text-left">
            {content}
          </button>
        );
      })}
    </div>
  );
}
