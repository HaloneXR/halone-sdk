import { HaloneError, type EventName, type MethodName, type Permission } from './protocol'
import table from './permissions.json'

/**
 * Who may call what: every app may run its own window, and the rest needs a
 * permission; the shell's own windows may call anything. The table is shared
 * with `BridgeHost` (core-shell), whose tests read it.
 */
export const PERMISSIONS = table.permissions as Permission[]

const OPEN_TO_ALL = new Set<string>(table.openToAll)
const SELF_ONLY = new Set<string>(table.selfOnly)
const METHODS = table.methods as Record<string, Permission>
const OWN_EVENTS = new Set<string>(table.ownEvents)
const EVENTS = table.events as Record<string, Permission>

/** Throws `permission-denied` unless an app granted [granted] may call [method] from window [caller]. */
export function checkAllowed(granted: readonly Permission[], method: MethodName | string, caller: string, params: unknown) {
  const needed = METHODS[method]
  const id = (params as { id?: string } | null | undefined)?.id
  const allowed = SELF_ONLY.has(method) ? id == null || id === caller : OPEN_TO_ALL.has(method) || (needed !== undefined && granted.includes(needed))
  if (allowed) return
  throw new HaloneError(
    'permission-denied',
    needed ? `${method} needs the ${needed} permission` : `${method} is not available to apps`,
  )
}

/** Whether an app granted [granted] hears event [name]. */
export function hears(granted: readonly Permission[], name: EventName | string): boolean {
  if (OWN_EVENTS.has(name)) return true
  const needed = EVENTS[name]
  return needed !== undefined && granted.includes(needed)
}
