# Plano: Corrigir Loading Infinito no Toolkit.tsx

## Problema Identificado

O ficheiro `src/pages/Toolkit.tsx` tem o mesmo bug de race condition que foi corrigido no Dashboard:

```typescript
// Linha 12-13 - ATUAL (BUG)
const { user } = useAuth();
const { isPremium, loading } = useEntitlements();  // Chama useAuth() internamente
```

Isto cria **duas instâncias separadas de `useAuth()`**:
1. Uma no componente (linha 12)
2. Outra dentro de `useEntitlements()` (linha 28 do hook)

As duas instâncias podem resolver em tempos diferentes, causando estados inconsistentes e loading infinito para utilizadores logados.

## Solucao

Aplicar o mesmo padrao usado no Dashboard - passar `user` e `authLoading` explicitamente:

```typescript
// CORRIGIDO
const { user, loading: authLoading } = useAuth();
const { isPremium, loading } = useEntitlements(user, authLoading);
```

## Alteracoes Necessarias

### Ficheiro: `src/pages/Toolkit.tsx`

**Linha 12-13 - Alterar de:**
```typescript
const { user } = useAuth();
const { isPremium, loading } = useEntitlements();
```

**Para:**
```typescript
const { user, loading: authLoading } = useAuth();
const { isPremium, loading: entLoading } = useEntitlements(user, authLoading);
const loading = authLoading || entLoading;
```

## Resultado Esperado

- Utilizadores nao logados: veem a pagina de marketing (ja funciona)
- Utilizadores logados nao-premium: veem a pagina de marketing sem loading infinito
- Utilizadores logados premium: veem a vista premium com acesso as features

## Ficheiros Criticos

- `src/pages/Toolkit.tsx` - Ficheiro a corrigir
- `src/hooks/useEntitlements.ts` - Hook que aceita parametros externos
- `src/hooks/useAuth.ts` - Hook de autenticacao (referencia)
- `src/pages/Dashboard.tsx` - Exemplo do padrao correto a seguir
