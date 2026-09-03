import { Breadcrumb, Link } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

interface Crumb {
  label: string;
  to?: string;
}

function resolveCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  const [section, identifier] = segments;
  const sectionLabel: Record<string, string> = {
    dashboard: 'Dashboard',
    creditors: 'Credores',
    wallets: 'Carteiras',
    contracts: 'Contratos',
    imports: 'Importações',
    operations: 'Operações',
    users: 'Usuários',
    providers: 'Canais',
    'serasa-wallets': 'Integração Serasa',
    'payment-gateways': 'Meios de pagamento',
    'api-keys': 'Chaves de API',
    audit: 'Auditoria',
    sessions: 'Sessões',
    'change-password': 'Alterar senha',
  };

  if (!section || !sectionLabel[section]) return [{ label: 'Início', to: '/dashboard' }];
  const crumbs: Crumb[] = [{ label: 'Início', to: '/dashboard' }];
  if (section !== 'dashboard') crumbs.push({ label: sectionLabel[section], to: `/${section}` });
  else crumbs.push({ label: 'Dashboard' });

  if (identifier === 'new') crumbs.push({ label: 'Nova importação' });
  else if (identifier) {
    const details = section === 'wallets' ? 'Detalhes da carteira'
      : section === 'contracts' ? 'Detalhes do contrato'
        : section === 'creditors' ? 'Detalhes do credor'
          : section === 'imports' ? 'Detalhes da importação'
            : section === 'operations' ? 'Detalhes da operação'
              : 'Detalhes';
    crumbs.push({ label: details });
  }
  return crumbs;
}

export function AppBreadcrumb() {
  const { pathname } = useLocation();
  const crumbs = resolveCrumbs(pathname);

  return (
    <Breadcrumb.Root size="sm" mb="4" colorPalette="blue">
      <Breadcrumb.List>
        {crumbs.map((crumb, index) => (
          <Breadcrumb.Item key={`${crumb.label}-${index}`}>
            {crumb.to && index < crumbs.length - 1 ? (
              <Breadcrumb.Link asChild>
                <Link asChild>
                  <RouterLink to={crumb.to}>{crumb.label}</RouterLink>
                </Link>
              </Breadcrumb.Link>
            ) : (
              <Breadcrumb.CurrentLink>{crumb.label}</Breadcrumb.CurrentLink>
            )}
            {index < crumbs.length - 1 && <Breadcrumb.Separator />}
          </Breadcrumb.Item>
        ))}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}
