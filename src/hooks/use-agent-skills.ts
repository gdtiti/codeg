"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { acpListAgentSkills } from "@/lib/api"
import type { AgentSkillItem, AgentType } from "@/lib/types"

const agentCache = new Map<AgentType, AgentSkillItem[]>()
const inflightMap = new Map<AgentType, Promise<AgentSkillItem[]>>()

const EMPTY: AgentSkillItem[] = []

function fetchForAgent(agentType: AgentType): Promise<AgentSkillItem[]> {
  let promise = inflightMap.get(agentType)
  if (!promise) {
    promise = acpListAgentSkills({ agentType })
      .then((result) => {
        const skills = result.supported ? result.skills : EMPTY
        agentCache.set(agentType, skills)
        inflightMap.delete(agentType)
        return skills
      })
      .catch((err) => {
        inflightMap.delete(agentType)
        console.warn("[useAgentSkills] failed:", err)
        return EMPTY
      })
    inflightMap.set(agentType, promise)
  }
  return promise
}

export function useAgentSkills(agentType: AgentType | null): AgentSkillItem[] {
  const cached = useMemo(
    () => (agentType ? (agentCache.get(agentType) ?? null) : null),
    [agentType]
  )
  // Track which agent type the fetched result belongs to so stale data
  // from a previous agent is never returned after a switch.
  const [fetched, setFetched] = useState<{
    agentType: AgentType
    skills: AgentSkillItem[]
  } | null>(null)

  const doFetch = useCallback(() => {
    if (!agentType || agentCache.has(agentType)) return
    let cancelled = false
    fetchForAgent(agentType).then((list) => {
      if (!cancelled) setFetched({ agentType, skills: list })
    })
    return () => {
      cancelled = true
    }
  }, [agentType])

  // Initial fetch
  useEffect(() => doFetch(), [doFetch])

  // Re-fetch when window regains focus (covers cross-window cache
  // invalidation — e.g. settings window creates/removes skills while the
  // conversation window stays mounted).
  useEffect(() => {
    const onFocus = () => {
      if (!agentType) return
      agentCache.delete(agentType)
      inflightMap.delete(agentType)
      doFetch()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [agentType, doFetch])

  if (!agentType) return EMPTY
  if (cached) return cached
  if (fetched && fetched.agentType === agentType) return fetched.skills
  return EMPTY
}

export function invalidateAgentSkillsCache(agentType?: AgentType) {
  if (agentType) {
    agentCache.delete(agentType)
    inflightMap.delete(agentType)
  } else {
    agentCache.clear()
    inflightMap.clear()
  }
}
