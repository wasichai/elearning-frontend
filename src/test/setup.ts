// matchers de Testing Library (toBeInTheDocument…) para expect de Vitest
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// sin globals de Vitest, Testing Library no desmonta solo entre pruebas
afterEach(cleanup)

// findBy… y waitFor esperan hasta 5 s (no 1 s): en una máquina o un runner cargados la respuesta simulada tarda más
configure({ asyncUtilTimeout: 5000 })

// jsdom no implementa lo que Radix Select (Select de @wasichai/ui) usa al abrirse
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}
