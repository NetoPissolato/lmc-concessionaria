/**
 * useFIPE - autocomplete de marcas e modelos usando lista estática da FIPE.
 * Funciona 100% offline, sem dependência de APIs externas.
 */

import { useState } from "react";
import { MARCAS_CARROS, MARCAS_MOTOS, MODELOS_CARROS, MODELOS_MOTOS } from "@/lib/fipeData";

export function useFIPE(tipo: "carros" | "motos" | "caminhoes" = "carros") {
  const marcas      = tipo === "motos" ? MARCAS_MOTOS : MARCAS_CARROS;
  const modelosMap  = tipo === "motos" ? MODELOS_MOTOS : MODELOS_CARROS;

  const [modelos,    setModelos]    = useState<string[]>([]);
  const [modeloLoad, setModeloLoad] = useState(false);

  const loadModelos = (nomeMarca: string) => {
    const lista = modelosMap[nomeMarca] ?? [];
    setModelos(lista);
  };

  const clearModelos = () => setModelos([]);

  return {
    marcas,
    modelos,
    marcaLoad:  false,   // estático, sem loading
    modeloLoad,
    loadModelos,
    clearModelos,
  };
}
