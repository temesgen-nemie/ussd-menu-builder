"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Users, Settings } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import ProfileDialog from "./user/ProfileDialog";
import UsersDialog from "./user/UsersDialog";
import SettingsMenu from "./user/SettingsMenu";

export default function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const initials = useMemo(() => {
    const name = user?.username?.trim() || "";
    return name ? name[0].toUpperCase() : "U";
  }, [user?.username]);

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:bg-muted cursor-pointer"
          aria-label="Open user menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-indigo-600 text-white font-bold text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-66 z-100003 p-2">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="truncate text-sm font-semibold">
            {user.username}
          </span>
          <Badge variant="secondary" className="text-[10px] uppercase text-green-800 bg-green-100 font-bold">
            {user.isAdmin ? "Admin" : "User"}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => setProfileOpen(true)}
        >
          <User className="h-4 w-4 text-muted-foreground" />
          Profile
        </DropdownMenuItem>
        {user.isAdmin && (
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => setUsersOpen(true)}
          >
            <Users className="h-4 w-4 text-muted-foreground" />
            Users
          </DropdownMenuItem>
        )}
        {user.isAdmin && (
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onSelect={() => {
            logout();
            router.replace("/login");
          }}
        >
          <LogOut className="h-4 w-4 text-red-500" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        username={user.username}
        isAdmin={user.isAdmin}
      />

      <UsersDialog open={usersOpen} onOpenChange={setUsersOpen} />
      {user.isAdmin && (
        <SettingsMenu open={settingsOpen} onOpenChange={setSettingsOpen} />
      )}
    </DropdownMenu>
  );
}
