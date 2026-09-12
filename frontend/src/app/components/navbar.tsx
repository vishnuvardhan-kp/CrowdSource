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

  const isReviewer =
    user?.role === "PLATFORM_ADMIN" ||
    user?.role === "GOVERNMENT_OFFICER" ||
    user?.role === "GOVERNMENT_ADMIN";

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingNotifications(true);
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silent fallback
    } finally {
      setLoadingNotifications(false);
    }
  }, [token]);

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
      await fetch(`/api/notifications/${id}/read`, {
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
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
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
      href: "/challenges/new",
      label: t("nav.submit_problem"),
      icon: PlusCircle,
      highlight: true,
    },
    ...(userOrgId
      ? [
          {
            href: `/organizations/${userOrgId}/passport`,
            label: t("nav.passport"),
            icon: Award,
          },
          {
            href: "/my-eois",
            label: t("nav.my_eois"),
            icon: FileCheck2,
          },
        ]
      : [
          {
            href: "/organizations/onboard",
            label: t("nav.onboard_institution"),
            icon: Building2,
          },
        ]),
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
            badge: t("nav.gov_admin_badge"),
          },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white/95 backdrop-blur-md shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 shadow-sm text-white font-bold text-base tracking-tight transition-transform group-hover:scale-105">
              SS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-stone-900 group-hover:text-emerald-800 transition-colors">
                  SamadhanSetu
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {t("nav.brand_subtitle")}
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-stone-500 font-medium">
                {t("nav.brand_tagline")}
              </p>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
        <div className="hidden md:flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative flex items-center">
            <Languages className="h-3.5 w-3.5 text-stone-500 absolute left-2.5 pointer-events-none" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label={t("nav.language")}
              className="text-xs font-semibold bg-stone-50 border border-stone-200 text-stone-800 rounded-xl pl-7 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer hover:bg-stone-100"
            >
              {Object.values(supportedLanguages).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </div>

          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-stone-200">
              {/* Notifications Bell Dropdown */}
              <div className="relative" ref={dropdownRef}>
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
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-stone-200 bg-white p-3 shadow-xl z-50">
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

              <div className="text-right">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                  <UserIcon className="h-3.5 w-3.5 text-stone-400" />
                  {user.name}
                </div>
                <div className="text-[10px]">
                  <span className="inline-block px-1.5 py-0.2 rounded font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                    {formatUserRole(user.role, t)}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                title={t("nav.logout")}
                className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-stone-50 hover:text-red-600 transition-colors"
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

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg border border-stone-200 p-2 text-stone-700 hover:bg-stone-50"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 py-4 space-y-2 shadow-lg">
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
              className="text-xs font-semibold bg-stone-50 border border-stone-200 text-stone-800 rounded-lg px-2.5 py-1.5"
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
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  {link.label}
                </div>
                {link.badge && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="border-t border-stone-200 pt-3 mt-3">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-stone-900">{user.name}</p>
                  <p className="text-[10px] text-emerald-800 font-medium">{formatUserRole(user.role)}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-red-600 hover:bg-stone-50"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
