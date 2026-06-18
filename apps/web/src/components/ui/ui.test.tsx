import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Alert } from "./alert";
import { Badge } from "./badge";
import { Button } from "./button";
import { DataTable } from "./data-table";
import { EmptyState } from "./empty-state";
import { Field, SelectInput, TextInput } from "./form-controls";
import { MetricCard } from "./metric-card";
import { PageHeader } from "./page-header";
import { Panel } from "./panel";
import { Toolbar } from "./toolbar";

describe("ui foundation", () => {
  it("renders reusable status and feedback assets", () => {
    const html = renderToStaticMarkup(
      <Panel>
        <PageHeader title="Estoque" description="Conferencia rapida" actions={<Button>Registrar</Button>} />
        <Alert variant="warning">Estoque baixo</Alert>
        <Badge variant="danger">Baixo</Badge>
        <MetricCard label="Produtos" value={12} tone="warning" />
      </Panel>,
    );

    expect(html).toContain("Estoque");
    expect(html).toContain("Registrar");
    expect(html).toContain("Estoque baixo");
    expect(html).toContain("Baixo");
    expect(html).toContain("Produtos");
  });

  it("renders accessible form controls", () => {
    const html = renderToStaticMarkup(
      <Field label="Produto" help="Escolha um item" error="Obrigatorio">
        <TextInput name="product" />
      </Field>,
    );

    expect(html).toContain("Produto");
    expect(html).toContain("Escolha um item");
    expect(html).toContain("Obrigatorio");
    expect(html).toContain("name=\"product\"");
  });

  it("renders toolbar and responsive data table", () => {
    const html = renderToStaticMarkup(
      <>
        <Toolbar>
          <TextInput name="search" placeholder="Buscar" />
          <SelectInput name="status" defaultValue="ALL">
            <option value="ALL">Todos</option>
          </SelectInput>
        </Toolbar>
        <DataTable
          rows={[{ id: "1", name: "Galao", stock: 2 }]}
          rowKey={(row) => row.id}
          columns={[
            { key: "name", header: "Produto", cell: (row) => row.name },
            { key: "stock", header: "Estoque", cell: (row) => row.stock },
          ]}
          renderMobileCard={(row) => <strong>{row.name}</strong>}
          empty={<EmptyState title="Nada encontrado" description="Ajuste os filtros." />}
        />
      </>,
    );

    expect(html).toContain("Buscar");
    expect(html).toContain("Produto");
    expect(html).toContain("Galao");
    expect(html).toContain("Estoque");
  });
});
