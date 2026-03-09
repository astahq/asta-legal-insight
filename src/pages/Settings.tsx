import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile.full_name]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const { error } = await updateProfile({ full_name: fullName });
      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await updateProfile({ avatar_url: publicUrl });
      if (updateError) throw updateError;

      toast.success("Avatar updated successfully");
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const initials = (fullName || user?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const email = user?.email || "";

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-foreground/90 tracking-tight">Settings</h1>
          <p className="text-[13px] text-muted-foreground/60 mt-1">Manage your account preferences</p>
        </div>

        {/* Profile */}
        <section className="pb-8 border-b border-border/30">
          <h2 className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-5">Profile</h2>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar className="h-16 w-16">
                {profile.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={fullName} />
                )}
                <AvatarFallback className="bg-muted text-muted-foreground text-lg font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar}
                className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-foreground/80 transition-colors disabled:opacity-50"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground/80">Profile Photo</p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">Click to upload</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-[12px] text-foreground/65">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="h-9 text-[13px] bg-muted/20 border-border/30 focus-visible:border-border/60"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] text-foreground/65">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="h-9 text-[13px] bg-muted/30 border-border/20 text-foreground/50"
              />
              <p className="text-[11px] text-muted-foreground/45">Linked to your login account</p>
            </div>

            <Button
              onClick={handleSaveChanges}
              disabled={isSaving || profileLoading}
              size="sm"
              className="h-8 px-4 text-[12px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </section>

        {/* Notifications */}
        <section className="py-8 border-b border-border/30">
          <h2 className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-5">Notifications</h2>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-foreground/80">Email notifications</p>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">Receive updates about your reports</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-foreground/80">Marketing emails</p>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">Tips and product updates</p>
              </div>
              <Switch />
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="py-8 border-b border-border/30">
          <h2 className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-5">Security</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-foreground/80">Password</p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">Last changed 3 months ago</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 px-3 text-[12px] border-border/30 text-foreground/70">
              Change Password
            </Button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="py-8">
          <h2 className="text-[10px] font-medium text-destructive/60 uppercase tracking-wider mb-5">Danger Zone</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-foreground/80">Delete account</p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">Permanently delete your account and all data</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 px-3 text-[12px] border-destructive/30 text-destructive/70 hover:bg-destructive/5 hover:text-destructive">
              Delete Account
            </Button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
