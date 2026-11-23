import { ModulePlaceholder } from '../../components/ModulePlaceholder/ModulePlaceholder.tsx';
import { TracePreview } from './TracePreview.tsx';

export default function AgentPage() {
  return (
    <ModulePlaceholder id="agent">
      <TracePreview />
    </ModulePlaceholder>
  );
}
