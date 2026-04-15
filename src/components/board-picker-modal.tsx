"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface JiraBoard {
  id: number;
  name: string;
  location?: { projectKey: string; projectName: string };
}

interface BoardPickerModalProps {
  boards: JiraBoard[];
  subscribedIds: number[];
  onSubscribe: (boardId: number) => void;
  onUnsubscribe: (boardId: number) => void;
  onClose: () => void;
}

export function BoardPickerModal({
  boards,
  subscribedIds,
  onSubscribe,
  onUnsubscribe,
  onClose,
}: BoardPickerModalProps) {
  const [search, setSearch] = useState("");

  const filtered = boards.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-[420px] max-h-[500px] flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-white">Jira 보드 관리</h3>
            <button
              className="text-zinc-500 hover:text-zinc-300 text-lg"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            placeholder="보드 검색..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map((board) => {
            const isSubscribed = subscribedIds.includes(board.id);
            return (
              <div
                key={board.id}
                className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-zinc-800"
              >
                <div>
                  <div className="text-sm text-zinc-200">{board.name}</div>
                  <div className="text-[11px] text-zinc-500">
                    {board.location?.projectKey || ""}
                    {board.location?.projectName
                      ? ` · ${board.location.projectName}`
                      : ""}
                  </div>
                </div>
                {isSubscribed ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-800 text-red-400 hover:bg-red-900/30 text-xs h-7"
                    onClick={() => onUnsubscribe(board.id)}
                  >
                    구독 해제
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-7"
                    onClick={() => onSubscribe(board.id)}
                  >
                    구독
                  </Button>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
