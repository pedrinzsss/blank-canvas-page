import { createFileRoute } from "@tanstack/react-router";
import { ProdutosPage } from "./produtos";

export const Route = createFileRoute("/_authenticated/catalogo")({
  component: ProdutosPage,
});
