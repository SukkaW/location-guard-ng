import { BridgeStatusBanner } from '@/components/shell/bridge-status-banner';
import AppSWRConfig from './components/app-swr-config';

export default function OptionaLayout({ children }: React.PropsWithChildren) {
  return (
    <AppSWRConfig>
      <BridgeStatusBanner />
      {children}
    </AppSWRConfig>
  );
}
