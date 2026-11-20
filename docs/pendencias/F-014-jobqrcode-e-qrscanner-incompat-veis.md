---
tipo: pendencia
id: F-014
titulo: JobQRCode e QRScanner incompatíveis
prioridade: P1
status: resolvida na auditoria (dossiê desatualizado)
fonte: BALANCO-DOCS-2026-10-28.md (secao C)
---

# F-014 - JobQRCode e QRScanner incompatíveis

## Impacto no negocio
Scanner não lê QR gerado (par gerador-leitor quebrado)

## Estado atual
RESOLVIDA em auditoria de 2026-11-20: QRScanner já lê os dois formatos
(URL /track?q=&j= E JSON {type:job}) em src/components/qrcode/QRScanner.tsx:107-124.
O par JobQRCode -> QRScanner é compatível. Nenhuma mudança de código necessária.

## Onde
A confirmar na execucao (repo/banco/edge).

## Criterio de aceite
Comportamento verificado em producao, sem regressao.

## Ordem
14 de 16 por impacto x custo.
