#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sqlite3
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from huggingface_hub import HfApi, hf_hub_download
from huggingface_hub.errors import EntryNotFoundError, RepositoryNotFoundError


def env_flag(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def log(message: str) -> None:
    print(f"[HF_SYNC] {message}", file=sys.stderr, flush=True)


@dataclass(frozen=True)
class SyncItem:
    local_name: str
    include: bool

    @property
    def local_path(self) -> Path:
        return data_dir() / self.local_name

    @property
    def remote_path(self) -> str:
        prefix = remote_dir()
        if prefix:
            return f"{prefix}/{self.local_name}"
        return self.local_name


def data_dir() -> Path:
    return Path(os.environ.get("CODEG_DATA_DIR", "/data"))


def repo_id() -> str:
    return os.environ.get("HF_DATASET_REPO_ID", "").strip()


def remote_dir() -> str:
    return os.environ.get("HF_DATASET_REMOTE_DIR", "").strip().strip("/")


def sync_interval() -> int:
    return int(os.environ.get("HF_DATASET_SYNC_INTERVAL", "300"))


def state_file() -> Path:
    return Path(os.environ.get("HF_DATASET_STATE_FILE", "/tmp/codeg-hf-sync-state.json"))


def hf_token() -> str:
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
    return (token or "").strip()


def tracked_items() -> list[SyncItem]:
    return [
        SyncItem(local_name="codeg.db", include=True),
        SyncItem(
            local_name="tokens.json",
            include=env_flag("HF_DATASET_INCLUDE_TOKENS", False),
        ),
    ]


def ensure_configured() -> bool:
    if not hf_token() or not repo_id():
        log("skip: HF_TOKEN or HF_DATASET_REPO_ID is missing")
        return False
    data_dir().mkdir(parents=True, exist_ok=True)
    return True


def has_local_state() -> bool:
    return any(item.local_path.exists() for item in tracked_items())


def copy_file(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)


def backup_sqlite(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(source) as src, sqlite3.connect(destination) as dest:
        src.backup(dest)


def stage_snapshot(temp_root: Path) -> list[Path]:
    staged: list[Path] = []
    for item in tracked_items():
        if not item.include or not item.local_path.exists():
            continue

        destination = temp_root / item.local_name
        if item.local_name == "codeg.db":
            backup_sqlite(item.local_path, destination)
        else:
            copy_file(item.local_path, destination)
        staged.append(destination)
    return staged


def files_digest(files: Iterable[Path]) -> str:
    digest = hashlib.sha256()
    for path in sorted(files):
        digest.update(path.name.encode("utf-8"))
        with path.open("rb") as fh:
            while True:
                chunk = fh.read(1024 * 1024)
                if not chunk:
                    break
                digest.update(chunk)
    return digest.hexdigest()


def load_state() -> dict[str, str]:
    path = state_file()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_state(state: dict[str, str]) -> None:
    path = state_file()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def state_key() -> str:
    suffix = remote_dir() or "."
    return f"{repo_id()}::{suffix}"


def pull(force: bool = False) -> None:
    if not ensure_configured():
        return

    if has_local_state() and not force and not env_flag("HF_DATASET_FORCE_PULL", False):
        log("local state already exists, skipping initial restore")
        return

    token = hf_token()
    restored = 0

    for item in tracked_items():
        if not item.include:
            continue
        try:
            downloaded = hf_hub_download(
                repo_id=repo_id(),
                repo_type="dataset",
                filename=item.remote_path,
                token=token,
            )
        except (EntryNotFoundError, RepositoryNotFoundError):
            continue

        copy_file(Path(downloaded), item.local_path)
        restored += 1
        log(f"restored {item.remote_path} -> {item.local_path}")

    if restored == 0:
        log("no remote dataset files found to restore")


def push(force: bool = False) -> None:
    if not ensure_configured():
        return

    api = HfApi(token=hf_token())
    api.create_repo(
        repo_id=repo_id(),
        repo_type="dataset",
        private=env_flag("HF_DATASET_PRIVATE", True),
        exist_ok=True,
    )

    with tempfile.TemporaryDirectory(prefix="codeg-hf-sync-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        staged = stage_snapshot(temp_dir)
        if not staged:
            log("no local files to upload")
            return

        digest = files_digest(staged)
        state = load_state()
        if state.get(state_key()) == digest and not force:
            log("no state change detected, skipping upload")
            return

        api.upload_folder(
            folder_path=str(temp_dir),
            path_in_repo=remote_dir() or "",
            repo_id=repo_id(),
            repo_type="dataset",
            token=hf_token(),
            commit_message=f"Sync codeg state {digest[:12]}",
        )
        state[state_key()] = digest
        save_state(state)
        log(f"uploaded dataset snapshot to {repo_id()} ({digest[:12]})")


def watch() -> None:
    interval = sync_interval()
    if interval <= 0:
        log("background sync disabled")
        return

    while True:
        try:
            push(force=False)
        except Exception as exc:  # noqa: BLE001
            log(f"background sync failed: {exc}")
        time.sleep(interval)


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync codeg data with a Hugging Face dataset")
    parser.add_argument("command", choices=["pull", "push", "watch"])
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    try:
        if args.command == "pull":
            pull(force=args.force)
        elif args.command == "push":
            push(force=args.force)
        else:
            watch()
        return 0
    except Exception as exc:  # noqa: BLE001
        log(f"{args.command} failed: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
