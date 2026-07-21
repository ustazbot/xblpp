#!/bin/bash
# Forced command untuk SSH_PRIVATE_KEY (GitHub Actions CI) — dipasang di VPS
# pada /opt/xblpp/bin/ci-deploy.sh, dirujuk oleh `command=` dalam
# authorized_keys. sshd abaikan command client sepenuhnya bila `command=`
# ditetapkan — cuma $SSH_ORIGINAL_COMMAND didedahkan (bukan dieksekusi terus)
# untuk kita parse target+ref sendiri. Elak arbitrary shell walaupun key CI
# bocor dari GitHub Secrets — blast radius terhad kepada deploy xBLPP
# staging/prod daripada repo GitHub tetap sahaja.
#
# Rujuk docs/runbook/deploy.md ("GitHub Secrets") + .github/workflows/deploy.yml.
set -euo pipefail

read -r TARGET GIT_REF <<< "${SSH_ORIGINAL_COMMAND:-}"

case "$TARGET" in
  staging) DIR=/opt/xblpp/clients/staging ;;
  prod)    DIR=/opt/xblpp/clients/prod ;;
  *)
    echo "Target tak sah: '${TARGET:-<kosong>}' (mesti 'staging' atau 'prod')" >&2
    exit 1
    ;;
esac

if [ -z "$GIT_REF" ]; then
  echo "Git ref kosong" >&2
  exit 1
fi

cd "$DIR"
if [ ! -d .git ]; then
  # git init/fetch/checkout, bukan `git clone .` — folder ni dah ada .env
  # root-only sebelum clone pertama, `git clone .` tolak direktori tak kosong.
  git init -q
  git remote add origin https://github.com/ustazbot/xblpp.git
fi
git fetch origin "+$GIT_REF:refs/deploy/target" --force
git checkout -f refs/deploy/target

docker compose build app
docker compose run --rm --build migrate
docker compose up -d --force-recreate app
