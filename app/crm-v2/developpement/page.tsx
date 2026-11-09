import { ensureCrmV2Access } from "../access";
import DevelopmentBoard from "./DevelopmentBoard";

export const dynamic = "force-dynamic";

// Page serveur : contrôle d'accès avant d'afficher le tableau (composant client).
export default async function DevelopmentPage() {
  await ensureCrmV2Access("/crm-v2/developpement");

  return <DevelopmentBoard />;
}
