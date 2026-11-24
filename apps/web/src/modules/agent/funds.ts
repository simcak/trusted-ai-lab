import { FundsFileSchema } from '@trusted-ai-lab/agent-runtime';
import raw from '../../../../../data/funds.json' with { type: 'json' };

/** The fictional funds the agent works with (validated like every imported data file). */
export const FUNDS = FundsFileSchema.parse(raw).funds;
