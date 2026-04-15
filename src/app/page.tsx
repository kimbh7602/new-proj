"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { TaskList } from "@/components/task-list";
import { TaskDetail } from "@/components/task-detail";
import { AgentDashboard } from "@/components/agent-dashboard";
import type { Task, Agent, Result } from "@/types";

// Mock data for initial development
const mockTasks: Task[] = [
  {
    issue_key: "BH-42",
    title: "로그인 API 리팩토링",
    status: "pending",
    agent_name: "Agent-1",
    agent_id: "agent-1",
    elapsed: "12분",
    has_pending_approval: true,
    latest_result_id: "r-1",
    latest_event: null,
  },
  {
    issue_key: "BH-39",
    title: "알림 서비스 구현",
    status: "completed",
    agent_name: "Agent-2",
    agent_id: "agent-2",
    elapsed: "3분 전",
    has_pending_approval: false,
    latest_result_id: "r-2",
    latest_event: null,
  },
  {
    issue_key: "INFRA-15",
    title: "CI 파이프라인 수정",
    status: "error",
    agent_name: "Agent-3",
    agent_id: "agent-3",
    elapsed: "실패",
    has_pending_approval: false,
    latest_result_id: null,
    latest_event: null,
  },
  {
    issue_key: "BH-45",
    title: "결제 모듈 테스트 추가",
    status: "running",
    agent_name: "Agent-1",
    agent_id: "agent-1",
    elapsed: "2분",
    has_pending_approval: false,
    latest_result_id: null,
    latest_event: null,
  },
];

const mockAgents: Agent[] = [
  {
    id: "agent-1",
    team_id: "t-1",
    name: "Agent-1",
    type: "symphony",
    orchestrator_id: "orch-1",
    status: "running",
    current_task_ids: ["BH-42"],
    updated_at: new Date().toISOString(),
  },
  {
    id: "agent-2",
    team_id: "t-1",
    name: "Agent-2",
    type: "symphony",
    orchestrator_id: "orch-1",
    status: "completed",
    current_task_ids: [],
    updated_at: new Date().toISOString(),
  },
  {
    id: "agent-3",
    team_id: "t-1",
    name: "Agent-3",
    type: "symphony",
    orchestrator_id: "orch-1",
    status: "error",
    current_task_ids: [],
    updated_at: new Date().toISOString(),
  },
  {
    id: "agent-4",
    team_id: "t-1",
    name: "Agent-4",
    type: "symphony",
    orchestrator_id: "orch-1",
    status: "idle",
    current_task_ids: [],
    updated_at: new Date().toISOString(),
  },
];

const mockResult: Result = {
  id: "r-1",
  agent_id: "agent-1",
  team_id: "t-1",
  event_id: "e-1",
  jira_issue_key: "BH-42",
  content_md: `## Plan #4: 로그인 API 리팩토링

현재 \`/api/auth/login\` 엔드포인트의 문제점을 분석하고 다음과 같이 리팩토링합니다:

- JWT 토큰 생성 로직을 \`auth.service.ts\`로 분리
- 입력 검증에 zod 스키마 적용
- 에러 응답 표준화 (\`ApiError\` 클래스)

\`\`\`typescript
// Before
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  // ... 80 lines of mixed logic
});

// After
app.post('/login',
  validate(loginSchema),
  authController.login
);
\`\`\`

### 영향 범위
- \`src/routes/auth.ts\` — 기존 라우트 핸들러 제거
- \`src/services/auth.service.ts\` — 신규 서비스 파일
- \`src/schemas/auth.schema.ts\` — zod 스키마
- \`src/controllers/auth.controller.ts\` — 컨트롤러 분리
`,
  created_at: new Date().toISOString(),
};

export default function Home() {
  const [activeView, setActiveView] = useState("tasks");
  const [selectedTask, setSelectedTask] = useState<string | null>("BH-42");
  const [boardFilter, setBoardFilter] = useState("all");

  const boards = [
    { id: 1, name: "BH Board", project_key: "BH" },
    { id: 2, name: "INFRA Board", project_key: "INFRA" },
  ];

  const currentTask = mockTasks.find((t) => t.issue_key === selectedTask) ?? null;
  const currentResult = selectedTask === "BH-42" ? mockResult : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        boards={boards}
      />

      {activeView === "dashboard" ? (
        <AgentDashboard agents={mockAgents} />
      ) : (
        <>
          <TaskList
            tasks={mockTasks}
            selectedKey={selectedTask}
            onSelect={setSelectedTask}
            boardFilter={boardFilter}
            onBoardFilterChange={setBoardFilter}
            boards={["BH Board", "INFRA Board"]}
          />
          <TaskDetail
            task={currentTask}
            result={currentResult}
            onApprove={(key, msg) => {
              // TODO: Send approval to Symphony via API
            }}
            onReject={(key, msg) => {
              // TODO: Send rejection to Symphony via API
            }}
            onReply={(key, msg) => {
              // TODO: Send reply to Symphony via API
            }}
          />
        </>
      )}
    </div>
  );
}
