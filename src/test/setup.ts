// matchers de Testing Library (toBeInTheDocument…) para expect de Vitest
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// sin globals de Vitest, Testing Library no desmonta solo entre pruebas
afterEach(cleanup)

// jsdom no implementa lo que Radix Select (Select de @wasichai/ui) usa al abrirse
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}
