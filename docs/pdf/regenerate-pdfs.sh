#!/bin/bash
# Regenerate the PDFs from the Markdown sources.
#
#   ./docs/pdf/regenerate-pdfs.sh        (run from the repository root)
#
# Needs pandoc and Google Chrome. Markdown -> styled HTML -> print to PDF.
set -e
cd "$(dirname "$0")/../.."
CSS="docs/pdf/print.css"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp "$CSS" "$TMP/print.css"

render() {
  local src="$1" out="$2" title="$3"
  pandoc "docs/$src" --standalone --metadata pagetitle="$title" \
    --css=print.css --embed-resources --resource-path="$TMP" \
    -f markdown+pipe_tables -t html5 -o "$TMP/page.html"
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="docs/pdf/$out" --virtual-time-budget=6000 \
    "file://$TMP/page.html" 2>/dev/null
  echo "  wrote docs/pdf/$out"
}

render PARTICIPANT_GUIDE.md       Gap-Sense-Participant-Guide.pdf       "Gap Sense — How to Use the App"
render INSTALL_GUIDE.md           Gap-Sense-Install-Guide.pdf           "Gap Sense — How to Get the App on Your Phone"
render SESSION_SCRIPT.md          Gap-Sense-Facilitator-Script.pdf      "Gap Sense — Facilitator Script"
render FEATURE_STATUS.md          Gap-Sense-Feature-Status.pdf          "Gap Sense — Feature Status"
echo "done."
