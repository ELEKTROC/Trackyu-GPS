import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
    Users, 
    Server, 
    Activity, 
    Settings, 
    Building2,
    Palette,
    BookOpen,
    FileText,
    Webhook,
    MessageSquare,
    Trash2
} from 'lucide-react';
import { Tabs } from '../../../components/Tabs';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileTabLayout } from '../../../components/MobileTabLayout';
import { useMobileViewTabs } from '../../../hooks/useMobileViewTabs';
import { HelpArticlesPanelV2 } from './HelpArticlesPanelV2';
import { DocumentTemplatesPanelV2 } from './DocumentTemplatesPanelV2';
import { WebhooksPanelV2 } from './WebhooksPanelV2';
import { OrganizationPanelV2 } from './OrganizationPanelV2';
import { IntegrationsPanelV2 } from './IntegrationsPanelV2';
import { MessageTemplatesPanel } from './messages';

// Imported Panels
import { ResellersPanelV2 } from './panels/ResellersPanelV2';
import { WhiteLabelPanel } from './panels/WhiteLabelPanel';
import { SystemPanel } from './panels/SystemPanel';
import { AuditLogsPanelV2 } from './panels/AuditLogsPanelV2';
import { StaffPanelV2 } from './panels/StaffPanelV2';
import DeviceConfigPanelV2 from './panels/DeviceConfigPanelV2';
// Panel prepared for future auto-registration flow
import { RegistrationRequestsPanel as _RegistrationRequestsPanel } from './panels/RegistrationRequestsPanel';
import { TrashPanelV2 } from './panels/TrashPanelV2';





const ADMIN_MOBILE_HIDDEN = new Set(['whitelabel', 'system', 'audit-logs', 'templates', 'webhooks', 'integrations', 'trash']);

export const SuperAdminView: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { filterTabsForView } = useMobileViewTabs();
  const [activeTab, setActiveTab] = useState('staff');

  const ADMIN_TABS = useMemo(() => {
      const tabs = [
          { id: 'resellers',    label: 'Revendeurs',          icon: Building2,    color: 'bg-purple-500', description: 'Gestion des revendeurs',      requiredRole: 'SUPERADMIN' },
          { id: 'devices',      label: 'Paramètres Boîtiers', icon: Settings,     color: 'bg-slate-600',  description: 'Configuration des trackers' },
          { id: 'whitelabel',   label: 'Marque Blanche',      icon: Palette,      color: 'bg-pink-500',   description: 'Personnalisation de la marque', requiredRole: 'SUPERADMIN' },
          { id: 'staff',        label: 'Équipe',               icon: Users,        color: 'bg-blue-500',   description: 'Gestion des collaborateurs' },
          { id: 'system',       label: 'Système',              icon: Server,       color: 'bg-red-500',    description: 'Configuration système',        requiredRole: 'SUPERADMIN' },
          { id: 'audit-logs',   label: "Journal d'Audit",      icon: Activity,     color: 'bg-orange-500', description: 'Historique des actions',        requiredRole: 'SUPERADMIN' },
          { id: 'help',         label: 'Centre d\'Aide',       icon: BookOpen,     color: 'bg-teal-500',   description: 'Articles et documentation' },
          { id: 'templates',    label: 'Documents',            icon: FileText,     color: 'bg-indigo-500', description: 'Modèles de documents' },
          { id: 'messages',     label: 'Messages',             icon: MessageSquare,color: 'bg-green-500',  description: 'Modèles de messages' },
          { id: 'webhooks',     label: 'Webhooks',             icon: Webhook,      color: 'bg-yellow-600', description: 'Intégrations événementielles',  requiredRole: 'SUPERADMIN' },
          { id: 'organization', label: 'Organisation',         icon: Building2,    color: 'bg-cyan-600',   description: 'Paramètres de l\'organisation' },
          { id: 'integrations', label: 'Intégrations',         icon: Settings,     color: 'bg-violet-500', description: 'Connexions tierces',           requiredRole: 'SUPERADMIN' },
          { id: 'trash',        label: 'Corbeille',            icon: Trash2,       color: 'bg-red-400',    description: 'Éléments supprimés',           requiredRole: 'SUPERADMIN' },
      ];
      const normalizedRole = (user?.role || '').toUpperCase().replace(/_/g, '');
      return tabs.filter(tab => !tab.requiredRole || normalizedRole === tab.requiredRole);
  }, [user]);

  const visibleAdminTabs = useMemo(() => {
      const baseTabs = isMobile ? ADMIN_TABS.filter(t => !ADMIN_MOBILE_HIDDEN.has(t.id)) : ADMIN_TABS;
      return isMobile ? filterTabsForView('adminView', baseTabs) : baseTabs;
  }, [isMobile, ADMIN_TABS, filterTabsForView]);

  // Ensure active tab is valid
  React.useEffect(() => {
      if (!visibleAdminTabs.find(t => t.id === activeTab)) {
          setActiveTab(visibleAdminTabs[0]?.id || 'staff');
      }
  }, [visibleAdminTabs, activeTab]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500">
      <MobileTabLayout
        tabs={visibleAdminTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        backLabel="Administration"
      >
        {/* TOP NAVIGATION — desktop only */}
        {!isMobile && (
          <Tabs tabs={visibleAdminTabs} activeTab={activeTab} onTabChange={setActiveTab} />
        )}

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {activeTab === 'resellers'    && <ResellersPanelV2 />}
            {activeTab === 'devices'      && <DeviceConfigPanelV2 />}
            {activeTab === 'whitelabel'   && <WhiteLabelPanel />}
            {activeTab === 'staff'        && <StaffPanelV2 />}
            {activeTab === 'system'       && <SystemPanel />}
            {activeTab === 'audit-logs'   && <AuditLogsPanelV2 />}
            {activeTab === 'help'         && <HelpArticlesPanelV2 />}
            {activeTab === 'templates'    && <DocumentTemplatesPanelV2 />}
            {activeTab === 'messages'     && <MessageTemplatesPanel />}
            {activeTab === 'webhooks'     && <WebhooksPanelV2 />}
            {activeTab === 'organization' && <OrganizationPanelV2 />}
            {activeTab === 'integrations' && <IntegrationsPanelV2 />}
            {activeTab === 'trash'        && <TrashPanelV2 />}
        </div>
      </MobileTabLayout>
    </div>
  );
};
