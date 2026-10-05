import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-[rgb(var(--bg))] px-4">
      <div className="w-full max-w-lg text-center">
        <div className="pointer-events-none fixed inset-0 grid-bg" aria-hidden />
        <EmptyState icon={Compass} title="Page not found" body="That link does not lead anywhere in Bandit. Head back to your dashboard and keep studying."
          action={<Link to="/"><Button>Back to dashboard</Button></Link>} />
      </div>
    </div>
  );
}