#!/bin/sh
# 以 1Password service account 注入 secrets 後執行指令（M4 專用）。
# token 只授權 Automation vault 讀取；此包裝讓 token 的曝光面限於單一進程。
set -eu
TOKEN_FILE="$HOME/.config/op/service-account-token"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
[ -r "$TOKEN_FILE" ] || { echo "with-op: token file not found: $TOKEN_FILE" >&2; exit 1; }
OP_SERVICE_ACCOUNT_TOKEN="$(cat "$TOKEN_FILE")"
export OP_SERVICE_ACCOUNT_TOKEN
exec op run --env-file="$SCRIPT_DIR/op.env" -- "$@"
