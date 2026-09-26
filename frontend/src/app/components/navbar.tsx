"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { formatUserRole, formatDateSafe } from "../../lib/utils";
import {
  Compass,
  PlusCircle,
  FolderHeart,
  ShieldAlert,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Building2,
  Award,
  FileCheck2,
  Bell,
  BarChart3,
  CheckCheck,
  Check,
  ArrowRight,
  Sparkles,
  Languages,
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  reference_type?: string;
  reference_id?: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const { t, language, setLanguage, supportedLanguages } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const isReviewer =
    user?.role === "PLATFORM_ADMIN" ||
    user?.role === "GOVERNMENT_OFFICER" ||
    user?.role === "GOVERNMENT_ADMIN";

  const isUniversity =
    user?.role === "UNIVERSITY_ADMIN" ||
    user?.role === "FACULTY" ||
    user?.role === "STUDENT" ||
    user?.primaryOrganization?.organization_type === "ACADEMIC_INSTITUTION";

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingNotifications(true);
      const res = await fetch(`${apiUrl}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.notifications || []);
        const unread = typeof data.unreadCount === "number" ? data.unreadCount : items.filter((n: NotificationItem) => !n.is_read).length;
        setNotifications(items);
        setUnreadCount(unread);
      }
    } catch {
      // silent fallback
    } finally {
      setLoadingNotifications(false);
    }
  }, [apiUrl, token]);

  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 45000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [token, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`${apiUrl}/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await fetch(`${apiUrl}/notifications/mark-all-read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  // Close notifications dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userOrgId =
    user?.primaryOrganization?.id || user?.memberships?.[0]?.organization_id;

  const navLinks = [
    {
      href: "/challenges",
      label: t("nav.challenges"),
      icon: Compass,
    },
    {
      href: "/solutions",
      label: "Open Solutions",
      icon: Sparkles,
    },
    {
      href: "/challenges/new",
      label: t("nav.submit_problem"),
      icon: PlusCircle,
      highlight: true,
    },
    ...(isUniversity
      ? [
          {
            href: "/university-dashboard",
            label: t("nav.university_dashboard"),
            icon: Building2,
          },
        ]
      : []),
    ...(userOrgId
      ? [
          {
            href: `/organizations/${userOrgId}/passport`,
            label: t("nav.passport"),
            icon: Award,
          },
        ]
      : !isReviewer
      ? [
          {
            href: "/organizations/onboard",
            label: t("nav.onboard_institution"),
            icon: Building2,
          },
        ]
      : []),
    ...(user
      ? [
          {
            href: "/my-challenges",
            label: t("nav.my_challenges"),
            icon: FolderHeart,
          },
        ]
      : []),
    ...(isReviewer
      ? [
          {
            href: "/government-dashboard",
            label: t("nav.admin_dashboard"),
            icon: BarChart3,
            badge: t("nav.gov_admin_badge"),
          },
          {
            href: "/reviewer-queue",
            label: t("nav.reviewer_queue"),
            icon: ShieldAlert,
          },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white/95 backdrop-blur-md shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 min-h-[64px] min-w-0">
        {/* Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 shadow-sm text-white font-bold text-base tracking-tight transition-transform group-hover:scale-105">
              RI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-stone-900 group-hover:text-emerald-800 transition-colors">
                  ResolvIN
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {t("nav.brand_subtitle")}
                </span>
              </div>
              <p className="hidden 2xl:block text-[10px] text-stone-500 font-medium">
                {t("nav.brand_tagline")}
              </p>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1 min-w-0">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            if (link.highlight) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="ml-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm shadow-emerald-900/10 transition-all"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-stone-100 text-emerald-800 font-semibold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5 text-stone-400" />
                {link.label}
                {link.badge && (
                  <span className="ml-1 rounded-full bg-amber-50 px-1.5 py-0.2 text-[9px] font-semibold text-amber-800 border border-amber-200">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Identity & Auth Action */}
        <div className="hidden xl:flex items-center gap-2.5 shrink-0">
          {/* Language Selector */}
          <div className="relative flex items-center">
            <Languages className="h-3.5 w-3.5 text-stone-500 absolute left-2 pointer-events-none" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label={t("nav.language")}
              className="text-xs font-semibold bg-stone-50 border border-stone-200 text-stone-800 rounded-xl pl-6 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer hover:bg-stone-100 max-w-[95px]"
            >
              {Object.values(supportedLanguages).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.code.toUpperCase()} ({l.name})
                </option>
              ))}
            </select>
          </div>

          {user ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-stone-200 min-w-0">
              {/* Notifications Bell Dropdown */}
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  title={t("nav.notifications")}
                  className="relative rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white shadow-sm ring-1 ring-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl border border-stone-200 bg-white p-3 shadow-xl z-50">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">{t("nav.notifications")}</span>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                            {unreadCount} {t("nav.unread")}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          <CheckCheck className="h-3 w-3" />
                          {t("nav.mark_all_read")}
                        </button>
                      )}
                    </div>

                    <div className="mt-2 max-h-80 overflow-y-auto space-y-1.5 divide-y divide-stone-100">
                      {loadingNotifications && notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-stone-400">{t("nav.loading_notifications")}</div>
                      ) : notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-stone-400">{t("nav.no_notifications")}</div>
                      ) : (
                        notifications.slice(0, 20).map((n) => {
                          const isRecommendation =
                            n.title.includes("Recommendation") || n.title.includes("🎓");
                          return (
                            <div
                              key={n.id}
                              className={`p-2.5 rounded-xl transition cursor-pointer border ${
                                !n.is_read
                                  ? isRecommendation
                                    ? "bg-emerald-50/70 hover:bg-emerald-50 border-emerald-200/60"
                                    : "bg-emerald-50/40 hover:bg-emerald-50/80 border-emerald-100"
                                  : "hover:bg-stone-50 border-transparent"
                              }`}
                              onClick={() => {
                                if (!n.is_read) handleMarkAsRead(n.id);
                                setNotificationsOpen(false);
                                if (n.action_url) {
                                  router.push(n.action_url);
                                }
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {!n.is_read && (
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 flex-shrink-0" />
                                    )}
                                    <p className="text-xs font-semibold text-stone-900 leading-snug">
                                      {isRecommendation && !n.title.includes("🎓") ? `🎓 ${n.title}` : n.title}
                                    </p>
                                    {isRecommendation && (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-800">
                                        <Sparkles className="h-2.5 w-2.5" />
                                        {t("nav.ai_match")}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-stone-600 mt-1 leading-relaxed whitespace-pre-line line-clamp-3">
                                    {n.message}
                                  </p>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-[10px] text-stone-400 font-medium">
                                      {formatDateSafe(n.created_at)}
                                    </span>
                                    {n.action_url && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800">
                                        {t("nav.view_details")}
                                        <ArrowRight className="h-2.5 w-2.5" />
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {!n.is_read && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkAsRead(n.id);
                                    }}
                                    title={t("common.confirm")}
                                    className="text-stone-400 hover:text-emerald-700 p-1 flex-shrink-0"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-right max-w-[130px] min-w-0 shrink">
                <div className="flex items-center gap-1 text-xs font-semibold text-stone-800 truncate" title={user.name}>
                  <UserIcon className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <span className="truncate">{user.name}</span>
                </div>
                <div className="text-[10px] truncate">
                  <span className="inline-block px-1.5 py-0.2 rounded font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60 truncate max-w-[125px]">
                    {formatUserRole(user.role, t)}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                title={t("nav.logout")}
                className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-stone-50 hover:text-red-600 transition-colors shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition-colors shadow-sm"
              >
                {t("nav.login")}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="xl:hidden flex items-center gap-2 shrink-0">
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                title={t("nav.notifications")}
                className="relative rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                aria-label={t("nav.notifications")}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white shadow-sm ring-1 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 w-auto sm:w-96 max-w-sm rounded-2xl border border-stone-200 bg-white p-3 shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900">{t("nav.notifications")}</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                          {unreadCount} {t("nav.unread")}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        <CheckCheck className="h-3 w-3" />
                        {t("nav.mark_all_read")}
                      </button>
                    )}
                  </div>

                  <div className="mt-2 max-h-80 overflow-y-auto space-y-1.5 divide-y divide-stone-100">
                    {loadingNotifications && notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-stone-400">{t("nav.loading_notifications")}</div>
                    ) : notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-stone-400">{t("nav.no_notifications")}</div>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl transition cursor-pointer border ${
                            !n.is_read
                              ? "bg-emerald-50/70 hover:bg-emerald-50 border-emerald-200/60"
                              : "hover:bg-stone-50 border-transparent"
                          }`}
                          onClick={() => {
                            if (!n.is_read) handleMarkAsRead(n.id);
                            setNotificationsOpen(false);
                            const destination =
                              n.action_url ||
                              (n.reference_type === "CHALLENGE" && n.reference_id
                                ? `/challenges/${n.reference_id}`
                                : undefined);
                            if (destination) router.push(destination);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-stone-900 leading-snug break-words">
                                {n.title}
                              </p>
                              <p className="text-[11px] text-stone-600 mt-1 leading-relaxed line-clamp-3 break-words">
                                {n.message}
                              </p>
                              <div className="flex items-center justify-between mt-1.5 text-[10px] text-stone-400">
                                <span>{formatDateSafe(n.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg border border-stone-200 p-2 text-stone-700 hover:bg-stone-50"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-stone-200 bg-white px-4 py-4 space-y-2 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Mobile Language Selector */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-2">
            <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5 text-stone-500" />
              {t("nav.language")}:
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label={t("nav.language")}
              className="text-xs font-semibold bg-stone-50 border border-stone-200 text-stone-800 rounded-lg px-2.5 py-1.5 max-w-[200px]"
            >
              {Object.values(supportedLanguages).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </div>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium ${
                  link.highlight
                    ? "bg-emerald-700 text-white font-semibold"
                    : isActive
                    ? "bg-stone-100 text-emerald-800 font-semibold"
                    : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{link.label}</span>
                </div>
                {link.badge && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200 shrink-0">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="border-t border-stone-200 pt-3 mt-3">
            {user ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-stone-900 truncate">{user.name}</p>
                  <p className="text-[10px] text-emerald-800 font-medium truncate">{formatUserRole(user.role, t)}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-red-600 hover:bg-stone-50 shrink-0 font-medium"
                >
                  {t("nav.logout")}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800"
              >
                {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
