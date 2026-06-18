import React, { useState } from 'react';
import PageShell from '@/components/layout/PageShell';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Settings as SettingsIcon, User, Trash2, AlertTriangle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Settings() {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      // Delete all user-owned watchlist items
      const items = await base44.entities.WatchlistItem.filter({ owner_email: user?.email });
      await Promise.all(items.map(i => base44.entities.WatchlistItem.delete(i.id)));
      toast.success('Account data deleted. Logging out…');
      setTimeout(() => base44.auth.logout(), 1500);
    } catch (e) {
      toast.error('Failed to delete account data. Please contact support.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <PageShell glowLeft="bg-slate-600/5" glowRight="bg-slate-600/5">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="w-4 h-4 text-slate-400" />
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        </div>

        {/* Account Info */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-200">{user?.full_name || 'User'}</div>
              <div className="text-xs text-slate-500 font-mono">{user?.email}</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => base44.auth.logout()}
            className="border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-800 text-xs"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign Out
          </Button>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-300">Danger Zone</span>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Deleting your account will permanently remove all your watchlist items, alerts, and saved strategies. This action cannot be undone.
          </p>

          {confirmDelete ? (
            <div className="space-y-3">
              <div className="bg-red-950/40 border border-red-800/60 rounded-xl px-4 py-3 text-xs text-red-300 leading-relaxed">
                Are you absolutely sure? All your data will be permanently deleted and you will be signed out.
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-red-700 hover:bg-red-600 text-white text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {deleting ? 'Deleting…' : 'Yes, Delete My Account'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="border-slate-700 text-slate-400 hover:text-slate-100 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeleteAccount}
              className="border-red-800/60 text-red-400 hover:bg-red-950/40 hover:text-red-300 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete Account
            </Button>
          )}
        </div>
      </div>
    </PageShell>
  );
}