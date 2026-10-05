/**
 * Mensagem legível a partir de um erro da API.
 *
 * O backend responde `detail` de dois jeitos: texto ("Placa já cadastrada") ou, quando a
 * validação recusa o formulário, uma LISTA de erros por campo. As telas faziam
 * `toast.error(detail)` e, no segundo caso, aparecia "[object Object]".
 */
type ErroCampo = { msg?: string; loc?: (string | number)[] };

const NOMES_CAMPOS: Record<string, string> = {
  nome: "Nome", email: "E-mail", senha: "Senha", telefone: "Telefone", whatsapp: "WhatsApp",
  cpf_cnpj: "CPF/CNPJ", cep: "CEP", endereco: "Endereço", numero: "Número", complemento: "Complemento",
  bairro: "Bairro", cidade: "Cidade", estado: "UF", observacoes: "Observações", cargo: "Cargo",
  usuario: "Usuário", marca: "Marca", modelo: "Modelo", versao: "Versão", ano: "Ano", cor: "Cor",
  placa: "Placa", chassi: "Chassi", renavam: "Renavam", quilometragem: "Quilometragem",
  cilindrada: "Cilindrada", portas: "Portas", valor_compra: "Valor de compra", valor_multas: "Multas",
  valor_anunciado: "Preço anunciado", valor_minimo: "Preço mínimo", valor_venda: "Valor da venda",
  valor: "Valor", descricao: "Descrição", comissao_percentual: "Comissão", data_venda: "Data da venda",
  data_compra: "Data da compra", parcelas: "Parcelas", slogan: "Slogan", nome_loja: "Nome da loja",
  hero_titulo: "Título do site", hero_subtitulo: "Subtítulo do site", horario: "Horário",
};

function textoDoCampo(e: ErroCampo): string {
  const msg = (e.msg ?? "").replace(/^Value error, /, "");
  const campo = [...(e.loc ?? [])].reverse().find((p) => typeof p === "string" && p !== "body") as string | undefined;
  const nome = campo ? NOMES_CAMPOS[campo] ?? campo : "";
  // Mensagens do Pydantic em inglês para os limites mais comuns
  const traduzida = msg
    .replace(/String should have at most (\d+) characters?/, "no máximo $1 caracteres")
    .replace(/String should have at least (\d+) characters?/, "no mínimo $1 caracteres")
    .replace(/Input should be greater than or equal to ([\d.]+)/, "deve ser maior ou igual a $1")
    .replace(/Input should be greater than ([\d.]+)/, "deve ser maior que $1")
    .replace(/Input should be less than or equal to ([\d.]+)/, "deve ser no máximo $1")
    .replace(/Decimal input should have no more than (\d+) digits? in total/, "valor alto demais")
    .replace(/Field required/, "obrigatório")
    .replace(/Input should be a valid (number|integer|decimal).*/, "precisa ser um número");
  return nome && !traduzida.toLowerCase().includes(nome.toLowerCase()) ? `${nome}: ${traduzida}` : traduzida;
}

export function mensagemErro(err: unknown, padrao = "Não foi possível concluir. Tente novamente."): string {
  const resp = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
  if (!resp) {
    const semRede = (err as { code?: string })?.code;
    if (semRede === "ECONNABORTED") return "O servidor demorou para responder. Verifique a internet e tente de novo.";
    if (semRede === "ERR_NETWORK") return "Sem conexão com o servidor. Verifique a internet.";
    return padrao;
  }
  const detail = resp.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail.slice(0, 3).map((e) => textoDoCampo(e as ErroCampo)).filter(Boolean).join(" · ") || padrao;
  }
  if (resp.status === 403) return "Você não tem permissão para fazer isso.";
  if (resp.status === 413) return "Arquivo grande demais.";
  if (resp.status === 429) return "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.";
  return padrao;
}
