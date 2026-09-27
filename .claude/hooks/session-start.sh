#!/bin/bash
# Prepara las sesiones de Claude Code en la web: instala dependencias para que
# typecheck, lint y build funcionen desde el primer comando.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
# npm install (y no npm ci) para aprovechar la caché del contenedor entre sesiones.
npm install --no-audit --no-fund
