"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Save,
  X,
  Settings as SettingsIcon,
  Database,
  Mail,
  Server,
  Palette,
  Bell,
  Wrench,
  CheckCircle,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/settings-context";
import { useVersion } from "@/contexts/version-context";
import { config } from "@/lib/config";

import { PlexSettings } from "./settings/PlexSettings";
import { SMTPSettings } from "./settings/SMTPSettings";
import { AppriseSettings } from "./settings/AppriseSettings";
import { DatabaseManagement } from "./settings/DatabaseManagement";
import { GeneralSettings } from "./settings/GeneralSettings";
import { AdminTools } from "./settings/AdminTools";
import { SystemInfo } from "./settings/SystemInfo";
import { SettingsFormData } from "./settings/settings-utils";

interface SettingsProps {
  onBack?: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const { toast } = useToast();
  const { settings, loading, refreshSettings, updateSettings } = useSettings();
  const { versionInfo } = useVersion();

  const [formData, setFormData] = useState<SettingsFormData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [activeTab, setActiveTab] = useState("plex");

  // Initialize form data when settings load
  useEffect(() => {
    if (settings && settings.length > 0) {
      const initialData: SettingsFormData = {};
      settings.forEach((setting) => {
        initialData[setting.key] = setting.value;
      });
      setFormData(initialData);
    }
  }, [settings]);

  // Track unsaved changes
  useEffect(() => {
    if (settings && settings.length > 0) {
      const hasChanges = settings.some((setting) => {
        const currentValue = formData[setting.key];
        if (currentValue === undefined) return false;

        const normalizeValue = (value: any) => {
          if (typeof value === "boolean") return String(value);
          if (typeof value === "string") return value;
          return String(value);
        };

        return normalizeValue(currentValue) !== normalizeValue(setting.value);
      });
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, settings]);

  const handleFormDataChange = (updates: Partial<SettingsFormData>) => {
    setFormData((prev) => {
      const updated = { ...prev };
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          updated[key] = value;
        }
      });
      return updated;
    });
  };

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onBack?.();
    }
  };

  const handleConfirmLeave = () => {
    setShowUnsavedWarning(false);
    onBack?.();
  };

  const handleCancelLeave = () => {
    setShowUnsavedWarning(false);
  };

  const handleSaveAndLeave = async () => {
    setShowUnsavedWarning(false);
    await handleSave();
    onBack?.();
  };

  const handleCancel = () => {
    // Reset form data to original settings values
    if (settings && settings.length > 0) {
      const originalData: SettingsFormData = {};
      settings.forEach((setting) => {
        originalData[setting.key] = setting.value;
      });
      setFormData(originalData);
    }
    setHasUnsavedChanges(false);
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges) {
      toast({
        title: "No Changes",
        description: "There are no changes to save.",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Prepare the data to send
      const changedSettings = settings
        ?.filter((setting) => {
          const newValue = formData[setting.key];
          return newValue !== undefined && newValue !== setting.value;
        })
        .map((setting) => ({
          key: setting.key,
          value: String(formData[setting.key]),
          type: setting.type,
        }));

      if (!changedSettings || changedSettings.length === 0) {
        toast({
          title: "No Changes",
          description: "There are no changes to save.",
        });
        return;
      }

      const response = await fetch(`${config.api.baseUrl}/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changedSettings),
      });

      if (!response.ok) {
        let errorMessage = "Failed to save settings";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      updateSettings(
        changedSettings.map((setting) => ({
          key: setting.key,
          value: setting.value,
        }))
      );

      toast({
        title: "Settings Saved",
        description: `Successfully updated ${changedSettings.length} setting(s).`,
        variant: "success",
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getTabIcon = (tabId: string) => {
    switch (tabId) {
      case "plex":
        return Server;
      case "smtp":
        return Mail;
      case "system":
        return Database;
      case "guardian":
        return SettingsIcon;
      case "customization":
        return Palette;
      case "notifications":
        return Bell;
      case "admin":
        return Wrench;
      default:
        return SettingsIcon;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  if (!settings || settings.length === 0) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Settings Unavailable</CardTitle>
          <CardDescription>
            Unable to load application settings. Please try refreshing the page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const tabs = [
    {
      id: "plex",
      label: "Plex Integration",
      description:
        "Configure your Plex Media Server connection and related settings",
    },
    {
      id: "guardian",
      label: "Guardian",
      description: "Core Guardian behavior settings",
    },
    {
      id: "customization",
      label: "Customization",
      description: "UI and user experience settings",
    },
    {
      id: "smtp",
      label: "Email/SMTP",
      description: "Email notification configuration",
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Notification preferences",
    },
    {
      id: "admin",
      label: "Admin Tools",
      description: "Administrative tools and system maintenance",
    },
    {
      id: "system",
      label: "System Info",
      description: "System information and update management",
    },
  ];

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Back Button */}
      {onBack && (
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              {versionInfo && (
                <Badge variant="outline" className="text-xs font-medium">
                  v{versionInfo.version}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-base">
              Configure Guardian application settings and preferences
            </p>
          </div>
        </div>

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-center gap-3">
            <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                You have unsaved changes
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                Don't forget to save your changes to apply them.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCancel}
                disabled={isSaving}
                size="sm"
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/20"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Save Now
              </Button>
            </div>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 h-auto p-1 mb-4 justify-items-stretch">
          {tabs.map((tab) => {
            const IconComponent = getTabIcon(tab.id);
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm h-auto min-h-[2.5rem] justify-self-start w-full cursor-pointer"
              >
                <IconComponent className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-[10px] sm:text-sm leading-tight text-center">
                  {tab.label}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="space-y-6 mt-6">
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-6">
              {/* Render the appropriate component for each tab */}
              {tab.id === "plex" && (
                <PlexSettings
                  settings={settings}
                  formData={formData}
                  onFormDataChange={handleFormDataChange}
                  hasUnsavedChanges={hasUnsavedChanges}
                />
              )}

              {tab.id === "smtp" && (
                <SMTPSettings
                  settings={settings}
                  formData={formData}
                  onFormDataChange={handleFormDataChange}
                  hasUnsavedChanges={hasUnsavedChanges}
                />
              )}

              {tab.id === "database" && (
                <DatabaseManagement onSettingsRefresh={refreshSettings} />
              )}

              {tab.id === "system" && (
                <SystemInfo
                  onSettingsRefresh={refreshSettings}
                  settings={settings || []}
                />
              )}

              {(tab.id === "guardian" ||
                tab.id === "customization") && (
                <GeneralSettings
                  settings={settings}
                  formData={formData}
                  onFormDataChange={handleFormDataChange}
                  sectionId={tab.id}
                />
              )}

              {tab.id === "notifications" && (
                <div className="space-y-6">
                  <AppriseSettings
                    settings={settings}
                    formData={formData}
                    onFormDataChange={handleFormDataChange}
                    hasUnsavedChanges={hasUnsavedChanges}
                  />
                  <GeneralSettings
                    settings={settings}
                    formData={formData}
                    onFormDataChange={handleFormDataChange}
                    sectionId={tab.id}
                  />
                </div>
              )}

              {tab.id === "admin" && (
                <AdminTools onSettingsRefresh={refreshSettings} />
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* Unsaved Changes Warning Modal */}
      <Dialog
        open={showUnsavedWarning}
        onOpenChange={(open) => !open && setShowUnsavedWarning(false)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes that will be lost if you leave this page.
              What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={handleCancelLeave}
              className="order-1 sm:order-1"
            >
              Stay on Page
            </Button>
            <Button
              onClick={handleSaveAndLeave}
              disabled={isSaving}
              className="order-2 sm:order-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save & Leave
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmLeave}
              className="order-3 sm:order-3"
            >
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
