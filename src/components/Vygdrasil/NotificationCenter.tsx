"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GamificationService } from "../../services/gamification.service";
import type { Notification, NotificationCounts } from "../../types/gamification.types";

interface NotificationCenterProps {
  characterId: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  characterId,
  isExpanded,
  onToggle,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    const [notifs, notifCounts] = await Promise.all([
      GamificationService.getNotifications(characterId, { limit: 5, unreadOnly: false }),
      GamificationService.getNotificationCounts(characterId),
    ]);
    setNotifications(notifs);
    setCounts(notifCounts);
    setIsLoading(false);
  }, [characterId]);

  useEffect(() => {
    if (isExpanded) {
      loadNotifications();
    }
  }, [isExpanded, characterId, loadNotifications]);

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await GamificationService.markNotificationsAsRead(characterId, unreadIds);
      loadNotifications();
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    await GamificationService.markNotificationsAsRead(characterId, [notificationId]);
    loadNotifications();
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "방금 전";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      achievement: "🏆",
      daily_quest: "📋",
      level_up: "⭐",
      reward: "🎁",
      system: "📢",
    };
    return icons[type] || "🔔";
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      achievement: "border-purple-500/50 bg-purple-600/20",
      daily_quest: "border-blue-500/50 bg-blue-600/20",
      level_up: "border-yellow-500/50 bg-yellow-600/20",
      reward: "border-green-500/50 bg-green-600/20",
      system: "border-gray-500/50 bg-gray-600/20",
    };
    return colors[type] || "border-gray-500/50 bg-gray-600/20";
  };

  return (
    <>
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition"
        >
          <div className="flex items-center gap-2">
            <span>🔔</span>
            <span className="font-bold text-sm">알림</span>
            {counts && counts.unread > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 rounded-full min-w-[20px] text-center">
                {counts.unread}
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="px-3 pb-3">
            {isLoading ? (
              <div className="text-center py-4 text-gray-400 text-xs">로딩중...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-xs">알림이 없습니다</div>
            ) : (
              <>
                {/* 모두 읽음 버튼 */}
                {counts && counts.unread > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="w-full text-xs text-gray-400 hover:text-white mb-2 text-right"
                  >
                    모두 읽음 처리
                  </button>
                )}

                <div className="space-y-2 mb-2">
                  {notifications.slice(0, 3).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                      className={`p-2 rounded border cursor-pointer transition ${
                        notif.is_read
                          ? "bg-gray-700/30 border-gray-600/30 opacity-60"
                          : getNotificationColor(notif.type)
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm">{getNotificationIcon(notif.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-bold truncate">{notif.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">{notif.message}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {getTimeAgo(notif.created_at)}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowModal(true)}
                  className="w-full text-center text-xs text-gray-400 hover:text-white py-1"
                >
                  전체 보기
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 전체 알림 모달 */}
      {showModal && (
        <NotificationModal
          characterId={characterId}
          onClose={() => {
            setShowModal(false);
            loadNotifications();
          }}
        />
      )}
    </>
  );
};

// 전체 알림 모달 컴포넌트
const NotificationModal: React.FC<{
  characterId: number;
  onClose: () => void;
}> = ({ characterId, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAllNotifications = useCallback(async () => {
    setIsLoading(true);
    const notifs = await GamificationService.getNotifications(characterId, {
      limit: 50,
      unreadOnly: false,
    });
    setNotifications(notifs);
    setIsLoading(false);
  }, [characterId]);

  useEffect(() => {
    loadAllNotifications();
  }, [loadAllNotifications]);

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await GamificationService.markNotificationsAsRead(characterId, unreadIds);
      loadAllNotifications();
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    await GamificationService.markNotificationsAsRead(characterId, [notificationId]);
    loadAllNotifications();
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "방금 전";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      achievement: "🏆",
      daily_quest: "📋",
      level_up: "⭐",
      reward: "🎁",
      system: "📢",
    };
    return icons[type] || "🔔";
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      achievement: "border-purple-500/50 bg-purple-600/20",
      daily_quest: "border-blue-500/50 bg-blue-600/20",
      level_up: "border-yellow-500/50 bg-yellow-600/20",
      reward: "border-green-500/50 bg-green-600/20",
      system: "border-gray-500/50 bg-gray-600/20",
    };
    return colors[type] || "border-gray-500/50 bg-gray-600/20";
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white">🔔 알림</h2>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-400">
                읽지 않은 알림 <span className="text-red-400">{unreadCount}개</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-gray-400 hover:text-white px-2 py-1"
              >
                모두 읽음
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">로딩중...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-400">알림이 없습니다</div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    notif.is_read
                      ? "bg-gray-800 border-gray-700 opacity-60"
                      : getNotificationColor(notif.type)
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getNotificationIcon(notif.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-white font-bold">{notif.title}</p>
                        {!notif.is_read && (
                          <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {getTimeAgo(notif.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
