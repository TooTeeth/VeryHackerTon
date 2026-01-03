"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { VotingService } from "../../services/voting.service";

interface Stage {
  id: number;
  slug: string;
  title: string;
}

interface Choice {
  id: number;
  choice: string;
}

interface CreateVotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  walletAddress: string;
  onCreated: () => void;
}

export const CreateVotingModal: React.FC<CreateVotingModalProps> = ({
  isOpen,
  onClose,
  gameId,
  walletAddress,
  onCreated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [selectedChoices, setSelectedChoices] = useState<number[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(60); // 기본 1시간
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChoices, setIsLoadingChoices] = useState(false);

  // 스테이지 목록 로드
  useEffect(() => {
    if (isOpen) {
      VotingService.getStages().then(setStages);
    }
  }, [isOpen]);

  // 스테이지 선택 시 선택지 로드
  useEffect(() => {
    if (selectedStage) {
      setIsLoadingChoices(true);
      VotingService.getChoicesByStage(selectedStage.slug).then((data) => {
        setChoices(data);
        setSelectedChoices([]);
        setIsLoadingChoices(false);
      });
    } else {
      setChoices([]);
      setSelectedChoices([]);
    }
  }, [selectedStage]);

  const handleChoiceToggle = (choiceId: number) => {
    setSelectedChoices((prev) =>
      prev.includes(choiceId)
        ? prev.filter((id) => id !== choiceId)
        : [...prev, choiceId]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("제목을 입력하세요");
      return;
    }
    if (!selectedStage) {
      toast.error("스테이지를 선택하세요");
      return;
    }
    if (selectedChoices.length < 2) {
      toast.error("최소 2개의 선택지를 선택하세요");
      return;
    }

    setIsLoading(true);
    try {
      const result = await VotingService.createVotingSession(
        gameId,
        selectedStage.id,
        title,
        description,
        selectedChoices,
        durationMinutes
      );

      if (result.success) {
        toast.success("투표가 생성되었습니다!");
        onCreated();
        onClose();
        // 폼 초기화
        setTitle("");
        setDescription("");
        setSelectedStage(null);
        setSelectedChoices([]);
      } else {
        toast.error(result.error || "투표 생성에 실패했습니다");
      }
    } catch (error) {
      console.error("Error creating voting:", error);
      toast.error("투표 생성에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl border border-purple-500/50 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-4 flex justify-between items-center sticky top-0">
          <h2 className="text-xl font-bold text-white">투표 생성</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* 제목 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="투표 제목을 입력하세요"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="투표 설명을 입력하세요 (선택)"
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* 스테이지 선택 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">스테이지 *</label>
            <select
              value={selectedStage?.slug || ""}
              onChange={(e) => {
                const stage = stages.find((s) => s.slug === e.target.value);
                setSelectedStage(stage || null);
              }}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">스테이지를 선택하세요</option>
              {stages.map((stage) => (
                <option key={stage.slug} value={stage.slug}>
                  {stage.title || stage.slug}
                </option>
              ))}
            </select>
          </div>

          {/* 선택지 */}
          {selectedStage && (
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                선택지 * (최소 2개)
              </label>
              {isLoadingChoices ? (
                <div className="text-gray-500 text-center py-4">로딩 중...</div>
              ) : choices.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  이 스테이지에 선택지가 없습니다
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {choices.map((choice) => (
                    <label
                      key={choice.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        selectedChoices.includes(choice.id)
                          ? "bg-purple-600/30 border border-purple-500"
                          : "bg-gray-800 border border-gray-700 hover:border-gray-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedChoices.includes(choice.id)}
                        onChange={() => handleChoiceToggle(choice.id)}
                        className="w-4 h-4 accent-purple-600"
                      />
                      <span className="text-white">{choice.choice}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 투표 기간 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">투표 기간</label>
            <div className="flex gap-2">
              {[
                { label: "1시간", value: 60 },
                { label: "6시간", value: 360 },
                { label: "1일", value: 1440 },
                { label: "3일", value: 4320 },
                { label: "7일", value: 10080 },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDurationMinutes(option.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    durationMinutes === option.value
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 생성 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !title || !selectedStage || selectedChoices.length < 2}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition mt-4"
          >
            {isLoading ? "생성 중..." : "투표 생성"}
          </button>
        </div>
      </div>
    </div>
  );
};
