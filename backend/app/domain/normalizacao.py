"""
Normalização de marca, modelo e versão — ÚNICO lugar do sistema que faz isso.

Objetivo: o mesmo carro digitado de jeitos diferentes ("jeep", "JEEP") não vira dois
grupos, SEM estragar a grafia oficial que o cliente vê no site ("T-Cross", "HR-V",
"XEi", "LTZ", "CG 160", "320i").

Por que não `str.title()`/`INITCAP`: transformam "HR-V" em "Hr-V"/"Hr-v", "XEi" em
"Xei", "CG 160" em "Cg 160". Foi exatamente o que aconteceu antes desta versão (havia
três cópias divergentes desta lógica e uma migration com INITCAP).

Regras, por palavra:
1. Grafia oficial conhecida (GRAFIAS) → usa a oficial.
2. Sigla conhecida (SIGLAS) ou letra solta → MAIÚSCULA.
3. Começa com letra e tem número (hb20, cb500f, x1, q3, gla200) → MAIÚSCULA.
4. Começa com número: 4x4 e 320i/520d minúsculos; 500F/650R (motos) com a letra
   maiúscula; decimais (1.0, 1.3T) como vieram.
5. Com hífen, cada pedaço segue as regras; pedaço de até 2 letras vira maiúsculo (T-Cross, HR-V).
6. Digitado com caixa mista deliberada (iX35, XEi não listado) → mantém como veio.
7. Palavra toda em maiúsculas de até 4 letras (GWM, XLS) → mantém (é sigla).
8. Senão → Primeira maiúscula.
A comparação/agrupamento usa sempre `chave()` (minúsculas, sem acento, espaço único).
"""
import re
import unicodedata

MARCAS: dict[str, str] = {
    # Nacionais e populares
    "fiat": "Fiat", "chevrolet": "Chevrolet", "gm": "Chevrolet", "volkswagen": "Volkswagen",
    "vw": "Volkswagen", "toyota": "Toyota", "hyundai": "Hyundai", "honda": "Honda",
    "renault": "Renault", "jeep": "Jeep", "ford": "Ford", "nissan": "Nissan",
    "mitsubishi": "Mitsubishi", "kia": "Kia", "peugeot": "Peugeot", "citroen": "Citroën",
    "citroën": "Citroën", "troller": "Troller", "agrale": "Agrale",
    # Premium
    "bmw": "BMW", "mercedes": "Mercedes-Benz", "mercedes-benz": "Mercedes-Benz",
    "mercedes benz": "Mercedes-Benz", "mercedesbenz": "Mercedes-Benz", "audi": "Audi",
    "volvo": "Volvo", "land rover": "Land Rover", "landrover": "Land Rover", "subaru": "Subaru",
    "porsche": "Porsche", "ferrari": "Ferrari", "lamborghini": "Lamborghini", "mini": "MINI",
    "lexus": "Lexus", "jaguar": "Jaguar", "dodge": "Dodge", "ram": "RAM",
    # Chinesas
    "byd": "BYD", "jac": "JAC", "chery": "Chery", "caoa chery": "CAOA Chery", "caoa": "CAOA Chery",
    "gwm": "GWM", "great wall": "GWM", "haval": "Haval", "lifan": "Lifan", "effa": "Effa",
    # Motos
    "yamaha": "Yamaha", "kawasaki": "Kawasaki", "suzuki": "Suzuki", "ducati": "Ducati",
    "harley": "Harley-Davidson", "harley-davidson": "Harley-Davidson",
    "harley davidson": "Harley-Davidson", "harleydavidson": "Harley-Davidson",
    "triumph": "Triumph", "royal enfield": "Royal Enfield", "royalenfield": "Royal Enfield",
    "bmw moto": "BMW", "honda moto": "Honda", "dafra": "Dafra", "shineray": "Shineray",
    "ktm": "KTM", "haojue": "Haojue", "kymco": "Kymco", "mottu": "Mottu",
}

# Grafias oficiais com caixa mista (não dá para deduzir por regra)
GRAFIAS: dict[str, str] = {
    "xei": "XEi", "gli": "GLi", "xli": "XLi", "xrs": "XRS", "up!": "up!", "e-tron": "e-tron",
    "ix35": "ix35", "i30": "i30", "t-cross": "T-Cross", "t-roc": "T-Roc", "hr-v": "HR-V",
    "cr-v": "CR-V", "wr-v": "WR-V", "zr-v": "ZR-V", "v-strom": "V-Strom", "s-cross": "S-Cross",
    "c3": "C3", "c4": "C4", "e-pace": "E-Pace", "f-pace": "F-Pace", "mt-03": "MT-03",
    "mt-07": "MT-07", "mt-09": "MT-09", "xtz": "XTZ", "mxr": "MXR",
}

SIGLAS: set[str] = {
    "ltz", "lt", "ls", "lx", "lxs", "ex", "exl", "dx", "gl", "glx", "gls", "gt", "gti", "gts",
    "gtx", "rs", "st", "se", "sel", "xls", "xlt", "xl", "srv", "sr", "sx", "tsi", "tfsi", "tdi",
    "cvt", "at", "mt", "abs", "cbs", "suv", "amg", "awd", "4wd", "v6", "v8", "hpe", "gnv", "xt",
    "gs", "adv", "dlx", "rr", "cc", "td", "hdi", "vti", "vtec", "cg", "cb", "xre", "pcx", "nxr",
    "fz", "ybr", "nmax", "xmax", "crf", "bros", "biz", "pop", "dct", "gsx", "gsr", "dr", "kle",
    "kx", "zx", "er", "wrc", "sti", "tsi", "mpi", "fsi", "hb", "gla", "glb", "glc", "gle", "gls",
    "slk", "cla", "cls", "sl", "s", "rsi", "sti", "nc", "cbr", "xr", "xj", "ttr", "yz",
}
# Palavras que parecem sigla mas são nome ("Pop" da Biz Pop é marca da Honda: fica "POP"
# só se vier assim). Mantemos o conjunto pequeno de propósito.
SIGLAS -= {"pop", "bros", "biz"}


def chave(texto: str | None) -> str:
    """Chave de comparação/agrupamento: minúsculas, sem acento, espaço único."""
    if not texto:
        return ""
    sem_acento = "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )
    return " ".join(sem_acento.lower().split())


def _pedaco(p: str) -> str:
    """Regras 2–8 para um pedaço sem hífen."""
    if not p:
        return p
    baixo = p.lower()
    if baixo in GRAFIAS:
        return GRAFIAS[baixo]
    if baixo in SIGLAS or (len(p) == 1 and p.isalpha()):
        return p.upper()
    if p[0].isdigit():
        if re.fullmatch(r"\d+x\d+", baixo):           # tração: 4x4, 4x2
            return baixo
        m = re.fullmatch(r"(\d+)([a-z])", baixo)       # 320i, 520d (BMW) · 500F, 650R (motos)
        if m:
            return baixo if m.group(2) in "ide" else m.group(1) + m.group(2).upper()
        return p if "." in p else baixo                 # 1.0, 2.0 · 1.3T fica como veio
    # Caixa mista deliberada: algo além da primeira letra está em maiúscula e nem tudo é maiúsculo
    if any(c.isupper() for c in p[1:]) and not p.isupper():
        return p
    if p[0].isalpha() and any(c.isdigit() for c in p):
        return p.upper()
    if p.isupper() and len(p) <= 4:
        return p
    return p[0].upper() + p[1:].lower()


def _palavra(w: str) -> str:
    baixo = w.lower()
    if baixo in GRAFIAS:
        return GRAFIAS[baixo]
    if "-" in w:
        partes = w.split("-")
        out = []
        for parte in partes:
            if parte.isalpha() and len(parte) <= 2:
                out.append(parte.upper())
            else:
                out.append(_pedaco(parte))
        return "-".join(out)
    return _pedaco(w)


def normalizar_modelo(texto: str | None) -> str | None:
    """Modelo e versão. Ex.: 't-cross' → 'T-Cross', 'cg 160 fan' → 'CG 160 Fan'."""
    if texto is None:
        return None
    limpo = " ".join(texto.strip().split())
    if not limpo:
        return limpo
    return " ".join(_palavra(w) for w in limpo.split(" "))


def normalizar_marca(texto: str | None) -> str | None:
    """Marca: dicionário canônico; fora dele, as mesmas regras do modelo."""
    if texto is None:
        return None
    limpo = " ".join(texto.strip().split())
    if not limpo:
        return limpo
    return MARCAS.get(limpo.lower(), normalizar_modelo(limpo))


def normalizar_cor(texto: str | None) -> str | None:
    """Cor: 'PRETO FOSCO' → 'Preto Fosco'."""
    if texto is None:
        return None
    return " ".join(w[:1].upper() + w[1:].lower() for w in texto.strip().split())
