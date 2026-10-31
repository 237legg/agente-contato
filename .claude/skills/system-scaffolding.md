# Skill: Fábrica Autônoma de Software e Scaffolding Técnico

## Objetivo
Executar a geração completa do sistema de software sob medida para o cliente quando o card é movido para `project_approved` no Kanban.

## Fluxo Técnico do `ArchitectAgent`:
1. **Leitura das Fontes de Verdade:**
   - Dossiê do Auditor (`diagnostic_dossier.json`)
   - Histórico do WhatsApp (`whatsapp_history.json`)
   - Especificação de Fechamento (`DealHandoverSpec`)
2. **Geração do `PRD.md` do Cliente:**
   - Detalhamento de personas, fluxo de usuários, módulos contratados, indicadores de BI e integrações.
3. **Criação do `CLAUDE.md` do Cliente:**
   - Regras arquiteturais, comandos de inicialização, schema de banco e convenções.
4. **Implementação de Código em `projects/<client-slug>/`:**
   - Schema SQLite / Drizzle para o nicho (Clínica, Restaurante, Comércio).
   - Componentes visuais do Dashboard de BI (KPIs de receita, no-show, margem, ticket médio).
   - Telas de CRM de atendimento integradas ao WhatsApp.
   - Rotas de API e endpoints funcionais.
5. **Verificação de Build e Teste:**
   - Validar que o código compila sem erros de sintaxe ou tipos.
   - Registrar log de compilação em `build_logs`.
   - Atualizar barra de progresso no card do Kanban.
