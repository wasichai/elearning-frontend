import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from '@wasichai/core'
import { z } from 'zod'
import { parseContract } from '../../shared/contract'
import { TERMS_KEY, TERMS_PATH, termsAcceptanceSchema, type TermsAcceptance, type TermsView } from '../../shared/terms'

const ACCEPTANCE_PATH = `${TERMS_PATH}/acceptance`

const withdrawalSchema = z.object({ jobId: z.string().min(1) })

export type Withdrawal = z.infer<typeof withdrawalSchema>

// acepta la versión que la persona está leyendo: el servidor la exige con nombre, por si cambió mientras tanto
export function useAcceptTerms() {
  const client = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (version: number): Promise<TermsAcceptance> =>
      parseContract(
        termsAcceptanceSchema,
        'POST terms/acceptance',
        await client.request<unknown>(ACCEPTANCE_PATH, { method: 'POST', body: JSON.stringify({ version }) })
      ),
    onSuccess: (acceptance) => {
      queryClient.setQueryData<TermsView>(TERMS_KEY, (view) => (view ? { ...view, acceptance } : view))
    }
  })
}

// 202: la supresión queda en la cola, no terminada. mientras no se vuelve a leer, la aceptación ya no vale: lo mismo que dirá el servidor
export function useWithdrawTerms() {
  const client = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<Withdrawal> =>
      parseContract(withdrawalSchema, 'DELETE terms/acceptance', await client.request<unknown>(ACCEPTANCE_PATH, { method: 'DELETE' })),
    onSuccess: () => {
      queryClient.setQueryData<TermsView>(TERMS_KEY, (view) =>
        view?.acceptance ? { ...view, acceptance: { ...view.acceptance, valid: false, withdrawnAt: new Date().toISOString() } } : view
      )
      void queryClient.invalidateQueries({ queryKey: TERMS_KEY })
    }
  })
}
