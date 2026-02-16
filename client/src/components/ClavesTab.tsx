import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Save, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { parametrosTabs } from "@/config/parametrosTabs";
import { menuModules } from "@/config/menuModules";
import {
  encodePermissions,
  decodePermissions,
  type UserPermissions,
} from "@/lib/permissionUtils";
import { useStyleMode } from "@/contexts/StyleModeContext";

const tabColorClassesMap: Record<string, string> = {
  red: "text-red-700 dark:text-red-400 font-semibold",
  orange: "text-orange-700 dark:text-orange-400 font-semibold",
  yellow: "text-yellow-700 dark:text-yellow-300 font-semibold",
  green: "text-green-700 dark:text-green-400 font-semibold",
  teal: "text-teal-700 dark:text-teal-400 font-semibold",
  cyan: "text-cyan-700 dark:text-cyan-400 font-semibold",
  blue: "text-blue-700 dark:text-blue-400 font-semibold",
  indigo: "text-indigo-700 dark:text-indigo-400 font-semibold",
  violet: "text-violet-700 dark:text-violet-400 font-semibold",
  purple: "text-purple-700 dark:text-purple-400 font-semibold",
  pink: "text-pink-700 dark:text-pink-400 font-semibold",
  rose: "text-rose-700 dark:text-rose-400 font-semibold",
  slate: "text-slate-700 dark:text-slate-300 font-semibold",
};


interface ClavesTabProps {
  fontSize?: number;
}

interface ParametroRecord {
  id: string;
  tipo: string;
  nombre: string;
  descripcion: string;
  habilitado?: boolean;
}

export default function ClavesTab({ fontSize = 12 }: ClavesTabProps) {
  const { toast } = useToast();
  const { showPop } = useMyPop();
  const { rainbowEnabled } = useStyleMode();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBancos, setSelectedBancos] = useState<string[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<string[]>([]);
  const [selectedUnidades, setSelectedUnidades] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data: usuarios = [], isLoading } = useQuery<ParametroRecord[]>({
    queryKey: ["/api/parametros?tipo=claves"],
  });

  const { data: bancosData } = useQuery<ParametroRecord[]>({
    queryKey: ["/api/parametros?tipo=bancos&habilitado=si"],
  });

  const { data: unidadesData } = useQuery<ParametroRecord[]>({
    queryKey: ["/api/parametros?tipo=unidades"],
  });

  const rainbowColors = ["red", "orange", "yellow", "green", "teal", "cyan", "blue", "indigo", "violet", "purple", "pink", "rose"];

  const availableBancos = useMemo(() => {
    if (!bancosData) return [];
    const seen = new Set<string>();
    return bancosData
      .filter(b => {
        if (seen.has(b.nombre)) return false;
        seen.add(b.nombre);
        return true;
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((b, idx) => ({ id: b.nombre, label: b.nombre, color: rainbowColors[idx % rainbowColors.length] }));
  }, [bancosData]);

  const availableTabs = useMemo(() => {
    return parametrosTabs.map(tab => ({
      id: tab.id,
      label: tab.label,
      color: tab.color || "gray",
    }));
  }, []);

  const availableMenu = useMemo(() => {
    return menuModules.map(mod => ({
      id: mod.id,
      label: mod.label,
      color: mod.color,
    }));
  }, []);

  const availableUnidades = useMemo(() => {
    if (!unidadesData) return [];
    const seen = new Set<string>();
    return unidadesData
      .filter(u => {
        if (seen.has(u.nombre)) return false;
        seen.add(u.nombre);
        return true;
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((u, idx) => ({ id: u.nombre, label: u.nombre, color: rainbowColors[idx % rainbowColors.length] }));
  }, [unidadesData]);

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: string; nombre: string; descripcion: string }) => {
      if (data.id) {
        return apiRequest("PUT", `/api/parametros/${data.id}`, {
          nombre: data.nombre,
          descripcion: data.descripcion,
          tipo: "claves",
          habilitado: true,
        });
      } else {
        return apiRequest("POST", "/api/parametros", {
          nombre: data.nombre,
          descripcion: data.descripcion,
          tipo: "claves",
          habilitado: true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parametros?tipo=claves"] });
      toast({ title: "Usuario guardado correctamente" });
      clearForm();
    },
    onError: () => {
      showPop({ title: "Error", message: "Error al guardar usuario" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/parametros/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parametros?tipo=claves"] });
      toast({ title: "Usuario eliminado" });
      clearForm();
    },
    onError: () => {
      showPop({ title: "Error", message: "Error al eliminar usuario" });
    },
  });

  const clearForm = () => {
    setSelectedUserId(null);
    setUsername("");
    setPassword("");
    setSelectedBancos([]);
    setSelectedTabs([]);
    setSelectedMenu([]);
    setSelectedUnidades([]);
    setIsCreating(false);
  };

  const handleSelectUser = (user: ParametroRecord) => {
    setSelectedUserId(user.id);
    setUsername(user.nombre);
    const perms = decodePermissions(user.descripcion);
    setPassword(perms.password);
    setSelectedBancos(perms.bancos);
    setSelectedTabs(perms.tabs);
    setSelectedMenu(perms.menu);
    setSelectedUnidades(perms.unidades);
    setIsCreating(false);
  };

  const handleNewUser = () => {
    clearForm();
    setIsCreating(true);
  };

  const handleSave = () => {
    if (!username.trim()) {
      showPop({ title: "Advertencia", message: "Ingrese un nombre de usuario" });
      return;
    }
    if (!password.trim()) {
      showPop({ title: "Advertencia", message: "Ingrese una contraseña" });
      return;
    }

    const perms: UserPermissions = {
      password,
      bancos: selectedBancos,
      tabs: selectedTabs,
      menu: selectedMenu,
      unidades: selectedUnidades,
    };

    saveMutation.mutate({
      id: selectedUserId || undefined,
      nombre: username,
      descripcion: encodePermissions(perms),
    });
  };

  const handleDelete = () => {
    if (!selectedUserId) return;
    showPop({
      title: "Eliminar Usuario",
      message: `¿Está seguro de eliminar el usuario "${username}"?`,
      confirmText: "Eliminar",
      onConfirm: () => {
        deleteMutation.mutate(selectedUserId);
      }
    });
  };

  const toggleBanco = (banco: string) => {
    setSelectedBancos(prev =>
      prev.includes(banco) ? prev.filter(b => b !== banco) : [...prev, banco]
    );
  };

  const toggleTab = (tab: string) => {
    setSelectedTabs(prev =>
      prev.includes(tab) ? prev.filter(t => t !== tab) : [...prev, tab]
    );
  };

  const toggleMenu = (menu: string) => {
    setSelectedMenu(prev =>
      prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]
    );
  };

  const selectAllBancos = () => setSelectedBancos(availableBancos.map(b => b.id));
  const selectNoneBancos = () => setSelectedBancos([]);
  const selectAllTabs = () => setSelectedTabs(availableTabs.map(t => t.id));
  const selectNoneTabs = () => setSelectedTabs([]);
  const selectAllMenu = () => setSelectedMenu(availableMenu.map(m => m.id));
  const selectNoneMenu = () => setSelectedMenu([]);
  const selectAllUnidades = () => setSelectedUnidades(availableUnidades.map(u => u.id));
  const selectNoneUnidades = () => setSelectedUnidades([]);

  const toggleUnidad = (unidad: string) => {
    setSelectedUnidades(prev =>
      prev.includes(unidad) ? prev.filter(u => u !== unidad) : [...prev, unidad]
    );
  };

  return (
    <div className="flex h-full gap-2 p-2" style={{ fontSize }}>
      <div className="w-48 flex flex-col border-r pr-2">
        <div className="flex flex-col gap-2 mb-2">
          <span className="font-semibold text-sm">Usuarios</span>
          <MyButtonStyle color="green" onClick={handleNewUser} data-testid="button-new-user">
            Agregar usuario
          </MyButtonStyle>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {usuarios.map((user) => (
              <div
                key={user.id}
                className={`p-2 rounded cursor-pointer hover-elevate ${
                  selectedUserId === user.id ? "bg-primary/20" : ""
                }`}
                onClick={() => handleSelectUser(user)}
                data-testid={`user-item-${user.id}`}
              >
                {user.nombre}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {(selectedUserId || isCreating) ? (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-1/4">
                <Label>Usuario</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nombre de usuario"
                  data-testid="input-username"
                />
              </div>
              <div className="flex-1">
                <Label>Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-4 gap-4 h-full">
                <div className="border rounded p-2 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">Bancos</span>
                    <div className="flex gap-1">
                      <MyButtonStyle color="green" onClick={selectAllBancos} className="text-xs h-6 px-2" data-testid="button-select-all-bancos">
                        Todos
                      </MyButtonStyle>
                      <MyButtonStyle color="gray" onClick={selectNoneBancos} className="text-xs h-6 px-2" data-testid="button-select-none-bancos">
                        Ninguno
                      </MyButtonStyle>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-1">
                      {availableBancos.map((banco) => (
                        <div key={banco.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`banco-${banco.id}`}
                            checked={selectedBancos.includes(banco.id)}
                            onCheckedChange={() => toggleBanco(banco.id)}
                            data-testid={`checkbox-banco-${banco.id}`}
                          />
                          <label htmlFor={`banco-${banco.id}`} className={`text-sm cursor-pointer font-medium ${tabColorClassesMap[rainbowEnabled ? banco.color : "slate"] || ""}`}>
                            {banco.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="border rounded p-2 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">Tabs Parámetros</span>
                    <div className="flex gap-1">
                      <MyButtonStyle color="green" onClick={selectAllTabs} className="text-xs h-6 px-2" data-testid="button-select-all-tabs">
                        Todos
                      </MyButtonStyle>
                      <MyButtonStyle color="gray" onClick={selectNoneTabs} className="text-xs h-6 px-2" data-testid="button-select-none-tabs">
                        Ninguno
                      </MyButtonStyle>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-1">
                      {availableTabs.map((tab) => (
                        <div key={tab.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`tab-${tab.id}`}
                            checked={selectedTabs.includes(tab.id)}
                            onCheckedChange={() => toggleTab(tab.id)}
                            data-testid={`checkbox-tab-${tab.id}`}
                          />
                          <label
                            htmlFor={`tab-${tab.id}`}
                            className={`text-sm cursor-pointer font-medium ${tabColorClassesMap[rainbowEnabled ? tab.color : "slate"] || ""}`}
                          >
                            {tab.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="border rounded p-2 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">Menú Principal</span>
                    <div className="flex gap-1">
                      <MyButtonStyle color="green" onClick={selectAllMenu} className="text-xs h-6 px-2" data-testid="button-select-all-menu">
                        Todos
                      </MyButtonStyle>
                      <MyButtonStyle color="gray" onClick={selectNoneMenu} className="text-xs h-6 px-2" data-testid="button-select-none-menu">
                        Ninguno
                      </MyButtonStyle>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-1">
                      {availableMenu.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`menu-${item.id}`}
                            checked={selectedMenu.includes(item.id)}
                            onCheckedChange={() => toggleMenu(item.id)}
                            data-testid={`checkbox-menu-${item.id}`}
                          />
                          <label
                            htmlFor={`menu-${item.id}`}
                            className={`text-sm cursor-pointer font-medium ${tabColorClassesMap[rainbowEnabled ? item.color : "slate"] || ""}`}
                          >
                            {item.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="border rounded p-2 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">Unidades</span>
                    <div className="flex gap-1">
                      <MyButtonStyle color="green" onClick={selectAllUnidades} className="text-xs h-6 px-2" data-testid="button-select-all-unidades">
                        Todos
                      </MyButtonStyle>
                      <MyButtonStyle color="gray" onClick={selectNoneUnidades} className="text-xs h-6 px-2" data-testid="button-select-none-unidades">
                        Ninguno
                      </MyButtonStyle>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-1">
                      {availableUnidades.map((unidad) => (
                        <div key={unidad.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`unidad-${unidad.id}`}
                            checked={selectedUnidades.includes(unidad.id)}
                            onCheckedChange={() => toggleUnidad(unidad.id)}
                            data-testid={`checkbox-unidad-${unidad.id}`}
                          />
                          <label
                            htmlFor={`unidad-${unidad.id}`}
                            className={`text-sm cursor-pointer font-medium ${tabColorClassesMap[rainbowEnabled ? unidad.color : "slate"] || ""}`}
                          >
                            {unidad.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>

            <Separator className="my-2" />
            <div className="flex justify-end gap-2">
              {selectedUserId && (
                <MyButtonStyle color="red" onClick={handleDelete} data-testid="button-delete-user">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </MyButtonStyle>
              )}
              <MyButtonStyle color="green" onClick={handleSave} loading={saveMutation.isPending} data-testid="button-save-user">
                <Save className="h-4 w-4 mr-1" />
                Guardar
              </MyButtonStyle>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Seleccione un usuario o cree uno nuevo
          </div>
        )}
      </div>
    </div>
  );
}
