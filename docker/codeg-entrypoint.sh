#!/usr/bin/env bash
set -euo pipefail

sync_enabled="false"
sync_pid=""

if [[ -n "${HF_TOKEN:-}" && -n "${HF_DATASET_REPO_ID:-}" ]]; then
  sync_enabled="true"
fi

if [[ "${sync_enabled}" == "true" ]]; then
  echo "[HF_SYNC] restoring dataset state into ${CODEG_DATA_DIR:-/data}"
  hf-data-sync pull

  if [[ "${HF_DATASET_SYNC_INTERVAL:-300}" != "0" ]]; then
    echo "[HF_SYNC] background sync every ${HF_DATASET_SYNC_INTERVAL:-300}s"
    hf-data-sync watch &
    sync_pid="$!"
  fi
else
  echo "[HF_SYNC] disabled (HF_TOKEN or HF_DATASET_REPO_ID is missing)"
fi

forward_signal() {
  local signal="$1"
  if [[ -n "${app_pid:-}" ]]; then
    kill "-${signal}" "${app_pid}" 2>/dev/null || true
  fi
}

cleanup() {
  local exit_code="${1:-0}"

  if [[ -n "${sync_pid}" ]]; then
    kill "${sync_pid}" 2>/dev/null || true
    wait "${sync_pid}" 2>/dev/null || true
  fi

  if [[ "${sync_enabled}" == "true" ]]; then
    echo "[HF_SYNC] final dataset push"
    hf-data-sync push || echo "[HF_SYNC] final push failed" >&2
  fi

  exit "${exit_code}"
}

trap 'forward_signal TERM' TERM
trap 'forward_signal INT' INT

"$@" &
app_pid="$!"
wait "${app_pid}" || app_status="$?"
app_status="${app_status:-0}"

cleanup "${app_status}"
