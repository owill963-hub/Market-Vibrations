import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from 'lucide-react';

export default function AddMarketDialog({ open, onOpenChange, onSave }) {
  const [title, setTitle] = useState('');
  const [outcomes, setOutcomes] = useState([
    { name: 'Yes', market_price: 0.5, belief_price: 0.5 },
    { name: 'No', market_price: 0.5, belief_price: 0.5 },
  ]);

  const addOutcome = () => {
    setOutcomes([...outcomes, { name: '', market_price: 0.25, belief_price: 0.25 }]);
  };

  const removeOutcome = (i) => {
    if (outcomes.length <= 2) return;
    setOutcomes(outcomes.filter((_, idx) => idx !== i));
  };

  const updateOutcome = (i, field, value) => {
    const updated = [...outcomes];
    updated[i] = { ...updated[i], [field]: field === 'name' ? value : parseFloat(value) || 0 };
    setOutcomes(updated);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      outcomes: outcomes.map(o => ({
        ...o,
        market_price: Math.max(0, Math.min(1, o.market_price)),
        belief_price: Math.max(0, Math.min(1, o.belief_price)),
      })),
      liquidity_param: 100,
      status: 'watching',
    });
    setTitle('');
    setOutcomes([
      { name: 'Yes', market_price: 0.5, belief_price: 0.5 },
      { name: 'No', market_price: 0.5, belief_price: 0.5 },
    ]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Add Market</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label className="text-slate-400 text-xs">Market Question</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Will X happen by Y date?"
              className="bg-slate-800 border-slate-700 text-slate-100 mt-1.5 placeholder:text-slate-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-slate-400 text-xs">Outcomes</Label>
              <Button variant="ghost" size="sm" onClick={addOutcome} className="text-blue-400 h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {outcomes.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={o.name}
                    onChange={(e) => updateOutcome(i, 'name', e.target.value)}
                    placeholder="Outcome name"
                    className="bg-slate-800 border-slate-700 text-slate-100 text-sm flex-1 placeholder:text-slate-600"
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={o.market_price}
                      onChange={(e) => updateOutcome(i, 'market_price', e.target.value)}
                      step="0.01"
                      min="0"
                      max="1"
                      className="bg-slate-800 border-slate-700 text-slate-100 text-sm w-20 font-mono placeholder:text-slate-600"
                    />
                    <span className="text-[10px] text-slate-600">mkt</span>
                  </div>
                  {outcomes.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => removeOutcome(i)} className="h-7 w-7 text-slate-600 hover:text-red-400">
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
            Add Market
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}