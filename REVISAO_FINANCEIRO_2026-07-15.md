# Revisão do Financeiro — 15/07/2026

Auditoria de consistência entre **Financeiro** (`financial_transactions`), **Planos de Tratamento** (`budgets`) e **Pagamentos** (`payment_receivables`) em produção (`pakusdbmpgrfhjouiniz`).

**Origem do problema:** antes da lixeira de orçamentos (soft-delete, migração `20260626`), excluir um orçamento era DELETE definitivo — apagava as parcelas em cascata mas deixava as receitas órfãs no Financeiro (`related_entity_id` apontando para orçamento inexistente). O bug de código não existe mais; os itens abaixo são dados legados + duplicatas de lançamento.

## Já corrigido

- **Mariana Matheus Rizzatto** (Clínica Essência) — 5 receitas (R$ 1.910) órfãs religadas aos orçamentos recriados e os 5 itens marcados como pagos. SQL aplicado em `supabase/migrations/20260715_fix_mariana_orphan_income.sql`. Verificado em 15/07/2026.

## Pendente de confirmação com a clínica

⚠️ **Nenhuma alteração abaixo foi aplicada.** Confirmar item por item antes de mexer no banco.

### A) Receitas duplicadas (mesmo procedimento lançado 2x)

Pergunta para todas: *"esse procedimento foi pago uma vez só, certo?"* Se sim → apagar 1 das 2 receitas. Se o paciente pagou 2x de verdade → não mexer.

| # | Clínica | Paciente | Procedimento | Valor 2x | Data |
|---|---------|----------|--------------|----------|------|
| 1 | Atendimento Individual | Clotilde Gouveia Pinheiro De Souza | Canal – Dente 37 (PIX) | R$ 900 | 20/01 (lançada 23/01 e 26/01) |
| 2 | Clínica Essência | Bruno Brito Santos | Canal – Dente 24 (PIX) | R$ 800 | 07/07 |
| 3 | Clínica Essência | Soloína Calatayud | Restauração – Dente 64 decíduo (Crédito) | R$ 220 | 16/05 |
| 4 | Clínica Essência | Amarú Rodríguez | Restauração – Dente 54 decíduo (PIX) | R$ 180 | 30/05 |
| 5 | Clínica Essência | Alice Neves Thomé | Radiografia – Dente 46 (Crédito) | R$ 60 | 21/05 |
| 6 | Clínica Essência | Vinicius de Castro Nascimento | Radiografia – Dente 14 (PIX) | R$ 60 | 07/05 |

Se todas confirmadas como cobrança única: Receita Bruta cai **R$ 2.220**.

### B) Receitas órfãs (plano original foi excluído de vez)

| # | Clínica | Paciente | Pergunta para a clínica | Ação se confirmado |
|---|---------|----------|-------------------------|--------------------|
| 7 | At. Individual | **Piter Diethelm** | Limpeza R$ 380 (04/06) foi paga 1x só? Restauração Dente 24 (R$ 310) foi paga em dinheiro em 04/06? | Apagar a Limpeza órfã (duplicada de uma receita válida) e religar a Restauração D24 ao item pendente do plano atual, marcando-o pago (mesma correção da Mariana) |
| 8 | At. Individual | **Leonardo Mendonça Lopes** | Tratamento do Dente 26 foi renegociado para R$ 1.400 em 4x R$ 350? Os lançamentos antigos (Canal R$ 980 em 05/03 + splits R$ 105 e R$ 245 em 06/03 = R$ 1.330) foram substituídos pelas parcelas? | Se substituídos: apagar os R$ 1.330 órfãos (hoje as duas versões contam juntas no Financeiro) |
| 9 | At. Individual | **Sebastian Cedaro** | Ele fez **dois** canais de R$ 800 (11/02 e 04/03) ou foi **um só** relançado? O item "Canal – Dente 45" pendente no plano existe de verdade? | Dois canais: religar a receita de 11/02 ao item pendente e marcar pago. Um só: apagar a receita órfã de 11/02 (−R$ 800); item pendente fica para a clínica remover |
| 10 | At. Individual | **Alexandra dos Santos** | O "Bloco – Dente 11" de R$ 300 (14/02) foi realmente pago? (o procedimento não está mais no plano dela) | Se pago: manter a receita, só desvinculando do orçamento inexistente. Se não: apagar |
| 11 | Clínica Essência | Marli Brito de Lima | Receita de **R$ 0,01** (Limpeza, 12/05) foi teste? | Apagar |
| 12 | Clínica "teste" | teste adulto | 4 receitas de teste (R$ 709,99 total) | Apagar junto, se autorizado |

### C) Orçamentos na lixeira com receitas ainda contando

Comportamento projetado (lixeira preserva receitas para permitir restauração), mas confirmar se a exclusão foi intencional:

| # | Paciente (Clínica Essência) | Situação | Pergunta |
|---|------------------------------|----------|----------|
| 13 | Juliana Silva da Luz | Orçamento foi para a lixeira em 10/07 no **mesmo dia** do lançamento de 8 parcelas de cartão (R$ 850, vencendo até 10/10) | O atendimento aconteceu? Se a exclusão foi cancelamento, as 8 parcelas precisam sair do Financeiro |
| 14 | Brunele Brito de Lima | Limpeza R$ 350 (08/06), orçamento na lixeira desde 01/07 | Restaurar o orçamento ou apagar a receita? |
| 15 | Marcos Eleazar Dornellas Chagas | Parcela split de R$ 175 vencendo 07/08, orçamento na lixeira desde 30/06 | Essa parcela ainda vai ser recebida? |

### D) Conferência manual (sem ação automática)

- **Adityas Reisch** (Essência): orçamento R$ 798, receitas R$ 1.140 — houve procedimento a mais sem atualizar o orçamento?
- **Cezar Cloves Matiazzi dos Santos** (At. Individual): orçamento R$ 310, receitas R$ 620 — mesmo caso.
- **Levi Santos Quadros** (Essência): diferença de R$ 18 (provável arredondamento/desconto) — baixa prioridade.
- **Maria Silva 0123** (Clínica do Sol 01): "Tratamento de canal" R$ 500 duplicado, datado de 2024 — parece dado de teste/migração antiga.

## Verificações que passaram limpas

- Nenhum plano marcado como pago **sem** receita correspondente no Financeiro.
- Nenhuma parcela confirmada sem receita vinculada (FK anti-órfã de 28/06 funcionando).

## Queries de apoio (Management API / SQL Editor)

Receitas órfãs (categoria B):

```sql
SELECT c.name AS clinic, p.name AS patient, ft.id, ft.description, ft.amount, ft.date
FROM financial_transactions ft
JOIN patients p ON p.id = ft.patient_id
JOIN clinics c ON c.id = ft.clinic_id
WHERE ft.type = 'income' AND ft.related_entity_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM budgets b WHERE b.id = ft.related_entity_id)
ORDER BY c.name, p.name, ft.date;
```

Receitas duplicadas (categoria A):

```sql
SELECT ft.patient_id, ft.description, ft.amount, ft.date, count(*)
FROM financial_transactions ft
WHERE ft.type = 'income'
GROUP BY 1,2,3,4 HAVING count(*) > 1;
```

Receitas de orçamentos na lixeira (categoria C):

```sql
SELECT p.name, ft.description, ft.amount, ft.date, b.deleted_at
FROM financial_transactions ft
JOIN budgets b ON b.id = ft.related_entity_id AND b.deleted_at IS NOT NULL
JOIN patients p ON p.id = ft.patient_id
WHERE ft.type = 'income';
```

Receitas acima do valor do orçamento (categoria D):

```sql
SELECT p.name, b.id, b.value, sum(ft.amount) AS income_total
FROM budgets b
JOIN financial_transactions ft ON ft.related_entity_id = b.id AND ft.type = 'income'
JOIN patients p ON p.id = b.patient_id
WHERE b.deleted_at IS NULL
GROUP BY 1,2,3 HAVING sum(ft.amount) > b.value + 0.01;
```
