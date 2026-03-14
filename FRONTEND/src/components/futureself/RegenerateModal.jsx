/**
 * components/futureself/RegenerateModal.jsx
 * Modal with age, contribution, and return-rate sliders to regenerate the future self.
 */
import { useState } from 'react';
import Modal from '../shared/Modal.jsx';
import RupeeSlider from '../shared/RupeeSlider.jsx';
import { Spinner } from '../ui/index.jsx';

const fmtNum = (v) => v.toLocaleString('en-IN');

export default function RegenerateModal({ isOpen, onClose, onRegenerate, initialValues = {} }) {
  const [age,          setAge]          = useState(initialValues.age          ?? 25);
  const [balance,      setBalance]      = useState(initialValues.balance      ?? 50000);
  const [contribution, setContribution] = useState(initialValues.contribution ?? 2000);
  const [returnRate,   setReturnRate]   = useState(initialValues.returnRate   ?? 10);
  const [inflation,    setInflation]    = useState(initialValues.inflation    ?? 6);
  const [loading,      setLoading]      = useState(false);

  const yearsLeft    = 60 - age;
  const projSimple   = Math.round(balance * Math.pow(1.1, yearsLeft) + contribution * 12 * yearsLeft);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onRegenerate({ age, currentNpsBalance: balance, monthlyContribution: contribution, expectedReturn: returnRate, inflation });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Your Inputs">
      <div className="space-y-6">

        {/* Age */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-text-secondary font-body uppercase tracking-wide">Current Age</span>
            <span className="font-mono font-bold text-gold text-base">{age} yrs</span>
          </div>
          <input
            type="range" min={18} max={59} step={1} value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full accent-gold h-1.5 rounded-full bg-surface-2 appearance-none cursor-pointer"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted font-mono">18</span>
            <span className="text-[10px] text-muted font-mono">59</span>
          </div>
        </div>

        {/* Balance */}
        <RupeeSlider
          label="Current NPS Balance"
          value={balance}
          min={0}
          max={5000000}
          step={10000}
          onChange={setBalance}
          accentColor="#f5c542"
        />

        {/* Monthly contribution */}
        <RupeeSlider
          label="Monthly Contribution"
          value={contribution}
          min={500}
          max={50000}
          step={500}
          onChange={setContribution}
          accentColor="#7dd3fc"
          sublabel="per month"
        />

        {/* Return rate */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-text-secondary font-body uppercase tracking-wide">Expected Return</span>
            <span className="font-mono font-bold text-frost text-base">{returnRate}% p.a.</span>
          </div>
          <input
            type="range" min={6} max={15} step={0.5} value={returnRate}
            onChange={(e) => setReturnRate(Number(e.target.value))}
            className="w-full accent-frost h-1.5 rounded-full bg-surface-2 appearance-none cursor-pointer"
          />
        </div>

        {/* Inflation */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-text-secondary font-body uppercase tracking-wide">Inflation Rate</span>
            <span className="font-mono font-bold text-ember text-base">{inflation}% p.a.</span>
          </div>
          <input
            type="range" min={3} max={10} step={0.5} value={inflation}
            onChange={(e) => setInflation(Number(e.target.value))}
            className="w-full accent-ember h-1.5 rounded-full bg-surface-2 appearance-none cursor-pointer"
          />
        </div>

        {/* Preview */}
        <div className="bg-surface-2 rounded-xl p-3 text-center border border-border">
          <p className="text-muted text-[10px] uppercase tracking-wide font-body mb-1">Rough Preview</p>
          <p className="font-mono font-bold text-gold text-lg">
            {projSimple >= 1_00_00_000
              ? `₹${(projSimple / 1_00_00_000).toFixed(1)} Cr`
              : projSimple >= 1_00_000
              ? `₹${(projSimple / 1_00_000).toFixed(1)} L`
              : `₹${fmtNum(projSimple)}`}
          </p>
          <p className="text-muted text-[10px] font-body">estimated at 60 (simplified)</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {loading && <Spinner size="sm" />}
          {loading ? 'Generating...' : '✨ Regenerate My Future Self'}
        </button>
      </div>
    </Modal>
  );
}