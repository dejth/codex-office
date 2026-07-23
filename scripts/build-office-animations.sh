#!/usr/bin/env bash

set -euo pipefail

workspace_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_root="${workspace_root}/assets/office/source/rework-v2"
output_root="${workspace_root}/assets/office/animation"
work_root="${workspace_root}/tmp/office-animation-build-v2"
frame_size=128
default_art_size=106
statuses=(
  thinking
  reading
  editing
  running-command
  waiting-approval
  completed
  failed
  idle
  unknown
)

mkdir -p "${work_root}" "${output_root}"

for status in "${statuses[@]}"; do
  source_file="${source_root}/${status}.png"
  status_root="${work_root}/${status}"
  art_size="${default_art_size}"
  baseline_target=120
  case "${status}" in
    thinking | unknown)
      art_size=114
      ;;
    editing | idle)
      baseline_target=124
      ;;
  esac
  mkdir -p "${status_root}"

  source_width="$(magick "${source_file}" -format '%w' info:)"
  source_height="$(magick "${source_file}" -format '%h' info:)"
  cell_width=$(((source_width + 4) / 5))

  magick "${source_file}" -crop 5x1@ +repage \
    "${status_root}/tile-%02d.png"

  normalized=()
  for column in 0 1 2 3 4; do
    tile_path="$(printf '%s/tile-%02d.png' "${status_root}" "${column}")"
    normalized_path="${status_root}/normalized-${column}.png"
    magick "${tile_path}" -gravity northwest -background none \
      -extent "${cell_width}x${source_height}" "${normalized_path}"
    normalized+=("${normalized_path}")
  done

  magick "${normalized[@]}" -evaluate-sequence max \
    "${status_root}/union.png"
  geometry="$(
    magick "${status_root}/union.png" -trim -format '%wx%h%X%Y' info:
  )"

  frames=()
  for column in 0 1 2 3 4; do
    provisional_frame="${status_root}/provisional-${column}.png"
    frame_path="${status_root}/frame-${column}.png"
    magick "${status_root}/normalized-${column}.png" \
      -crop "${geometry}" +repage \
      -filter point -resize "${art_size}x${art_size}>" \
      -gravity center -background none -extent "${frame_size}x${frame_size}" \
      -define png:color-type=6 "${provisional_frame}"
    magick "${provisional_frame}" -alpha extract \
      "${status_root}/anchor-alpha-${column}.png"
    magick "${provisional_frame}" -alpha off \
      -fx '(r > 0.55 && b > 0.25 && r - g > 0.2 && b - g > 0.1) ? 1 : 0' \
      "${status_root}/anchor-color-${column}.png"
    magick "${status_root}/anchor-alpha-${column}.png" \
      "${status_root}/anchor-color-${column}.png" \
      -compose multiply -composite \
      "${status_root}/anchor-mask-${column}.png"
    anchor_geometry="$(
      magick "${status_root}/anchor-mask-${column}.png" -trim \
        -format '%wx%h%X%Y' info:
    )"
    if [[ ! "${anchor_geometry}" =~ ^([0-9]+)x([0-9]+)\+(-?[0-9]+)\+(-?[0-9]+)$ ]]; then
      echo "Unable to locate pink eye anchor for ${status} frame ${column}" >&2
      exit 1
    fi
    anchor_width="${BASH_REMATCH[1]}"
    anchor_height="${BASH_REMATCH[2]}"
    anchor_x="${BASH_REMATCH[3]}"
    anchor_y="${BASH_REMATCH[4]}"
    anchor_center_x=$((anchor_x + anchor_width / 2))
    offset_x=$((64 - anchor_center_x))

    content_geometry="$(
      magick "${provisional_frame}" -trim -format '%wx%h%X%Y' info:
    )"
    if [[ ! "${content_geometry}" =~ ^([0-9]+)x([0-9]+)\+(-?[0-9]+)\+(-?[0-9]+)$ ]]; then
      echo "Unable to locate content for ${status} frame ${column}" >&2
      exit 1
    fi
    content_height="${BASH_REMATCH[2]}"
    content_y="${BASH_REMATCH[4]}"
    content_bottom=$((content_y + content_height - 1))
    offset_y=$((baseline_target - content_bottom))

    magick -size "${frame_size}x${frame_size}" canvas:none \
      "${provisional_frame}" \
      -geometry "$(printf '%+d%+d' "${offset_x}" "${offset_y}")" \
      -composite -define png:color-type=6 "${frame_path}"
    frames+=("${frame_path}")
  done

  if [[ "${status}" == "thinking" ]]; then
    cp "${frames[0]}" "${frames[1]}"
    for column in 0 1 2 3 4; do
      frame_path="${frames[$column]}"
      magick "${frame_path}" -crop 48x48+80+0 +repage -alpha extract \
        "${status_root}/bubble-alpha-${column}.png"
      magick "${frame_path}" -crop 48x48+80+0 +repage -alpha off \
        -fx '(g > 0.2 && b > 0.2 && r < 0.35 && abs(g - b) < 0.25) ? 1 : 0' \
        "${status_root}/bubble-color-${column}.png"
      magick "${status_root}/bubble-alpha-${column}.png" \
        "${status_root}/bubble-color-${column}.png" \
        -compose multiply -composite \
        "${status_root}/bubble-mask-${column}.png"
      bubble_geometry="$(
        magick "${status_root}/bubble-mask-${column}.png" -trim \
          -format '%wx%h%X%Y' info:
      )"
      if [[ ! "${bubble_geometry}" =~ ^([0-9]+)x([0-9]+)\+(-?[0-9]+)\+(-?[0-9]+)$ ]]; then
        echo "Unable to locate thinking bubble for frame ${column}" >&2
        exit 1
      fi
      bubble_width="${BASH_REMATCH[1]}"
      bubble_height="${BASH_REMATCH[2]}"
      bubble_x="${BASH_REMATCH[3]}"
      bubble_y="${BASH_REMATCH[4]}"
      bubble_center_x=$((80 + bubble_x + bubble_width / 2))
      bubble_center_y=$((bubble_y + bubble_height / 2))
      if [[ "${column}" == "1" ]]; then
        bubble_center_y=$((bubble_center_y + 1))
      fi
      dot_y1=$((bubble_center_y - 1))
      dot_y2=$((bubble_center_y + 1))
      magick "${frame_path}" -fill "#fff3d6" \
        -draw "rectangle $((bubble_center_x - 8)),${dot_y1} $((bubble_center_x - 6)),${dot_y2} rectangle $((bubble_center_x - 1)),${dot_y1} $((bubble_center_x + 1)),${dot_y2} rectangle $((bubble_center_x + 6)),${dot_y1} $((bubble_center_x + 8)),${dot_y2}" \
        "${frame_path}"
    done
  fi

  magick "${frames[@]}" +append -strip \
    -define png:compression-level=9 -define png:compression-filter=5 \
    -define png:color-type=6 "${output_root}/${status}.png"
done
