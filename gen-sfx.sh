#!/usr/bin/env bash
# Generates placeholder SFX with ffmpeg so the project renders out-of-the-box.
# For real quality, overwrite the files in public/sfx/ with your own CC0 sounds (same names).
set -e
D=public/sfx; mkdir -p $D
g() { ffmpeg -v error -y -f lavfi -i "$2" ${3:+-af "$3"} -ac 2 "$D/$1.mp3"; }
g paper-flip     "anoisesrc=d=0.28:c=pink:a=0.6" "highpass=f=1800,lowpass=f=9000,afade=t=in:d=0.03,afade=t=out:st=0.08:d=0.2,volume=2"
g metal-thud     "aevalsrc='(sin(2*PI*68*t)*0.9+sin(2*PI*1430*t)*0.25+sin(2*PI*2210*t)*0.12)*exp(-9*t)':d=0.7:s=44100"
g lightbulb-tick "aevalsrc='sin(2*PI*2600*t)*exp(-110*t)':d=0.15:s=44100"
g counting-tick  "aevalsrc='sin(2*PI*1900*t)*exp(-320*mod(t,0.07))':d=1.2:s=44100"
g typewriter     "aevalsrc='(random(0)*2-1)*exp(-420*mod(t,0.075))*0.9':d=2:s=44100" "highpass=f=700"
g whoosh         "anoisesrc=d=0.5:c=pink:a=0.5" "highpass=f=600,afade=t=in:d=0.2,afade=t=out:st=0.2:d=0.3,volume=2"
g pop            "aevalsrc='sin(2*PI*(300+900*t)*t)*exp(-25*t)':d=0.2:s=44100"
g hook-hit       "aevalsrc='(sin(2*PI*52*t)+(random(0)*2-1)*0.3)*exp(-5*t)':d=0.9:s=44100"
echo "SFX ready in $D"
