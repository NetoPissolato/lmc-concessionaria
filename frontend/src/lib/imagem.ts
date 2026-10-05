/**
 * Reduz a foto no próprio navegador antes de enviar.
 *
 * Foto de celular tem 4–12 MB. Pelo 4G do pátio o envio levava mais que o tempo limite e
 * falhava, e o servidor ainda gastava CPU redimensionando. O site usa no máximo 1600 px,
 * então mandar 2560 px já sobra: 8 MB viram ~600 KB. A rotação da câmera (EXIF) é
 * aplicada aqui; o servidor descarta o EXIF de qualquer jeito.
 *
 * Se algo falhar (navegador antigo, formato estranho), devolve o arquivo original.
 */
const LADO_MAXIMO = 2560;
const QUALIDADE = 0.86;

export async function reduzirFoto(arquivo: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || !arquivo.type.startsWith("image/")) return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const maior = Math.max(bitmap.width, bitmap.height);
    if (maior <= LADO_MAXIMO && arquivo.size <= 1.5 * 1024 * 1024) {
      bitmap.close();
      return arquivo; // já é pequena: não recomprime
    }
    const escala = Math.min(1, LADO_MAXIMO / maior);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close(); return arquivo; }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob: Blob | null = await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", QUALIDADE));
    if (!blob || blob.size >= arquivo.size) return arquivo;
    const nome = arquivo.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return arquivo;
  }
}
