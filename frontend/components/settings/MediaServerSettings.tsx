"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Server,
  AlertTriangle,
} from "lucide-react";
import { config } from "@/lib/config";
import { AppSetting } from "@/types";
import {
  SettingsFormData,
  ConnectionStatus,
} from "./settings-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MediaServerType = 'plex' | 'jellyfin' | 'emby';

interface MediaServerSettingsProps {
  settings: AppSetting[];
  formData: SettingsFormData;
  onFormDataChange: (updates: Partial<SettingsFormData>) => void;
  hasUnsavedChanges?: boolean;
}

interface ServerConfig {
  serverType: MediaServerType;
  serverIp: string;
  serverPort: string;
  token: string;
  useSSL: boolean;
  customUrl?: string;
}

export function MediaServerSettings({
  settings,
  formData,
  onFormDataChange,
  hasUnsavedChanges = false,
}: MediaServerSettingsProps) {
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [serverType, setServerType] = useState<MediaServerType>('plex');
  const [serverInfo, setServerInfo] = useState<ServerConfig | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchServerInfo();
  }, []);

  const fetchServerInfo = async () => {
    try {
      const response = await fetch(`${config.api.baseUrl}/media-server/info`);
      if (response.ok) {
        const info = await response.json();
        setServerType(info.serverType);
        setServerInfo(info.config);
      }
    } catch (error) {
      console.error('Failed to fetch server info:', error);
    }
  };

  const getServerTypeDisplay = (type: MediaServerType) => {
    switch (type) {
      case 'plex':
        return 'Plex Media Server';
      case 'jellyfin':
        return 'Jellyfin Server';
      case 'emby':
        return 'Emby Server';
      default:
        return 'Unknown Server';
    }
  };

  const getServerSettingKeys = (type: MediaServerType) => {
    switch (type) {
      case 'plex':
        return {
          ip: 'PLEX_SERVER_IP',
          port: 'PLEX_SERVER_PORT',
          token: 'PLEX_TOKEN',
          customUrl: 'CUSTOM_PLEX_URL',
        };
      case 'jellyfin':
        return {
          ip: 'JELLYFIN_SERVER_IP',
          port: 'JELLYFIN_SERVER_PORT',
          token: 'JELLYFIN_API_KEY',
          customUrl: 'CUSTOM_JELLYFIN_URL',
        };
      default:
        return {
          ip: '',
          port: '',
          token: '',
          customUrl: '',
        };
    }
  };

  const getTokenLabel = (type: MediaServerType) => {
    switch (type) {
      case 'plex':
        return 'Plex Token';
      case 'jellyfin':
        return 'API Key';
      case 'emby':
        return 'API Key';
      default:
        return 'Token';
    }
  };

  const getTokenPlaceholder = (type: MediaServerType) => {
    switch (type) {
      case 'plex':
        return 'Your Plex authentication token';
      case 'jellyfin':
        return 'Your Jellyfin API key';
      case 'emby':
        return 'Your Emby API key';
      default:
        return 'Authentication token';
    }
  };

  const settingKeys = getServerSettingKeys(serverType);

  const testConnection = async () => {
    if (hasUnsavedChanges) {
      toast({
        title: "Save Changes First",
        description: "Please save your settings before testing the connection.",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus(null);

    try {
      const response = await fetch(`${config.api.baseUrl}/media-server/test-connection`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setConnectionStatus({
          success: true,
          message: result.message,
        });
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${getServerTypeDisplay(serverType)}`,
        });
      } else {
        setConnectionStatus({
          success: false,
          message: result.suggestion ? `${result.message} - ${result.suggestion}` : result.message,
        });
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setConnectionStatus({
        success: false,
        message: errorMessage,
      });
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const renderConnectionStatus = () => {
    if (!connectionStatus) return null;

    const { success, message } = connectionStatus;

    return (
      <div className={`flex items-start gap-2 p-3 rounded-md border ${
        success 
          ? "bg-green-50 border-green-200 text-green-800" 
          : "bg-red-50 border-red-200 text-red-800"
      }`}>
        {success ? (
          <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium">{message}</p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          <CardTitle>Media Server Settings</CardTitle>
        </div>
        <CardDescription>
          Configure your {getServerTypeDisplay(serverType)} connection settings.
          Currently using: <strong>{getServerTypeDisplay(serverType)}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Server Type Selection */}
        <div className="space-y-2">
          <Label>Media Server Type</Label>
          <Select 
            value={serverType} 
            onValueChange={(value: MediaServerType) => {
              setServerType(value);
              onFormDataChange({
                MEDIA_SERVER_TYPE: value,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plex">Plex Media Server</SelectItem>
              <SelectItem value="jellyfin">Jellyfin Server</SelectItem>
              <SelectItem value="emby">Emby Server (Coming Soon)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Choose your media server platform. Can also be configured via MEDIA_SERVER_TYPE environment variable.
          </p>
        </div>

        {/* Server IP */}
        <div className="space-y-2">
          <Label htmlFor={`server-ip-${serverType}`}>Server IP Address</Label>
          <Input
            id={`server-ip-${serverType}`}
            type="text"
            placeholder="192.168.1.100"
            value={String(formData[settingKeys.ip] ?? settings.find(s => s.key === settingKeys.ip)?.value ?? "")}
            onChange={(e) =>
              onFormDataChange({
                [settingKeys.ip]: e.target.value,
              })
            }
          />
        </div>

        {/* Server Port */}
        <div className="space-y-2">
          <Label htmlFor={`server-port-${serverType}`}>Server Port</Label>
          <Input
            id={`server-port-${serverType}`}
            type="text"
            placeholder={serverType === 'plex' ? '32400' : '8096'}
            value={String(formData[settingKeys.port] ?? settings.find(s => s.key === settingKeys.port)?.value ?? "")}
            onChange={(e) =>
              onFormDataChange({
                [settingKeys.port]: e.target.value,
              })
            }
          />
        </div>

        {/* Token/API Key */}
        <div className="space-y-2">
          <Label htmlFor={`server-token-${serverType}`}>{getTokenLabel(serverType)}</Label>
          <Input
            id={`server-token-${serverType}`}
            type="password"
            placeholder={getTokenPlaceholder(serverType)}
            value={String(formData[settingKeys.token] ?? settings.find(s => s.key === settingKeys.token)?.value ?? "")}
            onChange={(e) =>
              onFormDataChange({
                [settingKeys.token]: e.target.value,
              })
            }
          />
        </div>

        {/* SSL Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Use HTTPS/SSL</Label>
              <p className="text-sm text-muted-foreground">
                Use HTTPS instead of HTTP for server connections
              </p>
            </div>
            <Switch
              checked={formData["USE_SSL"] === "true" || (formData["USE_SSL"] === undefined && settings.find(s => s.key === "USE_SSL")?.value === "true")}
              onCheckedChange={(checked) =>
                onFormDataChange({
                  USE_SSL: checked.toString(),
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ignore SSL Certificate Errors</Label>
              <p className="text-sm text-muted-foreground">
                Skip SSL certificate validation (not recommended for production)
              </p>
            </div>
            <Switch
              checked={formData["IGNORE_CERT_ERRORS"] === "true" || (formData["IGNORE_CERT_ERRORS"] === undefined && settings.find(s => s.key === "IGNORE_CERT_ERRORS")?.value === "true")}
              onCheckedChange={(checked) =>
                onFormDataChange({
                  IGNORE_CERT_ERRORS: checked.toString(),
                })
              }
            />
          </div>
        </div>

        {/* Custom URL */}
        <div className="space-y-2">
          <Label htmlFor={`custom-url-${serverType}`}>
            Custom {getServerTypeDisplay(serverType)} URL (Optional)
          </Label>
          <Input
            id={`custom-url-${serverType}`}
            type="url"
            placeholder={`https://your${serverType}server.example.com`}
            value={String(formData[settingKeys.customUrl] ?? settings.find(s => s.key === settingKeys.customUrl)?.value ?? "")}
            onChange={(e) =>
              onFormDataChange({
                [settingKeys.customUrl]: e.target.value,
              })
            }
          />
          <p className="text-sm text-muted-foreground">
            Override the automatically generated URL for external access
          </p>
        </div>

        {/* Connection Test */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Test Connection</h4>
              <p className="text-sm text-muted-foreground">
                Verify that Guardian can connect to your media server
              </p>
            </div>
            <Button
              onClick={testConnection}
              disabled={testingConnection || hasUnsavedChanges}
              variant="outline"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
          </div>

          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">
                Save your settings before testing the connection.
              </p>
            </div>
          )}

          {renderConnectionStatus()}
        </div>
      </CardContent>
    </Card>
  );
}