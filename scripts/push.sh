#!/usr/bin/env bash
#
# Put the built view where Ratatoskr looks for it.
#
# The directory is under getExternalFilesDir, which is why this needs no root: it is writable over
# adb for the app's own package. Nothing restarts — the panel picks the view up the next time a game
# attaches, so re-push and restart the stream to see a change.
set -euo pipefail

# Defaults to the debug non-root build, which is the one that gets run on the Thor.
PACKAGE="${PACKAGE:-dev.kylobyte.ratatoskr.debug}"
DEST="/sdcard/Android/data/${PACKAGE}/files/telemetry-views"

cd "$(dirname "$0")/.."

# Every view the build emitted, not the first one: it writes both the contract-pinned name and the
# plain one, and pushing only whichever the filesystem listed first is how you end up debugging a
# panel that had the file all along.
views=()
while IFS= read -r found; do
  views+=("${found}")
done < <(find dist -maxdepth 1 -name '*.html')

if [[ ${#views[@]} -eq 0 ]]; then
  echo "No built view in dist/ — run: npm run build" >&2
  exit 1
fi

# The Thor shows up twice under wireless debugging (IP + mDNS, same device), and adb then refuses to
# pick. ANDROID_SERIAL is honoured by adb itself, so exporting it is enough.
if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  echo "device  ${ANDROID_SERIAL}"
fi

adb shell mkdir -p "\"${DEST}\""
for view in "${views[@]}"; do
  adb push "${view}" "${DEST}/"
done

echo
for view in "${views[@]}"; do
  echo "pushed  $(basename "${view}")"
done
echo "to      ${DEST}"
echo
echo "Reads back as:"
adb shell ls -l "\"${DEST}\""
