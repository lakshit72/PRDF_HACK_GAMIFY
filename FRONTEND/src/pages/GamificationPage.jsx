/**
 * pages/GamificationPage.jsx
 * Thin wrapper that renders GamificationStats as a full standalone page.
 */
import GamificationStats from '../components/GamificationStats.jsx';

export default function GamificationPage() {
  return <GamificationStats standalone={true} />;
}