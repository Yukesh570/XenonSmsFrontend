import {
  LogOut,
  User,
  Menu,
  Bell,
  HelpCircle,
  Sun,
  Moon,
  KeyRound,
  Clock,
  ChevronDown,
  Maximize,
  Minimize,
  Archive,
  Palette,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
import Button from "../ui/Button";
import { Link, useNavigate } from "react-router-dom";
import { useContext, Fragment, useState, useEffect, useRef, useMemo } from "react";
import { ThemeContext } from "../../context/themeContext";
import { useAuth } from "../../context/AuthContext";
import { NavItemsContext } from "../../context/navItemsContext";
import type { navUserData } from "../../api/navUserRelationApi/navUserRelationApi";
import {
  Menu as HeadlessMenu,
  Popover,
  Transition,
  Dialog,
} from "@headlessui/react";
import {
  getNotificationApi,
  updateNotificationApi,
  type NotificationData,
} from "../../api/userActionApi/notificationApi";

interface NavbarProps {
  onToggleSidebar: () => void;
}

interface LocalNotificationData extends NotificationData {
  seen?: boolean;
}

const Navbar = ({ onToggleSidebar }: NavbarProps) => {
  const navigate = useNavigate();
  const { payload, logout } = useAuth();
  const { theme, toggleTheme, primaryColor, changePrimaryColor } =
    useContext(ThemeContext);
  const { navItems } = useContext(NavItemsContext);

  const [notificationData, setNotificationData] = useState<LocalNotificationData[]>(
    [],
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [localColor, setLocalColor] = useState(primaryColor);
  const [recentColors, setRecentColors] = useState<string[]>([]);

  // Module Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [appTimezone, setAppTimezone] = useState(
    localStorage.getItem("app_timezone") || "UTC"
  );

  // Extract all searchable readable module pages dynamically from navItems context
  const searchableModules = useMemo(() => {
    if (!navItems?.results) return [];
    const list: { title: string; path: string; category?: string }[] = [];
    const walk = (items: navUserData[], parentLabel?: string) => {
      items.forEach((item) => {
        if (item.permission?.read && item.url && item.label) {
          if (!item.children || item.children.length === 0) {
            list.push({
              title: item.label,
              path: `/${item.url}`,
              category: parentLabel,
            });
          }
        }
        if (item.children && item.children.length > 0) {
          walk(item.children, item.label);
        }
      });
    };
    walk(navItems.results);
    return list;
  }, [navItems]);

  // Filter modules based on search input
  const filteredModules = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return searchableModules.filter((item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  }, [searchableModules, searchTerm]);

  // Close search dropdown and shrink to icon on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
        if (!searchTerm) {
          setIsSearchExpanded(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchTerm]);

  const handleSelectPage = (path: string) => {
    navigate(path);
    setSearchTerm("");
    setIsSearchOpen(false);
    setIsSearchExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchOpen || filteredModules.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredModules.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredModules.length) % filteredModules.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredModules[selectedIndex]) {
        handleSelectPage(filteredModules[selectedIndex].path);
      }
    } else if (e.key === "Escape") {
      setIsSearchOpen(false);
      setIsSearchExpanded(false);
    }
  };

  useEffect(() => {
    const handleTimezoneChange = () => {
      setAppTimezone(localStorage.getItem("app_timezone") || "UTC");
    };

    window.addEventListener("timezoneChanged", handleTimezoneChange);
    return () => {
      window.removeEventListener("timezoneChanged", handleTimezoneChange);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const response: any = await getNotificationApi();
      if (response && response.results) {
        setNotificationData(response.results);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const handleNotificationClick = async (notification: LocalNotificationData) => {
    if (notification.id === undefined) return;

    setNotificationData((prev) =>
      prev.map((notif) =>
        notif.id === notification.id ? { ...notif, seen: true } : notif
      )
    );

    try {
      await updateNotificationApi(notification.id, { seen: true });
    } catch (error) {
      console.error("Failed to update notification seen status:", error);
    }
  };

  const handleViewAllClick = async () => {
    const unreadNotifications = notificationData.filter((n) => !n.seen);
    
    setNotificationData((prev) =>
      prev.map((notif) => ({ ...notif, seen: true }))
    );

    try {
      await Promise.all(
        unreadNotifications.map((n) =>
          n.id !== undefined ? updateNotificationApi(n.id, { seen: true }) : Promise.resolve()
        )
      );
    } catch (error) {
      console.error("Failed to mark all notifications as seen:", error);
    }
  };

  const unreadCount = notificationData.filter((n) => !n.seen).length;

  useEffect(() => {
    const savedRecents = localStorage.getItem("recentThemeColors");
    if (savedRecents) {
      try {
        setRecentColors(JSON.parse(savedRecents));
      } catch (e) {
        console.error("Failed to parse recent colors");
      }
    }
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (isThemeModalOpen) {
      setLocalColor(primaryColor);
    }
  }, [isThemeModalOpen, primaryColor]);

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalColor(e.target.value);
  };

  const handleResetTheme = () => {
    const defaultColor = "#7F58D8";
    setLocalColor(defaultColor);
  };

  const handleSaveAndClose = () => {
    changePrimaryColor(localColor);
    let newRecents = [localColor, ...recentColors];
    newRecents = [...new Set(newRecents)];
    newRecents = newRecents.slice(0, 5);
    setRecentColors(newRecents);
    localStorage.setItem("recentThemeColors", JSON.stringify(newRecents));
    setIsThemeModalOpen(false);
  };

  const isLightColor = (hex: string) => {
    const cleanHex = hex.replace("#", "");
    if (cleanHex.length !== 6) return false;
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 200;
  };

  const ThemeToggle = () => (
    <Button
      variant="ghost"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="text-gray-900 dark:text-white" size={20} />
      ) : (
        <Moon className="text-gray-900 dark:text-white" size={20} />
      )}
    </Button>
  );

  return (
    <>
      <header className="h-16 flex justify-between items-center px-6 relative z-40 bg-white dark:bg-gray-900 shadow-sm transition-colors duration-300">
        <div className="flex items-center">
          <Button variant="ghost" onClick={onToggleSidebar} className="mr-2">
            <Menu className="text-gray-900 dark:text-white transition-colors duration-300" size={24} />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Live Clock using state appTimezone */}
          <div className="text-sm text-gray-900 dark:text-white font-medium hidden md:block">
            {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: appTimezone }).format(currentTime)} | {new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", timeZone: appTimezone }).format(currentTime)}
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2 hidden md:block" />

          {/* Expandable Module Search Bar */}
          {!isSearchExpanded ? (
            <Button
              variant="ghost"
              onClick={() => {
                setIsSearchExpanded(true);
                setIsSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              title="Search module"
            >
              <Search className="text-gray-900 dark:text-white" size={20} />
            </Button>
          ) : (
            <div ref={searchRef} className="relative w-48 sm:w-60 transition-all duration-200">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearchOpen(true);
                    setSelectedIndex(0);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search module..."
                  className="w-full py-1.5 pl-9 pr-8 text-xs md:text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-primary dark:focus:bg-gray-900 transition-all"
                />
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setIsSearchOpen(false);
                    setIsSearchExpanded(false);
                  }}
                  className="absolute right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Search Dropdown Results */}
              {isSearchOpen && searchTerm.trim() !== "" && (
                <div className="absolute left-0 right-0 z-[100] mt-1 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl py-1 custom-scrollbar">
                  {filteredModules.length > 0 ? (
                    filteredModules.map((item, index) => (
                      <div
                        key={item.path}
                        onClick={() => handleSelectPage(item.path)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`flex items-center justify-between px-3 py-2 text-xs md:text-sm cursor-pointer transition-colors ${
                          index === selectedIndex
                            ? "bg-primary/10 text-primary font-medium dark:bg-primary/20"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        }`}
                      >
                        <span className="truncate pr-2">{item.title}</span>
                        {item.category && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal shrink-0">
                            {item.category}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500 text-center font-medium">
                      No modules found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Button variant="ghost" onClick={handleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} className="hidden md:flex">
            {isFullscreen ? <Minimize className="text-gray-900 dark:text-white" size={20} /> : <Maximize className="text-gray-900 dark:text-white" size={20} />}
          </Button>

          <ThemeToggle />

          {/* Improved Notification Popover */}
          <Popover className="relative">
            {({ open, close }) => (
              <>
                <Popover.Button
                  as={Button}
                  variant="ghost"
                  onClick={fetchNotifications}
                  className={`relative transition-all duration-200 ${open ? "bg-gray-100 dark:bg-gray-700" : ""}`}
                >
                  <Bell className="text-gray-900 dark:text-white" size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900 animate-pulse" />
                  )}
                </Popover.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 translate-y-1 scale-95"
                  enterTo="opacity-100 translate-y-0 scale-100"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0 scale-100"
                  leaveTo="opacity-0 translate-y-1 scale-95"
                >
                  <Popover.Panel className="absolute right-0 z-[999] mt-3 w-80 sm:w-96 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-2xl ring-1 ring-black/5 focus:outline-none border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">Notifications</h3>
                      <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full">
                        {unreadCount} New
                      </span>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50 custom-scrollbar">
                      {notificationData.length > 0 ? (
                        notificationData.map((notification) => (
                          <div 
                            key={notification.id} 
                            onClick={() => handleNotificationClick(notification)}
                            className={`group relative flex items-start p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all cursor-pointer ${notification.seen ? 'opacity-60' : ''}`}
                          >
                            <div className="flex-shrink-0 mt-1">
                              <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                                <Archive size={16} className="text-primary" />
                              </div>
                            </div>
                            <div className="ml-4 w-0 flex-1">
                              <div className="flex justify-between items-start">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate pr-4">
                                  {notification.title || "Module Update"}
                                </p>
                                {!notification.seen && (
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                )}
                              </div>
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {notification.description}
                              </p>
                              <div className="mt-2 flex items-center text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                                <Clock size={12} className="mr-1" />
                                {notification.createdAt ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: appTimezone }).format(new Date(notification.createdAt)) : "Just now"}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                          <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-full mb-4">
                            <Bell size={32} className="text-gray-400" />
                          </div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">All caught up!</p>
                          <p className="text-xs text-gray-500 mt-1">No new notifications to show.</p>
                        </div>
                      )}
                    </div>

                    <div className="p-3 border-t border-gray-100 dark:border-gray-700 text-center bg-white dark:bg-gray-800">
                      <Link 
                        to="/notifications" 
                        onClick={() => {
                          handleViewAllClick();
                          close();
                        }} 
                        className="text-xs font-bold text-primary hover:underline transition-all block py-1"
                      >
                        View All Notifications
                      </Link>
                    </div>
                  </Popover.Panel>
                </Transition>
              </>
            )}
          </Popover>

          <Button variant="ghost" className="hidden md:flex">
            <HelpCircle className="text-gray-900 dark:text-white transition-colors duration-300" size={20} />
          </Button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-3 hidden md:block" />

          {/* User Dropdown */}
          <HeadlessMenu as="div" className="relative">
            <div>
              <HeadlessMenu.Button as={Button} variant="ghost" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  <User size={18} />
                </div>
                <span className="text-gray-900 dark:text-white transition-colors duration-300 hidden sm:block">
                  {payload?.userType}
                </span>
                <ChevronDown className="ml-1 h-5 w-5 text-gray-900 dark:text-white" />
              </HeadlessMenu.Button>
            </div>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <HeadlessMenu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 dark:divide-gray-600 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100 dark:border-gray-700">
                <div className="px-1 py-1">
                  <HeadlessMenu.Item>
                    {({ active }) => (
                      <Link to="/change-password" className={`${active ? "bg-primary text-white" : "text-gray-900 dark:text-white"} group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors`}>
                        <KeyRound className="mr-2 h-5 w-5" /> Change Password
                      </Link>
                    )}
                  </HeadlessMenu.Item>
                  <HeadlessMenu.Item>
                    {({ active }) => (
                      <button onClick={() => setIsThemeModalOpen(true)} className={`${active ? "bg-primary text-white" : "text-gray-900 dark:text-white"} group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors`}>
                        <Palette className="mr-2 h-5 w-5" /> Theme Change
                      </button>
                    )}
                  </HeadlessMenu.Item>
                </div>
                <div className="px-1 py-1">
                  <HeadlessMenu.Item>
                    {({ active }) => (
                      <button onClick={logout} className={`${active ? "bg-primary text-white" : "text-gray-900 dark:text-white"} group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors`}>
                        <LogOut className="mr-2 h-5 w-5" /> Logout
                      </button>
                    )}
                  </HeadlessMenu.Item>
                </div>
              </HeadlessMenu.Items>
            </Transition>
          </HeadlessMenu>
        </div>
      </header>

      {/* Theme Modal */}
      <Transition appear show={isThemeModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsThemeModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-8 text-left align-middle shadow-2xl transition-all border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-6">
                    <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900 dark:text-white">Theme Color</Dialog.Title>
                    <button onClick={handleResetTheme} className="text-xs text-gray-500 hover:text-primary flex items-center gap-1 transition-colors">
                      <RefreshCcw size={12} /> Reset
                    </button>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="relative group mb-6">
                      <div className="w-24 h-24 rounded-full shadow-lg border-[4px] border-white dark:border-gray-700 transition-transform group-hover:scale-105" style={{ backgroundColor: localColor }}></div>
                      <input type="color" value={localColor} onChange={handleColorChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full" />
                      <div className="absolute bottom-0 right-0 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md pointer-events-none">
                        <Palette size={16} className="text-gray-600 dark:text-gray-300" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Click the circle to pick a color</p>
                    <div className="w-full max-w-[200px] mb-6">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">#</span>
                        <input
                          type="text"
                          value={localColor.replace("#", "")}
                          onChange={(e) => setLocalColor("#" + e.target.value)}
                          className="w-full pl-7 pr-4 py-2 text-center text-sm font-mono border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none uppercase"
                          maxLength={6}
                        />
                      </div>
                    </div>
                    {recentColors.length > 0 && (
                      <div className="w-full">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">Recently Used</p>
                        <div className="flex justify-center gap-3">
                          {recentColors.map((color, index) => (
                            <button key={index} onClick={() => setLocalColor(color)} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm transition-transform hover:scale-110" style={{ backgroundColor: color }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-8">
                    <Button 
                      variant="primary" 
                      onClick={handleSaveAndClose} 
                      className="w-full justify-center transition-all shadow-md border"
                      style={{ 
                        backgroundColor: localColor, 
                        borderColor: isLightColor(localColor) ? "#9ca3af" : localColor,
                        color: isLightColor(localColor) ? "#111827" : "#FFFFFF",
                        boxShadow: isLightColor(localColor) ? "0 4px 12px rgba(0, 0, 0, 0.15)" : undefined
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default Navbar;