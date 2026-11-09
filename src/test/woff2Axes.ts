import { brotliDecompressSync } from 'node:zlib'

// lee los ejes de variación (tabla `fvar`) de un woff2 con solo node:zlib: WOFF2 comprime todas las tablas en un único flujo Brotli.
// Solo para pruebas; no entra en el paquete de la app.
const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC',
  'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC',
  'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just',
  'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'
] // prettier-ignore

export interface FontAxis {
  tag: string
  min: number
  default: number
  max: number
}

export function woff2Axes(file: Buffer): FontAxis[] {
  if (file.toString('latin1', 0, 4) !== 'wOF2') throw new Error('no es un woff2')
  const numTables = file.readUInt16BE(12)
  let at = 48
  const readBase128 = () => {
    let value = 0
    for (let i = 0; i < 5; i++) {
      const byte = file[at++]!
      value = value * 128 + (byte & 0x7f)
      if (!(byte & 0x80)) return value
    }
    throw new Error('UIntBase128 inválido')
  }
  const tables: { tag: string; offset: number; length: number }[] = []
  let offset = 0
  for (let i = 0; i < numTables; i++) {
    const flags = file[at++]!
    const index = flags & 0x3f
    const tag = index === 63 ? file.toString('latin1', at, (at += 4)) : KNOWN_TAGS[index]!
    const version = flags >> 6
    const length = readBase128()
    // glyf y loca vienen transformados con versión 0; el resto, con versión distinta de 0: solo entonces consta transformLength
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0
    const stored = transformed ? readBase128() : length
    tables.push({ tag, offset, length: stored })
    offset += stored
  }
  const data = brotliDecompressSync(file.subarray(at))
  const fvar = tables.find((table) => table.tag === 'fvar')
  if (!fvar) return []
  const view = data.subarray(fvar.offset, fvar.offset + fvar.length)
  const axesOffset = view.readUInt16BE(4)
  const count = view.readUInt16BE(8)
  const size = view.readUInt16BE(10)
  const fixed = (position: number) => view.readInt32BE(position) / 65536
  return Array.from({ length: count }, (_, i) => {
    const base = axesOffset + i * size
    return { tag: view.toString('latin1', base, base + 4), min: fixed(base + 4), default: fixed(base + 8), max: fixed(base + 12) }
  })
}
