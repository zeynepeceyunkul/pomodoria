import type { MeResponse } from '../api/users';

export type AppOutletContext = {
  me: MeResponse | null;
  loadingProfile: boolean;
  refreshMe: () => Promise<void>;
};
