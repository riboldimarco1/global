import { useState, useEffect, useMemo } from "react";
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
import {
  encodePermissions,
  decodePermissions,
  AVAILABLE_MENU_ITEMS,
  AVAILABLE_PARAM_TABS,
  type UserPermissions,
} from "@/lib/permissionUtils";

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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBancos, setSelectedBancos] = useState<string[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data: usuarios = [], isLoading } = useQuery<ParametroRecord[]>({
    queryKey: ["/api/parametros?tipo=claves"],
  });

  const { data: bancosData } = useQuery<ParametroRecord[]>({
    queryKey: ["/api/parametros?tipo=bancos"],
  });

  const availableBancos = useMemo(() => {
    if (!bancosData) return [];
    const seen = new Set<string>();
    return bancosData
      .filter(b => {
        if (seen.has(b.nombre)) return false;
        seen.add(b.nombre);
        return true;
      })
      .map(b => ({ id: b.nombre, label: b.nombre }));
  }, [bancosData]);

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
  const selectAllTabs = () => setSelectedTabs(AVAILABLE_PARAM_TABS.map(t => t.id));
  const selectNoneTabs = () => setSelectedTabs([]);
  const selectAllMenu = () => setSelectedMenu(AVAILABLE_MENU_ITEMS.map(m => m.id));
  const selectNoneMenu = () => setSelectedMenu([]);

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
              <div className="flex-1">
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

            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">Bancos</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={selectAllBancos} className="text-xs h-6 px-2">
                        Todos
                      </Button>
                      <Button size="sm" variant="ghost" onClick={selectNoneBancos} className="text-xs h-6 px-2">
                        Ninguno
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-40">
                    <div className="space-y-1">
                      {availableBancos.map((banco) => (
                        <div key={banco.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`banco-${banco.id}`}
                            checked={selectedBancos.includes(banco.id)}
                            onCheckedChange={() => toggleBanco(banco.id)}
                            data-testid={`checkbox-banco-${banco.id}`}
                          />
                          <label htmlFor={`banco-${banco.id}`} className="text-sm cursor-pointer">
                            {banco.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="border rounded p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">Tabs Parámetros</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={selectAllTabs} className="text-xs h-6 px-2">
                        Todos
                      </Button>
                      <Button size="sm" variant="ghost" onClick={selectNoneTabs} className="text-xs h-6 px-2">
                        Ninguno
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-40">
                    <div className="space-y-1">
                      {AVAILABLE_PARAM_TABS.map((tab) => (
                        <div key={tab.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`tab-${tab.id}`}
                            checked={selectedTabs.includes(tab.id)}
                            onCheckedChange={() => toggleTab(tab.id)}
                            data-testid={`checkbox-tab-${tab.id}`}
                          />
                          <label htmlFor={`tab-${tab.id}`} className="text-sm cursor-pointer">
                            {tab.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="border rounded p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">Menú Principal</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={selectAllMenu} className="text-xs h-6 px-2">
                        Todos
                      </Button>
                      <Button size="sm" variant="ghost" onClick={selectNoneMenu} className="text-xs h-6 px-2">
                        Ninguno
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-40">
                    <div className="space-y-1">
                      {AVAILABLE_MENU_ITEMS.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`menu-${item.id}`}
                            checked={selectedMenu.includes(item.id)}
                            onCheckedChange={() => toggleMenu(item.id)}
                            data-testid={`checkbox-menu-${item.id}`}
                          />
                          <label htmlFor={`menu-${item.id}`} className="text-sm cursor-pointer">
                            {item.label}
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
                <Button variant="destructive" size="sm" onClick={handleDelete} data-testid="button-delete-user">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-user">
                <Save className="h-4 w-4 mr-1" />
                Guardar
              </Button>
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
