import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { executeGameCommand } from '../domain/session/commands'
import { createInitialGameState } from '../domain/session/createInitialState'
import type {
  GameCommand,
  GameSessionState,
  SaveStatus,
} from '../domain/session/types'
import { GameDatabase } from '../infrastructure/db/GameDatabase'
import { SaveCoordinator } from '../infrastructure/db/SaveCoordinator'
import {
  GameSessionContext,
  type GameSessionContextValue,
} from './GameSessionContext'

type ProviderState = {
  session: GameSessionState | null
}

type ProviderAction =
  | { type: 'hydrate'; session: GameSessionState }
  | { type: 'replace'; session: GameSessionState }

const database = new GameDatabase()
const saveCoordinator = new SaveCoordinator(database)

function reducer(state: ProviderState, action: ProviderAction): ProviderState {
  switch (action.type) {
    case 'hydrate':
    case 'replace':
      return { ...state, session: action.session }
  }
}

export function GameSessionProvider({ children }: { children: ReactNode }) {
  const [providerState, dispatch] = useReducer(reducer, { session: null })
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading')
  const [bootError, setBootError] = useState<string | null>(null)
  const latestStateRef = useRef<GameSessionState | null>(null)

  const acceptSession = useCallback((session: GameSessionState) => {
    latestStateRef.current = session
    dispatch({ type: 'hydrate', session })
    setBootError(null)
    setSaveStatus('saved')
  }, [])

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        let session = await database.loadSession()
        if (!session) {
          session = createInitialGameState()
          await saveCoordinator.enqueue(session)
        }
        if (cancelled) return
        acceptSession(session)
      } catch (error) {
        if (cancelled) return
        setBootError(
          error instanceof Error
            ? error.message
            : '保存データの読込みに失敗しました。',
        )
        setSaveStatus('failed')
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [acceptSession])

  useEffect(() => {
    const reduceMotion = providerState.session?.settings.reduceMotion ?? false
    document.documentElement.dataset.reduceMotion = String(reduceMotion)
  }, [providerState.session?.settings.reduceMotion])

  const persist = useCallback(async (session: GameSessionState) => {
    setSaveStatus('saving')
    try {
      await saveCoordinator.enqueue(session)
      if (latestStateRef.current?.revision === session.revision) {
        setSaveStatus('saved')
      }
    } catch {
      if (latestStateRef.current?.revision === session.revision) {
        setSaveStatus('failed')
      }
      throw new Error('保存に失敗しました。もう一度お試しください。')
    }
  }, [])

  const execute = useCallback(
    async (command: GameCommand) => {
      const current = latestStateRef.current
      if (!current) return
      const next = executeGameCommand(current, command)
      if (next === current) return

      latestStateRef.current = next
      dispatch({ type: 'replace', session: next })
      await persist(next)
    },
    [persist],
  )

  const restore = useCallback(async (backupState: GameSessionState) => {
    const currentRevision = latestStateRef.current?.revision ?? 0
    const restored = {
      ...backupState,
      revision: currentRevision + 1,
    }
    latestStateRef.current = restored
    dispatch({ type: 'replace', session: restored })
    setSaveStatus('saving')
    try {
      await saveCoordinator.replace(restored)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('failed')
      throw new Error('バックアップの復元保存に失敗しました。')
    }
  }, [])

  const retrySave = useCallback(async () => {
    const current = latestStateRef.current
    if (!current) return
    setSaveStatus('retrying')
    await persist(current)
  }, [persist])

  const retryLoad = useCallback(async () => {
    setBootError(null)
    setSaveStatus('loading')
    try {
      let session = await database.loadSession()
      if (!session) {
        session = createInitialGameState()
        await saveCoordinator.enqueue(session)
      }
      acceptSession(session)
    } catch (error) {
      setBootError(
        error instanceof Error
          ? error.message
          : '保存データの読込みに失敗しました。',
      )
      setSaveStatus('failed')
    }
  }, [acceptSession])

  const resetSession = useCallback(async () => {
    const session = createInitialGameState()
    setBootError(null)
    setSaveStatus('saving')
    try {
      await saveCoordinator.replace(session)
      acceptSession(session)
    } catch {
      setBootError('新しいセーブの作成に失敗しました。')
      setSaveStatus('failed')
    }
  }, [acceptSession])

  const value = useMemo<GameSessionContextValue>(
    () => ({
      state: providerState.session,
      saveStatus,
      bootError,
      execute,
      restore,
      retrySave,
      retryLoad,
      resetSession,
    }),
    [
      providerState.session,
      saveStatus,
      bootError,
      execute,
      restore,
      retrySave,
      retryLoad,
      resetSession,
    ],
  )

  return (
    <GameSessionContext.Provider value={value}>
      {children}
    </GameSessionContext.Provider>
  )
}
