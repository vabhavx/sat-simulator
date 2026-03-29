"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface Notification {
  id: string;
  type: "announcement" | "update" | "achievement" | "reminder";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  icon?: string;
  href?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  dismissNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  addNotification: () => {},
  dismissNotification: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

const STORAGE_KEY = "fudsat_notifications";
const SEEN_KEY = "fudsat_notifications_seen";

// Default system notifications
const SYSTEM_NOTIFICATIONS: Omit<Notification, "read">[] = [
  {
    id: "welcome-2026",
    type: "announcement",
    title: "Welcome to Fudsat",
    message: "Start your SAT prep journey with 50+ full-length practice tests, instant scoring, and detailed analytics.",
    timestamp: Date.now(),
    icon: "spark",
    href: "/exams",
  },
  {
    id: "new-tests-march",
    type: "update",
    title: "New Practice Tests Added",
    message: "We've added the latest 2025 Digital SAT practice tests. Check them out in the exam library.",
    timestamp: Date.now() - 86400000,
    icon: "book",
    href: "/exams",
  },
  {
    id: "analytics-tip",
    type: "reminder",
    title: "Track Your Progress",
    message: "Complete at least 3 exams to unlock detailed domain analysis and improvement trends on your dashboard.",
    timestamp: Date.now() - 172800000,
    icon: "chart",
    href: "/dashboard",
  },
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications on mount
  useEffect(() => {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]") as string[];
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Notification[];

    // Merge system notifications with stored ones
    const systemWithReadState = SYSTEM_NOTIFICATIONS.map((n) => ({
      ...n,
      read: seen.includes(n.id),
    }));

    // Add any user-created notifications from storage
    const userNotifications = stored.filter(
      (s) => !SYSTEM_NOTIFICATIONS.find((sys) => sys.id === s.id)
    );

    setNotifications([...systemWithReadState, ...userNotifications].sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  // Persist read state
  const persistSeen = useCallback((notifs: Notification[]) => {
    const seen = notifs.filter((n) => n.read).map((n) => n.id);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      persistSeen(next);
      return next;
    });
  }, [persistSeen]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      persistSeen(next);
      return next;
    });
  }, [persistSeen]);

  const addNotification = useCallback((n: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotif: Notification = {
      ...n,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications((prev) => {
      const next = [newNotif, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification, dismissNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
