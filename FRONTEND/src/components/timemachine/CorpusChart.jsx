/**
 * components/timemachine/CorpusChart.jsx
 * Bar chart comparing baseline vs improved corpus using Chart.js.
 * Fully self-contained — registers required Chart.js components inline.
 */
import { useEffect, useRef } from 'react';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

// Register only what we need (tree-shakeable)
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const formatLabel = (v) => {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1)}L`;
  return `₹${v.toLocaleString('en-IN')}`;
};

export default function CorpusChart({ baseCorpus, improvedCorpus }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy previous chart instance on re-render
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Without Change', 'With Change'],
        datasets: [
          {
            label: 'Corpus at 60',
            data: [baseCorpus, improvedCorpus],
            backgroundColor: [
              'rgba(100, 116, 139, 0.5)',   // muted slate for baseline
              'rgba(110, 231, 183, 0.7)',    // sage green for improved
            ],
            borderColor: [
              'rgba(100, 116, 139, 0.9)',
              'rgba(110, 231, 183, 1)',
            ],
            borderWidth: 2,
            borderRadius: 10,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: 'easeOutQuart',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#161d2e',
            borderColor: '#2a3452',
            borderWidth: 1,
            titleColor: '#94a3b8',
            bodyColor: '#f0f4ff',
            titleFont: { family: 'DM Mono', size: 11 },
            bodyFont: { family: 'DM Mono', size: 14, weight: 'bold' },
            padding: 12,
            callbacks: {
              label: (ctx) => ` ${formatLabel(ctx.raw)}`,
            },
          },
        },
        scales: {
          x: {
            grid:  { display: false },
            ticks: {
              color: '#64748b',
              font: { family: 'DM Sans', size: 12 },
            },
            border: { color: '#2a3452' },
          },
          y: {
            grid:  { color: 'rgba(42,52,82,0.5)', lineWidth: 1 },
            border: { dash: [4, 4], display: false },
            ticks: {
              color: '#64748b',
              font: { family: 'DM Mono', size: 10 },
              callback: (v) => formatLabel(v),
              maxTicksLimit: 5,
            },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [baseCorpus, improvedCorpus]);

  return (
    <div className="relative w-full" style={{ height: '240px' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}