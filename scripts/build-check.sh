#!/usr/bin/env bash
# `npm run build:check` — the production build as a quality gate, not a deploy.
#
# The Next tree initialises Firebase at module load (src/firebase/config.ts), so
# `next build` aborts while prerendering unless the NEXT_PUBLIC_FIREBASE_* values
# are non-empty. The build gate must not depend on real project secrets, so any
# variable that is unset gets a syntactically valid placeholder here. The output
# of this script is never deployed. TODO(track-b): delete with the Next tree (B1);
# the Astro tree builds with `firebaseEnabled === false` guards instead.
set -euo pipefail

placeholder() {
  local name="$1" value="$2"
  if [ -z "${!name:-}" ]; then
    export "$name=$value"
    echo "build-check: $name unset — using placeholder (build gate only, not a deploy)"
  fi
}

placeholder NEXT_PUBLIC_FIREBASE_API_KEY            "build-check-placeholder"
placeholder NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        "build-check.invalid"
placeholder NEXT_PUBLIC_FIREBASE_PROJECT_ID         "build-check"
placeholder NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     "build-check.invalid"
placeholder NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID "0"
placeholder NEXT_PUBLIC_FIREBASE_APP_ID             "1:0:web:build-check"
placeholder NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID     "G-BUILDCHECK"

exec npx next build
