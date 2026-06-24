"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type DriverResponse, type UserRole } from "shared";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, TextInput } from "@/components/ui/form-controls";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { Toolbar } from "@/components/ui/toolbar";

type DriversUiProps = {
  userRole: UserRole;
  drivers: DriverResponse[];
  summary: { total: number; active: number };
};

type DriverFormValues = {
  name: string;
  phone: string;
};

function getDriverStatusLabel(isActive: boolean) {
  return isActive ? "Ativo" : "Inativo";
}

function driverFormToPayload(formData: FormData): DriverFormValues {
  return {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
  };
}

export function DriversUi({ userRole, drivers, summary }: DriversUiProps) {
  const router = useRouter();
  const [editingDriver, setEditingDriver] = useState<DriverResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const isAdmin = userRole === "ADMIN";

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length === 0) {
      return drivers;
    }
    return drivers.filter((driver) => {
      const name = driver.name.toLowerCase();
      const phone = (driver.phone ?? "").toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
  }, [drivers, search]);

  function closeForm() {
    setFormOpen(false);
    setEditingDriver(null);
  }

  function openCreateDrawer() {
    setEditingDriver(null);
    setFormOpen(true);
  }

  function refreshDrivers() {
    startTransition(() => router.refresh());
  }

  async function saveDriver(formData: FormData) {
    if (!isAdmin || isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const payload = driverFormToPayload(formData);
      const isEditing = Boolean(editingDriver);
      const url = isEditing ? `/api/drivers/${editingDriver?.id}` : "/api/drivers";
      const body = isEditing
        ? {
            name: payload.name,
            phone: payload.phone.length > 0 ? payload.phone : null,
          }
        : {
            name: payload.name,
            phone: payload.phone.length > 0 ? payload.phone : null,
          };

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setError("Confira os dados do entregador.");
        return;
      }

      closeForm();
      refreshDrivers();
    } catch {
      setError("Confira os dados do entregador.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleDriver(driver: DriverResponse) {
    if (!isAdmin) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/drivers/${driver.id}/toggle-active`, {
      method: "PATCH",
    });

    if (!response.ok) {
      setError("Voce nao tem permissao para alterar entregadores.");
      return;
    }

    refreshDrivers();
  }

  function editDriver(driver: DriverResponse) {
    setEditingDriver(driver);
    setFormOpen(true);
  }

  const columns: Array<DataTableColumn<DriverResponse>> = [
    {
      key: "name",
      header: "Nome",
      cell: (driver) => <span className="font-medium text-[var(--foreground)]">{driver.name}</span>,
    },
    {
      key: "phone",
      header: "Telefone",
      className: "whitespace-nowrap",
      cell: (driver) => (
        <span className="text-[var(--foreground)]">{driver.phone ?? "Sem telefone"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (driver) => (
        <Badge variant={driver.isActive ? "success" : "neutral"}>
          {getDriverStatusLabel(driver.isActive)}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      className: "whitespace-nowrap",
      cell: (driver) => (
        <DriverRowActions
          isAdmin={isAdmin}
          driver={driver}
          onEdit={editDriver}
          onToggle={toggleDriver}
        />
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Entregadores"
        eyebrow="Cadastro"
        description="Cadastre entregadores e controle quem esta disponivel para entrega."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard label="Total" value={summary.total} detail="Entregadores cadastrados" />
        <MetricCard label="Ativos" value={summary.active} detail="Disponiveis para entrega" />
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {isAdmin ? (
        <Drawer
          badge={<Badge variant={editingDriver ? "info" : "success"}>{editingDriver ? "Edicao" : "Cadastro"}</Badge>}
          description={editingDriver ? "Atualize os dados do entregador." : "Cadastre o entregador com nome e telefone."}
          onClose={closeForm}
          open={formOpen}
          title={editingDriver ? "Editar entregador" : "Novo entregador"}
        >
          <form action={saveDriver} className="grid gap-4">
            <Field label="Nome">
              <TextInput defaultValue={editingDriver?.name ?? ""} name="name" required />
            </Field>

            <Field label="Telefone">
              <TextInput
                defaultValue={editingDriver?.phone ?? ""}
                inputMode="tel"
                name="phone"
                placeholder="(11) 99999-9999"
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button disabled={isSaving || isPending} type="submit">
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
              <Button disabled={isSaving || isPending} variant="secondary" onClick={closeForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </Drawer>
      ) : null}

      <Toolbar
        actions={
          isAdmin ? (
            <Button onClick={openCreateDrawer}>
              Novo entregador
            </Button>
          ) : null
        }
      >
        <TextInput
          aria-label="Buscar entregador"
          placeholder="Buscar entregador"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Toolbar>

      <DataTable
        rows={rows}
        rowKey={(driver) => driver.id}
        columns={columns}
        empty={
          <EmptyState
            title={drivers.length === 0 ? "Nenhum entregador cadastrado" : "Nenhum entregador encontrado"}
            description={
              drivers.length === 0
                ? "Cadastre entregadores para registrar entregas."
                : "Ajuste a busca para encontrar o entregador."
            }
          />
        }
        renderMobileCard={(driver) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-medium text-[var(--foreground)]">{driver.name}</h2>
                <p className="text-xs text-[var(--muted)]">{driver.phone ?? "Sem telefone"}</p>
              </div>
              <Badge variant={driver.isActive ? "success" : "neutral"}>
                {getDriverStatusLabel(driver.isActive)}
              </Badge>
            </div>
            <DriverRowActions
              isAdmin={isAdmin}
              driver={driver}
              onEdit={editDriver}
              onToggle={toggleDriver}
            />
          </div>
        )}
      />
    </section>
  );
}

function DriverRowActions({
  isAdmin,
  driver,
  onEdit,
  onToggle,
}: {
  isAdmin: boolean;
  driver: DriverResponse;
  onEdit: (driver: DriverResponse) => void;
  onToggle: (driver: DriverResponse) => void | Promise<void>;
}) {
  if (!isAdmin) {
    return <span className="text-xs text-[var(--muted)]">Somente consulta</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button aria-label={`Editar ${driver.name}`} variant="secondary" onClick={() => onEdit(driver)}>
        Editar
      </Button>
      <Button
        aria-label={`${driver.isActive ? "Inativar" : "Ativar"} ${driver.name}`}
        variant={driver.isActive ? "danger" : "secondary"}
        onClick={() => void onToggle(driver)}
      >
        {driver.isActive ? "Inativar" : "Ativar"}
      </Button>
    </div>
  );
}