import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Alert } from "./alert";
import { Badge } from "./badge";
import { Button } from "./button";
import { DataTable } from "./data-table";
import { Drawer } from "./drawer";
import { EmptyState } from "./empty-state";
import { Field, SelectInput, TextInput } from "./form-controls";
import { MetricCard } from "./metric-card";
import { PageHeader } from "./page-header";
import { Panel } from "./panel";
import { Toolbar } from "./toolbar";

function getCustomProperty(css: string, name: string) {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`).exec(css);

  if (!match?.[1]) {
    throw new Error(`Missing --${name} color token`);
  }

  return match[1];
}

function relativeLuminance(hex: string) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const normalized = channel / 255;

    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  const [red, green, blue] = channels as [number, number, number];

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);

  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

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
    const labelFor = /<label[^>]*for="([^"]+)"/.exec(html)?.[1];

    expect(html).toContain("Produto");
    expect(html).toContain("Escolha um item");
    expect(html).toContain("Obrigatorio");
    expect(html).toContain("name=\"product\"");
    expect(labelFor).toBeTruthy();
    expect(html).toContain(`id="${labelFor}"`);
    expect(html).toContain(`id="${labelFor}-help"`);
    expect(html).toContain(`id="${labelFor}-error"`);
    expect(html).toContain(`aria-describedby="${labelFor}-help ${labelFor}-error"`);
    expect(html).toContain("aria-invalid=\"true\"");
  });

  it("keeps field help and error text out of the label name", () => {
    const html = renderToStaticMarkup(
      <Field
        error="Obrigatorio"
        errorId="product-field-error"
        help="Escolha um item"
        helpId="product-field-help"
        htmlFor="product-field"
        label="Produto"
      >
        <TextInput
          aria-describedby="product-field-help product-field-error"
          aria-invalid
          id="product-field"
          name="product"
        />
      </Field>,
    );

    expect(html).toContain("<label");
    expect(html).toContain("for=\"product-field\"");
    expect(html).toContain("id=\"product-field-help\"");
    expect(html).toContain("id=\"product-field-error\"");
    expect(html).toContain("aria-describedby=\"product-field-help product-field-error\"");
    expect(html).toContain("aria-invalid=\"true\"");
    expect(html).not.toContain("<label class=\"block space-y-2\"");
  });

  it("keeps subtle text color accessible on white surfaces", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const subtle = getCustomProperty(css, "subtle");

    expect(contrastRatio(subtle, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("defines dark theme tokens for the app surface", () => {
    const css = readFileSync("src/app/globals.css", "utf8");

    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain("--card:");
    expect(css).toContain("--hero-surface:");
    expect(css).toContain("color-scheme: dark");
  });

  it("uses tokenized panel surfaces by default", () => {
    const html = renderToStaticMarkup(<Panel>Conteudo</Panel>);

    expect(html).toContain("bg-[var(--card)]");
    expect(html).not.toContain("bg-white");
  });

  it("uses tone-specific metric badge labels", () => {
    const html = renderToStaticMarkup(<MetricCard label="Estoque baixo" value={3} tone="danger" />);

    expect(html).toContain("Crítico");
    expect(html).not.toContain(">OK<");
  });

  it("does not keep the default white background when a panel receives a custom background", () => {
    const html = renderToStaticMarkup(<Panel className="bg-[var(--foreground)] text-white">Hero</Panel>);

    expect(html).toContain("bg-[var(--foreground)]");
    expect(html).not.toContain("bg-white");
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

  it("renders a reusable lateral drawer with dialog semantics", () => {
    const html = renderToStaticMarkup(
      <Drawer open title="Registrar entrada" description="Atualize o estoque sem perder a tabela de vista." onClose={() => undefined}>
        <p>Conteudo</p>
      </Drawer>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Registrar entrada");
    expect(html).toContain("Atualize o estoque sem perder a tabela de vista.");
    expect(html).toContain("Fechar painel");
    expect(html).toContain("Conteudo");
  });

  it("renders variable toolbars without fixed desktop grid tracks", () => {
    const html = renderToStaticMarkup(
      <Toolbar>
        <TextInput name="search" placeholder="Buscar" />
        <SelectInput name="status" defaultValue="ALL">
          <option value="ALL">Todos</option>
        </SelectInput>
        <SelectInput name="stock" defaultValue="LOW">
          <option value="LOW">Estoque baixo</option>
        </SelectInput>
        <TextInput name="seller" placeholder="Vendedor" />
      </Toolbar>,
    );

    expect(html).toContain("flex-wrap");
    expect(html).not.toContain("md:grid-cols-[minmax(220px,1fr)_auto_auto]");
  });

  it("marks table headers as columns and preserves default cell spacing with custom classes", () => {
    const html = renderToStaticMarkup(
      <DataTable
        rows={[{ id: "1", name: "Galao", stock: 2 }]}
        rowKey={(row) => row.id}
        columns={[
          { key: "name", header: "Produto", cell: (row) => row.name },
          { key: "stock", header: "Estoque", cell: (row) => row.stock, className: "text-right" },
        ]}
        renderMobileCard={(row) => <strong>{row.name}</strong>}
        empty={<EmptyState title="Nada encontrado" description="Ajuste os filtros." />}
      />,
    );

    expect(html).toContain("scope=\"col\"");
    expect(html).toContain("class=\"px-4 py-3 align-middle text-right\"");
  });
});
