# Checklist de Acessibilidade (WCAG 2.1 AA)

## Status: ✅ Todos os itens abordados na implementação

### Focus Ring
- [x] Chakra UI v3 aplica `:focus-visible` com ring por padrão em todos os componentes interativos
- [x] Navegação por teclado funciona em todos os menus, botões e links

### aria-labels
- [x] Formulários usam `Field.Label` que gera `<label for="...">` automaticamente
- [x] `Field.ErrorText` associado via `aria-describedby` pelo Chakra
- [x] Tabelas usam cabeçalhos semânticos (`<th>`)
- [x] Botões de ícone possuem `aria-label` descritivo

### role="alertdialog"
- [x] `ConfirmDialog` usa `<Dialog.Root role="alertdialog">` para confirmações destrutivas
- [x] Foco é capturado dentro do dialog (focus trap nativo do Chakra)

### aria-live (Toasts)
- [x] O componente `Toaster` do Chakra UI aplica `aria-live="polite"` automaticamente
- [x] Toasts de erro usam `role="alert"` implicitamente

### Navegação por teclado
- [x] `Tab` navega entre elementos interativos
- [x] `Enter` ativa botões e links
- [x] `Escape` fecha Dialogs e Drawers (Chakra built-in)
- [x] Sidebar Drawer é acessível por teclado em mobile

### Contraste de cores
- [x] Tema usa semantic tokens que respeitam contraste mínimo 4.5:1
- [x] StatusBadge usa combinações de cor com contraste adequado

---

**Nota**: Validação completa de acessibilidade requer testes manuais com tecnologias assistivas (NVDA, VoiceOver) e auditoria com axe-core/Lighthouse.
