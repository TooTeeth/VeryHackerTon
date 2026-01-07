"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { VotingService } from "../../services/voting.service";
import { useLanguage } from "../../context/LanguageContext";

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
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [selectedChoices, setSelectedChoices] = useState<number[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChoices, setIsLoadingChoices] = useState(false);

  // Load stage list
  useEffect(() => {
    if (isOpen) {
      VotingService.getStages().then(setStages);
    }
  }, [isOpen]);

  // Load choices when stage is selected
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
      toast.error(t("voting.createModal.enterTitle"));
      return;
    }
    if (!selectedStage) {
      toast.error(t("voting.createModal.selectStage"));
      return;
    }
    if (selectedChoices.length < 2) {
      toast.error(t("voting.createModal.minChoices"));
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
        toast.success(t("voting.createModal.created"));
        onCreated();
        onClose();
        // Reset form
        setTitle("");
        setDescription("");
        setSelectedStage(null);
        setSelectedChoices([]);
      } else {
        toast.error(result.error || t("voting.createModal.failed"));
      }
    } catch (error) {
      console.error("Error creating voting:", error);
      toast.error(t("voting.createModal.failed"));
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
          <h2 className="text-xl font-bold text-white">{t("voting.createModal.title")}</h2>
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
          {/* Title */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">{t("voting.createModal.titleLabel")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("voting.createModal.titlePlaceholder")}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">{t("voting.createModal.descLabel")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("voting.createModal.descPlaceholder")}
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Stage selection */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">{t("voting.createModal.stageLabel")}</label>
            <select
              value={selectedStage?.slug || ""}
              onChange={(e) => {
                const stage = stages.find((s) => s.slug === e.target.value);
                setSelectedStage(stage || null);
              }}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">{t("voting.createModal.stagePlaceholder")}</option>
              {stages.map((stage) => (
                <option key={stage.slug} value={stage.slug}>
                  {stage.title || stage.slug}
                </option>
              ))}
            </select>
          </div>

          {/* Choices */}
          {selectedStage && (
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                {t("voting.createModal.choicesLabel")}
              </label>
              {isLoadingChoices ? (
                <div className="text-gray-500 text-center py-4">{t("common.loading")}</div>
              ) : choices.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  {t("voting.createModal.noChoices")}
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

          {/* Voting duration */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">{t("voting.createModal.duration")}</label>
            <div className="flex gap-2">
              {[
                { label: `1${t("voting.createModal.hour")}`, value: 60 },
                { label: `6${t("voting.createModal.hour")}`, value: 360 },
                { label: `1${t("voting.createModal.day")}`, value: 1440 },
                { label: `3${t("voting.createModal.day")}`, value: 4320 },
                { label: `7${t("voting.createModal.day")}`, value: 10080 },
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

          {/* Create button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !title || !selectedStage || selectedChoices.length < 2}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition mt-4"
          >
            {isLoading ? t("voting.createModal.creating") : t("voting.createModal.title")}
          </button>
        </div>
      </div>
    </div>
  );
};
