# Checklist de Responsividade

## Status: ✅ Todos os itens abordados na implementação

### Breakpoints testados
- 375px (mobile)
- 768px (tablet)
- 1280px (desktop)

### Layout Principal (AppShell)
- [x] Sidebar fixa à esquerda em desktop (≥ lg)
- [x] Sidebar colapsa em Drawer ativado por hambúrguer em telas < lg
- [x] Header responsivo com UserMenu

### Tabelas
- [x] Todas as tabelas usam `Table.ScrollArea` com scroll horizontal
- [x] `DataTable` wrapper aplica `stickyHeader` para manter cabeçalhos visíveis

### Dialogs/Modais
- [x] Dialogs usam `size={{ mdDown: "full", md: "lg" }}` — fullscreen em mobile, modal em desktop
- [x] ConfirmDialog adaptado para ambos os tamanhos

### Formulários
- [x] Formulários usam `SimpleGrid columns={{ base: 1, md: 2 }}` para layout responsivo
- [x] Inputs ocupam largura total em mobile, dividem em colunas em desktop

### Paginação
- [x] `PaginationBar` compacta em mobile (prev/next), completa em desktop

### Cards e Listas
- [x] Cards em grid responsivo (`SimpleGrid`)
- [x] Textos longos com truncamento adequado (`textOverflow: "ellipsis"`)

### Imagens e Ícones
- [x] Ícones SVG escalam proporcionalmente
- [x] Logo adaptativo no Header

---

**Nota**: Validação completa requer teste visual em dispositivos reais ou emuladores de diferentes resoluções.
