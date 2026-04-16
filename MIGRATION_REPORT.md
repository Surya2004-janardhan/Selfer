# Migration Report

Generated at: 2026-04-16T10:58:59.426Z

## Summary

- Auto-generated compatibility stubs: 84
- Markdown import wrappers (.md.js): 32
- Local stub packages: 11
- Unresolved local imports: 0

## Stub Packages

- @ant/claude-for-chrome-mcp
- @ant/computer-use-input
- @ant/computer-use-mcp
- @ant/computer-use-swift
- @anthropic-ai/claude-agent-sdk
- @anthropic-ai/mcpb
- @anthropic-ai/sandbox-runtime
- audio-capture.node
- code-excerpt
- color-diff-napi
- modifiers-napi

## Auto-Generated Compatibility Files

- src-reference/assistant/gate.js
- src-reference/assistant/index.js
- src-reference/assistant/sessionDiscovery.js
- src-reference/bridge/peerSessions.js
- src-reference/bridge/webhookSanitizer.js
- src-reference/cli/transports/Transport.js
- src-reference/commands/agents-platform/index.js
- src-reference/commands/assistant/index.js
- src-reference/commands/buddy/index.js
- src-reference/commands/clear/clear/caches.js
- src-reference/commands/clear/clear/conversation.js
- src-reference/commands/force-snip.js
- src-reference/commands/fork/index.js
- src-reference/commands/install-github-app/types.js
- src-reference/commands/peers/index.js
- src-reference/commands/plugin/types.js
- src-reference/commands/plugin/unifiedTypes.js
- src-reference/commands/proactive.js
- src-reference/commands/remoteControlServer/index.js
- src-reference/commands/subscribe-pr.js
- src-reference/commands/torch.js
- src-reference/commands/workflows/index.js
- src-reference/components/AntModelSwitchCallout.js
- src-reference/components/FeedbackSurvey/useFrustrationDetection.js
- src-reference/components/FeedbackSurvey/utils.js
- src-reference/components/Spinner/types.js
- src-reference/components/UndercoverAutoCallout.js
- src-reference/components/agents/new-agent-creation/types.js
- src-reference/components/mcp/types.js
- src-reference/components/messages/SnipBoundaryMessage.js
- src-reference/components/messages/UserCrossSessionMessage.js
- src-reference/components/messages/UserForkBoilerplateMessage.js
- src-reference/components/messages/UserGitHubWebhookMessage.js
- src-reference/components/permissions/MonitorPermissionRequest/MonitorPermissionRequest.js
- src-reference/components/permissions/ReviewArtifactPermissionRequest/ReviewArtifactPermissionRequest.js
- src-reference/components/tasks/MonitorMcpDetailDialog.js
- src-reference/components/tasks/WorkflowDetailDialog.js
- src-reference/components/ui/option.js
- src-reference/components/wizard/types.js
- src-reference/constants/querySource.js
- src-reference/coordinator/workerAgent.js
- src-reference/hooks/notifs/useAntOrgWarningNotification.js
- src-reference/ink/cursor.js
- src-reference/ink/events/paste-event.js
- src-reference/ink/events/resize-event.js
- src-reference/ink/global.d.ts
- src-reference/jobs/classifier.js
- src-reference/keybindings/types.js
- src-reference/memdir/memoryShapeTelemetry.js
- src-reference/proactive/index.js
- src-reference/proactive/useProactive.js
- src-reference/services/compact/cachedMCConfig.js
- src-reference/services/compact/reactiveCompact.js
- src-reference/services/compact/snipCompact.js
- src-reference/services/compact/snipProjection.js
- src-reference/services/contextCollapse/index.js
- src-reference/services/contextCollapse/operations.js
- src-reference/services/contextCollapse/persist.js
- src-reference/services/lsp/types.js
- src-reference/services/oauth/types.js
- src-reference/services/remoteManagedSettings/securityCheck.jsx
- src-reference/services/sessionTranscript/sessionTranscript.js
- src-reference/services/skillSearch/featureCheck.js
- src-reference/services/skillSearch/localSearch.js
- src-reference/services/skillSearch/prefetch.js
- src-reference/services/skillSearch/remoteSkillLoader.js
- src-reference/services/skillSearch/remoteSkillState.js
- src-reference/services/skillSearch/signals.js
- src-reference/services/skillSearch/telemetry.js
- src-reference/services/tips/types.js
- src-reference/skills/bundled/dream.js
- src-reference/skills/bundled/hunter.js
- src-reference/skills/bundled/runSkillGenerator.js
- src-reference/skills/mcpSkills.js
- src-reference/ssh/SSHSessionManager.js
- src-reference/ssh/createSSHSession.js
- src-reference/tasks/LocalWorkflowTask/LocalWorkflowTask.js
- src-reference/tasks/MonitorMcpTask/MonitorMcpTask.js
- src-reference/utils/filePersistence/types.js
- src-reference/utils/protectedNamespace.js
- src-reference/utils/secureStorage/types.js
- src-reference/utils/taskSummary.js
- src-reference/utils/udsClient.js
- src-reference/utils/udsMessaging.js

## Markdown Wrapper Files

- src-reference/skills/bundled/claude-api/SKILL.md.js
- src-reference/skills/bundled/claude-api/csharp/claude-api.md.js
- src-reference/skills/bundled/claude-api/curl/examples.md.js
- src-reference/skills/bundled/claude-api/go/claude-api.md.js
- src-reference/skills/bundled/claude-api/java/claude-api.md.js
- src-reference/skills/bundled/claude-api/php/claude-api.md.js
- src-reference/skills/bundled/claude-api/python/agent-sdk/README.md.js
- src-reference/skills/bundled/claude-api/python/agent-sdk/patterns.md.js
- src-reference/skills/bundled/claude-api/python/claude-api/README.md.js
- src-reference/skills/bundled/claude-api/python/claude-api/batches.md.js
- src-reference/skills/bundled/claude-api/python/claude-api/files-api.md.js
- src-reference/skills/bundled/claude-api/python/claude-api/streaming.md.js
- src-reference/skills/bundled/claude-api/python/claude-api/tool-use.md.js
- src-reference/skills/bundled/claude-api/ruby/claude-api.md.js
- src-reference/skills/bundled/claude-api/shared/error-codes.md.js
- src-reference/skills/bundled/claude-api/shared/live-sources.md.js
- src-reference/skills/bundled/claude-api/shared/models.md.js
- src-reference/skills/bundled/claude-api/shared/prompt-caching.md.js
- src-reference/skills/bundled/claude-api/shared/tool-use-concepts.md.js
- src-reference/skills/bundled/claude-api/typescript/agent-sdk/README.md.js
- src-reference/skills/bundled/claude-api/typescript/agent-sdk/patterns.md.js
- src-reference/skills/bundled/claude-api/typescript/claude-api/README.md.js
- src-reference/skills/bundled/claude-api/typescript/claude-api/batches.md.js
- src-reference/skills/bundled/claude-api/typescript/claude-api/files-api.md.js
- src-reference/skills/bundled/claude-api/typescript/claude-api/streaming.md.js
- src-reference/skills/bundled/claude-api/typescript/claude-api/tool-use.md.js
- src-reference/skills/bundled/verify/SKILL.md.js
- src-reference/skills/bundled/verify/examples/cli.md.js
- src-reference/skills/bundled/verify/examples/server.md.js
- src-reference/utils/plugins/README.md.js
- src-reference/utils/plugins/docs/guide.md.js
- src-reference/utils/plugins/extra-commands/*.md.js

## Unresolved Local Imports

- none
